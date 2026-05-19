<template>
  <div class="quill-editor-shell" :class="{ compact: compact }">
    <div class="quill-toolbar-wrap">
      <div :id="toolbarId" class="quill-toolbar">
        <span class="ql-formats">
          <select class="ql-font">
            <option value="sans">无衬线</option>
            <option value="serif">衬线</option>
            <option value="mono">等宽</option>
            <option value="song">宋体</option>
            <option value="hei">黑体</option>
            <option value="kai">楷体</option>
            <option value="fang">仿宋</option>
          </select>
          <select class="ql-size">
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="22px">22</option>
            <option value="28px">28</option>
            <option value="36px">36</option>
            <option value="48px">48</option>
          </select>
          <select class="ql-lineheight">
            <option value="1">1.0</option>
            <option value="1.2">1.2</option>
            <option value="1.5">1.5</option>
            <option value="1.75">1.75</option>
            <option value="2">2.0</option>
            <option value="2.5">2.5</option>
          </select>
          <select class="ql-letterspacing">
            <option value="normal">字距</option>
            <option value="0px">0</option>
            <option value="0.5px">0.5</option>
            <option value="1px">1</option>
            <option value="2px">2</option>
            <option value="4px">4</option>
          </select>
        </span>

        <span class="ql-formats">
          <button class="ql-bold"></button>
          <button class="ql-italic"></button>
          <button class="ql-underline"></button>
          <button class="ql-strike"></button>
        </span>

        <span class="ql-formats">
          <select class="ql-color"></select>
          <select class="ql-background"></select>
        </span>

        <span class="ql-formats">
          <button class="ql-script" value="sub"></button>
          <button class="ql-script" value="super"></button>
        </span>

        <span class="ql-formats">
          <button class="ql-list" value="ordered"></button>
          <button class="ql-list" value="bullet"></button>
          <button class="ql-indent" value="-1"></button>
          <button class="ql-indent" value="+1"></button>
        </span>

        <span class="ql-formats">
          <select class="ql-align"></select>
        </span>

        <span class="ql-formats">
          <button class="ql-link"></button>
          <button class="ql-clean"></button>
        </span>
      </div>
    </div>

    <div ref="editorRef" class="quill-editor"></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLElement | null>(null)
const toolbarId = `quill_toolbar_${Math.random().toString(36).slice(2, 8)}`
let quill: Quill | null = null

const Font = Quill.import('formats/font') as any
Font.whitelist = ['sans', 'serif', 'mono', 'song', 'hei', 'kai', 'fang']
Quill.register(Font, true)

const SizeStyle = Quill.import('attributors/style/size') as any
SizeStyle.whitelist = ['12px', '14px', '16px', '18px', '22px', '28px', '36px', '48px']
Quill.register(SizeStyle, true)

const Parchment = Quill.import('parchment') as any
const StyleAttributor = Parchment.Attributor?.Style
const lineHeightStyle = new StyleAttributor('lineheight', 'line-height', {
  scope: Parchment.Scope.INLINE,
  whitelist: ['1', '1.2', '1.5', '1.75', '2', '2.5']
})
const letterSpacingStyle = new StyleAttributor('letterspacing', 'letter-spacing', {
  scope: Parchment.Scope.INLINE,
  whitelist: ['normal', '0px', '0.5px', '1px', '2px', '4px']
})
Quill.register(lineHeightStyle, true)
Quill.register(letterSpacingStyle, true)

onMounted(() => {
  if (!editorRef.value) {
    return
  }

  quill = new Quill(editorRef.value, {
    theme: 'snow',
    placeholder: props.placeholder || '输入内容…',
    modules: {
      toolbar: {
        container: `#${toolbarId}`
      },
      clipboard: {
        matchVisual: false
      },
      history: {
        delay: 300,
        maxStack: 100,
        userOnly: true
      }
    }
  })

  if (props.modelValue) {
    quill.clipboard.dangerouslyPasteHTML(props.modelValue)
  }

  quill.on('text-change', () => {
    emit('update:modelValue', quill?.root.innerHTML || '')
  })
})

watch(() => props.modelValue, (val) => {
  if (!quill || val === undefined || val === quill.root.innerHTML) {
    return
  }

  const selection = quill.getSelection()
  quill.clipboard.dangerouslyPasteHTML(val)
  if (selection) {
    quill.setSelection(selection.index, selection.length, 'silent')
  }
})

onBeforeUnmount(() => {
  quill = null
})

defineExpose({
  getHTML: () => quill?.root?.innerHTML || '',
  focus: () => nextTick(() => quill?.focus()),
  getEditor: () => quill
})
</script>

<style scoped>
.quill-editor-shell {
  display: flex;
  flex-direction: column;
  min-height: 180px;
  border: 1px solid #ccd5e1;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.quill-editor-shell.compact {
  min-height: 60px;
  border-radius: 0;
  border: none;
}
.quill-editor-shell.compact .quill-toolbar-wrap {
  display: none;
}

.quill-toolbar-wrap {
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #fff, #f8fafc);
}

.quill-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
}

.quill-editor {
  flex: 1;
  min-height: 140px;
}

.quill-editor-shell :deep(.ql-toolbar.ql-snow) {
  border: none;
  padding: 0;
}

.quill-editor-shell :deep(.ql-container.ql-snow) {
  border: none;
  font-family: 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.quill-editor-shell.compact :deep(.ql-editor) {
  min-height: 40px;
  font-size: 13px;
}
.quill-editor-shell :deep(.ql-editor) {
  min-height: 140px;
  font-size: 14px;
  line-height: 1.6;
  padding: 12px 14px;
}

.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-label[data-value='sans']::before),
.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-item[data-value='sans']::before) {
  content: '无衬线';
}

.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-label[data-value='serif']::before),
.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-item[data-value='serif']::before) {
  content: '衬线';
}

.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-label[data-value='mono']::before),
.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-item[data-value='mono']::before) {
  content: '等宽';
}

.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-label[data-value='song']::before),
.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-item[data-value='song']::before) {
  content: '宋体';
}

.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-label[data-value='hei']::before),
.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-item[data-value='hei']::before) {
  content: '黑体';
}

.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-label[data-value='kai']::before),
.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-item[data-value='kai']::before) {
  content: '楷体';
}

.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-label[data-value='fang']::before),
.quill-editor-shell :deep(.ql-picker.ql-font .ql-picker-item[data-value='fang']::before) {
  content: '仿宋';
}

.quill-editor-shell :deep(.ql-font-sans) {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.quill-editor-shell :deep(.ql-font-serif) {
  font-family: 'Times New Roman', 'Songti SC', serif;
}

.quill-editor-shell :deep(.ql-font-mono) {
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.quill-editor-shell :deep(.ql-font-song) {
  font-family: 'Songti SC', 'SimSun', serif;
}

.quill-editor-shell :deep(.ql-font-hei) {
  font-family: 'Microsoft YaHei', 'SimHei', sans-serif;
}

.quill-editor-shell :deep(.ql-font-kai) {
  font-family: 'KaiTi', 'Kaiti SC', serif;
}

.quill-editor-shell :deep(.ql-font-fang) {
  font-family: 'FangSong', 'STFangsong', serif;
}
</style>
