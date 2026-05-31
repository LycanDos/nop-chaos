// ============================================================
// 页面上下文注册工具 — 供各页面注册运行时上下文
// ============================================================

import { inject, onMounted, onBeforeUnmount, provide } from 'vue'
import type { PageRuntimeContext } from './types'

export const PAGE_CONTEXT_KEY = Symbol('copilot-page-context')

// Copilot 实例引用（由 AiCopilot.vue 设置）
let copilotInstance: any = null

export function setCopilotInstance(instance: any): void {
  copilotInstance = instance
}

/**
 * 页面调用此方法注册运行时上下文
 * 放在页面的 <script setup> 中调用
 *
 * @example
 * providePageContext({
 *   pageType: 'bpmn-designer',
 *   route: '/bpmn-designer/example',
 *   state: { processName: 'current' },
 *   actions: {
 *     addNode: async (params) => { ... },
 *     updateNode: async (params) => { ... },
 *   }
 * })
 */
export function providePageContext(context: PageRuntimeContext): void {
  provide(PAGE_CONTEXT_KEY, context)

  // 通知 Copilot 注册此页面的上下文
  if (copilotInstance && copilotInstance.setPageContext) {
    copilotInstance.setPageContext(context)
  }

  // 同时通过 unified CustomEvent 通道广播（与 nop-core/ai-copilot.ts 协议一致）
  window.dispatchEvent(
    new CustomEvent('copilot:page-context', {
      detail: context,
      bubbles: false,
    }),
  )
}

/**
 * 子组件获取页面上下文
 */
export function usePageContext(): PageRuntimeContext | null {
  return inject(PAGE_CONTEXT_KEY, null)
}
