/**
 * WfSkinRenderer — 工作流皮肤渲染器
 *
 * 基于 bpmn-js 的 BaseRenderer，在绘制 BPMN 节点时应用皮肤样式。
 * 支持设计态（默认样式）和运行态（根据状态动态变化）。
 *
 * 渲染层级：
 *   Layer 1: bpmnRenderer 绘制基础 BPMN 形状
 *   Layer 2: 应用皮肤 fill/stroke/strokeWidth/opacity
 *   Layer 3: 进度条（SVG rect，节点底部）
 *   Layer 4: Overlay 元素（由 SkinOverlayManager 管理）
 */

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import type EventBus from 'diagram-js/lib/core/EventBus'
import type { Shape } from 'bpmn-js/lib/model/Types'
import { isLabel } from 'bpmn-js/lib/util/LabelUtil'
import {
  getBusinessObject,
  isAny,
} from 'bpmn-js/lib/util/ModelUtil'
import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate,
  remove as svgRemove,
} from 'tiny-svg'
import {
  getElementSkinCode,
  getMatchingStateKey,
  loadSkinDef,
  resolveSkinStyle,
  buildMockRuntimeState,
  buildRuntimeState,
} from '@/designer/Skin/skinEngine'

// 触发图层 — WfSkinRenderer 优先级略高于默认渲染器
const PRIORITY = 1400

export default class WfSkinRenderer extends BaseRenderer {
  private _bpmnRenderer: any
  private _canvas: any
  private _overlays: any
  private _eventBus: EventBus

  // 已应用的皮肤覆层缓存
  private _elementSkinCache = new Map<string, {
    skinCode: string
    skinJson: any
    runtimeState: Record<string, any>
    resolvedStyle: Record<string, any>
  }>()

  static $inject = ['eventBus', 'bpmnRenderer', 'canvas', 'overlays']

  constructor(
    eventBus: EventBus,
    bpmnRenderer: any,
    canvas: any,
    overlays: any,
  ) {
    super(eventBus, PRIORITY)
    this._bpmnRenderer = bpmnRenderer
    this._canvas = canvas
    this._overlays = overlays
    this._eventBus = eventBus

    // 监听运行时状态变化事件
    eventBus.on('wfSkin.nodeStatusChanged', (e: any) => {
      this._handleNodeStatusChange(e.elementId, e.runtimeState)
    })

    // 监听皮肤映射变化
    eventBus.on('wfSkin.skinMapChanged', (e: any) => {
      this._handleSkinMapChange()
    })
  }

  /**
   * 判断元素是否需要由本渲染器处理
   */
  canRender(element: Shape): boolean {
    if (isLabel(element)) return false

    // 支持常见的 BPMN 任务和事件节点
    if (!isAny(element, [
      'bpmn:Task',
      'bpmn:UserTask',
      'bpmn:ServiceTask',
      'bpmn:ScriptTask',
      'bpmn:SendTask',
      'bpmn:ReceiveTask',
      'bpmn:ManualTask',
      'bpmn:BusinessRuleTask',
      'bpmn:CallActivity',
      'bpmn:SubProcess',
      'bpmn:StartEvent',
      'bpmn:EndEvent',
      'bpmn:IntermediateCatchEvent',
      'bpmn:IntermediateThrowEvent',
      'bpmn:BoundaryEvent',
    ])) return false

    // 检查是否有皮肤绑定
    const skinCode = getElementSkinCode(element)
    return !!skinCode
  }

  /**
   * 绘制节点主形状
   */
  drawShape(parentNode: SVGElement, element: Shape): SVGElement {
    // 1. 委托 bpmnRenderer 绘制基础形状
    const gfx = this._drawBaseShape(parentNode, element)
    if (!gfx) return parentNode

    // 2. 应用皮肤样式
    this._applySkinStyle(parentNode, element, gfx)

    return gfx
  }

  /**
   * 委托 bpmnRenderer 绘制基础形状
   */
  private _drawBaseShape(parentNode: SVGElement, element: Shape): SVGElement {
    type HandlerKeys = keyof typeof this._bpmnRenderer.handlers
    const bpmnTypes: readonly HandlerKeys[] = [
      'bpmn:BoundaryEvent',
      'bpmn:EndEvent',
      'bpmn:IntermediateCatchEvent',
      'bpmn:IntermediateThrowEvent',
      'bpmn:StartEvent',
      'bpmn:Task',
      'bpmn:SubProcess',
      'bpmn:CallActivity',
    ]
    const matchedType = bpmnTypes.find((t) => isAny(element, [t]))
    if (matchedType) {
      const renderer = this._bpmnRenderer.handlers[matchedType]
      if (renderer) {
        return renderer(parentNode, element)
      }
    }
    return parentNode
  }

  /**
   * 应用皮肤样式
   */
  private async _applySkinStyle(
    parentNode: SVGElement,
    element: Shape,
    gfx: SVGElement,
  ): Promise<void> {
    const elementId = element.id || element.businessObject?.id
    if (!elementId) return

    const skinCode = getElementSkinCode(element)
    if (!skinCode) return

    // 设计态：加载皮肤定义 + 模拟状态渲染默认样式
    const skinJson = await loadSkinDef(skinCode)
    if (!skinJson) return

    // 设计态使用 CREATED 状态的模拟上下文
    const mockState = buildMockRuntimeState(0)
    const resolvedStyle = await resolveSkinStyle(skinJson, mockState)
    if (!resolvedStyle || Object.keys(resolvedStyle).length === 0) return

    // 缓存
    this._elementSkinCache.set(elementId, {
      skinCode,
      skinJson,
      runtimeState: mockState,
      resolvedStyle,
    })

    // 应用 SVG 样式到图形元素
    this._applyVisualStyle(gfx, resolvedStyle)
  }

  /**
   * 修改 SVG 元素的视觉属性
   */
  private _applyVisualStyle(gfx: SVGElement, style: Record<string, any>): void {
    // 查找主要的图形路径元素（BPMN 形状的第一个 path/rect）
    const shapeEl = gfx.querySelector('path, rect, ellipse, circle')
    if (!shapeEl) return

    const fill = style['fill'] || style['states.*.fill']
    const stroke = style['stroke'] || style['states.*.stroke']
    const strokeWidth = style['strokeWidth'] || style['states.*.strokeWidth']
    const opacity = style['opacity'] || style['states.*.opacity']

    if (fill) svgAttr(shapeEl, 'fill', fill as string)
    if (stroke) svgAttr(shapeEl, 'stroke', stroke as string)
    if (strokeWidth) svgAttr(shapeEl, 'stroke-width', strokeWidth as number)
    if (opacity) svgAttr(gfx, 'opacity', opacity as number)
  }

  /**
   * 处理节点状态变化事件
   */
  private _handleNodeStatusChange(
    elementId: string,
    runtimeState: Record<string, any>,
  ): void {
    const cached = this._elementSkinCache.get(elementId)
    if (!cached) return

    // 更新运行时状态
    cached.runtimeState = runtimeState

    // 重新计算样式
    resolveSkinStyle(cached.skinJson, runtimeState).then((resolved) => {
      cached.resolvedStyle = resolved

      // 通过 overlays API 触发图形更新
      const element = this._canvas.getGraphics(elementId)
      if (element) {
        this._applyVisualStyle(element, resolved)

        // 触发 overlay 更新事件
        this._eventBus.fire('wfSkin.overlayUpdate', {
          elementId,
          style: resolved,
          runtimeState,
        })
      }
    })
  }

  /**
   * 处理皮肤映射变化
   */
  private async _handleSkinMapChange(): Promise<void> {
    // 清除缓存，等待画布重新绘制
    this._elementSkinCache.clear()
    this._eventBus.fire('wfSkin.repaintRequired')
  }

  /**
   * 获取元素的当前已计算样式
   */
  getResolvedStyle(elementId: string): Record<string, any> | null {
    return this._elementSkinCache.get(elementId)?.resolvedStyle ?? null
  }

  /**
   * 获取元素的缓存条目
   */
  getSkinCache(elementId: string) {
    return this._elementSkinCache.get(elementId) ?? null
  }
}
