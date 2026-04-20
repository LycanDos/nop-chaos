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
      <template #suggestion-item="{ item }">
        <div class="operator-select__suggestion">
          <div
            v-if="item.data?.groupLabel"
            class="operator-select__suggestion-group"
            v-html="highlightMatch(item.data.groupLabel)"
          />
          <div
            class="operator-select__suggestion-title"
            v-html="highlightMatch(item.data?.displayLabel || item.text)"
          />
          <div class="operator-select__suggestion-meta">
            <span
              v-if="item.data?.code"
              class="operator-select__suggestion-code"
              v-html="highlightMatch(item.data.code)"
            />
            <span
              v-if="item.data?.meaning"
              class="operator-select__suggestion-meaning"
              v-html="highlightMatch(item.data.meaning)"
            />
          </div>
        </div>
      </template>
    </el-cascader>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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
const searchKeyword = ref('')

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
    code: option.code,
    meaning: option.meaning,
    displayLabel: formatOptionLabel(option.title, option.code, option.meaning),
    groupLabel: group.recommended ? `${group.label} · 优先` : group.label,
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
  searchKeyword.value = keyword.trim()
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

  const pattern = new RegExp(escapeRegExp(keyword), 'ig')
  let lastIndex = 0
  let result = ''

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    result += escapeHtml(text.slice(lastIndex, index))
    result += `<mark>${escapeHtml(match[0])}</mark>`
    lastIndex = index + match[0].length
  }

  if (lastIndex === 0)
    return escapeHtml(text)

  result += escapeHtml(text.slice(lastIndex))
  return result
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

.operator-select__suggestion {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}

.operator-select__suggestion-group {
  color: #909399;
  font-size: 11px;
}

.operator-select__suggestion-title {
  color: #303133;
  font-size: 12px;
  line-height: 1.3;
}

.operator-select__suggestion-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #606266;
  font-size: 11px;
}

.operator-select__suggestion-code {
  font-family: Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

:global(.operator-select-popper .el-cascader-menu) {
  min-width: 280px;
}

:global(.operator-select-popper mark) {
  padding: 0 2px;
  border-radius: 3px;
  background: #fff1b8;
  color: inherit;
}
</style>
