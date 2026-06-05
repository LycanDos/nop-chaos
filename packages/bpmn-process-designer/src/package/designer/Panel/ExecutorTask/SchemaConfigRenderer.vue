<!--
  JSON Schema 自动表单渲染器

  根据 configSchema 自动生成表单控件。
  支持标准 JSON Schema 类型 + ui:widget / ui:fullScreen 扩展。

  用法:
    <SchemaConfigRenderer
      :schema="plugin.configSchema"
      v-model="configData"
    />
-->
<script setup lang="ts">
import { computed, watch } from 'vue'
import { InfoCircleFilled, DeleteOutlined } from '@ant-design/icons-vue'

const props = defineProps<{
  schema: Record<string, any>
  modelValue: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: Record<string, any>): void
}>()

const localValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

function getDefaultValue(propSchema: Record<string, any>): any {
  if (propSchema.default !== undefined) return propSchema.default
  switch (propSchema.type) {
    case 'string': return ''
    case 'integer':
    case 'number': return 0
    case 'boolean': return false
    case 'array': return []
    case 'object': return {}
    default: return ''
  }
}

function getFieldWidget(propSchema: Record<string, any>): string {
  if (propSchema['ui:widget']) return propSchema['ui:widget']
  if (propSchema.enum) return 'select'
  if (propSchema.type === 'boolean') return 'switch'
  if (propSchema.type === 'integer' || propSchema.type === 'number') return 'input-number'
  if (propSchema.type === 'object') return 'json-editor'
  if (propSchema.type === 'array' && propSchema.items?.type === 'object') return 'kv-table'
  return 'input'
}

function isFullScreen(propSchema: Record<string, any>): boolean {
  return propSchema['ui:fullScreen'] === true
}

function toggleKvItem(field: string, index: number) {
  const arr = [...(localValue.value[field] || [])]
  if (index >= 0 && index < arr.length) {
    arr[index] = { ...arr[index], enabled: !arr[index].enabled }
  }
  localValue.value = { ...localValue.value, [field]: arr }
}

function addKvItem(field: string) {
  const arr = [...(localValue.value[field] || [])]
  arr.push({ key: '', value: '', enabled: true })
  localValue.value = { ...localValue.value, [field]: arr }
}

function removeKvItem(field: string, index: number) {
  const arr = [...(localValue.value[field] || [])]
  arr.splice(index, 1)
  localValue.value = { ...localValue.value, [field]: arr }
}
</script>

<template>
  <div class="schema-form">
    <template v-for="(propSchema, key) in schema.properties" :key="key">
      <a-form-item :label="propSchema.title || key" :required="schema.required?.includes(key)" :label-position="'top'">
        <!-- select (enum) -->
        <template v-if="getFieldWidget(propSchema) === 'select'">
          <a-select
            :model-value="localValue[key]"
            style="width: 100%"
            @update:model-value="localValue = { ...localValue, [key]: $event }"
          >
            <a-select-option
              v-for="opt in propSchema.enum"
              :key="opt"
              :label="propSchema['ui:enumLabels']?.[opt] || opt"
              :value="opt"
            />
          </a-select>
        </template>

        <!-- switch (boolean) -->
        <template v-else-if="getFieldWidget(propSchema) === 'switch'">
          <a-switch
            :model-value="localValue[key]"
            @update:model-value="localValue = { ...localValue, [key]: $event }"
          />
        </template>

        <!-- input-number -->
        <template v-else-if="getFieldWidget(propSchema) === 'input-number'">
          <a-input-number
            :model-value="localValue[key] ?? getDefaultValue(propSchema)"
            :min="propSchema.minimum"
            :max="propSchema.maximum"
            controls
            style="width: 100%"
            @update:model-value="localValue = { ...localValue, [key]: $event }"
          />
        </template>

        <!-- textarea -->
        <template v-else-if="getFieldWidget(propSchema) === 'textarea'">
          <a-input
            :model-value="localValue[key]"
            type="textarea"
            :rows="3"
            :placeholder="propSchema.description || propSchema.title"
            @update:model-value="localValue = { ...localValue, [key]: $event }"
          />
        </template>

        <!-- json-editor (简单 JSON 文本编辑) -->
        <template v-else-if="getFieldWidget(propSchema) === 'json-editor'">
          <a-input
            :model-value="localValue[key] ? JSON.stringify(localValue[key], null, 2) : ''"
            type="textarea"
            :rows="4"
            placeholder="JSON 对象"
            @update:model-value="(val: string) => {
              try {
                const parsed = JSON.parse(val)
                localValue = { ...localValue, [key]: parsed }
              } catch {
                // 编辑阶段暂不校验
              }
            }"
          />
        </template>

        <!-- kv-table (key/value 数组) -->
        <template v-else-if="getFieldWidget(propSchema) === 'kv-table'">
          <div class="kv-table">
            <div
              v-for="(item, idx) in (localValue[key] || [])"
              :key="idx"
              class="kv-row"
            >
              <a-checkbox
                :model-value="item.enabled !== false"
                @change="toggleKvItem(key, idx)"
              />
              <a-input
                :model-value="item.key"
                placeholder="Key"
                size="small"
                style="width: 120px"
                @update:model-value="(val: string) => {
                  const arr = [...(localValue[key] || [])]
                  arr[idx] = { ...arr[idx], key: val }
                  localValue = { ...localValue, [key]: arr }
                }"
              />
              <a-input
                :model-value="item.value"
                placeholder="Value"
                size="small"
                style="width: 160px"
                @update:model-value="(val: string) => {
                  const arr = [...(localValue[key] || [])]
                  arr[idx] = { ...arr[idx], value: val }
                  localValue = { ...localValue, [key]: arr }
                }"
              />
              <a-button size="small" danger circle @click="removeKvItem(key, idx)" ><DeleteOutlined /></a-button>
            </div>
            <a-button size="small" @click="addKvItem(key)">+ 添加</a-button>
          </div>
        </template>

        <!-- default: input -->
        <template v-else>
          <a-input
            :model-value="localValue[key]"
            :placeholder="propSchema.description || propSchema.title"
            clearable
            @update:model-value="localValue = { ...localValue, [key]: $event }"
          />
        </template>

        <!-- 字段描述 -->
        <div v-if="propSchema.description" class="field-desc">
          <InfoCircleFilled />
          <span>{{ propSchema.description }}</span>
        </div>
      </a-form-item>
    </template>

    <!-- 空状态 -->
    <div v-if="!schema.properties" class="empty-schema">
      暂无配置项
    </div>
  </div>
</template>

<style scoped lang="scss">
.schema-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-desc {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.kv-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.kv-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-schema {
  padding: 16px;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
</style>
