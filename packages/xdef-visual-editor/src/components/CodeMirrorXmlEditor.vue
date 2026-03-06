<template>
  <div class="codemirror-wrapper" ref="wrapperRef">
    <codemirror
      v-model="editorValue"
      :style="editorStyle"
      :extensions="extensions"
      :autofocus="false"
      :disabled="disabled"
      @ready="handleReady"
      @update:modelValue="handleUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { EditorView, keymap, Decoration, ViewUpdate, ViewPlugin } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'
import { xml } from '@codemirror/lang-xml'
import { oneDark } from '@codemirror/theme-one-dark'
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches } from '@codemirror/search'
import { autocompletion } from '@codemirror/autocomplete'
import { bracketMatching } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'

interface Props {
  modelValue: string
  disabled?: boolean
  activeCheckId?: string | null
  activeField?: string | null
  placeholder?: string
  showHighlight?: boolean
  highlightSource?: 'left' | 'right' | null
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '在此编辑 XML...',
  showHighlight: false,
  highlightSource: null
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'cursor-change': [position: { line: number; ch: number }]
  'click-position': [position: { line: number; text: string }]
}>()

// CodeMirror 实例和状态
const wrapperRef = ref<HTMLElement>()
const editorView = ref<EditorView | null>(null)
const editorValue = ref(props.modelValue || '')
const isInternalUpdate = ref(false)
const isUpdatingFromLeft = ref(false)
const isHighlightUpdate = ref(false)

// 编辑器样式
const editorStyle = computed(() => ({
  height: '100%',
  fontFamily: '"Fira Code", "Monaco", "Menlo", "Courier New", monospace',
  fontSize: '13px'
}))

// 当前光标位置
const cursorPosition = ref<{ line: number; ch: number } | null>(null)

// 创建装饰器（高亮）
const createHighlightDecorations = (state: any) => {
  const decorations: any[] = []

  console.log('=== createHighlightDecorations 开始 ===')
  console.log('isUpdatingFromLeft:', isUpdatingFromLeft.value)
  console.log('showHighlight:', props.showHighlight)
  console.log('highlightSource:', props.highlightSource)
  console.log('activeCheckId:', props.activeCheckId)
  console.log('activeField:', props.activeField)
  console.log('state:', state)
  console.log('state.doc:', state?.doc)

  // 只有在 highlightSource 为 'left' 时才显示高亮（即左侧编辑时）
  const shouldShowHighlight = props.showHighlight && props.activeCheckId && props.highlightSource === 'left'
  console.log('shouldShowHighlight:', shouldShowHighlight)

  if (!shouldShowHighlight) {
    console.log('不显示高亮（highlightSource 不是 left），返回空装饰器')
    return Decoration.set(decorations)
  }

  console.log('将显示高亮（左侧编辑触发的）')

  if (!state || !state.doc) {
    console.log('跳过高亮：缺少必要的参数')
    return Decoration.set(decorations)
  }

  const doc = state.doc
  const lines = doc.toString().split('\n')
  console.log('总行数:', lines.length)

  let inTargetCheck = false
  let checkIndent = 0
  let foundTargetCheck = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const from = doc.line(i + 1).from

    // 检查是否是目标 check 标签
    const startMatch = line.match(/<check[^>]*id="([^"]*)"/)

    if (startMatch) {
      const matchedId = startMatch[1]
      console.log(`行 ${i + 1}: 找到 check 标签，ID="${matchedId}"，目标ID="${props.activeCheckId}"`)

      if (matchedId === props.activeCheckId) {
        inTargetCheck = true
        checkIndent = line.search(/\S/)
        foundTargetCheck = true
        console.log(`行 ${i + 1}: 匹配目标 check，缩进=${checkIndent}，添加行高亮`)
        // 高亮 check 标签行
        decorations.push(
          Decoration.line({
            class: 'cm-highlight-line'
          }).range(from)
        )

        // 如果有激活的字段，尝试高亮
        if (props.activeField) {
          const fieldDecorations = highlightFieldInLine(line, from, props.activeField)
          decorations.push(...fieldDecorations)
          console.log(`行 ${i + 1}: 添加了 ${fieldDecorations.length} 个字段装饰器`)
        }
        continue
      } else {
        inTargetCheck = false
      }
    }

    // 处理 check 内的内容
    if (inTargetCheck) {
      if (line.trim().startsWith('</check>')) {
        // 高亮结束标签
        decorations.push(
          Decoration.line({
            class: 'cm-highlight-line'
          }).range(from)
        )
        inTargetCheck = false
        console.log(`行 ${i + 1}: 检测到结束标签，添加行高亮`)
      } else {
        const currentIndent = line.search(/\S/)
        if (currentIndent > checkIndent && line.trim()) {
          // 高亮 check 内容行
          decorations.push(
            Decoration.line({
              class: 'cm-highlight-content'
            }).range(from)
          )

          // 如果有激活的字段，尝试高亮
          if (props.activeField) {
            const fieldDecorations = highlightFieldInLine(line, from, props.activeField)
            decorations.push(...fieldDecorations)
            if (fieldDecorations.length > 0) {
              console.log(`行 ${i + 1}: 添加了 ${fieldDecorations.length} 个字段装饰器`)
            }
          }
        }
      }
    }
  }

  console.log(`=== createHighlightDecorations 结束，找到目标check=${foundTargetCheck}，总装饰器数=${decorations.length} ===`)
  return Decoration.set(decorations)
}

// 在行中高亮字段
const highlightFieldInLine = (line: string, lineFrom: number, field: string): any[] => {
  const decorations: any[] = []

  console.log(`  highlightFieldInLine: field="${field}", line="${line.trim()}"`)

  // 根据字段类型创建不同的高亮模式
  const patterns: Record<string, RegExp> = {
    'id': /id="([^"]*)"/,
    'errorCode': /errorCode="([^"]*)"/,
    'errorDescription': /errorDescription="([^"]*)"/,
    'severity': /severity="([^"]*)"/,
    'name': /name="([^"]*)"/,
    'value': /value="([^"]*)"/,
    'min': /min="([^"]*)"/,
    'max': /max="([^"]*)"/,
    'pattern': /pattern="([^"]*)"/
  }

  const pattern = patterns[field]
  if (!pattern) {
    console.log(`  highlightFieldInLine: 没有找到字段 "${field}" 的模式`)
    return decorations
  }

  const match = line.match(pattern)
  console.log(`  highlightFieldInLine: 匹配结果=`, match)

  if (match) {
    const fullMatch = match[0]
    const valueStart = match.index! + fullMatch.indexOf(match[1])
    const valueEnd = valueStart + match[1].length

    console.log(`  highlightFieldInLine: 添加字段装饰器，位置 ${lineFrom + valueStart}-${lineFrom + valueEnd}`)

    decorations.push(
      Decoration.mark({
        class: 'cm-highlight-field'
      }).range(lineFrom + valueStart, lineFrom + valueEnd)
    )
  }

  return decorations
}

// 创建 StateEffect 来触发装饰器更新
const updateHighlightEffect = StateEffect.define<null>({})

// 创建高亮扩展
const highlightField = StateField.define<DecorationSet>({
  create(state) {
    console.log('=== StateField.create 被调用 ===')
    return createHighlightDecorations(state)
  },
  update(decorations, tr) {
    console.log('=== StateField.update 被调用 ===')
    console.log('tr.docChanged:', tr.docChanged)
    console.log('tr.viewportChanged:', tr.viewportChanged)
    console.log('tr.selectionSet:', tr.selectionSet)
    console.log('tr.effects.length:', tr.effects.length)

    // 检查是否有更新高亮的 effect
    const hasUpdateEffect = tr.effects.some(effect => {
      const isMatch = effect.is(updateHighlightEffect)
      console.log('  effect.is(updateHighlightEffect):', isMatch)
      return isMatch
    })
    console.log('hasUpdateEffect:', hasUpdateEffect)

    // 在文档、视口、选择变化或有更新 effect 时更新
    if (tr.docChanged || tr.viewportChanged || tr.selectionSet || hasUpdateEffect) {
      console.log('触发装饰器更新')
      return createHighlightDecorations(tr.state)
    }

    console.log('不更新装饰器')
    return decorations
  },
  provide: f => EditorView.decorations.from(f)
})

// 自定义主题（包含高亮样式）
const customTheme = EditorView.theme({
  '.cm-highlight-line': {
    backgroundColor: '#fff7e6 !important',
    borderLeft: '3px solid #faad14 !important',
    paddingLeft: '0.5em !important'
  },
  '.cm-highlight-content': {
    backgroundColor: '#fffbe6 !important'
  },
  '.cm-highlight-field': {
    backgroundColor: '#ffeb3b !important',
    color: '#333 !important',
    fontWeight: 'bold !important',
    borderRadius: '2px !important',
    padding: '0 4px !important'
  }
})

// 创建编辑器扩展
const extensions = computed(() => [
  history(),
  xml(),
  oneDark,
  highlightField, // 将 highlightField 放在 customTheme 之前
  customTheme,    // 确保 customTheme 在最后，覆盖其他主题
  keymap.of([
    ...defaultKeymap,
    ...historyKeymap,
    ...closeBracketsKeymap,
    indentWithTab
  ]),
  bracketMatching(),
  closeBrackets(),
  highlightSelectionMatches(),
  autocompletion(),
  EditorView.domEventHandlers({
    click(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos !== null) {
        const line = view.state.doc.lineAt(pos)
        const lineText = line.text
        const offsetInLine = pos - line.from // 点击位置在行内的偏移量

        console.log('点击行:', line.number, '文本:', lineText)
        console.log('点击位置偏移:', offsetInLine, '总位置:', pos)

        // 解析点击的行，尝试找到 check ID 和字段
        const checkMatch = lineText.match(/<check[^>]*id="([^"]*)"/)
        if (checkMatch) {
          const checkId = checkMatch[1]
          console.log('点击了 check 标签，ID:', checkId)
          emit('click-position', { line: line.number, text: lineText, checkId, offsetInLine })
        } else {
          // 检查是否在 check 内部
          emit('click-position', { line: line.number, text: lineText, offsetInLine })
        }
      }
    }
  }),
  EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.selectionSet) {
      console.log('=== 选择变化 ===')
      console.log('isUpdatingFromLeft:', isUpdatingFromLeft.value)

      // 当用户在右侧编辑器中移动光标时，清除左侧高亮标志
      if (isUpdatingFromLeft.value) {
        console.log('用户在右侧移动光标，清除 isUpdatingFromLeft 标志')
        isUpdatingFromLeft.value = false
      }

      const state = update.state
      const pos = state.selection.main.head
      const line = state.doc.lineAt(pos)

      cursorPosition.value = {
        line: line.number,
        ch: pos - line.from
      }

      emit('cursor-change', cursorPosition.value)
    }
  })
])

// 编辑器准备就绪
const handleReady = (payload: { view: EditorView }) => {
  editorView.value = payload.view
  console.log('CodeMirror 编辑器已初始化')

  // 如果有激活的 check 或字段，立即触发高亮更新
  if (props.activeCheckId || props.activeField) {
    console.log('编辑器初始化后触发高亮更新:', {
      activeCheckId: props.activeCheckId,
      activeField: props.activeField
    })
    setTimeout(() => {
      editorView.value?.dispatch({
        effects: updateHighlightEffect.of(null)
      })
    }, 50)
  }
}

// 处理编辑器更新
const handleUpdate = (value: string) => {
  console.log('=== handleUpdate 被调用 ===')
  console.log('输入值:', value)
  console.log('isInternalUpdate:', isInternalUpdate.value)
  console.log('isUpdatingFromLeft:', isUpdatingFromLeft.value)

  if (isInternalUpdate.value) {
    console.log('是内部更新，跳过')
    isInternalUpdate.value = false
    return
  }

  // 这是右侧编辑导致的更新，清除标志
  console.log('右侧编辑导致的更新，清除 isUpdatingFromLeft 标志')
  isUpdatingFromLeft.value = false
  emit('update:modelValue', value)
}

// 更新编辑器内容
const updateEditorContent = (content: string) => {
  isInternalUpdate.value = true
  editorValue.value = content
}

// 获取当前光标位置的文本
const getCurrentLineText = (): string => {
  if (!cursorPosition.value || !editorView.value) {
    return ''
  }
  const { line } = cursorPosition.value
  return editorView.value.state.doc.line(line).text
}

// 获取编辑器内容
const getEditorContent = (): string => {
  return editorValue.value
}

// 触发高亮更新
const triggerHighlight = () => {
  console.log('=== triggerHighlight 被调用 ===')
  console.log('editorView.value:', editorView.value)
  console.log('updateHighlightEffect:', updateHighlightEffect)

  if (editorView.value) {
    console.log('准备 dispatch effect')
    console.log('updateHighlightEffect.of(null):', updateHighlightEffect.of(null))

    const effect = updateHighlightEffect.of(null)
    console.log('创建的 effect:', effect)
    console.log('effect.is(updateHighlightEffect):', effect.is(updateHighlightEffect))

    editorView.value.dispatch({
      effects: effect
    })

    console.log('✅ effect 已 dispatch')
  } else {
    console.log('❌ editorView 为 null，无法触发高亮')
  }
}

// 暴露方法
defineExpose({
  updateEditorContent,
  getCurrentLineText,
  getEditorContent,
  getCursorPosition: () => cursorPosition.value,
  getEditorView: () => editorView.value,
  getUpdateHighlightEffect: updateHighlightEffect,
  triggerHighlight
})

// 监听 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  if (newVal !== editorValue.value) {
    isInternalUpdate.value = true
    editorValue.value = newVal || ''
  }
})

// 监听 activeCheckId 和 activeField 变化，更新高亮
watch([() => props.activeCheckId, () => props.activeField], ([newCheckId, newField], [oldCheckId, oldField]) => {
  console.log('=== activeCheckId/activeField 变化 ===')
  console.log('旧值:', { oldCheckId, oldField })
  console.log('新值:', { newCheckId, newField })
  console.log('props.activeCheckId:', props.activeCheckId)
  console.log('props.activeField:', props.activeField)
  console.log('editorView.value:', editorView.value)

  if (editorView.value) {
    console.log('触发高亮更新:', { newCheckId, newField })
    // 触发装饰器更新
    editorView.value.dispatch({
      effects: updateHighlightEffect.of(null)
    })
    console.log('高亮更新已触发')
  } else {
    console.log('editorView 还未初始化，等待初始化后触发高亮')
    // 等待编辑器初始化后再触发
    setTimeout(() => {
      if (editorView.value) {
        console.log('延迟触发高亮更新:', { newCheckId, newField })
        editorView.value.dispatch({
          effects: updateHighlightEffect.of(null)
        })
      } else {
        console.log('延迟触发失败，editorView 仍然为 null')
      }
    }, 100)
  }
}, { immediate: true, deep: true })

// 单独监听每个 prop 以确保变化被捕获
watch(() => props.activeCheckId, (newVal, oldVal) => {
  console.log('=== props.activeCheckId 变化 ===')
  console.log('旧值:', oldVal)
  console.log('新值:', newVal)
})

watch(() => props.activeField, (newVal, oldVal) => {
  console.log('=== props.activeField 变化 ===')
  console.log('旧值:', oldVal)
  console.log('新值:', newVal)
})

// 使用 watchEffect 监听 props 变化并立即触发高亮
watchEffect((onCleanup) => {
  console.log('=== watchEffect 被调用 ===')
  console.log('props.activeCheckId:', props.activeCheckId)
  console.log('props.activeField:', props.activeField)
  console.log('editorView.value:', editorView.value)

  if (props.activeCheckId && editorView.value) {
    console.log('watchEffect 触发高亮更新')
    const timer = setTimeout(() => {
      if (editorView.value) {
        console.log('watchEffect 延迟触发高亮')
        editorView.value.dispatch({
          effects: updateHighlightEffect.of(null)
        })
      }
    }, 50)
    onCleanup(() => clearTimeout(timer))
  }
})
</script>

<style scoped>
.codemirror-wrapper {
  height: 100%;
  overflow: hidden;
}

.codemirror-wrapper :deep(.cm-editor) {
  height: 100%;
  font-size: 13px;
  line-height: 1.6;
}

.codemirror-wrapper :deep(.cm-scroller) {
  font-family: inherit;
  overflow: auto;
}

.codemirror-wrapper :deep(.cm-content) {
  padding: 8px 0;
  font-family: inherit;
}

.codemirror-wrapper :deep(.cm-gutters) {
  padding: 0;
}

.codemirror-wrapper :deep(.cm-line) {
  padding: 0 8px;
  min-height: 1.6em;
}

.codemirror-wrapper :deep(.cm-activeLine) {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>