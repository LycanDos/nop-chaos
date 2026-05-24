<template>
  <!-- 文本元素渲染 -->
  <div
    ref="editorRef"
    class="inline-text-editor"
    :class="{ 'is-editing': isEditing }"
    :style="containerStyle"
    @dblclick.stop="startEdit"
  >
    <!-- 非编辑模式：静态显示 -->
    <div
      v-if="!isEditing"
      class="text-display"
      :style="displayStyle"
      v-html="modelValue || '文本'"
    ></div>

    <!-- 编辑模式：Quill 编辑器 -->
    <div v-else class="text-edit-container">
      <div ref="quillContainerRef" class="quill-content"></div>
    </div>
  </div>

  <!-- 工具栏 Teleport 到文本元素上方 -->
  <Teleport to="body">
    <div
      v-if="isEditing && toolbarPos"
      class="inline-text-toolbar"
      :style="toolbarStyle"
    >
      <div class="toolbar-row">
        <button class="tb-done" @click="finishEdit" title="完成编辑">✓</button>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <button class="tb-btn" :class="{ active: isFormatActive('bold') }" @click="format('bold')" title="粗体"><b>B</b></button>
          <button class="tb-btn" :class="{ active: isFormatActive('italic') }" @click="format('italic')" title="斜体"><i>I</i></button>
          <button class="tb-btn" :class="{ active: isFormatActive('underline') }" @click="format('underline')" title="下划线"><u>U</u></button>
          <button class="tb-btn" :class="{ active: isFormatActive('strike') }" @click="format('strike')" title="删除线"><s>S</s></button>
        </span>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <span class="tb-lbl">字号</span>
          <span class="tb-adjs">
            <span class="tb-adj" @click="adjustFontSize(-1)">−</span>
            <span class="tb-adjv">{{ currentFontSize }}</span>
            <span class="tb-adj" @click="adjustFontSize(1)">+</span>
          </span>
        </span>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <span class="tb-lbl">行距</span>
          <span class="tb-adjs">
            <span class="tb-adj" @click="adjustLineHeight(-0.1)">−</span>
            <span class="tb-adjv">{{ currentLineHeight.toFixed(1) }}</span>
            <span class="tb-adj" @click="adjustLineHeight(0.1)">+</span>
          </span>
        </span>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <span class="tb-lbl">字距</span>
          <span class="tb-adjs">
            <span class="tb-adj" @click="adjustLetterSpacing(-0.5)">−</span>
            <span class="tb-adjv">{{ currentLetterSpacing.toFixed(1) }}</span>
            <span class="tb-adj" @click="adjustLetterSpacing(0.5)">+</span>
          </span>
        </span>
      </div>
      <div class="toolbar-row">
        <button class="tb-cancel" @click="cancelEdit" title="取消编辑">✕</button>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <select class="tb-sel" @change="onFontChange" title="字体">
            <option value="">默认字体</option>
            <option value="sans-serif">无衬线</option>
            <option value="serif">衬线</option>
            <option value="monospace">等宽</option>
            <option value="SimSun">宋体</option>
            <option value="SimHei">黑体</option>
            <option value="KaiTi">楷体</option>
            <option value="FangSong">仿宋</option>
            <option value="Microsoft YaHei">微软雅黑</option>
          </select>
        </span>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <button class="tb-btn tb-clr" :style="{ color: currentColor }" @click="showColorPicker = showColorPicker === 'color' ? '' : 'color'" title="文字颜色">A</button>
          <div v-if="showColorPicker === 'color'" class="tb-cpop" @mouseleave="showColorPicker = ''">
            <span v-for="c in colors" :key="c" class="tb-csw" :style="{ background: c }" @click="setColor('color', c)"></span>
            <input type="color" class="tb-cin" :value="currentColor" @input="setColor('color', ($event.target as HTMLInputElement).value)" />
          </div>
          <button class="tb-btn tb-clr" :style="currentBg ? { background: currentBg } : { background: 'linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%)', backgroundSize: '6px 6px' }" @click="showColorPicker = showColorPicker === 'background' ? '' : 'background'" title="背景色">⬜</button>
          <div v-if="showColorPicker === 'background'" class="tb-cpop" @mouseleave="showColorPicker = ''">
            <span v-for="c in colors" :key="c" class="tb-csw" :style="{ background: c }" @click="setColor('background', c)"></span>
            <span class="tb-cclr" @click="setColor('background', '')">清除</span>
            <input type="color" class="tb-cin" @input="setColor('background', ($event.target as HTMLInputElement).value)" />
          </div>
        </span>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <button class="tb-btn" :class="{ active: currentAlign === 'left' }" @click="setAlign('left')" title="左对齐">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h10M2 7h8M2 10h12M2 13h6"/></svg>
          </button>
          <button class="tb-btn" :class="{ active: currentAlign === 'center' }" @click="setAlign('center')" title="居中">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 4h10M4 7h8M2 10h12M5 13h6"/></svg>
          </button>
          <button class="tb-btn" :class="{ active: currentAlign === 'right' }" @click="setAlign('right')" title="右对齐">
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4h10M6 7h8M2 10h12M4 13h10"/></svg>
          </button>
        </span>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <button class="tb-btn" @click="format('list', 'bullet')" title="无序列表">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 5h9M5 8h9M5 11h9M3 5h1M3 8h1M3 11h1"/></svg>
          </button>
          <button class="tb-btn" @click="format('list', 'ordered')" title="有序列表">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 5h8M6 8h8M6 11h8M2.5 4v1.5M2 8.5l1-.5v3"/></svg>
          </button>
        </span>
        <span class="tb-sep"></span>
        <span class="tb-grp">
          <button class="tb-btn" @click="createLink" title="链接">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 9.5l3-3M7.5 3.5l1.5-1.5a3 3 0 014 4l-1.5 1.5M8.5 12.5L7 14a3 3 0 01-4-4l1.5-1.5"/><path d="M9.5 6.5L7 9"/></svg>
          </button>
          <button class="tb-btn" @click="clearFormat" title="清除格式">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 12H2M4 12l2-8h4l2 8M6 8h4M5 4l1-2h4l1 2"/></svg>
          </button>
        </span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

// 注册自定义字体大小格式
const SizeStyle = Quill.import('attributors/style/size') as any
SizeStyle.whitelist = null // 允许任意大小
Quill.register(SizeStyle, true)

// 注册字体格式（使用 style 而非 class）
const FontStyle = Quill.import('attributors/style/font') as any
FontStyle.whitelist = null // 允许任意字体
Quill.register(FontStyle, true)

// 注册行高和字距
const Parchment = Quill.import('parchment') as any
const StyleAttributor = Parchment.Attributor?.Style

const lineHeightAttributor = new StyleAttributor('lineheight', 'line-height', {
  scope: Parchment.Scope.INLINE_AND_BLOCK,
  whitelist: null
})
const letterSpacingAttributor = new StyleAttributor('letterspacing', 'letter-spacing', {
  scope: Parchment.Scope.INLINE_AND_BLOCK,
  whitelist: null
})

Quill.register({ 'formats/lineheight': lineHeightAttributor, 'formats/letterspacing': letterSpacingAttributor }, true)

const props = defineProps<{
  modelValue?: string
  elementStyle?: Record<string, any>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'edit-start': []
  'edit-finish': []
  'edit-cancel': []
}>()

const editorRef = ref<HTMLElement | null>(null)
const quillContainerRef = ref<HTMLElement | null>(null)
const isEditing = ref(false)
const toolbarPos = ref<{ top: number; left: number; width: number } | null>(null)
const showColorPicker = ref('')

let quill: Quill | null = null
let initialValue = ''
let scrollHandler: (() => void) | null = null

const colors = [
  '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
  '#ff0000', '#cc0000', '#ff4444', '#ff8800', '#ffcc00', '#ffff00',
  '#88cc00', '#00cc00', '#00aaaa', '#0066cc', '#0000ff', '#4444ff',
  '#6600cc', '#cc00cc', '#ff66cc', '#dd8866'
]

// 当前格式状态
const currentFontSize = ref(14)
const currentLineHeight = ref(1.5)
const currentLetterSpacing = ref(0)
const currentColor = ref('#333333')
const currentBg = ref('')
const currentAlign = ref<'left' | 'center' | 'right'>('left')

const containerStyle = computed(() => ({
  width: '100%',
  height: '100%',
  minHeight: props.elementStyle?.minHeight || 'auto'
}))

const displayStyle = computed(() => ({
  width: '100%',
  height: '100%',
  fontSize: props.elementStyle?.fontSize ? `${props.elementStyle.fontSize}px` : undefined,
  fontFamily: props.elementStyle?.fontFamily,
  color: props.elementStyle?.color,
  textAlign: props.elementStyle?.textAlign,
  lineHeight: props.elementStyle?.lineHeight,
  letterSpacing: props.elementStyle?.letterSpacing ? `${props.elementStyle.letterSpacing}px` : undefined
}))

const toolbarStyle = computed(() => {
  const pos = toolbarPos.value
  if (!pos) return {}
  // 工具栏高度约 90px，增加 16px 间距
  return {
    position: 'fixed' as const,
    zIndex: 9999,
    top: `${Math.max(pos.top - 106, 4)}px`,
    left: `${Math.max(pos.left, 4)}px`
  }
})

function startEdit() {
  if (isEditing.value) return
  
  isEditing.value = true
  initialValue = props.modelValue || ''
  emit('edit-start')
  
  nextTick(() => {
    initQuill()
    updateToolbarPos()
    setupScrollHandler()
  })
}

function initQuill() {
  if (!quillContainerRef.value || quill) return
  
  quill = new Quill(quillContainerRef.value, {
    theme: 'snow',
    placeholder: '输入内容…',
    modules: {
      toolbar: false, // 不使用默认工具栏
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
  
  // 设置初始内容
  if (props.modelValue) {
    quill.clipboard.dangerouslyPasteHTML(props.modelValue)
  }
  
  // 监听内容变化
  quill.on('text-change', () => {
    if (quill) {
      emit('update:modelValue', quill.root.innerHTML)
    }
  })
  
  // 监听选区变化，更新格式状态
  quill.on('selection-change', updateFormatState)
  
  // 聚焦
  nextTick(() => quill?.focus())
}

function updateFormatState() {
  if (!quill) return
  
  const selection = quill.getSelection()
  if (!selection) return
  
  const formats = quill.getFormat(selection)
  
  // 更新字号
  const size = formats.size
  if (size) {
    const match = String(size).match(/(\d+)/)
    if (match) {
      currentFontSize.value = parseInt(match[1], 10)
    }
  } else {
    currentFontSize.value = 14
  }
  
  // 更新行高
  const lh = formats.lineheight
  if (lh) {
    currentLineHeight.value = parseFloat(String(lh)) || 1.5
  } else {
    currentLineHeight.value = 1.5
  }
  
  // 更新字距
  const ls = formats.letterspacing
  if (ls) {
    currentLetterSpacing.value = parseFloat(String(ls)) || 0
  } else {
    currentLetterSpacing.value = 0
  }
  
  // 更新颜色
  currentColor.value = formats.color || '#333333'
  currentBg.value = formats.background || ''
  
  // 更新对齐
  const align = formats.align
  if (align === 'center' || align === 'right') {
    currentAlign.value = align
  } else {
    currentAlign.value = 'left'
  }
}

function updateToolbarPos() {
  if (!editorRef.value || !isEditing.value) return
  
  const rect = editorRef.value.getBoundingClientRect()
  toolbarPos.value = {
    top: rect.top,
    left: rect.left,
    width: rect.width
  }
}

function setupScrollHandler() {
  scrollHandler = updateToolbarPos
  window.addEventListener('scroll', scrollHandler, true)
  window.addEventListener('resize', scrollHandler)
}

function removeScrollHandler() {
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler, true)
    window.removeEventListener('resize', scrollHandler)
    scrollHandler = null
  }
}

function finishEdit() {
  if (!quill) return
  
  const html = quill.root.innerHTML
  emit('update:modelValue', html)
  emit('edit-finish')
  
  destroyQuill()
  isEditing.value = false
  toolbarPos.value = null
  removeScrollHandler()
}

function cancelEdit() {
  emit('update:modelValue', initialValue)
  emit('edit-cancel')
  
  destroyQuill()
  isEditing.value = false
  toolbarPos.value = null
  removeScrollHandler()
}

function destroyQuill() {
  if (quill) {
    quill = null
  }
}

// 格式化方法
function format(name: string, value?: any) {
  if (!quill) return
  
  const selection = quill.getSelection(true)
  if (!selection) return
  
  quill.format(name, value ?? !quill.getFormat(selection)[name], 'user')
  updateFormatState()
}

function isFormatActive(name: string): boolean {
  if (!quill) return false
  
  const selection = quill.getSelection()
  if (!selection) return false
  
  return !!quill.getFormat(selection)[name]
}

function onFontChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (!quill) return
  
  const selection = quill.getSelection(true)
  if (selection) {
    // 使用 font-family 样式直接设置
    if (value) {
      quill.format('font', value, 'user')
    } else {
      quill.removeFormat(selection.index, selection.length, 'user')
    }
    updateFormatState()
  }
}

function adjustFontSize(delta: number) {
  if (!quill) return
  
  const newSize = Math.max(8, Math.min(72, currentFontSize.value + delta))
  currentFontSize.value = newSize
  
  const selection = quill.getSelection(true)
  if (selection && selection.length > 0) {
    quill.format('size', `${newSize}px`, 'user')
  } else {
    // 如果没有选中文本，设置默认格式
    quill.format('size', `${newSize}px`, 'user')
  }
}

function adjustLineHeight(delta: number) {
  if (!quill) return
  
  const newValue = Math.max(0.5, Math.min(5, currentLineHeight.value + delta))
  currentLineHeight.value = Math.round(newValue * 10) / 10
  
  const selection = quill.getSelection(true)
  if (selection) {
    quill.format('lineheight', String(currentLineHeight.value), 'user')
  }
}

function adjustLetterSpacing(delta: number) {
  if (!quill) return
  
  const newValue = Math.max(0, Math.min(10, currentLetterSpacing.value + delta))
  currentLetterSpacing.value = Math.round(newValue * 10) / 10
  
  const selection = quill.getSelection(true)
  if (selection) {
    quill.format('letterspacing', `${currentLetterSpacing.value}px`, 'user')
  }
}

function setColor(type: 'color' | 'background', value: string) {
  showColorPicker.value = ''
  if (!quill) return
  
  const selection = quill.getSelection(true)
  if (selection) {
    quill.format(type, value || false, 'user')
  }
  
  if (type === 'color') {
    currentColor.value = value
  } else {
    currentBg.value = value
  }
}

function setAlign(align: 'left' | 'center' | 'right') {
  if (!quill) return
  
  currentAlign.value = align
  quill.format('align', align === 'left' ? false : align, 'user')
}

function createLink() {
  const url = prompt('请输入链接地址:')
  if (url && quill) {
    quill.format('link', url, 'user')
  }
}

function clearFormat() {
  if (!quill) return
  
  const selection = quill.getSelection()
  if (selection) {
    quill.removeFormat(selection.index, selection.length, 'user')
  }
  
  // 重置状态
  currentFontSize.value = 14
  currentLineHeight.value = 1.5
  currentLetterSpacing.value = 0
  currentColor.value = '#333333'
  currentBg.value = ''
  currentAlign.value = 'left'
}

// 暴露方法
defineExpose({
  startEdit,
  finishEdit,
  cancelEdit,
  isEditing
})

onBeforeUnmount(() => {
  removeScrollHandler()
  destroyQuill()
})
</script>

<style scoped>
.inline-text-editor {
  width: 100%;
  height: 100%;
  cursor: text;
  outline: none;
}

.text-display {
  width: 100%;
  height: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.inline-text-editor.is-editing {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.text-edit-container {
  width: 100%;
  height: 100%;
  min-height: 20px;
}

.quill-content {
  width: 100%;
  height: 100%;
  min-height: 20px;
}

.inline-text-editor :deep(.ql-container) {
  font-size: 14px;
  font-family: inherit;
  border: none;
  min-height: 20px;
}

.inline-text-editor :deep(.ql-editor) {
  padding: 0;
  min-height: 20px;
  line-height: inherit;
}

.inline-text-editor :deep(.ql-editor.ql-blank::before) {
  font-style: normal;
  color: #999;
}

/* 工具栏样式 */
.inline-text-toolbar {
  position: fixed;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 9999;
  min-width: 400px;
  margin-bottom: 8px; /* 增加底部间距 */
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
}

.toolbar-row + .toolbar-row {
  border-top: 1px solid #e2e8f0;
  margin-top: 4px;
  padding-top: 8px;
}

.tb-done, .tb-cancel {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  background: #e2e8f0;
  color: #475569;
  transition: all 0.15s;
}

.tb-done:hover {
  background: #22c55e;
  color: #fff;
}

.tb-cancel:hover {
  background: #ef4444;
  color: #fff;
}

.tb-sep {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 4px;
}

.tb-grp {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tb-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.tb-btn:hover {
  background: #e2e8f0;
}

.tb-btn.active {
  background: #dbeafe;
  color: #2563eb;
}

.tb-sel {
  height: 28px;
  padding: 0 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fff;
  color: #475569;
  font-size: 12px;
  cursor: pointer;
}

.tb-lbl {
  font-size: 11px;
  color: #64748b;
  padding: 0 4px;
}

.tb-adjs {
  display: flex;
  align-items: center;
  background: #f1f5f9;
  border-radius: 4px;
  padding: 2px;
}

.tb-adj {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 2px;
  font-size: 14px;
  color: #475569;
}

.tb-adj:hover {
  background: #e2e8f0;
}

.tb-adjv {
  min-width: 24px;
  text-align: center;
  font-size: 11px;
  color: #334155;
  font-weight: 500;
}

.tb-clr {
  font-weight: bold;
  font-size: 14px;
}

.tb-cpop {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 200px;
  z-index: 100;
}

.tb-csw {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.tb-csw:hover {
  transform: scale(1.1);
}

.tb-cclr {
  width: 100%;
  padding: 4px 8px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  border-radius: 4px;
}

.tb-cclr:hover {
  background: #f1f5f9;
}

.tb-cin {
  width: 100%;
  height: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
}
</style>
