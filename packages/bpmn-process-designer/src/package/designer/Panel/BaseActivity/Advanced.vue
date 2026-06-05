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
  <a-collapse-panel key="arg2" header="高级">
    <a-form-item label="跳过表达式" v-if="propertiesByName['skipExpression']">
      <Codemirror
        no-wrap
        :max-rows="5"
        autosize
        placeholder="请输入跳过表达式"
        :extensions="[juelSupport()]"
        v-model="skipExpression"
      />
      <!--      <a-input v-model="skipExpression" clearable placeholder="请输入跳过表达式" />-->
    </a-form-item>
    <MultiInstance v-if="propertiesByName['loopCharacteristics']" />
    <Async v-if="propertiesByName['async']" />
    <Document />
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
