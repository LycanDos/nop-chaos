<template>
  <!-- 调试信息 -->

  <!-- 流程设计器，负责绘制流程等  -->
  <div style="background-color: #fff;">
    <MyProcessDesigner
      ref="processDesigner"
      @init-finished="initModeler"
      :additionalModel="controlForm.additionalModel"
      :processId="modelKey"
      :processName="modelName"
    />
  </div>
  <!-- 流程属性器，负责编辑每个流程节点的属性 -->
</template>
<script setup lang="ts">
import { ref, shallowRef, provide, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {  MyProcessDesigner, CustomContentPadProvider, CustomPaletteProvider,  ReplaceMenuProvider,  CustomRendererModule } from 'bpmn-process-designer';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

const ReplaceMenuModule = {
  __init__: ['replaceMenuProvider'],
  replaceMenuProvider: ['type', ReplaceMenuProvider]
}

console.log("[app] App.vue loaded");

defineProps<{
  modelId?: string;
  modelKey: string;
  modelName: string;
  value?: string;
}>();

const emit = defineEmits(["success", "init-finished"]);
// const message = useMessage() // 国际化

// 表单信息
const formFields = ref<string[]>([]);
// 表单类型，暂仅限流程表单
// const formType = ref(BpmModelFormType.NORMAL)
provide("formFields", formFields);
// provide('formType', formType)

// 注入流程数据
const xmlString = ref("");
// 注入模型数据
const modelData = ref({});

const modeler = shallowRef(); // BPMN Modeler
const processDesigner = ref();
const controlForm = ref({
  simulation: true,
  labelEditing: false,
  labelVisible: false,
  prefix: "flowable",
  headerButtonSize: "mini",
  additionalModel: [CustomContentPadProvider, CustomPaletteProvider, ReplaceMenuModule, CustomRendererModule],
});
// const model = ref<ModelApi.ModelVO>() // 流程模型的信息

/** 初始化 modeler */
const initModeler = (item: any) => {
  modeler.value = item;
  // 关键：主动注册自定义replace菜单
  const provider = modeler.value?.get?.('replaceMenuProvider');
  if (provider && typeof provider.register === 'function') {
    provider.register();
  }
  nextTick(() => {
    console.log("nextTick modeler.value:", modeler.value);
  });
};
/** 添加/修改模型 */
const save = async (bpmnXml: string) => {
  try {
    xmlString.value = bpmnXml;
    emit("success", bpmnXml);
  } catch (error) {
    console.error("保存失败:", error);
    // message.error('保存失败')
  }
};

/** 监听表单 ID 变化，加载表单数据 */
// watch(
//   () => modelData.value.formId,
//   async (newFormId) => {
//     if (newFormId && modelData.value.formType === BpmModelFormType.NORMAL) {
//       const data = await FormApi.getForm(newFormId)
//       formFields.value = data.fields
//     } else {
//       formFields.value = []
//     }
//   },
//   { immediate: true }
// )

// 在组件卸载时清理
onBeforeUnmount(() => {
  // modeler.value = null;
  // 清理全局实例
  const w = window as any;
  if (w.bpmnInstances) {
    w.bpmnInstances = null;
  }
});

onMounted(() => {
  console.log("[app] App.vue onMounted");
});

// 解决 window._debugModeler linter 错误
declare global {
  interface Window {
    _debugModeler: any;
    _debugModelerRaw: any;
    _debugModelerRef: any;
  }
}
</script>
<style lang="scss">
@import "../../../bpmn-process-designer/src/package/theme/process-designer.scss";

//@import "../../../bpmn-process-designer/src/package/theme/element-variables.scss";
//@import "../../../bpmn-process-designer/src/package/theme/index.scss";
//@import "../../../bpmn-process-designer/src/package/theme/process-panel.scss";
.process-panel__container {
  position: absolute;
  top: 172px;
  right: 70px;
}
#bpmnCanvas,
.my-process-designer__canvas,
.my-process-designer__container {
  min-height: 600px !important;
  height: 800px !important;
  /* background: #fff !important; */
  z-index: 10 !important;
  position: relative !important;
}
body, html, #app {
  height: 100% !important;
}
</style>
