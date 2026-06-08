<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'
import { customRef } from 'vue'
import { useBpmnContextService } from '@/hooks/useService.ts'
import {
  addExtensionElements,
  getExtensionElement,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'

defineOptions({
  name: 'Async',
})

const form = { labelPosition: 'right', size: 'small' }
const { selectedElement, updateProperties } = useBpmnContextService()
const asyncBefore = useCustomRef<boolean>('asyncBefore')
const asyncAfter = useCustomRef<boolean>('asyncAfter')
const exclusive = useCustomRef<boolean>('exclusive')
const retryTimeCycle = customRef((track, trigger) => {
  return {
    get() {
      track()
      const failedJobRetryTimeCycle = getExtensionElement(
        selectedElement,
        'flowable:FailedJobRetryTimeCycle',
      )
      return failedJobRetryTimeCycle?.get('body')
    },
    set(newValue: string) {
      const failedJobRetryTimeCycle = getExtensionElement(
        selectedElement,
        'flowable:FailedJobRetryTimeCycle',
      )
      if (newValue) {
        if (!failedJobRetryTimeCycle) {
          const businessObject = getBusinessObject(selectedElement)
          const failedJobRetryTimeCycleElement = businessObject.$model.create(
            'flowable:FailedJobRetryTimeCycle',
            {
              body: newValue,
            },
          )
          addExtensionElements(selectedElement, failedJobRetryTimeCycleElement)
        } else {
          updateProperties({ body: newValue }, failedJobRetryTimeCycle)
        }
      } else {
        failedJobRetryTimeCycle && removeExtensionElements(selectedElement, failedJobRetryTimeCycle)
      }
      trigger()
    },
  }
})
</script>

<template>
  <a-row :gutter="10">
    <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
      <a-form-item label="前异步">
        <a-switch v-model:checked="asyncBefore" />
      </a-form-item>
    </a-col>
    <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
      <a-form-item label="后异步">
        <a-switch v-model:checked="asyncAfter" />
      </a-form-item>
    </a-col>
    <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
      <a-form-item label="排他">
        <a-switch v-model:checked="exclusive" :disabled="!(asyncBefore || asyncAfter)" />
      </a-form-item>
    </a-col>
  </a-row>
  <a-form-item label="失败重试周期" v-show="asyncBefore || asyncAfter">
    <a-input v-model:value="retryTimeCycle" allow-clear placeholder="请输入失败重试周期" />
  </a-form-item>
</template>

<style scoped lang="scss"></style>
