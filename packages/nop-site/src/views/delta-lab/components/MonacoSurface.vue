<template>
  <div ref="containerRef" class="delta-monaco-surface"></div>
</template>

<script setup lang="ts">
  import type { editor } from 'monaco-editor';

  import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

  import { buildDeltaKeyDecorations } from '../model/deltaKeyDecorations';
  import { ensureMonacoConfigured } from '../model/monacoSetup';

  const props = withDefaults(
    defineProps<{
      modelValue: string;
      language: string;
      readOnly?: boolean;
      syntaxProfile?: 'default' | 'delta-json';
    }>(),
    {
      readOnly: false,
      syntaxProfile: 'default',
    }
  );

  const emit = defineEmits<{
    (_event: 'update:modelValue', _value: string): void;
    (_event: 'focus'): void;
  }>();

  const containerRef = ref<HTMLElement | null>(null);
  let monacoEditor: editor.IStandaloneCodeEditor | null = null;
  let monacoModel: editor.ITextModel | null = null;
  let isApplyingExternalValue = false;
  let decorationIds: string[] = [];

  function getEditorValue() {
    return monacoModel?.getValue() ?? '';
  }

  function applySyntaxDecorations() {
    if (!monacoEditor || !monacoModel) {
      return;
    }

    if (props.syntaxProfile !== 'delta-json') {
      decorationIds = monacoEditor.deltaDecorations(decorationIds, []);
      return;
    }

    decorationIds = monacoEditor.deltaDecorations(decorationIds, buildDeltaKeyDecorations(monacoModel));
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
      matchBrackets: 'always',
      guides: {
        bracketPairs: true,
        highlightActiveBracketPair: true,
      },
      bracketPairColorization: {
        enabled: true,
      },
      wordWrap: 'on',
    });

    monacoEditor.onDidChangeModelContent(() => {
      if (isApplyingExternalValue) {
        return;
      }
      applySyntaxDecorations();
      emit('update:modelValue', getEditorValue());
    });

    monacoEditor.onDidFocusEditorText(() => {
      emit('focus');
    });

    applySyntaxDecorations();
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
      applySyntaxDecorations();
    }
  );

  watch(
    () => props.language,
    (language) => {
      if (monacoModel) {
        ensureMonacoConfigured().editor.setModelLanguage(monacoModel, language);
      }
    }
  );

  watch(
    () => props.readOnly,
    (readOnly) => {
      monacoEditor?.updateOptions({ readOnly });
    }
  );

  watch(
    () => props.syntaxProfile,
    () => {
      applySyntaxDecorations();
    }
  );

  onBeforeUnmount(() => {
    monacoEditor?.dispose();
    monacoModel?.dispose();
    monacoEditor = null;
    monacoModel = null;
    decorationIds = [];
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

  :deep(.delta-monaco-token--delta-key) {
    font-weight: 600;
  }

  :deep(.delta-monaco-token--directive) {
    color: #9333ea;
    font-weight: 700;
  }

  :deep(.delta-monaco-token--path) {
    color: #0f766e;
  }

  :deep(.delta-monaco-token--dot) {
    color: #94a3b8;
  }

  :deep(.delta-monaco-token--bracket) {
    color: #1d4ed8;
    font-weight: 700;
  }

  :deep(.delta-monaco-token--operator) {
    color: #c2410c;
    font-weight: 700;
  }

  :deep(.delta-monaco-token--number) {
    color: #2563eb;
  }

  :deep(.delta-monaco-token--selector-string) {
    color: #b45309;
  }
</style>
