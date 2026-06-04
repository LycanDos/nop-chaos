<template>
  <div class="skin-preview" ref="containerRef">
    <!-- 预览工具栏 -->
    <div class="preview-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-label">预览状态</span>
        <button
          v-for="s in stateOptions" :key="s.value"
          :class="['state-btn', { active: previewState === s.value }]"
          :style="previewState === s.value ? { borderColor: s.color, color: s.color } : {}"
          @click="setAllStates(s.value)"
        >
          {{ s.label }}
        </button>
      </div>
      <div class="toolbar-right">
        <span class="toolbar-hint">点击节点编辑皮肤属性</span>
        <a-tooltip v-if="selectedElementId" content="取消选中 (Esc)" placement="bottom">
          <a-button size="small" @click="$emit('select-element', null)">取消选中</a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- bpmn-js 画布 -->
    <div class="preview-canvas" ref="canvasRef"></div>

    <!-- 画布挂件层 -->
    <div class="decoration-layer" ref="decorationRef" v-if="hasDecorations">
      <div
        v-for="dec in parsedDecorations" :key="dec.id"
        class="decoration-item"
        :class="{ 'is-locked': dec.locked }"
        :style="decorationStyle(dec)"
      >
        <div class="decoration-content">
          <template v-if="dec.type === 'image'">
            <img :src="dec.config.src" />
          </template>
          <template v-else-if="dec.type === 'iframe'">
            <div class="decoration-iframe-placeholder">
              <span class="decoration-type-label">iframe</span>
              <span class="decoration-url">{{ dec.config.url }}</span>
            </div>
          </template>
          <template v-else>
            <div class="decoration-type-label">{{ dec.type }}</div>
          </template>
        </div>
        <div class="decoration-lock-icon" v-if="dec.locked">🔒</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer'
import type Overlays from 'diagram-js/lib/features/overlays/Overlays'
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry'
import type Canvas from 'diagram-js/lib/core/Canvas'
import { PREVIEW_FLOW_XML, PREVIEW_ELEMENTS } from '../types'
import type { SkinJson, StateKey, WidgetConfig } from '../types'

// ===== Props & Emits =====
const props = defineProps<{
  skinJson: SkinJson
  previewState: StateKey
  previewProgress: number
  previewActor: string
  selectedElementId: string | null
}>()

interface EmitEvents {
  (e: 'select-element', id: string | null): void
  (e: 'set-preview-state', state: StateKey): void
}
const emit = defineEmits<EmitEvents>()

// ===== State =====
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)
const decorationRef = ref<HTMLDivElement | null>(null)
let viewer: BpmnViewer | null = null
let resizeObserver: ResizeObserver | null = null

const stateOptions = [
  { label: '激活', value: 'activated' as StateKey, color: '#1890ff' },
  { label: '完成', value: 'completed' as StateKey, color: '#52c41a' },
  { label: '失败', value: 'failed' as StateKey, color: '#ff4d4f' },
  { label: '等待', value: 'waiting' as StateKey, color: '#faad14' },
  { label: '挂起', value: 'suspended' as StateKey, color: '#d9d9d9' },
]

const palette = computed(() => props.skinJson?.variables?.palette || {})
const hasDecorations = computed(() => {
  const decs = props.skinJson?.canvasDecorations
  return decs && decs.length > 0
})
const parsedDecorations = computed(() => {
  return (props.skinJson?.canvasDecorations || []).map(d => ({
    ...d,
    _opacity: d.opacity ?? 1,
  }))
})

// ===== Color Utils =====
function lightenColor(hex: string, factor: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const nr = Math.round(r + (255 - r) * factor)
  const ng = Math.round(g + (255 - g) * factor)
  const nb = Math.round(b + (255 - b) * factor)
  return `rgb(${nr}, ${ng}, ${nb})`
}

function getStateColor(state: string): string {
  return (palette.value as Record<string, string>)[state] || '#1890ff'
}

// ===== Element-Type-Aware SVG Coloring =====

/** 对单个元素根据其类型和状态应用样式 */
function applyElementStyle(
  gfx: SVGElement, elementType: string, stateKey: StateKey, stateConfig: any,
): void {
  const visual = gfx.querySelector('.djs-visual') as SVGElement | null
  if (!visual) return

  const color = getStateColor(stateKey)
  const fillColor = lightenColor(color, 0.85)
  const isFlow = elementType === 'bpmn:SequenceFlow'

  if (isFlow) {
    // 连线：着色 path stroke
    const path = visual.querySelector('path') as SVGElement | null
    if (path) {
      path.style.setProperty('stroke', color)
      path.style.setProperty('stroke-width', '2')
    }
    return
  }

  // 节点：找主形状元素
  const shapeEl = visual.querySelector('rect, circle, ellipse, polygon, path') as SVGElement | null
  if (!shapeEl) return

  const isEvent = elementType === 'bpmn:StartEvent' || elementType === 'bpmn:EndEvent'
  const isGateway = elementType === 'bpmn:ExclusiveGateway' || elementType === 'bpmn:ParallelGateway' || elementType === 'bpmn:InclusiveGateway'

  if (isEvent) {
    // 事件（圆圈）：stroke = 颜色，fill = 浅色背景
    shapeEl.style.setProperty('stroke', color)
    shapeEl.style.setProperty('stroke-width', '3')
    shapeEl.style.setProperty('fill', fillColor)
  } else if (isGateway) {
    // 网关（菱形）：stroke = 颜色，fill = 浅色
    shapeEl.style.setProperty('stroke', color)
    shapeEl.style.setProperty('stroke-width', String(stateConfig?.strokeWidth || 2.5))
    shapeEl.style.setProperty('fill', fillColor)
  } else {
    // 任务（矩形）
    shapeEl.style.setProperty('fill', fillColor)
    shapeEl.style.setProperty('stroke', color)
    shapeEl.style.setProperty('stroke-width', String(stateConfig?.strokeWidth || 2))

    // 圆角
    const br = stateConfig?.borderRadius
    if (br !== undefined && shapeEl.tagName === 'rect') {
      shapeEl.setAttribute('rx', String(br))
      shapeEl.setAttribute('ry', String(br))
    }

    // 边框样式
    const dashstyle = stateConfig?.strokeDashstyle || 'solid'
    if (dashstyle === 'dashed') {
      shapeEl.style.setProperty('stroke-dasharray', '6, 4')
    } else if (dashstyle === 'dotted') {
      shapeEl.style.setProperty('stroke-dasharray', '2, 3')
    } else {
      shapeEl.style.removeProperty('stroke-dasharray')
    }
  }

  // 文字（所有节点类型共用）
  const textEl = visual.querySelector('text') as SVGTextElement | null
  if (textEl) {
    if (stateConfig?.textColor) {
      textEl.style.setProperty('fill', stateConfig.textColor)
    }
    if (stateConfig?.fontSize) {
      textEl.style.setProperty('font-size', `${stateConfig.fontSize}px`)
    }
  }

  // 脉冲动画
  gfx.classList.remove('bpmn-skin-pulse', 'bpmn-skin-marquee',
    'bpmn-effect-glow', 'bpmn-effect-breathing', 'bpmn-effect-dash-flow')

  if (stateConfig?.pulsing) {
    gfx.classList.add('bpmn-skin-pulse')
  }

  // 跑马灯（矩形节点专用）
  if (stateConfig?.marquee && shapeEl.tagName === 'rect') {
    gfx.classList.add('bpmn-skin-marquee')
    shapeEl.style.setProperty('stroke-dasharray', '12 6')
  }

  // 边框特效
  const be = stateConfig?.borderEffect
  if (be?.type) {
    gfx.style.setProperty('--effect-color', be.color || color)
    gfx.style.setProperty('--effect-speed', `${be.speed || 800}ms`)
    gfx.classList.add(`bpmn-effect-${be.type}`)
  }

  // 阴影
  const shadow = stateConfig?.shadow
  if (shadow && typeof shadow === 'object') {
    const sc = shadow.color || '#000000'
    const sb = shadow.blur || 4
    const sx = shadow.offsetX || 2
    const sy = shadow.offsetY || 2
    gfx.style.setProperty('filter', `drop-shadow(${sx}px ${sy}px ${sb}px ${sc})`)
  } else {
    gfx.style.removeProperty('filter')
  }

  // 透明度（脉冲动画时不能用固定 opacity）
  if (!stateConfig?.pulsing) {
    const opacity = stateConfig?.opacity
    gfx.style.opacity = opacity !== undefined ? String(opacity) : '1'
  } else {
    gfx.style.removeProperty('opacity')
  }
}

// ===== 选中高亮 =====
function applySelectionHighlight(elementId: string | null): void {
  if (!viewer) return
  const elementRegistry = viewer.get<ElementRegistry>('elementRegistry')
  const canvas = viewer.get<Canvas>('canvas')

  // 清除旧高亮
  document.querySelectorAll('.bpmn-element-selected').forEach(el => {
    el.classList.remove('bpmn-element-selected')
  })

  if (!elementId) return
  const element = elementRegistry.get(elementId)
  if (!element) return
  const gfx = elementRegistry.getGraphics(element) as SVGElement | null
  if (gfx) {
    gfx.classList.add('bpmn-element-selected')
  }
  // 确保元素在视图中
  canvas.scrollToElement(element)
}

// ===== 挂件渲染（实际内容） =====

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function createWidgetHtml(w: WidgetConfig): string {
  const baseStyle = `opacity: ${w.opacity ?? 1};`

  switch (w.type) {
    case 'badge': {
      const bg = w.config.color || '#ff4d4f'
      const text = escapeHtml(String(w.config.text ?? '')) || '0'
      return `<div style="${baseStyle}background:${bg};color:#fff;border-radius:10px;padding:0 6px;font-size:11px;font-weight:600;line-height:18px;min-width:18px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.2);pointer-events:auto">${text}</div>`
    }
    case 'label': {
      const text = escapeHtml(String(w.config.text ?? '')) || '标签'
      const link = w.config.link
      const content = `<span style="font-size:12px;padding:2px 8px;background:rgba(255,255,255,0.95);border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.1);display:inline-block">${text}</span>`
      if (link) {
        return `<a href="${escapeHtml(link)}" target="_blank" style="${baseStyle}text-decoration:none;color:inherit" title="${escapeHtml(link)}">${content}</a>`
      }
      return `<div style="${baseStyle}">${content}</div>`
    }
    case 'rich-text': {
      return `<div style="${baseStyle}max-width:200px;max-height:100px;overflow:hidden;background:rgba(255,255,255,0.9);border-radius:3px;padding:4px;font-size:12px;pointer-events:auto">${w.config.html || ''}</div>`
    }
    case 'image': {
      const src = escapeHtml(w.config.src || '')
      const width = w.config.width || 24
      const height = w.config.height || 24
      const placeholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#f0f0f0"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="#ccc">?</text></svg>')
      return `<img src="${src || placeholder}" style="${baseStyle}width:${width}px;height:${height}px;object-fit:contain;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,0.15)" />`
    }
    case 'status-dot': {
      const size = w.config.size || 10
      const color = w.config.color || '#52c41a'
      return `<div style="${baseStyle}width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 4px rgba(0,0,0,0.3)"></div>`
    }
    case 'progress': {
      const val = Math.max(0, Math.min(100, w.config.percent ?? 50))
      const barColor = w.config.barColor || '#1890ff'
      const trailColor = w.config.trailColor || '#f0f0f0'
      const pw = w.config.width ?? 60
      const ph = w.config.height ?? 6
      const r = Math.max(1, ph / 2)
      return `<div style="${baseStyle}width:${pw}px;height:${ph}px;background:${trailColor};border-radius:${r}px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)"><div style="width:${val}%;height:100%;background:${barColor};border-radius:${r}px;transition:width 0.3s"></div></div>`
    }
    case 'timer': {
      const fmt = w.config.format || 'mm:ss'
      const display = fmt === 'elapsed' ? '12:30:45' : fmt === 'hh:mm:ss' ? '05:30:45' : '05:30'
      return `<div style="${baseStyle}font-size:11px;font-family:monospace;padding:2px 6px;background:rgba(0,0,0,0.7);color:#fff;border-radius:3px;white-space:nowrap;pointer-events:auto">${display}</div>`
    }
    default:
      return `<div style="${baseStyle}font-size:11px;padding:2px 6px;background:#e6f7ff;border-radius:3px;color:#1890ff">${w.type}</div>`
  }
}

function getWidgetPosition(w: WidgetConfig): Record<string, any> {
  const margin = w.layer === 'inner' ? 4 : -12

  const positions: Record<string, Record<string, any>> = {
    'top-left': { top: margin, left: margin },
    'top-right': { top: margin, right: margin },
    'bottom-left': { bottom: margin, left: margin },
    'bottom-right': { bottom: margin, right: margin },
    'top-center': { top: margin, left: '50%' },
    'bottom-center': { bottom: margin, left: '50%' },
    'left-center': { top: '50%', left: margin },
    'right-center': { top: '50%', right: margin },
    'center': { top: '50%', left: '50%' },
  }
  return positions[w.anchor] || positions['top-right']
}

function getWidgetCenterClass(anchor: string): string {
  if (anchor === 'center') return ' widget-center'
  if (anchor.endsWith('-center')) return ' widget-' + anchor.split('-')[0] + '-center'
  return ''
}

/** 渲染所有节点挂件（实际内容） */
function renderNodeWidgets(): void {
  if (!viewer) return
  const overlays = viewer.get<Overlays>('overlays')
  const elementRegistry = viewer.get<ElementRegistry>('elementRegistry')

  overlays.remove({ type: 'node-widget' })

  const overrides = props.skinJson?.elementOverrides
  if (!overrides) return

  for (const [elId, override] of Object.entries(overrides)) {
    const widgets = override.widgets
    if (!widgets || widgets.length === 0) continue

    const element = elementRegistry.get(elId)
    if (!element) continue

    widgets.forEach((w) => {
      const html = document.createElement('div')
      html.className = 'widget-render' + getWidgetCenterClass(w.anchor)
      html.innerHTML = createWidgetHtml(w)

      overlays.add(element, 'node-widget', {
        position: getWidgetPosition(w),
        html,
      })
    })
  }
}

// ===== 画布挂件定位 =====
function decorationStyle(dec: any): Record<string, string> {
  return {
    left: `${dec.x}px`,
    top: `${dec.y}px`,
    width: dec.width ? `${dec.width}px` : 'auto',
    height: dec.height ? `${dec.height}px` : 'auto',
    zIndex: String(dec.zIndex || 1),
    opacity: String(dec._opacity ?? 1),
  }
}

// ===== 主渲染流程 =====

/** 对预览中所有元素应用皮肤样式 */
function applyAllStyles(): void {
  if (!viewer) return
  const elementRegistry = viewer.get<ElementRegistry>('elementRegistry')

  for (const pe of PREVIEW_ELEMENTS) {
    const element = elementRegistry.get(pe.id)
    if (!element) continue

    const override = props.skinJson?.elementOverrides?.[pe.id]
    const stateKey = props.previewState || pe.defaultState

    const gfx = elementRegistry.getGraphics(element) as SVGElement | null
    if (!gfx) continue

    // 从全局或覆盖中获取状态配置
    const globalState = props.skinJson?.states?.[stateKey] || {}
    const overrideState = override?.states?.[stateKey] || {}
    const mergedState = { ...globalState, ...overrideState }

    // 如果元素有 accentColor，用其覆盖调色板
    if (override?.accentColor) {
      // 临时修改 palette 引用
      const originalColor = getStateColor(stateKey)
      // 直接应用在样式上
      const color = override.accentColor
      const fillColor = lightenColor(color, 0.85)
      const visual = gfx.querySelector('.djs-visual') as SVGElement | null
      if (visual) {
        const rect = visual.querySelector('rect, circle, ellipse, polygon') as SVGElement | null
        if (rect) {
          rect.style.setProperty('stroke', color)
          rect.style.setProperty('fill', fillColor)
        }
      }
    }

    applyElementStyle(gfx, pe.type, stateKey, mergedState)
  }

  // 渲染序列流（连线）
  const flowIds = ['Flow_1', 'Flow_2', 'Flow_3', 'Flow_4', 'Flow_5', 'Flow_6']
  for (const fid of flowIds) {
    const el = elementRegistry.get(fid)
    if (!el) continue
    const gfx = elementRegistry.getGraphics(el) as SVGElement | null
    if (!gfx) continue
    // 连线使用全局预览状态颜色
    applyElementStyle(gfx, 'bpmn:SequenceFlow', props.previewState || 'waiting', {})
  }

  renderNodeWidgets()
  renderStatusOverlays()
  applySelectionHighlight(props.selectedElementId)
}

function renderStatusOverlays(): void {
  if (!viewer) return
  const overlays = viewer.get<Overlays>('overlays')
  const elementRegistry = viewer.get<ElementRegistry>('elementRegistry')

  // 清除旧的 overlay
  overlays.remove({ type: 'skin-progress' })
  overlays.remove({ type: 'skin-assignee' })
  overlays.remove({ type: 'skin-tooltip' })

  // 找到激活中的主节点作为 overlay 挂载目标
  const targetId = 'UserTask_1'
  const element = elementRegistry.get(targetId)
  if (!element) return

  const gfx = elementRegistry.getGraphics(element) as SVGElement | null
  const taskWidth = gfx ? gfx.getBoundingClientRect().width : 110

  const progress = props.skinJson?.progress
  const overlaysCfg = props.skinJson?.overlays

  // === 进度条 ===
  if (progress?.show !== false) {
    const barHeight = progress?.height || 4
    const barRadius = progress?.borderRadius || 0
    const stateColors = progress?.perState?.[props.previewState]
    const barColor = stateColors?.bar || progress?.colors?.bar || '#1890ff'
    const trailColor = stateColors?.trail || progress?.colors?.trail || '#f0f0f0'
    const progressVal = Math.max(0, Math.min(100, props.previewProgress))
    const isTop = progress?.position === 'top'
    const offsetX = progress?.offsetX || 0
    const offsetY = progress?.offsetY || 0

    const wrapEl = document.createElement('div')
    wrapEl.style.cssText = `
      position: relative; width: ${taskWidth}px; height: ${barHeight}px;
      background: ${trailColor}; overflow: hidden; border-radius: ${barRadius}px;
    `
    const barEl = document.createElement('div')
    barEl.style.cssText = `
      width: ${progressVal}%; height: 100%;
      background: ${barColor}; transition: width 0.35s ease;
      border-radius: ${barRadius}px;
    `
    wrapEl.appendChild(barEl)
    overlays.add(element, 'skin-progress', {
      position: isTop ? { top: offsetY, left: offsetX } : { bottom: offsetY, left: offsetX },
      html: wrapEl,
    })
  }

  // === 经办人徽章 ===
  const assignee = overlaysCfg?.assignee
  if (assignee?.show !== false) {
    const badge = document.createElement('div')
    badge.textContent = props.previewActor || '办理人'
    badge.style.cssText = `
      font-size: 10px; padding: 1px 8px; border-radius: 10px;
      white-space: nowrap; line-height: 1.6;
      background: ${assignee?.style?.bgColor || '#1890ff'};
      color: ${assignee?.style?.textColor || '#ffffff'};
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
      pointer-events: none;
    `
    const posMap: Record<string, Record<string, number>> = {
      'top-right': { top: -6, right: -6 },
      'top-left': { top: -6, left: -6 },
      'bottom-right': { bottom: -6, right: -6 },
      'bottom-left': { bottom: -6, left: -6 },
    }
    const basePos = posMap[assignee?.position || 'top-right'] || posMap['top-right']
    const pos = { ...basePos }
    const aOffX = assignee?.offsetX || 0
    const aOffY = assignee?.offsetY || 0
    if (pos.top !== undefined) pos.top += aOffY
    if (pos.left !== undefined) pos.left += aOffX
    if (pos.bottom !== undefined) pos.bottom -= aOffY
    if (pos.right !== undefined) pos.right -= aOffX
    overlays.add(element, 'skin-assignee', { position: pos, html: badge })
  }

  // === Tooltip ===
  const tooltip = overlaysCfg?.tooltip
  if (tooltip?.show !== false) {
    const tipEl = document.createElement('div')
    tipEl.textContent = `状态: ${props.previewState} | 进度: ${props.previewProgress}%`
    tipEl.style.cssText = `
      position: absolute; left: 50%; bottom: calc(100% + 8px);
      transform: translateX(-50%);
      background: #333; color: #fff; font-size: 11px;
      padding: 4px 10px; border-radius: 4px;
      white-space: nowrap; pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 10;
    `
    const arrow = document.createElement('div')
    arrow.style.cssText = `
      position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: #333;
    `
    tipEl.appendChild(arrow)
    const tOffX = tooltip?.offsetX || 0
    const tOffY = tooltip?.offsetY || 0
    overlays.add(element, 'skin-tooltip', {
      position: { top: tOffY, left: tOffX },
      html: tipEl,
    })
  }
}


// ===== 预览状态切换 =====
function setAllStates(state: StateKey): void {
  emit('select-element', null)
  emit('set-preview-state', state)
  // refresh 由 watch(previewState) 自动触发
}

// ===== 暴露方法 =====
function refresh(): void {
  nextTick(() => {
    if (viewer) applyAllStyles()
  })
}

// ===== 初始化 Viewer =====
async function initViewer(): Promise<void> {
  if (!canvasRef.value) return

  const v = new BpmnViewer({
    container: canvasRef.value,
    width: '100%',
    height: '100%',
  })

  v.on('import.done', () => {
    nextTick(() => {
      v.get('canvas').zoom('fit-viewport', 'auto')
      applyAllStyles()
    })
  })

  // 元素点击 → 选中
  v.on('element.click', (event: any) => {
    const element = event.element
    if (!element) return
    const type = element.type || ''
    // 忽略 process/collaboration 和连线点击
    if (type === 'bpmn:Process' || type === 'bpmn:Collaboration' || type === 'bpmn:SequenceFlow') {
      emit('select-element', null)
      return
    }
    emit('select-element', element.id)
  })

  // 画布空白点击 → 取消选中
  v.on('canvas.click', () => {
    emit('select-element', null)
  })

  // 缩放/平移 → 更新画布挂件位置
  v.on('canvas.viewbox.changed', () => {
    // 画布挂件使用绝对定位，需要同步
  })

  try {
    await v.importXML(PREVIEW_FLOW_XML)
    viewer = v
  } catch (e) {
    console.error('BPMN 预览导入失败:', e)
  }
}

// ===== 生命周期 =====
onMounted(() => {
  initViewer()

  // ResizeObserver
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      if (viewer) {
        viewer.get('canvas').zoom('fit-viewport', 'auto')
        applyAllStyles()
      }
    })
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  viewer?.destroy()
  viewer = null
})

// ===== Watchers =====
watch(() => props.skinJson, refresh, { deep: true })
watch(() => props.previewState, refresh)
watch(() => props.previewProgress, refresh)
watch(() => props.previewActor, refresh)
watch(() => props.selectedElementId, () => {
  applySelectionHighlight(props.selectedElementId)
})

defineExpose({ refresh })
</script>

<style scoped>
.skin-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-hint {
  font-size: 11px;
  color: #aaa;
}

.state-btn {
  padding: 3px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  background: #fff;
  transition: all 0.2s;
  outline: none;
  font-family: inherit;
  color: #666;
}

.state-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.state-btn.active {
  color: #fff;
  border-color: #1890ff;
  background: #1890ff;
}

.preview-canvas {
  flex: 1;
  min-height: 300px;
  position: relative;
}

/* ===== 画布挂件层 ===== */
.decoration-layer {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.decoration-item {
  position: absolute;
  pointer-events: auto;
  transition: opacity 0.2s;
}

.decoration-item.is-locked {
  cursor: default;
}

.decoration-content {
  background: rgba(255,255,255,0.85);
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.decoration-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.decoration-iframe-placeholder {
  font-size: 11px;
  color: #999;
  text-align: center;
  padding: 8px;
}

.decoration-type-label {
  font-size: 10px;
  color: #bbb;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.decoration-url {
  display: block;
  font-size: 10px;
  color: #1890ff;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.decoration-lock-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  opacity: 0.5;
}
</style>

<!-- 全局样式：动画和选中高亮 -->
<style>
/* 脉冲动画 */
.bpmn-skin-pulse {
  animation: bpmnSkinPulse 2s ease-in-out infinite;
}
@keyframes bpmnSkinPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* 跑马灯边框 */
.bpmn-skin-marquee .djs-visual rect {
  animation: bpmnSkinMarquee 0.8s linear infinite !important;
}
@keyframes bpmnSkinMarquee {
  0% { stroke-dashoffset: 18; }
  100% { stroke-dashoffset: 0; }
}

/* 发光效果 */
.bpmn-effect-glow {
  animation: bpmnGlow var(--effect-speed, 0.8s) ease-in-out infinite;
}
@keyframes bpmnGlow {
  0%, 100% { filter: drop-shadow(0 0 2px var(--effect-color, #1890ff)); }
  50% { filter: drop-shadow(0 0 8px var(--effect-color, #1890ff)); }
}

/* 呼吸效果 */
.bpmn-effect-breathing {
  animation: bpmnBreathing var(--effect-speed, 0.8s) ease-in-out infinite;
}
@keyframes bpmnBreathing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 虚线流动 */
.bpmn-effect-dash-flow .djs-visual rect,
.bpmn-effect-dash-flow .djs-visual circle,
.bpmn-effect-dash-flow .djs-visual polygon {
  stroke-dasharray: 12 6;
  animation: bpmnDashFlow var(--effect-speed, 0.8s) linear infinite;
}
@keyframes bpmnDashFlow {
  0% { stroke-dashoffset: 18; }
  100% { stroke-dashoffset: 0; }
}

/* 选中高亮 */
.bpmn-element-selected .djs-visual > rect,
.bpmn-element-selected .djs-visual > circle,
.bpmn-element-selected .djs-visual > ellipse,
.bpmn-element-selected .djs-visual > polygon {
  stroke-width: 3 !important;
  stroke: #1890ff !important;
  filter: drop-shadow(0 0 4px rgba(24,144,255,0.5));
}

/* 挂件渲染 */
.widget-render {
  line-height: 1;
  pointer-events: auto;
}
.widget-render img {
  display: block;
}
/* 居中定位辅助 */
.widget-render.widget-top-center { transform: translateX(-50%); }
.widget-render.widget-bottom-center { transform: translateX(-50%); }
.widget-render.widget-left-center { transform: translateY(-50%); }
.widget-render.widget-right-center { transform: translateY(-50%); }
.widget-render.widget-center { transform: translate(-50%, -50%); }

/* 防止 overlay 被画布裁切 */
.djs-overlays {
  overflow: visible !important;
}
</style>
