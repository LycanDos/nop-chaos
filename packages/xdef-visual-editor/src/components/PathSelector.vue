<template>
  <div class="path-selector">
    <el-autocomplete
      ref="autocompleteRef"
      v-model="inputValue"
      :fetch-suggestions="fetchSuggestions"
      :placeholder="placeholder"
      :trigger-on-focus="true"
      :clearable="true"
      :select-when-unmatched="false"
      @select="handleSelect"
      @blur="handleBlur"
      @focus="emit('focus')"
    >
      <template #default="{ item }">
        <div class="suggestion-item">
          <el-icon class="suggestion-icon">
            <component :is="item.icon || 'Document'" />
          </el-icon>
          <div class="suggestion-content">
            <div class="suggestion-label">{{ item.label }}</div>
            <div class="suggestion-path">{{ item.path }}</div>
            <div v-if="item.description && showDescription" class="suggestion-desc">
              {{ item.description }}
            </div>
          </div>
          <el-tag v-if="item.category && showCategory" size="small" type="info">
            {{ item.category }}
          </el-tag>
        </div>
      </template>
    </el-autocomplete>
    
    <!-- 路径预览 -->
    <div v-if="selectedField && showPreview" class="path-preview">
      <el-icon><InfoFilled /></el-icon>
      <span class="preview-text">{{ selectedField.displayName }}</span>
      <el-tag size="small" type="success">{{ selectedField.type }}</el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { InfoFilled, Document } from '@element-plus/icons-vue'
import { HintEngine } from '../engines/hint-engine'
import type { FieldSuggestion, FieldInfo } from '../types'

interface Props {
  modelValue?: string | null
  placeholder?: string
  showPreview?: boolean
  showDescription?: boolean
  showCategory?: boolean
  hintEngine: HintEngine
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择字段...',
  showPreview: true,
  showDescription: true,
  showCategory: true,
  modelValue: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [field: FieldInfo]
  'change': [value: string]
  'focus': []
}>()

const autocompleteRef = ref()
const inputValue = ref(props.modelValue)
const selectedField = ref<FieldInfo | null>(null)

const placeholder = computed(() => props.placeholder)

const fetchSuggestions = async (input: string, callback: any) => {
  if (!input) {
    // 输入为空时，返回常用字段
    const suggestions = getPopularFields()
    callback(suggestions)
    return
  }
  
  const suggestions = props.hintEngine.getFieldSuggestions(input, {
    currentPath: input,
    availableFields: [],
    recentFields: props.hintEngine.getRecentFields(),
    popularFields: props.hintEngine.getPopularFields()
  })
  
  callback(suggestions)
}

const handleSelect = (item: FieldSuggestion) => {
  const field = props.hintEngine.parsePath(item.value)
  if (field) {
    selectedField.value = field
    inputValue.value = item.value
    props.hintEngine.addToRecent(field)
    emit('update:modelValue', item.value)
    emit('select', field)
    emit('change', item.value)
  }
}

const handleBlur = () => {
  // 失焦时，尝试解析输入的路径
  if (inputValue.value) {
    const field = props.hintEngine.parsePath(inputValue.value)
    if (field) {
      selectedField.value = field
      emit('update:modelValue', field.path)
      props.hintEngine.addToRecent(field)
    }
  }
}

const getPopularFields = (): FieldSuggestion[] => {
  const popularFields = props.hintEngine.getPopularFields(5)
  return popularFields.map(field => ({
    value: field.path,
    label: `${field.displayName} (${field.path})`,
    path: field.path,
    type: field.type,
    description: field.displayName,
    icon: 'Document',
    category: field.path.split('.')[0]
  }))
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal !== inputValue.value) {
    inputValue.value = newVal
    const field = props.hintEngine.parsePath(newVal)
    if (field) {
      selectedField.value = field
    } else {
      selectedField.value = null
    }
  }
})

// 初始化
onMounted(() => {
  if (props.modelValue) {
    const field = props.hintEngine.parsePath(props.modelValue)
    if (field) {
      selectedField.value = field
    }
  }
})

// 暴露方法
defineExpose({
  focus: () => {
    autocompleteRef.value?.focus()
  },
  blur: () => {
    autocompleteRef.value?.blur()
  },
  getSelectedField: () => selectedField.value
})
</script>

<style scoped>
.path-selector {
  width: 100%;
}

.path-selector :deep(.el-autocomplete__popper) {
  position: absolute !important;
  z-index: 9999 !important;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f5f7fa;
}

.suggestion-icon {
  font-size: 16px;
  color: #909399;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-label {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-path {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
}

.suggestion-desc {
  font-size: 12px;
  color: #67c23a;
  margin-top: 2px;
}

.path-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #e3f2fd 0%, #f0f9ff 100%);
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.preview-text {
  flex: 1;
  font-size: 13px;
  color: #409eff;
  font-weight: 500;
}
</style>