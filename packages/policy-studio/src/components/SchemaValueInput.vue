<template>
  <el-select
    v-if="multiple"
    :model-value="normalizedMultipleValue"
    multiple
    filterable
    :filter-method="filterOption"
    allow-create
    :reserve-keyword="false"
    default-first-option
    clearable
    :disabled="disabled"
    :placeholder="placeholder"
    @change="handleMultipleChange"
  >
    <el-option
      v-for="option in filteredOptions"
      :key="String(option.value)"
      :label="option.label"
      :value="option.value"
    >
      <span v-html="highlightMatch(option.label)" />
    </el-option>
  </el-select>

  <el-select
    v-else-if="field?.options?.length"
    :model-value="modelValue"
    filterable
    :filter-method="filterOption"
    clearable
    :disabled="disabled"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-option
      v-for="option in filteredOptions"
      :key="String(option.value)"
      :label="option.label"
      :value="option.value"
    >
      <span v-html="highlightMatch(option.label)" />
    </el-option>
  </el-select>

  <el-switch
    v-else-if="isBooleanField"
    :model-value="Boolean(modelValue)"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <el-input-number
    v-else-if="isNumberField"
    :model-value="toNumberValue(modelValue)"
    :controls-position="compact ? 'right' : undefined"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <el-date-picker
    v-else-if="field?.format === 'date'"
    :model-value="modelValue"
    type="date"
    value-format="YYYY-MM-DD"
    format="YYYY-MM-DD"
    :disabled="disabled"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <el-time-picker
    v-else-if="field?.format === 'time'"
    :model-value="modelValue"
    value-format="HH:mm:ss"
    format="HH:mm:ss"
    :disabled="disabled"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <el-date-picker
    v-else-if="field?.format === 'datetime'"
    :model-value="modelValue"
    type="datetime"
    value-format="YYYY-MM-DD HH:mm:ss"
    format="YYYY-MM-DD HH:mm:ss"
    :disabled="disabled"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <el-input
    v-else-if="field?.format === 'textarea'"
    :model-value="modelValue ?? ''"
    type="textarea"
    :rows="3"
    :disabled="disabled"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />

  <el-input
    v-else
    :model-value="modelValue ?? ''"
    :disabled="disabled"
    :placeholder="placeholder"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PolicySchemaField } from '../types'

interface Props {
  modelValue?: any
  field?: PolicySchemaField
  placeholder?: string
  multiple?: boolean
  compact?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入',
  multiple: false,
  compact: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const normalizedMultipleValue = computed(() => {
  if (Array.isArray(props.modelValue))
    return props.modelValue
  return []
})

const isBooleanField = computed(() => props.field?.type === 'boolean')
const isNumberField = computed(() => props.field?.type === 'number' || props.field?.type === 'integer')
const searchKeyword = ref('')
const filteredOptions = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const options = props.field?.options || []
  if (!keyword)
    return options
  return options.filter(option => `${option.label} ${String(option.value)}`.toLowerCase().includes(keyword))
})

function toNumberValue(value: any) {
  if (value === undefined || value === null || value === '')
    return undefined
  return Number(value)
}

function handleMultipleChange(values: any[]) {
  if (props.field?.type === 'number' || props.field?.type === 'integer') {
    const deduplicated = Array.from(new Set(
      values
        .map(value => Number(value))
        .filter(value => !Number.isNaN(value))
    ))
    emit('update:modelValue', deduplicated)
    return
  }
  const deduplicated: any[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const key = String(value)
    if (seen.has(key))
      continue
    seen.add(key)
    deduplicated.push(value)
  }
  emit('update:modelValue', deduplicated)
}

function filterOption(keyword: string) {
  searchKeyword.value = keyword.trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightMatch(value?: string) {
  const text = value || ''
  const keyword = searchKeyword.value.trim()
  if (!keyword)
    return escapeHtml(text)

  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'ig')
  return escapeHtml(text).replace(pattern, '<mark>$1</mark>')
}
</script>

<style scoped>
:deep(mark) {
  padding: 0 2px;
  border-radius: 3px;
  background: #fff1b8;
  color: inherit;
}
</style>
