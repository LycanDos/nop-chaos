<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'
import MultiInstance from '../MultiInstance/index.vue'
import Document from './Document.vue'
import Async from './Async.vue'
import { useBpmnContextService } from '@/hooks/useService.ts'
import { computed } from 'vue'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import juelSupport from '@/components/CodemirrorEditor/language/juel'
import Codemirror from '@/components/CodemirrorEditor/index.vue'

defineOptions({
  name: 'Advanced',
})
const { selectedElement } = useBpmnContextService()
const skipExpression = useCustomRef('skipExpression')
const propertiesByName = computed(() => {
  const businessObject = getBusinessObject(selectedElement)
  return businessObject?.$descriptor?.propertiesByName || {}
})
</script>

<template>
  <a-collapse-panel key="arg2">
    <template #header><span class="bpd-panel-title">高级</span></template>
    <a-form-item v-if="propertiesByName['skipExpression']" label="跳过表达式">
      <Codemirror
        no-wrap
        :max-rows="5"
        autosize
        placeholder="请输入跳过表达式"
        :extensions="[juelSupport()]"
        v-model="skipExpression"
      />
      <!--      <a-input v-model:value="skipExpression" allow-clear placeholder="请输入跳过表达式" />-->
    </a-form-item>
    <MultiInstance v-if="propertiesByName['loopCharacteristics']" />
    <Async v-if="propertiesByName['async']" />
    <Document />
  </a-collapse-panel>
</template>

<style scoped lang="scss">
.bpd-panel-title {
  color: var(--bpd-text-color, #262626);
  font-size: 13px;
  font-weight: 600;
}
</style>
