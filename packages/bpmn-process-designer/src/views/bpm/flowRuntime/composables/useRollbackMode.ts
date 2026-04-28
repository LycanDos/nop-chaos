/**
 * 回退模式组合式函数
 * 管理回退模式状态：开启/关闭、可逆性图标叠加、已执行节点可点击
 */
import { ref, type Ref } from 'vue'

/** 节点可逆性信息 */
interface NodeReversibilityInfo {
  rollbackType: 'REVERSIBLE' | 'COMPENSABLE' | 'IRREVERSIBLE'
  hasCompensation: boolean
}

/** 可逆性类型 → overlay HTML 映射 */
const ROLLBACK_ICON_MAP: Record<string, { html: string; cssClass: string }> = {
  REVERSIBLE: {
    html: '<div class="rollback-icon--reversible">↩</div>',
    cssClass: 'rollback-icon--reversible',
  },
  COMPENSABLE: {
    html: '<div class="rollback-icon--compensable">⚠↩</div>',
    cssClass: 'rollback-icon--compensable',
  },
  IRREVERSIBLE: {
    html: '<div class="rollback-icon--irreversible">🚫</div>',
    cssClass: 'rollback-icon--irreversible',
  },
}

/** overlay 类型标识，用于批量移除 */
const ROLLBACK_OVERLAY_TYPE = 'rollback-icon'

/** 回退模式可点击节点的 CSS marker */
const ROLLBACK_CLICKABLE_MARKER = 'rollback-clickable'

/**
 * 组合式函数：管理回退模式
 * @param viewerRef - bpmn-js NavigatedViewer 实例的 ref
 * @param runtimeDataRef - 运行时数据的 ref
 * @param processInstanceId - 流程实例 ID
 */
export function useRollbackMode(
  viewerRef: Ref<any>,
  runtimeDataRef: Ref<any>,
  processInstanceId: string,
) {
  /** 回退模式是否开启 */
  const enabled = ref(false)
  /** 节点可逆性信息 Map<nodeId, info> */
  const nodeReversibility = ref<Map<string, NodeReversibilityInfo>>(new Map())

  /** 已添加 rollback-clickable marker 的节点 ID 列表（用于清除） */
  let markedNodeIds: string[] = []

  /**
   * 开启回退模式
   * 1. 从 runtimeData.nodeExecutions 获取节点可逆性信息
   * 2. 在已执行节点上叠加可逆性图标 overlay
   * 3. 已执行节点鼠标样式变为 pointer（通过 CSS marker）
   */
  function enable() {
    const viewer = viewerRef.value
    const runtimeData = runtimeDataRef.value
    if (!viewer || !runtimeData) return

    const canvas = viewer.get('canvas')
    const overlays = viewer.get('overlays')
    const elementRegistry = viewer.get('elementRegistry')

    const nodeExecutions: any[] = runtimeData.nodeExecutions || []

    // 构建节点可逆性 Map
    const reversibilityMap = new Map<string, NodeReversibilityInfo>()
    for (const node of nodeExecutions) {
      reversibilityMap.set(node.nodeId, {
        rollbackType: node.rollbackType || 'REVERSIBLE',
        hasCompensation: !!node.hasCompensation,
      })
    }
    nodeReversibility.value = reversibilityMap

    // 在画布根元素上添加回退模式激活标记
    const rootElement = canvas.getRootElement()
    if (rootElement) {
      try {
        canvas.addMarker(rootElement.id, 'rollback-mode-active')
      } catch (_) {
        // 忽略
      }
    }

    // 为每个已执行节点叠加可逆性图标和可点击 marker
    for (const node of nodeExecutions) {
      const { nodeId, rollbackType } = node
      // 检查元素是否存在于画布中
      if (!elementRegistry.get(nodeId)) continue

      // 跳过已回退的节点
      if (node.status === 'rolled_back') continue

      // 添加可逆性图标 overlay
      const iconConfig = ROLLBACK_ICON_MAP[rollbackType || 'REVERSIBLE']
      if (iconConfig) {
        try {
          overlays.add(nodeId, ROLLBACK_OVERLAY_TYPE, {
            position: { top: -14, right: -14 },
            html: iconConfig.html,
          })
        } catch (e) {
          console.warn(`[RollbackMode] 添加可逆性图标失败: nodeId=${nodeId}`, e)
        }
      }

      // 添加可点击 marker（用于 CSS hover 效果和 cursor: pointer）
      try {
        canvas.addMarker(nodeId, ROLLBACK_CLICKABLE_MARKER)
        markedNodeIds.push(nodeId)
      } catch (e) {
        console.warn(`[RollbackMode] 添加可点击标记失败: nodeId=${nodeId}`, e)
      }
    }

    enabled.value = true
  }

  /**
   * 关闭回退模式
   * 移除所有回退相关 overlay 和 marker，恢复鼠标样式
   */
  function disable() {
    const viewer = viewerRef.value
    if (!viewer) return

    try {
      const canvas = viewer.get('canvas')
      const overlays = viewer.get('overlays')

      // 移除画布根元素上的回退模式标记
      const rootElement = canvas.getRootElement()
      if (rootElement) {
        try {
          canvas.removeMarker(rootElement.id, 'rollback-mode-active')
        } catch (_) {
          // 忽略
        }
      }

      // 移除所有可逆性图标 overlay
      overlays.remove({ type: ROLLBACK_OVERLAY_TYPE })

      // 移除所有可点击 marker
      for (const nodeId of markedNodeIds) {
        try {
          canvas.removeMarker(nodeId, ROLLBACK_CLICKABLE_MARKER)
        } catch (_) {
          // 忽略：元素可能不存在
        }
      }
      markedNodeIds = []
    } catch (e) {
      console.warn('[RollbackMode] 关闭回退模式失败:', e)
    }

    // 清空可逆性信息
    nodeReversibility.value = new Map()
    enabled.value = false
  }

  /**
   * 切换回退模式
   */
  function toggle() {
    enabled.value ? disable() : enable()
  }

  /**
   * 判断指定节点是否为已执行的可点击节点（回退模式下）
   */
  function isClickableNode(nodeId: string): boolean {
    return enabled.value && nodeReversibility.value.has(nodeId)
  }

  return {
    enabled,
    nodeReversibility,
    toggle,
    enable,
    disable,
    isClickableNode,
  }
}
