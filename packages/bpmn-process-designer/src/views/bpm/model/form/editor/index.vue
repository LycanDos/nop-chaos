<template>
  <div>modeler: {{ modeler && modeler.value ? '有值' : '无值' }}</div>
  <div style="color: blue; font-weight: bold;">[debug] modelKey: {{ modelKey }}</div>
  <div style="color: blue; font-weight: bold;">[debug] modelName: {{ modelName }}</div>
  <div style="color: blue; font-weight: bold;">[debug] modelId: {{ modelId }}</div>
  <div style="color: blue; font-weight: bold;">[debug] controlForm: {{ JSON.stringify(controlForm) }}</div>
  <ContentWrap>
    <!-- 流程设计器，负责绘制流程等 -->
    <MyProcessDesigner
      key="designer"
      v-model="xmlString"
      :value="xmlString"
      v-bind="controlForm"
      keyboard
      ref="processDesigner"
      @init-finished="initModeler"
      :additionalModel="controlForm.additionalModel"
      :model="model"
      @save="save"
      :process-id="modelData.value.key"
      :process-name="modelData.value.name"
    />
    <!-- 流程属性器，负责编辑每个流程节点的属性 -->
    <MyProcessPenal
      :key="modeler && modeler.value ? modeler.value._instanceId || Date.now() : 0"
      :bpmnModeler="modeler && modeler.value"
      :prefix="controlForm.prefix"
      class="process-panel"
      :model="model"
    />
  </ContentWrap>
</template>

<script lang="ts" setup>
import { MyProcessDesigner, MyProcessPenal } from '@/package'
// 自定义元素选中时的弹出菜单（修改 默认任务 为 用户任务）
import CustomContentPadProvider from '@/package/designer/plugins/content-pad'
// 自定义左侧菜单（修改 默认任务 为 用户任务）
import CustomPaletteProvider from '@/package/designer/plugins/palette'
import * as ModelApi from '@/api/bpm/model'
import { BpmModelFormType } from '@/utils/constants'
import * as FormApi from '@/api/bpm/form'
import { shallowRef, ref, inject, provide, onBeforeUnmount, watch } from 'vue'
defineOptions({ name: 'BpmModelEditor' })

defineProps<{
  modelId?: string
  modelKey: string
  modelName: string
  value?: string
}>()

const emit = defineEmits(['success', 'init-finished'])
const message = useMessage() // 国际化

// 表单信息
const formFields = ref<string[]>([])
// 表单类型，暂仅限流程表单
const formType = ref(BpmModelFormType.NORMAL)
provide('formFields', formFields)
provide('formType', formType)

// 注入流程数据
const xmlString = inject('processData') as any
// 注入模型数据
const modelData = inject('modelData') as any

const modeler = shallowRef() // BPMN Modeler
const processDesigner = ref()
const controlForm = ref({
  simulation: true,
  labelEditing: false,
  labelVisible: false,
  prefix: 'flowable',
  headerButtonSize: 'mini',
  additionalModel: [CustomContentPadProvider, CustomPaletteProvider]
})
const model = ref<ModelApi.ModelVO>() // 流程模型的信息

/** 初始化 modeler */
const initModeler = async (item: any) => {
  // 先初始化模型数据
  model.value = modelData.value
  modeler.value = item
  window._debugModeler = modeler
  window._debugModelerRaw = item
  console.log('[editor] initModeler called, item:', item, typeof item, item && Object.keys(item))
  debugger // 让你在浏览器里断点
  console.log('[editor] modeler after set:', modeler)
}

/** 添加/修改模型 */
const save = async (bpmnXml: string) => {
  try {
    xmlString.value = bpmnXml
    emit('success', bpmnXml)
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  }
}

/** 监听表单 ID 变化，加载表单数据 */
watch(
  () => modelData.value.formId,
  async (newFormId) => {
    if (newFormId && modelData.value.formType === BpmModelFormType.NORMAL) {
      const data = await FormApi.getForm(newFormId)
      formFields.value = data.fields
    } else {
      formFields.value = []
    }
  },
  { immediate: true }
)

watch(
  () => modeler.value,
  (val) => {
    console.log('[editor] modeler.value changed:', val)
  },
  { immediate: true }
)
console.log('[editor] modeler:', modeler)

// 在组件卸载时清理
onBeforeUnmount(() => {
  modeler.value = null
  // 清理全局实例
  const w = window as any
  if (w.bpmnInstances) {
    w.bpmnInstances = null
  }
})
</script>
<style lang="scss">
.process-panel__container {
  position: absolute;
  top: 172px;
  right: 70px;
}
</style>
