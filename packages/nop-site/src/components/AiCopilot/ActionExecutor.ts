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
        return this.handleFillForm(action)
      case 'click':
        return this.handleClick(action)
      case 'openDialog':
        return this.handleOpenDialog(action)
      case 'query':
        return this.handleQuery(action)
      default:
        return { success: false, error: `Unknown action type: ${action.type}` }
    }
  }

  private async handleNavigate(action: FrontendAction): Promise<ActionResult> {
    const router = (window as any).__router__
    if (!router) {
      return { success: false, error: 'Router not available' }
    }
    await router.push(action.target)
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

  private async handleFillForm(action: FrontendAction): Promise<ActionResult> {
    const selector = action.target
    const value = action.params?.value

    if (!selector || value === undefined) {
      return { success: false, error: 'Missing selector or value for fillForm' }
    }

    const element = document.querySelector(selector) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    if (!element) {
      return { success: false, error: `Element not found: ${selector}` }
    }

    // Set value and trigger events
    element.value = String(value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))

    return { success: true }
  }

  private async handleClick(action: FrontendAction): Promise<ActionResult> {
    const element = document.querySelector(action.target) as HTMLElement
    if (!element) {
      return { success: false, error: `Element not found: ${action.target}` }
    }
    element.click()
    return { success: true }
  }

  private async handleOpenDialog(action: FrontendAction): Promise<ActionResult> {
    // 通过 Mitt 事件总线打开弹窗
    const emitter = (window as any).__emitter__
    if (emitter) {
      emitter.emit(action.target, action.params)
      return { success: true }
    }
    return { success: false, error: 'Event bus not available' }
  }

  private async handleQuery(action: FrontendAction): Promise<ActionResult> {
    // GraphQL 查询通过 nop-core 的 ajaxFetch
    const ajaxFetch = (window as any).__ajaxFetch__
    if (!ajaxFetch) {
      return { success: false, error: 'ajaxFetch not available' }
    }

    const entity = action.target
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

// Singleton
export const actionExecutor = new ActionExecutor()
