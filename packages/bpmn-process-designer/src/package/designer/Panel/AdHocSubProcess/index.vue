<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'
import { customRef } from 'vue'
import { useBpmnContextService } from '@/hooks/useService.ts'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import type { Moddle } from 'bpmn-js/lib/model/Types.ts'
import juelSupport from '@/components/CodemirrorEditor/language/juel'
import Codemirror from '@/components/CodemirrorEditor/index.vue'

defineOptions({
  name: 'AdHocSubProcess',
})
const { selectedElement, getService } = useBpmnContextService()
const moddle = getService<Moddle>('moddle')
const ordering = useCustomRef('ordering')
const cancelRemainingInstances = useCustomRef('cancelRemainingInstances')
const completionCondition = customRef((track, trigger) => {
  return {
    get() {
      track()
      const businessObject = getBusinessObject(selectedElement)
      return businessObject.get('completionCondition')?.body
    },
    set(newValue: string) {
      const businessObject = getBusinessObject(selectedElement)
      const completionCondition = businessObject.get('completionCondition')
      if (completionCondition) {
        completionCondition.set('body', newValue)
      } else {
        businessObject.set(
          'completionCondition',
          moddle.create('bpmn:FormalExpression', {
            body: newValue,
          }),
        )
      }
      trigger()
    },
  }
})
</script>

<template>
  <a-collapse-panel key="arg1" header="临时子流程">
    <a-form-item label="排序">
      <a-radio-group v-model:value="ordering">
        <a-radio-button value="Parallel">并行</a-radio-button>
        <a-radio-button value="Sequential">串行</a-radio-button>
      </a-radio-group>
    </a-form-item>
    <a-form-item label="取消剩余实例">
      <a-switch v-model:checked="cancelRemainingInstances" active-value="true" inactive-value="false" />
    </a-form-item>
    <a-form-item label="完成条件">
      <Codemirror
        :rows="3"
        :max-rows="6"
        autosize
        no-wrap
        placeholder="请输入完成条件"
        :extensions="[juelSupport()]"
        v-model="completionCondition"
      />
      <!--      <a-input
        v-model:value="completionCondition"
        type="textarea"
        :rows="3"
        placeholder="请输入完成条件"
      />-->
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
