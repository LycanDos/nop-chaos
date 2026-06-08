<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { Element } from 'bpmn-js/lib/model/Types'
import type { MethodSchemaFieldItem, OutputDeltaItem } from '@/types/executor.ts'
import ExecutorOutputDeltaThreePane from './ExecutorOutputDeltaThreePane.vue'
import {
  buildMethodResultPreview,
  buildVariablePoolPreview,
} from './outputDeltaPreview.ts'

defineOptions({ name: 'OutputDeltaDrawer' , inheritAttrs: false })

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
const drawerWidth = ref('calc(100vw - 210px)')
const drawerBodyStyle: CSSProperties = {
  padding: '0',
  height: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '0',
}
const drawerStyle: CSSProperties = {
  height: '100%',
}
const drawerHeaderStyle: CSSProperties = {
  padding: '0',
  minHeight: '0',
  borderBottom: '0',
}
const drawerFooterStyle: CSSProperties = {
  padding: '8px 12px',
  borderTop: '1px solid var(--ant-border-color-split, #f0f0f0)',
  flexShrink: 0,
}
const drawerContentWrapperStyle = computed<CSSProperties>(() => ({
  width: drawerWidth.value,
  maxWidth: '100vw',
}))
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
  updateDrawerLayout()
  visible.value = true
  loading.value = true
  await nextTick()
  scheduleDrawerLayoutUpdate()

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

function resolveMainContentLeft() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0
  }

  if (window.innerWidth < 900) {
    return 0
  }

  const mainContent = document.querySelector<HTMLElement>('.jeecg-default-layout-main')
  if (mainContent) {
    const rect = mainContent.getBoundingClientRect()
    if (rect.width > 320 && rect.left > 0 && rect.left < window.innerWidth - 320) {
      return Math.round(rect.left)
    }
  }

  const siderRight = Array.from(
    document.querySelectorAll<HTMLElement>('.jeecg-layout-mix-sider, .ant-layout-sider'),
  ).reduce((maxRight, item) => {
    const rect = item.getBoundingClientRect()
    const isVisible = rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth
    return isVisible ? Math.max(maxRight, rect.right) : maxRight
  }, 0)

  if (siderRight > 0 && siderRight < window.innerWidth - 320) {
    return Math.round(siderRight)
  }

  return window.innerWidth > 1110 ? 210 : 0
}

function updateDrawerLayout() {
  if (typeof window === 'undefined') return
  const left = resolveMainContentLeft()
  const width = Math.max(320, Math.round(window.innerWidth - left))
  drawerWidth.value = `${Math.min(width, window.innerWidth)}px`
}

let layoutFrame = 0
let layoutListenerBound = false

function scheduleDrawerLayoutUpdate() {
  if (typeof window === 'undefined') return
  if (layoutFrame) {
    window.cancelAnimationFrame(layoutFrame)
  }
  layoutFrame = window.requestAnimationFrame(() => {
    layoutFrame = 0
    updateDrawerLayout()
  })
}

function bindDrawerLayoutListeners() {
  if (layoutListenerBound || typeof window === 'undefined') return
  window.addEventListener('resize', scheduleDrawerLayoutUpdate)
  layoutListenerBound = true
}

function unbindDrawerLayoutListeners() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleDrawerLayoutUpdate)
    if (layoutFrame) {
      window.cancelAnimationFrame(layoutFrame)
      layoutFrame = 0
    }
  }
  layoutListenerBound = false
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

watch(visible, async (isVisible) => {
  if (isVisible) {
    updateDrawerLayout()
    bindDrawerLayoutListeners()
    await nextTick()
    scheduleDrawerLayoutUpdate()
    return
  }
  unbindDrawerLayoutListeners()
})

onBeforeUnmount(unbindDrawerLayoutListeners)

defineExpose({ openDrawer })
</script>

<template>
  <a-drawer
    v-model:visible="visible"
    class="output-delta-drawer"
    placement="right"
    :width="drawerWidth"
    :show-close="false"
    :closable="false"
    :drawer-style="drawerStyle"
    :body-style="drawerBodyStyle"
    :header-style="drawerHeaderStyle"
    :footer-style="drawerFooterStyle"
    :content-wrapper-style="drawerContentWrapperStyle"
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
      <a-button @click="cancel">取消</a-button>
      <a-button type="primary" @click="confirm">确认</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="less">
.delta-output-body {
  flex: 1 1 auto;
  width: 100%;
  height: auto;
  min-height: 0;
  padding: 8px;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
}

.delta-output-body :deep(.delta-lab) {
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.delta-output-state {
  flex: 1 1 auto;
  min-height: 0;
  padding: 24px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.delta-output-state--error {
  color: var(--el-color-danger);
}

.delta-output-warnings {
  flex: 0 0 auto;
  margin: 8px 8px 0;
  padding: 8px 10px;
  border: 1px solid #fcd34d;
  border-radius: 4px;
  background: #fffbeb;
  color: #92400e;
  font-size: 12px;
}
</style>

<style lang="less">
.output-delta-drawer {
  .ant-drawer-content-wrapper {
    max-width: 100vw;
  }

  .ant-drawer-content {
    height: 100%;
  }

  .ant-drawer-wrapper-body {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .ant-drawer-body {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .ant-drawer-footer {
    flex: 0 0 auto;
  }
}
</style>
