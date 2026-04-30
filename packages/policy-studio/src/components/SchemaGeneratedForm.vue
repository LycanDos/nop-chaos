<template>
  <div class="schema-generated-form">
    <div class="schema-generated-form__toolbar">
      <el-select
        v-model="visibleTooltipFields"
        multiple
        class="schema-generated-form__status-select"
        placeholder="选择弹窗展示项"
        filterable
        :filter-method="filterTooltipField"
      >
        <el-option
          v-for="option in filteredTooltipFieldOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        >
          <span v-html="highlightMatch(option.label)" />
        </el-option>
      </el-select>
      <div class="schema-generated-form__switch">
        <span>显示属性路径</span>
        <el-switch v-model="showFieldPath" />
      </div>
    </div>

    <el-form
      ref="formRef"
      :model="localValue"
      :rules="formRules"
      label-position="top"
      class="schema-generated-form__body"
    >
      <SchemaFormField
        v-for="field in schema.fields"
        :key="field.path"
        :field="field"
        :model-value="localValue[field.name]"
        :behaviors="fieldBehaviors"
        :validation-hints="fieldValidationHints"
        :visible-tooltip-fields="visibleTooltipFields"
        :show-path="showFieldPath"
        @update:model-value="updateRootField(field.name, $event)"
      />
    </el-form>

    <div class="schema-generated-form__actions">
      <el-button type="primary" @click="validateForm">执行前端校验</el-button>
      <span class="schema-generated-form__status">{{ validationStatus }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import SchemaFormField from './SchemaFormField.vue'
import { PolicyCompiler } from '../engines/policy-compiler'
import { safeStructuredClone } from '../utils/clone-utils'
import { getOperatorMeta } from '../utils/operator-utils'
import { buildElementFormRules, buildValidationSupportItems } from '../utils/validation-support'
import type { FieldValidationHint, PolicyDocument, PolicySchema, ValidationSupportLevel } from '../types'

interface Props {
  schema: PolicySchema
  document: PolicyDocument
  modelValue: Record<string, any>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const formRef = ref()
const validationStatus = ref('尚未执行前端校验')
const localValue = ref<Record<string, any>>(safeStructuredClone(props.modelValue))
const showFieldPath = ref(true)
const tooltipSearchKeyword = ref('')
const filteredTooltipFieldOptions = computed(() => {
  const keyword = tooltipSearchKeyword.value.trim().toLowerCase()
  if (!keyword)
    return tooltipFieldOptions
  return tooltipFieldOptions.filter(option => option.label.toLowerCase().includes(keyword))
})
const tooltipFieldOptions = [
  { value: 'layer', label: '校验集' },
  { value: 'ruleId', label: 'Rule ID' },
  { value: 'operator', label: '操作符' },
  { value: 'meaning', label: '中文描述' },
  { value: 'summary', label: '规则' }
]
const visibleTooltipFields = ref<Array<'layer' | 'ruleId' | 'operator' | 'meaning' | 'summary'>>(
  tooltipFieldOptions.map(item => item.value as 'layer' | 'ruleId' | 'operator' | 'meaning' | 'summary')
)
let syncingFromProps = false
const compiler = new PolicyCompiler()

const supportItems = computed(() => buildValidationSupportItems(props.document))
const supportByRuleId = computed(() => {
  const map = new Map<string, { level: ValidationSupportLevel; reason: string }>()
  for (const item of supportItems.value)
    map.set(item.ruleId, { level: item.level, reason: item.reason })
  return map
})
const compileResult = computed(() => compiler.compile(props.document))
const fieldValidationHints = computed<Record<string, FieldValidationHint>>(() => {
  const result: Record<string, FieldValidationHint> = {}
  const layerMap = new Map(props.document.layers.map(layer => [layer.id, layer]))

  for (const pathView of compileResult.value.paths) {
    const rules = pathView.compiledRules.map(rule => ({
      key: `${rule.layerId}-${rule.ruleId}-${rule.status}`,
      ruleId: rule.ruleId,
      layerId: rule.layerId,
      layerName: layerMap.get(rule.layerId)?.name || rule.layerId,
      layerType: rule.layerType,
      operator: rule.operator,
      operatorTitle: getOperatorMeta(rule.operator)?.title || rule.operator,
      operatorMeaning: getOperatorMeta(rule.operator)?.meaning || rule.summary,
      summary: rule.summary,
      status: rule.status,
      reason: rule.reason || supportByRuleId.value.get(rule.ruleId)?.reason,
      supportLevel: supportByRuleId.value.get(rule.ruleId)?.level || 'frontend-supported'
    }))

    result[pathView.path] = {
      path: pathView.path,
      rules,
      hasServerValidation: rules.some(item => item.status === 'effective' && item.supportLevel !== 'frontend-supported')
    }
  }

  return result
})
const formRules = computed(() => buildElementFormRules(props.schema, props.document))
const fieldBehaviors = computed(() => {
  const behaviors: Record<string, { readonly?: boolean; locked?: boolean }> = {}
  for (const layer of props.document.layers) {
    for (const rule of layer.rules.filter(item => item.enabled)) {
      if (rule.operator === 'readonly')
        behaviors[rule.path] = { ...(behaviors[rule.path] || {}), readonly: true }
      if (rule.operator === 'locked' || rule.operator === 'softLock') {
        behaviors[rule.path] = { ...(behaviors[rule.path] || {}), locked: true }
        setValueByPath(localValue.value, rule.path, rule.lockedValue)
      }
      if (rule.operator === 'default') {
        const currentValue = getValueByPath(localValue.value, rule.path)
        if (currentValue === undefined || currentValue === null || currentValue === '')
          setValueByPath(localValue.value, rule.path, rule.defaultValue)
      }
    }
  }
  return behaviors
})

watch(() => props.modelValue, async (value) => {
  syncingFromProps = true
  localValue.value = safeStructuredClone(value)
  await nextTick()
  syncingFromProps = false
}, { deep: true })

watch(localValue, (value) => {
  if (syncingFromProps)
    return
  emit('update:modelValue', safeStructuredClone(value))
}, { deep: true })

async function validateForm() {
  try {
    await formRef.value?.validate()
    validationStatus.value = '前端校验通过'
  }
  catch {
    validationStatus.value = '前端校验未通过，请检查表单项错误提示'
  }
}

function updateRootField(name: string, value: any) {
  localValue.value = {
    ...localValue.value,
    [name]: value
  }
}

function setValueByPath(target: Record<string, any>, path: string, value: any) {
  if (!path)
    return
  const parts = path.replace(/\[\]/g, '').split('.')
  let current: any = target
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]
    if (index === parts.length - 1) {
      current[part] = value
      return
    }
    if (!current[part] || typeof current[part] !== 'object')
      current[part] = {}
    current = current[part]
  }
}

function getValueByPath(target: Record<string, any>, path: string) {
  const parts = path.replace(/\[\]/g, '').split('.')
  let current: any = target
  for (const part of parts) {
    if (current == null)
      return undefined
    current = current[part]
  }
  return current
}

function filterTooltipField(keyword: string) {
  tooltipSearchKeyword.value = keyword.trim()
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

function highlightMatch(value: string) {
  const keyword = tooltipSearchKeyword.value.trim()
  if (!keyword)
    return escapeHtml(value)

  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'ig')
  return escapeHtml(value).replace(pattern, '<mark>$1</mark>')
}
</script>

<style scoped>
.schema-generated-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schema-generated-form__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.schema-generated-form__status-select {
  min-width: 420px;
  max-width: 100%;
}

.schema-generated-form__status-select :deep(.el-select__wrapper) {
  min-height: 40px;
  height: auto;
  align-items: flex-start;
  padding-top: 6px;
  padding-bottom: 6px;
}

.schema-generated-form__status-select :deep(.el-select__selection) {
  flex-wrap: wrap;
}

.schema-generated-form__switch {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
  font-size: 12px;
}

.schema-generated-form__body {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}

.schema-generated-form__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schema-generated-form__status {
  color: #606266;
  font-size: 12px;
}

:deep(mark) {
  padding: 0 2px;
  border-radius: 3px;
  background: #fff1b8;
  color: inherit;
}
</style>
