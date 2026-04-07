<template>
  <section class="delta-pane">
    <header class="delta-pane__header">
      <div>
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <div class="delta-pane__toolbar">
        <span class="delta-pane__side">{{ side === 'base' ? 'Base' : 'Delta' }}</span>
        <select v-model="mode" class="delta-pane__mode">
          <option :value="Mode.tree">tree</option>
          <option :value="Mode.table">table</option>
          <option :value="Mode.text">text</option>
        </select>
      </div>
    </header>
    <div ref="containerRef" class="delta-pane__editor"></div>
  </section>
</template>

<script setup lang="ts">
import type {
  Content,
  JSONEditorSelection,
  JSONSelection,
  MenuItem,
  OnChangeStatus,
  RenderValueProps,
} from 'vanilla-jsoneditor';

import { cloneDeep, isEqual } from 'lodash-es';
import {
  createJSONEditor,
  getFocusPath,
  Mode,
  SelectionType,
} from 'vanilla-jsoneditor';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { getEmbeddedBadge, matchEmbeddedEditor } from '../model/embeddedRegistry';
import type { DeltaEditorPane, JsonPathSegment } from '../model/types';

const props = defineProps<{
  title: string;
  description: string;
  side: DeltaEditorPane;
  modelValue: Record<string, unknown>;
  baseDocument: Record<string, unknown>;
  deltaDocument: Record<string, unknown>;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: Record<string, unknown>): void;
  (event: 'activate', side: DeltaEditorPane): void;
  (event: 'selection-change', payload: { side: DeltaEditorPane; path: JsonPathSegment[] }): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const mode = ref<Mode>(Mode.tree);
const currentJson = ref<Record<string, unknown>>(cloneDeep(props.modelValue));
const currentSelection = ref<JSONEditorSelection | undefined>(undefined);

let editorInstance: ReturnType<typeof createJSONEditor> | null = null;

const rootDocument = computed(() => (props.side === 'base' ? props.baseDocument : props.deltaDocument));

function extractPath(selection: JSONEditorSelection | undefined): JsonPathSegment[] {
  if (!selection || selection.type === SelectionType.text) {
    return [];
  }
  return [...getFocusPath(selection as JSONSelection)] as JsonPathSegment[];
}

function decorateEmbeddedValue(
  element: HTMLElement,
  parameters: { badge: string; description: string },
) {
  applyDecoration(element, parameters);
  return {
    update(nextParameters: { badge: string; description: string }) {
      applyDecoration(element, nextParameters);
    },
    destroy() {
      element.classList.remove('delta-embedded-value');
      delete element.dataset.deltaBadge;
      element.removeAttribute('title');
    },
  };
}

function applyDecoration(
  element: HTMLElement,
  parameters: { badge: string; description: string },
) {
  element.classList.add('delta-embedded-value');
  element.dataset.deltaBadge = parameters.badge;
  element.setAttribute('title', parameters.description);
}

function handleChange(content: Content, _previous: Content, _status: OnChangeStatus) {
  emit('activate', props.side);
  if ('json' in content) {
    currentJson.value = cloneDeep(content.json) as Record<string, unknown>;
    emit('update:modelValue', currentJson.value);
  }
}

function handleSelect(selection: JSONEditorSelection | undefined) {
  currentSelection.value = selection;
  emit('activate', props.side);
  emit('selection-change', {
    side: props.side,
    path: extractPath(selection),
  });
}

function handleRenderValue(renderProps: RenderValueProps) {
  const match = matchEmbeddedEditor({
    side: props.side,
    path: [...renderProps.path] as JsonPathSegment[],
    value: renderProps.value,
    root: rootDocument.value,
    base: props.baseDocument,
    delta: props.deltaDocument,
  });

  if (match.kind === 'json') {
    return [];
  }

  return [
    {
      action: decorateEmbeddedValue,
      props: {
        badge: getEmbeddedBadge(match),
        description: `${match.label} · ${match.description}`,
      },
    },
  ];
}

function handleRenderMenu(items: MenuItem[]) {
  const selectionPath = extractPath(currentSelection.value);
  return [
    ...items,
    { type: 'separator' as const },
    {
      type: 'button' as const,
      text: '在中栏查看',
      title: `查看 ${selectionPath.length ? selectionPath.join('.') : '$'} 节点`,
      onClick: () => {
        emit('activate', props.side);
        emit('selection-change', {
          side: props.side,
          path: selectionPath,
        });
      },
    },
  ];
}

function handleClassName(path: JsonPathSegment[], value: unknown) {
  const match = matchEmbeddedEditor({
    side: props.side,
    path,
    value,
    root: rootDocument.value,
    base: props.baseDocument,
    delta: props.deltaDocument,
  });

  if (match.kind === 'json') {
    return undefined;
  }

  return `delta-editor-node delta-editor-node--${match.kind} delta-editor-node--${match.layer}`;
}

onMounted(() => {
  if (!containerRef.value) {
    return;
  }

  editorInstance = createJSONEditor({
    target: containerRef.value,
    props: {
      content: { json: cloneDeep(currentJson.value) },
      mode: mode.value,
      navigationBar: true,
      statusBar: true,
      mainMenuBar: true,
      onChange: handleChange,
      onSelect: handleSelect,
      onRenderValue: handleRenderValue,
      onRenderMenu: handleRenderMenu,
      onClassName: handleClassName,
      onFocus: () => emit('activate', props.side),
    },
  });
});

watch(mode, (value) => {
  editorInstance?.updateProps({ mode: value });
});

watch(
  () => props.modelValue,
  (value) => {
    if (isEqual(value, currentJson.value)) {
      return;
    }
    currentJson.value = cloneDeep(value);
    editorInstance?.updateProps({
      content: { json: cloneDeep(value) },
    });
  },
  { deep: true },
);

watch(
  () => [props.baseDocument, props.deltaDocument],
  () => {
    editorInstance?.updateProps({
      onRenderValue: handleRenderValue,
      onClassName: handleClassName,
    });
  },
  { deep: true },
);

onBeforeUnmount(() => {
  if (editorInstance) {
    void editorInstance.destroy();
    editorInstance = null;
  }
});
</script>

<style scoped lang="less">
.delta-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #d7dee8;
  border-radius: 18px;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.delta-pane__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #e5eaf1;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #11203a;
  }

  p {
    margin: 6px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: #61708a;
  }
}

.delta-pane__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.delta-pane__side {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: #ecfdf5;
  color: #047857;
}

.delta-pane__mode {
  border: 1px solid #cad5e2;
  border-radius: 999px;
  padding: 6px 12px;
  background: #fff;
  color: #253046;
}

.delta-pane__editor {
  flex: 1;
  min-height: 0;
}

:deep(.delta-embedded-value) {
  position: relative;
}

:deep(.delta-embedded-value::after) {
  content: attr(data-delta-badge);
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: #e8f1ff;
  color: #194185;
}

:deep(.delta-editor-node--process .jse-value) {
  background: rgba(217, 70, 239, 0.08);
}

:deep(.delta-editor-node--value .jse-value) {
  background: rgba(16, 185, 129, 0.08);
}
</style>
