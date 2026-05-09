<template>
  <div ref="rootRef" class="json-preview-editor" :style="rootInlineStyle">
    <div class="json-preview-editor__toolbar" :style="toolbarInlineStyle">
      <span class="json-preview-editor__title">JSON 预览</span>
      <span class="json-preview-editor__summary">{{ summaryText }}</span>
    </div>

    <div class="json-preview-editor__body" :style="bodyInlineStyle">
      <div
        class="json-preview-editor__content"
        :style="contentInlineStyle"
        v-text="displayText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

interface Props {
  modelValue: unknown
  readOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: true,
})

const rootRef = ref<HTMLElement | null>(null)

const normalizedValue = computed(() => normalizeJsonValue(props.modelValue))

const summaryText = computed(() => {
  const value = normalizedValue.value

  if (Array.isArray(value)) {
    return `Array(${value.length})`
  }

  if (value && typeof value === 'object') {
    return `Object(${Object.keys(value as Record<string, unknown>).length})`
  }

  if (value == null) {
    return 'empty'
  }

  return typeof value
})

const displayText = computed(() => {
  const value = normalizedValue.value

  try {
    const text = JSON.stringify(value, null, 2)
    return text == null || text === '' ? '{}' : text
  } catch (error) {
    console.warn('[ClarDebug][JsonPreviewEditor] stringify failed', error)
    return String(value ?? '{}')
  }
})

const rootInlineStyle = 'display:flex !important; flex-direction:column !important; height:100% !important; min-height:0 !important; background:#ffffff !important; position:relative !important; z-index:1 !important;'
const toolbarInlineStyle = 'display:flex !important; align-items:center !important; justify-content:space-between !important; gap:8px !important; padding:8px 10px !important; border-bottom:1px solid #dcdfe6 !important; background:#f5f7fa !important; color:#303133 !important; font-size:12px !important;'
const bodyInlineStyle = 'flex:1 1 auto !important; min-height:0 !important; overflow:auto !important; background:#ffffff !important; position:relative !important;'
const contentInlineStyle = 'display:block !important; width:100% !important; min-height:100% !important; box-sizing:border-box !important; margin:0 !important; padding:10px 12px !important; color:#111111 !important; background:#ffffff !important; border:0 !important; outline:0 !important; white-space:pre-wrap !important; word-break:break-word !important; font-size:12px !important; line-height:1.5 !important; font-family:Menlo, Monaco, Consolas, \"Courier New\", monospace !important; opacity:1 !important; visibility:visible !important; position:relative !important; z-index:2 !important; -webkit-text-fill-color:#111111 !important;'

console.log('[ClarDebug][JsonPreviewEditor] module loaded')

onMounted(() => {
  nextTick(() => {
    logDomState('mounted')
  })
})

watch(displayText, () => {
  nextTick(() => {
    logDomState('displayText changed')
  })
})

function normalizeJsonValue(value: unknown) {
  if (value == null) {
    return {}
  }

  try {
    return structuredClone(value)
  } catch {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return value
    }
  }
}

function logDomState(stage: string) {
  const root = rootRef.value
  const body = root?.querySelector('.json-preview-editor__body') as HTMLElement | null
  const content = root?.querySelector('.json-preview-editor__content') as HTMLElement | null
  const preview = root?.closest('.variable-json-preview') as HTMLElement | null
  const panel = root?.closest('.variable-panel') as HTMLElement | null
  const rootRect = root?.getBoundingClientRect()
  const bodyRect = body?.getBoundingClientRect()
  const contentRect = content?.getBoundingClientRect()
  const contentComputed = content ? window.getComputedStyle(content) : null
  const previewComputed = preview ? window.getComputedStyle(preview) : null
  const panelComputed = panel ? window.getComputedStyle(panel) : null
  const probeX = bodyRect ? Math.max(0, Math.floor(bodyRect.left + Math.min(20, bodyRect.width / 2))) : 0
  const probeY = bodyRect ? Math.max(0, Math.floor(bodyRect.top + Math.min(20, bodyRect.height / 2))) : 0
  const elementsAtPoint = bodyRect
    ? document.elementsFromPoint(probeX, probeY).slice(0, 8).map((node) => {
        const element = node as HTMLElement
        return {
          tag: element.tagName,
          className: element.className,
        }
      })
    : []

  console.log('[ClarDebug][JsonPreviewEditor] instance', {
    stage,
    hasRoot: !!root,
    rootClass: root?.className,
    summaryText: summaryText.value,
    displayTextLength: displayText.value.length,
    rootRect: rootRect
      ? {
          width: rootRect.width,
          height: rootRect.height,
        }
      : null,
    bodyRect: bodyRect
      ? {
          width: bodyRect.width,
          height: bodyRect.height,
        }
      : null,
    contentRect: contentRect
      ? {
          width: contentRect.width,
          height: contentRect.height,
        }
      : null,
    contentTextPreview: content?.textContent?.slice(0, 120),
    bodyChildCount: body?.childElementCount ?? 0,
    probePoint: { x: probeX, y: probeY },
    bodyScrollTop: body?.scrollTop ?? null,
    bodyScrollHeight: body?.scrollHeight ?? null,
    bodyClientHeight: body?.clientHeight ?? null,
    previewComputed: previewComputed
      ? {
          display: previewComputed.display,
          visibility: previewComputed.visibility,
          opacity: previewComputed.opacity,
          overflow: previewComputed.overflow,
          position: previewComputed.position,
          zIndex: previewComputed.zIndex,
        }
      : null,
    panelComputed: panelComputed
      ? {
          display: panelComputed.display,
          visibility: panelComputed.visibility,
          opacity: panelComputed.opacity,
          overflow: panelComputed.overflow,
          position: panelComputed.position,
          zIndex: panelComputed.zIndex,
        }
      : null,
    contentComputed: contentComputed
      ? {
          display: contentComputed.display,
          visibility: contentComputed.visibility,
          opacity: contentComputed.opacity,
          color: contentComputed.color,
          backgroundColor: contentComputed.backgroundColor,
          webkitTextFillColor: (contentComputed as any).webkitTextFillColor,
          fontSize: contentComputed.fontSize,
          lineHeight: contentComputed.lineHeight,
        }
      : null,
    elementsAtPoint,
  })
}
</script>

<style scoped lang="scss">
.json-preview-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #ffffff;
}

.json-preview-editor__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: #f5f7fa;
  color: #303133;
  font-size: 12px;
}

.json-preview-editor__title {
  font-weight: 600;
}

.json-preview-editor__summary {
  color: #909399;
}

.json-preview-editor__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #ffffff;
}

.json-preview-editor__content {
  min-height: 100%;
  font-size: 12px;
  font-family: Menlo, Monaco, Consolas, 'Courier New', monospace;
}
</style>
