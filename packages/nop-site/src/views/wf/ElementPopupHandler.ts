/**
 * 悬停弹窗处理 — 鼠标悬停在 BPMN 元素上时显示运行时摘要信息
 *
 * 利用 bpmn-js eventBus 的 element.hover / element.out 事件，
 * 通过 overlays API 在元素上方渲染弹窗 DOM。
 */
import type BpmnViewer from 'bpmn-js/lib/Viewer'
import type EventBus from 'diagram-js/lib/core/EventBus'
import type Overlays from 'diagram-js/lib/features/overlays/Overlays'
import type { Element } from 'bpmn-js/lib/model/Types'
import type { StepRuntimeInfo } from './RuntimeDataProvider'
import { is } from 'bpmn-js/lib/util/ModelUtil'

const POPUP_OVERLAY_TYPE = 'runtime-popup'

export interface PopupOptions {
  /** 弹窗距离元素顶部的偏移量 */
  top?: number
  /** 弹窗距离元素右侧的偏移量 */
  right?: number
}

export class ElementPopupHandler {
  private viewer: BpmnViewer
  private eventBus: EventBus
  private overlays: Overlays
  private stepRuntimeMap: Map<string, StepRuntimeInfo>
  private activePopupId: string | number | null = null
  private activeElementId: string | null = null
  private hoverTimer: number | null = null
  private options: PopupOptions

  constructor(viewer: BpmnViewer, options?: PopupOptions) {
    this.viewer = viewer
    this.eventBus = viewer.get<EventBus>('eventBus')
    this.overlays = viewer.get<Overlays>('overlays')
    this.stepRuntimeMap = new Map()
    this.options = { top: -10, right: -10, ...options }

    this.eventBus.on('element.hover', 1500, this.onElementHover.bind(this))
    this.eventBus.on('element.out', this.onElementOut.bind(this))
  }

  /**
   * 更新运行时数据（由外部调用，当数据变更时刷新）
   */
  updateRuntimeData(stepRuntimeMap: Map<string, StepRuntimeInfo>): void {
    this.stepRuntimeMap = stepRuntimeMap
  }

  /** 销毁清理 */
  destroy(): void {
    this.eventBus.off('element.hover', 1500)
    this.eventBus.off('element.out')
    this.removePopup()
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
  }

  private onElementHover(event: { element: Element }): void {
    const element = event.element

    // 连线 hover 暂不弹窗（后续可按需扩展显示条件表达式）
    if (is(element, 'bpmn:SequenceFlow')) return

    const info = this.stepRuntimeMap.get(element.id)
    if (!info) {
      // 未执行节点：延迟显示"尚未执行"
      this.schedulePopup(element, null)
      return
    }

    this.schedulePopup(element, info)
  }

  private onElementOut(): void {
    // 延迟移除，避免鼠标在弹窗和元素间快速移动时闪烁
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    this.scheduleRemovePopup()
  }

  private schedulePopup(element: Element, info: StepRuntimeInfo | null): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }

    this.hoverTimer = window.setTimeout(() => {
      this.hoverTimer = null
      this.removePopup()
      this.activeElementId = element.id

      const html = info
        ? this.buildInfoPopup(info)
        : this.buildEmptyPopup()

      const overlayId = this.overlays.add(element, POPUP_OVERLAY_TYPE, {
        position: {
          top: this.options.top!,
          right: this.options.right!,
        },
        html,
        show: { minZoom: 0.3 },
      })
      this.activePopupId = overlayId
    }, 200)
  }

  private scheduleRemovePopup(): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer)
      this.hoverTimer = null
    }
    this.hoverTimer = window.setTimeout(() => {
      this.hoverTimer = null
      this.removePopup()
    }, 150)
  }

  private removePopup(): void {
    if (this.activePopupId !== null) {
      this.overlays.remove(this.activePopupId)
      this.activePopupId = null
    }
    this.activeElementId = null
  }

  private buildInfoPopup(info: StepRuntimeInfo): HTMLElement {
    const el = document.createElement('div')
    el.className = 'bpmn-runtime-popup'
    el.innerHTML = `
      <div class="bpmn-popup-header">
        <span class="bpmn-popup-title">${this.escapeHtml(info.displayName)}</span>
        <span class="bpmn-popup-badge is-${info.status}">${this.statusLabel(info.status)}</span>
      </div>
      <div class="bpmn-popup-body">
        ${info.actorName ? `<div class="bpmn-popup-row"><span class="bpmn-popup-label">处理人</span><span>${this.escapeHtml(info.actorName)}</span></div>` : ''}
        ${info.startTime ? `<div class="bpmn-popup-row"><span class="bpmn-popup-label">到达时间</span><span>${this.escapeHtml(info.startTime)}</span></div>` : ''}
        ${info.endTime ? `<div class="bpmn-popup-row"><span class="bpmn-popup-label">完成时间</span><span>${this.escapeHtml(info.endTime)}</span></div>` : ''}
        ${info.execIndex !== undefined ? `<div class="bpmn-popup-row"><span class="bpmn-popup-label">执行序号</span><span>#${info.execIndex + 1}</span></div>` : ''}
      </div>
    `
    return el
  }

  private buildEmptyPopup(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'bpmn-runtime-popup'
    el.innerHTML = `
      <div class="bpmn-popup-header">
        <span class="bpmn-popup-title">节点信息</span>
      </div>
      <div class="bpmn-popup-body">
        <span style="color:#999;font-size:12px;">该节点尚未执行</span>
      </div>
    `
    return el
  }

  private statusLabel(status: string): string {
    const map: Record<string, string> = {
      completed: '已完成',
      active: '执行中',
      failed: '失败',
      rejected: '已驳回',
      killed: '已终止',
    }
    return map[status] || status
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}
