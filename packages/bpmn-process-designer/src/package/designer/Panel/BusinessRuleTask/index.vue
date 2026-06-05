<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'

defineOptions({
  name: 'BusinessRuleTask',
})
const rules = useCustomRef('rules')
const ruleVariablesInput = useCustomRef('ruleVariablesInput')
const resultVariable = useCustomRef('resultVariable')
const exclude = useCustomRef('exclude')
const javaClass = useCustomRef('class')
</script>

<template>
  <a-collapse-panel key="arg1" header="业务规则">
    <a-form-item label="规则">
      <a-select
        v-model:value="rules"
        showSearch
        allow-create
        allowClear
        multiple
        placeholder="请选择规则"
      >
        <a-select-option label="规则1" value="rule1"></a-select-option>
        <a-select-option label="规则2" value="rule2"></a-select-option>
        <a-select-option label="规则3" value="rule3"></a-select-option>
        <a-select-option label="规则4" value="rule4"></a-select-option>
        <a-select-option label="规则5" value="rule5"></a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item label="排除">
      <a-switch v-model:checked="exclude" />
    </a-form-item>
    <a-form-item label="输入变量">
      <a-input v-model="ruleVariablesInput" placeholder="请输入输入变量"></a-input>
    </a-form-item>
    <a-form-item label="输出变量">
      <a-input v-model="resultVariable" placeholder="请输入输出变量"></a-input>
    </a-form-item>
    <a-form-item label="自定义实现">
      <a-input v-model="javaClass" placeholder="请输入java类路径/委托表达式"></a-input>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
