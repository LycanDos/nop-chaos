/**
 * 运行时状态叠加层组合式函数
 * 管理 BPMN 画布上的节点颜色标注、执行序号徽章、连线高亮
 */
import { type Ref } from 'vue'

/** 节点执行状态 → CSS 类映射 */
const STATUS_CSS_MAP: Record<string, string> = {
  completed: 'runtime-node--completed',
  running: 'runtime-node--running',
  failed: 'runtime-node--failed',
  rolled_back: 'runtime-node--rolled-back',
}

/** 已执行连线的 CSS 类 */
const FLOW_EXECUTED_CLASS = 'runtime-flow--executed'

/**
 * 生成执行序号徽章 HTML
 */
function badgeHtml(seq: number): string {
  return `<div class="execution-badge">${seq}</div>`
}

/**
 * 组合式函数：管理运行时状态叠加层
 * @param viewerRef - bpmn-js NavigatedViewer 实例的 ref
 * @param runtimeDataRef - 运行时数据的 ref
 * @param selectedNodeIdRef - 当前选中节点 ID 的 ref
 */
export function useRuntimeOverlay(
  viewerRef: Ref<any>,
  runtimeDataRef: Ref<any>,
  selectedNodeIdRef: Ref<string | null>,
) {
  /** 已添加 marker 的元素 ID 列表（用于清除） */
  let markedElementIds: string[] = []
  /** overlays 类型标识 */
  const OVERLAY_TYPE = 'execution-badge'

  /**
   * 应用运行时状态叠加层
   * 在 BPMN XML 导入完成后调用
   */
  function applyOverlays() {
    const viewer = viewerRef.value
    const runtimeData = runtimeDataRef.value
    if (!viewer || !runtimeData) return

    // 先清除已有叠加层
    clearOverlays()

    const canvas = viewer.get('canvas')
    const overlays = viewer.get('overlays')
    const elementRegistry = viewer.get('elementRegistry')

    const nodeExecutions: any[] = runtimeData.nodeExecutions || []

    // 1. 为每个已执行节点设置颜色标注和序号徽章
    for (const node of nodeExecutions) {
      const { nodeId, executionSeq, status } = node
      // 检查元素是否存在于画布中
      if (!elementRegistry.get(nodeId)) continue

      // 添加状态颜色标注
      const cssClass = STATUS_CSS_MAP[status]
      if (cssClass) {
        canvas.addMarker(nodeId, cssClass)
        markedElementIds.push(nodeId)
      }

      // 添加执行序号徽章
      if (executionSeq != null) {
        try {
          overlays.add(nodeId, OVERLAY_TYPE, {
            position: { top: -14, left: -14 },
            html: badgeHtml(executionSeq),
          })
        } catch (e) {
          console.warn(`[RuntimeOverlay] 添加序号徽章失败: nodeId=${nodeId}`, e)
        }
      }
    }

    // 2. 高亮已执行的连线
    highlightExecutedFlows(canvas, elementRegistry, nodeExecutions)
  }

  /**
   * 高亮已执行的连线（sequence flow）
   * 如果连线的 source 和 target 都是已执行节点，则高亮该连线
   */
  function highlightExecutedFlows(
    canvas: any,
    elementRegistry: any,
    nodeExecutions: any[],
  ) {
    const executedNodeIds = new Set(nodeExecutions.map((n: any) => n.nodeId))

    elementRegistry.forEach((element: any) => {
      // 只处理连线类型
      if (element.type !== 'bpmn:SequenceFlow') return

      const sourceId = element.source?.id
      const targetId = element.target?.id

      // 如果连线的源和目标都是已执行节点，则高亮
      if (sourceId && targetId && executedNodeIds.has(sourceId) && executedNodeIds.has(targetId)) {
        canvas.addMarker(element.id, FLOW_EXECUTED_CLASS)
        markedElementIds.push(element.id)
      }
    })
  }

  /**
   * 清除所有运行时叠加层
   */
  function clearOverlays() {
    const viewer = viewerRef.value
    if (!viewer) return

    try {
      const canvas = viewer.get('canvas')
      const overlays = viewer.get('overlays')

      // 移除所有状态颜色标注
      for (const elementId of markedElementIds) {
        // 移除所有可能的状态类
        for (const cssClass of Object.values(STATUS_CSS_MAP)) {
          if (cssClass) {
            try {
              canvas.removeMarker(elementId, cssClass)
            } catch (_) {
              // 忽略：元素可能不存在
            }
          }
        }
        // 移除连线高亮
        try {
          canvas.removeMarker(elementId, FLOW_EXECUTED_CLASS)
        } catch (_) {
          // 忽略
        }
      }
      markedElementIds = []

      // 移除所有执行序号徽章
      overlays.remove({ type: OVERLAY_TYPE })
    } catch (e) {
      console.warn('[RuntimeOverlay] 清除叠加层失败:', e)
    }
  }

  /**
   * 注册画布节点点击事件
   * 点击已执行节点时设置 selectedNodeId
   */
  function registerClickHandler() {
    const viewer = viewerRef.value
    if (!viewer) return

    const eventBus = viewer.get('eventBus')
    eventBus.on('element.click', (event: any) => {
      const element = event?.element
      if (!element) return

      // 点击画布空白区域（根元素）时清空选中
      if (element.type === 'bpmn:Process' || element.type === 'bpmn:Collaboration') {
        selectedNodeIdRef.value = null
        return
      }

      // 设置选中节点 ID
      selectedNodeIdRef.value = element.id
    })
  }

  return {
    applyOverlays,
    clearOverlays,
    registerClickHandler,
  }
}
