<template>
  <div class="delta-three-pane">
    <header class="delta-three-pane__hero">
      <div>
        <p class="eyebrow">Delta / Value / Pipeline</p>
        <h1>Delta 三层编辑器</h1>
        <p class="description">
          左侧编辑 Base，右侧编辑 Delta 或 `$pipeline` 草稿，中栏负责节点级预览、插件化编辑和整体预览。
        </p>
      </div>
      <div class="delta-three-pane__hero-actions">
        <button @click="loadStructureSample">结构层示例</button>
        <button @click="loadPipelineSample">过程层示例</button>
        <button class="secondary" @click="resetBase">重置 Base</button>
      </div>
    </header>

    <section class="delta-three-pane__meta">
      <article>
        <span>活跃侧</span>
        <strong>{{ activePane }}</strong>
      </article>
      <article>
        <span>当前路径</span>
        <strong>{{ currentPathText }}</strong>
      </article>
      <article>
        <span>预览模式</span>
        <strong>{{ previewResult.mode }} / {{ previewResult.source }}</strong>
      </article>
      <article>
        <span>表达式占位数</span>
        <strong>{{ previewResult.unresolvedExpressions }}</strong>
      </article>
    </section>

    <section class="delta-three-pane__grid">
      <JsonEditorPane
        title="Base 编辑器"
        description="承载基础 JSON 数据。选中或编辑这里时，中栏聚焦 Base 节点。"
        side="base"
        :model-value="baseDocument"
        :base-document="baseDocument"
        :delta-document="deltaDocument"
        @update:model-value="updateDocument('base', $event)"
        @activate="handleActivate"
        @selection-change="handleSelectionChange"
      />

      <WorkbenchPanel
        :active-pane="activePane"
        :selected-path="currentSelectionPath"
        :base-document="baseDocument"
        :delta-document="deltaDocument"
        :preview-result="previewResult"
        @update-selected-value="handleSelectedValueUpdate"
      />

      <JsonEditorPane
        title="Delta / Draft 编辑器"
        description="支持结构层 Delta 草稿，也允许顶层切换成 `$pipeline` 草稿。选中这里时，中栏展示 Delta 预览。"
        side="delta"
        :model-value="deltaDocument"
        :base-document="baseDocument"
        :delta-document="deltaDocument"
        @update:model-value="updateDocument('delta', $event)"
        @activate="handleActivate"
        @selection-change="handleSelectionChange"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

import 'vanilla-jsoneditor/themes/jse-theme-default.css';

import JsonEditorPane from './components/JsonEditorPane.vue';
import WorkbenchPanel from './components/WorkbenchPanel.vue';
import { setValueAtPath, stringifyJsonPath } from './model/jsonPath';
import { localPreviewProvider } from './model/previewProvider';
import {
  createBaseSample,
  createDeltaSample,
  createPipelineSample,
} from './model/sampleDocuments';
import type {
  DeltaEditorPane,
  DeltaPreviewResult,
  JsonPathSegment,
} from './model/types';

const baseDocument = ref<Record<string, unknown>>(createBaseSample());
const deltaDocument = ref<Record<string, unknown>>(createDeltaSample());
const activePane = ref<DeltaEditorPane>('base');
const selectedPathMap = ref<Record<DeltaEditorPane, JsonPathSegment[]>>({
  base: [],
  delta: [],
});
const previewResult = ref<DeltaPreviewResult>({
  mode: 'delta',
  source: 'local-simulator',
  result: {},
  warnings: [],
  steps: [],
  unresolvedExpressions: 0,
});

const currentSelectionPath = computed(() => selectedPathMap.value[activePane.value] ?? []);
const currentPathText = computed(() => stringifyJsonPath(currentSelectionPath.value));

let previewRequestId = 0;

async function refreshPreview() {
  const requestId = ++previewRequestId;
  const nextResult = await localPreviewProvider.preview({
    base: baseDocument.value,
    draft: deltaDocument.value,
  });

  if (requestId === previewRequestId) {
    previewResult.value = nextResult;
  }
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

watch([baseDocument, deltaDocument], refreshPreview, { deep: true, immediate: true });
</script>

<style scoped lang="less">
.delta-three-pane {
  min-height: 100%;
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 28%),
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.16), transparent 24%),
    linear-gradient(180deg, #f3f7fb 0%, #eef4f9 100%);
}

.delta-three-pane__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
  margin-bottom: 18px;
  padding: 26px 30px;
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94)),
    #fff;
  border: 1px solid rgba(214, 222, 232, 0.92);
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);

  h1 {
    margin: 8px 0 0;
    font-size: 34px;
    line-height: 1.1;
    color: #10233d;
  }
}

.eyebrow {
  margin: 0;
  color: #0f766e;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
}

.description {
  max-width: 820px;
  margin: 12px 0 0;
  color: #5b6982;
  line-height: 1.7;
}

.delta-three-pane__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  button {
    border: none;
    border-radius: 999px;
    padding: 10px 14px;
    background: #111827;
    color: #fff;
    cursor: pointer;
  }

  .secondary {
    background: #fff;
    color: #243248;
    border: 1px solid #d4dce7;
  }
}

.delta-three-pane__meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;

  article {
    padding: 14px 16px;
    border-radius: 16px;
    border: 1px solid #d8e1ec;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(8px);
  }

  span {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #718198;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: #13243e;
    word-break: break-word;
  }
}

.delta-three-pane__grid {
  height: calc(100vh - 250px);
  min-height: 720px;
  display: grid;
  grid-template-columns: minmax(320px, 1.04fr) minmax(360px, 0.92fr) minmax(320px, 1.04fr);
  gap: 18px;
}

@media (max-width: 1500px) {
  .delta-three-pane__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .delta-three-pane__grid {
    grid-template-columns: 1fr;
    height: auto;
    min-height: auto;
  }
}
</style>
