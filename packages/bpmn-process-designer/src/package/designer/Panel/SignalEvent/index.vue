<script setup lang="ts">
import {
  findRootElementById,
  findRootElementsByType,
} from '@/designer/utils/ElementUtil.ts'
import { customRef, onMounted, ref } from 'vue'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type { SignalEvent } from '@/types'
import {
  createOrUpdateEventDefinition,
  getSignalEventDefinition,
} from '@/designer/utils/EventDefinitionUtil.ts'
import SignalEventDrawer from '@/designer/Panel/Process/SignalEventDrawer.vue'
import { PlusOutlined } from '@ant-design/icons-vue'

defineOptions({
  name: 'SignalEvent',
})

const { selectedElement, updateProperties } = useBpmnContextService()
const signalRef = customRef<string>((track, trigger) => {
  return {
    get() {
      track()
      const signalEventDefinition = getSignalEventDefinition(selectedElement)
      return signalEventDefinition.signalRef?.id
    },
    set(newValue: string) {
      const signalEventDefinition = getSignalEventDefinition(selectedElement)
      const signalRef = findRootElementById(signalEventDefinition, 'bpmn:Signal', newValue)
      if (signalRef) {
        updateProperties(
          {
            signalRef: signalRef,
          },
          signalEventDefinition,
        )
      }
      trigger()
    },
  }
})
const signals = ref<SignalEvent[]>([])
const signalEventDrawerRef = ref<InstanceType<typeof SignalEventDrawer>>()

const addSignalEvent = () => {
  signalEventDrawerRef.value?.openDrawer()
}
const confirmSignalEvent = (properties: SignalEvent) => {
  createOrUpdateEventDefinition(properties, 'bpmn:Signal')
  loadEvents()
}
const loadEvents = () => {
  const businessObject = getBusinessObject(selectedElement)
  const signalElements = findRootElementsByType(businessObject, 'bpmn:Signal')
  signals.value = signalElements.map((item) => {
    return {
      id: item.get('id'),
      name: item.get('name'),
      'flowable:scope': item.get('flowable:scope'),
    }
  })
}
onMounted(() => {
  loadEvents()
})
</script>

<template>
  <a-collapse-panel key="arg1" header="信号事件">
    <a-form-item prop="signalRef" label="信号引用">
      <a-select v-model:value="signalRef" placeholder="请选择信号引用">
        <a-select-option
          v-for="item in signals"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        ></a-select-option>
        <template #footer>
          <a-button text bg size="small" style="width: 100%" @click="addSignalEvent()" ><PlusOutlined /> 新增信号定义 </a-button>
        </template>
      </a-select>
      <SignalEventDrawer ref="signalEventDrawerRef" @confirm="confirmSignalEvent" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
