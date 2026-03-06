<template>
  <div class="error-code-selector" ref="containerRef">
    <el-input
      ref="inputRef"
      v-model="inputValue"
      :placeholder="placeholder"
      clearable
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <template #append>
        <el-button :icon="Search" @click="showSuggestions = !showSuggestions" />
      </template>
    </el-input>
    
    <!-- 建议列表 -->
    <Transition name="dropdown">
      <div v-if="showSuggestions" class="suggestions-dropdown">
        <div v-if="filteredSuggestions.length === 0" class="no-results">
          <el-empty description="未找到匹配的错误码" :image-size="60" />
        </div>
        
        <div v-else class="suggestions-list">
          <div
            v-for="suggestion in filteredSuggestions"
            :key="suggestion"
            class="suggestion-item"
            @click="selectSuggestion(suggestion)"
          >
            <div class="suggestion-code">{{ suggestion }}</div>
            <div class="suggestion-desc">{{ getErrorDescription(suggestion) }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { HintEngine } from '../engines/hint-engine'

interface Props {
  modelValue: string
  placeholder?: string
  hintEngine: HintEngine
  relatedField?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择或输入错误码...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [value: string]
  'focus': []
}>()

const containerRef = ref<HTMLElement>()
const inputRef = ref()
const inputValue = ref(props.modelValue)
const showSuggestions = ref(false)
const searchQuery = ref('')

const placeholder = computed(() => props.placeholder)

// 建议列表
const suggestions = computed(() => {
  const codes: string[] = []
  
  // 1. 基于关联字段生成错误码
  if (props.relatedField) {
    const field = props.hintEngine.parsePath(props.relatedField)
    if (field) {
      codes.push(`${field.path}.required`)
      codes.push(`${field.path}.invalid`)
      codes.push(`${field.path}.format-error`)
      codes.push(`${field.path}.length-error`)
      codes.push(`${field.path}.range-error`)
    }
  }
  
  // 2. 常见错误码
  codes.push(...getCommonErrorCodes())
  
  return codes
})

// 过滤后的建议
const filteredSuggestions = computed(() => {
  const query = inputValue.value.trim().toLowerCase()
  
  if (!query) {
    return suggestions.value.slice(0, 15)
  }
  
  return suggestions.value.filter(code => 
    code.toLowerCase().includes(query)
  ).slice(0, 15)
})

const getCommonErrorCodes = (): string[] => {
  return [
    'validation.required',
    'validation.invalid',
    'validation.format',
    'validation.range',
    'validation.length',
    'validation.pattern',
    'validation.type',
    'validation.unique',
    'validation.exists',
    'validation.not-null',
    'validation.not-empty',
    'validation.not-blank'
  ]
}

const getErrorDescription = (code: string): string => {
  const descriptions: Record<string, string> = {
    'validation.required': '字段不能为空',
    'validation.invalid': '字段值无效',
    'validation.format': '字段格式错误',
    'validation.range': '字段值超出范围',
    'validation.length': '字段长度错误',
    'validation.pattern': '字段不匹配正则表达式',
    'validation.type': '字段类型错误',
    'validation.unique': '字段值必须唯一',
    'validation.exists': '字段值不存在',
    'validation.not-null': '字段不能为 null',
    'validation.not-empty': '字段不能为空字符串',
    'validation.not-blank': '字段不能为空白字符'
  }
  
  // 检查是否是字段相关的错误码
  if (code.includes('.')) {
    const parts = code.split('.')
    const fieldPath = parts.slice(0, -1).join('.')
    const errorType = parts[parts.length - 1]
    
    const field = props.hintEngine.parsePath(fieldPath)
    if (field) {
      const fieldDescriptions: Record<string, string> = {
        'required': `${field.displayName}不能为空`,
        'invalid': `${field.displayName}值无效`,
        'format-error': `${field.displayName}格式错误`,
        'length-error': `${field.displayName}长度错误`,
        'range-error': `${field.displayName}值超出范围`
      }
      
      if (fieldDescriptions[errorType]) {
        return fieldDescriptions[errorType]
      }
    }
  }
  
  return descriptions[code] || '自定义错误'
}

const selectSuggestion = (code: string) => {
  inputValue.value = code
  showSuggestions.value = false
  emit('update:modelValue', code)
  emit('change', code)
}

const handleBlur = () => {
  // 延迟隐藏，允许点击建议项
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const handleFocus = () => {
  showSuggestions.value = true
  emit('focus')
}

const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    showSuggestions.value = false
  }
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

// 点击外部关闭建议
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 暴露方法
defineExpose({
  focus: () => {
    inputRef.value?.focus()
  },
  blur: () => {
    inputRef.value?.blur()
  },
  showSuggestions: () => {
    showSuggestions.value = true
  },
  hideSuggestions: () => {
    showSuggestions.value = false
  }
})
</script>

<style scoped>
.error-code-selector {
  position: relative;
  width: 100%;
}

.suggestions-dropdown {
  position: fixed;
  z-index: 9999 !important;
  margin-top: 4px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
}

.no-results {
  padding: 20px;
}

.suggestions-list {
  padding: 4px 0;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f5f7fa;
}

.suggestion-code {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  color: #409eff;
  margin-bottom: 2px;
}

.suggestion-desc {
  font-size: 12px;
  color: #909399;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>