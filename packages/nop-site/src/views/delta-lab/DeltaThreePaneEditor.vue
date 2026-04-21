<template>
  <div class="delta-lab">
    <!-- Header -->
    <section class="delta-lab__header-card">
      <div class="delta-lab__header-row">
        <div>
          <div class="delta-lab__title">Delta Lab</div>
          <div class="delta-lab__subtitle">多 Source · Delta · Reverse · Pipeline</div>
        </div>
        <div class="delta-lab__header-actions">
          <button type="button" :class="sampleBtnClass('single')" @click="loadSingleSourceSample">单 Source</button>
          <button type="button" :class="sampleBtnClass('multi')" @click="loadMultiSourceSample">多 Source</button>
          <button type="button" :class="sampleBtnClass('pipeline')" @click="loadPipelineSample">Pipeline</button>
          <button type="button" :class="sampleBtnClass('multi-pipeline')" @click="loadMultiSourcePipelineSample">多 Source Pipeline</button>
          <button type="button" class="delta-lab__btn delta-lab__btn--secondary" @click="resetAll">重置</button>
        </div>
      </div>
    </section>

    <!-- Three-pane grid -->
    <section ref="layoutRef" class="delta-lab__grid">
      <!-- Left: Sources -->
      <div class="delta-lab__pane" :style="paneStyle(basePaneWidth)">
        <div class="delta-lab__card">
          <div class="delta-lab__section-header">
            <div class="delta-lab__section-head-main">
              <span class="delta-lab__section-title">Sources</span>
              <span class="delta-lab__section-desc">{{ sourceTabs.length }} 个</span>
            </div>
            <button type="button" class="delta-lab__btn delta-lab__btn--small" @click="addSource">+ 添加</button>
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
              <div class="delta-lab__searchable-select" :class="{ 'is-open': targetDropdownOpen }">
                <input
                  ref="targetSearchRef"
                  class="delta-lab__searchable-input"
                  :value="targetDropdownOpen ? targetSearchText : (targetSourceTab?.name ?? '')"
                  placeholder="搜索 source..."
                  @focus="openTargetDropdown"
                  @input="targetSearchText = ($event.target as HTMLInputElement).value"
                  @keydown.escape="closeTargetDropdown"
                  @keydown.enter.prevent="selectFirstMatch"
                  @blur="handleTargetBlur"
                />
                <span class="delta-lab__searchable-arrow" @mousedown.prevent="toggleTargetDropdown">▾</span>
                <div v-if="targetDropdownOpen" class="delta-lab__searchable-dropdown">
                  <div
                    v-for="tab in filteredSourceTabs"
                    :key="tab.id"
                    :class="['delta-lab__searchable-option', { 'is-selected': tab.isTarget }]"
                    @mousedown.prevent="selectTarget(tab.id)"
                  >
                    <span v-html="highlightText(tab.name, targetSearchText)"></span>
                    <span v-if="tab.isTarget" class="delta-lab__searchable-check">✓</span>
                  </div>
                  <div v-if="filteredSourceTabs.length === 0" class="delta-lab__searchable-empty">无匹配项</div>
                </div>
              </div>
            </div>
            <button
              v-if="sourceTabs.length > 1"
              type="button"
              class="delta-lab__btn delta-lab__btn--danger delta-lab__btn--small"
              @click="removeSource(activeSourceTab)"
            >移除</button>
          </div>
          <div class="delta-lab__card-body">
            <JsonEditorPane
              :title="currentSourceTab?.name ?? 'Source'"
              side="base"
              :model-value="currentSourceTab?.data ?? {}"
              :base-document="targetSourceData"
              :delta-document="activeDeltaTabData"
              @update:model-value="updateSourceData($event)"
              @activate="handleActivate"
              @selection-change="handleSelectionChange"
            />
          </div>
        </div>
      </div>

      <div class="delta-lab__splitter" @mousedown="startResize('base', $event)"></div>

      <!-- Middle: Workbench / Preview -->
      <div class="delta-lab__pane" :style="paneStyle(workbenchPaneWidth)">
        <div class="delta-lab__card">
          <div class="delta-lab__section-header">
            <span class="delta-lab__section-title">Edit &amp; Result</span>
          </div>
          <!-- Middle tab bar: Workbench vs Preview vs Backend -->
          <div class="delta-lab__tab-bar">
            <button
              type="button"
              :class="['delta-lab__tab', { 'is-active': middleMode === 'workbench' }]"
              @click="middleMode = 'workbench'"
            >节点编辑</button>
            <button
              type="button"
              :class="['delta-lab__tab', { 'is-active': middleMode === 'preview' }]"
              @click="middleMode = 'preview'; recomputePreview()"
            >预览结果</button>
            <button
              type="button"
              :class="['delta-lab__tab', 'delta-lab__tab--backend', { 'is-active': middleMode === 'backend' }]"
              @click="executeBackend()"
            >执行结果</button>
          </div>

          <!-- Workbench mode -->
          <div v-show="middleMode === 'workbench'" class="delta-lab__card-body">
            <WorkbenchPanel
              :active-pane="activePane"
              :selected-path="currentSelectionPath"
              :base-document="targetSourceData"
              :delta-document="activeDeltaTabData"
              @update-selected-value="handleSelectedValueUpdate"
            />
          </div>

          <!-- Preview mode -->
          <template v-if="middleMode === 'preview'">
            <div v-if="previewResult && previewResult.warnings.length > 0" class="delta-lab__warnings">
              <div v-for="(w, i) in previewResult.warnings" :key="i" class="delta-lab__warning-item">{{ w.message }}</div>
            </div>
            <div v-if="previewResult && previewResult.steps.length > 0" class="delta-lab__steps-bar">
              <span
                v-for="step in previewResult.steps"
                :key="step.index"
                :class="['delta-lab__step-tag', `delta-lab__step-tag--${step.status}`]"
                :title="step.summary"
              >Step {{ step.index + 1 }}: {{ step.status }}</span>
            </div>
            <div v-if="previewResult" class="delta-lab__preview-meta">
              <span>{{ previewResult.mode === 'pipeline' ? 'Pipeline' : 'Delta' }}</span>
              <span>{{ previewResult.warnings.length }} 警告</span>
              <span>{{ previewResult.unresolvedExpressions }} 表达式</span>
            </div>
            <div class="delta-lab__card-body">
              <div ref="previewEditorRef" class="delta-lab__preview-editor"></div>
            </div>
          </template>

          <!-- Backend execution result mode -->
          <template v-if="middleMode === 'backend'">
            <div v-if="backendLoading" class="delta-lab__backend-status">
              <span class="delta-lab__backend-spinner">⟳</span> 正在请求后端执行...
            </div>
            <div v-if="backendError" class="delta-lab__backend-error">{{ backendError }}</div>
            <div v-if="backendResult && backendResult.warnings.length > 0" class="delta-lab__warnings">
              <div v-for="(w, i) in backendResult.warnings" :key="i" class="delta-lab__warning-item">{{ w.message }}</div>
            </div>
            <div v-if="backendResult && backendResult.steps.length > 0" class="delta-lab__steps-bar">
              <span
                v-for="step in backendResult.steps"
                :key="step.index"
                :class="['delta-lab__step-tag', `delta-lab__step-tag--${step.status}`]"
                :title="step.summary"
              >Step {{ step.index + 1 }}: {{ step.status }}</span>
            </div>
            <div v-if="backendResult" class="delta-lab__preview-meta">
              <span class="delta-lab__backend-badge">后端</span>
              <span>{{ backendResult.mode === 'pipeline' ? 'Pipeline' : 'Delta' }}</span>
              <span>{{ backendResult.warnings.length }} 警告</span>
              <button type="button" class="delta-lab__btn delta-lab__btn--small" @click="executeBackend()">重新执行</button>
            </div>
            <div class="delta-lab__card-body">
              <div ref="backendEditorRef" class="delta-lab__preview-editor"></div>
            </div>
          </template>

          <!-- Node preview panel (shared by preview & backend modes) -->
          <template v-if="middleMode === 'preview' || middleMode === 'backend'">
            <div class="delta-lab__inspector-toggle" @click="showNodeInspector = !showNodeInspector">
              <span>{{ showNodeInspector ? '▾' : '▸' }} 节点预览</span>
              <span class="delta-lab__inspector-path">{{ inspectorPathText }}</span>
            </div>
            <div v-if="showNodeInspector" class="delta-lab__inspector-body" :style="{ height: inspectorHeight + 'px' }">
              <div class="delta-lab__inspector-resize" @mousedown.prevent="startInspectorResize"></div>
              <WorkbenchPanel
                :active-pane="activePane"
                :selected-path="resultSelectionPath"
                :base-document="currentResultData"
                :delta-document="currentResultData"
                read-only
              />
            </div>
          </template>
        </div>
      </div>

      <div class="delta-lab__splitter" @mousedown="startResize('workbench', $event)"></div>

      <!-- Right: Delta -->
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
              @click="switchDeltaTab(tab.id)"
            >
              <span class="delta-lab__tab-icon">{{ deltaTabIcon(tab.kind) }}</span>
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
              @update:model-value="updateDeltaData($event)"
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
import { cloneDeep } from 'lodash-es';
import { createJSONEditor, getFocusPath, Mode, SelectionType } from 'vanilla-jsoneditor';
import type { JSONEditorSelection, JSONSelection } from 'vanilla-jsoneditor';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import JsonEditorPane from './components/JsonEditorPane.vue';
import WorkbenchPanel from './components/WorkbenchPanel.vue';
import { simulateDeltaPreview } from './model/deltaPreview';
import { backendApplyDelta } from './model/previewProvider';
import { setValueAtPath } from './model/jsonPath';
import {
  createMainSourceSample,
  createUserSourceSample,
  createTenantSourceSample,
  createDeltaSample,
  createMultiSourceDeltaSample,
  createPipelineSample,
  createMultiSourcePipelineSample,
} from './model/sampleDocuments';
import type { DeltaEditorPane, DeltaPreviewResult, DeltaTab, DeltaTabKind, JsonPathSegment, SourceTab } from './model/types';

// ─── Active sample tracking ─────────────────────────────────────────────────
const activeSample = ref<string>('single');
function sampleBtnClass(kind: string) {
  return ['delta-lab__btn', activeSample.value === kind ? 'delta-lab__btn--primary-active' : 'delta-lab__btn--primary'];
}

// ─── Middle pane mode ────────────────────────────────────────────────────────
const middleMode = ref<'workbench' | 'preview' | 'backend'>('workbench');

// ─── Source Tabs ─────────────────────────────────────────────────────────────
const sourceTabs = ref<SourceTab[]>([
  { id: 'main', name: 'main', isTarget: true, data: createMainSourceSample().data },
]);
const activeSourceTab = ref('main');
const currentSourceTab = computed(() => sourceTabs.value.find((t) => t.id === activeSourceTab.value));
const targetSourceTab = computed(() => sourceTabs.value.find((t) => t.isTarget));
const targetSourceData = computed(() => targetSourceTab.value?.data ?? {});

function setTargetSource(tabId: string) {
  sourceTabs.value = sourceTabs.value.map((t) => ({ ...t, isTarget: t.id === tabId }));
}

// ─── Target searchable dropdown ──────────────────────────────────────────────
const targetDropdownOpen = ref(false);
const targetSearchText = ref('');
const targetSearchRef = ref<HTMLInputElement | null>(null);

const filteredSourceTabs = computed(() => {
  const kw = targetSearchText.value.trim().toLowerCase();
  if (!kw) return sourceTabs.value;
  return sourceTabs.value.filter((t) => t.name.toLowerCase().includes(kw));
});

function highlightText(text: string, keyword: string): string {
  const kw = keyword.trim();
  if (!kw) return escapeHtml(text);
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) + '<mark>' + escapeHtml(text.slice(idx, idx + kw.length)) + '</mark>' + escapeHtml(text.slice(idx + kw.length));
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openTargetDropdown() {
  targetDropdownOpen.value = true;
  targetSearchText.value = '';
}

function closeTargetDropdown() {
  targetDropdownOpen.value = false;
  targetSearchText.value = '';
}

function toggleTargetDropdown() {
  if (targetDropdownOpen.value) { closeTargetDropdown(); } else { openTargetDropdown(); targetSearchRef.value?.focus(); }
}

function selectTarget(tabId: string) {
  setTargetSource(tabId);
  closeTargetDropdown();
}

function selectFirstMatch() {
  if (filteredSourceTabs.value.length > 0) {
    selectTarget(filteredSourceTabs.value[0].id);
  }
}

function handleTargetBlur() {
  // Delay to allow mousedown on option to fire first
  setTimeout(() => { targetDropdownOpen.value = false; targetSearchText.value = ''; }, 150);
}
function addSource() {
  const id = `source-${Date.now()}`;
  sourceTabs.value.push({ id, name: `source-${sourceTabs.value.length + 1}`, isTarget: false, data: {} });
  activeSourceTab.value = id;
}
function removeSource(tabId: string) {
  const tab = sourceTabs.value.find((t) => t.id === tabId);
  if (!tab || sourceTabs.value.length <= 1) return;
  const wasTarget = tab.isTarget;
  sourceTabs.value = sourceTabs.value.filter((t) => t.id !== tabId);
  if (wasTarget) sourceTabs.value[0].isTarget = true;
  if (activeSourceTab.value === tabId) activeSourceTab.value = sourceTabs.value[0]?.id ?? '';
}
function updateSourceData(data: Record<string, unknown>) {
  const tab = sourceTabs.value.find((t) => t.id === activeSourceTab.value);
  if (tab) tab.data = data;
}

// ─── Delta Tabs ──────────────────────────────────────────────────────────────
const deltaTabs = ref<DeltaTab[]>([
  { id: 'delta-main', kind: 'delta', label: 'Delta', data: createDeltaSample() },
  { id: 'delta-reverse', kind: 'reverse', label: 'Reverse', data: {} },
]);
const activeDeltaTab = ref('delta-main');
const activeDeltaTabObj = computed(() => deltaTabs.value.find((t) => t.id === activeDeltaTab.value));
const activeDeltaTabData = computed(() => activeDeltaTabObj.value?.data ?? {});

function deltaTabIcon(kind: DeltaTabKind): string {
  switch (kind) { case 'delta': return 'Δ'; case 'reverse': return '⟲'; case 'pipeline-step': return '▸'; }
}
function switchDeltaTab(tabId: string) {
  activeDeltaTab.value = tabId;
  middleMode.value = 'preview';
  nextTick(() => recomputePreview());
}
function updateDeltaData(data: Record<string, unknown>) {
  const tab = deltaTabs.value.find((t) => t.id === activeDeltaTab.value);
  if (tab) tab.data = data;
}
function rebuildDeltaTabs(deltaData: Record<string, unknown>) {
  const newTabs: DeltaTab[] = [];
  const isPipeline = Array.isArray(deltaData.$pipeline);
  if (isPipeline) {
    const steps = deltaData.$pipeline as Array<Record<string, unknown>>;
    newTabs.push({ id: 'delta-main', kind: 'delta', label: 'Pipeline', data: deltaData });
    steps.forEach((step, index) => {
      newTabs.push({ id: `pipeline-step-${index}`, kind: 'pipeline-step', label: (step.$comment as string) || `Step ${index + 1}`, data: (step.$delta as Record<string, unknown>) ?? step });
    });
    newTabs.push({ id: 'delta-reverse', kind: 'reverse', label: 'Reverse', data: generateReversePlaceholder(deltaData) });
  } else {
    newTabs.push({ id: 'delta-main', kind: 'delta', label: 'Delta', data: deltaData });
    newTabs.push({ id: 'delta-reverse', kind: 'reverse', label: 'Reverse', data: generateReversePlaceholder(deltaData) });
  }
  deltaTabs.value = newTabs;
  if (!newTabs.find((t) => t.id === activeDeltaTab.value)) activeDeltaTab.value = newTabs[0]?.id ?? '';
}
function generateReversePlaceholder(d: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(d.$pipeline)) {
    return { $pipeline: [...(d.$pipeline as Array<Record<string, unknown>>)].reverse().map((s) => ({ $delta: genRev((s.$delta as Record<string, unknown>) ?? {}), $comment: `Reverse: ${s.$comment ?? ''}` })) };
  }
  return genRev(d);
}
function genRev(d: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    if (k.startsWith('$')) continue;
    if (k.endsWith('-')) { r[k.slice(0, -1)] = '/* 需要后端 reverse */'; }
    else if (k.includes('+[')) {
      const bp = k.split('+')[0];
      const nm = v && typeof v === 'object' && !Array.isArray(v) ? ((v as Record<string, unknown>).name ?? (v as Record<string, unknown>).id) : null;
      r[nm ? `${bp}[name='${nm}']-` : `${bp}/* selector */-`] = true;
    } else if (k.includes('.+')) { r[k] = '/* 需要后端 reverse */'; }
    else { r[`${k}-`] = true; }
  }
  return r;
}

watch(() => deltaTabs.value.find((t) => t.id === 'delta-main')?.data, (data) => {
  if (!data) return;
  if (Array.isArray(data.$pipeline) !== deltaTabs.value.some((t) => t.kind === 'pipeline-step')) rebuildDeltaTabs(data);
  const rt = deltaTabs.value.find((t) => t.kind === 'reverse');
  if (rt) rt.data = generateReversePlaceholder(data);
}, { deep: true });

// ─── Preview ─────────────────────────────────────────────────────────────────
const previewResult = ref<DeltaPreviewResult | null>(null);
const previewEditorRef = ref<HTMLElement | null>(null);
let previewEditorInstance: ReturnType<typeof createJSONEditor> | null = null;

function recomputePreview() {
  const base = cloneDeep(targetSourceData.value);
  const tab = activeDeltaTabObj.value;
  if (!tab) { previewResult.value = null; updatePreviewEditor({}); return; }
  if (tab.kind === 'pipeline-step') {
    const mainData = deltaTabs.value.find((t) => t.id === 'delta-main')?.data;
    if (mainData && Array.isArray(mainData.$pipeline)) {
      const idx = parseInt(tab.id.replace('pipeline-step-', ''), 10);
      const res = simulateDeltaPreview(base, { $pipeline: (mainData.$pipeline as unknown[]).slice(0, idx + 1) });
      previewResult.value = res; updatePreviewEditor(res.result); return;
    }
  }
  if (tab.kind === 'reverse') {
    const mainTab = deltaTabs.value.find((t) => t.id === 'delta-main');
    if (mainTab) {
      const fwd = simulateDeltaPreview(base, mainTab.data);
      const rev = simulateDeltaPreview(fwd.result, tab.data);
      previewResult.value = rev; updatePreviewEditor(rev.result); return;
    }
  }
  const res = simulateDeltaPreview(base, tab.data);
  previewResult.value = res; updatePreviewEditor(res.result);
}
function updatePreviewEditor(data: Record<string, unknown>) {
  if (previewEditorInstance) previewEditorInstance.updateProps({ content: { json: cloneDeep(data) } });
}
function mountPreviewEditor() {
  if (!previewEditorRef.value || previewEditorInstance) return;
  previewEditorInstance = createJSONEditor({
    target: previewEditorRef.value,
    props: { content: { json: {} }, mode: Mode.tree, readOnly: true, navigationBar: true, statusBar: true, mainMenuBar: true, onSelect: handleResultSelect },
  });
}
function destroyPreviewEditor() {
  if (!previewEditorInstance) return;
  void previewEditorInstance.destroy();
  previewEditorInstance = null;
}

watch([targetSourceData, activeDeltaTabData], () => { if (middleMode.value === 'preview') recomputePreview(); }, { deep: true });
watch(previewEditorRef, async (el) => { if (el) { await nextTick(); mountPreviewEditor(); recomputePreview(); } });
watch(middleMode, async (mode, oldMode) => {
  if (oldMode === 'preview') destroyPreviewEditor();
  if (oldMode === 'backend') destroyBackendEditor();
  if (mode === 'preview') { await nextTick(); mountPreviewEditor(); recomputePreview(); }
});

// ─── Backend execution ───────────────────────────────────────────────────────
const backendResult = ref<DeltaPreviewResult | null>(null);
const backendLoading = ref(false);
const backendError = ref('');
const backendEditorRef = ref<HTMLElement | null>(null);
let backendEditorInstance: ReturnType<typeof createJSONEditor> | null = null;

function buildSourcesMap(): Record<string, Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {};
  for (const tab of sourceTabs.value) {
    map[tab.name] = cloneDeep(tab.data);
  }
  return map;
}

async function executeBackend() {
  middleMode.value = 'backend';
  backendLoading.value = true;
  backendError.value = '';
  backendResult.value = null;

  try {
    const mainDelta = deltaTabs.value.find((t) => t.id === 'delta-main')?.data ?? {};
    const tab = activeDeltaTabObj.value;
    let deltaToSend = cloneDeep(mainDelta);

    // For pipeline-step, send partial pipeline
    if (tab?.kind === 'pipeline-step' && Array.isArray(mainDelta.$pipeline)) {
      const idx = parseInt(tab.id.replace('pipeline-step-', ''), 10);
      deltaToSend = { $pipeline: (mainDelta.$pipeline as unknown[]).slice(0, idx + 1) };
    }

    const result = await backendApplyDelta({
      sources: buildSourcesMap(),
      target: targetSourceTab.value?.name ?? 'main',
      delta: deltaToSend,
    });

    backendResult.value = result;
    // Wait for DOM to render the backendEditorRef container, then mount and update
    await nextTick();
    mountBackendEditor();
    updateBackendEditor(result.result);
  } catch (error) {
    backendError.value = error instanceof Error ? error.message : String(error);
    backendResult.value = null;
  } finally {
    backendLoading.value = false;
  }
}

function updateBackendEditor(data: Record<string, unknown>) {
  if (backendEditorInstance) backendEditorInstance.updateProps({ content: { json: cloneDeep(data) } });
}

function mountBackendEditor() {
  if (!backendEditorRef.value || backendEditorInstance) return;
  backendEditorInstance = createJSONEditor({
    target: backendEditorRef.value,
    props: { content: { json: {} }, mode: Mode.tree, readOnly: true, navigationBar: true, statusBar: true, mainMenuBar: true, onSelect: handleResultSelect },
  });
}

function destroyBackendEditor() {
  if (!backendEditorInstance) return;
  void backendEditorInstance.destroy();
  backendEditorInstance = null;
}

watch(backendEditorRef, async (el) => { if (el) { await nextTick(); mountBackendEditor(); } });

// ─── Pane / Selection / Resize ───────────────────────────────────────────────
const activePane = ref<DeltaEditorPane>('base');
const layoutRef = ref<HTMLElement | null>(null);
const selectedPathMap = ref<Record<DeltaEditorPane, JsonPathSegment[]>>({ base: [], delta: [] });
const basePaneWidth = ref(28);
const workbenchPaneWidth = ref(38);
const currentSelectionPath = computed(() => selectedPathMap.value[activePane.value] ?? []);
const rightPaneWidth = computed(() => 100 - basePaneWidth.value - workbenchPaneWidth.value);

// ─── Node inspector ──────────────────────────────────────────────────────────
const showNodeInspector = ref(true);
const inspectorHeight = ref(200);
const resultSelectionPath = ref<JsonPathSegment[]>([]);

function extractResultPath(selection: JSONEditorSelection | undefined): JsonPathSegment[] {
  if (!selection || selection.type === SelectionType.text) return [];
  if ('path' in selection) return [...selection.path] as JsonPathSegment[];
  if ('focusPath' in selection) return [...selection.focusPath] as JsonPathSegment[];
  return [...getFocusPath(selection as JSONSelection)] as JsonPathSegment[];
}

function handleResultSelect(selection: JSONEditorSelection | undefined) {
  resultSelectionPath.value = extractResultPath(selection);
}

const inspectorPathText = computed(() => {
  const path = resultSelectionPath.value;
  if (!path.length) return '(点击上方结果树选择节点)';
  return path.map(s => typeof s === 'number' ? `[${s}]` : s).join('.');
});

const currentResultData = computed<Record<string, unknown>>(() => {
  if (middleMode.value === 'backend') return (backendResult.value?.result as Record<string, unknown>) ?? {};
  return (previewResult.value?.result as Record<string, unknown>) ?? {};
});

let inspectorResizing = false;
function startInspectorResize(event: MouseEvent) {
  inspectorResizing = true;
  const startY = event.clientY;
  const startH = inspectorHeight.value;
  function onMove(e: MouseEvent) {
    inspectorHeight.value = clamp(startH - (e.clientY - startY), 100, 500);
  }
  function onUp() {
    inspectorResizing = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}

function paneStyle(w: number) { return { flexBasis: `calc((100% - 16px) * ${w} / 100)` }; }
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

let activeResize: 'base' | 'workbench' | null = null;
function startResize(target: 'base' | 'workbench', event: MouseEvent) {
  if (!layoutRef.value || window.innerWidth <= 1500) return;
  event.preventDefault(); activeResize = target;
  window.addEventListener('mousemove', handleResizeMove);
  window.addEventListener('mouseup', stopResize);
}
function handleResizeMove(event: MouseEvent) {
  if (!activeResize || !layoutRef.value) return;
  const rect = layoutRef.value.getBoundingClientRect();
  const pct = ((event.clientX - rect.left) / rect.width) * 100;
  if (activeResize === 'base') { basePaneWidth.value = clamp(pct, 20, 100 - workbenchPaneWidth.value - 20); return; }
  workbenchPaneWidth.value = clamp(pct - basePaneWidth.value, 20, 100 - basePaneWidth.value - 20);
}
function stopResize() { activeResize = null; window.removeEventListener('mousemove', handleResizeMove); window.removeEventListener('mouseup', stopResize); }

function handleActivate(side: DeltaEditorPane) {
  activePane.value = side;
  if (middleMode.value !== 'workbench') middleMode.value = 'workbench';
}
function handleSelectionChange(payload: { side: DeltaEditorPane; path: JsonPathSegment[] }) {
  activePane.value = payload.side;
  selectedPathMap.value = { ...selectedPathMap.value, [payload.side]: payload.path };
  if (middleMode.value !== 'workbench') middleMode.value = 'workbench';
}
function handleSelectedValueUpdate(payload: { side: DeltaEditorPane; path: JsonPathSegment[]; value: unknown }) {
  if (payload.side === 'base') {
    const tab = sourceTabs.value.find((t) => t.id === activeSourceTab.value);
    if (tab) tab.data = setValueAtPath(tab.data, payload.path, payload.value);
  } else {
    const tab = deltaTabs.value.find((t) => t.id === activeDeltaTab.value);
    if (tab) tab.data = setValueAtPath(tab.data, payload.path, payload.value);
  }
}

// ─── Sample loaders ──────────────────────────────────────────────────────────
function loadSingleSourceSample() {
  activeSample.value = 'single';
  sourceTabs.value = [{ id: 'main', name: 'main', isTarget: true, data: createMainSourceSample().data }];
  activeSourceTab.value = 'main';
  const d = createDeltaSample();
  deltaTabs.value = [{ id: 'delta-main', kind: 'delta', label: 'Delta', data: d }, { id: 'delta-reverse', kind: 'reverse', label: 'Reverse', data: generateReversePlaceholder(d) }];
  activeDeltaTab.value = 'delta-main'; middleMode.value = 'workbench';
}
function loadMultiSourceSample() {
  activeSample.value = 'multi';
  sourceTabs.value = [
    { id: 'main', name: 'main', isTarget: true, data: createMainSourceSample().data },
    { id: 'user', name: 'user', isTarget: false, data: createUserSourceSample().data },
    { id: 'tenant', name: 'tenant', isTarget: false, data: createTenantSourceSample().data },
  ];
  activeSourceTab.value = 'main';
  const d = createMultiSourceDeltaSample();
  deltaTabs.value = [{ id: 'delta-main', kind: 'delta', label: 'Delta', data: d }, { id: 'delta-reverse', kind: 'reverse', label: 'Reverse', data: generateReversePlaceholder(d) }];
  activeDeltaTab.value = 'delta-main'; middleMode.value = 'workbench';
}
function loadPipelineSample() {
  activeSample.value = 'pipeline';
  sourceTabs.value = [{ id: 'main', name: 'main', isTarget: true, data: createMainSourceSample().data }];
  activeSourceTab.value = 'main';
  rebuildDeltaTabs(createPipelineSample());
  activeDeltaTab.value = 'delta-main'; middleMode.value = 'workbench';
}
function loadMultiSourcePipelineSample() {
  activeSample.value = 'multi-pipeline';
  sourceTabs.value = [
    { id: 'main', name: 'main', isTarget: true, data: createMainSourceSample().data },
    { id: 'user', name: 'user', isTarget: false, data: createUserSourceSample().data },
    { id: 'tenant', name: 'tenant', isTarget: false, data: createTenantSourceSample().data },
  ];
  activeSourceTab.value = 'main';
  rebuildDeltaTabs(createMultiSourcePipelineSample());
  activeDeltaTab.value = 'delta-main'; middleMode.value = 'workbench';
}
function resetAll() { loadSingleSourceSample(); activePane.value = 'base'; selectedPathMap.value = { base: [], delta: [] }; }

onBeforeUnmount(() => { stopResize(); destroyPreviewEditor(); destroyBackendEditor(); });
</script>

<style scoped lang="less">
.delta-lab { display: grid; gap: 6px; padding: 6px; min-height: 100%; }

.delta-lab__header-card { border: 1px solid #dbe1ea; border-radius: 4px; background: #fff; padding: 8px 10px; }
.delta-lab__header-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.delta-lab__title { font-size: 16px; font-weight: 700; color: #0f172a; }
.delta-lab__subtitle { font-size: 12px; color: #64748b; }
.delta-lab__header-actions { display: flex; gap: 4px; flex-wrap: wrap; }

.delta-lab__btn { border: 1px solid #cbd5e1; border-radius: 4px; background: #fff; color: #334155; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer; line-height: 1; white-space: nowrap; }
.delta-lab__btn:hover { background: #f8fafc; }
.delta-lab__btn--primary { border-color: #cbd5e1; background: #fff; color: #334155; }
.delta-lab__btn--primary-active { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }
.delta-lab__btn--secondary { border-color: #cbd5e1; background: #f8fafc; color: #64748b; }
.delta-lab__btn--small { padding: 3px 7px; font-size: 11px; }
.delta-lab__btn--danger { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }

.delta-lab__grid { height: calc(100vh - 100px); min-height: 600px; display: flex; align-items: stretch; gap: 0; }
.delta-lab__pane { flex-grow: 0; flex-shrink: 0; min-width: 0; height: 100%; }
.delta-lab__splitter { flex: 0 0 8px; position: relative; cursor: col-resize; }
.delta-lab__splitter::before { content: ''; position: absolute; top: 10px; bottom: 10px; left: 3px; width: 2px; border-radius: 2px; background: linear-gradient(180deg, rgba(148,163,184,0.15), rgba(100,116,139,0.5)); }

.delta-lab__card { display: flex; flex-direction: column; height: 100%; border: 1px solid #dbe1ea; border-radius: 4px; background: #fff; overflow: hidden; }
.delta-lab__card-body { flex: 1; min-height: 0; overflow: hidden; }

.delta-lab__section-header { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 4px 8px; border-bottom: 1px solid #eef2f7; background: #f8fafc; flex-shrink: 0; }
.delta-lab__section-head-main { display: flex; align-items: baseline; gap: 8px; }
.delta-lab__section-title { font-size: 13px; font-weight: 700; color: #0f172a; }
.delta-lab__section-desc { font-size: 11px; color: #64748b; }

.delta-lab__tab-bar { display: flex; gap: 0; padding: 0 8px; border-bottom: 1px solid #eef2f7; background: #f8fafc; overflow-x: auto; flex-shrink: 0; }
.delta-lab__tab { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border: none; border-bottom: 2px solid transparent; background: transparent; color: #475569; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; line-height: 1; }
.delta-lab__tab:hover { color: #1e40af; background: rgba(37,99,235,0.04); }
.delta-lab__tab.is-active { color: #1d4ed8; border-bottom-color: #2563eb; background: rgba(37,99,235,0.06); }
.delta-lab__tab--reverse.is-active { color: #0f766e; border-bottom-color: #0f766e; background: rgba(15,118,110,0.06); }
.delta-lab__tab--pipeline-step.is-active { color: #7c3aed; border-bottom-color: #7c3aed; background: rgba(124,58,237,0.06); }
.delta-lab__tab-icon { font-size: 13px; line-height: 1; }
.delta-lab__tab-badge { padding: 1px 4px; border-radius: 3px; font-size: 10px; font-weight: 700; }
.delta-lab__tab-badge--target { background: #e8f1ff; color: #1d4ed8; }

.delta-lab__source-toolbar { display: flex; align-items: center; gap: 6px; padding: 0 8px; border-bottom: 1px solid #eef2f7; background: #fff; flex-shrink: 0; height: 25px; box-sizing: border-box; }
.delta-lab__field { display: flex; align-items: stretch; height: 25px; border: 1px solid #d8e3ef; border-radius: 4px; background: #fff; overflow: hidden; flex: 1; min-width: 0; }
.delta-lab__field--target { overflow: visible; position: relative; }
.delta-lab__field-label { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; min-width: 44px; padding: 0 6px; background: #e8f1ff; color: #1d4ed8; font-size: 11px; font-weight: 700; white-space: nowrap; }
.delta-lab__field-select { flex: 1; min-width: 0; border: 0; padding: 0 6px; font-size: 12px; color: #0f172a; background: transparent; outline: none; cursor: pointer; }

.delta-lab__searchable-select { flex: 1; min-width: 0; display: flex; align-items: stretch; position: relative; }
.delta-lab__searchable-input { flex: 1; min-width: 0; border: 0; padding: 0 6px; font-size: 12px; color: #0f172a; background: transparent; outline: none; }
.delta-lab__searchable-input::placeholder { color: #94a3b8; }
.delta-lab__searchable-arrow { flex: 0 0 auto; display: flex; align-items: center; padding: 0 4px; color: #94a3b8; font-size: 10px; cursor: pointer; user-select: none; }
.delta-lab__searchable-arrow:hover { color: #475569; }
.delta-lab__searchable-dropdown { position: absolute; top: 100%; left: -1px; right: -1px; z-index: 20; max-height: 180px; overflow-y: auto; border: 1px solid #d8e3ef; border-top: none; border-radius: 0 0 4px 4px; background: #fff; box-shadow: 0 6px 16px rgba(15,23,42,0.1); }
.delta-lab__searchable-option { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 4px 8px; font-size: 12px; color: #334155; cursor: pointer; }
.delta-lab__searchable-option:hover { background: #f1f5f9; }
.delta-lab__searchable-option.is-selected { color: #1d4ed8; font-weight: 600; }
.delta-lab__searchable-option :deep(mark) { background: #fef08a; color: inherit; padding: 0 1px; border-radius: 2px; }
.delta-lab__searchable-check { color: #1d4ed8; font-size: 11px; }
.delta-lab__searchable-empty { padding: 6px 8px; font-size: 11px; color: #94a3b8; text-align: center; }

.delta-lab__warnings { padding: 3px 8px; border-bottom: 1px solid #eef2f7; background: #fffbeb; flex-shrink: 0; max-height: 60px; overflow-y: auto; }
.delta-lab__warning-item { font-size: 11px; color: #92400e; line-height: 1.4; }
.delta-lab__steps-bar { display: flex; gap: 4px; padding: 3px 8px; border-bottom: 1px solid #eef2f7; background: #f8fafc; overflow-x: auto; flex-shrink: 0; }
.delta-lab__step-tag { padding: 2px 5px; border-radius: 3px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.delta-lab__step-tag--applied { background: #dcfce7; color: #166534; }
.delta-lab__step-tag--skipped { background: #fef3c7; color: #92400e; }
.delta-lab__step-tag--unsupported { background: #f1f5f9; color: #64748b; }
.delta-lab__preview-meta { display: flex; gap: 10px; padding: 3px 8px; border-bottom: 1px solid #eef2f7; background: #fff; font-size: 11px; color: #64748b; flex-shrink: 0; }
.delta-lab__preview-editor { height: 100%; min-height: 0; }
:deep(.delta-lab__preview-editor .jse-main) { border-radius: 0; }

.delta-lab__tab--backend.is-active { color: #b45309; border-bottom-color: #d97706; background: rgba(217, 119, 6, 0.06); }
.delta-lab__backend-status { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-bottom: 1px solid #eef2f7; background: #fffbeb; font-size: 12px; color: #92400e; flex-shrink: 0; }
.delta-lab__backend-spinner { display: inline-block; animation: delta-lab-spin 1s linear infinite; font-size: 14px; }
@keyframes delta-lab-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.delta-lab__backend-error { padding: 6px 8px; border-bottom: 1px solid #eef2f7; background: #fef2f2; color: #b91c1c; font-size: 12px; flex-shrink: 0; }
.delta-lab__backend-badge { padding: 1px 5px; border-radius: 3px; background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 700; }

.delta-lab__inspector-toggle { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-top: 1px solid #eef2f7; background: #f8fafc; cursor: pointer; flex-shrink: 0; font-size: 12px; font-weight: 600; color: #475569; user-select: none; }
.delta-lab__inspector-toggle:hover { background: #f1f5f9; }
.delta-lab__inspector-path { font-weight: 400; color: #94a3b8; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.delta-lab__inspector-body { flex-shrink: 0; border-top: 1px solid #eef2f7; overflow: hidden; position: relative; }
.delta-lab__inspector-resize { position: absolute; top: 0; left: 0; right: 0; height: 6px; cursor: row-resize; z-index: 2; }
.delta-lab__inspector-resize::before { content: ''; position: absolute; top: 2px; left: 50%; transform: translateX(-50%); width: 40px; height: 2px; border-radius: 2px; background: #cbd5e1; }

@media (max-width: 1500px) {
  .delta-lab__grid { flex-direction: column; height: auto; min-height: auto; gap: 6px; }
  .delta-lab__pane { flex-basis: auto !important; height: 50vh; min-height: 300px; }
  .delta-lab__splitter { display: none; }
}
</style>
