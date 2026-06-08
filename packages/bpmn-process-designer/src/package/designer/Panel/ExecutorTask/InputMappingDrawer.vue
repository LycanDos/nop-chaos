<!--
  入参映射编辑抽屉
  将流程变量映射到执行器方法的入参字段
-->
<script setup lang="ts">
import { ref } from 'vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import type { InputMappingItem, MethodSchemaFieldItem } from '@/types/executor.ts'

defineOptions({ name: 'InputMappingDrawer' , inheritAttrs: false })

const emit = defineEmits<{
  (e: 'confirm', mappings: InputMappingItem[]): void
}>()

const visible = ref(false)
const mappings = ref<InputMappingItem[]>([])
const inputFields = ref<MethodSchemaFieldItem[]>([])

const sourceTypeOptions = [
  { label: '流程变量', value: 'variable' },
  { label: '字面量', value: 'literal' },
  { label: '表达式', value: 'expression' },
]

function openDrawer(currentMappings: InputMappingItem[], fields: MethodSchemaFieldItem[]) {
  inputFields.value = fields
  // 如果没有映射但有字段，自动生成默认映射
  if (!currentMappings.length && fields.length) {
    mappings.value = fields.map(f => ({
      source: f.fieldPath || f.fieldName,
      target: f.fieldPath || f.fieldName,
      expression: '',
      sourceType: 'variable' as const,
    }))
  } else {
    mappings.value = currentMappings.map(m => ({ ...m }))
  }
  visible.value = true
}

function addMapping() {
  mappings.value.push({
    source: '',
    target: '',
    expression: '',
    sourceType: 'variable',
  })
}

function removeMapping(index: number) {
  mappings.value.splice(index, 1)
}

function confirm() {
  // 过滤掉空行
  const validMappings = mappings.value.filter(m => m.source && m.target)
  emit('confirm', validMappings)
  visible.value = false
}

function cancel() {
  visible.value = false
}

defineExpose({ openDrawer })
</script>

<template>
  <a-drawer v-model:visible="visible" placement="rtl" width="520px" :show-close="false" :closable="false">
    <div class="mapping-drawer-content">
      <div class="mapping-toolbar">
        <a-button type="primary" size="small" @click="addMapping"><PlusOutlined /> 添加映射 </a-button>
        <span class="mapping-count">共 {{ mappings.length }} 条映射</span>
      </div>

      <div class="mapping-list">
        <div v-for="(item, index) in mappings" :key="index" class="mapping-item">
          <div class="mapping-item__header">
            <span class="mapping-item__index">#{{ index + 1 }}</span>
            <a-popconfirm title="确定删除此映射？" @confirm="removeMapping(index)">
              <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>

          <a-form label-width="80px" size="small">
            <a-form-item label="来源类型">
              <a-select v-model:value="item.sourceType" style="width: 100%">
                <a-select-option
                  v-for="opt in sourceTypeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </a-select>
            </a-form-item>

            <a-form-item label="来源">
              <a-input
                v-model:value="item.source"
                :placeholder="item.sourceType === 'variable' ? '流程变量名' : item.sourceType === 'literal' ? '字面量值' : '表达式'"
              />
            </a-form-item>

            <a-form-item label="目标参数">
              <a-select
                v-if="inputFields.length"
                v-model:value="item.target"
                showSearch
                allow-create
                placeholder="选择或输入目标参数"
                style="width: 100%"
              >
                <a-select-option
                  v-for="field in inputFields"
                  :key="field.fieldId"
                  :label="`${field.fieldName} (${field.dataType})${field.required ? ' *' : ''}`"
                  :value="field.fieldPath || field.fieldName"
                />
              </a-select>
              <a-input v-else v-model:value="item.target" placeholder="目标参数路径" />
            </a-form-item>

            <a-form-item v-if="item.sourceType === 'expression'" label="表达式">
              <a-input
                v-model:value="item.expression"
                type="textarea"
                :rows="2"
                placeholder="转换表达式（JUEL）"
              />
            </a-form-item>
          </a-form>
        </div>

        <a-empty v-if="!mappings.length" description="暂无映射，点击上方按钮添加" />
      </div>
    </div>

    <template #footer>
      <a-button @click="cancel">取消</a-button>
      <a-button type="primary" @click="confirm">确认</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss">
.mapping-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.mapping-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.mapping-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.mapping-list {
  flex: 1;
  overflow-y: auto;
}
.mapping-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  background: var(--el-fill-color-lighter);
}
.mapping-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.mapping-item__index {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}
</style>
