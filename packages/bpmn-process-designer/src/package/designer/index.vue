<script setup lang="ts">
import { customRef, provide, ref } from 'vue'
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
  CaretLeft,
  CaretRight,
  Delete,
  Download,
  FolderOpened,
  RefreshLeft,
  RefreshRight,
  VideoPause,
  VideoPlay,
  ZoomIn,
  ZoomOut,
} from '@element-plus/icons-vue'
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
import { ElMessage } from 'element-plus'

defineOptions({
  name: 'ProcessDesigner',
})
const props = defineProps<{
  id?: string
  name?: string
  xml?: string
  idPrefix?: string
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
const issuesList = ref<ElementIssue[]>([])
const modeler = ref<BpmnModeler>()
const injector = ref<Injector>()
const fileRef = ref<HTMLInputElement>()
const labelPosition = ref('left')
const formSize = ref('small')
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
  modeler.value = bpmnModeler
  injector.value = bpmnModeler.get<Injector>('injector')
  modeler.value?.on<{ issues: Issues }>('linting.completed', ({ issues }) => {
    issuesList.value = Object.values(issues).flat()
  })
  restart()
  // await bpmnModeler.createDiagram()
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
  if (mockVisible.value) {
    return ElMessage.warning('请先退出模拟模式')
  }
  rightArrow.value = !rightArrow.value
}
provide('ProcessDesigner', {
  modeler: modeler,
})
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
      <el-space :size="10">
        <el-button-group size="small">
          <el-tooltip placement="top" content="导入">
            <el-button :icon="FolderOpened" @click="fileRef?.click()" />
          </el-tooltip>
          <el-tooltip placement="top" content="导出">
            <el-button :icon="Download" size="small" @click="exportXml" />
          </el-tooltip>
        </el-button-group>

        <el-button-group size="small">
          <el-tooltip placement="top" content="撤销">
            <el-button :icon="RefreshLeft" @click="undo" />
          </el-tooltip>
          <el-tooltip placement="top" content="恢复">
            <el-button :icon="RefreshRight" @click="redo" />
          </el-tooltip>
        </el-button-group>

        <el-button-group size="small">
          <el-tooltip content="放大" placement="top-start">
            <el-button :icon="ZoomIn" @click="zoom += 0.1" :disabled="zoom >= 1.7"></el-button>
          </el-tooltip>
          <el-tooltip content="重置缩放" placement="top-start">
            <el-button @click="resetZoom"> {{ (zoom * 100).toFixed(0) }}%</el-button>
          </el-tooltip>
          <el-tooltip content="缩小" placement="top-start">
            <el-button :icon="ZoomOut" @click="zoom -= 0.1" :disabled="zoom <= 0.5"></el-button>
          </el-tooltip>
        </el-button-group>

        <el-button-group size="small">
          <el-tooltip placement="top" content="重做">
            <el-button :icon="Delete" @click="restart" />
          </el-tooltip>
          <el-tooltip placement="top" content="流程模拟">
            <el-button
              :icon="mockVisible ? VideoPause : VideoPlay"
              @click="mockVisible = !mockVisible"
            >
              {{ mockVisible ? '退出模拟' : '开启模拟' }}
            </el-button>
          </el-tooltip>
          <el-tooltip placement="top" content="流程校验">
            <el-button
              :icon="lintVisible ? VideoPause : VideoPlay"
              @click="lintVisible = !lintVisible"
            >
              {{ lintVisible ? '关闭校验' : '开启校验' }}
            </el-button>
          </el-tooltip>
          <el-tooltip placement="top" content="小地图">
            <el-button
              :icon="mapVisible ? VideoPause : VideoPlay"
              @click="mapVisible = !mapVisible"
            >
              {{ mapVisible ? '收起地图' : '展开地图' }}
            </el-button>
          </el-tooltip>
        </el-button-group>
      </el-space>
    </div>
    <div class="design-body">
      <div class="design-canvas">
        <bpmn-designer @modeler-ready="modelerReady" />
        <div class="right-panel-arrow" @click="toggleRightArrow">
          <el-icon :size="15">
            <CaretRight v-if="rightArrow && !mockVisible" />
            <CaretLeft v-else />
          </el-icon>
        </div>
      </div>
      <div class="design-aside" :style="{ width: rightArrow && !mockVisible ? '370px' : '0px', flex: rightArrow && !mockVisible ? '0 0 370px' : '0 0 0px' }">
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
  height: 40px;
  line-height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  border-bottom: 1px solid var(--el-border-color, #dcdfe6);
  box-sizing: border-box;
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
  transition: width 0.3s ease, flex 0.3s ease;
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
  padding: 2px;
  height: 50px;
  border-radius: 10px 0 0 10px;
  cursor: pointer;
  box-shadow: -7px 0 7px -5px rgba(0, 0, 0, 0.1);
}
</style>
