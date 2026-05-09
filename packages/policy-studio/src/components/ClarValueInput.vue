<!--
  Clar 值输入组件
  支持字面量和 Delta 表达式两种模式
-->
<template>
  <div class="clar-value-input">
    <!-- 模式切换 -->
    <div class="mode-switch">
      <el-radio-group v-model="valueMode" size="small" @change="handleModeChange">
        <el-radio-button value="literal">字面量</el-radio-button>
        <el-radio-button value="jina">JSONata</el-radio-button>
        <el-radio-button value="jmes">JMESPath</el-radio-button>
      </el-radio-group>
    </div>
    
    <!-- 字面量输入 -->
    <div v-if="valueMode === 'literal'" class="value-input">
      <SchemaValueInput
        :model-value="literalValue"
        :field="field"
        :placeholder="placeholder"
        :disabled="disabled"
        @update:model-value="handleLiteralChange"
      />
    </div>
    
    <!-- JSONata 表达式输入 -->
    <div v-else-if="valueMode === 'jina'" class="value-input">
      <el-input
        v-model="expressionValue"
        type="textarea"
        :rows="2"
        :disabled="disabled"
        :placeholder="jinaPlaceholder"
        @change="handleExpressionChange"
      />
      <div class="expression-hint">
        <span>可用变量: $input, $output, $context, $system, $config, $field</span>
      </div>
    </div>
    
    <!-- JMESPath 表达式输入 -->
    <div v-else-if="valueMode === 'jmes'" class="value-input">
      <el-input
        v-model="expressionValue"
        type="textarea"
        :rows="2"
        :disabled="disabled"
        :placeholder="jmesPlaceholder"
        @change="handleExpressionChange"
      />
      <div class="expression-hint">
        <span>可用变量: $input, $output, $context, $system, $config, $field</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SchemaValueInput from './SchemaValueInput.vue'
import type { PolicySchemaField } from '../types'

interface Props {
  modelValue?: any
  field?: PolicySchemaField
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入值',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

type ValueMode = 'literal' | 'jina' | 'jmes'

const valueMode = ref<ValueMode>('literal')
const literalValue = ref<any>(null)
const expressionValue = ref('')

const jinaPlaceholder = '输入 JSONata 表达式,如: $input.amount * 1.1'
const jmesPlaceholder = '输入 JMESPath 表达式,如: input.items[*].amount | sum(@)'

// 监听 modelValue 变化,解析模式
watch(() => props.modelValue, (val) => {
  if (val == null) {
    valueMode.value = 'literal'
    literalValue.value = null
    expressionValue.value = ''
    return
  }
  
  // 检测是否是 Delta 表达式
  if (typeof val === 'object' && !Array.isArray(val)) {
    if (val.$jina !== undefined) {
      valueMode.value = 'jina'
      expressionValue.value = String(val.$jina || '')
      return
    }
    if (val.$jmes !== undefined) {
      valueMode.value = 'jmes'
      expressionValue.value = String(val.$jmes || '')
      return
    }
  }
  
  // 字面量
  valueMode.value = 'literal'
  literalValue.value = val
}, { immediate: true })

// 模式切换时清空值
function handleModeChange(mode: ValueMode) {
  if (mode === 'literal') {
    emit('update:modelValue', literalValue.value)
  } else {
    expressionValue.value = ''
    const expression = mode === 'jina' ? { $jina: '' } : { $jmes: '' }
    emit('update:modelValue', expression)
  }
}

// 字面量值变化
function handleLiteralChange(val: any) {
  literalValue.value = val
  emit('update:modelValue', val)
}

// 表达式值变化
function handleExpressionChange() {
  if (valueMode.value === 'jina') {
    emit('update:modelValue', { $jina: expressionValue.value })
  } else if (valueMode.value === 'jmes') {
    emit('update:modelValue', { $jmes: expressionValue.value })
  }
}
</script>

<style scoped lang="scss">
.clar-value-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-switch {
  display: flex;
  align-items: center;
}

.value-input {
  flex: 1;
}

.expression-hint {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
}
</style>
