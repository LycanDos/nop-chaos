// ============================================================
// 前端操作指令执行器
// ============================================================

import type { FrontendInstruction, FrontendAction, PageRuntimeContext, ActionHandler } from './types'

export interface ActionResult {
  success: boolean
  data?: any
  error?: string
}

type ActionType = string
type PageType = string
type ActionName = string

export class ActionExecutor {
  // pageType -> { actionName -> handler }
  private handlers: Map<PageType, Map<ActionName, ActionHandler>> = new Map()
  private pageContexts: Map<PageType, PageRuntimeContext> = new Map()

  /**
   * 注册页面的 action handlers 和运行时上下文
   */
  registerPageActions(pageType: string, context: PageRuntimeContext): void {
    this.pageContexts.set(pageType, context)
    if (context.actions) {
      const handlerMap = new Map<string, ActionHandler>()
      for (const [name, handler] of Object.entries(context.actions)) {
        handlerMap.set(name, handler)
      }
      this.handlers.set(pageType, handlerMap)
    }
  }

  /**
   * 注销页面
   */
  unregisterPage(pageType: string): void {
    this.handlers.delete(pageType)
    this.pageContexts.delete(pageType)
  }

  /**
   * 执行前端操作指令
   */
  async execute(instruction: FrontendInstruction): Promise<ActionResult[]> {
    const results: ActionResult[] = []

    for (const action of instruction.actions) {
      try {
        const result = await this.executeAction(action, instruction.targetPage?.pageType)
        results.push(result)
      } catch (err: any) {
        results.push({ success: false, error: err.message || 'Execution failed' })
        // Stop on first error
        break
      }
    }

    return results
  }

  private async executeAction(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    switch (action.type) {
      case 'navigate':
        return this.handleNavigate(action)
      case 'call':
        return this.handleCall(action, pageType)
      case 'fillForm':
        return this.handleFillForm(action, pageType)
      case 'click':
        return this.handleClick(action, pageType)
      case 'submitForm':
        return this.handleSubmitForm(action, pageType)
      case 'openDialog':
        return this.handleOpenDialog(action)
      case 'query':
        return this.handleQuery(action)
      default:
        return { success: false, error: `Unknown action type: ${action.type}` }
    }
  }

  /** 查找页面注册的 action handler，用于 handler-first 架构 */
  private findRegisteredHandler(
    actionName: string | undefined,
    pageType?: string,
  ): ActionHandler | null {
    if (!actionName || !pageType) return null
    const handlerMap = this.handlers.get(pageType)
    if (!handlerMap) return null
    return handlerMap.get(actionName) || null
  }

  private async handleClick(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    // 1. 优先使用页面注册的 action handler
    const actionName = action.actionName || action.target
    const handler = this.findRegisteredHandler(actionName, pageType)
    if (handler) {
      try {
        await handler(action.params)
        // 给弹窗/UI 渲染留出时间
        await sleep(200)
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }

    // 2. 语义路径：通过 actionName 定位按钮（DOM 兜底）
    let element: HTMLElement | null = null
    if (action.actionName) {
      element = this.findActionButton(action.actionName)
    }

    // 3. DOM selector 路径
    if (!element && action.domSelector) {
      element = document.querySelector(action.domSelector)
    }

    // 4. target 字段兼容（仅 CSS selector 形式）
    if (!element && action.target && (action.target.startsWith('#') || action.target.startsWith('.') || action.target.startsWith('['))) {
      element = document.querySelector(action.target)
    }

    if (!element) {
      const targetDesc = action.actionName || action.domSelector || action.target || 'unknown'
      return { success: false, error: `Element not found: ${targetDesc}` }
    }
    element.click()
    // 给后续操作留出渲染时间
    await sleep(200)
    return { success: true }
  }

  private async handleFillForm(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    const value = action.params?.value
    if (value === undefined) {
      return { success: false, error: 'Missing value for fillForm' }
    }

    // 1. 优先使用页面注册的 action handler（key: "fillForm"）
    const handler = this.findRegisteredHandler('fillForm', pageType)
    if (handler) {
      try {
        await handler(action.params)
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }

    // 2. DOM 路径（带重试，适配弹窗渲染延迟）
    let element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) {
        await sleep(200 * attempt)
      }
      element = this.findFormField(action)
      if (element) break
    }

    if (!element) {
      const targetDesc = action.fieldName || action.domSelector || action.target || 'unknown'
      return { success: false, error: `Element not found: ${targetDesc}` }
    }

    // 使用 native setter 绕过 React 的 value 属性拦截（兼容 AMIS/React 受控组件）
    const strValue = String(value)
    if (element instanceof HTMLInputElement) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype, 'value',
      )!.set!
      nativeSetter!.call(element, strValue)
    } else if (element instanceof HTMLTextAreaElement) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype, 'value',
      )!.set!
      nativeSetter!.call(element, strValue)
    } else if (element instanceof HTMLSelectElement) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype, 'value',
      )!.set!
      nativeSetter!.call(element, strValue)
    } else {
      element.value = strValue
    }

    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))

    return { success: true }
  }

  private async handleSubmitForm(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    // 1. 优先使用页面注册的 action handler（key: "submitForm" 或 "submit"）
    const handler = this.findRegisteredHandler('submitForm', pageType)
      || this.findRegisteredHandler('submit', pageType)
    if (handler) {
      try {
        await handler(action.params)
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }

    // 2. DOM 路径：查找提交/保存按钮并点击
    const labels = ['提交', '保存', '确定', 'submit', 'save', 'ok']
    let btn: HTMLElement | null = null

    // 按 data-tooltip 匹配
    for (const label of labels) {
      btn = document.querySelector(`[data-tooltip="${label}"]`) as HTMLElement
      if (btn) break
    }

    // 按按钮文本匹配
    if (!btn) {
      const buttons = document.querySelectorAll('button, .btn, [role="button"], .cxd-Button')
      for (const b of buttons) {
        const text = b.textContent?.trim() || ''
        if (labels.some(l => text === l)) {
          btn = b as HTMLElement
          break
        }
      }
    }

    // 在弹窗内查找（modal/dialog 容器内优先）
    if (!btn) {
      const modal = document.querySelector('.cxd-Modal--open, .amis-dialog, [role="dialog"]')
      if (modal) {
        const confirmBtn = modal.querySelector('.cxd-Modal-footer button:last-child, .cxd-Dialog-footer button:last-child') as HTMLElement
        if (confirmBtn) btn = confirmBtn
      }
    }

    if (!btn) {
      return { success: false, error: 'Submit button not found' }
    }
    btn.click()
    await sleep(300)
    return { success: true }
  }

  private async handleNavigate(action: FrontendAction): Promise<ActionResult> {
    const router = (window as any).__router__
    if (!router) {
      return { success: false, error: 'Router not available' }
    }
    await router.push(action.target || action.route)
    return { success: true }
  }

  private async handleCall(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    if (!pageType) {
      return { success: false, error: 'No target pageType specified' }
    }
    const handlerMap = this.handlers.get(pageType)
    if (!handlerMap) {
      return { success: false, error: `No handlers registered for page: ${pageType}` }
    }
    const handler = handlerMap.get(action.target)
    if (!handler) {
      return { success: false, error: `No handler for action: ${action.target}` }
    }
    const result = await handler(action.params)
    return { success: true, data: result }
  }

  private findFormField(action: FrontendAction): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    if (action.fieldName) {
      const el = this.findFieldByName(action.fieldName)
      if (el) return el
    }
    if (action.domSelector) {
      const el = document.querySelector(action.domSelector) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (el) return el
    }
    if (action.target && (action.target.startsWith('#') || action.target.startsWith('.') || action.target.startsWith('['))) {
      const el = document.querySelector(action.target) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (el) return el
    }
    return null
  }

  private findFieldByName(fieldName: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    const selectors = [
      `[name="${fieldName}"]`,
      `[data-field="${fieldName}"]`,
      `[data-name="${fieldName}"]`,
      `[data-fieldname="${fieldName}"]`,
    ]
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (el) return el
    }
    const labels = document.querySelectorAll('label')
    for (const label of labels) {
      if (label.textContent?.trim() === fieldName) {
        const forId = label.getAttribute('for')
        if (forId) {
          const el = document.getElementById(forId) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          if (el) return el
        }
        const parent = label.closest('.amis-form-group') || label.closest('.form-group')
        if (parent) {
          const input = parent.querySelector('input, select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          if (input) return input
        }
      }
    }
    return null
  }

  private findActionButton(actionName: string): HTMLElement | null {
    const selectors = [
      `[data-action="${actionName}"]`,
      `[data-action-name="${actionName}"]`,
      `.amis-action[data-name="${actionName}"]`,
      `button[data-action="${actionName}"]`,
    ]
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement
      if (el) return el
    }

    // AMIS 按钮：通过 data-tooltip 匹配
    const amisLabels = getAmisActionLabels(actionName)
    for (const label of amisLabels) {
      const el = document.querySelector(`[data-tooltip="${label}"]`) as HTMLElement
      if (el) return el
    }

    // 通过按钮文本匹配
    const buttons = document.querySelectorAll('button, .btn, [role="button"], .cxd-Button')
    const lowerName = actionName.toLowerCase()
    for (const btn of buttons) {
      const text = btn.textContent?.trim() || ''
      const title = (btn as HTMLElement).getAttribute('data-tooltip') || ''
      // 精确匹配英文
      if (text === actionName || title === actionName) {
        return btn as HTMLElement
      }
      // 中文映射匹配
      if (amisLabels.some(l => text === l || title === l)) {
        return btn as HTMLElement
      }
      // 包含匹配（按钮文本包含 actionName 或 actionName 包含按钮文本）
      if (actionName.length >= 3 && (text.includes(actionName) || lowerName.includes(text.toLowerCase()))) {
        return btn as HTMLElement
      }
    }

    return null
  }

  private async handleOpenDialog(action: FrontendAction): Promise<ActionResult> {
    // 语义路径：通过 dialogName
    const dialogTarget = action.dialogName || action.target

    // 通过 Mitt 事件总线打开弹窗
    const emitter = (window as any).__emitter__
    if (emitter) {
      emitter.emit(dialogTarget, action.params)
      return { success: true }
    }
    return { success: false, error: 'Event bus not available' }
  }

  private async handleQuery(action: FrontendAction): Promise<ActionResult> {
    // 语义路径：entityName 优先
    const entity = action.entityName || action.target

    // GraphQL 查询通过 nop-core 的 ajaxFetch
    const ajaxFetch = (window as any).__ajaxFetch__
    if (!ajaxFetch) {
      return { success: false, error: 'ajaxFetch not available' }
    }

    const filters = action.params

    try {
      const result = await ajaxFetch(`/r/${entity}__findPage`, {
        method: 'POST',
        body: JSON.stringify({ query: filters || {} }),
      })
      return { success: true, data: result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}

/** 将英文 actionName 映射为 AMIS 页面常见的中文按钮文本 */
function getAmisActionLabels(actionName: string): string[] {
  const map: Record<string, string[]> = {
    add: ['新增', '新建', '添加', '创建'],
    create: ['新增', '新建', '添加', '创建'],
    edit: ['编辑', '修改'],
    update: ['编辑', '修改'],
    delete: ['删除'],
    remove: ['删除', '移除'],
    query: ['查询', '搜索'],
    search: ['查询', '搜索'],
    export: ['导出'],
    import: ['导入'],
    submit: ['提交', '保存', '确定'],
    save: ['提交', '保存', '确定'],
    cancel: ['取消'],
    reset: ['重置'],
    refresh: ['刷新'],
    batchDelete: ['批量删除'],
    batchEdit: ['批量修改'],
  }
  return map[actionName] || []
}

// Singleton
export const actionExecutor = new ActionExecutor()

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
