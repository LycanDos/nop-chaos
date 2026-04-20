<template>
  <div ref="containerRef" class="monaco-code-viewer" />
</template>

<script setup lang="ts">
import type { editor } from 'monaco-editor'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ensureMonacoConfigured } from '../utils/monaco-setup'

interface Props {
  modelValue: string
  language: string
  readOnly?: boolean
  highlightRuleId?: string
  highlightPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: true
})

const emit = defineEmits<{
  'rule-focus': [value: { ruleId?: string; path?: string }]
}>()

const containerRef = ref<HTMLElement | null>(null)
let monacoEditor: editor.IStandaloneCodeEditor | null = null
let monacoModel: editor.ITextModel | null = null
let highlightDecorations: string[] = []

function getEditorValue() {
  return monacoModel?.getValue() ?? ''
}

function getEscapedAttribute(value?: string) {
  if (!value)
    return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
}

function findHighlightedRuleRange() {
  if (!monacoModel)
    return null

  const lines = monacoModel.getLinesContent()
  const escapedRuleId = getEscapedAttribute(props.highlightRuleId)
  const escapedPath = getEscapedAttribute(props.highlightPath)

  if (!escapedRuleId && !escapedPath)
    return null

  let startLine = -1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const matchesRule = !!escapedRuleId && line.includes(`<rule id="${escapedRuleId}"`)
    const matchesPath = !!escapedPath && line.includes(`path="${escapedPath}"`)
    if ((escapedRuleId && matchesRule) || (!escapedRuleId && matchesPath)) {
      startLine = index + 1
      break
    }
  }

  if (startLine === -1)
    return null

  let endLine = startLine
  for (let index = startLine - 1; index < lines.length; index += 1) {
    if (lines[index].includes('</rule>')) {
      endLine = index + 1
      break
    }
  }

  return {
    startLineNumber: startLine,
    endLineNumber: endLine,
    startColumn: 1,
    endColumn: monacoModel.getLineMaxColumn(endLine)
  }
}

function updateHighlight() {
  if (!monacoEditor || !monacoModel)
    return

  const range = findHighlightedRuleRange()
  highlightDecorations = monacoEditor.deltaDecorations(highlightDecorations, range
    ? [{
        range,
        options: {
          isWholeLine: true,
          className: 'monaco-code-viewer__active-line'
        }
      }]
    : [])

  if (range)
    monacoEditor.revealLineInCenter(range.startLineNumber)
}

function extractRuleInfoFromLine(lineNumber: number) {
  if (!monacoModel)
    return {}

  for (let currentLine = lineNumber; currentLine >= 1; currentLine -= 1) {
    const line = monacoModel.getLineContent(currentLine)
    if (!line.includes('<rule '))
      continue

    const ruleId = line.match(/\bid="([^"]+)"/)?.[1]
    const path = line.match(/\bpath="([^"]+)"/)?.[1]
    return { ruleId, path }
  }

  return {}
}

onMounted(() => {
  if (!containerRef.value)
    return

  const monaco = ensureMonacoConfigured()
  monacoModel = monaco.editor.createModel(props.modelValue, props.language)
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
      indentation: true
    },
    bracketPairColorization: {
      enabled: true
    },
    folding: true,
    wordWrap: 'on',
    renderWhitespace: 'selection'
  })

  monacoEditor.onDidChangeCursorPosition((event) => {
    emit('rule-focus', extractRuleInfoFromLine(event.position.lineNumber))
  })

  updateHighlight()
})

watch(() => props.modelValue, (value) => {
  if (!monacoModel || value === getEditorValue())
    return
  monacoModel.setValue(value)
  updateHighlight()
})

watch(() => props.language, (language) => {
  if (monacoModel)
    ensureMonacoConfigured().editor.setModelLanguage(monacoModel, language)
})

watch(() => props.readOnly, (readOnly) => {
  monacoEditor?.updateOptions({ readOnly })
})

watch(() => [props.highlightRuleId, props.highlightPath], () => {
  updateHighlight()
})

onBeforeUnmount(() => {
  monacoEditor?.dispose()
  monacoModel?.dispose()
  monacoEditor = null
  monacoModel = null
})
</script>

<style scoped>
.monaco-code-viewer {
  min-height: 560px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

:global(.monaco-code-viewer__active-line) {
  background: rgba(64, 158, 255, 0.14);
  border-radius: 4px;
  box-shadow: inset 3px 0 0 #409eff;
}
</style>
