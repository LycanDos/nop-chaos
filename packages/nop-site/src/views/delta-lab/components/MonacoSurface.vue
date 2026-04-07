<template>
  <div ref="containerRef" class="delta-monaco-surface"></div>
</template>

<script setup lang="ts">
import type { editor } from 'monaco-editor';

import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { ensureMonacoConfigured } from '../model/monacoSetup';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    language: string;
    readOnly?: boolean;
  }>(),
  {
    readOnly: false,
  },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
let monacoEditor: editor.IStandaloneCodeEditor | null = null;
let monacoModel: editor.ITextModel | null = null;
let isApplyingExternalValue = false;

function getEditorValue() {
  return monacoModel?.getValue() ?? '';
}

onMounted(() => {
  const monaco = ensureMonacoConfigured();
  if (!containerRef.value) {
    return;
  }

  monacoModel = monaco.editor.createModel(props.modelValue, props.language);
  monacoEditor = monaco.editor.create(containerRef.value, {
    model: monacoModel,
    theme: 'vs',
    minimap: { enabled: false },
    lineNumbers: 'on',
    tabSize: 2,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    readOnly: props.readOnly,
    fontSize: 13,
    wordWrap: 'on',
  });

  monacoEditor.onDidChangeModelContent(() => {
    if (isApplyingExternalValue) {
      return;
    }
    emit('update:modelValue', getEditorValue());
  });
});

watch(
  () => props.modelValue,
  (value) => {
    if (!monacoModel || value === getEditorValue()) {
      return;
    }
    isApplyingExternalValue = true;
    monacoModel.setValue(value);
    isApplyingExternalValue = false;
  },
);

watch(
  () => props.language,
  (language) => {
    if (monacoModel) {
      ensureMonacoConfigured().editor.setModelLanguage(monacoModel, language);
    }
  },
);

watch(
  () => props.readOnly,
  (readOnly) => {
    monacoEditor?.updateOptions({ readOnly });
  },
);

onBeforeUnmount(() => {
  monacoEditor?.dispose();
  monacoModel?.dispose();
  monacoEditor = null;
  monacoModel = null;
});
</script>

<style scoped lang="less">
.delta-monaco-surface {
  height: 100%;
  min-height: 280px;
  border: 1px solid #d6dbe4;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f7fafc 100%);
}
</style>
