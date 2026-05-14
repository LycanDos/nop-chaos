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
  ForkIcon,
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
  laneOffset: number
  status: 'running' | 'animating' | 'paused' | 'completed'
  pausedFrom?: 'running' | 'animating'
  pauseReason?: 'manual' | 'irreversible'
  visitedElementIds: Set<string>
  trailSteps: ReverseStep[]
}

interface MovingTokenState {
  flowElementId: string
  pathData: string
  totalLength: number
  measurePath: SVGPathElement
  tokenGroup: SVGGElement
  trailPath: SVGPathElement
  progress: number
  skipSteps: number
  totalDuration: number
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
const BASE_FLOW_STEP_DELAY = 1200
const BASE_NODE_STEP_DELAY = 720
const BASE_RESUME_DELAY = 420
const TRACE_LAYER_NAME = 'reverse-simulation-trace'
const TRACE_LAYER_INDEX = 120
const TRACE_LANE_GAP = 5
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
  private readonly movingTokenFrames = new Map<string, number>()
  private readonly movingTokenStates = new Map<string, MovingTokenState>()
  private readonly tempTrailPaths = new Map<string, SVGPathElement>()
  private readonly traceGlowPaths = new Map<string, SVGPathElement>()
  private readonly traces = new Map<string, ReverseTrace>()
  private readonly logEntries: LogEntry[] = []
  private readonly activeIncomingMap = new Map<string, string>()
  private readonly xorOverlayIds = new Set<string | number>()

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
    this.initXorGateways()
  }

  /**
   * Deactivates
   */
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
    this.resetXorGateways()
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
    this.cleanupMovingTokenAnimation(traceId)
    this.removeTraceFlowPath(traceId)
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
    if (glow) {
      this.addTraceFlowPath(traceId)
    } else {
      this.removeTraceFlowPath(traceId)
    }
    const tempPath = this.tempTrailPaths.get(traceId)
    if (tempPath) {
      tempPath.classList.toggle('reverse-simulation-trace-path-glow', glow)
    }
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
    this.traceCounter = 1
    this.colorIndex = 0
    this.clearRuntime()
    this.initXorGateways()
    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
    this.showNotification({ text: '重置回退预览', tone: 'info' })
  }

  private createTrace(startElementId: string, steps: ReverseStep[]): ReverseTrace {
    // 每条 trace 按创建顺序获得固定 laneOffset，实现"分叉"——所有元素偏移一致
    const laneOffset = (this.traceCounter - 1) * TRACE_LANE_GAP
    return {
      id: `R${this.traceCounter++}`,
      startElementId,
      currentElementId: startElementId,
      stationaryElementId: startElementId,
      steps,
      stepIndex: 0,
      color: this.nextTraceColor(),
      laneOffset,
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
    const plan: ReverseStep[] = []
    let current: Element | null | undefined = startElement

    while (current && !visitedNodes.has(current.id)) {
      visitedNodes.add(current.id)
      plan.push({ kind: 'node', element: current })

      const incoming = Array.isArray((current as any).incoming)
        ? ((current as any).incoming as Element[]).filter((flow) => is(flow, 'bpmn:SequenceFlow'))
        : []

      if (incoming.length === 0) {
        break
      }

      // 只沿第一条入流走直线路径，其余分叉由运行时动态分裂
      const flow = incoming[0]
      plan.push({ kind: 'flow', element: flow })
      current = (flow as any).source || (flow as any).sourceRef
    }

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
    this.clearAllMovingTokenAnimations()
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
      this.renderControls()
      this.renderTokens()
      this.animateFlowWithMovingToken(step.element, trace)
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

    // 遇分叉则动态分裂：节点有多条入流，且当前计划只跟了其中一条
    const forked = trace.status === 'running' && this.tryForkAtNode(trace, step.element)

    if (trace.stepIndex >= trace.steps.length) {
      this.completeTrace(trace)
      return
    }

    this.renderControls()
    this.renderTokens()
    this.syncPaletteEntries()
    // 分叉后父 trace 立即继续，与子 trace 同时从分叉点出发
    this.scheduleTraceTick(trace, forked ? 0 : this.getDelay(BASE_NODE_STEP_DELAY))
  }

  private completeTrace(trace: ReverseTrace) {
    trace.status = 'completed'
    trace.pauseReason = undefined

    // 清理临时动画轨迹，渲染完整持久轨迹
    this.cleanupTempTrail(trace.id)
    this.renderAllTracePaths()

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

  private cleanupTempTrail(traceId: string) {
    const tempPath = this.tempTrailPaths.get(traceId)
    if (tempPath) {
      svgRemove(tempPath)
      this.tempTrailPaths.delete(traceId)
    }
  }

  /**
   * 在节点处检测分叉——节点有多条入流时，为每条未跟踪的入流创建子 trace
   * @param nodeStepIndex 节点在 steps 中的索引，用于定位后续的 flow 步骤
   *   - 从 runTraceTick 调用时无需传（stepIndex 已递增到下一步）
   *   - 从 finishMovingTokenAnimation 调用时需要传入当前节点在 steps 中的索引
   */
  private tryForkAtNode(trace: ReverseTrace, nodeElement: Element, nodeStepIndex?: number): boolean {
    const incoming = Array.isArray((nodeElement as any).incoming)
      ? ((nodeElement as any).incoming as Element[]).filter((flow) => is(flow, 'bpmn:SequenceFlow'))
      : []

    if (incoming.length <= 1) {
      return false
    }

    // 先计算出后续 flow ID，网关切换需要
    const nextStepIdx = nodeStepIndex != null ? nodeStepIndex + 1 : trace.stepIndex
    const nextStep = nextStepIdx < trace.steps.length ? trace.steps[nextStepIdx] : undefined
    const followedFlowId = nextStep?.kind === 'flow' ? nextStep.element.id : null

    // 排他网关：支持交互式路径切换（不分裂）
    if (is(nodeElement, 'bpmn:ExclusiveGateway')) {
      return this.handleXorGatewayPathSwitch(trace, nodeElement, nodeStepIndex, followedFlowId)
    }

    // 事件网关：不分裂
    if (is(nodeElement, 'bpmn:EventBasedGateway')) {
      return false
    }

    // 并行网关/包容网关/普通节点：反向回溯所有入流
    let forked = false
    let forkSubCounter = 0

    // trailSteps 共享前缀（到分叉节点为止）
    const forkNodeId = nodeElement.id
    const forkTrailIdx = trace.trailSteps.findLastIndex(
      (s) => s.kind === 'node' && s.element.id === forkNodeId,
    )
    const sharedTrail =
      forkTrailIdx >= 0 ? trace.trailSteps.slice(0, forkTrailIdx + 1) : [...trace.trailSteps]

    for (const flow of incoming) {
      if (flow.id === followedFlowId) {
        continue
      }

      const source = (flow as any).source || (flow as any).sourceRef
      if (!source) {
        continue
      }

      const upstreamPlan = this.buildReversePlan(source)
      const subSteps: ReverseStep[] = [
        { kind: 'flow', element: flow },
        ...upstreamPlan,
      ]

      forkSubCounter++
      // 子 trace 使用全局唯一 ID，避免同一父 trace 在多个分叉点创建同名子 trace 导致覆盖
      const subTrace: ReverseTrace = {
        id: `R${this.traceCounter++}`,
        startElementId: nodeElement.id,
        currentElementId: nodeElement.id,
        stationaryElementId: nodeElement.id,
        steps: subSteps,
        stepIndex: 0,
        color: { ...trace.color },
        laneOffset: trace.laneOffset + forkSubCounter * TRACE_LANE_GAP,
        status: 'running',
        visitedElementIds: new Set<string>(),
        trailSteps: [...sharedTrail],
      }
      this.traces.set(subTrace.id, subTrace)

      this.log({
        text: `分叉: 从 ${this.getElementLabel(nodeElement)} 创建分支`,
        tone: 'info',
        traceId: subTrace.id,
        color: subTrace.color,
      })

      // 立即开始，与父 trace 同时从分叉点出发
      this.scheduleTraceTick(subTrace, 0)
      forked = true
    }

    if (forked) {
      this.renderControls()
      this.renderTokens()
      this.syncPaletteEntries()
    }
    return forked
  }

  /**
   * 排他网关路径切换：检查用户是否选择了不同的入流，若是则重建剩余步骤
   */
  private handleXorGatewayPathSwitch(
    trace: ReverseTrace,
    nodeElement: Element,
    nodeStepIndex?: number,
    followedFlowId: string | null = null,
  ): boolean {
    const activeIncomingId = this.activeIncomingMap.get(nodeElement.id)

    // 未设置选择或当前计划就是选中路径 → 不做变更
    if (!activeIncomingId || activeIncomingId === followedFlowId) {
      return false
    }

    const incoming = Array.isArray((nodeElement as any).incoming)
      ? ((nodeElement as any).incoming as Element[]).filter((flow) => is(flow, 'bpmn:SequenceFlow'))
      : []

    const newFlow = incoming.find((f) => f.id === activeIncomingId)
    if (!newFlow) return false

    const source = (newFlow as any).source || (newFlow as any).sourceRef
    if (!source) return false

    const upstreamPlan = this.buildReversePlan(source)
    const newSteps: ReverseStep[] = [{ kind: 'flow', element: newFlow }, ...upstreamPlan]

    // 从当前 flow 步骤后替换剩余步骤
    const cutIdx = nodeStepIndex != null ? nodeStepIndex + 1 : trace.stepIndex
    trace.steps = [...trace.steps.slice(0, cutIdx), ...newSteps]

    this.log({
      text: `排他网关 ${this.getElementLabel(nodeElement)} 切换至 ${this.getElementLabel(newFlow)}`,
      tone: 'info',
      traceId: trace.id,
      color: trace.color,
    })

    return false
  }

  private initXorGateways() {
    this.activeIncomingMap.clear()
    const gateways = this.elementRegistry.filter((el: Element) => is(el, 'bpmn:ExclusiveGateway'))
    for (const gateway of gateways) {
      const incoming = Array.isArray((gateway as any).incoming)
        ? ((gateway as any).incoming as Element[]).filter((f) => is(f, 'bpmn:SequenceFlow'))
        : []
      if (incoming.length >= 2) {
        this.setActiveIncoming(gateway as Element, incoming[0] as Element)
      }
    }
  }

  private setActiveIncoming(gateway: Element, flow: Element) {
    this.activeIncomingMap.set(gateway.id, flow.id)
    this.recolorIncomingFlows(gateway)
  }

  private cycleXorGatewayIncoming(gateway: Element) {
    const incoming = Array.isArray((gateway as any).incoming)
      ? ((gateway as any).incoming as Element[]).filter((f) => is(f, 'bpmn:SequenceFlow'))
      : []
    if (incoming.length < 2) return

    const currentId = this.activeIncomingMap.get(gateway.id)
    const currentIdx = currentId ? incoming.findIndex((f) => f.id === currentId) : -1
    const nextIdx = (currentIdx + 1) % incoming.length
    this.setActiveIncoming(gateway, incoming[nextIdx] as Element)

    this.showNotification({
      text: `排他网关：切换至入流 "${this.getElementLabel(incoming[nextIdx])}"`,
      tone: 'info',
    })
    this.log({
      text: `排他网关 ${this.getElementLabel(gateway)} 切换入流至 ${this.getElementLabel(incoming[nextIdx])}`,
      tone: 'info',
    })
  }

  private recolorIncomingFlows(gateway: Element) {
    const incoming = Array.isArray((gateway as any).incoming)
      ? ((gateway as any).incoming as Element[]).filter((f) => is(f, 'bpmn:SequenceFlow'))
      : []
    const activeId = this.activeIncomingMap.get(gateway.id)

    const elementColors = (this.modeler as any).get('elementColors')
    const simulationStyles = (this.modeler as any).get('simulationStyles')
    if (!elementColors || !simulationStyles) return

    const colorId = `reverse-xor-${gateway.id}`

    for (const flow of incoming) {
      const isActive = flow.id === activeId
      const style = isActive ? '--token-simulation-grey-darken-30' : '--token-simulation-grey-lighten-56'
      const stroke = simulationStyles.get(style)
      elementColors.add(flow, colorId, { stroke }, 2000)
    }
  }

  private resetXorGateways() {
    const elementColors = (this.modeler as any).get('elementColors')
    if (elementColors) {
      for (const gatewayId of this.activeIncomingMap.keys()) {
        const gateway = this.elementRegistry.get(gatewayId)
        if (!gateway) continue
        const incoming = Array.isArray((gateway as any).incoming)
          ? ((gateway as any).incoming as Element[]).filter((f) => is(f, 'bpmn:SequenceFlow'))
          : []
        const colorId = `reverse-xor-${gatewayId}`
        for (const flow of incoming) {
          elementColors.remove(flow, colorId)
        }
      }
    }
    this.activeIncomingMap.clear()
    this.clearXorGatewayPads()
  }

  private renderXorGatewayPads() {
    this.clearXorGatewayPads()
    if (!this.active) return

    this.elementRegistry
      .filter((el: Element) => is(el, 'bpmn:ExclusiveGateway'))
      .forEach((gateway) => {
        const incoming = Array.isArray((gateway as any).incoming)
          ? ((gateway as any).incoming as Element[]).filter((f) => is(f, 'bpmn:SequenceFlow'))
          : []
        if (incoming.length >= 2) {
          this.renderXorGatewayPad(gateway as Element)
        }
      })
  }

  private renderXorGatewayPad(element: Element) {
    const html = document.createElement('div')
    html.className = 'bts-context-pad'
    html.title = '切换排他网关入流'
    html.innerHTML = ForkIcon()

    const stop = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
    }
    html.addEventListener('pointerdown', stop)
    html.addEventListener('mousedown', stop)
    html.addEventListener('touchstart', stop, { passive: false })
    html.addEventListener('click', (event) => {
      stop(event)
      this.cycleXorGatewayIncoming(element)
    })

    const overlayId = this.overlays.add(element, CONTROL_OVERLAY_TYPE, {
      position: {
        bottom: 5,
        right: 5,
      },
      html,
      show: {
        minZoom: 0.5,
      },
    })
    this.xorOverlayIds.add(overlayId)
  }

  private clearXorGatewayPads() {
    for (const id of this.xorOverlayIds) {
      this.overlays.remove(id)
    }
    this.xorOverlayIds.clear()
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
    if (wasAnimating) {
      this.resumeMovingTokenAnimation(trace.id)
    } else {
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
    this.clearAllMovingTokenAnimations()
    this.traces.clear()
    this.logEntries.splice(0, this.logEntries.length)
    this.clearTokenOverlays()
    this.clearElementNotifications()
    this.clearAllTraceMarkers()
    this.clearAllTracePaths()
    this.clearAllTraceFlowPaths()
    this.clearLog()
    this.clearNotifications()
    // 最终清扫：移除 traceLayer 中所有残留的 trace 路径
    this.scavengeTraceLayer()
    this.clearXorGatewayPads()
  }

  private scavengeTraceLayer() {
    const paths = this.traceLayer.querySelectorAll<SVGPathElement>(
      '.reverse-simulation-trace-path',
    )
    paths.forEach((path) => {
      svgRemove(path)
    })
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
      // 暂停时 token 展示在当前暂停节点，方便点击继续
      const isPaused = trace.status === 'paused'
      const elementId = isPaused ? trace.currentElementId : trace.startElementId
      const element = this.elementRegistry.get(elementId)
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
    const traceNumber = trace.id.match(/\d+/)?.[0] || trace.id
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
    this.renderXorGatewayPads()
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

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private buildCombinedPath(trace: ReverseTrace): {
    points: Array<{ x: number; y: number }>
    pathData: string
    totalLength: number
    measurePath: SVGPathElement
    skipSteps: number
    numFlows: number
    totalFlowLength: number
  } | null {
    let skipSteps = 0
    let numFlows = 0
    let totalFlowLength = 0

    const allPoints: Array<{ x: number; y: number }> = []

    // 从已存在的 trail 最后一个点开始
    if (trace.trailSteps.length > 0) {
      const lastStep = trace.trailSteps[trace.trailSteps.length - 1]
      if (lastStep.kind === 'node') {
        const prevCenter = this.getElementCenterPoint(lastStep.element, trace.id)
        allPoints.push(prevCenter)
      }
    }

    let currentIdx = trace.stepIndex - 1

    while (currentIdx < trace.steps.length) {
      const step = trace.steps[currentIdx]
      let points: Array<{ x: number; y: number }> = []

      if (step.kind === 'flow') {
        points = this.getFlowTracePoints(trace, step.element)
        numFlows++
        const waypoints = (step.element as any).waypoints as
          | Array<{ x: number; y: number }>
          | undefined
        if (waypoints && waypoints.length >= 2) {
          for (let i = 1; i < waypoints.length; i++) {
            totalFlowLength += Math.sqrt(
              (waypoints[i].x - waypoints[i - 1].x) ** 2 +
                (waypoints[i].y - waypoints[i - 1].y) ** 2,
            )
          }
        }
      } else if (step.kind === 'node') {
        // 遇到分叉节点（多条入流）时停止合并，让 runTraceTick 触发分叉
        const incoming = Array.isArray((step.element as any).incoming)
          ? ((step.element as any).incoming as Element[]).filter((f) => is(f, 'bpmn:SequenceFlow'))
          : []
        if (incoming.length > 1) {
          break
        }
        if (this.pausePoints.has(step.element.id)) break
        const prev = currentIdx > 0 ? trace.steps[currentIdx - 1] : undefined
        const next = currentIdx + 1 < trace.steps.length ? trace.steps[currentIdx + 1] : undefined
        points = this.getNodeTracePoints(trace, step.element, prev, next)
      } else {
        break
      }

      this.appendPathPoints(allPoints, points)
      skipSteps++
      currentIdx++
    }

    if (skipSteps < 1 || allPoints.length < 2) {
      return null
    }

    const pathData = allPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ')

    const measurePath = svgCreate('path') as SVGPathElement
    svgAttr(measurePath, { d: pathData })
    const totalLength = measurePath.getTotalLength()

    if (totalLength < 1) return null

    return { points: allPoints, pathData, totalLength, measurePath, skipSteps, numFlows, totalFlowLength }
  }

  private animateFlowWithMovingToken(element: Element, trace: ReverseTrace) {
    const existingState = this.movingTokenStates.get(trace.id)
    if (existingState) {
      // resume existing combined animation
      this.movingTokenFrames.set(
        trace.id,
        requestAnimationFrame(this.createMovingTokenAnimFn(trace.id)),
      )
      return
    }

    // 构建连续路径（合并多个 flow + node 步骤为单个路径）
    const combined = this.buildCombinedPath(trace)
    if (!combined) {
      trace.status = 'running'
      this.scheduleTraceTick(trace, 0)
      return
    }

    const { points, pathData, totalLength, measurePath, skipSteps, numFlows, totalFlowLength } = combined

    const traceNumber = trace.id.match(/\d+/)?.[0] || trace.id

    const tokenGroup = svgCreate('g') as SVGGElement
    tokenGroup.classList.add('reverse-simulation-moving-token')

    const circle = svgCreate('circle') as SVGCircleElement
    svgAttr(circle, {
      r: 11,
      fill: trace.color.primary,
      stroke: '#fff',
      'stroke-width': 2,
    })

    const text = svgCreate('text') as SVGTextElement
    svgAttr(text, {
      fill: trace.color.auxiliary,
      'font-size': 12,
      'font-weight': 700,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    })
    text.textContent = traceNumber

    svgAppend(tokenGroup, circle)
    svgAppend(tokenGroup, text)
    svgAppend(this.traceLayer, tokenGroup)

    const trailPath = svgCreate('path') as SVGPathElement
    trailPath.classList.add(
      'reverse-simulation-trace-path',
      'reverse-simulation-trace-path-active',
    )
    trailPath.style.setProperty('color', trace.color.primary)
    svgAttr(trailPath, {
      d: pathData,
      fill: 'none',
      stroke: trace.color.primary,
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-dasharray': `${totalLength}`,
      'stroke-dashoffset': `${totalLength}`,
    })
    svgAppend(this.traceLayer, trailPath)

    // 移除上一个临时 trail（防止残留）
    const oldTrail = this.tempTrailPaths.get(trace.id)
    if (oldTrail) {
      svgRemove(oldTrail)
    }
    this.tempTrailPaths.set(trace.id, trailPath)

    const startPoint = points[0]
    svgAttr(tokenGroup, { transform: `translate(${startPoint.x}, ${startPoint.y})` })

    const avgFlowLen = totalFlowLength / Math.max(1, numFlows)
    const perFlowDuration = Math.log(Math.max(avgFlowLen, 10)) * 250
    const baseDuration = perFlowDuration * numFlows
    const totalDuration = this.getDelay(baseDuration)

    this.movingTokenStates.set(trace.id, {
      flowElementId: element.id,
      pathData,
      totalLength,
      measurePath,
      tokenGroup,
      trailPath,
      progress: 0,
      skipSteps,
      totalDuration,
    })

    this.movingTokenFrames.set(
      trace.id,
      requestAnimationFrame(this.createMovingTokenAnimFn(trace.id)),
    )
  }

  private createMovingTokenAnimFn(traceId: string): (timestamp: number) => void {
    const state = this.movingTokenStates.get(traceId)
    if (!state) return () => {}

    const totalLength = state.totalLength
    const measurePath = state.measurePath
    const tokenGroup = state.tokenGroup
    const trailPath = state.trailPath
    const animationDuration = state.totalDuration || this.getDelay(BASE_FLOW_STEP_DELAY)
    let startTime: number | null = null

    const animateFn = (timestamp: number) => {
      if (!this.active) {
        this.cleanupMovingTokenAnimation(traceId)
        return
      }

      const trace = this.traces.get(traceId)
      if (!trace) {
        this.cleanupMovingTokenAnimation(traceId)
        return
      }

      if (trace.status !== 'animating') {
        this.movingTokenFrames.delete(traceId)
        if (trace.status === 'paused') {
          if (startTime != null) {
            state.progress = Math.min(
              (timestamp - startTime) / animationDuration,
              1,
            )
          }
        } else {
          this.cleanupMovingTokenAnimation(traceId)
        }
        return
      }

      if (startTime === null) {
        startTime = timestamp - state.progress * animationDuration
      }

      const elapsed = timestamp - startTime
      const rawProgress = Math.min(elapsed / animationDuration, 1)
      state.progress = rawProgress

      const easedProgress = this.easeInOutCubic(rawProgress)
      const currentLength = totalLength * easedProgress
      const point = measurePath.getPointAtLength(currentLength)

      svgAttr(tokenGroup, { transform: `translate(${point.x}, ${point.y})` })
      svgAttr(trailPath, { 'stroke-dashoffset': totalLength - currentLength })

      if (rawProgress < 1) {
        this.movingTokenFrames.set(
          traceId,
          requestAnimationFrame(animateFn),
        )
      } else {
        svgAttr(trailPath, { 'stroke-dashoffset': 0 })
        void this.finishMovingTokenAnimation(traceId)
      }
    }

    return animateFn
  }

  private async finishMovingTokenAnimation(traceId: string) {
    const state = this.movingTokenStates.get(traceId)
    if (!state) return

    // 只移除 token group，保留 trail path 持续可见
    svgRemove(state.tokenGroup)
    this.movingTokenFrames.delete(traceId)
    this.movingTokenStates.delete(traceId)

    const trace = this.traces.get(traceId)
    if (!trace) return
    if (!this.active || trace.status === 'completed') return
    if (trace.status !== 'animating') return

    const skipSteps = state.skipSteps || 1
    const startIdx = trace.stepIndex - 1  // flow step 的索引

    // 1. 将所有覆盖的步骤加入 trail
    for (let i = 0; i < skipSteps; i++) {
      const stepIdx = startIdx + i
      if (stepIdx < trace.steps.length) {
        this.renderTrail(trace, trace.steps[stepIdx])
      }
    }

    // 2. 推进 stepIndex
    trace.stepIndex = startIdx + skipSteps

    // 3. 恢复状态为 running，使节点副作用循环和后续调度能正常执行
    trace.status = 'running'
    this.renderControls()
    this.renderTokens()

    // 4. 处理覆盖的 node 步骤的副作用
    let lastHadFork = false
    for (let i = 0; i < skipSteps; i++) {
      const stepIdx = startIdx + i
      if (stepIdx >= trace.steps.length) break

      const step = trace.steps[stepIdx]
      if (step.kind !== 'node') continue

      trace.currentElementId = step.element.id
      trace.stationaryElementId = step.element.id

      const presentation = await this.resolveStepPresentation(step.element)
      if (!this.active || trace.status !== 'running') return

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

      // 检查自动暂停
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

      // 检查手动暂停点
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

      // 组合动画中也需要在节点处检测分叉
      if (trace.status === 'running') {
        if (this.tryForkAtNode(trace, step.element, stepIdx)) {
          lastHadFork = true
        }
      }
    }

    this.syncPaletteEntries()

    // 5. 继续或完成（分叉后父 trace 立即继续）
    if (trace.stepIndex >= trace.steps.length) {
      this.completeTrace(trace)
    } else {
      this.scheduleTraceTick(trace, lastHadFork ? 0 : this.getDelay(BASE_NODE_STEP_DELAY))
    }
  }

  private resumeMovingTokenAnimation(traceId: string) {
    const state = this.movingTokenStates.get(traceId)
    if (!state) return

    const frameId = this.movingTokenFrames.get(traceId)
    if (frameId != null) {
      cancelAnimationFrame(frameId)
    }

    this.movingTokenFrames.set(
      traceId,
      requestAnimationFrame(this.createMovingTokenAnimFn(traceId)),
    )
  }

  private cleanupMovingTokenAnimation(traceId: string) {
    const frameId = this.movingTokenFrames.get(traceId)
    if (frameId != null) {
      cancelAnimationFrame(frameId)
      this.movingTokenFrames.delete(traceId)
    }

    const state = this.movingTokenStates.get(traceId)
    if (state) {
      svgRemove(state.tokenGroup)
      svgRemove(state.trailPath)
      this.movingTokenStates.delete(traceId)
    }

    // 同时清理临时 trail（已完成的动画留下的）
    this.cleanupTempTrail(traceId)
  }

  private clearAllMovingTokenAnimations() {
    this.movingTokenFrames.forEach((frameId) => {
      cancelAnimationFrame(frameId)
    })
    this.movingTokenFrames.clear()

    this.movingTokenStates.forEach((state) => {
      svgRemove(state.tokenGroup)
      svgRemove(state.trailPath)
    })
    this.movingTokenStates.clear()

    // 清理所有遗留的临时 trail
    this.tempTrailPaths.forEach((path) => {
      svgRemove(path)
    })
    this.tempTrailPaths.clear()
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
    // 设置 CSS color 使 drop-shadow 的 currentColor 正确匹配路径颜色
    path.style.setProperty('color', color)
    svgAttr(path, {
      fill: 'none',
      stroke: color,
      'stroke-width': 2,
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

  private addTraceFlowPath(traceId: string) {
    this.removeTraceFlowPath(traceId)

    const sourcePath = this.tracePathElements.get(traceId) || this.tempTrailPaths.get(traceId)
    if (!sourcePath) return

    const d = sourcePath.getAttribute('d')
    if (!d) return

    // 测量路径长度用于 dasharray 和动画
    const measure = svgCreate('path') as SVGPathElement
    svgAttr(measure, { d })
    const totalLength = measure.getTotalLength()
    if (totalLength < 5) return

    const dashLen = Math.min(Math.round(totalLength * 0.15), 20)
    const gapLen = dashLen * 2.5
    const period = dashLen + gapLen

    const flowPath = svgCreate('path') as SVGPathElement
    svgAttr(flowPath, {
      d,
      fill: 'none',
      stroke: '#ffffff',
      'stroke-width': 2.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-dasharray': `${dashLen} ${gapLen}`,
      'stroke-dashoffset': '0',
      'pointer-events': 'none',
      opacity: '0.85',
    })
    flowPath.classList.add('reverse-simulation-flow-path')
    flowPath.style.setProperty('--flow-period', `${period}px`)

    svgAppend(this.traceLayer, flowPath)
    this.traceGlowPaths.set(traceId, flowPath)
  }

  private removeTraceFlowPath(traceId: string) {
    const flowPath = this.traceGlowPaths.get(traceId)
    if (flowPath) {
      svgRemove(flowPath)
      this.traceGlowPaths.delete(traceId)
    }
  }

  private clearAllTracePaths() {
    Array.from(this.tracePathElements.keys()).forEach((traceId) => {
      this.removeTracePath(traceId)
    })
  }

  private clearAllTraceFlowPaths() {
    Array.from(this.traceGlowPaths.keys()).forEach((traceId) => {
      this.removeTraceFlowPath(traceId)
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

    if (laneOffset === 0 || waypoints.length < 2) {
      return waypoints.map((p) => ({ x: p.x, y: p.y }))
    }

    // 计算 Flow 总方向，沿垂直方向偏移以实现纵向路径也躲避
    const dx = waypoints[waypoints.length - 1].x - waypoints[0].x
    const dy = waypoints[waypoints.length - 1].y - waypoints[0].y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) {
      return waypoints.map((p) => ({ x: p.x, y: p.y + laneOffset }))
    }

    // 顺时针旋转 90° 得到垂直向量
    const perpX = (-dy / len) * laneOffset
    const perpY = (dx / len) * laneOffset

    return waypoints.map((point) => ({
      x: point.x + perpX,
      y: point.y + perpY,
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
    // 使用原始（未偏移）路径点来确定正确的连接边，避免 laneOffset 把端点推到节点角落
    const waypoints = Array.isArray((flow as any).waypoints)
      ? ((flow as any).waypoints as Array<{ x: number; y: number }>)
      : []

    const rawPoint = edge === 'start'
      ? waypoints[0]
      : waypoints[waypoints.length - 1]

    if (!rawPoint) {
      return this.getElementCenterPoint(node, trace.id)
    }

    // 先用原始路径点投影到节点边界
    const bounds = this.getElementBounds(node)
    const clamped = {
      x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, rawPoint.x)),
      y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, rawPoint.y)),
    }

    // 再沿 flow 垂直方向叠加 laneOffset，使 trace 路径整体平行偏移
    const laneOffset = this.getElementLaneOffset(trace.id, flow.id)
    if (laneOffset !== 0 && waypoints.length >= 2) {
      const fdx = waypoints[waypoints.length - 1].x - waypoints[0].x
      const fdy = waypoints[waypoints.length - 1].y - waypoints[0].y
      const flen = Math.sqrt(fdx * fdx + fdy * fdy)
      if (flen > 0.01) {
        const perpX = (-fdy / flen) * laneOffset
        const perpY = (fdx / flen) * laneOffset
        clamped.x += perpX
        clamped.y += perpY
      }
    }

    return clamped
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

  private getElementLaneOffset(traceId: string, _elementId: string) {
    // 每条 trace 使用固定偏移（创建时分配的 laneOffset），所有元素偏移一致
    const trace = this.traces.get(traceId)
    return trace ? trace.laneOffset : 0
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
    // 使用 overlay 所在元素的 lane offset（暂停时可能是 currentElement）
    const laneOffset = this.getElementLaneOffset(trace.id, element.id)
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
