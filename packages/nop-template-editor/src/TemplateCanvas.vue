<template>
  <div class="template-canvas-wrapper">
    <!-- ======== 顶部工具栏 ======== -->
    <div class="canvas-toolbar">
      <div class="toolbar-group">
        <button v-for="t in elementTypes" :key="t.type"
                class="tool-btn"
                :title="t.label"
                @click="addElement(t.type)">
          <span v-html="t.icon"></span>
          <span class="tool-label">{{ t.label }}</span>
        </button>
      </div>
      <div class="toolbar-separator"></div>
      <div class="toolbar-group">
        <button class="tool-btn" @click="undo" :disabled="undoStack.length === 0" title="撤销"><span v-html="BTN_ICONS.undo"></span></button>
        <button class="tool-btn" @click="redo" :disabled="redoStack.length === 0" title="重做"><span v-html="BTN_ICONS.redo"></span></button>
      </div>
      <div class="toolbar-separator"></div>
      <div class="toolbar-group">
        <button class="tool-btn" @click="zoomOut" :disabled="scale <= 0.3" title="缩小"><span v-html="BTN_ICONS.zoomOut || '−'"></span></button>
        <span class="zoom-label">{{ Math.round(scale * 100) }}%</span>
        <button class="tool-btn" @click="zoomIn" :disabled="scale >= 3" title="放大"><span v-html="BTN_ICONS.zoomIn || '+'"></span></button>
        <button class="tool-btn" @click="scale = 1" :disabled="scale === 1">1:1</button>
      </div>
      <div class="toolbar-separator"></div>
      <div class="toolbar-group">
        <button class="tool-btn primary" @click="onSave" title="保存"><span v-html="BTN_ICONS.save"></span><span class="tool-label">保存</span></button>
        <button class="tool-btn" @click="onPreview" title="预览"><span v-html="BTN_ICONS.preview"></span><span class="tool-label">预览</span></button>
        <button class="tool-btn" @click="exportJson" :disabled="elements.length === 0" title="导出JSON"><span v-html="BTN_ICONS.export"></span><span class="tool-label">导出</span></button>
      </div>
    </div>

    <!-- ======== 主区域 ======== -->
    <div class="canvas-body">
      <!-- 画布视口 -->
      <div class="canvas-viewport" ref="viewportRef"
           @dragover.prevent
           @drop="onDropToCanvas">
        <div class="canvas-container"
             :style="{
               width: CANVAS_W + 'px',
               height: CANVAS_H + 'px',
               transform: 'scale(' + scale + ')'
             }"
             ref="canvasRef">
          <div class="a4-bg"></div>

          <!-- 元素循环 -->
          <div v-for="el in elements" :key="el.id"
               class="template-element"
               :class="{
                 selected: selectedId === el.id,
                 locked: el.locked,
                 'text-editing': editingTextId === el.id
               }"
               :data-element-id="el.id"
               :style="elementStyle(el)"
               @mousedown.stop="selectElement(el.id)">
            <div class="element-content" @dblclick="onDblClickElement(el)">
              <!-- 文本（支持富文本） -->
              <template v-if="el.type === 'text'">
                <div v-if="editingTextId === el.id" class="text-editing-wrapper">
                  <div class="rich-toolbar" @mousedown.stop>
                    <button class="rt-btn" @click="execCmd('bold')" title="加粗"><b>B</b></button>
                    <button class="rt-btn" @click="execCmd('italic')" title="斜体"><i>I</i></button>
                    <button class="rt-btn" @click="execCmd('underline')" title="下划线"><u>U</u></button>
                    <span class="rt-sep"></span>
                    <button class="rt-btn" @click="execCmd('strikeThrough')" title="删除线"><s>S</s></button>
                    <span class="rt-sep"></span>
                    <select class="rt-select" @change="execCmd('fontSize', ($event.target as HTMLSelectElement).value)" @mousedown.stop>
                      <option value="3">正</option><option value="1">小</option><option value="4">中+</option>
                      <option value="5">大</option><option value="6">大+</option><option value="7">最大</option>
                    </select>
                    <input type="color" class="rt-color" @change="execCmd('foreColor', ($event.target as HTMLInputElement).value)" title="文字颜色" value="#333333" />
                    <span class="rt-sep"></span>
                    <button class="rt-btn" @click="execCmd('justifyLeft')" title="左对齐">≡</button>
                    <button class="rt-btn" @click="execCmd('justifyCenter')" title="居中">≡</button>
                    <button class="rt-btn" @click="execCmd('justifyRight')" title="右对齐">≡</button>
                  </div>
                  <div class="text-editor"
                       contenteditable
                       ref="textEditorRef"
                       @blur="finishTextEdit(el, $event)"
                       @keydown.escape="cancelTextEdit"
                       v-html="el.content || ''"></div>
                </div>
                <div v-else class="text-element" v-html="el.content || '文本'"></div>
              </template>

              <!-- 预填 -->
              <template v-else-if="el.type === 'prefill'">
                <div class="prefill-element">
                  <span class="prefill-label">{{ el.label }}:</span>
                  <span class="prefill-expr">{{ el.expr || '${...}' }}</span>
                </div>
              </template>

              <!-- 签名 / 盖章 -->
              <template v-else-if="el.type === 'signature'">
                <div class="handwrite-element signature" :style="{ borderColor: el.borderColor || '#ff4444' }">
                  <span class="handwrite-label">{{ el.label || '签名区' }}</span>
                </div>
              </template>
              <template v-else-if="el.type === 'stamp'">
                <div class="handwrite-element stamp" :style="{ borderColor: el.borderColor || '#ff4444' }">
                  <span class="handwrite-label">{{ el.label || '盖章区' }}</span>
                </div>
              </template>

              <!-- 表格 -->
              <template v-else-if="el.type === 'table'">
                <div class="table-element">
                  <table>
                    <thead>
                      <tr><th v-for="col in (el.columns || [])" :key="col.field">{{ col.header }}</th></tr>
                    </thead>
                    <tbody>
                      <tr><td v-for="col in (el.columns || [])" :key="col.field" class="virtual-cell"></td></tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <!-- 图片 -->
              <template v-else-if="el.type === 'image'">
                <div class="image-element">
                  <img :src="el.src" :alt="el.label" style="width:100%;height:100%;object-fit:contain" />
                </div>
              </template>

              <!-- 分隔线 -->
              <template v-else-if="el.type === 'divider'">
                <div class="divider-element"></div>
              </template>
            </div>

            <!-- 删除按钮 -->
            <button v-if="selectedId === el.id && !el.locked"
                    class="delete-btn" @click.stop="deleteElement(el.id)" title="删除">×</button>

            <!-- 锁定标记 -->
            <span v-if="el.locked" class="locked-badge" title="已锁定">🔒</span>

            <!-- 缩放手柄（选中时显示） -->
            <div v-if="selectedId === el.id && !el.locked" class="resize-handles">
              <div class="handle handle-nw" data-handle="nw"></div>
              <div class="handle handle-n"  data-handle="n"></div>
              <div class="handle handle-ne" data-handle="ne"></div>
              <div class="handle handle-w"  data-handle="w"></div>
              <div class="handle handle-e"  data-handle="e"></div>
              <div class="handle handle-sw" data-handle="sw"></div>
              <div class="handle handle-s"  data-handle="s"></div>
              <div class="handle handle-se" data-handle="se"></div>
            </div>
          </div>

          <!-- 空画布提示 -->
          <div v-if="elements.length === 0" class="empty-hint">
            <div class="empty-icon">
              <svg viewBox="0 0 40 40" fill="none" stroke="#bbb" stroke-width="1.5" width="48" height="48">
                <rect x="4" y="6" width="32" height="28" rx="2"/>
                <path d="M12 16h16M12 22h12M12 28h8"/>
              </svg>
            </div>
            <p>从上方工具栏点击元素添加到画布</p>
          </div>
        </div>
      </div>

      <!-- ======== 页面标签栏 ======== -->
      <div class="page-tabs">
        <div class="page-tabs-scroll">
          <div v-for="(p, i) in pages" :key="p.id"
               class="page-tab"
               :class="{ active: i === currentPageIdx }"
               @click="switchPage(i)">
            <span class="page-tab-name" :title="p.name">{{ p.name }}</span>
            <span class="page-tab-count">{{ p.elements.length }}</span>
            <button v-if="pages.length > 1" class="page-tab-close" @click.stop="removePage(i)" title="删除页面">×</button>
          </div>
        </div>
        <button class="page-tab-add" @click="addPage" title="添加页面">+</button>
      </div>

      <!-- ======== 右侧属性面板 ======== -->
      <div class="property-panel" :class="{ visible: !!sel }">
        <div class="panel-header">
          <span>元素属性</span>
          <button class="panel-close" @click="selectedId = null">×</button>
        </div>
        <div v-if="sel" class="panel-body">
          <!-- 公共属性 -->
          <div class="prop-section">
            <div class="prop-row">
              <div class="prop-field half">
                <label>类型</label>
                <span class="prop-value readonly">{{ typeLabel(sel.type) }}</span>
              </div>
              <div class="prop-field half">
                <label>层级</label>
                <input class="prop-input" type="number" min="0" max="999"
                       :value="sel.zIndex || 1"
                       @input="setInt('zIndex', $event)" />
              </div>
            </div>
            <div class="prop-field">
              <label>标识</label>
              <input class="prop-input" :value="sel.id" @input="updateSel('id', val($event))" />
            </div>
            <div class="prop-field">
              <label>标签</label>
              <input class="prop-input" :value="sel.label" @input="updateSel('label', val($event))" />
            </div>
          </div>

          <!-- 位置和尺寸 -->
          <div class="prop-section">
            <div class="prop-section-title">位置 &amp; 尺寸</div>
            <div class="prop-row">
              <div class="prop-field half">
                <label>X (%)</label>
                <input class="prop-input" type="number" step="0.1" min="0" max="100"
                       :value="+sel.x.toFixed(1)"
                       @input="updateSel('x', clamp(num($event), 0, 100))" />
              </div>
              <div class="prop-field half">
                <label>Y (%)</label>
                <input class="prop-input" type="number" step="0.1" min="0" max="100"
                       :value="+sel.y.toFixed(1)"
                       @input="updateSel('y', clamp(num($event), 0, 100))" />
              </div>
            </div>
            <div class="prop-row">
              <div class="prop-field half">
                <label>宽 (%)</label>
                <input class="prop-input" type="number" step="0.1" min="1" max="100"
                       :value="+sel.w.toFixed(1)"
                       @input="updateSel('w', clamp(num($event), 1, 100))" />
              </div>
              <div class="prop-field half">
                <label>高 (%)</label>
                <input class="prop-input" type="number" step="0.1" min="0.5" max="100"
                       :value="+sel.h.toFixed(1)"
                       @input="updateSel('h', clamp(num($event), 0.5, 100))" />
              </div>
            </div>
          </div>

          <!-- 类型专属属性 -->
          <div class="prop-section">
            <div class="prop-section-title">专属属性</div>

            <!-- Text -->
            <template v-if="sel.type === 'text'">
              <div class="prop-field">
                <label>内容</label>
                <textarea class="prop-input prop-textarea" rows="3"
                          :value="sel.content || ''"
                          @input="updateSel('content', val($event))"></textarea>
              </div>
              <div class="prop-row">
                <div class="prop-field half">
                  <label>字号 (pt)</label>
                  <input class="prop-input" type="number" min="8" max="72"
                         :value="sel.fontSize || 14"
                         @input="updateSel('fontSize', num($event) || 14)" />
                </div>
                <div class="prop-field half">
                  <label>粗细</label>
                  <select class="prop-input" :value="sel.fontWeight || 'normal'"
                          @change="updateSel('fontWeight', val($event))">
                    <option value="normal">正常</option>
                    <option value="bold">加粗</option>
                  </select>
                </div>
              </div>
              <div class="prop-row">
                <div class="prop-field half">
                  <label>对齐</label>
                  <select class="prop-input" :value="sel.textAlign || 'left'"
                          @change="updateSel('textAlign', val($event))">
                    <option value="left">左对齐</option>
                    <option value="center">居中</option>
                    <option value="right">右对齐</option>
                  </select>
                </div>
                <div class="prop-field half">
                  <label>颜色</label>
                  <input class="prop-input" type="color"
                         :value="sel.color || '#333333'"
                         @input="updateSel('color', val($event))" />
                </div>
              </div>
            </template>

            <!-- Prefill -->
            <template v-else-if="sel.type === 'prefill'">
              <div class="prop-field">
                <label>表达式</label>
                <input class="prop-input" :value="sel.expr || ''"
                       @input="updateSel('expr', val($event))"
                       placeholder="${fieldName}" />
              </div>
              <div class="prop-field">
                <label>空占位符</label>
                <input class="prop-input" :value="sel.emptyPlaceholder || ''"
                       @input="updateSel('emptyPlaceholder', val($event))"
                       placeholder="_____________" />
              </div>
            </template>

            <!-- Signature / Stamp -->
            <template v-else-if="sel.type === 'signature' || sel.type === 'stamp'">
              <div class="prop-field">
                <label>
                  <input type="checkbox"
                         :checked="sel.required"
                         @change="updateSel('required', checked($event))" />
                  必填
                </label>
              </div>
              <div class="prop-field">
                <label>边框颜色</label>
                <input class="prop-input" type="color"
                       :value="sel.borderColor || '#ff4444'"
                       @input="updateSel('borderColor', val($event))" />
              </div>
              <div class="prop-field">
                <label>占位文字</label>
                <input class="prop-input" :value="sel.placeholder || ''"
                       @input="updateSel('placeholder', val($event))" />
              </div>
            </template>

            <!-- Table -->
            <template v-else-if="sel.type === 'table'">
              <div class="prop-field">
                <label>数据源 (ds)</label>
                <input class="prop-input" :value="sel.ds || ''"
                       @input="updateSel('ds', val($event))" />
              </div>
              <div class="prop-field">
                <label>列定义</label>
                <div class="table-columns-editor">
                  <div v-for="(col, ci) in (sel.columns || [])" :key="ci" class="column-row">
                    <input class="prop-input col-field" :value="col.field" placeholder="字段"
                           @input="updateColumn(ci, 'field', val($event))" />
                    <input class="prop-input col-header" :value="col.header" placeholder="标题"
                           @input="updateColumn(ci, 'header', val($event))" />
                    <button class="col-del" @click="removeColumn(ci)">×</button>
                  </div>
                  <button class="tool-btn col-add" @click="addColumn">+ 添加列</button>
                </div>
              </div>
            </template>

            <!-- Image -->
            <template v-else-if="sel.type === 'image'">
              <div class="prop-field">
                <label>图片 URL</label>
                <input class="prop-input" :value="sel.src || ''"
                       @input="updateSel('src', val($event))"
                       placeholder="https://..." />
              </div>
              <div class="prop-field">
                <label>适应方式</label>
                <select class="prop-input" :value="sel.fit || 'contain'"
                        @change="updateSel('fit', val($event))">
                  <option value="contain">等比包含</option>
                  <option value="cover">等比覆盖</option>
                  <option value="stretch">拉伸</option>
                </select>
              </div>
            </template>
          </div>

          <!-- 操作按钮 -->
          <div class="prop-section">
            <div class="prop-actions">
              <label class="prop-checkbox">
                <input type="checkbox"
                       :checked="sel.locked"
                       @change="updateSel('locked', checked($event))" />
                锁定
              </label>
              <label class="prop-checkbox">
                <input type="checkbox"
                       :checked="sel.visible !== false"
                       @change="updateSel('visible', checked($event))" />
                可见
              </label>
            </div>
            <button class="tool-btn danger" @click="deleteElement(sel.id)" style="width:100%;margin-top:8px;">
              删除元素
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="canvas-statusbar">
      <span>元素: {{ elements.length }}</span>
      <span v-if="sel">选中: {{ sel.id }} ({{ sel.type }})</span>
      <span v-else>未选中</span>
      <span>画布: {{ CANVAS_W }}×{{ CANVAS_H }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import interact from 'interactjs'
import type { TemplateElement, TemplateDefinition, TemplatePage } from './types'

const props = defineProps<{
  templateId?: string
  templateJson?: string
}>()

const emit = defineEmits<{
  saved: [data: { templateJson: string }]
  preview: [data: { templateJson: string }]
  updateTemplateJson: [value: string]
  'update:value': [value: string]
}>()

// ==================== 常量 ====================
const CANVAS_W = 794   // ~210mm @96dpi
const CANVAS_H = 1123  // ~297mm @96dpi

// ==================== 状态 ====================
const scale = ref(1)
const selectedId = ref<string | null>(null)
const elements = ref<TemplateElement[]>([])
const viewportRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)
const textEditorRef = ref<HTMLElement | null>(null)
const editingTextId = ref<string | null>(null)

// 多页系统
const pages = ref<TemplatePage[]>([{ id: 'p1', name: '第1页', elements: [] }])
const currentPageIdx = ref(0)

// 撤销/重做
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])

// ==================== 计算属性 ====================
const sel = computed(() => elements.value.find(e => e.id === selectedId.value) || null)

// ==================== 元素类型定义（SVG 图标）====================
const SVG_ICONS = {
  text: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4h14M10 4v13M7 17h6"/></svg>',
  prefill: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 5l4 4-4 4M16 5l-4 4 4 4"/><circle cx="10" cy="10" r="8"/></svg>',
  signature: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 16c2-3 4-5 5-3s2 4 3 2 2-6 4-8 2-1 2 1-1 4-2 5-2 2-3 3"/></svg>',
  stamp: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="4"/><path d="M10 3v14M3 10h14"/></svg>',
  table: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="16" height="14" rx="1"/><path d="M2 8h16M8 3v14M14 3v14"/></svg>',
  image: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="16" height="14" rx="1.5"/><circle cx="7" cy="8" r="1.5"/><path d="M3 16l4-5 3 3 3-4 4 6"/></svg>',
  divider: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10h14"/></svg>',
}
const BTN_ICONS = {
  undo: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 5H3v3M3 5l3 3M15 13a6 6 0 00-6-6H3"/></svg>',
  redo: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5h3v3M15 5l-3 3M3 13a6 6 0 016-6h6"/></svg>',
  save: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h9l3 3v9a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M12 14v-4H6v4M6 3v3h5"/></svg>',
  preview: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 9s2.5-5 8-5 8 5 8 5-2.5 5-8 5-8-5-8-5z"/><circle cx="9" cy="9" r="2.5"/></svg>',
  export: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2v10M5 8l4 4 4-4"/><path d="M3 13v2a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>',
  zoomIn: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7.5" cy="7.5" r="4.5"/><path d="M11 11l4 4M7.5 5v5M5 7.5h5"/></svg>',
  zoomOut: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7.5" cy="7.5" r="4.5"/><path d="M11 11l4 4M5 7.5h5"/></svg>',
}

const elementTypes = [
  { type: 'text', label: '文本', icon: SVG_ICONS.text },
  { type: 'prefill', label: '预填', icon: SVG_ICONS.prefill },
  { type: 'signature', label: '签名', icon: SVG_ICONS.signature },
  { type: 'stamp', label: '盖章', icon: SVG_ICONS.stamp },
  { type: 'table', label: '表格', icon: SVG_ICONS.table },
  { type: 'image', label: '图片', icon: SVG_ICONS.image },
  { type: 'divider', label: '分隔线', icon: SVG_ICONS.divider },
]

const typeLabelMap: Record<string, string> = {
  text: '文本', prefill: '预填', signature: '签名区',
  stamp: '盖章区', table: '表格', image: '图片', divider: '分隔线',
}

function typeLabel(type: string) { return typeLabelMap[type] || type }

// ==================== 事件工具函数（处理 TS 类型安全）====================
function setVal(key: string, e: any) { updateSel(key, e.target.value) }
function setNum(key: string, e: any) { updateSel(key, parseFloat(e.target.value) || 0) }
function setChecked(key: string, e: any) { updateSel(key, e.target.checked) }
function setInt(key: string, e: any) { updateSel(key, parseInt(e.target.value) || 1) }
function val(e: any) { return e.target.value }
function num(e: any) { return parseFloat(e.target.value) || 0 }
function checked(e: any) { return e.target.checked }

// ==================== 工具函数 ====================
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

// ==================== 序列化 / 反序列化 ====================
watch(() => props.templateJson, (json) => {
  if (json) loadFromJson(json)
}, { immediate: true })

function loadFromJson(json: string) {
  try {
    const def: TemplateDefinition = JSON.parse(json)
    if (def.pages && def.pages.length > 0) {
      pages.value = def.pages.map(p => ({ ...p, elements: [...p.elements] }))
    } else {
      // 向后兼容：单页模式
      pages.value = [{ id: 'p1', name: '第1页', elements: [...(def.elements || [])] }]
    }
    currentPageIdx.value = 0
    elements.value = pages.value[0].elements
    undoStack.value = []
    redoStack.value = []
    selectedId.value = null
  } catch {
    pages.value = [{ id: 'p1', name: '第1页', elements: [] }]
    currentPageIdx.value = 0
    elements.value = []
  }
}

function toJson(): string {
  // 保存当前页
  if (pages.value[currentPageIdx.value]) {
    pages.value[currentPageIdx.value].elements = [...elements.value]
  }
  const def: TemplateDefinition = {
    templateId: props.templateId || '',
    version: 1,
    displayName: '',
    pages: pages.value.map(p => ({ id: p.id, name: p.name, elements: p.elements })),
    elements: elements.value
  }
  return JSON.stringify(def, null, 2)
}

// ==================== 多页管理 ====================
function switchPage(idx: number) {
  if (idx === currentPageIdx.value || idx < 0 || idx >= pages.value.length) return
  // 保存当前页
  pages.value[currentPageIdx.value].elements = [...elements.value]
  // 切换到新页
  currentPageIdx.value = idx
  elements.value = [...pages.value[idx].elements]
  selectedId.value = null
  editingTextId.value = null
}

function addPage() {
  const n = pages.value.length + 1
  const id = 'p' + n
  pages.value.push({ id, name: '第' + n + '页', elements: [] })
  switchPage(pages.value.length - 1)
}

function removePage(idx: number) {
  if (pages.value.length <= 1) return
  pages.value.splice(idx, 1)
  if (currentPageIdx.value >= pages.value.length) {
    switchPage(pages.value.length - 1)
  } else if (currentPageIdx.value === idx) {
    switchPage(Math.max(0, idx - 1))
  } else if (currentPageIdx.value > idx) {
    currentPageIdx.value--
  }
}

function renamePage(idx: number, name: string) {
  if (pages.value[idx]) pages.value[idx].name = name
}

// ==================== 撤销/重做 ====================
function pushUndo() {
  undoStack.value.push(JSON.stringify(elements.value))
  if (undoStack.value.length > 50) undoStack.value.shift()
  redoStack.value = []
}

function undo() {
  if (undoStack.value.length === 0) return
  redoStack.value.push(JSON.stringify(elements.value))
  elements.value = JSON.parse(undoStack.value.pop()!)
}

function redo() {
  if (redoStack.value.length === 0) return
  undoStack.value.push(JSON.stringify(elements.value))
  elements.value = JSON.parse(redoStack.value.pop()!)
}

// ==================== 元素样式 ====================
function elementStyle(el: TemplateElement) {
  return {
    left: el.x + '%',
    top: el.y + '%',
    width: el.w + '%',
    height: el.h + '%',
    zIndex: el.zIndex || 1
  }
}

// ==================== 元素操作 ====================
function pushUndoBeforeMutation() {
  if (undoStack.value.length === 0 ||
      undoStack.value[undoStack.value.length - 1] !== JSON.stringify(elements.value)) {
    pushUndo()
  }
}

function selectElement(id: string) {
  selectedId.value = id
}

function deselectElement() {
  selectedId.value = null
}

function addElement(type: string) {
  pushUndo()
  const count = elements.value.filter(e => e.type === type).length
  const defaults: Record<string, Partial<TemplateElement>> = {
    text:      { content: '文本内容' },
    prefill:   { expr: '${field}', emptyPlaceholder: '_____________' },
    signature: { required: true, borderColor: '#ff4444', label: '签名区' },
    stamp:     { required: true, borderColor: '#ff4444', label: '盖章区' },
    table:     { ds: '', columns: [{ field: 'col1', header: '列1', w: 100 }] },
    divider:   {},
    image:     { src: '', fit: 'contain' },
  }
  const el: TemplateElement = {
    id: type.toUpperCase() + String(count + 1).padStart(2, '0'),
    type: type as any,
    label: type,
    x: 10 + (count * 5) % 60,
    y: 10 + (count * 8) % 70,
    w: type === 'divider' ? 60 : 30,
    h: type === 'divider' ? 1 : type === 'signature' || type === 'stamp' ? 10 : type === 'table' ? 20 : 5,
    zIndex: 1,
    visible: true,
    locked: false,
    ...(defaults[type] || {})
  }
  elements.value.push(el)
  selectedId.value = el.id
}

function deleteElement(id: string) {
  pushUndo()
  elements.value = elements.value.filter(e => e.id !== id)
  if (selectedId.value === id) selectedId.value = null
}

function updateSel(key: string, value: any) {
  const el = elements.value.find(e => e.id === selectedId.value)
  if (!el) return
  pushUndoBeforeMutation()
  ;(el as any)[key] = value
}

// 表格列操作
function addColumn() {
  const el = elements.value.find(e => e.id === selectedId.value)
  if (!el || el.type !== 'table') return
  pushUndo()
  if (!el.columns) el.columns = []
  el.columns.push({ field: 'col' + (el.columns.length + 1), header: '列' + (el.columns.length + 1), w: 100 })
}

function removeColumn(ci: number) {
  const el = elements.value.find(e => e.id === selectedId.value)
  if (!el || el.type !== 'table' || !el.columns) return
  pushUndo()
  el.columns.splice(ci, 1)
}

function updateColumn(ci: number, key: string, value: string) {
  const el = elements.value.find(e => e.id === selectedId.value)
  if (!el || el.type !== 'table' || !el.columns) return
  if (!el.columns[ci]) return
  pushUndoBeforeMutation()
  ;(el.columns[ci] as any)[key] = value
}

// ==================== 文本编辑 ====================
function onDblClickElement(el: TemplateElement) {
  if (el.type === 'text' && !el.locked) {
    editingTextId.value = el.id
    nextTick(() => {
      const editor = textEditorRef.value
      if (editor) {
        editor.focus()
        // 选中全部内容
        const range = document.createRange()
        range.selectNodeContents(editor)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    })
  }
}

function finishTextEdit(el: TemplateElement, event: Event) {
  const target = event.target as HTMLElement
  if (target && el.type === 'text') {
    pushUndoBeforeMutation()
    el.content = target.innerHTML || ''
  }
  editingTextId.value = null
}

function cancelTextEdit() {
  editingTextId.value = null
}

// ==================== 富文本命令 ====================
function execCmd(command: string, value?: string) {
  document.execCommand(command, false, value)
  const editor = textEditorRef.value
  if (editor) editor.focus()
}

// ==================== 拖入画布 ====================
function onDropToCanvas(event: DragEvent) {
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    // 拖入文件（暂不处理文件上传）
    return
  }
}

// ==================== 缩放 ====================
function zoomIn() { scale.value = Math.min(3, +(scale.value + 0.1).toFixed(1)) }
function zoomOut() { scale.value = Math.max(0.3, +(scale.value - 0.1).toFixed(1)) }

// ==================== 保存/导出 ====================
function onSave() {
  const json = toJson()
  emit('updateTemplateJson', json)
  emit('saved', { templateJson: json })
  emit('update:value', json)
}

function onPreview() {
  emit('preview', { templateJson: toJson() })
}

function exportJson() {
  const json = toJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (props.templateId || 'template') + '.json'
  a.click()
  URL.revokeObjectURL(url)
}

// ==================== interact.js 集成 ====================
// 拖拽/缩放的起始状态快照（用于计算相对于起点的位移）
let dragState: { startX: number; startY: number; startW: number; startH: number; pageX: number; pageY: number } | null = null

function setupInteract() {
  // 清理旧实例
  interact('.template-element:not(.locked)').unset()

  interact('.template-element:not(.locked)')
    .draggable({
      inertia: false,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: false
        })
      ],
      listeners: {
        start() { pushUndo() },
        move(event: any) {
          const el = getElementFromEvent(event)
          if (!el) return
          // getBoundingClientRect 已包含 CSS transform，所以用它能正确转换 page 坐标到百分比
          const rect = canvasRef.value!.getBoundingClientRect()
          el.x = clamp(el.x + event.dx / rect.width * 100, 0, 100 - el.w)
          el.y = clamp(el.y + event.dy / rect.height * 100, 0, 100 - el.h)
          selectedId.value = el.id
        }
      }
    })
    .resizable({
      edges: { left: true, right: true, top: true, bottom: true },
      modifiers: [
        interact.modifiers.restrictEdges({
          outer: 'parent',
          endOnly: false
        }),
        interact.modifiers.restrictSize({
          min: { width: 20, height: 10 }
        })
      ],
      listeners: {
        start(event: any) {
          pushUndo()
          const el = getElementFromEvent(event)
          if (!el) return
          dragState = {
            startX: el.x, startY: el.y,
            startW: el.w, startH: el.h,
            pageX: event.pageX, pageY: event.pageY
          }
        },
        move(event: any) {
          if (!dragState) return
          const el = getElementFromEvent(event)
          if (!el) return
          const rect = canvasRef.value!.getBoundingClientRect()
          const dpX = (event.pageX - dragState.pageX) / rect.width * 100
          const dpY = (event.pageY - dragState.pageY) / rect.height * 100

          let newX = dragState.startX
          let newY = dragState.startY
          let newW = dragState.startW
          let newH = dragState.startH

          if (event.edges.left)  { newX = dragState.startX + dpX; newW = dragState.startW - dpX }
          if (event.edges.right) { newW = dragState.startW + dpX }
          if (event.edges.top)   { newY = dragState.startY + dpY; newH = dragState.startH - dpY }
          if (event.edges.bottom){ newH = dragState.startH + dpY }

          el.x = clamp(newX, 0, 100 - newW)
          el.y = clamp(newY, 0, 100 - newH)
          el.w = clamp(newW, 1, 100)
          el.h = clamp(newH, 0.5, 100)
        },
        end() { dragState = null }
      }
    })
}

function getElementFromEvent(event: any): TemplateElement | null {
  const target = event.target as HTMLElement
  const elWrapper = target.closest('.template-element') as HTMLElement
  if (!elWrapper) return null
  const id = elWrapper.dataset.elementId
  if (!id) return null
  return elements.value.find(e => e.id === id) || null
}

// ==================== 点击外部取消选中 ====================
function onClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.template-element') && !target.closest('.property-panel')) {
    selectedId.value = null
  }
}

// ==================== 生命周期 ====================
onMounted(() => {
  setupInteract()
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  interact('.template-element:not(.locked)').unset()
  document.removeEventListener('click', onClickOutside)
})
</script>

<style scoped>
/* ==================== 全局 ==================== */
.template-canvas-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
}

/* ==================== 工具栏 ==================== */
.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-separator {
  width: 1px;
  height: 24px;
  background: #e8e8e8;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  white-space: nowrap;
  line-height: 1.4;
}

.tool-btn svg {
  width: 16px;
  height: 16px;
  display: block;
}

.tool-btn:hover { border-color: #1890ff; color: #1890ff; }
.tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tool-btn.primary { background: #1890ff; color: #fff; border-color: #1890ff; }
.tool-btn.primary:hover { background: #40a9ff; }
.tool-btn.danger { background: #fff; color: #ff4d4f; border-color: #ff4d4f; }
.tool-btn.danger:hover { background: #ff4d4f; color: #fff; }

.tool-label { font-size: 12px; }

.zoom-label {
  font-size: 13px;
  min-width: 48px;
  text-align: center;
  color: #666;
}

/* ==================== 主体布局 ==================== */
.canvas-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* ==================== 画布视口 ==================== */
.canvas-viewport {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 24px;
  background: #e8e8e8;
}

.canvas-container {
  position: relative;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  transform-origin: top center;
  flex-shrink: 0;
}

.a4-bg {
  position: absolute;
  inset: 0;
  background: #fff;
  pointer-events: none;
}

/* ==================== 空画布提示 ==================== */
.empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #bbb;
  pointer-events: none;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-hint p { margin: 4px 0; font-size: 14px; }
.empty-sub { font-size: 12px; color: #d0d0d0; }

/* ==================== 元素 ==================== */
.template-element {
  position: absolute;
  cursor: move;
  transition: box-shadow 0.15s;
  box-sizing: border-box;
  min-width: 10px;
  min-height: 6px;
}

.template-element:hover {
  box-shadow: 0 0 0 1px #1890ff;
}

.template-element.selected {
  box-shadow: 0 0 0 2px #1890ff, 0 0 0 4px rgba(24, 144, 255, 0.12);
}

.template-element.locked {
  cursor: default;
  opacity: 0.75;
}

.element-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  pointer-events: auto;
}

/* 文本元素 */
.text-element {
  padding: 4px;
  font-size: 14px;
  min-height: 20px;
  word-break: break-word;
  line-height: 1.5;
}

/* 富文本编辑 */
.text-editing-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.rich-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  flex-shrink: 0;
  flex-wrap: wrap;
  box-shadow: 0 -1px 4px rgba(0,0,0,0.06);
  z-index: 2;
}

.rt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 24px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: #444;
  transition: all 0.15s;
}

.rt-btn:hover { background: #f0f0f0; border-color: #d9d9d9; }
.rt-btn b { font-weight: 700; }
.rt-btn i { font-style: italic; }
.rt-btn u { text-decoration: underline; }
.rt-btn s { text-decoration: line-through; }

.rt-sep {
  width: 1px;
  height: 16px;
  background: #e8e8e8;
  margin: 0 2px;
}

.rt-select {
  height: 24px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  font-size: 12px;
  padding: 0 4px;
  background: #fff;
  cursor: pointer;
  color: #444;
}

.rt-color {
  width: 24px;
  height: 24px;
  padding: 1px;
  border: 1px solid #d9d9d9;
  border-radius: 3px;
  cursor: pointer;
  background: none;
}

.text-editor {
  flex: 1;
  padding: 6px;
  font-size: 14px;
  outline: 2px solid #1890ff;
  outline-offset: -2px;
  background: #fff;
  word-break: break-word;
  cursor: text;
  min-height: 40px;
  border: 1px solid #d9d9d9;
  border-top: none;
  border-radius: 0 0 4px 4px;
  overflow-y: auto;
}

/* 预填元素 */
.prefill-element {
  padding: 4px;
  background: #f6f8fa;
  border: 1px dashed #bbb;
  border-radius: 3px;
  font-size: 13px;
}
.prefill-label { color: #666; }
.prefill-expr { color: #1890ff; font-family: monospace; }

/* 手写元素 */
.handwrite-element {
  border: 2px dashed #ff4444;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 68, 68, 0.03);
}
.handwrite-label { font-size: 12px; color: #ff4444; opacity: 0.7; }

/* 表格元素 */
.table-element table {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.table-element th, .table-element td {
  border: 1px solid #d9d9d9;
  padding: 2px 4px;
}
.table-element th { background: #fafafa; font-weight: 600; }
.virtual-cell { height: 20px; }

/* 图片元素 */
.image-element {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

/* 分隔线 */
.divider-element {
  border-top: 2px solid #333;
  margin-top: -1px;
}

/* 删除按钮 */
.delete-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: #ff4d4f;
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.delete-btn:hover { background: #ff7875; }

/* 锁定标记 */
.locked-badge {
  position: absolute;
  top: -6px;
  left: -6px;
  font-size: 14px;
  z-index: 999;
  pointer-events: none;
}

/* ==================== 缩放手柄 ==================== */
.resize-handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #1890ff;
  border: 2px solid #fff;
  border-radius: 2px;
  pointer-events: auto;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.handle:hover { background: #40a9ff; }

.handle-nw { top: -5px; left: -5px; cursor: nw-resize; }
.handle-n  { top: -5px; left: calc(50% - 5px); cursor: n-resize; }
.handle-ne { top: -5px; right: -5px; cursor: ne-resize; }
.handle-w  { top: calc(50% - 5px); left: -5px; cursor: w-resize; }
.handle-e  { top: calc(50% - 5px); right: -5px; cursor: e-resize; }
.handle-sw { bottom: -5px; left: -5px; cursor: sw-resize; }
.handle-s  { bottom: -5px; left: calc(50% - 5px); cursor: s-resize; }
.handle-se { bottom: -5px; right: -5px; cursor: se-resize; }

/* ==================== 属性面板 ==================== */
.property-panel {
  width: 0;
  overflow: hidden;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  transition: width 0.2s ease;
  flex-shrink: 0;
}

.property-panel.visible {
  width: 280px;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 600;
  font-size: 14px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
}

.panel-close {
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 0 4px;
}
.panel-close:hover { color: #333; }

.panel-body {
  padding: 0;
}

.prop-section {
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.prop-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.prop-field {
  margin-bottom: 8px;
}

.prop-field label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 3px;
  cursor: default;
}

.prop-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
  box-sizing: border-box;
  background: #fff;
  color: #333;
}

.prop-input:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.prop-input[type="color"] {
  padding: 2px;
  height: 30px;
}

.prop-input[type="checkbox"] {
  width: auto;
  margin-right: 4px;
}

.prop-textarea {
  resize: vertical;
  min-height: 50px;
}

.prop-row {
  display: flex;
  gap: 8px;
}

.prop-row .half {
  flex: 1;
}

.prop-value.readonly {
  display: block;
  padding: 4px 8px;
  font-size: 13px;
  color: #999;
  background: #fafafa;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.prop-checkbox {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}

.prop-actions {
  display: flex;
  gap: 16px;
}

/* 表格列编辑器 */
.table-columns-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.column-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.column-row .col-field { flex: 1; }
.column-row .col-header { flex: 1; }

.col-del {
  border: none;
  background: none;
  color: #ff4d4f;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 4px;
}

.col-add {
  margin-top: 4px;
  font-size: 12px;
}

/* ==================== 页面标签栏 ==================== */
.page-tabs {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  padding: 2px 4px;
  gap: 2px;
}
.page-tabs-scroll {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
}
.page-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #d9d9d9;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  background: #e8e8e8;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  transition: all 0.15s;
  user-select: none;
  position: relative;
  top: 1px;
}
.page-tab.active {
  background: #fff;
  color: #1890ff;
  border-color: #d9d9d9;
  font-weight: 600;
}
.page-tab:hover:not(.active) { background: #eee; color: #333; }
.page-tab-name { max-width: 80px; overflow: hidden; text-overflow: ellipsis; }
.page-tab-count {
  font-size: 10px;
  background: #d9d9d9;
  color: #666;
  border-radius: 8px;
  padding: 0 5px;
  line-height: 1.4;
}
.page-tab.active .page-tab-count { background: #e6f7ff; color: #1890ff; }
.page-tab-close { border: none; background: transparent; color: #999; cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
.page-tab-close:hover { color: #ff4d4f; }
.page-tab-add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #999;
  flex-shrink: 0;
  transition: all 0.15s;
}
.page-tab-add:hover { border-color: #1890ff; color: #1890ff; background: #e6f7ff; }

/* ==================== 状态栏 ==================== */
.canvas-statusbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 4px 16px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
}
</style>
