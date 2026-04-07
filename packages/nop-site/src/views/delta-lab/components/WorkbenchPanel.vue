<template>
  <section class="workbench">
    <header class="workbench__header">
      <div>
        <h2>中栏工作区</h2>
        <p>当前跟随 {{ activePane === 'base' ? '左侧 Base' : '右侧 Delta' }} 编辑器。</p>
      </div>
      <div class="workbench__tags">
        <span class="workbench__tag workbench__tag--pane">{{ activePane }}</span>
        <span class="workbench__tag workbench__tag--layer">{{ currentMatch.layer }}</span>
        <span class="workbench__tag">{{ currentMatch.label }}</span>
      </div>
    </header>

    <div class="workbench__summary">
      <article class="workbench__card">
        <span class="workbench__card-label">路径</span>
        <strong>{{ pathText }}</strong>
      </article>
      <article class="workbench__card">
        <span class="workbench__card-label">当前层</span>
        <strong>{{ layerLabel }}</strong>
      </article>
      <article class="workbench__card">
        <span class="workbench__card-label">整体预览源</span>
        <strong>{{ previewResult.source }}</strong>
      </article>
    </div>

    <nav class="workbench__tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['workbench__tab', { 'is-active': activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="workbench__body">
      <section v-if="activeTab === 'overview'" class="workbench__panel">
        <div class="workbench__overview">
          <div class="workbench__overview-main">
            <h3>{{ currentMatch.label }}</h3>
            <p>{{ currentMatch.description }}</p>
            <pre>{{ prettySelectedValue }}</pre>
          </div>
          <aside v-if="currentMatch.kind === 'image' && typeof selectedValue === 'string'" class="workbench__image">
            <img :src="selectedValue" alt="selected preview" />
          </aside>
        </div>
      </section>

      <section v-else-if="activeTab === 'editor'" class="workbench__panel workbench__panel--editor">
        <div class="workbench__editor-toolbar">
          <div>
            <strong>{{ currentMatch.label }}</strong>
            <span>{{ currentMatch.language }}</span>
          </div>
          <div class="workbench__editor-actions">
            <button @click="handleFormat" :disabled="!currentMatch.canEditSource">格式化</button>
            <button @click="handleReset" :disabled="!currentMatch.canEditSource">恢复</button>
            <button class="primary" @click="handleSave" :disabled="!currentMatch.canEditSource">写回当前节点</button>
          </div>
        </div>

        <div v-if="currentMatch.kind === 'image' && typeof selectedValue === 'string'" class="workbench__image-editor">
          <div class="workbench__image-frame">
            <img :src="selectedValue" alt="image preview" />
          </div>
          <textarea v-model="editorSource" class="workbench__textarea"></textarea>
        </div>
        <div v-else class="workbench__monaco">
          <MonacoSurface
            v-model="editorSource"
            :language="currentMatch.language"
            :read-only="!currentMatch.canEditSource"
          />
        </div>
      </section>

      <section v-else-if="activeTab === 'preview'" class="workbench__panel">
        <div v-if="activePane === 'delta'" class="workbench__preview-grid">
          <article class="workbench__preview-card">
            <h3>整体 Delta 预览</h3>
            <pre>{{ prettyPreviewResult }}</pre>
          </article>
          <article class="workbench__preview-card">
            <h3>预览告警</h3>
            <ul v-if="previewResult.warnings.length" class="workbench__warning-list">
              <li v-for="warning in previewResult.warnings" :key="warning.message">
                {{ warning.message }}
              </li>
            </ul>
            <p v-else class="workbench__empty">当前没有预览告警。</p>

            <h3 class="steps-title">Pipeline / Delta 步骤</h3>
            <ul v-if="previewResult.steps.length" class="workbench__step-list">
              <li v-for="step in previewResult.steps" :key="step.index">
                Step {{ step.index + 1 }} · {{ step.kind }} · {{ step.status }} · {{ step.summary }}
              </li>
            </ul>
            <p v-else class="workbench__empty">当前草稿不是 `$pipeline`，只展示单次 Delta 预览。</p>
          </article>
        </div>
        <article v-else class="workbench__preview-card">
          <h3>Base 数据预览</h3>
          <pre>{{ prettyActiveRoot }}</pre>
        </article>
      </section>

      <section v-else class="workbench__panel">
        <article class="workbench__backend">
          <h3>前后端协同规划</h3>
          <p>前端当前使用本地模拟器渲染结构预览，后续应切换到后端权威执行服务。</p>
          <pre>{{ backendContractText }}</pre>
          <div class="workbench__backend-notes">
            <p>结构层：后端使用 `delta_new` parser / validator / engine 执行。</p>
            <p>值层：`$jina / $jmes / $java` 由后端表达式引擎和安全策略统一计算。</p>
            <p>过程层：`$pipeline` 后续按 step 数组顺序由后端串行执行，前端仅负责编排编辑。</p>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import MonacoSurface from './MonacoSurface.vue';
import { matchEmbeddedEditor } from '../model/embeddedRegistry';
import { getValueAtPath, stringifyJsonPath } from '../model/jsonPath';
import { backendContractExample } from '../model/previewProvider';
import type {
  DeltaEditorPane,
  DeltaPreviewResult,
  JsonPathSegment,
} from '../model/types';

const props = defineProps<{
  activePane: DeltaEditorPane;
  selectedPath: JsonPathSegment[];
  baseDocument: Record<string, unknown>;
  deltaDocument: Record<string, unknown>;
  previewResult: DeltaPreviewResult;
}>();

const emit = defineEmits<{
  (
    event: 'update-selected-value',
    payload: { side: DeltaEditorPane; path: JsonPathSegment[]; value: unknown },
  ): void;
}>();

const tabs = [
  { id: 'overview', label: '节点预览' },
  { id: 'editor', label: '插件编辑' },
  { id: 'preview', label: '整体预览' },
  { id: 'backend', label: '后端规划' },
] as const;

const activeTab = ref<(typeof tabs)[number]['id']>('overview');
const editorSource = ref('');

const activeRoot = computed(() =>
  props.activePane === 'base' ? props.baseDocument : props.deltaDocument,
);

const selectedValue = computed(() => getValueAtPath(activeRoot.value, props.selectedPath));

const currentMatch = computed(() =>
  matchEmbeddedEditor({
    side: props.activePane,
    path: props.selectedPath,
    value: selectedValue.value,
    root: activeRoot.value,
    base: props.baseDocument,
    delta: props.deltaDocument,
  }),
);

const pathText = computed(() => stringifyJsonPath(props.selectedPath));

const layerLabel = computed(() => {
  switch (currentMatch.value.layer) {
    case 'value':
      return '值层';
    case 'process':
      return '过程层';
    default:
      return '结构层';
  }
});

const prettySelectedValue = computed(() => JSON.stringify(selectedValue.value, null, 2));

const prettyActiveRoot = computed(() => JSON.stringify(activeRoot.value, null, 2));

const prettyPreviewResult = computed(() => JSON.stringify(props.previewResult.result, null, 2));

const backendContractText = computed(() => JSON.stringify(backendContractExample, null, 2));

watch(
  () => [currentMatch.value, selectedValue.value, props.selectedPath, props.activePane],
  () => {
    editorSource.value = currentMatch.value.getSource(selectedValue.value);
  },
  { deep: true, immediate: true },
);

function handleFormat() {
  if (currentMatch.value.formatSource) {
    editorSource.value = currentMatch.value.formatSource(editorSource.value);
  }
}

function handleReset() {
  editorSource.value = currentMatch.value.getSource(selectedValue.value);
}

function handleSave() {
  emit('update-selected-value', {
    side: props.activePane,
    path: props.selectedPath,
    value: currentMatch.value.setSource(editorSource.value, selectedValue.value),
  });
}
</script>

<style scoped lang="less">
.workbench {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.14), transparent 36%),
    linear-gradient(180deg, #fffdf8 0%, #f8fafc 100%);
  border: 1px solid #d7dee8;
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.workbench__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 22px 14px;
  border-bottom: 1px solid #e4ebf2;

  h2 {
    margin: 0;
    font-size: 20px;
    color: #16243f;
  }

  p {
    margin: 8px 0 0;
    color: #5e6d87;
    font-size: 13px;
  }
}

.workbench__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.workbench__tag {
  padding: 5px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.workbench__tag--pane {
  background: #ecfdf5;
  color: #047857;
}

.workbench__tag--layer {
  background: #fff7ed;
  color: #c2410c;
}

.workbench__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px 20px 0;
}

.workbench__card {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #e6edf5;

  strong {
    display: block;
    margin-top: 8px;
    color: #10233d;
    font-size: 14px;
    word-break: break-word;
  }
}

.workbench__card-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7a90;
}

.workbench__tabs {
  display: flex;
  gap: 8px;
  padding: 16px 20px 10px;
}

.workbench__tab {
  border: none;
  background: #edf2f7;
  color: #42526b;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.workbench__tab.is-active {
  background: #111827;
  color: #fff;
}

.workbench__body {
  flex: 1;
  min-height: 0;
  padding: 0 20px 20px;
}

.workbench__panel {
  height: 100%;
  min-height: 0;
  padding: 18px;
  border: 1px solid #e3e9f1;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  overflow: auto;
}

.workbench__panel--editor {
  display: flex;
  flex-direction: column;
}

.workbench__overview {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
  gap: 20px;
}

.workbench__overview-main pre,
.workbench__preview-card pre,
.workbench__backend pre {
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #e5ebf3;
  color: #16233d;
  font-size: 12px;
  line-height: 1.6;
  overflow: auto;
}

.workbench__image,
.workbench__image-frame {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #dde6f0;
  background: linear-gradient(180deg, #f8fafc, #eef4fa);
}

.workbench__image img,
.workbench__image-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  min-height: 220px;
}

.workbench__editor-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;

  strong {
    color: #10233d;
  }

  span {
    margin-left: 10px;
    font-size: 12px;
    color: #64748b;
  }
}

.workbench__editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    border: 1px solid #d0d9e5;
    background: #fff;
    color: #334155;
    border-radius: 999px;
    padding: 7px 12px;
    cursor: pointer;
  }

  .primary {
    background: #111827;
    color: #fff;
    border-color: #111827;
  }
}

.workbench__monaco {
  flex: 1;
  min-height: 320px;
}

.workbench__image-editor {
  display: grid;
  grid-template-rows: minmax(220px, 1fr) 160px;
  gap: 16px;
  flex: 1;
}

.workbench__textarea {
  width: 100%;
  resize: none;
  border-radius: 14px;
  border: 1px solid #d5deea;
  padding: 14px;
  font-family: 'SFMono-Regular', 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.workbench__preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 18px;
}

.workbench__preview-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workbench__warning-list,
.workbench__step-list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
}

.steps-title {
  margin-top: 12px;
}

.workbench__empty {
  color: #64748b;
}

.workbench__backend-notes {
  margin-top: 16px;
  color: #42526b;
}

@media (max-width: 1400px) {
  .workbench__summary,
  .workbench__preview-grid,
  .workbench__overview {
    grid-template-columns: 1fr;
  }
}
</style>
