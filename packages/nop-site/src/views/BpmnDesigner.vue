<script setup lang="ts">
import { ref, shallowRef, provide, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { MyProcessDesigner, MyProcessPenal, CustomContentPadProvider, CustomPaletteProvider, ReplaceMenuProvider } from "bpmn-process-designer";
// 如有自定义渲染模块可加上
// import CustomRendererModule from 'bpmn-process-designer/src/modules/custom-renderer'

const ReplaceMenuModule = {
  __init__: ['replaceMenuProvider'],
  replaceMenuProvider: ['type', ReplaceMenuProvider]
};

const emit = defineEmits(["success", "init-finished"]);

const formFields = ref<string[]>([]);
provide("formFields", formFields);

const xmlString = ref("");
const modelData = ref({});

const modeler = shallowRef(); // BPMN Modeler
const processDesigner = ref();
const controlForm = ref({
  simulation: true,
  labelEditing: false,
  labelVisible: false,
  prefix: "flowable",
  headerButtonSize: "mini",
  additionalModel: [CustomContentPadProvider, CustomPaletteProvider, ReplaceMenuModule /*, CustomRendererModule*/],
});

const modelKey = ref('Process_1');
const modelName = ref('测试流程');

const initModeler = (item: any) => {
  modeler.value = item;
  nextTick(() => {
    console.log("nextTick modeler.value:", modeler.value);
  });
};

const save = async (bpmnXml: string) => {
  try {
    xmlString.value = bpmnXml;
    emit("success", bpmnXml);
  } catch (error) {
    console.error("保存失败:", error);
  }
};

onBeforeUnmount(() => {
  const w = window as any;
  if (w.bpmnInstances) {
    w.bpmnInstances = null;
  }
});

onMounted(() => {
  console.log("[BpmnDesigner.vue] onMounted");
});
</script>

<template>
  <MyProcessDesigner
    ref="processDesigner"
    @init-finished="initModeler"
    :additionalModel="controlForm.additionalModel"
    :process-id="modelKey"
    :process-name="modelName"
    :simulation="controlForm.simulation"
    :labelEditing="controlForm.labelEditing"
    :labelVisible="controlForm.labelVisible"
    :prefix="controlForm.prefix"
    :headerButtonSize="controlForm.headerButtonSize"
  />
  <!-- 如需属性面板可放开下方注释 -->
  <!--
  <MyProcessPenal
    v-if="modeler"
    key="penal"
    :bpmnModeler="modeler"
    :prefix="controlForm.prefix"
    class="process-panel"
    :model="model"
  />
  -->
</template>
