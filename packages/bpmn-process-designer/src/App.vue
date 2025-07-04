<template>
  <div>[app] xmlString: {{ xmlString }}</div>
  <div>[app] modeler: {{ modeler && modeler.value ? '有值' : '无值' }}</div>
  <div>[app] MyProcessPenal v-if: {{ modeler && modeler.value ? 'YES' : 'NO' }}</div>
  <div>[app] MyProcessPenal props.bpmnModeler: {{ modeler && modeler.value ? JSON.stringify(modeler.value) : 'undefined' }}</div>
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
    :process-id="modelKey"
    :process-name="modelName"
  />
  <!-- 流程属性器，负责编辑每个流程节点的属性 -->
  <MyProcessPenal
    v-if="modeler && modeler.value"
    key="penal"
    :bpmnModeler="modeler && modeler.value"
    :prefix="controlForm.prefix"
    class="process-panel"
    :model="model"
  />
  <div>[app] MyProcessPenal rendered below (if v-if passed)</div>
</template>
<script setup lang="ts">
import { MyProcessDesigner, MyProcessPenal, MyProcessViewer }from '@/package'
import CustomContentPadProvider from '@/package/designer/plugins/content-pad'
import CustomPaletteProvider from '@/package/designer/plugins/palette'
import { ref, shallowRef, watch } from 'vue'

console.log('[app] App.vue loaded')

const modeler = shallowRef() // BPMN Modeler
const xmlString = ref(`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="100" y="100" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`)
const model = ref({})
const modelKey = ref('')
const modelName = ref('')

console.log('[app] xmlString:', xmlString)
console.log('[app] model:', model)
console.log('[app] modelKey:', modelKey)
console.log('[app] modelName:', modelName)

const controlForm = {
  simulation: true,
  labelEditing: false,
  labelVisible: false,
  prefix: 'flowable',
  headerButtonSize: 'mini',
  additionalModel: [CustomContentPadProvider, CustomPaletteProvider]
}

watch(
  () => modeler.value,
  (val) => {
    console.log('[app] modeler.value changed:', val)
  },
  { immediate: true }
)

watch(
  () => xmlString.value,
  (val) => {
    console.log('[app] xmlString.value changed:', val)
  },
  { immediate: true }
)
console.log('[app] xmlString init:', xmlString.value)

function initModeler(item) {
  modeler.value = item
  console.log('[app] initModeler called, item:', item)
  console.log('[app] modeler after set:', modeler)
}
function save(val) {
  xmlString.value = val
}
</script>