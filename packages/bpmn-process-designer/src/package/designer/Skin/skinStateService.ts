/**
 * skinStateService — 节点运行时状态管理服务
 *
 * 功能：
 * 1. 监听 WebSocket 推送的 wfNodeStatus 主题消息
 * 2. 维护 elementId → NodeRuntimeState 缓存
 * 3. 触发 bpmn-js eventBus 事件，驱动 WfSkinRenderer 更新渲染
 *
 * 消息格式（IMessageService 发布）：
 *   topic: graphql-subscription/wfNodeStatus/{wfInstanceId}
 *   payload: { elementId, stepStatus, stepStatusName, progress, assignee, displayName, timestamp }
 *
 * 与 nop-site WebSocket 集成：
 *   - 自动检测 useWebSocket (onWebSocket) 是否可用
 *   - 不可用时降级为 polling 模式
 *   - 不依赖 nop-site 包，可独立使用
 */

import type EventBus from 'diagram-js/lib/core/EventBus'

// ======== 类型定义 ========

export interface NodeRuntimeState {
  elementId: string
  stepStatus: number
  stepStatusName: string
  progress: number
  assignee: string
  displayName: string
  timestamp: number
}

export type StateChangeCallback = (elementId: string, state: NodeRuntimeState) => void

// ======== 状态管理 ========

/**
 * 节点运行时状态缓存 (elementId → NodeRuntimeState)
 */
const nodeStateCache = new Map<string, NodeRuntimeState>()

/**
 * 订阅回调列表
 */
const subscribers = new Set<StateChangeCallback>()

/**
 * 当前监听的 wfInstanceId
 */
let activeWfInstanceId: string | null = null

/**
 * 是否已绑定 WebSocket 监听
 */
let wsBound = false

/**
 * 轮询定时器句柄
 */
let pollTimer: ReturnType<typeof setInterval> | null = null

/**
 * 轮询 URL（降级使用）
 */
let pollUrl: string | null = null

// bpmn-js eventBus 引用（外部注入）
let _eventBus: EventBus | null = null

// ======== 核心 API ========

/**
 * 注入 bpmn-js eventBus，用于触发渲染更新事件
 */
export function setEventBus(eventBus: EventBus): void {
  _eventBus = eventBus
}

/**
 * 订阅指定工作流实例的节点状态变化
 *
 * @param wfInstanceId 工作流实例 ID
 * @param eventBus     bpmn-js eventBus（可选，也可通过 setEventBus 注入）
 */
export function subscribe(wfInstanceId: string, eventBus?: EventBus): void {
  if (eventBus) _eventBus = eventBus
  activeWfInstanceId = wfInstanceId

  // 绑定 WebSocket 监听（仅一次）
  if (!wsBound) {
    _tryBindWebSocket()
  }

  // 如果 WebSocket 不可用，启动轮询
  if (!wsBound) {
    _startPolling(wfInstanceId)
  }

  console.log(`[skinStateService] subscribed to wfInstance: ${wfInstanceId}`)
}

/**
 * 取消订阅
 */
export function unsubscribe(): void {
  activeWfInstanceId = null
  _stopPolling()
  console.log('[skinStateService] unsubscribed')
}

/**
 * 注册状态变更回调
 */
export function onStateChange(callback: StateChangeCallback): void {
  subscribers.add(callback)
}

/**
 * 移除状态变更回调
 */
export function offStateChange(callback: StateChangeCallback): void {
  subscribers.delete(callback)
}

/**
 * 获取缓存的节点运行时状态
 */
export function getNodeState(elementId: string): NodeRuntimeState | undefined {
  return nodeStateCache.get(elementId)
}

/**
 * 获取所有缓存的节点运行时状态
 */
export function getAllNodeStates(): Map<string, NodeRuntimeState> {
  return new Map(nodeStateCache)
}

/**
 * 清空缓存
 */
export function clearCache(): void {
  nodeStateCache.clear()
}

/**
 * 手动更新节点状态（用于模拟测试或直接从接口拉取全量状态）
 */
export function updateNodeState(state: NodeRuntimeState): void {
  nodeStateCache.set(state.elementId, state)
  _notifySubscribers(state.elementId, state)
  _fireEventBus(state.elementId, state)
}

/**
 * 批量更新节点状态
 */
export function updateNodeStates(states: NodeRuntimeState[]): void {
  for (const state of states) {
    nodeStateCache.set(state.elementId, state)
    _notifySubscribers(state.elementId, state)
    _fireEventBus(state.elementId, state)
  }
}

/**
 * 设置轮询 URL（降级方案，当 WebSocket 不可用时使用）
 */
export function setPollUrl(url: string): void {
  pollUrl = url
}

// ======== 内部实现 ========

/**
 * 尝试绑定 nop-site 的 WebSocket 消息监听
 */
function _tryBindWebSocket(): void {
  // 检测 nop-site 的 useWebSocket 是否可用
  if (typeof window === 'undefined') return

  // 方式1: 使用 nop-site 的全局 onWebSocket 注册机制
  const w = window as any
  if (typeof w.__onWebSocket === 'function') {
    w.__onWebSocket(_onWsMessage)
    wsBound = true
    return
  }

  // 方式2: 检测是否有 nop-site/useWebSocket 挂载的全局回调
  // nop-site 的 notify 组件在 onWebSocket 注册时，会调用所有注册的回调
  // 我们尝试动态导入
  _tryDynamicImport()
}

/**
 * 尝试动态导入 nop-site 的 WebSocket hook
 */
async function _tryDynamicImport(): Promise<void> {
  try {
    const { onWebSocket } = await import(
      /* webpackIgnore: true */
      '/@/hooks/web/useWebSocket'
    )
    onWebSocket(_onWsMessage)
    wsBound = true
    console.log('[skinStateService] WebSocket bound via nop-site useWebSocket')
  } catch {
    // nop-site 不可用，后续降级为轮询
    console.info('[skinStateService] nop-site WebSocket not available, will use polling')
  }
}

/**
 * WebSocket 消息处理
 */
function _onWsMessage(data: any): void {
  if (!activeWfInstanceId) return

  // 只处理 topic 类型的消息
  if (data.cmd !== 'topic' && data.cmd !== 'subscription') return

  // 匹配 wfNodeStatus 主题
  const topic: string = data.topic || data.headers?.topic || ''
  if (!topic.includes('wfNodeStatus/')) return

  // 检查是否匹配当前监听的实例
  const expectedTopic = `wfNodeStatus/${activeWfInstanceId}`
  if (!topic.includes(expectedTopic)) return

  // 解析 payload
  const payload: any = data.content || data.body || data.data || {}
  if (!payload.elementId) return

  const state: NodeRuntimeState = {
    elementId: payload.elementId,
    stepStatus: payload.stepStatus ?? 0,
    stepStatusName: payload.stepStatusName || 'UNKNOWN',
    progress: payload.progress ?? 0,
    assignee: payload.assignee || '',
    displayName: payload.displayName || '',
    timestamp: payload.timestamp ?? Date.now(),
  }

  updateNodeState(state)
}

/**
 * 启动轮询（WebSocket 降级方案）
 */
function _startPolling(wfInstanceId: string): void {
  if (pollTimer) return
  if (!pollUrl) {
    const baseUrl = (window as any).__NOP_BASE_PATH || ''
    pollUrl = `${baseUrl}/r/WfSkinBizModel_pollNodeStates?wfInstanceId=${encodeURIComponent(wfInstanceId)}`
  }

  pollTimer = setInterval(async () => {
    try {
      const resp = await fetch(pollUrl!)
      const data = await resp.json()
      const states: any[] = data?.data?.states || data?.list || []
      updateNodeStates(
        states.map((s: any) => ({
          elementId: s.elementId,
          stepStatus: s.stepStatus ?? 0,
          stepStatusName: s.stepStatusName || 'UNKNOWN',
          progress: s.progress ?? 0,
          assignee: s.assignee || '',
          displayName: s.displayName || '',
          timestamp: s.timestamp ?? Date.now(),
        }))
      )
    } catch {
      // silent fail — will retry on next interval
    }
  }, 5000) // 5s polling interval
}

/**
 * 停止轮询
 */
function _stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/**
 * 通知所有回调
 */
function _notifySubscribers(elementId: string, state: NodeRuntimeState): void {
  for (const cb of subscribers) {
    try {
      cb(elementId, state)
    } catch (e) {
      console.error('[skinStateService] subscriber error:', e)
    }
  }
}

/**
 * 触发 bpmn-js eventBus 事件，驱动 WfSkinRenderer 更新
 */
function _fireEventBus(elementId: string, state: NodeRuntimeState): void {
  if (!_eventBus) return

  const runtimeState: Record<string, any> = {
    stepStatus: state.stepStatus,
    stepStatusName: state.stepStatusName,
    progress: state.progress,
    assignee: state.assignee,
    displayName: state.displayName,
  }

  _eventBus.fire('wfSkin.nodeStatusChanged', {
    elementId,
    runtimeState,
  })
}
