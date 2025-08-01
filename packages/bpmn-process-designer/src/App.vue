<template>
  <!-- 调试信息 -->

  <!-- 流程设计器，负责绘制流程等  -->
  <MyProcessDesigner
    ref="processDesigner"
    @init-finished="initModeler"
    :additionalModel="controlForm.additionalModel"
    :processId="modelKey"
    :processName="modelName"
  />
  <!-- 流程属性器，负责编辑每个流程节点的属性 -->
  <!-- 全局AMIS弹窗 -->
  <AmisEditDialog
    v-if="showAmisDialog"
    :visible="showAmisDialog"
    :getPageSource="amisDialogOptions.getPageSource"
    :savePageSource="amisDialogOptions.savePageSource"
    :rollbackPageSource="amisDialogOptions.rollbackPageSource"
    @close="() => { console.log('AmisEditDialog closed'); showAmisDialog = false; }"
  />
</template>
<script setup lang="ts">
import { MyProcessDesigner, MyProcessPenal } from "@/package";
// 自定义元素选中时的弹出菜单（修改 默认任务 为 用户任务）
import CustomContentPadProvider from "@/package/designer/plugins/content-pad";
// 自定义左侧菜单（修改 默认任务 为 用户任务）
import CustomPaletteProvider from "@/package/designer/plugins/palette";
import ReplaceMenuProvider from '@/package/designer/plugins/replaceMenuProvider'
import CustomRendererModule from '@/src/modules/custom-renderer' // 路径按实际调整
import { useEmitt } from './hooks/web/useEmitt';
import AmisEditDialog from './package/designer/plugins/content-pad/AmisEditDialog.vue';

console.log('App.vue setup executed');

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
  const provider = modeler.value.get('replaceMenuProvider');
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

const showAmisDialog = ref(false);
const amisDialogOptions = reactive({
  getPageSource: async () => ({}),
  savePageSource: async () => true,
  rollbackPageSource: async () => true
});

useEmitt({
  name: 'open-amis-dialog',
  callback: (opts: any) => {
    console.log('on open-amis-dialog', opts);
    amisDialogOptions.getPageSource = opts.getPageSource || (async () => ({}));
    amisDialogOptions.savePageSource = opts.savePageSource || (async () => true);
    amisDialogOptions.rollbackPageSource = opts.rollbackPageSource || (async () => true);
    showAmisDialog.value = true;
    console.log('showAmisDialog.value set to true');
  }
});
</script>
<style lang="scss">
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
