import type BpmnModeler from 'bpmn-js/lib/Modeler'
import type { Element } from 'bpmn-js/lib/model/Types'
import type Canvas from 'diagram-js/lib/core/Canvas'
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry'
import type EventBus from 'diagram-js/lib/core/EventBus'
import type Overlays from 'diagram-js/lib/features/overlays/Overlays'
import { getBusinessObject, is, isAny } from 'bpmn-js/lib/util/ModelUtil'
import { append as svgAppend, attr as svgAttr, create as svgCreate, remove as svgRemove } from 'tiny-svg'
import {
  AngleRightIcon,
  InfoIcon,
  LogIcon,
  PauseIcon,
  PlayIcon,
  RemovePauseIcon,
  ResetIcon,
  TachometerIcon,
  TimesIcon,
} from 'bpmn-js-token-simulation/lib/icons'
import type { ExecutorApiAdapter } from '@/hooks/useExecutorApi.ts'
import type { ExecutorMethodItem } from '@/types/executor.ts'

type RollbackTone = 'info' | 'success' | 'warning' | 'danger'

interface ReverseSimulationOptions {
  executorApi?: ExecutorApiAdapter
}

interface ReverseStep {
  kind: 'node' | 'flow'
  element: Element
}

interface StepPresentation {
  tone: RollbackTone
  text?: string
  autoPause?: boolean
}

interface ExecutorBindingSnapshot {
  executorReleaseId: string
  methodId: string
  methodName: string
}

interface ReverseTrace {
  id: string
  startElementId: string
  currentElementId: string
  stationaryElementId: string
  steps: ReverseStep[]
  stepIndex: number
  color: ScopeColors
  status: 'running' | 'animating' | 'paused' | 'completed'
  pausedFrom?: 'running' | 'animating'
  pauseReason?: 'manual' | 'irreversible'
  visitedElementIds: Set<string>
  trailSteps: ReverseStep[]
}

interface ScopeColors {
  primary: string
  auxiliary: string
}

interface LogEntry {
  id: string
  text: string
  tone: RollbackTone
  traceId?: string
  color?: ScopeColors
}

const CONTROL_OVERLAY_TYPE = 'bts-context-menu'
const TOKEN_OVERLAY_TYPE = 'bts-token-count'
const ELEMENT_NOTIFICATION_OVERLAY_TYPE = 'bts-element-notification'
const SPEEDS: Array<{ label: string; value: number }> = [
  { label: 'Slow', value: 0.5 },
  { label: 'Normal', value: 1 },
  { label: 'Fast', value: 2 },
]

const CONTROL_OFFSET_TOP = -15
const CONTROL_OFFSET_LEFT = -15
const TOKEN_OFFSET_BOTTOM = 10
const TOKEN_OFFSET_LEFT = -15
const NOTIFICATION_TIME_TO_LIVE = 2200
const BASE_FLOW_STEP_DELAY = 380
const BASE_NODE_STEP_DELAY = 720
const BASE_RESUME_DELAY = 420
const TRACE_LAYER_NAME = 'reverse-simulation-trace'
const TRACE_LAYER_INDEX = 120
const TRACE_LANE_GAP = 14
const TRACE_ANCHOR_SIZE = 22

const TRACE_COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#ec4899',
]

export class ReverseSimulationController {
  private readonly modeler: BpmnModeler
  private readonly executorApi?: ExecutorApiAdapter
  private readonly eventBus: EventBus
  private readonly canvas: Canvas
  private readonly overlays: Overlays
  private readonly elementRegistry: ElementRegistry
  private readonly animation: any
  private readonly traceLayer: SVGGElement
  private readonly releaseMethodCache = new Map<string, Promise<Map<string, ExecutorMethodItem>>>()

  private active = false
  private paused = false
  private animationSpeed = 1
  private traceCounter = 1
  private colorIndex = 0
  private selectedElementId = ''
  private tokenOverlayIds = new Map<string, string | number>()
  private elementNotificationOverlayIds = new Map<string, string | number>()
  private tracePathElements = new Map<string, SVGPathElement>()
  private traceTimers = new Map<string, number>()
  private traceStacks = new Map<string, string[]>()
  private readonly pausePoints = new Set<string>()
  private readonly traces = new Map<string, ReverseTrace>()
  private readonly logEntries: LogEntry[] = []

  private speedContainer: HTMLDivElement | null = null
  private paletteContainer: HTMLDivElement | null = null
  private palettePlayPauseEntry: HTMLElement | null = null
  private paletteResetEntry: HTMLElement | null = null
  private paletteLogEntry: HTMLElement | null = null
  private logContainer: HTMLDivElement | null = null
  private logContent: HTMLDivElement | null = null
  private logPlaceholder: HTMLParagraphElement | null = null
  private notificationsContainer: HTMLDivElement | null = null

  constructor(modeler: BpmnModeler, options: ReverseSimulationOptions = {}) {
    this.modeler = modeler
    this.executorApi = options.executorApi
    this.eventBus = modeler.get<EventBus>('eventBus')
    this.canvas = modeler.get<Canvas>('canvas')
    this.overlays = modeler.get<Overlays>('overlays')
    this.elementRegistry = modeler.get<ElementRegistry>('elementRegistry')
    this.animation = modeler.get<any>('animation')
    this.traceLayer = this.canvas.getLayer(TRACE_LAYER_NAME, TRACE_LAYER_INDEX) as SVGGElement

    this.eventBus.on('root.set', () => {
      if (this.active) {
        this.renderControls()
        this.renderTokens()
        this.renderAllTracePaths()
      }
    })

    this.eventBus.on('elements.changed', () => {
      if (this.active) {
        this.renderControls()
        this.renderTokens()
        this.renderAllTracePaths()
      }
    })

    this.eventBus.on('selection.changed', (event: { newSelection?: Element[] }) => {
      const selection = event.newSelection || []
      this.selectedElementId = selection[0]?.id || ''
    })

    this.initPalette()
    this.initLog()
    this.initNotifications()
    this.initSpeedControls()
  }

  isActive() {
    return this.active
  }

  activate() {
    if (this.active) {
      return
    }
    this.active = true
    this.paused = false
    this.traceCounter = 1
    this.colorIndex = 0
    this.clearRuntime()
    this.selectedElementId = this.getCurrentSelectionId()
    this.animation?.setAnimationSpeed?.(this.animationSpeed)
    this.setModeClass(true)
    this.clearSelection()
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
  }

  deactivate() {
    if (!this.active) {
      return
    }
    this.active = false
    this.paused = false
    this.animation?.pause?.()
    this.clearAllTimers()
    this.clearRuntime()
    this.clearControls()
    this.setModeClass(false)
    this.hideLog()
    this.clearNotifications()
    this.syncPaletteEntries()
    this.restoreSelection()
  }

  startOrResumeFromElement(elementId: string) {
    if (!this.active) {
      return
    }

    const element = this.elementRegistry.get(elementId) as Element | undefined
    if (!element) {
      return
    }

    const trace = this.createTrace(elementId, this.buildReversePlan(element))
    this.traces.set(trace.id, trace)
    this.log({
      text: `从 ${this.getElementLabel(element)} 开始回退`,
      tone: 'info',
      traceId: trace.id,
      color: trace.color,
    })
    this.renderTrail(trace, { kind: 'node', element })
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
    this.scheduleTraceTick(trace, 0)
  }

  resumePausedTrace(traceId: string) {
    const trace = this.traces.get(traceId)
    if (!trace || trace.status !== 'paused') {
      return
    }
    this.resumeTrace(trace)
  }

  removeTrace(traceId: string) {
    const trace = this.traces.get(traceId)
    if (!trace) {
      return
    }
    this.clearTraceTimer(traceId)
    this.clearTraceMarkers(traceId)
    this.removeElementNotification(trace.currentElementId)
    this.removeTracePath(traceId)
    this.traces.delete(traceId)
    this.log({
      text: `${traceId} 轨迹已删除`,
      tone: 'info',
      traceId,
      color: trace.color,
    })
    this.renderAllTracePaths()
    this.syncAnimationPlayState()
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
  }

  setTraceGlow(traceId: string, glow: boolean) {
    const path = this.tracePathElements.get(traceId)
    if (!path) {
      return
    }
    path.classList.toggle('reverse-simulation-trace-path-glow', glow)
  }

  private renderTrail(trace: ReverseTrace, step: ReverseStep) {
    const elementId = step.element.id
    if (trace.visitedElementIds.has(elementId)) {
      this.promoteTraceStack(trace.id, elementId)
      return
    }
    trace.visitedElementIds.add(elementId)
    trace.trailSteps.push(step)
    this.pushTraceStack(trace.id, elementId)
  }

  togglePausePoint(elementId: string) {
    if (this.pausePoints.has(elementId)) {
      this.pausePoints.delete(elementId)
    } else {
      this.pausePoints.add(elementId)
    }

    if (this.active) {
      this.renderControls()
    }
  }

  togglePausePlayback() {
    if (!this.active) {
      return
    }

    const hasActive = Array.from(this.traces.values()).some(
      (trace) => trace.status === 'running' || trace.status === 'animating',
    )

    if (hasActive) {
      this.pauseAllRunningTraces('manual')
      return
    }

    if (this.hasPausedTrace()) {
      this.resumeAllPausedTraces()
    }
  }

  resetPlayback() {
    this.clearAllTimers()
    this.paused = false
    this.clearRuntime()
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
    this.showNotification({ text: '重置回退预览', tone: 'info' })
  }

  private createTrace(startElementId: string, steps: ReverseStep[]): ReverseTrace {
    return {
      id: `R${this.traceCounter++}`,
      startElementId,
      currentElementId: startElementId,
      stationaryElementId: startElementId,
      steps,
      stepIndex: 0,
      color: this.nextTraceColor(),
      status: 'running',
      visitedElementIds: new Set<string>(),
      trailSteps: [],
    }
  }

  private nextTraceColor(): ScopeColors {
    const primary = TRACE_COLORS[this.colorIndex % TRACE_COLORS.length]
    this.colorIndex += 1
    return {
      primary,
      auxiliary: this.getContrastColor(primary),
    }
  }

  private buildReversePlan(startElement: Element): ReverseStep[] {
    const visitedNodes = new Set<string>()
    const visitedFlows = new Set<string>()
    const plan: ReverseStep[] = []

    const visit = (element: Element | null | undefined) => {
      if (!element || visitedNodes.has(element.id)) {
        return
      }
      visitedNodes.add(element.id)
      plan.push({ kind: 'node', element })

      const incoming = Array.isArray((element as any).incoming)
        ? ((element as any).incoming as Element[]).filter((flow) => is(flow, 'bpmn:SequenceFlow'))
        : []

      for (const flow of incoming.slice().reverse()) {
        if (visitedFlows.has(flow.id)) {
          continue
        }
        visitedFlows.add(flow.id)
        plan.push({ kind: 'flow', element: flow })
        visit((flow as any).source || (flow as any).sourceRef)
      }
    }

    visit(startElement)
    return plan
  }

  private scheduleTraceTick(trace: ReverseTrace, delay: number) {
    this.clearTraceTimer(trace.id)

    if (!this.active) {
      return
    }
    if (trace.status !== 'running') {
      return
    }

    const timerId = window.setTimeout(() => {
      this.traceTimers.delete(trace.id)
      void this.runTraceTick(trace)
    }, delay)

    this.traceTimers.set(trace.id, timerId)
  }

  private clearTraceTimer(traceId: string) {
    const timerId = this.traceTimers.get(traceId)
    if (timerId != null) {
      window.clearTimeout(timerId)
      this.traceTimers.delete(traceId)
    }
  }

  private clearAllTimers() {
    this.traceTimers.forEach((timerId) => {
      window.clearTimeout(timerId)
    })
    this.traceTimers.clear()
  }

  private async runTraceTick(trace: ReverseTrace) {
    if (!this.active || trace.status !== 'running') {
      return
    }

    if (trace.stepIndex >= trace.steps.length) {
      this.completeTrace(trace)
      return
    }

    const step = trace.steps[trace.stepIndex++]
    const previousElementId = trace.stationaryElementId
    trace.currentElementId = step.element.id

    if (step.kind === 'flow') {
      trace.status = 'animating'
      trace.stationaryElementId = previousElementId
      this.renderTrail(trace, step)
      this.renderControls()
      this.renderTokens()
      this.animateFlow(step.element, trace)
      return
    }

    trace.stationaryElementId = step.element.id
    this.renderTrail(trace, step)

    const presentation = await this.resolveStepPresentation(step.element)

    if (!this.active || trace.status !== 'running') {
      return
    }

    if (presentation.text) {
      this.renderElementNotification(step.element, presentation, trace)
      this.showNotification({
        text: presentation.text,
        tone: presentation.tone,
        traceId: trace.id,
        color: trace.color,
      })
      this.log({
        text: `${this.getElementLabel(step.element)}: ${presentation.text}`,
        tone: presentation.tone,
        traceId: trace.id,
        color: trace.color,
      })
    } else {
      this.removeElementNotification(step.element.id)
      this.log({
        text: `回退到 ${this.getElementLabel(step.element)}`,
        tone: 'info',
        traceId: trace.id,
        color: trace.color,
      })
    }

    if (presentation.autoPause) {
      trace.status = 'paused'
      trace.pauseReason = 'irreversible'
      this.paused = this.hasPausedTrace()
      this.syncAnimationPlayState()
      this.renderControls()
      this.renderTokens()
      this.syncPaletteEntries()
      return
    }

    if (this.pausePoints.has(step.element.id)) {
      trace.status = 'paused'
      trace.pauseReason = 'manual'
      this.paused = this.hasPausedTrace()
      this.syncAnimationPlayState()
      this.showNotification({
        text: `命中回退暂停点，点击左侧播放继续`,
        tone: 'info',
        traceId: trace.id,
        color: trace.color,
      })
      this.renderControls()
      this.renderTokens()
      this.syncPaletteEntries()
      return
    }

    if (trace.stepIndex >= trace.steps.length) {
      this.completeTrace(trace)
      return
    }

    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
    this.scheduleTraceTick(trace, this.getDelay(BASE_NODE_STEP_DELAY))
  }

  private completeTrace(trace: ReverseTrace) {
    trace.status = 'completed'
    trace.pauseReason = undefined
    const element = this.elementRegistry.get(trace.currentElementId)
    this.log({
      text: `${trace.id} 回退完成${element ? `，停在 ${this.getElementLabel(element)}` : ''}`,
      tone: 'success',
      traceId: trace.id,
      color: trace.color,
    })
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
  }

  private pauseAllRunningTraces(reason: 'manual' | 'irreversible') {
    this.paused = true
    Array.from(this.traces.values()).forEach((trace) => {
      if (trace.status === 'running' || trace.status === 'animating') {
        trace.pausedFrom = trace.status
        trace.status = 'paused'
        trace.pauseReason = reason
        this.clearTraceTimer(trace.id)
      }
    })
    this.syncAnimationPlayState()
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
    this.showNotification({
      text: reason === 'manual' ? '暂停回退预览' : '回退已暂停',
      tone: 'info',
    })
  }

  private resumeTrace(trace: ReverseTrace) {
    const wasAnimating = trace.pausedFrom === 'animating'
    trace.status = wasAnimating ? 'animating' : 'running'
    trace.pausedFrom = undefined
    trace.pauseReason = undefined
    this.paused = this.hasPausedTrace()
    this.syncAnimationPlayState()
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
    if (!wasAnimating) {
      this.scheduleTraceTick(trace, this.getDelay(BASE_RESUME_DELAY))
    }
  }

  private resumeAllPausedTraces() {
    const pausedTraces: ReverseTrace[] = []
    Array.from(this.traces.values()).forEach((trace) => {
      if (trace.status === 'paused') {
        pausedTraces.push(trace)
      }
    })

    if (!pausedTraces.length) {
      return
    }

    this.paused = false

    pausedTraces.forEach((trace) => {
      const wasAnimating = trace.pausedFrom === 'animating'
      trace.status = wasAnimating ? 'animating' : 'running'
      trace.pausedFrom = undefined
      trace.pauseReason = undefined
      if (!wasAnimating) {
        this.scheduleTraceTick(trace, this.getDelay(BASE_RESUME_DELAY))
      }
    })

    this.syncAnimationPlayState()
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
    this.showNotification({ text: '继续回退预览', tone: 'info' })
  }

  private syncAnimationPlayState() {
    const hasAnimating = Array.from(this.traces.values()).some((trace) => trace.status === 'animating')
    if (hasAnimating) {
      this.animation?.play?.()
    } else {
      this.animation?.pause?.()
    }
  }

  private hasPausedTrace() {
    return Array.from(this.traces.values()).some((trace) => trace.status === 'paused')
  }

  private hasPendingTrace() {
    return Array.from(this.traces.values()).some((trace) => trace.status !== 'completed')
  }

  private pushTraceStack(traceId: string, elementId: string) {
    const stack = this.traceStacks.get(elementId) || []
    const existing = stack.indexOf(traceId)
    if (existing !== -1) {
      stack.splice(existing, 1)
    }
    stack.push(traceId)
    this.traceStacks.set(elementId, stack)
    this.renderAllTracePaths()
  }

  private promoteTraceStack(traceId: string, elementId: string) {
    const stack = this.traceStacks.get(elementId)
    if (!stack) {
      return
    }
    const idx = stack.indexOf(traceId)
    if (idx !== -1) {
      stack.splice(idx, 1)
      stack.push(traceId)
    }
    this.renderAllTracePaths()
  }

  private removeFromTraceStack(traceId: string, elementId: string) {
    const stack = this.traceStacks.get(elementId)
    if (!stack) {
      return
    }
    const idx = stack.indexOf(traceId)
    if (idx !== -1) {
      stack.splice(idx, 1)
    }
    if (stack.length === 0) {
      this.traceStacks.delete(elementId)
    } else {
      this.traceStacks.set(elementId, stack)
    }
    this.renderAllTracePaths()
  }

  private clearTraceMarkers(traceId: string) {
    const trace = this.traces.get(traceId)
    if (!trace) {
      return
    }
    trace.visitedElementIds.forEach((elementId) => {
      this.removeFromTraceStack(traceId, elementId)
    })
    trace.visitedElementIds.clear()
  }

  private clearAllTraceMarkers() {
    this.traceStacks.clear()
    this.clearAllTracePaths()
  }

  private clearRuntime() {
    this.clearAllTimers()
    this.traces.clear()
    this.logEntries.splice(0, this.logEntries.length)
    this.clearTokenOverlays()
    this.clearElementNotifications()
    this.clearAllTraceMarkers()
    this.clearAllTracePaths()
    this.clearLog()
    this.clearNotifications()
  }

  private clearTokenOverlays() {
    for (const overlayId of this.tokenOverlayIds.values()) {
      this.overlays.remove(overlayId)
    }
    this.tokenOverlayIds.clear()
  }

  private clearElementNotifications() {
    for (const overlayId of this.elementNotificationOverlayIds.values()) {
      this.overlays.remove(overlayId)
    }
    this.elementNotificationOverlayIds.clear()
  }

  private renderTokens() {
    this.clearTokenOverlays()

    Array.from(this.traces.values()).forEach((trace) => {
      const element = this.elementRegistry.get(trace.startElementId)
      if (!element || is(element, 'bpmn:SequenceFlow')) {
        return
      }

      const html = document.createElement('div')
      html.innerHTML = this.getTokenHtml(trace)
      const token = html.firstElementChild as HTMLDivElement | null
      if (!token) {
        return
      }
      this.bindTokenHandlers(token)

      const overlayId = this.overlays.add(element, TOKEN_OVERLAY_TYPE, {
        position: this.getTokenOverlayPosition(trace, element),
        html: token,
        show: {
          minZoom: 0.5,
        },
      })

      this.tokenOverlayIds.set(trace.id, overlayId)
    })
  }

  private getTokenHtml(trace: ReverseTrace) {
    const paused = trace.status === 'paused' ? ' is-paused' : ''
    const completed = trace.status === 'completed' ? ' is-completed' : ''
    const resumeBtn = trace.status === 'paused'
      ? '<button type="button" class="reverse-trace-token__resume" data-action="resume" aria-label="Resume">▶</button>'
      : ''
    const deleteBtn = '<button type="button" class="reverse-trace-token__delete" data-action="delete" aria-label="Delete trace">×</button>'
    const traceNumber = trace.id.replace(/^[^0-9]+/, '') || trace.id
    return `
      <div
        class="bts-token-count waiting reverse-trace-token is-start${paused}${completed}"
        data-trace-id="${trace.id}"
        style="background:${trace.color.primary};color:${trace.color.auxiliary}"
        title="${trace.id}"
      >
        <span class="reverse-trace-token__num">${this.escapeHtml(traceNumber)}</span>
        ${resumeBtn}
        ${deleteBtn}
      </div>
    `
  }

  private bindTokenHandlers(token: HTMLDivElement) {
    const traceId = token.dataset.traceId
    if (!traceId) {
      return
    }

    token.addEventListener('mouseenter', () => {
      this.setTraceGlow(traceId, true)
    })
    token.addEventListener('mouseleave', () => {
      this.setTraceGlow(traceId, false)
    })

    token.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null
      const action = target?.closest<HTMLElement>('[data-action]')?.dataset.action
      if (!action) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      if (action === 'resume') {
        this.resumePausedTrace(traceId)
      } else if (action === 'delete') {
        this.setTraceGlow(traceId, false)
        this.removeTrace(traceId)
      }
    })
  }

  private renderElementNotification(element: Element, presentation: StepPresentation, trace: ReverseTrace) {
    this.removeElementNotification(element.id)

    if (!presentation.text) {
      return
    }

    const html = document.createElement('div')
    const type = presentation.tone === 'danger' ? 'warning' : presentation.tone
    html.className = `bts-element-notification reverse-simulation-element-notification ${type === 'info' ? '' : type}`.trim()
    html.innerHTML = `
      <span class="bts-text">${this.escapeHtml(presentation.text)}</span>
    `
    const color = presentation.tone === 'success'
      ? 'var(--reverse-simulation-success)'
      : presentation.tone === 'warning'
        ? 'var(--reverse-simulation-warning)'
        : presentation.tone === 'danger'
          ? 'var(--reverse-simulation-danger)'
          : '#6b7280'
    html.setAttribute('style', `background:${color};color:#fff`)

    const overlayId = this.overlays.add(element, ELEMENT_NOTIFICATION_OVERLAY_TYPE, {
      position: {
        top: CONTROL_OFFSET_TOP,
        right: 15,
      },
      html,
      show: {
        minZoom: 0.5,
      },
    })

    this.elementNotificationOverlayIds.set(element.id, overlayId)
  }

  private removeElementNotification(elementId: string) {
    const overlayId = this.elementNotificationOverlayIds.get(elementId)
    if (overlayId == null) {
      return
    }
    this.overlays.remove(overlayId)
    this.elementNotificationOverlayIds.delete(elementId)
  }

  private renderControls() {
    this.clearControls()

    this.getControlElements().forEach((element) => {
      if (this.canStartReverse(element)) {
        this.renderTriggerPad(element)
      }
      if (this.canTogglePausePoint(element)) {
        this.renderPausePointPad(element)
      }
    })
  }

  private renderTriggerPad(element: Element) {
    const html = document.createElement('div')
    html.className = 'bts-context-pad'
    html.title = 'Trigger Reverse Simulation'
    html.innerHTML = PlayIcon()

    const stop = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }
    html.addEventListener('pointerdown', stop)
    html.addEventListener('mousedown', stop)
    html.addEventListener('touchstart', stop, { passive: false })
    html.addEventListener('click', (event) => {
      stop(event)
      this.startOrResumeFromElement(element.id)
    })

    this.overlays.add(element, CONTROL_OVERLAY_TYPE, {
      position: {
        top: CONTROL_OFFSET_TOP,
        left: CONTROL_OFFSET_LEFT,
      },
      html,
      show: {
        minZoom: 0.5,
      },
    })
  }

  private renderPausePointPad(element: Element) {
    const wait = this.pausePoints.has(element.id)
    const html = document.createElement('div')
    html.className = `bts-context-pad ${wait ? '' : 'show-hover'}`
    html.title = wait ? 'Remove pause point' : 'Add pause point'
    html.innerHTML = `
      ${(wait ? RemovePauseIcon : PauseIcon)('show-hover')}
      ${PauseIcon('hide-hover')}
    `

    const stop = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }
    html.addEventListener('pointerdown', stop)
    html.addEventListener('mousedown', stop)
    html.addEventListener('touchstart', stop, { passive: false })
    html.addEventListener('click', (event) => {
      stop(event)
      this.togglePausePoint(element.id)
    })

    this.overlays.add(element, CONTROL_OVERLAY_TYPE, {
      position: {
        top: CONTROL_OFFSET_TOP,
        left: CONTROL_OFFSET_LEFT + 35,
      },
      html,
      show: {
        minZoom: 0.5,
      },
    })
  }

  private clearControls() {
    this.overlays.remove({ type: CONTROL_OVERLAY_TYPE })
  }

  private getControlElements() {
    const activeRoot = this.canvas.getRootElement()

    return this.elementRegistry.filter((element: Element) => {
      if (!element || !element.id || (element as any).labelTarget) {
        return false
      }

      if (this.canvas.findRoot(element) !== activeRoot) {
        return false
      }

      if (!this.elementRegistry.getGraphics(element)) {
        return false
      }

      return this.shouldShowControls(element)
    })
  }

  private shouldShowControls(element: Element) {
    if (!element || !element.id || (element as any).labelTarget) {
      return false
    }

    return this.canTogglePausePoint(element) || this.canStartReverse(element)
  }

  private canTogglePausePoint(element: Element) {
    if (!this.canStartReverse(element)) {
      return false
    }

    if (is(element, 'bpmn:SubProcess') && getBusinessObject(element)?.triggeredByEvent) {
      return false
    }

    return true
  }

  private canStartReverse(element: Element) {
    if (is(element, 'bpmn:Activity')) {
      return true
    }

    if (!isAny(element, ['bpmn:Task', 'bpmn:Gateway', 'bpmn:Event', 'bpmn:CallActivity', 'bpmn:SubProcess'])) {
      return false
    }

    if (is(element, 'bpmn:StartEvent')) {
      return false
    }

    return true
  }

  private clearSelection() {
    const selection = this.modeler.get<any>('selection')
    selection?.select?.([])
  }

  private restoreSelection() {
    const selection = this.modeler.get<any>('selection')
    const target =
      (this.selectedElementId && this.elementRegistry.get(this.selectedElementId)) ||
      this.canvas.getRootElement()
    if (target) {
      selection?.select?.([target])
    }
  }

  private getCurrentSelectionId() {
    const selection = this.modeler.get<any>('selection')
    const current = selection?.get?.() || []
    return current[0]?.id || ''
  }

  private getDelay(baseDelay: number) {
    return Math.max(80, Math.round(baseDelay / this.animationSpeed))
  }

  private initPalette() {
    const canvasContainer = this.canvas.getContainer()
    const palette = document.createElement('div')
    palette.className = 'bts-palette hidden reverse-simulation-palette'

    const playPause = this.createPaletteEntry('Play/Pause Reverse Simulation', PlayIcon(), () => {
      this.togglePausePlayback()
    })
    playPause.classList.add('disabled')

    const reset = this.createPaletteEntry('Reset Reverse Simulation', ResetIcon(), () => {
      this.resetPlayback()
    })
    reset.classList.add('disabled')

    const log = this.createPaletteEntry('Toggle Reverse Log', LogIcon(), () => {
      this.toggleLog()
    })

    palette.appendChild(playPause)
    palette.appendChild(reset)
    palette.appendChild(log)

    canvasContainer.appendChild(palette)
    this.paletteContainer = palette
    this.palettePlayPauseEntry = playPause
    this.paletteResetEntry = reset
    this.paletteLogEntry = log
  }

  private createPaletteEntry(title: string, iconHtml: string, onClick: () => void) {
    const entry = document.createElement('div')
    entry.className = 'bts-entry'
    entry.title = title
    entry.innerHTML = iconHtml
    entry.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      onClick()
    })
    return entry
  }

  private syncPaletteEntries() {
    const hasTrace = this.traces.size > 0
    const hasPending = this.hasPendingTrace()
    const hasActive = Array.from(this.traces.values()).some(
      (trace) => trace.status === 'running' || trace.status === 'animating',
    )

    this.palettePlayPauseEntry?.classList.toggle('disabled', !hasPending)
    this.paletteResetEntry?.classList.toggle('disabled', !hasTrace)

    if (this.palettePlayPauseEntry) {
      this.palettePlayPauseEntry.innerHTML = hasActive ? PauseIcon() : PlayIcon()
      this.palettePlayPauseEntry.classList.toggle('active', hasActive)
    }
  }

  private initSpeedControls() {
    const canvasContainer = this.canvas.getContainer()
    const container = document.createElement('div')
    container.className = 'bts-set-animation-speed hidden reverse-simulation-speed'
    container.innerHTML = TachometerIcon()

    const buttons = document.createElement('div')
    buttons.className = 'bts-animation-speed-buttons'

    SPEEDS.forEach((speed, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'bts-animation-speed-button'
      button.dataset.speed = String(speed.value)
      button.title = `Set reverse animation speed = ${speed.label}`
      button.innerHTML = Array.from({ length: index + 1 }).map(() => AngleRightIcon()).join('')
      button.addEventListener('click', () => {
        this.setAnimationSpeed(speed.value)
      })
      buttons.appendChild(button)
    })

    container.appendChild(buttons)
    canvasContainer.appendChild(container)
    this.speedContainer = container
    this.syncSpeedButtons()
  }

  private setAnimationSpeed(speed: number) {
    this.animationSpeed = speed
    this.animation?.setAnimationSpeed?.(speed)
    this.syncSpeedButtons()
  }

  private syncSpeedButtons() {
    this.speedContainer?.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((button) => {
      const active = Number(button.dataset.speed) === this.animationSpeed
      button.classList.toggle('active', active)
    })
  }

  private initLog() {
    const canvasContainer = this.canvas.getContainer()
    const log = document.createElement('div')
    log.className = 'bts-log hidden reverse-simulation-log djs-scrollable'
    log.innerHTML = `
      <div class="bts-header">
        ${LogIcon('bts-log-icon')}
        Simulation Log
        <button class="bts-close" aria-label="Close">${TimesIcon()}</button>
      </div>
      <div class="bts-content"></div>
    `

    const content = log.querySelector<HTMLDivElement>('.bts-content')!
    const placeholder = document.createElement('p')
    placeholder.className = 'bts-entry placeholder'
    placeholder.textContent = 'No Entries'
    content.appendChild(placeholder)

    log.querySelector<HTMLButtonElement>('.bts-close')?.addEventListener('click', () => {
      this.hideLog()
    })

    canvasContainer.appendChild(log)
    this.logContainer = log
    this.logContent = content
    this.logPlaceholder = placeholder
  }

  private toggleLog() {
    if (!this.logContainer) {
      return
    }
    this.logContainer.classList.toggle('hidden')
    this.paletteLogEntry?.classList.toggle('active', !this.logContainer.classList.contains('hidden'))
  }

  private hideLog() {
    this.logContainer?.classList.add('hidden')
    this.paletteLogEntry?.classList.remove('active')
  }

  private log(entry: Omit<LogEntry, 'id'>) {
    const record: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      ...entry,
    }
    this.logEntries.push(record)
    this.renderLogEntry(record)
  }

  private renderLogEntry(entry: LogEntry) {
    if (!this.logContent || !this.logPlaceholder) {
      return
    }
    this.logPlaceholder.classList.add('hidden')

    const item = document.createElement('p')
    item.className = `bts-entry ${entry.tone === 'danger' ? 'warning' : entry.tone}`
    item.innerHTML = `
      ${InfoIcon()}
      <span class="bts-text" title="${this.escapeHtml(entry.text)}">${this.escapeHtml(entry.text)}</span>
      ${
        entry.traceId
          ? `<span class="bts-scope" style="background:${entry.color?.primary};color:${entry.color?.auxiliary}">${entry.traceId}</span>`
          : ''
      }
    `

    this.logContent.appendChild(item)
    this.logContent.scrollTop = this.logContent.scrollHeight
  }

  private clearLog() {
    if (!this.logContent) {
      return
    }
    this.logContent.innerHTML = ''
    this.logPlaceholder = document.createElement('p')
    this.logPlaceholder.className = 'bts-entry placeholder'
    this.logPlaceholder.textContent = 'No Entries'
    this.logContent.appendChild(this.logPlaceholder)
  }

  private initNotifications() {
    const container = document.createElement('div')
    container.className = 'bts-notifications reverse-simulation-notifications'
    this.canvas.getContainer().appendChild(container)
    this.notificationsContainer = container
  }

  private showNotification(options: {
    text: string
    tone: RollbackTone
    traceId?: string
    color?: ScopeColors
    ttl?: number
  }) {
    if (!this.notificationsContainer) {
      return
    }

    const tone = options.tone === 'danger' ? 'warning' : options.tone
    const notification = document.createElement('div')
    notification.className = `bts-notification ${tone}`
    notification.innerHTML = `
      ${InfoIcon()}
      <span class="bts-text" title="${this.escapeHtml(options.text)}">${this.escapeHtml(options.text)}</span>
      ${
        options.traceId
          ? `<span class="bts-scope" style="background:${options.color?.primary};color:${options.color?.auxiliary}">${options.traceId}</span>`
          : ''
      }
    `

    this.notificationsContainer.appendChild(notification)
    while (this.notificationsContainer.children.length > 5) {
      this.notificationsContainer.children[0].remove()
    }

    window.setTimeout(() => {
      notification.remove()
    }, options.ttl || NOTIFICATION_TIME_TO_LIVE)
  }

  private clearNotifications() {
    while (this.notificationsContainer?.children.length) {
      this.notificationsContainer.children[0].remove()
    }
  }

  private setModeClass(active: boolean) {
    const canvasContainer = this.canvas.getContainer()
    const canvasParent = canvasContainer.parentNode as HTMLElement | null
    const palette = canvasContainer.querySelector('.djs-palette')

    canvasParent?.classList.toggle('reverse-simulation', active)
    palette?.classList.toggle('hidden', active)
    this.speedContainer?.classList.toggle('hidden', !active)
    this.paletteContainer?.classList.toggle('hidden', !active)
    if (!active) {
      this.clearTokenOverlays()
    }
  }

  private async resolveStepPresentation(element: Element): Promise<StepPresentation> {
    if (!this.isExecutorTask(element)) {
      return { tone: 'info' }
    }

    const binding = this.readExecutorBinding(element)
    if (!binding || !binding.executorReleaseId || !binding.methodId) {
      return {
        tone: 'info',
        text: '未配置执行器回退策略，按流程逆序模拟',
      }
    }

    const method = await this.resolveMethod(binding.executorReleaseId, binding.methodId)
    const rollbackType = (method?.rollbackType || '').toUpperCase()

    if (rollbackType === 'REVERSIBLE') {
      return {
        tone: 'success',
        text: `${binding.methodName || '执行器方法'} 为 REVERSIBLE，正常回退`,
      }
    }

    if (rollbackType === 'COMPENSABLE') {
      return {
        tone: 'warning',
        text: `${binding.methodName || '执行器方法'} 为 COMPENSABLE，补偿后回退`,
      }
    }

    if (rollbackType === 'IRREVERSIBLE') {
      return {
        tone: 'danger',
        text: `${binding.methodName || '执行器方法'} 为 IRREVERSIBLE，已自动暂停，点击左侧播放继续`,
        autoPause: true,
      }
    }

    return {
      tone: 'info',
      text: `${binding.methodName || '执行器方法'} 未声明回退类型，按流程逆序模拟`,
    }
  }

  private isExecutorTask(element: Element) {
    if (!is(element, 'bpmn:ServiceTask')) {
      return false
    }

    return getBusinessObject(element)?.get?.('type') === 'executor'
  }

  private readExecutorBinding(element: Element): ExecutorBindingSnapshot | null {
    const businessObject = getBusinessObject(element)
    const extensionElements = businessObject?.get?.('extensionElements')
    const values = extensionElements?.get?.('values') || []
    const binding = values.find((value: any) => value.$type === 'l:ExecutorBinding')

    if (!binding) {
      return null
    }

    return {
      executorReleaseId: binding.get('executorReleaseId') || '',
      methodId: binding.get('methodId') || '',
      methodName: binding.get('methodName') || binding.get('methodCode') || '',
    }
  }

  private async resolveMethod(executorReleaseId: string, methodId: string) {
    if (!this.executorApi || !executorReleaseId || !methodId) {
      return null
    }

    if (!this.releaseMethodCache.has(executorReleaseId)) {
      this.releaseMethodCache.set(
        executorReleaseId,
        this.executorApi.fetchMethodList(executorReleaseId)
          .then((methods) => {
            const methodMap = new Map<string, ExecutorMethodItem>()
            methods.forEach((method) => {
              methodMap.set(method.methodId, method)
            })
            return methodMap
          })
          .catch(() => new Map<string, ExecutorMethodItem>()),
      )
    }

    const methodMap = await this.releaseMethodCache.get(executorReleaseId)!
    return methodMap.get(methodId) || null
  }

  private animateFlow(element: Element, trace: ReverseTrace) {
    const connection = element as any
    const reversedConnection = {
      ...connection,
      waypoints: Array.isArray(connection.waypoints) ? connection.waypoints.slice().reverse() : connection.waypoints,
    }

    const scope = {
      id: trace.id,
      colors: trace.color,
      element,
      parent: null,
    }

    this.animation?.animate?.(reversedConnection, scope, () => {
      if (!this.active) {
        return
      }
      if (trace.status === 'completed') {
        return
      }
      if (trace.status !== 'animating') {
        // 已被暂停或其他状态修改过，不再自动推进
        return
      }
      trace.status = 'running'
      this.scheduleTraceTick(trace, 0)
    })
  }

  private getElementLabel(element: Element) {
    return getBusinessObject(element)?.get?.('name') || element.id || '节点'
  }

  private renderAllTracePaths() {
    const activeTraceIds = new Set<string>()

    Array.from(this.traces.values()).forEach((trace) => {
      activeTraceIds.add(trace.id)
      this.renderTracePath(trace)
    })

    Array.from(this.tracePathElements.keys()).forEach((traceId) => {
      if (!activeTraceIds.has(traceId)) {
        this.removeTracePath(traceId)
      }
    })
  }

  private renderTracePath(trace: ReverseTrace) {
    const points = this.buildTracePathPoints(trace)
    const path = this.ensureTracePathElement(trace.id, trace.color.primary)

    if (points.length < 2) {
      svgAttr(path, { d: '' })
      return
    }

    svgAttr(path, {
      d: this.toPathData(points),
      stroke: trace.color.primary,
    })
  }

  private ensureTracePathElement(traceId: string, color: string) {
    let path = this.tracePathElements.get(traceId)
    if (path) {
      return path
    }

    path = svgCreate('path') as SVGPathElement
    path.classList.add('reverse-simulation-trace-path')
    svgAttr(path, {
      fill: 'none',
      stroke: color,
      'stroke-width': 3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'pointer-events': 'none',
    })
    svgAppend(this.traceLayer, path)
    this.tracePathElements.set(traceId, path)
    return path
  }

  private removeTracePath(traceId: string) {
    const path = this.tracePathElements.get(traceId)
    if (!path) {
      return
    }
    svgRemove(path)
    this.tracePathElements.delete(traceId)
  }

  private clearAllTracePaths() {
    Array.from(this.tracePathElements.keys()).forEach((traceId) => {
      this.removeTracePath(traceId)
    })
  }

  private buildTracePathPoints(trace: ReverseTrace) {
    const points: Array<{ x: number; y: number }> = []
    const steps = trace.trailSteps

    steps.forEach((step, index) => {
      const prev = index > 0 ? steps[index - 1] : undefined
      const next = index < steps.length - 1 ? steps[index + 1] : undefined
      const segmentPoints = step.kind === 'flow'
        ? this.getFlowTracePoints(trace, step.element)
        : this.getNodeTracePoints(trace, step.element, prev, next)
      this.appendPathPoints(points, segmentPoints)
    })

    return points
  }

  private getFlowTracePoints(trace: ReverseTrace, element: Element) {
    const laneOffset = this.getElementLaneOffset(trace.id, element.id)
    const waypoints = Array.isArray((element as any).waypoints)
      ? ((element as any).waypoints as Array<{ x: number; y: number }>).slice().reverse()
      : []

    return waypoints.map((point) => ({
      x: point.x,
      y: point.y + laneOffset,
    }))
  }

  private getNodeTracePoints(
    trace: ReverseTrace,
    element: Element,
    prev?: ReverseStep,
    next?: ReverseStep,
  ) {
    const center = this.getElementCenterPoint(element, trace.id)
    const points: Array<{ x: number; y: number }> = []
    const entry = prev?.kind === 'flow'
      ? this.projectFlowPointToNode(trace, prev.element, element, 'end')
      : null
    const exit = next?.kind === 'flow'
      ? this.projectFlowPointToNode(trace, next.element, element, 'start')
      : null

    if (!prev) {
      points.push(center)
      if (exit) {
        points.push(exit)
      }
      return points
    }

    if (entry) {
      points.push(entry)
    }

    if (exit) {
      points.push(exit)
    } else {
      points.push(center)
    }

    return points
  }

  private projectFlowPointToNode(
    trace: ReverseTrace,
    flow: Element,
    node: Element,
    edge: 'start' | 'end',
  ) {
    const flowPoints = this.getFlowTracePoints(trace, flow)
    const point = edge === 'start'
      ? flowPoints[0]
      : flowPoints[flowPoints.length - 1]

    if (!point) {
      return this.getElementCenterPoint(node, trace.id)
    }

    const { x, width, y, height } = this.getElementBounds(node)
    const centerY = y + (height / 2) + this.getElementLaneOffset(trace.id, node.id)
    return {
      x: Math.max(x, Math.min(x + width, point.x)),
      y: centerY,
    }
  }

  private getElementCenterPoint(element: Element, traceId: string) {
    const { x, y, width, height } = this.getElementBounds(element)
    return {
      x: x + (width / 2),
      y: y + (height / 2) + this.getElementLaneOffset(traceId, element.id),
    }
  }

  private getElementBounds(element: Element) {
    const anyElement = element as any
    return {
      x: Number(anyElement.x) || 0,
      y: Number(anyElement.y) || 0,
      width: Number(anyElement.width) || 0,
      height: Number(anyElement.height) || 0,
    }
  }

  private getElementLaneOffset(traceId: string, elementId: string) {
    const stack = this.traceStacks.get(elementId)
    if (!stack || stack.length <= 1) {
      return 0
    }
    const index = stack.indexOf(traceId)
    if (index <= 0) {
      return 0
    }
    return index * TRACE_LANE_GAP
  }

  private appendPathPoints(
    target: Array<{ x: number; y: number }>,
    source: Array<{ x: number; y: number }>,
  ) {
    source.forEach((point) => {
      const last = target[target.length - 1]
      if (last && Math.abs(last.x - point.x) < 0.01 && Math.abs(last.y - point.y) < 0.01) {
        return
      }
      target.push(point)
    })
  }

  private toPathData(points: Array<{ x: number; y: number }>) {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')
  }

  private getTokenOverlayPosition(trace: ReverseTrace, element: Element) {
    const { width, height } = this.getElementBounds(element)
    const laneOffset = this.getElementLaneOffset(trace.id, trace.startElementId)
    return {
      left: (width / 2) - (TRACE_ANCHOR_SIZE / 2),
      top: (height / 2) - (TRACE_ANCHOR_SIZE / 2) + laneOffset,
    }
  }

  private getContrastColor(hexColor: string) {
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return yiq >= 128 ? '#111111' : '#ffffff'
  }

  private escapeHtml(text: string) {
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }
}
