<template>
  <div
    class="rule-card"
    :class="{ 'is-active': active, 'is-flashing': flash }"
    :data-rule-id="rule.id"
    :data-layer-id="layerId"
    @click="emit('select')"
  >
    <div class="rule-card__header">
      <div class="rule-card__title">
        <template v-if="isEditingRuleId">
          <div class="inline-edit inline-edit--rule">
            <el-input
              :model-value="editingRuleValue"
              size="small"
              @click.stop
              @update:model-value="emit('update:editingRuleValue', $event)"
              @keyup.enter.stop="emit('save-rule-edit')"
              @keyup.esc.stop="emit('cancel-rule-edit')"
            />
            <el-button class="inline-edit__action" link size="small" @click.stop="emit('save-rule-edit')">
              <el-icon><Check /></el-icon>
            </el-button>
            <el-button class="inline-edit__action" link size="small" @click.stop="emit('cancel-rule-edit')">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </template>
        <template v-else>
          <span>{{ rule.id }}</span>
          <el-button
            class="rule-card__edit"
            link
            size="small"
            @click.stop="emit('start-rule-edit')"
          >
            <el-icon><EditPen /></el-icon>
          </el-button>
        </template>
        <el-tag size="small">{{ operatorDisplay(rule.operator) }}</el-tag>
      </div>
      <div class="rule-card__tools">
        <el-switch v-model="rule.enabled" />
        <el-button link type="danger" @click.stop="emit('remove')">删除</el-button>
      </div>
    </div>

    <el-alert
      v-if="validationMessage"
      type="error"
      :closable="false"
      show-icon
      class="rule-card__validation"
      :title="validationMessage"
    />

      <el-form label-position="left" label-width="66px" size="small" class="rule-form">
      <el-row :gutter="12">
        <el-col :span="10">
          <el-form-item label="字段路径">
            <PathSelector
              v-model="rule.path"
              :hint-engine="hintEngine"
              placeholder="选择字段路径"
              @change="handleRulePathChange"
              @focus="emit('focus-path')"
            />
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item label="操作符">
            <OperatorSelect
              v-model="rule.operator"
              :field="fieldForPath(rule.path)"
              @update:model-value="emit('select')"
            />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="顺序">
            <el-input-number v-model="rule.orderNo" :min="0" :step="10" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col v-if="showSingleValue(rule.operator)" :span="8">
          <el-form-item :label="singleValueLabel(rule.operator)">
            <SchemaValueInput
              v-model="rule.value"
              :field="fieldForPath(rule.path)"
              :placeholder="singleValuePlaceholder(rule.operator)"
              compact
            />
          </el-form-item>
        </el-col>

        <el-col v-if="showRangeValue(rule.operator)" :span="12">
          <el-form-item label="最小值">
            <div class="range-field-inline">
              <el-checkbox v-model="rule.minInclusive" class="range-field-inline__checkbox">含边界</el-checkbox>
              <SchemaValueInput
                v-model="rule.min"
                :field="fieldForPath(rule.path)"
                placeholder="输入最小值"
                compact
              />
            </div>
          </el-form-item>
        </el-col>

        <el-col v-if="showRangeValue(rule.operator)" :span="12">
          <el-form-item label="最大值">
            <div class="range-field-inline">
              <el-checkbox v-model="rule.maxInclusive" class="range-field-inline__checkbox">含边界</el-checkbox>
              <SchemaValueInput
                v-model="rule.max"
                :field="fieldForPath(rule.path)"
                placeholder="输入最大值"
                compact
              />
            </div>
          </el-form-item>
        </el-col>

        <el-col v-if="showSetValue(rule.operator)" :span="8">
          <el-form-item label="集合">
            <SchemaValueInput
              v-model="rule.values"
              :field="fieldForPath(rule.path)"
              :multiple="true"
              placeholder="维护集合值"
              compact
            />
          </el-form-item>
        </el-col>

        <el-col v-if="showPatternValue(rule.operator)" :span="8">
          <el-form-item label="正则">
            <el-input v-model="rule.pattern" placeholder="正则表达式" />
          </el-form-item>
        </el-col>

        <el-col v-if="showDefaultValue(rule.operator)" :span="8">
          <el-form-item label="默认值">
            <SchemaValueInput
              v-model="rule.defaultValue"
              :field="fieldForPath(rule.path)"
              placeholder="输入默认值"
              compact
            />
          </el-form-item>
        </el-col>

        <el-col v-if="showLockedValue(rule.operator)" :span="8">
          <el-form-item label="锁定值">
            <SchemaValueInput
              v-model="rule.lockedValue"
              :field="fieldForPath(rule.path)"
              placeholder="输入锁定值"
              compact
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="12">
        <el-col :span="8">
          <el-form-item label="错误码">
            <el-input v-model="rule.errorCode" placeholder="可选" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="严重度">
            <el-input-number v-model="rule.severity" :min="0" :max="10" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="说明">
        <el-input v-model="rule.errorDescription" type="textarea" :rows="2" />
      </el-form-item>

      <el-form-item label="生效条件">
        <ConditionBuilder
          v-if="rule.applyWhen"
          v-model="rule.applyWhen"
          :hint-engine="hintEngine"
          @delete="rule.applyWhen = undefined"
        />
        <el-button v-else link type="primary" @click="rule.applyWhen = createDefaultCondition()">
          添加生效条件
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { Check, Close, EditPen } from '@element-plus/icons-vue'
import { watch } from 'vue'
import ConditionBuilder from './ConditionBuilder.vue'
import OperatorSelect from './OperatorSelect.vue'
import PathSelector from './PathSelector.vue'
import SchemaValueInput from './SchemaValueInput.vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import { isOperatorCompatible } from '../utils/operator-utils'
import type { HintEngine } from '../engines/hint-engine'
import type { PolicyOperator, PolicyRule, PolicySchemaField } from '../types'

interface Props {
  rule: PolicyRule
  layerId: string
  hintEngine: HintEngine
  active?: boolean
  flash?: boolean
  isEditingRuleId?: boolean
  editingRuleValue?: string
  fieldForPath: (path: string) => PolicySchemaField | undefined
  operatorDisplay: (operator?: PolicyOperator) => string
  validationMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  flash: false,
  isEditingRuleId: false,
  editingRuleValue: '',
  validationMessage: ''
})

const emit = defineEmits<{
  remove: []
  select: []
  'focus-path': []
  'path-change': [rule: PolicyRule]
  'start-rule-edit': []
  'save-rule-edit': []
  'cancel-rule-edit': []
  'update:editingRuleValue': [value: string]
}>()

watch(() => props.rule.operator, (operator) => {
  if (showRangeValue(operator)) {
    if (props.rule.minInclusive === undefined)
      props.rule.minInclusive = true
    if (props.rule.maxInclusive === undefined)
      props.rule.maxInclusive = true
  }

  if (operator === 'locked' && !props.rule.lockMode)
    props.rule.lockMode = 'LOCKED'
}, { immediate: true })

function createDefaultCondition() {
  return {
    id: `condition-${Date.now()}`,
    type: 'simple' as const,
    operator: 'eq' as const,
    field: '',
    value: ''
  }
}

function handleRulePathChange() {
  const field = props.fieldForPath(props.rule.path)
  if (props.rule.operator && !isOperatorCompatible(props.rule.operator, field)) {
    ElMessage.warning(`字段 ${props.rule.path || '-'} 与操作符 ${props.rule.operator} 不兼容，已清空操作符`)
    props.rule.operator = undefined as unknown as PolicyOperator
    props.rule.value = undefined
    props.rule.values = undefined
    props.rule.min = undefined
    props.rule.max = undefined
    props.rule.pattern = undefined
  }
  emit('path-change', props.rule)
}

function showSingleValue(operator?: PolicyOperator) {
  return ['gt', 'ge', 'lt', 'le', 'eq', 'ne', 'contains', 'notContains', 'startsWith', 'notStartsWith', 'endsWith', 'notEndsWith'].includes(operator || '')
}

function showRangeValue(operator?: PolicyOperator) {
  return ['between', 'notBetween'].includes(operator || '')
}

function showSetValue(operator?: PolicyOperator) {
  return ['in', 'notIn'].includes(operator || '')
}

function showPatternValue(operator?: PolicyOperator) {
  return operator === 'regex'
}

function showDefaultValue(operator?: PolicyOperator) {
  return operator === 'default'
}

function showLockedValue(operator?: PolicyOperator) {
  return operator === 'locked'
}

function singleValueLabel(operator?: PolicyOperator) {
  if (['contains', 'notContains', 'startsWith', 'notStartsWith', 'endsWith', 'notEndsWith'].includes(operator || ''))
    return '文本'
  return '值'
}

function singleValuePlaceholder(operator?: PolicyOperator) {
  const placeholders: Record<string, string> = {
    eq: '输入比较值',
    ne: '输入比较值',
    gt: '输入下界值',
    ge: '输入下界值',
    lt: '输入上界值',
    le: '输入上界值',
    contains: '输入需包含的文本',
    notContains: '输入需排除的文本',
    startsWith: '输入开头文本',
    notStartsWith: '输入需排除的开头文本',
    endsWith: '输入结尾文本',
    notEndsWith: '输入需排除的结尾文本'
  }
  return placeholders[operator || ''] || '输入值'
}

</script>

<style scoped>
.rule-card {
  padding: 10px;
  border: 1px solid #dfe4ea;
  border-radius: 10px;
  background: linear-gradient(180deg, #f9fbff 0%, #ffffff 100%);
}

.rule-card.is-active {
  border-color: #93c5fd;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
}

.rule-card.is-flashing {
  animation: rule-card-flash 0.65s ease-in-out 3;
}

.rule-card + .rule-card {
  margin-top: 10px;
}

.rule-card__validation {
  margin-bottom: 10px;
}

.rule-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.rule-card__title,
.rule-card__tools {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rule-card__title > span:first-child {
  font-weight: 700;
  color: #1f2937;
  min-width: 0;
}

.rule-card__edit {
  padding: 0;
}

.inline-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.inline-edit--rule {
  width: min(320px, 100%);
}

.inline-edit__action {
  padding: 0;
}

.rule-form :deep(.el-select),
.rule-form :deep(.el-input),
.rule-form :deep(.el-input-number),
.rule-form :deep(.operator-select),
.rule-form :deep(.el-date-editor) {
  width: 100%;
}

.rule-form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.rule-form :deep(.el-form-item__label) {
  align-items: center;
  min-height: 30px;
  padding-right: 8px;
}

.rule-form :deep(.el-form-item__content) {
  min-height: 30px;
}

.range-field-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.range-field-inline__checkbox {
  flex: 0 0 auto;
  margin-right: 2px;
}

.range-field-inline > :last-child {
  flex: 1;
}

.rule-form__hint {
  margin-top: -6px;
  color: #909399;
  font-size: 11px;
  line-height: 1.4;
}

@keyframes rule-card-flash {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
    border-color: #dfe4ea;
  }
  50% {
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.22);
    border-color: #409eff;
  }
}
</style>
