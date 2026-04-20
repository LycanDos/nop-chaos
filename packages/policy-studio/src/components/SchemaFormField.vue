<template>
  <div v-if="field.type === 'object'" class="schema-form-field__object">
    <div
      v-for="child in field.fields || []"
      :key="child.path"
      class="schema-form-field__object-item"
    >
      <SchemaFormField
        :field="child"
        :model-value="objectValue[child.name]"
        :behaviors="behaviors"
        :validation-hints="validationHints"
        :visible-tooltip-fields="visibleTooltipFields"
        :show-path="showPath"
        @update:model-value="updateObjectChild(child.name, $event)"
      />
    </div>
  </div>

  <el-form-item
    v-else
    :label="field.label"
    :prop="field.path"
    class="schema-form-field__item"
  >
    <template #label>
      <div class="schema-form-field__label">
        <div class="schema-form-field__label-main">
          <span>{{ field.label }}</span>
          <el-tooltip
            v-if="fieldValidationHint?.rules.length"
            ref="validationTooltipRef"
            placement="bottom-start"
            :width="420"
            trigger="hover"
            effect="light"
            popper-class="schema-form-field__tooltip-popper"
            :popper-options="tooltipPopperOptions"
          >
            <template #content>
              <div class="schema-form-field__tooltip">
                <div class="schema-form-field__tooltip-header">
                  <span>当前字段校验</span>
                  <div class="schema-form-field__tooltip-actions">
                    <span class="schema-form-field__tooltip-count">共 {{ visibleValidationRules.length }} 条</span>
                    <el-switch
                      v-model="showInactiveValidations"
                      size="small"
                      inline-prompt
                      active-text="全部"
                      inactive-text="生效"
                    />
                  </div>
                </div>
                <div
                  v-for="item in visibleValidationRules"
                  :key="item.key"
                  class="schema-form-field__tooltip-item"
                  :class="`is-${item.status}`"
                >
                  <div class="schema-form-field__tooltip-row">
                    <span v-if="shouldShowTooltipField('layer')">{{ item.layerName }} / {{ item.layerType }}</span>
                    <span v-else>当前校验</span>
                    <span class="schema-form-field__tooltip-status">{{ statusLabel(item.status) }}</span>
                  </div>
                  <div v-if="shouldShowTooltipField('layer')" class="schema-form-field__tooltip-grid">
                    <span class="schema-form-field__tooltip-label">校验集</span>
                    <span>{{ item.layerName }} / {{ item.layerType }}</span>
                  </div>
                  <div class="schema-form-field__tooltip-grid">
                    <template v-if="shouldShowTooltipField('ruleId')">
                      <span class="schema-form-field__tooltip-label">Rule ID</span>
                      <span>{{ item.ruleId }}</span>
                    </template>
                    <template v-if="shouldShowTooltipField('operator')">
                      <span class="schema-form-field__tooltip-label">操作符</span>
                      <span>{{ item.operatorTitle }} ({{ item.operator }})</span>
                    </template>
                    <template v-if="shouldShowTooltipField('meaning')">
                      <span class="schema-form-field__tooltip-label">中文描述</span>
                      <span>{{ item.operatorMeaning }}</span>
                    </template>
                  </div>
                  <div v-if="shouldShowTooltipField('summary')" class="schema-form-field__tooltip-summary">{{ item.summary }}</div>
                  <div v-if="item.reason && item.status !== 'effective'" class="schema-form-field__tooltip-reason">
                    {{ item.reason }}
                  </div>
                </div>
                <div v-if="!visibleValidationRules.length" class="schema-form-field__tooltip-empty">
                  当前筛选条件下没有可展示的校验
                </div>
              </div>
            </template>
            <span class="schema-form-field__help">?</span>
          </el-tooltip>
          <el-tooltip
            v-if="fieldValidationHint?.hasServerValidation"
            content="该规则需服务器校验"
            placement="top"
          >
            <span class="schema-form-field__server-tag">服务器校验</span>
          </el-tooltip>
        </div>
        <span v-if="showPath !== false" class="schema-form-field__path">{{ field.path }}</span>
      </div>
    </template>

    <SchemaDataEditor
      v-if="field.type === 'array' && field.item?.type === 'object'"
      :field="field"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <SchemaValueInput
      v-else
      :model-value="modelValue"
      :field="field"
      :multiple="field.type === 'array'"
      :disabled="isDisabled"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <div v-if="behaviorMessage" class="schema-form-field__behavior">
      {{ behaviorMessage }}
    </div>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import SchemaDataEditor from './SchemaDataEditor.vue'
import SchemaValueInput from './SchemaValueInput.vue'
import type { TooltipInstance } from 'element-plus'
import type { CompiledRuleStatus, FieldValidationHint, PolicySchemaField } from '../types'

defineOptions({
  name: 'SchemaFormField'
})

interface FieldBehavior {
  readonly?: boolean
  locked?: boolean
}

interface Props {
  field: PolicySchemaField
  modelValue?: any
  behaviors?: Record<string, FieldBehavior>
  validationHints?: Record<string, FieldValidationHint>
  visibleTooltipFields?: Array<'layer' | 'ruleId' | 'operator' | 'meaning' | 'summary'>
  showPath?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()
const validationTooltipRef = ref<TooltipInstance>()
const tooltipPopperOptions = {
  modifiers: [
    {
      name: 'flip',
      options: {
        fallbackPlacements: ['top-start', 'right-start', 'left-start', 'bottom-end', 'top-end']
      }
    },
    {
      name: 'preventOverflow',
      options: {
        boundary: 'viewport',
        altBoundary: true,
        padding: 12
      }
    }
  ]
}

const objectValue = computed<Record<string, any>>(() => {
  if (props.modelValue && typeof props.modelValue === 'object' && !Array.isArray(props.modelValue))
    return props.modelValue
  return {}
})
const showInactiveValidations = ref(false)

const fieldBehavior = computed(() => props.behaviors?.[props.field.path] || {})
const fieldValidationHint = computed(() => {
  const lookupKeys = [props.field.path]
  if (props.field.type === 'array' && props.field.item?.type !== 'object')
    lookupKeys.unshift(`${props.field.path}[]`)

  for (const key of lookupKeys) {
    const hint = props.validationHints?.[key]
    if (hint)
      return hint
  }
  return undefined
})
const visibleValidationRules = computed(() => {
  const rules = fieldValidationHint.value?.rules || []
  if (showInactiveValidations.value)
    return rules
  return rules.filter(item => item.status === 'effective')
})
const isDisabled = computed(() => fieldBehavior.value.readonly || fieldBehavior.value.locked)
const behaviorMessage = computed(() => {
  if (fieldBehavior.value.locked)
    return '当前字段已被校验锁定'
  if (fieldBehavior.value.readonly)
    return '当前字段为只读'
  return ''
})

watch(showInactiveValidations, async () => {
  await nextTick()
  validationTooltipRef.value?.updatePopper()
})

function updateObjectChild(name: string, value: any) {
  emit('update:modelValue', {
    ...objectValue.value,
    [name]: value
  })
}

function shouldShowTooltipField(field: 'layer' | 'ruleId' | 'operator' | 'meaning' | 'summary') {
  return (props.visibleTooltipFields || ['layer', 'ruleId', 'operator', 'meaning', 'summary']).includes(field)
}

function statusLabel(status: CompiledRuleStatus) {
  if (status === 'effective')
    return '生效'
  if (status === 'overridden')
    return '已覆盖'
  if (status === 'rejected')
    return '无效'
  return '已清除'
}
</script>

<style scoped>
.schema-form-field__object {
  display: grid;
  gap: 10px;
}

.schema-form-field__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.2;
}

.schema-form-field__label-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.schema-form-field__path {
  color: #909399;
  font-size: 11px;
  font-family: Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.schema-form-field__help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 11px;
  font-weight: 700;
  cursor: help;
}

.schema-form-field__server-tag {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  height: 18px;
  border-radius: 999px;
  background: #fdf6ec;
  color: #e6a23c;
  font-size: 11px;
  cursor: help;
}

.schema-form-field__tooltip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(65vh, calc(100vh - 120px), 520px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}

.schema-form-field__tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 600;
}

.schema-form-field__tooltip-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.schema-form-field__tooltip-count {
  color: #909399;
  font-size: 11px;
  font-weight: 500;
}

.schema-form-field__tooltip-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 6px;
  background: #f5f7fa;
  font-size: 12px;
}

.schema-form-field__tooltip-item.is-effective {
  background: #f0f9eb;
}

.schema-form-field__tooltip-item.is-overridden {
  background: #f4f4f5;
  color: #909399;
}

.schema-form-field__tooltip-item.is-rejected {
  background: #fef0f0;
  color: #c45656;
}

.schema-form-field__tooltip-item.is-cleared {
  background: #ecf5ff;
  color: #409eff;
}

.schema-form-field__tooltip-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.schema-form-field__tooltip-grid {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 4px 10px;
  color: #606266;
}

.schema-form-field__tooltip-label {
  color: #909399;
}

.schema-form-field__tooltip-status {
  color: #909399;
  font-size: 11px;
}

.schema-form-field__tooltip-summary {
  color: #303133;
}

.schema-form-field__tooltip-reason,
.schema-form-field__tooltip-empty {
  color: #909399;
  font-size: 11px;
}

:global(.schema-form-field__tooltip-popper.el-popper) {
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
}

:global(.schema-form-field__tooltip-popper.el-popper .el-popper__arrow::before) {
  border: 1px solid #dcdfe6;
  background: #fff;
}

.schema-form-field__behavior {
  margin-top: 6px;
  color: #e6a23c;
  font-size: 11px;
}
</style>
