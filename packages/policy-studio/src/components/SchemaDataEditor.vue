<template>
  <div class="schema-data-editor">
    <template v-if="field.type === 'object'">
      <div class="object-grid">
        <div
          v-for="child in field.fields || []"
          :key="child.path"
          class="object-item"
        >
          <div class="field-label">
            <span>{{ child.label }}</span>
            <span v-if="child.path" class="field-path">{{ child.path }}</span>
          </div>
          <SchemaDataEditor
            :field="child"
            :model-value="objectValue[child.name]"
            @update:model-value="updateObjectChild(child.name, $event)"
          />
          <div v-if="child.description" class="field-description">{{ child.description }}</div>
        </div>
      </div>
    </template>

    <template v-else-if="field.type === 'array'">
      <div v-if="isObjectArray" class="array-object-list">
        <div
          v-for="(itemValue, index) in arrayValue"
          :key="`${field.path}-${index}`"
          class="array-card"
        >
          <div class="array-card-header">
            <span>{{ field.label }} {{ index + 1 }}</span>
            <el-button link type="danger" @click="removeArrayItem(index)">删除</el-button>
          </div>
          <SchemaDataEditor
            :field="field.item!"
            :model-value="itemValue"
            @update:model-value="updateArrayItem(index, $event)"
          />
        </div>
        <el-button size="small" @click="addArrayItem">新增一项</el-button>
      </div>

      <SchemaValueInput
        v-else
        :model-value="arrayValue"
        :field="primitiveArrayField"
        :multiple="true"
        :placeholder="`维护 ${field.label}`"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </template>

    <SchemaValueInput
      v-else
      :model-value="modelValue"
      :field="field"
      :placeholder="`请输入 ${field.label}`"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SchemaValueInput from './SchemaValueInput.vue'
import type { PolicySchemaField } from '../types'

defineOptions({
  name: 'SchemaDataEditor'
})

interface Props {
  field: PolicySchemaField
  modelValue?: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const objectValue = computed<Record<string, any>>(() => {
  if (props.modelValue && typeof props.modelValue === 'object' && !Array.isArray(props.modelValue))
    return props.modelValue
  return {}
})

const arrayValue = computed<any[]>(() => {
  if (Array.isArray(props.modelValue))
    return props.modelValue
  return []
})

const isObjectArray = computed(() => props.field.item?.type === 'object')
const primitiveArrayField = computed<PolicySchemaField | undefined>(() => {
  if (!props.field.item || props.field.item.type === 'object' || props.field.item.type === 'array')
    return undefined
  return {
    ...props.field.item,
    label: props.field.label,
    path: `${props.field.path}[]`
  }
})

function updateObjectChild(name: string, value: any) {
  emit('update:modelValue', {
    ...objectValue.value,
    [name]: value
  })
}

function updateArrayItem(index: number, value: any) {
  const nextItems = [...arrayValue.value]
  nextItems[index] = value
  emit('update:modelValue', nextItems)
}

function removeArrayItem(index: number) {
  const nextItems = [...arrayValue.value]
  nextItems.splice(index, 1)
  emit('update:modelValue', nextItems)
}

function addArrayItem() {
  if (!props.field.item)
    return

  const nextItems = [...arrayValue.value]
  if (props.field.item.type === 'object') {
    const newItem: Record<string, any> = {}
    for (const child of props.field.item.fields || [])
      newItem[child.name] = child.defaultValue ?? defaultScalarValue(child)
    nextItems.push(newItem)
  }
  else {
    nextItems.push(props.field.item.defaultValue ?? defaultScalarValue(props.field.item))
  }
  emit('update:modelValue', nextItems)
}

function defaultScalarValue(field: PolicySchemaField) {
  if (field.type === 'boolean')
    return false
  if (field.type === 'number' || field.type === 'integer')
    return undefined
  if (field.type === 'array')
    return []
  if (field.type === 'object')
    return {}
  return ''
}
</script>

<style scoped>
.schema-data-editor {
  width: 100%;
}

.object-grid {
  display: grid;
  gap: 10px;
}

.object-item {
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}

.field-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #303133;
  flex-wrap: wrap;
}

.field-path {
  color: #909399;
  font-size: 11px;
  font-weight: 400;
  font-family: Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.field-description {
  margin-top: 6px;
  color: #909399;
  font-size: 11px;
  line-height: 1.4;
}

.array-object-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.array-card {
  padding: 10px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background: #fff;
}

.array-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
}
</style>
