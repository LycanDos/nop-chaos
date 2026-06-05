<script setup lang="ts">
import { useFieldRef } from '@/designer/utils/ElementUtil.ts'

defineOptions({
  name: 'DecisionTask',
})
const decisionTableReferenceKey = useFieldRef('decisionTableReferenceKey')
const decisionTaskThrowErrorOnNoHits = useFieldRef('decisionTaskThrowErrorOnNoHits')
const sameDeployment = useFieldRef('sameDeployment')
</script>

<template>
  <a-collapse-panel key="arg1" header="决策">
    <a-form-item label="决策引用">
      <a-input v-model="decisionTableReferenceKey" placeholder="请输入决策key" />
    </a-form-item>
    <a-form-item label="决策任务在未命中时抛出错误">
      <a-switch
        v-model:checked="decisionTaskThrowErrorOnNoHits"
        active-value="true"
        inactive-value="false"
      />
    </a-form-item>
    <a-form-item label="同部署">
      <a-switch v-model:checked="sameDeployment" active-value="true" inactive-value="false" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
