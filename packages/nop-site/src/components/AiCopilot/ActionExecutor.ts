// ============================================================
// 前端操作指令执行器
// ============================================================

import type { FrontendInstruction, FrontendAction, PageRuntimeContext, ActionHandler } from './types'

export interface ActionResult {
  success: boolean
  data?: any
  error?: string
}

type PageType = string
type ActionName = string

export class ActionExecutor {
  // pageType -> { actionName -> handler }
  private handlers: Map<PageType, Map<ActionName, ActionHandler>> = new Map()
  private pageContexts: Map<PageType, PageRuntimeContext> = new Map()

  /**
   * 注册页面的 action handlers 和运行时上下文。
   * 支持增量合并：新 context 的 actions 为空时会保留已注册的 handlers。
   */
  registerPageActions(pageType: string, context: PageRuntimeContext): void {
    // 增量合并：保留已有 handlers（预注册时 actions 为空，正式注册时补充）
    const existingContext = this.pageContexts.get(pageType)
    if (existingContext && (!context.actions || Object.keys(context.actions).length === 0)) {
      context = { ...context, actions: existingContext.actions || {} }
    }
    this.pageContexts.set(pageType, context)
    if (context.actions) {
      const handlerMap = this.handlers.get(pageType) || new Map<string, ActionHandler>()
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

    // Resolve pageType: instruction.targetPage.pageType > first action's pageType > search all registered
    let resolvedPageType = instruction.targetPage?.pageType
    if (!resolvedPageType && instruction.actions.length > 0) {
      resolvedPageType = instruction.actions[0].pageType
    }

    for (const action of instruction.actions) {
      try {
        // Per-action pageType overrides the resolved one
        const pageType = action.pageType || resolvedPageType
        const result = await this.executeAction(action, pageType)
        results.push(result)
      } catch (err: any) {
        results.push({ success: false, error: err.message || 'Execution failed' })
        // Stop on first error
        break
      }
    }

    return results
  }

  /**
   * 带重试的执行方法，用于应对 handler 异步注册或 DOM 元素延迟渲染。
   * 仅对 "No handler" 和 "Element not found" 错误进行重试（指数退避）。
   */
  async executeWithRetry(
    instruction: FrontendInstruction,
    maxRetries: number = 3,
    baseDelayMs: number = 300,
  ): Promise<ActionResult[]> {
    let lastResults: ActionResult[] = []

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(baseDelayMs * Math.pow(2, attempt - 1))
      }
      lastResults = await this.execute(instruction)
      const retryable = lastResults.some(
        (r) => !r.success && (r.error?.includes('No handler') || r.error?.includes('Element not found')),
      )
      if (!retryable) break
    }

    return lastResults
  }

  /**
   * 执行补偿操作 - 多步操作失败时逆序回滚已成功的步骤。
   * @param instruction 包含 compensation 信息的指令
   * @param succeededCount 已成功执行的 action 数量
   */
  async executeCompensations(
    instruction: FrontendInstruction,
    succeededCount: number,
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = []
    // 逆序回滚：先回滚最后成功的操作，再回滚之前的
    for (let i = succeededCount - 1; i >= 0; i--) {
      const action = instruction.actions[i]
      if (!action.compensationType) continue

      const result = await this.executeCompensationAction(
        action,
        instruction.targetPage?.pageType,
      )
      results.push(result)
    }
    return results
  }

  /**
   * 执行单个补偿操作
   */
  private async executeCompensationAction(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    const compType = action.compensationType
    const compParams = action.compensationParams

    switch (compType) {
      case 'navigateBack': {
        const router = (window as any).__router__
        if (!router) return { success: false, error: 'Router not available for compensation' }
        await router.push(compParams?.route || '/')
        return { success: true, data: { type: 'navigateBack' } }
      }

      case 'clearField': {
        const fieldName = compParams?.fieldName || action.fieldName
        if (!fieldName) return { success: false, error: 'No fieldName for clearField compensation' }
        const element = this.findFormField({
          ...action,
          fieldName,
        } as FrontendAction)
        if (element) {
          // 使用原生 setter 清空值（兼容 AMIS/React 受控组件）
          const proto = Object.getPrototypeOf(element)
          const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
          if (nativeSetter) {
            nativeSetter.call(element, '')
            element.dispatchEvent(new Event('input', { bubbles: true }))
            element.dispatchEvent(new Event('change', { bubbles: true }))
          }
          return { success: true, data: { type: 'clearField', fieldName } }
        }
        return { success: false, error: `Field not found for compensation: ${fieldName}` }
      }

      case 'deleteCreatedRecord': {
        // 通过 AMIS CRUD 的删除操作清理刚创建但后续步骤失败的记录
        // 当前为占位实现，依赖页面注册的 deleteRecord handler
        const handler = this.findRegisteredHandler('deleteRecord', pageType)
        if (handler) {
          try {
            await handler(compParams)
            return { success: true, data: { type: 'deleteCreatedRecord' } }
          } catch (err: any) {
            return { success: false, error: err.message }
          }
        }
        return { success: false, error: 'No deleteRecord handler for compensation' }
      }

      case 'custom': {
        // 执行自定义补偿操作（如点击取消按钮、关闭弹窗）
        const compAction: FrontendAction = {
          type: (compParams?.type as FrontendAction['type']) || 'click',
          target: compParams?.target || '',
          actionName: compParams?.actionName,
          params: compParams || {},
        }
        return this.executeAction(compAction, pageType)
      }

      default:
        return { success: false, error: `Unknown compensation type: ${compType}` }
    }
  }

  private async executeAction(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    switch (action.type) {
      case 'navigate':
        return this.handleNavigate(action, pageType)
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
    let handler = this.findRegisteredHandler(actionName, pageType)
    if (handler) {
      try {
        await handler(action.params)
        // 给弹窗/UI 渲染留出时间
        await sleep(200)
        return { success: true, data: { type: action.type, target: actionName } }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }

    // 1a. 全局搜索所有已注册页面（仅 pageType 未知时兜底，避免串页误点）
    if (actionName && !pageType) {
      for (const [, handlerMap] of this.handlers.entries()) {
        const h = handlerMap.get(actionName)
        if (h) {
          handler = h
          break
        }
      }
      if (handler) {
        try {
          await handler(action.params)
          await sleep(200)
          return { success: true, data: { type: action.type, target: actionName } }
        } catch (err: any) {
          return { success: false, error: err.message }
        }
      }
    }

    // 2. 尝试通过 AMIS __amisScoped__ 桥接分发（绕过 DOM）
    if (actionName) {
      const amisResult = this.dispatchViaAmisScope(actionName)
      if (amisResult) {
        await sleep(200)
        return amisResult
      }
    }

    // 3. 语义路径：通过 actionName 定位按钮（DOM 兜底）
    let element: HTMLElement | null = null
    if (action.actionName) {
      element = this.findActionButton(action.actionName)
    }

    // 4. DOM selector 路径
    if (!element && action.domSelector) {
      element = document.querySelector(action.domSelector)
    }

    // 5. target 字段兼容（仅 CSS selector 形式）
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
    return { success: true, data: { type: action.type, target: action.actionName || action.target } }
  }

  /**
   * 通过 AMIS __amisScoped__ 分发 CRUD action（列表页 add/edit/delete 等）。
   * 完全绕过 DOM 操作，直接调用 AMIS 内部的 doAction → handleAction 链路。
   * @returns ActionResult 或 null（表示 AMIS scoped 不可用或未找到 CRUD 组件）
   */
  private dispatchViaAmisScope(name: string): ActionResult | null {
    try {
      const scoped = (window as any).__amisScoped__
      if (!scoped) return null

      const comps = scoped.getComponents?.()
      if (!comps || !comps.length) return null

      // 查找 CRUD 组件
      let crud: any = null
      for (const comp of comps) {
        if (comp?.props?.type === 'crud') { crud = comp; break }
      }
      if (!crud) {
        for (const comp of comps) {
          const body = comp?.props?.body
          if (body?.type === 'crud') {
            crud = comp.context?.getComponentByName?.(body.name)
            if (crud) break
          }
        }
      }
      if (!crud) return null

      // 从 CRUD props 查找匹配的 action 定义
      const listActions = crud.props?.listActions || []
      const rowActions = crud.props?.rowActions || []
      const allActions = [...listActions, ...rowActions]

      const actionDef = allActions.find((a: any) =>
        a.id === name ||
        (name === 'add' && (a.id?.includes('add') || a.id?.includes('create'))) ||
        (name === 'edit' && a.id?.includes('update')) ||
        (name === 'delete' && a.id?.includes('delete'))
      )
      if (!actionDef) return null

      const storeData = crud.props?.store?.data ?? {}
      crud.doAction?.(actionDef, storeData, false)
      return { success: true, data: { type: 'click', target: name } }
    } catch {
      return null
    }
  }

  /**
   * 通过 AMIS 内部 API 设置表单字段值，触发完整的响应式链路。
   * 优先于 DOM setter 执行；不可用时返回 null 降级到 DOM 路径。
   *
   * 策略：
   * 1. 通过 fieldName 在 store 的 data 中定位实际 key（支持中文→英文映射）
   * 2. 调用 amisScoped.getComponentByName(formName).props.store.setValue(key, value)
   * 3. 如果 fieldName 本身就是 store key，直接 setValue
   */
  private fillFormViaAmisScope(
    fieldName: string | undefined,
    value: any,
    label?: string,
  ): ActionResult | null {
    if (!fieldName) return null

    try {
      const scoped = (window as any).__amisScoped__
      if (!scoped) return null

      const comps = scoped.getComponents?.()
      if (!comps || !comps.length) return null

      // 查找 form 组件（AMIS form 的 type 可能是 'form'、'input-form'、'wizard'）
      let formComp: any = null
      for (const comp of comps) {
        const type = comp?.props?.type
        if (type === 'form' || type === 'input-form' || type === 'wizard') {
          formComp = comp
          break
        }
      }
      if (!formComp) {
        // try body-level form
        for (const comp of comps) {
          const body = comp?.props?.body
          if (body?.type === 'form' || body?.type === 'input-form') {
            formComp = comp.context?.getComponentByName?.(body.name)
            if (formComp) break
          }
        }
      }
      if (!formComp) return null

      const store = formComp.props?.store
      if (!store || typeof store.setValue !== 'function') return null

      // Resolve the actual store key from fieldName/label
      const resolvedKey = this.resolveStoreKey(fieldName, label, store)
      if (!resolvedKey) return null

      store.setValue(resolvedKey, value)
      return { success: true, data: { type: 'fillForm', target: resolvedKey, via: 'amis' } }
    } catch {
      return null
    }
  }

  /**
   * 将语义 fieldName / label 解析为 AMIS store 中的实际 data key。
   * 支持：精确key匹配 → label→key映射 → 归一化模糊匹配
   */
  private resolveStoreKey(
    fieldName: string,
    label: string | undefined,
    store: any,
  ): string | null {
    const data = store.data || {}
    const keys = Object.keys(data)

    // 1. 精确匹配 store key
    if (keys.includes(fieldName)) return fieldName

    // 2. 遍历 components 查找 label→name 映射
    const formItems = store.formItems || []
    for (const item of formItems) {
      const itemLabel = item?.label || item?.props?.label || ''
      const itemName = item?.name || item?.props?.name || ''
      if (itemName && keys.includes(itemName)) {
        if (itemLabel === label || itemLabel === fieldName) return itemName
        const norm = (s: string) => (s || '').replace(/[\s_-]/g, '').toLowerCase()
        const fln = norm(fieldName)
        if (norm(itemLabel).includes(fln) || fln.includes(norm(itemLabel))) return itemName
        if (norm(itemName).includes(fln) || fln.includes(norm(itemName))) return itemName
      }
    }

    // 3. label 反向查找（遍历 form body 中的控件）
    const body = store.form?.body || store.form?.controls || []
    for (const ctrl of body) {
      const ctrlName = ctrl?.name || ctrl?.props?.name || ''
      const ctrlLabel = ctrl?.label || ctrl?.props?.label || ''
      if (ctrlName && keys.includes(ctrlName)) {
        if (ctrlLabel === label || ctrlLabel === fieldName) return ctrlName
        const norm = (s: string) => (s || '').replace(/[\s_-]/g, '').toLowerCase()
        if (norm(ctrlLabel).includes(norm(fieldName)) || norm(fieldName).includes(norm(ctrlLabel))) return ctrlName
      }
    }

    // 4. 归一化模糊匹配所有 store keys（fallback）
    const norm = (s: string) => (s || '').replace(/[\s_-]/g, '').toLowerCase()
    for (const key of keys) {
      if (norm(key).includes(norm(fieldName)) || norm(fieldName).includes(norm(key))) {
        return key
      }
    }

    return null
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
        await handler({
          value,
          fieldName: action.fieldName,
          label: action.label,
          domSelector: action.domSelector,
        })
        return { success: true, data: { type: 'fillForm', target: action.fieldName || action.target || '', value } }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }

    // 2. 尝试通过 AMIS 作用域 API 设置值（触发完整响应式链路）
    const amisResult = this.fillFormViaAmisScope(action.fieldName, value, action.label)
    if (amisResult) {
      return amisResult
    }

    // 3. DOM 路径（带重试，适配弹窗渲染延迟）
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
    }

    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))

    return { success: true, data: { type: 'fillForm', target: action.fieldName || action.target || '', value } }
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
      const buttons = document.querySelectorAll('button, .btn, [role="button"], .cxd-Button, .ant-btn')
      for (const b of Array.from(buttons)) {
        const text = b.textContent?.trim() || ''
        if (labels.some(l => text === l)) {
          btn = b as HTMLElement
          break
        }
      }
    }

    // 在弹窗内查找（modal/dialog 容器内优先）
    if (!btn) {
      const modal = document.querySelector('.ant-modal-wrap, .ant-modal, .cxd-Modal--open, .amis-dialog')
      if (modal) {
        const confirmBtn = modal.querySelector('.ant-modal-footer button:last-child, .cxd-Modal-footer button:last-child, .cxd-Dialog-footer button:last-child') as HTMLElement
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

  private async handleNavigate(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    const router = (window as any).__router__
    if (!router) {
      return { success: false, error: 'Router not available' }
    }
    await router.push(action.target || action.route)
    if (pageType) {
      const ready = await this.waitForPageContext(pageType)
      if (!ready) {
        return { success: false, error: `Target page not ready: ${pageType}` }
      }
    }
    return {
      success: true,
      data: {
        type: action.type,
        target: action.target || action.route || pageType || 'navigate',
      },
    }
  }

  private async waitForPageContext(
    pageType: string,
    timeoutMs: number = 5000,
  ): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (this.pageContexts.has(pageType)) {
        return true
      }
      await sleep(100)
    }
    return false
  }

  private async handleCall(
    action: FrontendAction,
    pageType?: string,
  ): Promise<ActionResult> {
    const targetName = action.actionName || action.target
    if (!targetName) {
      return { success: false, error: 'call action missing actionName/target' }
    }

    // Resolve pageType: given pageType → search all registered pages → error
    let handler: ActionHandler | null = null
    let resolvedPageType = pageType

    if (resolvedPageType) {
      const handlerMap = this.handlers.get(resolvedPageType)
      handler = handlerMap?.get(targetName) || null
    }

    if (!handler) {
      // Search all registered pages for a matching handler
      for (const [pt, handlerMap] of this.handlers.entries()) {
        const h = handlerMap.get(targetName)
        if (h) {
          handler = h
          resolvedPageType = pt
          break
        }
      }
    }

    if (!handler) {
      // Fallback: 没有注册 handler 时，退化为 click 行为（DOM 查找按钮）
      // 适用于 AMIS CRUD 页面等没有注册 Vue handler 的场景
      const clickAction = { ...action, type: 'click' as const }
      const clickResult = await this.handleClick(clickAction, pageType)
      if (clickResult.success) {
        return clickResult
      }

      const registeredPages = Array.from(this.handlers.keys()).join(', ')
      return {
        success: false,
        error: `No handler '${targetName}' found. ` +
          (registeredPages
            ? `Registered pages: ${registeredPages}`
            : 'No pages have registered action handlers'),
      }
    }

    const result = await handler(action.params)
    return { success: true, data: result }
  }

  private findFormField(action: FrontendAction): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    // 弹窗内优先搜索
    const dialog = document.querySelector('.ant-modal-wrap, .ant-modal, .cxd-Modal--open')
    if (action.fieldName) {
      const el = this.findFieldByName(action.fieldName, action.label, dialog as HTMLElement)
      if (el) return el
    }
    if (action.domSelector) {
      const scope = (dialog || document) as HTMLElement
      const el = scope.querySelector(action.domSelector) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (el) return el
    }
    if (action.target && (action.target.startsWith('#') || action.target.startsWith('.') || action.target.startsWith('['))) {
      const scope = (dialog || document) as HTMLElement
      const el = scope.querySelector(action.target) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (el) return el
    }
    return null
  }

  private findFieldByName(
    fieldName: string,
    label?: string,
    scope?: HTMLElement | null,
  ): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    const container = scope || document
    // name 属性优先匹配 input/textarea/select
    if (fieldName) {
      const nameEl = container.querySelector(
        `input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`,
      ) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      if (nameEl) return nameEl
    }
    // 通用选择器（可能匹配到容器 div）
    const selectors = [
      `[name="${fieldName}"]`,
      `[data-field="${fieldName}"]`,
      `[data-name="${fieldName}"]`,
      `[data-fieldname="${fieldName}"]`,
    ]
    for (const sel of selectors) {
      const el = container.querySelector(sel)
      if (!el) continue
      // 目标元素就是表单控件
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        return el
      }
      // 匹配到容器元素，查找内部的 input/select/textarea
      if (el instanceof HTMLElement) {
        const inner = el.querySelector('input, select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
        if (inner) return inner
      }
    }
    // label 文本匹配（支持 fieldName 和 label）
    const labels = container.querySelectorAll('label')
    for (const labelEl of Array.from(labels)) {
      const text = labelEl.textContent?.trim() || ''
      const matchName = fieldName && (text === fieldName || text.includes(fieldName))
      const matchLabel = label && (
        text.includes(label) ||
        (label.includes(text) && text.length >= 3)
      )
      if (matchName || matchLabel) {
        const forId = labelEl.getAttribute('for')
        if (forId) {
          const el = container.querySelector(`#${forId.replace(/"/g, '\\"')}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null
          if (el) return el
        }
        // AMIS form item: label → .cxd-FormItem → input
        const formItem = labelEl.closest('.ant-form-item, .cxd-FormItem, .amis-form-group, .form-group')
        if (formItem) {
          const input = formItem.querySelector('input, select, textarea') as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          if (input) return input
        }
      }
    }
    // 5. 归一化模糊匹配 — name/label 去空格/下划线后包含匹配（最后兜底）
    if (fieldName) {
      const norm = (s: string) => (s || '').replace(/[\s_-]/g, '').toLowerCase()
      const nf = norm(fieldName)
      const inputs = container.querySelectorAll('input, select, textarea')
      for (const input of Array.from(inputs)) {
        const name = input.getAttribute('name') || ''
        if (norm(name).includes(nf) || nf.includes(norm(name))) {
          return input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        }
        // 也尝试通过 label
        const formItem = input.closest('.ant-form-item, .cxd-FormItem, .amis-form-group, .form-group')
        if (formItem) {
          const labelEl = formItem.querySelector('label')
          const labelText = labelEl?.textContent?.trim() || ''
          if (norm(labelText).includes(nf) || nf.includes(norm(labelText))) {
            return input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
          }
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
    const buttons = document.querySelectorAll('button, .btn, [role="button"], .cxd-Button, .ant-btn')
    const lowerName = actionName.toLowerCase()
    for (const btn of Array.from(buttons)) {
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
    createRecord: ['新增', '新建', '添加', '创建'],
    deleteRecord: ['删除'],
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
