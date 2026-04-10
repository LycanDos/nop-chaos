<template>
  <div class="delta-three-pane">
    <header class="delta-three-pane__hero">
      <div>
        <p class="eyebrow">Delta Base</p>
        <h1>达尔塔和贝斯</h1>
      </div>
      <div class="delta-three-pane__hero-actions">
        <button @click="loadStructureSample">结构层示例</button>
        <button @click="loadPipelineSample">过程层示例</button>
        <button class="secondary" @click="resetBase">重置 Base</button>
      </div>
    </header>

    <section ref="layoutRef" class="delta-three-pane__grid">
      <div class="delta-three-pane__pane" :style="paneStyle(basePaneWidth)">
        <JsonEditorPane
          title="Base"
          side="base"
          :model-value="baseDocument"
          :base-document="baseDocument"
          :delta-document="deltaDocument"
          @update:model-value="updateDocument('base', $event)"
          @activate="handleActivate"
          @selection-change="handleSelectionChange"
        />
      </div>

      <div
        class="delta-three-pane__splitter"
        title="拖动调整 Base 宽度"
        @mousedown="startResize('base', $event)"
      ></div>

      <div class="delta-three-pane__pane" :style="paneStyle(workbenchPaneWidth)">
        <WorkbenchPanel
          :active-pane="activePane"
          :selected-path="currentSelectionPath"
          :base-document="baseDocument"
          :delta-document="deltaDocument"
          @update-selected-value="handleSelectedValueUpdate"
        />
      </div>

      <div
        class="delta-three-pane__splitter"
        title="拖动调整工作区宽度"
        @mousedown="startResize('workbench', $event)"
      ></div>

      <div class="delta-three-pane__pane" :style="paneStyle(rightPaneWidth)">
        <JsonEditorPane
          title="Delta"
          side="delta"
          :model-value="deltaDocument"
          :base-document="baseDocument"
          :delta-document="deltaDocument"
          @update:model-value="updateDocument('delta', $event)"
          @activate="handleActivate"
          @selection-change="handleSelectionChange"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import JsonEditorPane from './components/JsonEditorPane.vue';
import WorkbenchPanel from './components/WorkbenchPanel.vue';
import { setValueAtPath } from './model/jsonPath';
import {
  createBaseSample,
  createDeltaSample,
  createPipelineSample,
} from './model/sampleDocuments';
import type { DeltaEditorPane, JsonPathSegment } from './model/types';

const baseDocument = ref<Record<string, unknown>>(createBaseSample());
const deltaDocument = ref<Record<string, unknown>>(createDeltaSample());
const activePane = ref<DeltaEditorPane>('base');
const layoutRef = ref<HTMLElement | null>(null);
const selectedPathMap = ref<Record<DeltaEditorPane, JsonPathSegment[]>>({
  base: [],
  delta: [],
});
const basePaneWidth = ref(31);
const workbenchPaneWidth = ref(38);

const currentSelectionPath = computed(() => selectedPathMap.value[activePane.value] ?? []);
const rightPaneWidth = computed(() => 100 - basePaneWidth.value - workbenchPaneWidth.value);

function paneStyle(width: number) {
  return {
    flexBasis: `calc((100% - 24px) * ${width} / 100)`,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

let activeResize: 'base' | 'workbench' | null = null;

function startResize(target: 'base' | 'workbench', event: MouseEvent) {
  if (!layoutRef.value || window.innerWidth <= 1500) {
    return;
  }
  event.preventDefault();
  activeResize = target;
  window.addEventListener('mousemove', handleResizeMove);
  window.addEventListener('mouseup', stopResize);
}

function handleResizeMove(event: MouseEvent) {
  if (!activeResize || !layoutRef.value) {
    return;
  }

  const rect = layoutRef.value.getBoundingClientRect();
  const widthPercent = ((event.clientX - rect.left) / rect.width) * 100;
  const minPaneWidth = 22;

  if (activeResize === 'base') {
    basePaneWidth.value = clamp(
      widthPercent,
      minPaneWidth,
      100 - workbenchPaneWidth.value - minPaneWidth,
    );
    return;
  }

  const nextWorkbenchWidth = clamp(
    widthPercent - basePaneWidth.value,
    minPaneWidth,
    100 - basePaneWidth.value - minPaneWidth,
  );
  workbenchPaneWidth.value = nextWorkbenchWidth;
}

function stopResize() {
  activeResize = null;
  window.removeEventListener('mousemove', handleResizeMove);
  window.removeEventListener('mouseup', stopResize);
}

function handleActivate(side: DeltaEditorPane) {
  activePane.value = side;
}

function handleSelectionChange(payload: { side: DeltaEditorPane; path: JsonPathSegment[] }) {
  activePane.value = payload.side;
  selectedPathMap.value = {
    ...selectedPathMap.value,
    [payload.side]: payload.path,
  };
}

function updateDocument(side: DeltaEditorPane, nextValue: Record<string, unknown>) {
  if (side === 'base') {
    baseDocument.value = nextValue;
  } else {
    deltaDocument.value = nextValue;
  }
  activePane.value = side;
}

function handleSelectedValueUpdate(payload: {
  side: DeltaEditorPane;
  path: JsonPathSegment[];
  value: unknown;
}) {
  if (payload.side === 'base') {
    baseDocument.value = setValueAtPath(baseDocument.value, payload.path, payload.value);
  } else {
    deltaDocument.value = setValueAtPath(deltaDocument.value, payload.path, payload.value);
  }
}

function loadStructureSample() {
  deltaDocument.value = createDeltaSample();
  activePane.value = 'delta';
  selectedPathMap.value.delta = [];
}

function loadPipelineSample() {
  deltaDocument.value = createPipelineSample();
  activePane.value = 'delta';
  selectedPathMap.value.delta = ['$pipeline'];
}

function resetBase() {
  baseDocument.value = createBaseSample();
  activePane.value = 'base';
  selectedPathMap.value.base = [];
}

onBeforeUnmount(() => {
  stopResize();
});
</script>

<style scoped lang="less">
.delta-three-pane {
  min-height: 100%;
  padding: 12px;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 28%),
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.16), transparent 24%),
    linear-gradient(180deg, #f3f7fb 0%, #eef4f9 100%);
}

.delta-three-pane__hero {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  margin-bottom: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94)),
    #fff;
  border: 1px solid rgba(214, 222, 232, 0.92);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.06);

  h1 {
    margin: 3px 0 0;
    font-size: 24px;
    line-height: 1.1;
    color: #10233d;
  }
}

.eyebrow {
  margin: 0;
  color: #0f766e;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
}

.delta-three-pane__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    border: none;
    border-radius: 999px;
    padding: 8px 12px;
    background: #111827;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
  }

  .secondary {
    background: #fff;
    color: #243248;
    border: 1px solid #d4dce7;
  }
}

.delta-three-pane__grid {
  height: calc(100vh - 134px);
  min-height: 600px;
  display: flex;
  align-items: stretch;
  gap: 0;
}

.delta-three-pane__pane {
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 0;
  height: 100%;
}

.delta-three-pane__splitter {
  flex: 0 0 12px;
  position: relative;
  cursor: col-resize;
}

.delta-three-pane__splitter::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 5px;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.2), rgba(100, 116, 139, 0.7));
}

@media (max-width: 1500px) {
  .delta-three-pane__grid {
    flex-direction: column;
    height: auto;
    min-height: auto;
    gap: 12px;
  }

  .delta-three-pane__pane {
    flex-basis: auto !important;
  }

  .delta-three-pane__splitter {
    display: none;
  }
}
</style>
