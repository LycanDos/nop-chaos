<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, customRef, markRaw, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef } from 'vue'
// CSS 依赖由使用方（如 nop-site）自行导入，避免库构建后字体路径断裂
// 使用方需要导入：
//   import 'bpmn-js/dist/assets/diagram-js.css'
//   import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
//   import 'bpmn-js/dist/assets/bpmn-js.css'
//   import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
//   import 'diagram-js-minimap/assets/diagram-js-minimap.css'
//   import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
//   import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'
//   import 'bpmn-js-color-picker/colors/color-picker.css'
import ToggleMode from 'bpmn-js-token-simulation/lib/features/toggle-mode/modeler/ToggleMode'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import {
  CaretLeftOutlined,
  CaretRightOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  SettingOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons-vue'
import type CommandStack from 'diagram-js/lib/command/CommandStack'
import BpmnPanel from './BpmnPanel.vue'
import BpmnDesigner from './BpmnModeler.tsx'
import EmptyXML from './EmptyXML'
import type { Injector } from 'didi'
import { getRootElement, nextId } from './utils/ElementUtil.ts'
import type { ElementIssue, Issues, Linting } from 'bpmn-js-bpmnlint'
import type Canvas from 'diagram-js/lib/core/Canvas'
import type { Minimap } from 'diagram-js-minimap'
import { layoutProcess } from 'bpmn-auto-layout'
import { EXECUTOR_API_KEY, type ExecutorApiAdapter } from '../hooks/useExecutorApi'
import { ReverseSimulationController } from './reverseSimulation.ts'

defineOptions({
  name: 'ProcessDesigner',
})
const props = defineProps<{
  id?: string
  name?: string
  xml?: string
  idPrefix?: string
  /** 执行器 API 适配器，由使用方注入实际的请求实现 */
  executorApi?: ExecutorApiAdapter
}>()
const mockVisible = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      const toggleMode = modeler.value?.get<ToggleMode>('toggleMode')
      return toggleMode?._active || false
    },
    set() {
      const toggleMode = modeler.value?.get<ToggleMode>('toggleMode')
      toggleMode?.toggleMode()
      trigger()
    },
  }
})
const lintVisible = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      const linting = injector.value?.get<Linting>('linting')
      return linting?.isActive() || false
    },
    set(newValue: boolean) {
      const linting = injector.value?.get<Linting>('linting')
      linting?.toggle(newValue)
      trigger()
    },
  }
})
const mapVisible = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      const minimap = modeler.value?.get<Minimap>('minimap')
      return minimap?.isOpen() || false
    },
    set(newValue: boolean) {
      const minimap = modeler.value?.get<Minimap>('minimap')
      minimap?.toggle(newValue)
      trigger()
    },
  }
})
const zoom = customRef<number>((track, trigger) => {
  return {
    get() {
      track()
      return modeler.value?.get<Canvas>('canvas')?.zoom() || 1
    },
    set(newValue: number) {
      modeler.value?.get<Canvas>('canvas')?.zoom(newValue)
      trigger()
    },
  }
})
const zoomPercent = computed(() => (zoom.value * 100).toFixed(0) + '%')
const isDark = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      return document.documentElement.classList.contains('dark')
    },
    set(newValue: boolean) {
      if (newValue) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      trigger()
    },
  }
})
const rightArrow = ref(true)
const asideWidth = ref(370)
const isDragging = ref(false)
const issuesList = ref<ElementIssue[]>([])
const modeler = shallowRef<BpmnModeler>()
const injector = shallowRef<Injector>()
const reverseSimulation = shallowRef<ReverseSimulationController>()
const reverseMockVisible = ref(false)
const fileRef = ref<HTMLInputElement>()
const labelPosition = ref('left')
const formSize = ref('small')
const isPreviewMode = computed(() => mockVisible.value || reverseMockVisible.value)
const showRightPanel = computed(() => rightArrow.value && !isPreviewMode.value)

// ========== 侧边栏拖拽调整宽度 ==========
const MIN_ASIDE_WIDTH = 280
const MAX_ASIDE_WIDTH = 700

const onDragStart = (e: MouseEvent) => {
  if (!rightArrow.value || mockVisible.value || reverseMockVisible.value) return
  e.preventDefault()
  isDragging.value = true
  const startX = e.clientX
  const startWidth = asideWidth.value

  const onMouseMove = (ev: MouseEvent) => {
    // 向左拖 → 宽度增大（startX - ev.clientX 为正值）
    const delta = startX - ev.clientX
    const newWidth = Math.min(MAX_ASIDE_WIDTH, Math.max(MIN_ASIDE_WIDTH, startWidth + delta))
    asideWidth.value = newWidth
  }

  const onMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
const importXml = () => {
  const file = fileRef.value?.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = async () => {
      const result = reader.result
      if (result && typeof result === 'string') {
        const xmlResult = await modeler.value?.importXML(result)
        if (xmlResult) {
          const { warnings } = xmlResult
          console.log('警告：', warnings)
        }
        if (fileRef.value) {
          fileRef.value.value = ''
        }
      }
    }
  }
}
const exportXml = async () => {
  const xml = await getXml()
  if (xml) {
    const rootElement = getRootElement()
    const blob = new Blob([xml], { type: 'text/xml' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${rootElement?.businessObject.get('name') || '匿名流程'}.bpmn20.xml`
    a.click()
    window.URL.revokeObjectURL(url)
  }
}
const exportSvg = () => {
  modeler.value?.saveSVG().then(({ svg }) => {
    const replacedSvg = svg
      .replace(/var\(--bjsl-fill-color\)/g, '#fff')
      .replace(/var\(--bjsl-stroke-color\)/g, '#000')
    const blob = new Blob([replacedSvg], { type: 'image/svg+xml' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `匿名流程.svg`
    a.click()
    window.URL.revokeObjectURL(url)
  })
}
const redo = () => {
  modeler.value?.get<CommandStack>('commandStack').redo()
}
const undo = () => {
  modeler.value?.get<CommandStack>('commandStack').undo()
}
const layout = async () => {
  const xml = await getXml()
  if (xml) {
    const diagramWithLayoutXML = await layoutProcess(xml)
    modeler.value?.importXML(diagramWithLayoutXML)
  }
}
const restart = () => {
  modeler.value?.get<CommandStack>('commandStack').clear()
  const xml = EmptyXML(props.id || nextId('Process_'), props.name || '新建流程')
  modeler.value?.importXML(props.xml || xml)
  modeler.value?.get<Canvas>('canvas')?.zoom('fit-viewport')
}
const loadXml = (xml: string) => {
  modeler.value?.importXML(xml)
}
const getXml = async () => {
  const res = await modeler.value?.saveXML({ format: true, preamble: true })
  return res?.xml
}
const modelerReady = async (bpmnModeler: BpmnModeler) => {
  modeler.value = markRaw(bpmnModeler)
  injector.value = markRaw(bpmnModeler.get<Injector>('injector'))
  reverseSimulation.value = markRaw(new ReverseSimulationController(bpmnModeler, {
    executorApi: props.executorApi,
  }))
  modeler.value?.on<{ issues: Issues }>('linting.completed', ({ issues }) => {
    issuesList.value = Object.values(issues).flat()
  })
  restart()
  setupMinimapTitlebar()
  // await bpmnModeler.createDiagram()
}
const toggleMockVisible = () => {
  if (reverseMockVisible.value) {
    reverseSimulation.value?.deactivate()
    reverseMockVisible.value = false
  }
  mockVisible.value = !mockVisible.value
}
const toggleReverseMockVisible = () => {
  if (mockVisible.value) {
    mockVisible.value = false
  }
  if (reverseMockVisible.value) {
    reverseSimulation.value?.deactivate()
    reverseMockVisible.value = false
  } else {
    reverseMockVisible.value = true
    try {
      reverseSimulation.value?.activate()
    } catch (error) {
      reverseMockVisible.value = false
      throw error
    }
  }
}
const validate = async () => {
  const errors = issuesList.value.filter((issue) => issue.category === 'error')
  if (errors.length) {
    return errors
  }
  return []
}
const resetZoom = () => {
  zoom.value = 1
  modeler.value?.get<Canvas>('canvas')?.zoom('fit-viewport')
}
const toggleRightArrow = () => {
  if (isPreviewMode.value) {
    return message.warning('请先退出模拟预览模式')
  }
  rightArrow.value = !rightArrow.value
}
onBeforeUnmount(() => {
  reverseSimulation.value?.deactivate()
  reverseMockVisible.value = false
})
provide('ProcessDesigner', {
  modeler: modeler,
})
// 注入执行器 API 适配器，供 ExecutorTask 面板使用
if (props.executorApi) {
  provide(EXECUTOR_API_KEY, props.executorApi)
}

// 给 minimap 添加可拖动标题栏（含关闭/收起按钮）
function setupMinimapTitlebar() {
  nextTick(() => {
    setTimeout(() => {
      const minimap = document.querySelector('.djs-minimap') as HTMLElement
      if (!minimap || minimap.querySelector('.minimap-titlebar')) return
      minimap.classList.add('has-titlebar')

      const titlebar = document.createElement('div')
      titlebar.className = 'minimap-titlebar'
      titlebar.innerHTML = `
        <span class="minimap-titlebar__drag"></span>
        <span class="minimap-titlebar__actions">
          <button class="minimap-btn minimap-btn--minimize" title="收起">−</button>
          <button class="minimap-btn minimap-btn--close" title="关闭">×</button>
        </span>
      `
      minimap.insertBefore(titlebar, minimap.firstChild)

      // 收起/展开
      const minimizeBtn = titlebar.querySelector('.minimap-btn--minimize') as HTMLElement
      let minimized = false
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        minimized = !minimized
        let sibling = titlebar.nextElementSibling as HTMLElement | null
        while (sibling) {
          sibling.style.display = minimized ? 'none' : ''
          sibling = sibling.nextElementSibling as HTMLElement | null
        }
        minimizeBtn.textContent = minimized ? '+' : '−'
        minimap.style.maxHeight = minimized ? '22px' : '200px'
      })

      // 关闭
      const closeBtn = titlebar.querySelector('.minimap-btn--close') as HTMLElement
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        try { modeler.value?.get('minimap').toggle(false) } catch (_) { /* */ }
      })

      // 拖动
      let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0
      titlebar.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).closest('.minimap-btn')) return
        isDragging = true
        startX = e.clientX; startY = e.clientY
        const rect = minimap.getBoundingClientRect()
        const parent = (minimap.offsetParent || document.body).getBoundingClientRect()
        origX = rect.left - parent.left; origY = rect.top - parent.top
        e.preventDefault()
      })
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return
        minimap.style.position = 'absolute'
        minimap.style.left = (origX + e.clientX - startX) + 'px'
        minimap.style.top = (origY + e.clientY - startY) + 'px'
        minimap.style.right = 'auto'
        minimap.style.bottom = 'auto'
      })
      document.addEventListener('mouseup', () => { isDragging = false })
    }, 1000)
  })
}

defineExpose({
  loadXml,
  getXml,
  validate,
  /** 暴露 modeler 实例供外部使用 */
  getModeler: () => modeler.value,
})
</script>

<template>
  <div class="design-container">
    <input
      ref="fileRef"
      accept=".xml,.bpmn"
      @change="importXml"
      style="display: none"
      type="file"
    />
    <div class="design-toolbar">
      <a-space :size="4">
        <a-button-group>
          <a-tooltip placement="top" title="导入">
            <a-button type="text" @click="fileRef?.click()"><FolderOpenOutlined /></a-button>
          </a-tooltip>
          <a-tooltip placement="top" title="导出">
            <a-button type="text" @click="exportXml"><DownloadOutlined /></a-button>
          </a-tooltip>
        </a-button-group>

        <a-button-group>
          <a-tooltip placement="top" title="撤销">
            <a-button type="text" @click="undo"><RotateLeftOutlined /></a-button>
          </a-tooltip>
          <a-tooltip placement="top" title="恢复">
            <a-button type="text" @click="redo"><RotateRightOutlined /></a-button>
          </a-tooltip>
        </a-button-group>

        <a-button-group>
          <a-tooltip title="放大" placement="top-start">
            <a-button type="text" @click="zoom += 0.1" :disabled="zoom >= 1.7"><ZoomInOutlined /></a-button>
          </a-tooltip>
          <a-tooltip title="重置缩放" placement="top-start">
            <a-button type="text" @click="resetZoom">{{ zoomPercent }}</a-button>
          </a-tooltip>
          <a-tooltip title="缩小" placement="top-start">
            <a-button type="text" @click="zoom -= 0.1" :disabled="zoom <= 0.5"><ZoomOutOutlined /></a-button>
          </a-tooltip>
        </a-button-group>

        <a-button-group>
          <a-tooltip placement="top" title="重做">
            <a-button type="text" @click="restart"><DeleteOutlined /></a-button>
          </a-tooltip>
          <a-tooltip placement="top" title="流程模拟">
            <a-button type="text" @click="toggleMockVisible">
              <template #icon><PauseCircleOutlined v-if="mockVisible" /><PlayCircleOutlined v-else /></template>
              {{ mockVisible ? '退出模拟' : '开启模拟' }}
            </a-button>
          </a-tooltip>
          <a-tooltip placement="top" title="回退模拟">
            <a-button type="text" @click="toggleReverseMockVisible">
              <template #icon><PauseCircleOutlined v-if="reverseMockVisible" /><PlayCircleOutlined v-else /></template>
              {{ reverseMockVisible ? '退出回退预览' : '开启回退预览' }}
            </a-button>
          </a-tooltip>
          <a-tooltip placement="top" title="流程校验">
            <a-button
              type="text"
              @click="lintVisible = !lintVisible"
            >
              <template #icon><PauseCircleOutlined v-if="lintVisible" /><PlayCircleOutlined v-else /></template>
              {{ lintVisible ? '关闭校验' : '开启校验' }}
            </a-button>
          </a-tooltip>
          <a-tooltip placement="top" title="小地图">
            <a-button
              type="text"
              @click="mapVisible = !mapVisible"
            >
              <template #icon><PauseCircleOutlined v-if="mapVisible" /><PlayCircleOutlined v-else /></template>
              {{ mapVisible ? '收起地图' : '展开地图' }}
            </a-button>
          </a-tooltip>
        </a-button-group>
      </a-space>
    </div>
    <div class="design-body">
      <div class="design-canvas">
        <bpmn-designer @modeler-ready="modelerReady" />
        <div v-if="!isPreviewMode" class="right-panel-arrow" @click.stop="toggleRightArrow">
          <SettingOutlined :style="{ fontSize: '16px' }" />
        </div>
      </div>
      <!-- 拖拽分割条 -->
      <div
        v-show="showRightPanel"
        class="design-resize-handle"
        :class="{ 'design-resize-handle--active': isDragging }"
        @mousedown="onDragStart"
      />
      <div
        v-show="showRightPanel"
        class="design-aside"
        :style="{
          width: asideWidth + 'px',
          flex: '0 0 ' + asideWidth + 'px',
        }"
      >
        <BpmnPanel
          v-if="modeler"
          :modeler="modeler"
          :size="formSize"
          :label-position="labelPosition"
        ></BpmnPanel>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.design-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.design-toolbar {
  height: 36px;
  flex: 0 0 36px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  border-bottom: 1px solid #e8e8e8;
  box-sizing: border-box;
  background: #fafafa;

  :deep(.ant-space) { width: 100%; }
  :deep(.ant-btn-group) { 
    display: inline-flex; 
    border: 1px solid #d9d9d9; 
    border-radius: 6px; 
    overflow: hidden; 
  }
  :deep(.ant-btn-group .ant-btn) { 
    border: none; 
    border-radius: 0; 
    height: 28px; 
    width: 28px;
    min-width: 28px;
    padding: 0; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-size: 14px;
    color: #595959;
  }
  :deep(.ant-btn-group .ant-btn:not(:last-child)) { border-right: 1px solid #d9d9d9; }
  :deep(.ant-btn-group .ant-btn:hover) { color: #1677ff; background: #e6f4ff; }
  :deep(.ant-btn-text) { 
    border: 1px solid transparent !important; 
    border-radius: 6px;
    padding: 0 8px !important;
    width: auto !important;
    min-width: auto !important;
    height: 28px;
    font-size: 12px;
    color: #434343;
  }
  :deep(.ant-btn-text:hover) { border-color: #d9d9d9 !important; color: #1677ff; background: #f0f0f0; }
  :deep(.ant-btn-text .anticon) { margin-right: 4px; }
  .ant-space-item { display: flex; align-items: center; }
}

.design-body {
  flex: 1 1 0;
  display: flex;
  flex-direction: row;
  position: relative;
  overflow: hidden;
}

.design-canvas {
  flex: 1 1 0;
  position: relative;
  overflow: hidden;
}

.design-canvas :deep(.canvas) {
  position: absolute !important;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100% !important;
  height: 100% !important;
}

.design-aside {
  width: 370px;
  flex: 0 0 370px;
  border-left: 1px solid var(--el-border-color, #dcdfe6);
  background-color: var(--el-bg-color, #fff);
  overflow: hidden;
}

.design-resize-handle {
  flex: 0 0 2px;
  width: 2px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  z-index: 4;
  transition: background-color 0.15s;

  &:hover,
  &--active {
    background-color: var(--el-color-primary-light-7, #a0cfff);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -4px;
    right: -4px;
    bottom: 0;
  }
}

.right-panel-arrow {
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 3;
  transform: translateY(-50%);
  background-color: var(--el-bg-color, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  height: 48px;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  box-shadow: 0 4px 6px 0 rgba(8, 14, 26, 0.04), 0 1px 10px 0 rgba(8, 14, 26, 0.05), 0 2px 4px -1px rgba(8, 14, 26, 0.06);
  transition: all 0.2s ease;
  
  &:hover {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}
</style>

<style lang="scss">
/* minimap 标题栏样式（非 scoped，因为 .djs-minimap 在组件外） */
.djs-minimap {
  box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25);
  border: none;
  background-color: #fff;
  border-radius: 4px;
  overflow: hidden;
  width: 260px !important;
  height: auto !important;
  max-height: 200px;
  padding-top: 0;

  > .map {
    width: 260px !important;
    height: 150px !important;
    overflow: hidden;
    position: relative;
  }
}

.minimap-titlebar {
  height: 22px;
  background: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  cursor: move;
  user-select: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
}

.minimap-titlebar__drag {
  flex: 1;
  height: 100%;
}

.minimap-titlebar__actions {
  display: flex;
  gap: 2px;
}

.minimap-btn {
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: #999;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  position: relative;
  z-index: 31;

  &:hover {
    background: #e0e0e0;
    color: #333;
  }
}

.djs-minimap .viewport-dom {
  z-index: 8;
}

.djs-minimap.open .overlay {
  z-index: 7;
}

.djs-minimap.has-titlebar > .map {
  margin-top: 22px;
  position: relative;
}

.djs-minimap.has-titlebar .viewport-dom {
  top: 22px !important;
  transform: none !important;
}

.djs-minimap.has-titlebar.open .overlay {
  top: 22px !important;
}

.djs-minimap:not(.open) {
  display: none !important;
}
</style>
