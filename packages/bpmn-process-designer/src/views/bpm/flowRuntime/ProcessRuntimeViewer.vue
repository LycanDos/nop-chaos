<template>
  <div class="process-runtime-viewer">
    <!-- 工具栏 -->
    <div class="process-runtime-viewer__toolbar">
      <div class="process-runtime-viewer__toolbar-left">
        <el-button @click="goBack">← 返回列表</el-button>
        <el-button @click="refreshData" :loading="loading">刷新</el-button>
        <el-button @click="fitViewport">适应画布</el-button>
      </div>
      <div class="process-runtime-viewer__toolbar-right">
        <!-- 回退模式开关 -->
        <div class="rollback-switch-wrapper" :class="{ 'is-active': rollbackModeState.enabled.value }">
          <span class="rollback-switch-label">🔄 回退模式</span>
          <el-switch
            :model-value="rollbackModeState.enabled.value"
            @change="handleRollbackToggle"
          />
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="process-runtime-viewer__content">
      <!-- BPMN 画布 -->
      <div class="process-runtime-viewer__canvas" ref="canvasContainerRef"></div>
      <!-- 右侧信息面板 -->
      <div class="process-runtime-viewer__panel">
        <RuntimeInfoPanel
          :nodeId="selectedNodeId"
          :processInstanceId="processInstanceId"
          :runtimeData="runtimeData"
        />
      </div>
    </div>

    <!-- 回退确认对话框 -->
    <RollbackConfirmDialog
      v-model:visible="rollbackDialogVisible"
      :processInstanceId="processInstanceId"
      :targetNodeId="rollbackTargetNodeId"
      :impactData="rollbackImpactData"
      @success="onRollbackSuccess"
    />

    <!-- 状态栏 -->
    <div class="process-runtime-viewer__statusbar">
      <template v-if="runtimeData">
        <span>实例: {{ processInstanceId }}</span>
        <span class="statusbar-divider">|</span>
        <span>流程: {{ runtimeData.instance?.flowName || runtimeData.instance?.flowDefId || '-' }}</span>
        <span class="statusbar-divider">|</span>
        <span>已执行: {{ runtimeData.nodeExecutions?.length || 0 }} 节点</span>
        <span class="statusbar-divider">|</span>
        <span>状态: <el-tag :type="instanceStatusType" size="small">{{ instanceStatusLabel }}</el-tag></span>
      </template>
      <span v-else-if="loading">加载中...</span>
      <span v-else>等待加载</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
/**
 * 流程运行时视图页
 * 展示流程实例的 BPMN 画布（只读）+ 运行时状态叠加层 + 右侧信息面板
 */
import request from '@/config/axios'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import { useRuntimeOverlay } from './composables/useRuntimeOverlay'
import { useRollbackMode } from './composables/useRollbackMode'
import RuntimeInfoPanel from './components/RuntimeInfoPanel.vue'
import RollbackConfirmDialog from './components/RollbackConfirmDialog.vue'
// 运行时状态叠加层样式
import './styles/runtime-overlay.css'
// 回退模式样式
import './styles/rollback-mode.css'

defineOptions({ name: 'FlowRuntimeViewer' })

const route = useRoute()
const router = useRouter()

/** 支持 props 传入或从路由参数获取流程实例 ID */
const props = defineProps<{
  processInstanceId?: string
}>()

const processInstanceId = props.processInstanceId || (route.params.processInstanceId as string)

/** 运行时数据 */
const runtimeData = ref<any>(null)
/** 加载状态 */
const loading = ref(false)
/** 当前选中的节点 ID（点击画布节点时设置） */
const selectedNodeId = ref<string | null>(null)

/** 回退确认对话框相关状态 */
const rollbackDialogVisible = ref(false)
const rollbackTargetNodeId = ref('')
const rollbackImpactData = ref<any>(null)
/** 回退影响分析加载状态 */
const rollbackAnalyzing = ref(false)

/** 实例状态 → ElTag type 映射 */
const instanceStatusType = computed(() => {
  const status = runtimeData.value?.instance?.status
  const map: Record<string, string> = {
    running: '',
    completed: 'success',
    failed: 'danger',
    suspended: 'warning',
    cancelled: 'info',
  }
  return map[status] ?? 'info'
})

/** 实例状态 → 中文标签映射 */
const instanceStatusLabel = computed(() => {
  const status = runtimeData.value?.instance?.status
  const map: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    failed: '已失败',
    suspended: '已挂起',
    cancelled: '已取消',
  }
  return map[status] ?? status ?? '未知'
})
/** BPMN 画布容器引用 */
const canvasContainerRef = ref<HTMLDivElement>()
/** bpmn-js NavigatedViewer 实例（只读画布） */
const viewerRef = ref<any>(null)

/** 初始化运行时叠加层组合式函数 */
const { applyOverlays, clearOverlays, registerClickHandler } = useRuntimeOverlay(
  viewerRef,
  runtimeData,
  selectedNodeId,
)

/** 初始化回退模式组合式函数 */
const rollbackModeState = useRollbackMode(
  viewerRef,
  runtimeData,
  processInstanceId,
)

/** 切换回退模式 */
function handleRollbackToggle() {
  rollbackModeState.toggle()
}

/**
 * 回退模式下点击已执行节点的处理
 * 调用 analyzeRollbackImpact API 获取影响分析，然后弹出确认对话框
 */
async function handleRollbackNodeClick(nodeId: string) {
  if (!rollbackModeState.isClickableNode(nodeId)) return

  rollbackAnalyzing.value = true
  try {
    const res = await request.post({
      url: '/graphql',
      data: {
        query: `query($processInstanceId: String!, $targetNodeId: String!) {
          LProcessConsole__analyzeRollbackImpact(
            processInstanceId: $processInstanceId,
            targetNodeId: $targetNodeId
          ) {
            targetNodeId
            targetNodeName
            affectedNodes {
              nodeId
              nodeName
              executionSeq
              rollbackType
              hasCompensation
              compensationMethodName
            }
            sideEffectCount
            compensableCount
            irreversibleCount
            targetVariableSnapshot
          }
        }`,
        variables: {
          processInstanceId,
          targetNodeId: nodeId,
        },
      },
    })

    const impactData = res?.LProcessConsole__analyzeRollbackImpact
    if (impactData) {
      rollbackTargetNodeId.value = nodeId
      rollbackImpactData.value = impactData
      rollbackDialogVisible.value = true
    }
  } catch (err: any) {
    console.error('[ProcessRuntimeViewer] 回退影响分析失败:', err)
    ElMessage.error(`回退影响分析失败：${err?.message || '未知错误'}`)
  } finally {
    rollbackAnalyzing.value = false
  }
}

/**
 * 回退成功后的回调
 * 关闭回退模式并刷新运行时视图
 */
function onRollbackSuccess() {
  // 关闭回退模式
  rollbackModeState.disable()
  // 刷新运行时数据
  refreshData()
}

/**
 * 初始化 bpmn-js NavigatedViewer 只读画布
 * 在运行时数据加载完成后调用
 */
async function initViewer() {
  if (!canvasContainerRef.value || !runtimeData.value?.bpmnXml) return

  // 如果已有 viewer 实例，先销毁
  if (viewerRef.value) {
    clearOverlays()
    viewerRef.value.destroy()
    viewerRef.value = null
  }

  // 创建 NavigatedViewer 实例（天然只读，仅支持平移和缩放）
  const viewer = new NavigatedViewer({
    container: canvasContainerRef.value,
  })
  viewerRef.value = viewer

  try {
    // 导入 BPMN XML 渲染流程图
    const { warnings } = await viewer.importXML(runtimeData.value.bpmnXml)
    if (warnings && warnings.length) {
      warnings.forEach((w: string) => console.warn('[ProcessRuntimeViewer] importXML 警告:', w))
    }

    // 适应视口
    fitViewport()

    // 注册画布节点点击事件
    registerClickHandler()

    // 注册回退模式下的节点点击事件
    registerRollbackClickHandler()

    // 应用运行时状态叠加层（节点颜色、序号徽章、连线高亮）
    applyOverlays()
  } catch (err) {
    console.error('[ProcessRuntimeViewer] BPMN XML 导入失败:', err)
  }
}

/**
 * 注册回退模式下的节点点击事件
 * 在回退模式开启时，点击已执行节点触发回退影响分析
 */
function registerRollbackClickHandler() {
  const viewer = viewerRef.value
  if (!viewer) return

  const eventBus = viewer.get('eventBus')
  eventBus.on('element.click', (event: any) => {
    // 仅在回退模式开启时处理
    if (!rollbackModeState.enabled.value) return

    const element = event?.element
    if (!element) return

    // 忽略根元素（画布空白区域）
    if (element.type === 'bpmn:Process' || element.type === 'bpmn:Collaboration') return

    // 检查是否为可点击的已执行节点
    if (rollbackModeState.isClickableNode(element.id)) {
      handleRollbackNodeClick(element.id)
    }
  })
}

/**
 * 加载流程实例运行时数据
 * 调用 LProcessConsole__loadFlowInstanceRuntime GraphQL API
 */
async function loadRuntimeData() {
  loading.value = true
  try {
    const res = await request.post({
      url: '/graphql',
      data: {
        query: `query($processInstanceId: String!) {
          LProcessConsole__loadFlowInstanceRuntime(processInstanceId: $processInstanceId) {
            instance
            bpmnXml
            nodeExecutions {
              nodeId
              nodeName
              nodeType
              executionSeq
              status
              rollbackType
              hasCompensation
              invokeLogs
            }
            currentVars
            varLogs
          }
        }`,
        variables: {
          processInstanceId,
        },
      },
    })
    runtimeData.value = res?.LProcessConsole__loadFlowInstanceRuntime || null

    // 数据加载完成后初始化画布并渲染
    if (runtimeData.value) {
      await initViewer()
    }
  } catch (err) {
    console.error('[ProcessRuntimeViewer] 加载运行时数据失败:', err)
    runtimeData.value = null
  } finally {
    loading.value = false
  }
}

/** 返回流程实例列表页 */
function goBack() {
  // 根据当前路由前缀决定返回路径
  const currentPath = route.path
  const prefix = currentPath.startsWith('/process-center') ? '/process-center' : '/bpm'
  router.push(`${prefix}/flow-runtime`)
}

/** 刷新运行时数据 */
function refreshData() {
  selectedNodeId.value = null
  // 刷新时关闭回退模式
  if (rollbackModeState.enabled.value) {
    rollbackModeState.disable()
  }
  loadRuntimeData()
}

/**
 * 适应画布视口
 * 使用 bpmn-js canvas 的 zoom('fit-viewport') 方法
 */
function fitViewport() {
  const viewer = viewerRef.value
  if (!viewer) return
  try {
    const canvas = viewer.get('canvas')
    canvas.zoom('fit-viewport', 'auto')
  } catch (e) {
    console.warn('[ProcessRuntimeViewer] fitViewport 失败:', e)
  }
}

/** 页面加载时获取运行时数据 */
onMounted(() => {
  if (processInstanceId) {
    loadRuntimeData()
  }
})

/** 页面卸载时销毁 viewer 实例 */
onBeforeUnmount(() => {
  if (viewerRef.value) {
    viewerRef.value.destroy()
    viewerRef.value = null
  }
})

/** 暴露画布容器引用，供后续任务使用 */
defineExpose({
  canvasContainerRef,
  runtimeData,
  selectedNodeId,
  viewerRef,
})
</script>

<style scoped>
.process-runtime-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 工具栏 */
.process-runtime-viewer__toolbar {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid #dcdfe6;
  background: #fff;
}

.process-runtime-viewer__toolbar-left,
.process-runtime-viewer__toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 主内容区 */
.process-runtime-viewer__content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* BPMN 画布 */
.process-runtime-viewer__canvas {
  flex: 7;
  position: relative;
  overflow: hidden;
  background: #fafafa;
}

/* 右侧信息面板 */
.process-runtime-viewer__panel {
  flex: 3;
  border-left: 1px solid #dcdfe6;
  padding: 16px;
  overflow-y: auto;
  background: #fff;
  color: #606266;
  font-size: 14px;
}

/* 状态栏 */
.process-runtime-viewer__statusbar {
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-top: 1px solid #dcdfe6;
  background: #f5f7fa;
  font-size: 12px;
  color: #909399;
}

.statusbar-divider {
  margin: 0 8px;
  color: #dcdfe6;
}
</style>
