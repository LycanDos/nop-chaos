<script setup lang="ts">
import {
  findRootElementById,
  findRootElementsByType,
} from '@/designer/utils/ElementUtil.ts'
import { customRef, onMounted, ref } from 'vue'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type { ErrorEvent } from '@/types'
import {
  createOrUpdateEventDefinition,
  getErrorEventDefinition,
} from '@/designer/utils/EventDefinitionUtil.ts'
import ErrorEventDrawer from '../Process/ErrorEventDrawer.vue'
import { PlusOutlined } from '@ant-design/icons-vue'

defineOptions({
  name: 'ErrorEvent',
})

const { selectedElement, updateProperties } = useBpmnContextService()
const errorRef = customRef<string>((track, trigger) => {
  return {
    get() {
      track()
      const errorEventDefinition = getErrorEventDefinition(selectedElement)
      return errorEventDefinition.errorRef?.id
    },
    set(newValue: string) {
      const errorEventDefinition = getErrorEventDefinition(selectedElement)
      const errorRef = findRootElementById(errorEventDefinition, 'bpmn:Error', newValue)
      if (errorRef) {
        updateProperties(
          {
            errorRef: errorRef,
          },
          errorEventDefinition,
        )
      }
      trigger()
    },
  }
})
const errors = ref<ErrorEvent[]>([])
const errorEventDrawerRef = ref<InstanceType<typeof ErrorEventDrawer>>()
const loadEvents = () => {
  const businessObject = getBusinessObject(selectedElement)
  const errorElements = findRootElementsByType(businessObject, 'bpmn:Error')
  errors.value = errorElements.map((item) => {
    return {
      id: item.id,
      name: item.name,
      errorCode: item.errorCode,
    }
  })
}
const addErrorEvent = () => {
  errorEventDrawerRef.value?.openDrawer()
}
const confirmErrorEvent = (properties: ErrorEvent) => {
  createOrUpdateEventDefinition(properties, 'bpmn:Error')
  loadEvents()
}
onMounted(() => {
  loadEvents()
})
</script>

<template>
  <a-collapse-panel key="arg1">
    <template #header>
      <span class="panel-section-title">错误事件</span>
    </template>
    <a-form-item prop="errorRef" label="错误引用">
      <a-select v-model:value="errorRef" placeholder="请选择错误引用">
        <a-select-option
          v-for="item in errors"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        >
          {{ item.name }}
        </a-select-option>
        <template #footer>
          <a-button type="link" size="small" block @click="addErrorEvent()">
            <PlusOutlined /> 新增错误定义
          </a-button>
        </template>
      </a-select>
    </a-form-item>
    <ErrorEventDrawer ref="errorEventDrawerRef" @confirm="confirmErrorEvent" />
  </a-collapse-panel>
</template>

<style scoped lang="scss">
.panel-section-title {
  font-weight: 600;
  color: var(--bpd-text-color, #262626);
}
</style>
