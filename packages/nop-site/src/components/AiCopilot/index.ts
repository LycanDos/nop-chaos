// ============================================================
// AI Copilot 组件库入口
// ============================================================

export { default as AiCopilot } from './AiCopilot.vue'
export { default as ChatPanel } from './ChatPanel.vue'
export { default as MessageBubble } from './MessageBubble.vue'
export { default as ElementSelector } from './ElementSelector.vue'
export { useCopilotStore } from './useCopilotStore'
export { CopilotClient } from './CopilotClient'
export { actionExecutor, ActionExecutor } from './ActionExecutor'
export { checkStrictScope, CopilotScopeLevel, getRejectionMessage } from './ScopeGuard'
export { providePageContext, usePageContext, setCopilotInstance, PAGE_CONTEXT_KEY } from './usePageContext'
export * from './types'
