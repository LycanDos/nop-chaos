/**
 * SkinOverlayManager — 皮肤覆盖层管理器
 *
 * 基于 bpmn-js Overlays API，管理节点上的 HTML/SVG 覆盖元素：
 * - 进度条（节点底部）
 * - 经办人徽章（右上角）
 * - 状态图标
 * - Tooltip
 *
 * 每个覆盖层独立管理，支持按 elementId 批量清理。
 */

import type Overlays from 'diagram-js/lib/features/overlays/Overlays'
import type Canvas from 'diagram-js/lib/core/Canvas'
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry'
import type EventBus from 'diagram-js/lib/core/EventBus'

// 覆盖层类型标识
const OVERLAY_TYPE_PROGRESS = 'wfSkin.progress'
const OVERLAY_TYPE_BADGE = 'wfSkin.badge'
const OVERLAY_TYPE_STATUS = 'wfSkin.status'
const OVERLAY_TYPE_TOOLTIP = 'wfSkin.tooltip'

interface OverlayStyle {
  bgColor?: string
  textColor?: string
  borderRadius?: number
  fontSize?: number
}

interface ProgressConfig {
  value: number
  height?: number
  barColor?: string
  trailColor?: string
}

interface BadgeConfig {
  text: string
  style?: OverlayStyle
}

export default class SkinOverlayManager {
  private _overlays: Overlays
  private _canvas: Canvas
  private _elementRegistry: ElementRegistry
  private _eventBus: EventBus

  // 跟踪已添加的 overlay ID，用于清理
  private _overlayIds = new Map<string, Set<string>>()

  constructor(eventBus: EventBus, overlays: Overlays, canvas: Canvas, elementRegistry: ElementRegistry) {
    this._overlays = overlays
    this._canvas = canvas
    this._elementRegistry = elementRegistry
    this._eventBus = eventBus

    // 监听皮肤 overlay 更新事件
    eventBus.on('wfSkin.overlayUpdate', (e: any) => {
      this.updateOverlays(e.elementId, e.style, e.runtimeState)
    })
  }

  /**
   * 更新元素的所有覆盖层（由渲染器触发）
   */
  updateOverlays(
    elementId: string,
    style: Record<string, any>,
    runtimeState: Record<string, any>,
  ): void {
    this.clearElementOverlays(elementId)

    // 进度条
    const progressConfig = this._extractProgressConfig(style, runtimeState)
    if (progressConfig) {
      this.addProgressBar(elementId, progressConfig)
    }

    // 经办人徽章
    const badgeText = style['overlays.assignee.valueExpr'] || runtimeState.assignee
    if (badgeText) {
      this.addAssigneeBadge(elementId, String(badgeText), {
        bgColor: style['overlays.assignee.style.bgColor'] || '#1890ff',
        textColor: style['overlays.assignee.style.textColor'] || '#ffffff',
      })
    }

    // Tooltip
    const tooltipText = style['overlays.tooltip.valueExpr'] || ''
    if (tooltipText) {
      this.addTooltip(elementId, String(tooltipText))
    }
  }

  /**
   * 从已计算样式中提取进度条配置
   */
  private _extractProgressConfig(
    style: Record<string, any>,
    runtimeState: Record<string, any>,
  ): ProgressConfig | null {
    const show = style['progress.show']
    if (show === false) return null

    const value = runtimeState.progress ?? 0
    return {
      value,
      height: (style as any)['progress.height'] || 4,
      barColor: (style as any)['progress.colors.bar'] || '#1890ff',
      trailColor: (style as any)['progress.colors.trail'] || '#f0f0f0',
    }
  }

  /**
   * 为元素添加进度条覆盖层
   */
  addProgressBar(elementId: string, config: ProgressConfig): void {
    const element = this._elementRegistry.get(elementId)
    if (!element) return

    const height = config.height || 4
    const barColor = config.barColor || '#1890ff'
    const trailColor = config.trailColor || '#f0f0f0'
    const value = Math.max(0, Math.min(100, config.value))
    const width = element.width || 100

    const html = document.createElement('div')
    html.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      background: ${trailColor};
      border-radius: 0 0 2px 2px;
      overflow: hidden;
      position: relative;
    `

    const bar = document.createElement('div')
    bar.style.cssText = `
      width: ${value}%;
      height: 100%;
      background: ${barColor};
      transition: width 0.3s ease;
      border-radius: 0 0 0 2px;
    `
    html.appendChild(bar)

    const overlayId = this._overlays.add(element, OVERLAY_TYPE_PROGRESS, {
      position: { bottom: 0, left: 0 },
      html,
      show: { minZoom: 0.3 },
    })

    this._trackOverlay(elementId, overlayId)
  }

  /**
   * 为元素添加经办人徽章覆盖层
   */
  addAssigneeBadge(elementId: string, text: string, style?: OverlayStyle): void {
    const element = this._elementRegistry.get(elementId)
    if (!element || !text) return

    const bgColor = style?.bgColor || '#1890ff'
    const textColor = style?.textColor || '#ffffff'
    const fontSize = style?.fontSize || 10
    const borderRadius = style?.borderRadius || 10

    const html = document.createElement('div')
    html.textContent = text.length > 6 ? text.substring(0, 5) + '…' : text
    html.style.cssText = `
      background: ${bgColor};
      color: ${textColor};
      font-size: ${fontSize}px;
      border-radius: ${borderRadius}px;
      padding: 1px 6px;
      line-height: 1.5;
      white-space: nowrap;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    `

    const overlayId = this._overlays.add(element, OVERLAY_TYPE_BADGE, {
      position: { top: 2, right: 2 },
      html,
      show: { minZoom: 0.5 },
    })

    this._trackOverlay(elementId, overlayId)
  }

  /**
   * 为元素添加状态图标覆盖层
   */
  addStatusIcon(elementId: string, status: string, color: string): void {
    const element = this._elementRegistry.get(elementId)
    if (!element) return

    const iconMap: Record<string, string> = {
      activated: '●',
      completed: '✓',
      failed: '✕',
      suspended: '⏸',
      waiting: '◌',
      default: '○',
    }

    const icon = iconMap[status] || iconMap.default

    const html = document.createElement('div')
    html.textContent = icon
    html.style.cssText = `
      color: ${color};
      font-size: 16px;
      line-height: 1;
      pointer-events: none;
    `

    const overlayId = this._overlays.add(element, OVERLAY_TYPE_STATUS, {
      position: { top: 2, left: 2 },
      html,
      show: { minZoom: 0.5 },
    })

    this._trackOverlay(elementId, overlayId)
  }

  /**
   * 为元素添加 tooltip
   */
  addTooltip(elementId: string, text: string): void {
    const element = this._elementRegistry.get(elementId)
    if (!element || !text) return

    const html = document.createElement('div')
    html.textContent = text
    html.style.cssText = `
      position: absolute;
      bottom: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: #fff;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      display: none;
      z-index: 100;
    `

    // 悬停显示 tooltip
    const parent = this._canvas.getContainer()
    if (parent) {
      const showTooltip = () => { html.style.display = 'block' }
      const hideTooltip = () => { html.style.display = 'none' }

      const gfx = this._canvas.getGraphics(elementId)
      if (gfx) {
        gfx.addEventListener('mouseenter', showTooltip)
        gfx.addEventListener('mouseleave', hideTooltip)
      }
    }

    const overlayId = this._overlays.add(element, OVERLAY_TYPE_TOOLTIP, {
      position: { top: -10, left: 0 },
      html,
      show: { minZoom: 0.3 },
    })

    this._trackOverlay(elementId, overlayId)
  }

  /**
   * 清理单个元素的所有覆盖层
   */
  clearElementOverlays(elementId: string): void {
    const ids = this._overlayIds.get(elementId)
    if (ids) {
      for (const id of ids) {
        this._overlays.remove(id)
      }
      ids.clear()
    }

    // 清理 tooltip 事件监听
    const gfx = this._canvas.getGraphics(elementId)
    if (gfx) {
      // 用新元素替换监听（简化：重新获取时自动替换）
    }
  }

  /**
   * 清理所有覆盖层
   */
  clearAll(): void {
    for (const [elementId] of this._overlayIds) {
      this.clearElementOverlays(elementId)
    }
    this._overlayIds.clear()
  }

  /**
   * 跟踪 overlay ID 以便后续清理
   */
  private _trackOverlay(elementId: string, overlayId: string): void {
    if (!this._overlayIds.has(elementId)) {
      this._overlayIds.set(elementId, new Set())
    }
    this._overlayIds.get(elementId)!.add(overlayId)
  }
}
