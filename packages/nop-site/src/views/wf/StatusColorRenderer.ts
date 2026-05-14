/**
 * 状态着色层 — 根据运行时状态对 BPMN 元素进行着色
 *
 * 策略：
 * - 节点：修改 .djs-visual 下 shape 元素的 fill 属性
 * - 连线：修改 .djs-visual 下 path 元素的 stroke 属性
 * - 执行中节点额外添加 CSS class 'bpmn-runtime-active' 触发呼吸动画
 * - 使用 Overlay 显示执行序号徽章
 */
import type BpmnViewer from 'bpmn-js/lib/Viewer'
import type Canvas from 'diagram-js/lib/core/Canvas'
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry'
import type Overlays from 'diagram-js/lib/features/overlays/Overlays'
import type { Element } from 'bpmn-js/lib/model/Types'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import type { ElementState } from './RuntimeDataProvider'

export interface StatusColorConfig {
  completed: string
  active: string
  failed: string
  rejected: string
  killed: string
  pending: string
}

const DEFAULT_COLORS: StatusColorConfig = {
  completed: '#52c41a',
  active: '#1890ff',
  failed: '#ff4d4f',
  rejected: '#faad14',
  killed: '#8c8c8c',
  pending: '',
}

/** 已着色的元素 ID 集合，用于 reset */
const coloredElementIds = new Set<string>()
const activeElementIds = new Set<string>()

/**
 * 对 BPMN 画布上的元素进行状态着色
 */
export function applyStatusColors(
  viewer: BpmnViewer,
  elementStates: ElementState[],
  config?: Partial<StatusColorConfig>,
): void {
  const colors = { ...DEFAULT_COLORS, ...config }
  const elementRegistry = viewer.get<ElementRegistry>('elementRegistry')
  const canvas = viewer.get<Canvas>('canvas')

  coloredElementIds.clear()
  activeElementIds.clear()

  for (const state of elementStates) {
    const element = elementRegistry.get(state.elementId)
    if (!element) continue

    const color = getStatusColor(state.status, colors)
    if (!color) continue

    coloredElementIds.add(state.elementId)
    colorElement(element, state.status, color, elementRegistry)
  }
}

/**
 * 清除所有已应用的状态着色（恢复到默认样式）
 */
export function resetStatusColors(viewer: BpmnViewer): void {
  const elementRegistry = viewer.get<ElementRegistry>('elementRegistry')

  for (const elementId of coloredElementIds) {
    const element = elementRegistry.get(elementId)
    if (!element) continue
    resetElementColor(element, elementRegistry)
  }

  coloredElementIds.clear()
  activeElementIds.clear()
}

function getStatusColor(status: string, colors: StatusColorConfig): string {
  switch (status) {
    case 'completed': return colors.completed
    case 'active': return colors.active
    case 'failed': return colors.failed
    case 'rejected': return colors.rejected
    case 'killed': return colors.killed
    default: return ''
  }
}

function colorElement(
  element: Element,
  status: string,
  color: string,
  elementRegistry: ElementRegistry,
): void {
  const gfx = elementRegistry.getGraphics(element)
  if (!gfx) return

  const visual = gfx.querySelector('.djs-visual') as SVGElement | null
  if (!visual) return

  if (is(element, 'bpmn:SequenceFlow')) {
    // 连线：修改 path stroke
    const path = visual.querySelector('path') as SVGPathElement | null
    if (path) {
      path.setAttribute('stroke', color)
      path.style.stroke = color
    }
    return
  }

  // 节点：修改形状元素的 fill
  const shapeEl = visual.querySelector('rect, circle, ellipse, path, polygon') as SVGElement | null
  if (shapeEl) {
    const tagName = shapeEl.tagName.toLowerCase()

    // 对 StartEvent/EndEvent 这种圆形使用 stroke 而非 fill
    if (is(element, 'bpmn:StartEvent') || is(element, 'bpmn:EndEvent')) {
      shapeEl.setAttribute('stroke', color)
      shapeEl.setAttribute('fill', lightenColor(color, 0.85))
    } else if (is(element, 'bpmn:ExclusiveGateway') || is(element, 'bpmn:ParallelGateway') || is(element, 'bpmn:InclusiveGateway')) {
      shapeEl.setAttribute('fill', lightenColor(color, 0.85))
      shapeEl.setAttribute('stroke', color)
    } else {
      // Task 等
      shapeEl.setAttribute('fill', lightenColor(color, 0.85))
      shapeEl.setAttribute('stroke', color)
    }

    // 执行中节点添加呼吸动画 class
    if (status === 'active') {
      gfx.classList.add('bpmn-runtime-active')
      activeElementIds.add(element.id)
    }
  }
}

function resetElementColor(element: Element, elementRegistry: ElementRegistry): void {
  const gfx = elementRegistry.getGraphics(element)
  if (!gfx) return

  gfx.classList.remove('bpmn-runtime-active')

  const visual = gfx.querySelector('.djs-visual') as SVGElement | null
  if (!visual) return

  const shapeEl = visual.querySelector('rect, circle, ellipse, path, polygon') as SVGElement | null
  if (shapeEl) {
    shapeEl.removeAttribute('fill')
    shapeEl.removeAttribute('stroke')
  }
}

/**
 * 在已完成的节点上显示执行序号徽章
 */
export function renderExecBadges(
  viewer: BpmnViewer,
  elementStates: ElementState[],
): void {
  const overlays = viewer.get<Overlays>('overlays')
  const elementRegistry = viewer.get<ElementRegistry>('elementRegistry')

  // 先清除已有序号徽章
  overlays.remove({ type: 'exec-badge' })

  for (const state of elementStates) {
    if (state.execIndex === undefined || state.execIndex === null) continue
    if (state.status === 'pending') continue

    const element = elementRegistry.get(state.elementId)
    if (!element) continue
    if (is(element, 'bpmn:SequenceFlow')) continue

    const badge = document.createElement('div')
    badge.className = `bpmn-exec-badge ${state.status === 'active' ? 'is-active' : ''}`
    badge.textContent = String(state.execIndex + 1)

    overlays.add(element, 'exec-badge', {
      position: { bottom: 2, right: 2 },
      html: badge,
    })
  }
}

/**
 * 清除执行序号徽章
 */
export function clearExecBadges(viewer: BpmnViewer): void {
  const overlays = viewer.get<Overlays>('overlays')
  overlays.remove({ type: 'exec-badge' })
}

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
