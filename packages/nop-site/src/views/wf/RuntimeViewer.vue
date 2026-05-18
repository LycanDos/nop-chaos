<template>
  <div class="runtime-viewer" :style="{ height }">
    <!-- 工具栏 -->
    <div class="viewer-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">流程运行时视图</span>
        <span v-if="instanceInfo" class="toolbar-instance-id">
          {{ instanceInfo.wfName }} / {{ instanceInfo.wfId }}
          <el-tag :type="instanceStatusTag" size="small" effect="plain">
            {{ instanceInfo.status }}
          </el-tag>
        </span>
      </div>
      <div class="toolbar-right">
        <el-tooltip content="缩小" placement="bottom">
          <el-button size="small" text @click="zoomOut">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
        </el-tooltip>
        <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
        <el-tooltip content="放大" placement="bottom">
          <el-button size="small" text @click="zoomIn">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
        <el-tooltip content="重置视图" placement="bottom">
          <el-button size="small" text @click="resetView">
            <el-icon><FullScreen /></el-icon>
          </el-button>
        </el-tooltip>
        <el-divider direction="vertical" />
        <!-- 状态指示器 -->
        <div class="status-indicators">
          <span class="indicator-item"><span class="dot completed"></span>已运行</span>
          <span class="indicator-item"><span class="dot active"></span>执行中</span>
          <span class="indicator-item"><span class="dot failed"></span>异常</span>
          <span class="indicator-item"><span class="dot pending"></span>待执行</span>
        </div>
      </div>
    </div>

    <!-- 主区域：画布 + 右侧面板 -->
    <div class="viewer-body">
      <div class="viewer-canvas" ref="canvasRef"></div>
      <DetailPanel
        :visible="detailVisible"
        :step-info="selectedStepInfo"
        @close="closeDetail"
      />
    </div>

    <!-- 状态栏 -->
    <div v-if="instanceInfo" class="viewer-statusbar">
      <span>开始时间: {{ instanceInfo.startTime }}</span>
      <span v-if="instanceInfo.endTime"> | 结束时间: {{ instanceInfo.endTime }}</span>
      <span v-if="instanceInfo.bizKey"> | 业务键: {{ instanceInfo.bizKey }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { ZoomIn, ZoomOut, FullScreen } from '@element-plus/icons-vue'
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer'
import DetailPanel from './DetailPanel.vue'
import { applyStatusColors, renderExecBadges, clearExecBadges } from './StatusColorRenderer'
import { ElementPopupHandler } from './ElementPopupHandler'
import type { RuntimeViewerViewModel, StepRuntimeInfo } from './RuntimeDataProvider'
import { is } from 'bpmn-js/lib/util/ModelUtil'

const props = defineProps<{
  modelValue?: RuntimeViewerViewModel | null
  height?: string
}>()

const canvasRef = ref<HTMLDivElement | null>(null)
const viewer = ref<BpmnViewer | null>(null)
const zoomLevel = ref(1)
const detailVisible = ref(false)
const selectedStepInfo = ref<StepRuntimeInfo | null>(null)
const currentData = ref<RuntimeViewerViewModel | null>(null)
let popupHandler: ElementPopupHandler | null = null

const instanceInfo = computed(() => currentData.value?.instanceInfo ?? null)
const instanceStatusTag = computed(() => {
  const s = instanceInfo.value?.status || ''
  if (s === 'ACTIVATED' || s === '30') return 'primary'
  if (s === 'COMPLETED' || s === '40') return 'success'
  if (s === 'FAILED' || s === '60') return 'danger'
  return 'info'
})

onMounted(() => {
  initViewer()
  // 如果 props 中已有数据（v-if 条件渲染场景），补发加载
  if (props.modelValue?.bpmnXml) {
    loadDiagram(props.modelValue)
  }
})

onBeforeUnmount(() => {
  popupHandler?.destroy()
  viewer.value?.destroy()
})

watch(() => props.modelValue, async (data) => {
  if (data && data.bpmnXml) {
    await loadDiagram(data)
  }
})

async function initViewer() {
  if (!canvasRef.value) return

  const v = new BpmnViewer({
    container: canvasRef.value,
    width: '100%',
    height: '100%',
  })

  v.on('import.done', () => {
    zoomLevel.value = v.get('canvas').zoom()
    // 缩放适配
    v.get('canvas').zoom('fit-viewport', 'auto')
    zoomLevel.value = v.get('canvas').zoom()
  })

  // 点击元素事件
  v.on('element.click', (event: any) => {
    const element = event.element
    if (!element) return
    // 忽略根元素和连线点击
    if (!element.id || element.type === 'bpmn:Process' || element.type === 'bpmn:Collaboration') return

    handleElementClick(element)
  })

  viewer.value = v
  popupHandler = new ElementPopupHandler(v as any)
}

async function loadDiagram(data: RuntimeViewerViewModel) {
  const v = viewer.value
  if (!v) return

  currentData.value = data

  try {
    clearExecBadges(v as any)
    await v.importXML(data.bpmnXml)

    await nextTick()

    // 应用状态着色
    applyStatusColors(v as any, data.elementStates)

    // 渲染执行序号徽章
    renderExecBadges(v as any, data.elementStates)

    // 更新弹窗数据
    popupHandler?.updateRuntimeData(data.stepRuntimeMap)

    // 选中第一个 active 节点（如有）
    const activeState = data.elementStates.find(s => s.status === 'active')
    if (activeState) {
      const el = v.get('elementRegistry').get(activeState.elementId)
      if (el) {
        v.get('selection').select(el)
      }
    }
  } catch (e) {
    console.error('加载 BPMN 图失败:', e)
  }
}

function handleElementClick(element: any) {
  if (is(element, 'bpmn:SequenceFlow')) return

  const data = currentData.value
  if (!data) return

  const info = data.stepRuntimeMap.get(element.id)
  if (info) {
    selectedStepInfo.value = info
    detailVisible.value = true
  } else {
    selectedStepInfo.value = null
    detailVisible.value = false
    // 短提示（后续可改为 ElMessage）
    console.log('该节点尚未执行:', element.id)
  }
}

function closeDetail() {
  detailVisible.value = false
  selectedStepInfo.value = null
}

// 缩放控制
function zoomIn() {
  const v = viewer.value
  if (!v) return
  const canvas = v.get('canvas')
  const newZoom = Math.min(canvas.zoom() + 0.2, 2.5)
  canvas.zoom(newZoom)
  zoomLevel.value = canvas.zoom()
}

function zoomOut() {
  const v = viewer.value
  if (!v) return
  const canvas = v.get('canvas')
  const newZoom = Math.max(canvas.zoom() - 0.2, 0.3)
  canvas.zoom(newZoom)
  zoomLevel.value = canvas.zoom()
}

function resetView() {
  const v = viewer.value
  if (!v) return
  const canvas = v.get('canvas')
  canvas.zoom('fit-viewport', 'auto')
  zoomLevel.value = canvas.zoom()
}
</script>

<style scoped>
.runtime-viewer {
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}

/* 工具栏 */
.viewer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.toolbar-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}
.toolbar-instance-id {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 6px;
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.zoom-level {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: center;
}
.status-indicators {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 8px;
}
.indicator-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #666;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot.completed { background: #52c41a; }
.dot.active { background: #1890ff; }
.dot.failed { background: #ff4d4f; }
.dot.pending { background: #d9d9d9; }

/* 呼吸动画：执行中节点 */
:global(.bpmn-runtime-active) {
  animation: bpmn-runtime-pulse 2s ease-in-out infinite;
}
@keyframes bpmn-runtime-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* djs 画布里 .djs-visual 下的形状会继承 SVG 属性，这里仅针对执行中节点增加动画 */
:global(.bpmn-runtime-active .djs-visual rect),
:global(.bpmn-runtime-active .djs-visual circle),
:global(.bpmn-runtime-active .djs-visual polygon) {
  transition: fill 0.3s;
}

/* 主区域 */
.viewer-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.viewer-canvas {
  flex: 1;
  min-width: 0;
  position: relative;
}

/* 状态栏 */
.viewer-statusbar {
  padding: 6px 16px;
  background: #fafafa;
  border-top: 1px solid #e8e8e8;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
</style>

<!-- 全局样式：覆盖 bpmn-js 画布中的弹窗和徽章（overlay 元素不在 Vue 作用域内） -->
<style>
/* 悬停弹窗 */
.bpmn-runtime-popup {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  padding: 0;
  min-width: 180px;
  max-width: 260px;
  z-index: 1000;
  pointer-events: none;
  font-size: 12px;
  line-height: 1.5;
}
.bpmn-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  border-radius: 6px 6px 0 0;
}
.bpmn-popup-title {
  font-weight: 600;
  color: #333;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bpmn-popup-badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
  color: #fff;
}
.bpmn-popup-badge.is-completed { background: #52c41a; }
.bpmn-popup-badge.is-active { background: #1890ff; }
.bpmn-popup-badge.is-failed { background: #ff4d4f; }
.bpmn-popup-badge.is-rejected { background: #faad14; }
.bpmn-popup-badge.is-killed { background: #8c8c8c; }
.bpmn-popup-body {
  padding: 8px 12px;
}
.bpmn-popup-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  gap: 12px;
}
.bpmn-popup-label {
  color: #999;
  flex-shrink: 0;
}

/* 执行序号徽章 */
.bpmn-exec-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #52c41a;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  cursor: default;
}
.bpmn-exec-badge.is-active {
  background: #1890ff;
  animation: bpmn-badge-pulse 2s ease-in-out infinite;
}
@keyframes bpmn-badge-pulse {
  0%, 100% { box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
  50% { box-shadow: 0 1px 8px rgba(24,144,255,0.6); }
}
</style>
