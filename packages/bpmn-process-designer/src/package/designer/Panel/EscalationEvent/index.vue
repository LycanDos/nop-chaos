<script setup lang="ts">
import {
  findRootElementById,
  findRootElementsByType,
} from '@/designer/utils/ElementUtil.ts'
import { customRef, onMounted, ref } from 'vue'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type { EscalationEvent } from '@/types'
import {
  createOrUpdateEventDefinition,
  getEscalationEventDefinition,
} from '@/designer/utils/EventDefinitionUtil.ts'
import { PlusOutlined } from '@ant-design/icons-vue'
import EscalationEventDrawer from '@/designer/Panel/Process/EscalationEventDrawer.vue'

defineOptions({
  name: 'EscalationEvent',
})

const { selectedElement, updateProperties } = useBpmnContextService()
const escalationRef = customRef<string>((track, trigger) => {
  return {
    get() {
      track()
      const escalationEventDefinition = getEscalationEventDefinition(selectedElement)
      return escalationEventDefinition.escalationRef?.id
    },
    set(newValue: string) {
      const escalationEventDefinition = getEscalationEventDefinition(selectedElement)
      const escalationRef = findRootElementById(
        escalationEventDefinition,
        'bpmn:Escalation',
        newValue,
      )
      if (escalationRef) {
        updateProperties(
          {
            escalationRef: escalationRef,
          },
          escalationEventDefinition,
        )
      }
      trigger()
    },
  }
})
const escalationEventDrawerRef = ref<InstanceType<typeof EscalationEventDrawer>>()
const escalations = ref<EscalationEvent[]>([])
const addEscalationEvent = () => {
  escalationEventDrawerRef.value?.openDrawer()
}
const confirmEscalationEvent = (properties: EscalationEvent) => {
  createOrUpdateEventDefinition(properties, 'bpmn:Escalation')
  loadEvents()
}
const loadEvents = () => {
  const businessObject = getBusinessObject(selectedElement)
  const escalationElements = findRootElementsByType(businessObject, 'bpmn:Escalation')
  escalations.value = escalationElements.map((item) => {
    return {
      id: item.id,
      name: item.name,
      escalationCode: item.escalationCode,
    }
  })
}
onMounted(() => {
  loadEvents()
})
</script>

<template>
  <a-collapse-panel key="arg1" header="升级事件">
    <a-form-item prop="escalationRef" label="升级引用">
      <a-select v-model:value="escalationRef" placeholder="请选择升级引用">
        <a-select-option
          v-for="item in escalations"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        ></a-select-option>
        <template #footer>
          <a-button text bg size="small" style="width: 100%" @click="addEscalationEvent()" ><PlusOutlined /> 新增升级定义 </a-button>
        </template>
      </a-select>
    </a-form-item>
    <EscalationEventDrawer ref="escalationEventDrawerRef" @confirm="confirmEscalationEvent" />
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
