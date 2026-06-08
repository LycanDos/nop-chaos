<template>
  <div class="delta-lab delta-lab--embedded">
    <section ref="layoutRef" class="delta-lab__grid">
      <div class="delta-lab__pane" :style="paneStyle(basePaneWidth)">
        <div class="delta-lab__card">
          <div class="delta-lab__section-header">
            <div class="delta-lab__section-head-main">
              <span class="delta-lab__section-title">Sources</span>
              <span class="delta-lab__section-desc">{{ sourceTabs.length }} 个</span>
            </div>
          </div>

          <div class="delta-lab__tab-bar">
            <button
              v-for="tab in sourceTabs"
              :key="tab.id"
              type="button"
              :class="['delta-lab__tab', { 'is-active': activeSourceTab === tab.id }]"
              @click="activeSourceTab = tab.id"
            >
              <span>{{ tab.name }}</span>
              <span v-if="tab.isTarget" class="delta-lab__tab-badge delta-lab__tab-badge--target">Target</span>
            </button>
          </div>

          <div v-if="currentSourceTab" class="delta-lab__source-toolbar">
            <div class="delta-lab__field delta-lab__field--target">
              <span class="delta-lab__field-label">Target</span>
              <div class="delta-lab__field-target-value">变量池</div>
            </div>
          </div>

          <div class="delta-lab__card-body">
            <JsonEditorPane
              :title="currentSourceTab?.name ?? 'Source'"
              side="base"
              :model-value="currentSourceTab?.data ?? {}"
              :base-document="targetSourceData"
              :delta-document="activeDeltaTabData"
              @update:model-value="updateSourceData"
              @activate="handleActivate"
              @selection-change="handleSelectionChange"
            />
          </div>
        </div>
      </div>

      <div class="delta-lab__splitter" @mousedown="startResize('base', $event)"></div>

      <div class="delta-lab__pane" :style="paneStyle(workbenchPaneWidth)">
        <div class="delta-lab__card">
          <div class="delta-lab__section-header">
            <span class="delta-lab__section-title">Edit &amp; Result</span>
          </div>
          <div class="delta-lab__card-body">
            <WorkbenchPanel
              :active-pane="activePane"
              :selected-path="currentSelectionPath"
              :base-document="targetSourceData"
              :delta-document="activeDeltaTabData"
              @update-selected-value="handleSelectedValueUpdate"
            />
          </div>
        </div>
      </div>

      <div class="delta-lab__splitter" @mousedown="startResize('workbench', $event)"></div>

      <div class="delta-lab__pane" :style="paneStyle(rightPaneWidth)">
        <div class="delta-lab__card">
          <div class="delta-lab__section-header">
            <span class="delta-lab__section-title">Delta</span>
          </div>
          <div class="delta-lab__tab-bar">
            <button
              v-for="tab in deltaTabs"
              :key="tab.id"
              type="button"
              :class="['delta-lab__tab', `delta-lab__tab--${tab.kind}`, { 'is-active': activeDeltaTab === tab.id }]"
              @click="activeDeltaTab = tab.id"
            >
              <span class="delta-lab__tab-icon">Δ</span>
              <span>{{ tab.label }}</span>
            </button>
          </div>
          <div class="delta-lab__card-body">
            <JsonEditorPane
              :title="activeDeltaTabObj?.label ?? 'Delta'"
              side="delta"
              :model-value="activeDeltaTabData"
              :base-document="targetSourceData"
              :delta-document="activeDeltaTabData"
              @update:model-value="updateDeltaData"
              @activate="handleActivate"
              @selection-change="handleSelectionChange"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { cloneDeep } from 'lodash-es'
import { computed, ref, watch } from 'vue'
import type { JsonPathSegment, SourceTab, DeltaTab, DeltaEditorPane } from './delta-three-pane/model/types'
import { setValueAtPath } from './delta-three-pane/model/jsonPath'
import JsonEditorPane from './delta-three-pane/components/JsonEditorPane.vue'
import WorkbenchPanel from './delta-three-pane/components/WorkbenchPanel.vue'

defineOptions({ name: 'ExecutorOutputDeltaThreePane' , inheritAttrs: false })

const props = defineProps<{
  variablePoolData: Record<string, unknown>
  currentResultData: Record<string, unknown>
  deltaData: Record<string, unknown>
}>()

const emit = defineEmits<{
  (e: 'update:deltaData', value: Record<string, unknown>): void
}>()

const sourceTabs = ref<SourceTab[]>([
  { id: 'variable-pool', name: '当前流程变量池', isTarget: true, data: {} },
  { id: 'node-result', name: '当前节点运行结果', isTarget: false, data: {} },
])
const activeSourceTab = ref('variable-pool')
const currentSourceTab = computed(() => sourceTabs.value.find((item) => item.id === activeSourceTab.value))
const targetSourceTab = computed(() => sourceTabs.value.find((item) => item.isTarget))
const targetSourceData = computed(() => targetSourceTab.value?.data ?? {})

const deltaTabs = ref<DeltaTab[]>([
  { id: 'delta-main', kind: 'delta', label: 'Delta', data: {} },
])
const activeDeltaTab = ref('delta-main')
const activeDeltaTabObj = computed(() => deltaTabs.value.find((item) => item.id === activeDeltaTab.value))
const activeDeltaTabData = computed(() => activeDeltaTabObj.value?.data ?? {})

const activePane = ref<DeltaEditorPane>('base')
const selectedPathMap = ref<Record<DeltaEditorPane, JsonPathSegment[]>>({ base: [], delta: [] })
const currentSelectionPath = computed(() => selectedPathMap.value[activePane.value] ?? [])

const layoutRef = ref<HTMLElement | null>(null)
const basePaneWidth = ref(28)
const workbenchPaneWidth = ref(38)
const rightPaneWidth = computed(() => 100 - basePaneWidth.value - workbenchPaneWidth.value)

watch(
  () => props.variablePoolData,
  (value) => {
    const tab = sourceTabs.value.find((item) => item.id === 'variable-pool')
    if (tab) {
      tab.data = cloneDeep(value || {})
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => props.currentResultData,
  (value) => {
    const tab = sourceTabs.value.find((item) => item.id === 'node-result')
    if (tab) {
      tab.data = cloneDeep(value || {})
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => props.deltaData,
  (value) => {
    const tab = deltaTabs.value[0]
    if (tab) {
      tab.data = cloneDeep(value || {})
    }
  },
  { immediate: true, deep: true },
)

function updateSourceData(data: Record<string, unknown>) {
  const tab = sourceTabs.value.find((item) => item.id === activeSourceTab.value)
  if (tab) {
    tab.data = data
  }
}

function updateDeltaData(data: Record<string, unknown>) {
  const tab = deltaTabs.value[0]
  if (tab) {
    tab.data = data
  }
  emit('update:deltaData', cloneDeep(data))
}

function handleActivate(side: DeltaEditorPane) {
  activePane.value = side
}

function handleSelectionChange(payload: { side: DeltaEditorPane; path: JsonPathSegment[] }) {
  activePane.value = payload.side
  selectedPathMap.value = { ...selectedPathMap.value, [payload.side]: payload.path }
}

function handleSelectedValueUpdate(payload: { side: DeltaEditorPane; path: JsonPathSegment[]; value: unknown }) {
  if (payload.side === 'base') {
    const tab = sourceTabs.value.find((item) => item.id === activeSourceTab.value)
    if (tab) {
      tab.data = setValueAtPath(tab.data, payload.path, payload.value)
    }
    return
  }

  const tab = deltaTabs.value[0]
  if (tab) {
    tab.data = setValueAtPath(tab.data, payload.path, payload.value)
    emit('update:deltaData', cloneDeep(tab.data))
  }
}

function paneStyle(width: number) {
  return { flexBasis: `calc((100% - 16px) * ${width} / 100)` }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

let activeResize: 'base' | 'workbench' | null = null

function startResize(target: 'base' | 'workbench', event: MouseEvent) {
  if (!layoutRef.value || window.innerWidth <= 1100) return
  event.preventDefault()
  activeResize = target
  window.addEventListener('mousemove', handleResizeMove)
  window.addEventListener('mouseup', stopResize)
}

function handleResizeMove(event: MouseEvent) {
  if (!activeResize || !layoutRef.value) return
  const rect = layoutRef.value.getBoundingClientRect()
  const pct = ((event.clientX - rect.left) / rect.width) * 100
  if (activeResize === 'base') {
    basePaneWidth.value = clamp(pct, 20, 100 - workbenchPaneWidth.value - 20)
    return
  }
  workbenchPaneWidth.value = clamp(pct - basePaneWidth.value, 20, 100 - basePaneWidth.value - 20)
}

function stopResize() {
  activeResize = null
  window.removeEventListener('mousemove', handleResizeMove)
  window.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped lang="less">
.delta-lab {
  display: grid;
  gap: 6px;
  min-height: 100%;
}

.delta-lab--embedded {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: block;
}

.delta-lab__grid {
  height: 100%;
  min-height: 600px;
  display: flex;
  align-items: stretch;
  gap: 0;
}

.delta-lab--embedded .delta-lab__grid {
  height: 100%;
  min-height: 0;
}

.delta-lab__pane {
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.delta-lab__splitter {
  flex: 0 0 8px;
  position: relative;
  cursor: col-resize;
}

.delta-lab__splitter::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 3px;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.15), rgba(100, 116, 139, 0.5));
}

.delta-lab__card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #dbe1ea;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}

.delta-lab__card-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.delta-lab__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 8px;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
  flex-shrink: 0;
}

.delta-lab__section-head-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.delta-lab__section-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.delta-lab__section-desc {
  font-size: 11px;
  color: #64748b;
}

.delta-lab__tab-bar {
  display: flex;
  gap: 0;
  padding: 0 8px;
  border-bottom: 1px solid #eef2f7;
  background: #f8fafc;
  overflow-x: auto;
  flex-shrink: 0;
}

.delta-lab__tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1;
}

.delta-lab__tab:hover {
  color: #1e40af;
  background: rgba(37, 99, 235, 0.04);
}

.delta-lab__tab.is-active {
  color: #1d4ed8;
  border-bottom-color: #2563eb;
  background: rgba(37, 99, 235, 0.06);
}

.delta-lab__tab-icon {
  font-size: 13px;
  line-height: 1;
}

.delta-lab__tab-badge {
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
}

.delta-lab__tab-badge--target {
  background: #e8f1ff;
  color: #1d4ed8;
}

.delta-lab__source-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-bottom: 1px solid #eef2f7;
  background: #fff;
  flex-shrink: 0;
  height: 25px;
  box-sizing: border-box;
}

.delta-lab__field {
  display: flex;
  align-items: stretch;
  height: 25px;
  border: 1px solid #d8e3ef;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.delta-lab__field--target {
  overflow: visible;
  position: relative;
}

.delta-lab__field-label {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 0 6px;
  background: #e8f1ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.delta-lab__field-target-value {
  display: flex;
  align-items: center;
  flex: 1;
  padding: 0 8px;
  font-size: 12px;
  color: #0f172a;
}

@media (max-width: 1100px) {
  .delta-lab__grid {
    flex-direction: column;
    height: auto;
    min-height: auto;
    gap: 6px;
  }

  .delta-lab__pane {
    flex-basis: auto !important;
    height: 50vh;
    min-height: 300px;
  }

  .delta-lab__splitter {
    display: none;
  }
}
</style>
