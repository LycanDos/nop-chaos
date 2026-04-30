<template>
  <div class="schema-amis-generated-form">
    <div class="schema-amis-generated-form__toolbar">
      <div class="schema-amis-generated-form__title">AMIS 表单预览</div>
      <div class="schema-amis-generated-form__desc">
        使用同一份 Schema / Policy 生成 AMIS 表单，用于对比前端渲染效果。
      </div>
    </div>

    <div class="schema-amis-generated-form__body">
      <AmisSchemaPage :schema="amisSchemaPlain" :data="localValuePlain" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AmisSchemaPage } from '@nop-chaos/nop-amis-vue'
import type { PolicyDocument, PolicyRule, PolicySchema, PolicySchemaField } from '../types'
import { safeStructuredClone } from '../utils/clone-utils'

interface Props {
  schema: PolicySchema
  document: PolicyDocument
  modelValue: Record<string, any>
}

const props = defineProps<Props>()

const localValue = ref<Record<string, any>>(safeStructuredClone(props.modelValue))

watch(() => props.modelValue, (value) => {
  localValue.value = safeStructuredClone(value)
}, { deep: true })

const effectiveRules = computed(() => {
  const map = new Map<string, PolicyRule[]>()
  for (const layer of props.document.layers) {
    for (const rule of layer.rules.filter(item => item.enabled)) {
      const list = map.get(rule.path) || []
      list.push(rule)
      map.set(rule.path, list)
    }
  }
  return map
})

const amisSchema = computed(() => ({
  type: 'page',
  body: {
    type: 'form',
    title: false,
    wrapWithPanel: false,
    mode: 'normal',
    actions: [],
    body: buildAmisBody(props.schema.fields, effectiveRules.value),
  },
}))

const amisSchemaPlain = computed(() => safeStructuredClone(amisSchema.value))
const localValuePlain = computed(() => safeStructuredClone(localValue.value))

function buildAmisBody(fields: PolicySchemaField[], ruleMap: Map<string, PolicyRule[]>) {
  return fields.map(field => buildAmisControl(field, ruleMap)).filter(Boolean)
}

function buildAmisControl(field: PolicySchemaField, ruleMap: Map<string, PolicyRule[]>): Record<string, any> | null {
  const rules = ruleMap.get(field.path) || []
  const behavior = summarizeBehavior(rules, field)

  if (field.type === 'object') {
    return {
      type: 'fieldSet',
      title: field.label,
      collapsable: true,
      collapsed: false,
      body: buildAmisBody(field.fields || [], ruleMap),
    }
  }

  if (field.type === 'array') {
    const item = field.item
    if (!item)
      return null

    if (item.type === 'object') {
      return {
        type: 'combo',
        name: toAmisName(field.path),
        label: field.label,
        multiple: true,
        value: behavior.value,
        disabled: behavior.disabled,
        items: buildAmisBody(item.fields || [], ruleMap),
      }
    }

    return {
      type: 'combo',
      name: toAmisName(field.path),
      label: field.label,
      multiple: true,
      value: behavior.value,
      disabled: behavior.disabled,
      items: [
        buildPrimitiveControl(item, ruleMap.get(item.path) || [], true),
      ],
    }
  }

  return buildPrimitiveControl(field, rules, false, behavior)
}

function buildPrimitiveControl(
  field: PolicySchemaField,
  rules: PolicyRule[],
  inlineComboItem = false,
  behavior = summarizeBehavior(rules, field),
) {
  const base = {
    name: inlineComboItem ? 'value' : toAmisName(field.path),
    label: inlineComboItem ? undefined : field.label,
    required: behavior.required,
    disabled: behavior.disabled,
    value: behavior.value,
    description: field.description,
    validations: buildValidations(field, rules),
  } as Record<string, any>

  if (field.options?.length) {
    return {
      ...base,
      type: 'select',
      options: field.options.map(option => ({
        label: option.label,
        value: option.value,
      })),
      multiple: field.type === 'array',
      clearable: true,
    }
  }

  if (field.type === 'boolean') {
    return {
      ...base,
      type: 'switch',
    }
  }

  if (field.type === 'number' || field.type === 'integer') {
    return {
      ...base,
      type: 'input-number',
      step: field.type === 'integer' ? 1 : 0.01,
    }
  }

  if (field.format === 'date') {
    return {
      ...base,
      type: 'input-date',
      format: 'YYYY-MM-DD',
    }
  }

  if (field.format === 'time') {
    return {
      ...base,
      type: 'input-time',
      timeFormat: 'HH:mm:ss',
    }
  }

  if (field.format === 'datetime') {
    return {
      ...base,
      type: 'input-datetime',
      format: 'YYYY-MM-DD HH:mm:ss',
    }
  }

  if (field.format === 'textarea' || (field.description && field.description.length > 60)) {
    return {
      ...base,
      type: 'textarea',
      minRows: 3,
      maxRows: 8,
    }
  }

  return {
    ...base,
    type: 'input-text',
    clearable: true,
  }
}

function buildValidations(field: PolicySchemaField, rules: PolicyRule[]) {
  const validations: Record<string, any> = {}

  if (field.minLength != null)
    validations.minLength = field.minLength
  if (field.maxLength != null)
    validations.maxLength = field.maxLength
  if (field.pattern)
    validations.matchRegexp = field.pattern

  rules.forEach((rule) => {
    if (rule.operator === 'regex' && rule.pattern)
      validations.matchRegexp = rule.pattern

    if (rule.operator === 'gt' || rule.operator === 'ge')
      validations.minimum = rule.value

    if (rule.operator === 'lt' || rule.operator === 'le')
      validations.maximum = rule.value

    if (rule.operator === 'between') {
      if (rule.min != null)
        validations.minimum = rule.min
      if (rule.max != null)
        validations.maximum = rule.max
    }
  })

  return Object.keys(validations).length ? validations : undefined
}

function summarizeBehavior(rules: PolicyRule[], field: PolicySchemaField) {
  let required = !!field.required
  let disabled = false
  let value = field.defaultValue

  rules.forEach((rule) => {
    if (rule.operator === 'required' || rule.operator === 'notNull' || rule.operator === 'notBlank')
      required = true

    if (rule.operator === 'readonly')
      disabled = true

    if (rule.operator === 'locked' || rule.operator === 'softLock') {
      disabled = true
      value = rule.lockedValue
    }

    if (rule.operator === 'default' && value == null)
      value = rule.defaultValue
  })

  return {
    required,
    disabled,
    value,
  }
}

function toAmisName(path: string) {
  return path.replace(/\[\]/g, '')
}
</script>

<style scoped>
.schema-amis-generated-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schema-amis-generated-form__toolbar {
  display: grid;
  gap: 4px;
}

.schema-amis-generated-form__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.schema-amis-generated-form__desc {
  font-size: 12px;
  color: #64748b;
}

.schema-amis-generated-form__body {
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}
</style>
