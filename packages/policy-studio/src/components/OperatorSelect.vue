<template>
  <div class="operator-select">
    <el-alert
      v-if="showIncompatible"
      type="warning"
      show-icon
      :closable="false"
      title="当前已选操作符与字段类型不兼容，建议重新选择。"
      class="operator-select__alert"
    />
    <el-cascader
      :model-value="selectedPath"
      :options="cascaderOptions"
      :props="cascaderProps"
      class="operator-select__cascader"
      popper-class="operator-select-popper"
      placeholder="选择操作符"
      clearable
      filterable
      :show-all-levels="false"
      :filter-method="filterOperator"
      @change="handleChange"
    >
      <template #default="{ data, node }">
        <div v-if="node.isLeaf" class="operator-select__node">
          <span class="operator-select__node-label">{{ data.displayLabel || data.label }}</span>
          <span v-if="data.meaning" class="operator-select__node-meaning">{{ data.meaning }}</span>
        </div>
        <span v-else>{{ data.label }}</span>
      </template>
    </el-cascader>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getOperatorGroups, getOperatorMeta, isOperatorCompatible } from '../utils/operator-utils'
import type { PolicyOperator, PolicySchemaField } from '../types'

interface Props {
  modelValue?: PolicyOperator
  field?: PolicySchemaField
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: PolicyOperator]
}>()

const operatorGroups = computed(() => getOperatorGroups(props.field))
const showIncompatible = computed(() => !!props.modelValue && !isOperatorCompatible(props.modelValue, props.field))
const currentMeta = computed(() => getOperatorMeta(props.modelValue))

const cascaderProps = {
  expandTrigger: 'click' as const,
  emitPath: true,
  checkStrictly: false
}

const cascaderOptions = computed(() => operatorGroups.value.map(group => ({
  value: group.key,
  label: group.recommended ? `${group.label} · 优先` : group.label,
  children: group.options.map(option => ({
    value: option.value,
    label: formatOptionLabel(option.title, option.code, option.meaning),
    displayLabel: option.title,
    code: option.code,
    meaning: option.meaning,
    searchText: [
      group.label,
      option.title,
      option.code,
      option.meaning,
      group.recommended ? '优先' : ''
    ].join(' ')
  }))
})))

function formatOptionLabel(title: string, code: string, meaning: string) {
  if (/^[<>=!]+$/.test(title))
    return `${title} (${meaning})`
  return `${title} (${code})`
}

const selectedPath = computed(() => {
  if (!currentMeta.value)
    return []
  return [currentMeta.value.group, currentMeta.value.value]
})

function handleChange(value: unknown) {
  if (!Array.isArray(value) || value.length < 2)
    return
  emit('update:modelValue', value[1] as PolicyOperator)
}

function filterOperator(node: any, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword)
    return true

  const data = node.data || {}
  const searchable = [
    node.label,
    node.text,
    ...(node.pathLabels || []),
    data.code,
    data.meaning,
    data.searchText
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return searchable.includes(normalizedKeyword)
}
</script>

<style scoped>
.operator-select {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.operator-select__alert {
  margin-bottom: 2px;
}

.operator-select__cascader {
  width: 100%;
}

.operator-select__node {
  display: flex;
  align-items: baseline;
  gap: 6px;
  line-height: 1.4;
}

.operator-select__node-label {
  color: #303133;
  font-size: 13px;
}

.operator-select__node-meaning {
  color: #909399;
  font-size: 11px;
}

:global(.operator-select-popper .el-cascader-menu) {
  min-width: 280px;
}

/* Suggestion list styling when filtering */
:global(.operator-select-popper .el-cascader__suggestion-panel) {
  max-height: 340px;
}

:global(.operator-select-popper .el-cascader__suggestion-list) {
  padding: 4px 0;
}

:global(.operator-select-popper .el-cascader__suggestion-item) {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #303133;
  cursor: pointer;
}

:global(.operator-select-popper .el-cascader__suggestion-item:hover) {
  background: #f5f7fa;
}

:global(.operator-select-popper .el-cascader__suggestion-item.is-checked) {
  color: #409eff;
  font-weight: 700;
}
</style>
