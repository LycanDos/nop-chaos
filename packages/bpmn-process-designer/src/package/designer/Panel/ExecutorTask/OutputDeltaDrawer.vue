<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Element } from 'bpmn-js/lib/model/Types'
import type { MethodSchemaFieldItem, OutputDeltaItem } from '@/types/executor.ts'
import ExecutorOutputDeltaThreePane from './ExecutorOutputDeltaThreePane.vue'
import {
  buildMethodResultPreview,
  buildVariablePoolPreview,
} from './outputDeltaPreview.ts'

defineOptions({ name: 'OutputDeltaDrawer' })

interface OpenDrawerOptions {
  currentDeltas: OutputDeltaItem[]
  fields: MethodSchemaFieldItem[]
  currentElement: Element
  rootElement: Element
  fetchMethodSchema: (methodId: string) => Promise<MethodSchemaFieldItem[]>
  fetchDesignVariablePool?: (nodeId: string) => Promise<Record<string, any>>
  fetchDesignNodeResult?: (nodeId: string, methodId: string) => Promise<Record<string, any>>
}

const emit = defineEmits<{
  (e: 'confirm', deltas: OutputDeltaItem[]): void
}>()

const visible = ref(false)
const loading = ref(false)
const loadError = ref('')
const variablePoolData = ref<Record<string, unknown>>({})
const currentResultData = ref<Record<string, unknown>>({})
const deltaDocument = ref<Record<string, unknown>>({})
const outputFields = ref<MethodSchemaFieldItem[]>([])
const warnings = ref<string[]>([])

const prettyWarnings = computed(() => warnings.value.join('；'))

async function openDrawer(options: OpenDrawerOptions) {
  outputFields.value = options.fields
  loadError.value = ''
  warnings.value = []
  visible.value = true
  loading.value = true

  try {
    const [variablePoolRes, nodeResultRes] = await Promise.all([
      loadVariablePoolPreview(options),
      loadCurrentNodeResultPreview(options),
    ])

    variablePoolData.value = variablePoolRes.variablePool
    currentResultData.value = nodeResultRes
    warnings.value = variablePoolRes.warnings
    deltaDocument.value = outputDeltasToDeltaJson(options.currentDeltas)
  } catch (err: any) {
    console.error('[OutputDeltaDrawer] 加载失败:', err)
    loadError.value = err?.message || '加载 Delta 三栏编辑器数据失败'
    variablePoolData.value = {}
    currentResultData.value = {}
    deltaDocument.value = outputDeltasToDeltaJson(options.currentDeltas)
  } finally {
    loading.value = false
  }
}

function handleUpdateDeltaData(value: Record<string, unknown>) {
  deltaDocument.value = value
}

function confirm() {
  emit('confirm', deltaJsonToOutputDeltas(deltaDocument.value))
  visible.value = false
}

function cancel() {
  visible.value = false
}

async function loadVariablePoolPreview(options: OpenDrawerOptions) {
  if (options.fetchDesignVariablePool) {
    try {
      return {
        variablePool: await options.fetchDesignVariablePool(options.currentElement.id),
        warnings: [],
      }
    } catch (err) {
      console.warn('[OutputDeltaDrawer] fetchDesignVariablePool 失败，回退本地推导', err)
    }
  }

  return buildVariablePoolPreview({
    currentElement: options.currentElement,
    rootElement: options.rootElement,
    fetchMethodSchema: options.fetchMethodSchema,
  })
}

async function loadCurrentNodeResultPreview(options: OpenDrawerOptions) {
  if (options.fetchDesignNodeResult) {
    try {
      const result = await options.fetchDesignNodeResult(
        options.currentElement.id,
        options.fields[0]?.methodId || '',
      )
      if (result && typeof result === 'object') {
        return result
      }
    } catch (err) {
      console.warn('[OutputDeltaDrawer] fetchDesignNodeResult 失败，回退 Schema 占位结构', err)
    }
  }

  return buildMethodResultPreview(options.fields, options.currentElement)
}

function outputDeltasToDeltaJson(deltas: OutputDeltaItem[]) {
  const result: Record<string, unknown> = {}
  deltas.forEach((item) => {
    if (!item?.target || !item?.source) return
    result[item.target] = {
      source: item.source,
      target: 'variablePool',
      mode: item.mergeStrategy || 'overwrite',
      expression: item.expression || '',
    }
  })
  return result
}

function deltaJsonToOutputDeltas(value: Record<string, unknown>) {
  const result: OutputDeltaItem[] = []
  Object.entries(value || {}).forEach(([target, config]) => {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return
    const item = config as Record<string, unknown>
    const source = typeof item.source === 'string' ? item.source : ''
    if (!source || !target) return
    result.push({
      source,
      target,
      expression: typeof item.expression === 'string' ? item.expression : '',
      mergeStrategy:
        item.mode === 'merge' || item.mode === 'append'
          ? item.mode
          : 'overwrite',
    })
  })
  return result
}

defineExpose({ openDrawer })
</script>

<template>
  <el-drawer
    v-model="visible"
    title="出参 Delta 配置"
    direction="rtl"
    size="96%"
    :close-on-click-modal="false"
  >
    <div v-if="warnings.length" class="delta-output-warnings">
      {{ prettyWarnings }}
    </div>

    <div v-if="loading" class="delta-output-state">正在加载 delta-three-pane-editor ...</div>
    <div v-else-if="loadError" class="delta-output-state delta-output-state--error">{{ loadError }}</div>
    <div v-else class="delta-output-body">
      <ExecutorOutputDeltaThreePane
        :variable-pool-data="variablePoolData"
        :current-result-data="currentResultData"
        :delta-data="deltaDocument"
        @update:delta-data="handleUpdateDeltaData"
      />
    </div>

    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="confirm">确认</el-button>
    </template>
  </el-drawer>
</template>

<style scoped lang="less">
.delta-output-body {
  height: calc(100vh - 140px);
  min-height: 680px;
}

.delta-output-state {
  padding: 24px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.delta-output-state--error {
  color: var(--el-color-danger);
}

.delta-output-warnings {
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  background: #fffbeb;
  color: #92400e;
  font-size: 12px;
}
</style>
