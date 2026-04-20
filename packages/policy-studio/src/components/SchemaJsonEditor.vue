<template>
  <div class="schema-json-editor">
    <div ref="containerRef" class="schema-json-editor__body" />
  </div>
</template>

<script setup lang="ts">
import type { Content, OnChangeStatus } from 'vanilla-jsoneditor'
import { createJSONEditor, Mode } from 'vanilla-jsoneditor'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { safeStructuredClone } from '../utils/clone-utils'

interface Props {
  modelValue: Record<string, any>
  readOnly?: boolean
  mode?: 'tree' | 'text' | 'table'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const containerRef = ref<HTMLElement | null>(null)
let editor: ReturnType<typeof createJSONEditor> | null = null

function resolveMode(mode?: 'tree' | 'text' | 'table') {
  if (mode === 'text')
    return Mode.text
  if (mode === 'table')
    return Mode.table
  return Mode.tree
}

function handleChange(content: Content, _previous: Content, _status: OnChangeStatus) {
  if (props.readOnly)
    return
  if ('json' in content && content.json && typeof content.json === 'object' && !Array.isArray(content.json))
    emit('update:modelValue', safeStructuredClone(content.json as Record<string, any>))
}

function mountEditor() {
  if (!containerRef.value)
    return

  editor = createJSONEditor({
    target: containerRef.value,
    props: {
      mode: resolveMode(props.mode),
      readOnly: props.readOnly ?? false,
      content: { json: safeStructuredClone(props.modelValue) },
      onChange: handleChange
    }
  })
}

watch(() => props.modelValue, async (value) => {
  await nextTick()
  editor?.updateProps({
    readOnly: props.readOnly ?? false,
    content: { json: safeStructuredClone(value) },
    mode: resolveMode(props.mode)
  })
}, { deep: true })

watch(() => [props.mode, props.readOnly], () => {
  editor?.updateProps({
    readOnly: props.readOnly ?? false,
    content: { json: safeStructuredClone(props.modelValue) },
    mode: resolveMode(props.mode)
  })
})

onMounted(() => {
  mountEditor()
})

onBeforeUnmount(() => {
  editor?.destroy()
  editor = null
})
</script>

<style scoped>
.schema-json-editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.schema-json-editor__body {
  min-height: 560px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
}

.schema-json-editor__body :deep(.jse-main) {
  min-height: 560px;
}
</style>
