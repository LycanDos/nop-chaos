<template>
  <div class="condition-builder">
    <div class="condition-header">
      <el-select
        v-model="condition.type"
        placeholder="选择条件类型"
        size="small"
        @change="handleTypeChange"
      >
        <el-option label="简单条件" value="simple" />
        <el-option label="AND (且)" value="and" />
        <el-option label="OR (或)" value="or" />
        <el-option label="NOT (非)" value="not" />
        <el-option label="条件判断 (if)" value="if" />
      </el-select>
      
      <el-button
        v-if="condition.type === 'and' || condition.type === 'or' || condition.type === 'if'"
        type="primary"
        size="small"
        @click="addSubCondition"
      >
        <el-icon><Plus /></el-icon>
        添加条件
      </el-button>
      
      <el-button
        type="danger"
        size="small"
        :icon="Delete"
        @click="handleDelete"
      >
        删除
      </el-button>
    </div>
    
    <!-- 简单条件 -->
    <div v-if="condition.type === 'simple'" class="condition-simple">
      <div class="form-row">
        <div class="form-item">
          <PathSelector
            v-model="condition.field"
            :hint-engine="hintEngine"
            placeholder="字段路径..."
            @change="handleFieldChange"
            @focus="emit('field-focus', 'name')"
          />
        </div>
        
        <div class="form-item">
          <el-select
            v-model="condition.operator"
            placeholder="运算符"
            @change="handleOperatorChange"
          >
            <el-option
              v-for="op in operatorOptions"
              :key="op.value"
              :label="op.label"
              :value="op.value"
            />
          </el-select>
        </div>
      </div>
      
      <!-- 值输入 -->
      <div class="form-row" v-if="showValueInput">
        <div class="form-item">
          <el-input
            v-if="!isRangeOperator"
            v-model="condition.value"
            :placeholder="getValuePlaceholder()"
            @change="handleValueChange"
            @focus="emit('field-focus', 'value')"
          />
          <div v-else class="range-inputs">
            <el-input
              v-model="condition.min"
              placeholder="最小值"
              size="small"
              @change="handleValueChange"
              @focus="emit('field-focus', 'min')"
            />
            <span class="range-separator">-</span>
            <el-input
              v-model="condition.max"
              placeholder="最大值"
              size="small"
              @change="handleValueChange"
              @focus="emit('field-focus', 'max')"
            />
          </div>
        </div>
      </div>
      
      <!-- 正则表达式输入 -->
      <div class="form-row" v-if="condition.operator === 'regex'">
        <div class="form-item">
          <el-input
            v-model="condition.pattern"
            placeholder="正则表达式..."
            @change="handleValueChange"
            @focus="emit('field-focus', 'pattern')"
          />
        </div>
      </div>
    </div>
    
    <!-- AND/OR 条件 -->
    <div v-if="condition.type === 'and' || condition.type === 'or'" class="condition-complex">
      <div class="sub-conditions">
        <ConditionBuilder
          v-for="(subCondition, index) in condition.conditions"
          :key="subCondition.id"
          v-model="condition.conditions![index]"
          :hint-engine="hintEngine"
          @delete="removeSubCondition(index)"
        />
      </div>
      
      <el-empty
        v-if="!condition.conditions || condition.conditions.length === 0"
        description="暂无子条件，请点击上方按钮添加"
        :image-size="80"
      />
    </div>
    
    <!-- NOT 条件 -->
    <div v-if="condition.type === 'not'" class="condition-complex">
      <div class="sub-conditions">
        <ConditionBuilder
          v-if="condition.conditions && condition.conditions[0]"
          v-model="condition.conditions![0]"
          :hint-engine="hintEngine"
          @delete="() => {}"
        />
      </div>
      
      <el-empty
        v-if="!condition.conditions || condition.conditions.length === 0"
        description="请添加一个子条件"
        :image-size="80"
      />
    </div>
    
    <!-- IF 条件 -->
    <div v-if="condition.type === 'if'" class="condition-if">
      <div class="if-section">
        <div class="section-title">前置条件</div>
        <div class="form-item">
          <el-input
            v-model="condition.test"
            type="textarea"
            :rows="2"
            placeholder="输入条件表达式，例如: user.age > 18"
            @change="handleValueChange"
          />
        </div>
      </div>
      
      <div class="then-section">
        <div class="section-title">THEN 分支</div>
        <div class="sub-conditions">
          <ConditionBuilder
            v-if="condition.then"
            v-model="condition.then"
            :hint-engine="hintEngine"
            @delete="() => {}"
          />
          <el-button
            v-else
            type="primary"
            size="small"
            @click="addThenCondition"
          >
            <el-icon><Plus /></el-icon>
            添加 THEN 条件
          </el-button>
        </div>
      </div>
      
      <div class="else-section">
        <div class="section-title">ELSE 分支</div>
        <div class="sub-conditions">
          <ConditionBuilder
            v-if="condition.else"
            v-model="condition.else"
            :hint-engine="hintEngine"
            @delete="() => {}"
          />
          <el-button
            v-else
            type="primary"
            size="small"
            @click="addElseCondition"
          >
            <el-icon><Plus /></el-icon>
            添加 ELSE 条件
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { HintEngine } from '../engines/hint-engine'
import PathSelector from './PathSelector.vue'
import type { ConditionNode, OperatorType } from '../types'

interface Props {
  modelValue: ConditionNode
  hintEngine: HintEngine
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ConditionNode]
  'delete': []
  'field-focus': [field: string]
}>()

const condition = ref<ConditionNode>({ ...props.modelValue })

// 运算符选项
const operatorOptions = computed(() => {
  return props.hintEngine.getOperatorSuggestions(condition.value.field ? getFieldType(condition.value.field) : undefined)
})

// 是否显示值输入
const showValueInput = computed(() => {
  const op = condition.value.operator
  if (!op) return false
  
  const noValueOps: OperatorType[] = ['isNull', 'notNull', 'isEmpty', 'notEmpty', 'isBlank', 'notBlank', 'isTrue', 'notTrue', 'isFalse', 'notFalse']
  return !noValueOps.includes(op)
})

// 是否是范围运算符
const isRangeOperator = computed(() => {
  const op = condition.value.operator
  return ['between', 'lengthBetween', 'utf8LengthBetween'].includes(op!)
})

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  // 使用浅比较避免递归
  if (JSON.stringify(condition.value) !== JSON.stringify(newVal)) {
    condition.value = { ...newVal }
  }
}, { deep: true })

const handleTypeChange = () => {
  const newType = condition.value.type
  
  // 切换到复合条件类型时，初始化 conditions 数组
  if (newType === 'and' || newType === 'or') {
    if (!condition.value.conditions || condition.value.conditions.length === 0) {
      condition.value.conditions = [
        {
          id: `cond-${Date.now()}`,
          type: 'simple',
          operator: 'eq',
          field: '',
          value: ''
        }
      ]
    }
  }
  
  // 切换到 not 类型时，确保有一个子条件
  if (newType === 'not') {
    if (!condition.value.conditions || condition.value.conditions.length === 0) {
      condition.value.conditions = [
        {
          id: `cond-${Date.now()}`,
          type: 'simple',
          operator: 'eq',
          field: '',
          value: ''
        }
      ]
    }
  }
  
  // 切换到 if 类型时，初始化 then 和 else
  if (newType === 'if') {
    if (!condition.value.then) {
      condition.value.then = {
        id: `cond-${Date.now()}`,
        type: 'simple',
        operator: 'eq',
        field: '',
        value: ''
      }
    }
    if (!condition.value.else) {
      condition.value.else = {
        id: `cond-${Date.now()}`,
        type: 'simple',
        operator: 'eq',
        field: '',
        value: ''
      }
    }
  }
  
  // 切换到简单条件时，清除不必要的数据
  if (newType === 'simple') {
    delete condition.value.conditions
    delete condition.value.then
    delete condition.value.else
    delete condition.value.test
  }
  
  emit('update:modelValue', condition.value)
}

const handleFieldChange = () => {
  emit('update:modelValue', condition.value)
}

const handleOperatorChange = () => {
  emit('update:modelValue', condition.value)
}

const handleValueChange = () => {
  emit('update:modelValue', condition.value)
}

const getValuePlaceholder = () => {
  const op = condition.value.operator
  if (!op) return '输入值...'
  
  const placeholders: Record<string, string> = {
    'eq': '输入要比较的值',
    'ne': '输入不等于的值',
    'gt': '输入大于的值',
    'ge': '输入大于等于的值',
    'lt': '输入小于的值',
    'le': '输入小于等于的值',
    'contains': '输入包含的文本',
    'startsWith': '输入以...开头的文本',
    'endsWith': '输入以...结尾的文本',
    'in': '输入逗号分隔的值列表'
  }
  
  return placeholders[op] || '输入值...'
}

const getFieldType = (fieldPath: string): string | undefined => {
  const field = props.hintEngine.parsePath(fieldPath)
  return field?.type
}

const addSubCondition = () => {
  if (!condition.value.conditions) {
    condition.value.conditions = []
  }
  
  const newCondition: ConditionNode = {
    id: `condition-${Date.now()}`,
    type: 'simple'
  }
  
  condition.value.conditions.push(newCondition)
  emit('update:modelValue', condition.value)
}

const removeSubCondition = (index: number) => {
  if (condition.value.conditions) {
    condition.value.conditions.splice(index, 1)
    emit('update:modelValue', condition.value)
  }
}

const addThenCondition = () => {
  const newCondition: ConditionNode = {
    id: `then-${Date.now()}`,
    type: 'simple'
  }
  
  condition.value.then = newCondition
  emit('update:modelValue', condition.value)
}

const addElseCondition = () => {
  const newCondition: ConditionNode = {
    id: `else-${Date.now()}`,
    type: 'simple'
  }
  
  condition.value.else = newCondition
  emit('update:modelValue', condition.value)
}

const handleDelete = () => {
  emit('delete')
}
</script>

<style scoped>
.condition-builder {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fafafa;
}

.condition-header {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.condition-simple,
.condition-complex,
.condition-if {
  margin-top: 12px;
}

.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 字段选择器占据更宽空间 */
.form-row .form-item:first-child {
  flex: 3;
  min-width: 0;
}

/* 运算符选择框缩短 */
.form-row .form-item:nth-child(2) {
  flex: 0 0 140px;
}

.form-item label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}

.range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-separator {
  color: #909399;
}

.sub-conditions {
  margin-top: 12px;
}

.if-section,
.then-section,
.else-section {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  background: white;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

/* 确保 ConditionBuilder 占满整个宽度 */
.condition-builder {
  width: 100%;
}

.condition-builder :deep(.el-form-item__content) {
  flex: 1;
  min-width: 0;
}

.condition-builder :deep(.el-input),
.condition-builder :deep(.el-select),
.condition-builder :deep(.el-textarea),
.condition-builder :deep(.el-input-number) {
  width: 100%;
}

/* 修复下拉框定位问题 */
.condition-builder :deep(.el-select-dropdown),
.condition-builder :deep(.el-popper) {
  position: fixed !important;
  z-index: 9999 !important;
}
</style>