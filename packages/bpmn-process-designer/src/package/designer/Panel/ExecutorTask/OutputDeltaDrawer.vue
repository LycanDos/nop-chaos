<!--
  出参 Delta 编辑抽屉
  将执行器方法的出参字段映射回流程变量池
-->
<script setup lang="ts">
import { ref } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import type { OutputDeltaItem, MethodSchemaFieldItem } from '@/types/executor.ts'

defineOptions({ name: 'OutputDeltaDrawer' })

const emit = defineEmits<{
  (e: 'confirm', deltas: OutputDeltaItem[]): void
}>()

const visible = ref(false)
const deltas = ref<OutputDeltaItem[]>([])
const outputFields = ref<MethodSchemaFieldItem[]>([])

const mergeStrategyOptions = [
  { label: '覆盖（overwrite）', value: 'overwrite' },
  { label: '合并（merge）', value: 'merge' },
  { label: '追加（append）', value: 'append' },
]

function openDrawer(currentDeltas: OutputDeltaItem[], fields: MethodSchemaFieldItem[]) {
  outputFields.value = fields
  // 如果没有 Delta 但有字段，自动生成默认映射
  if (!currentDeltas.length && fields.length) {
    deltas.value = fields.map(f => ({
      source: f.fieldPath || f.fieldName,
      target: f.fieldPath || f.fieldName,
      expression: '',
      mergeStrategy: 'overwrite' as const,
    }))
  } else {
    deltas.value = currentDeltas.map(d => ({ ...d }))
  }
  visible.value = true
}

function addDelta() {
  deltas.value.push({
    source: '',
    target: '',
    expression: '',
    mergeStrategy: 'overwrite',
  })
}

function removeDelta(index: number) {
  deltas.value.splice(index, 1)
}

function confirm() {
  const validDeltas = deltas.value.filter(d => d.source && d.target)
  emit('confirm', validDeltas)
  visible.value = false
}

function cancel() {
  visible.value = false
}

defineExpose({ openDrawer })
</script>

<template>
  <el-drawer
    v-model="visible"
    title="出参 Delta 配置"
    direction="rtl"
    size="520px"
    :close-on-click-modal="false"
  >
    <div class="delta-drawer-content">
      <div class="delta-toolbar">
        <el-button type="primary" :icon="Plus" size="small" @click="addDelta">
          添加 Delta
        </el-button>
        <span class="delta-count">共 {{ deltas.length }} 条 Delta</span>
      </div>

      <div class="delta-list">
        <div v-for="(item, index) in deltas" :key="index" class="delta-item">
          <div class="delta-item__header">
            <span class="delta-item__index">#{{ index + 1 }}</span>
            <el-popconfirm title="确定删除此 Delta？" @confirm="removeDelta(index)">
              <template #reference>
                <el-button type="danger" :icon="Delete" link size="small" />
              </template>
            </el-popconfirm>
          </div>

          <el-form label-width="80px" size="small">
            <el-form-item label="出参字段">
              <el-select
                v-if="outputFields.length"
                v-model="item.source"
                filterable
                allow-create
                placeholder="选择或输入出参字段"
                style="width: 100%"
              >
                <el-option
                  v-for="field in outputFields"
                  :key="field.fieldId"
                  :label="`${field.fieldName} (${field.dataType})`"
                  :value="field.fieldPath || field.fieldName"
                />
              </el-select>
              <el-input v-else v-model="item.source" placeholder="出参字段路径" />
            </el-form-item>

            <el-form-item label="流程变量">
              <el-input v-model="item.target" placeholder="目标流程变量名" />
            </el-form-item>

            <el-form-item label="合并策略">
              <el-select v-model="item.mergeStrategy" style="width: 100%">
                <el-option
                  v-for="opt in mergeStrategyOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="表达式">
              <el-input
                v-model="item.expression"
                type="textarea"
                :rows="2"
                placeholder="可选：转换表达式（JUEL），留空则直接赋值"
              />
            </el-form-item>
          </el-form>
        </div>

        <el-empty v-if="!deltas.length" description="暂无 Delta，点击上方按钮添加" />
      </div>
    </div>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="confirm">确认</el-button>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.delta-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.delta-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.delta-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.delta-list {
  flex: 1;
  overflow-y: auto;
}
.delta-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  background: var(--el-fill-color-lighter);
}
.delta-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.delta-item__index {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}
</style>
