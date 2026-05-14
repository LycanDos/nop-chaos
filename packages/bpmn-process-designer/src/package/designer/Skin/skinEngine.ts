/**
 * 皮肤引擎 — 管理皮肤定义的加载、解析、缓存。
 *
 * 负责：
 * 1. 从服务端加载皮肤定义 JSON
 * 2. 支持 $extends 皮肤继承（加载基础皮肤并合并）
 * 3. 缓存皮肤定义（按 skinCode）
 * 4. 解析皮肤定义中的 $jina 表达式（通过后端 evalSkinStyle API）
 * 5. 提供当前状态的已计算样式
 */

import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'

// 全局皮肤缓存
const skinDefCache = new Map<string, any>()
const skinStyleCache = new Map<string, any>()

// 缓存正在加载中的 promise，防止并行重复请求
const pendingLoads = new Map<string, Promise<any>>()

// 激活的皮肤映射 (elementId → skinCode)
let activeSkinMap: Record<string, string> = {}

/**
 * 获取元素绑定的皮肤编码
 */
export function getElementSkinCode(element: any): string | null {
  // 1. 优先从外部映射获取
  const elementId = element.id || element.businessObject?.id
  if (elementId && activeSkinMap[elementId]) {
    return activeSkinMap[elementId]
  }

  // 2. 从 moddle extension 获取
  const bo = getBusinessObject(element)
  if (bo?.extensionElements?.values) {
    for (const ext of bo.extensionElements.values) {
      if (ext.skinCode) {
        return ext.skinCode
      }
      if (ext.$type === 'flowable:SkinDef' && ext.skinCode) {
        return ext.skinCode
      }
    }
  }

  return null
}

/**
 * 设置外部皮肤映射
 */
export function setActiveSkinMap(skinMap: Record<string, string>): void {
  activeSkinMap = skinMap
}

/**
 * 根据状态码匹配合适的 state key
 */
export function getMatchingStateKey(stepStatus: number): string {
  if (stepStatus >= 40 && stepStatus < 50) return 'completed'
  if (stepStatus === 30) return 'activated'
  if (stepStatus === 20) return 'waiting'
  if (stepStatus === 10) return 'suspended'
  if (stepStatus === 0) return 'created'
  if (stepStatus === 60) return 'failed'
  if (stepStatus === 70) return 'killed'
  if (stepStatus >= 90) return 'rejected'
  return 'default'
}

/**
 * 递归合并两个对象（用于 $extends 皮肤继承）
 * 与 Object.assign 不同，deepMerge 会递归合并嵌套对象
 */
function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], source[key])
      } else {
        result[key] = source[key]
      }
    } else {
      result[key] = source[key]
    }
  }
  return result
}

/**
 * 加载皮肤定义（支持 $extends 继承）
 *
 * 如果皮肤定义包含 "$extends" 字段，先加载基础皮肤，
 * 然后在基础皮肤之上应用当前皮肤的覆盖。
 */
export async function loadSkinDef(skinCode: string): Promise<any> {
  if (skinDefCache.has(skinCode)) {
    return skinDefCache.get(skinCode)
  }

  // 防止并行重复请求
  if (pendingLoads.has(skinCode)) {
    return pendingLoads.get(skinCode)
  }

  const promise = _doLoadSkinDef(skinCode)
  pendingLoads.set(skinCode, promise)

  try {
    const result = await promise
    return result
  } finally {
    pendingLoads.delete(skinCode)
  }
}

async function _doLoadSkinDef(skinCode: string): Promise<any> {
  try {
    const baseUrl = (window as any).__NOP_BASE_PATH || ''
    const url = `${baseUrl}/r/WfSkinBizModel_getSkinDef?code=${encodeURIComponent(skinCode)}`
    const resp = await fetch(url)
    const data = await resp.json()
    let skinJson = data?.data?.skinJson || {}

    // 解析 $extends 皮肤继承
    if (skinJson.$extends && typeof skinJson.$extends === 'string') {
      const baseSkinCode = skinJson.$extends
      const baseSkin = await loadSkinDef(baseSkinCode)
      if (baseSkin) {
        // 基础皮肤作为 base，当前皮肤作为 delta overlay
        skinJson = deepMerge({}, baseSkin)
        // 重新应用当前皮肤的顶层属性（覆盖 base）
        const currentOverrides = data?.data?.skinJson || {}
        for (const key of Object.keys(currentOverrides)) {
          if (key !== '$extends') {
            if (currentOverrides[key] && typeof currentOverrides[key] === 'object' && !Array.isArray(currentOverrides[key])) {
              skinJson[key] = deepMerge(skinJson[key] || {}, currentOverrides[key])
            } else {
              skinJson[key] = currentOverrides[key]
            }
          }
        }
      }
    }

    skinDefCache.set(skinCode, skinJson)
    return skinJson
  } catch (e) {
    console.error(`[WfSkin] Failed to load skin def: ${skinCode}`, e)
    return null
  }
}

/**
 * 预加载多个皮肤定义
 */
export async function preloadSkinDefs(skinCodes: string[]): Promise<void> {
  const unloaded = skinCodes.filter((c) => !skinDefCache.has(c))
  await Promise.all(unloaded.map((c) => loadSkinDef(c)))
}

/**
 * 调用后端 evalSkinStyle API 计算样式
 */
export async function resolveSkinStyle(
  skinJson: any,
  runtimeState: Record<string, any>,
): Promise<Record<string, any>> {
  // 生成缓存 key
  const cacheKey = JSON.stringify({ skinJson, runtimeState })
  if (skinStyleCache.has(cacheKey)) {
    return skinStyleCache.get(cacheKey)
  }

  try {
    const baseUrl = (window as any).__NOP_BASE_PATH || ''
    const resp = await fetch(`${baseUrl}/r/WfSkinBizModel_evalSkinStyle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skinJson,
        runtimeState,
      }),
    })
    const data = await resp.json()
    const resolved = data?.data?.resolvedStyle || {}
    skinStyleCache.set(cacheKey, resolved)
    return resolved
  } catch (e) {
    console.error('[WfSkin] evalSkinStyle failed', e)
    return {}
  }
}

/**
 * 获取元素的运行时上下文
 */
export function buildRuntimeState(
  stepStatus: number | null,
  progress?: number,
  assignee?: string,
  displayName?: string,
): Record<string, any> {
  const statusNames: Record<number, string> = {
    0: 'CREATED',
    10: 'SUSPENDED',
    20: 'WAITING',
    30: 'ACTIVATED',
    35: 'EXECUTED',
    40: 'COMPLETED',
    50: 'EXPIRED',
    60: 'FAILED',
    70: 'KILLED',
    80: 'SKIPPED',
    90: 'REJECTED',
    100: 'WITHDRAWN',
    110: 'CANCELLED',
    120: 'TRANSFERRED',
  }

  return {
    stepStatus,
    stepStatusName: stepStatus != null ? (statusNames[stepStatus] || 'UNKNOWN') : 'UNKNOWN',
    progress: progress ?? 0,
    assignee: assignee ?? '',
    displayName: displayName ?? '',
  }
}

// 设计态：使用模拟的运行时上下文预览皮肤
export function buildMockRuntimeState(stepStatus: number): Record<string, any> {
  const mockState: Record<number, { progress: number; assignee: string }> = {
    30: { progress: 45, assignee: '当前办理人' },
    40: { progress: 100, assignee: '张三' },
    60: { progress: 30, assignee: '张三' },
    0: { progress: 0, assignee: '' },
  }
  const m = mockState[stepStatus] || { progress: 0, assignee: '' }
  return buildRuntimeState(stepStatus, m.progress, m.assignee, '审批节点')
}

/**
 * 清除所有缓存
 */
export function clearCache(): void {
  skinDefCache.clear()
  skinStyleCache.clear()
  pendingLoads.clear()
}
