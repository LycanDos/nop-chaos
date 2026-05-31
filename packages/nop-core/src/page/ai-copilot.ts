// ============================================================
// AI Copilot 页面上下文注册工具
// ============================================================

import type { PageRuntimeContext, ActionHandler } from '@nop-chaos/sdk'

/**
 * 向 AI Copilot 注册当前页面的运行时上下文和操作处理函数。
 * 在页面的 onMounted 中调用。
 *
 * state 应为已 materialize 的快照（非函数），必要时在调用前自行捕获。
 * 过渡期仍支持 getState 函数，AiCopilot 会在请求发送前调用它并合并到 state。
 *
 * @example
 * ```ts
 * providePageContext({
 *   pageType: 'bpmn-designer',
 *   route: '/bpmn-designer/example',
 *   state: { processName: currentName.value },
 *   actions: {
 *     addNode: async (params) => { ... },
 *   },
 * })
 * ```
 */
export function providePageContext(context: PageRuntimeContext): void {
  // 通过 window 上挂载的 copilot 实例注入
  const copilotApp = (window as any).__copilotApp__
  if (copilotApp && typeof copilotApp.setPageContext === 'function') {
    copilotApp.setPageContext(context)
  }

  // 同时通过 custom event 通知
  window.dispatchEvent(
    new CustomEvent('copilot:page-context', {
      detail: context,
      bubbles: false,
    }),
  )
}

/**
 * 从当前页面注销上下文（页面卸载时自动清理）
 */
export function unregisterPageContext(pageType: string): void {
  const copilotApp = (window as any).__copilotApp__
  if (copilotApp && typeof copilotApp.unregisterPage === 'function') {
    copilotApp.unregisterPage(pageType)
  }

  // 同时通过 custom event 通知
  window.dispatchEvent(
    new CustomEvent('copilot:page-unregister', {
      detail: { pageType },
      bubbles: false,
    }),
  )
}

// 表单字段匹配工具
export function findMatchingFields(
  formSchema: { fields: Array<{ name: string; label: string; type: string; required: boolean; readonly?: boolean; value?: any }> },
  params: { fieldType?: string; fieldPattern?: string; fieldName?: string; fieldLabel?: string; fieldRequired?: boolean },
): Array<{ name: string; label: string }> {
  const { fieldType, fieldPattern, fieldName, fieldLabel, fieldRequired } = params

  return formSchema.fields
    .filter((f) => {
      if (fieldName && f.name === fieldName) return true
      if (fieldLabel && f.label === fieldLabel) return true
      if (fieldType && f.type === fieldType) return true
      if (fieldPattern && f.label.includes(fieldPattern)) return true
      if (fieldRequired !== undefined && f.required === fieldRequired) return true
      return false
    })
    .map((f) => ({ name: f.name, label: f.label }))
}
