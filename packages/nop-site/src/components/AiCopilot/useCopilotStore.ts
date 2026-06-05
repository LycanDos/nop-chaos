// ============================================================
// Pinia Store — AI Copilot 会话状态
// ============================================================

import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { CopilotMessage, FrontendInstruction, ExecutionFeedback, PageChange } from './types'
import { CopilotScopeLevel } from './ScopeGuard'

export interface ConfirmPending {
  instruction: FrontendInstruction
  resolve: (confirmed: boolean) => void
}

export const useCopilotStore = defineStore('ai-copilot', () => {
  // UI state
  const expanded = ref(false)
  const sending = ref(false)
  const selectingMode = ref(false)
  const scope = ref<CopilotScopeLevel>(CopilotScopeLevel.SYSTEM)

  // Messages
  const messages = shallowRef<CopilotMessage[]>([])

  // Session
  const sessionId = ref('')

  // Trace 调试开关
  const traceEnabled = ref(false)

  // Pending confirmation
  const pendingConfirm = ref<ConfirmPending | null>(null)

  // 执行反馈与页面切换（用于多轮对话上下文）
  const lastExecutionFeedback = ref<ExecutionFeedback | undefined>(undefined)
  const lastPageChange = ref<PageChange | undefined>(undefined)

  function recordExecutionFeedback(feedback: ExecutionFeedback): void {
    lastExecutionFeedback.value = feedback
  }

  function recordPageChange(change: PageChange): void {
    lastPageChange.value = change
  }

  function clearFeedback(): void {
    lastExecutionFeedback.value = undefined
    lastPageChange.value = undefined
  }

  function toggleExpanded(): void {
    expanded.value = !expanded.value
  }

  function addMessage(msg: CopilotMessage): void {
    messages.value = [...messages.value, msg]
  }

  function appendToLastMessage(text: string): void {
    const msgs = messages.value
    if (msgs.length === 0) return
    const last = msgs[msgs.length - 1]
    if (last.role === 'assistant') {
      const updated = [...msgs]
      updated[msgs.length - 1] = {
        ...last,
        content: (last.content || '') + text,
        isStreaming: true,
      }
      messages.value = updated
    }
  }

  function finalizeLastMessage(): void {
    const msgs = messages.value
    if (msgs.length === 0) return
    const last = msgs[msgs.length - 1]
    if (last.isStreaming) {
      const updated = [...msgs]
      updated[msgs.length - 1] = { ...last, isStreaming: false }
      messages.value = updated
    }
  }

  function setPendingConfirm(confirm: ConfirmPending | null): void {
    pendingConfirm.value = confirm
  }

  function confirmAction(confirmed: boolean): void {
    if (pendingConfirm.value) {
      pendingConfirm.value.resolve(confirmed)
      pendingConfirm.value = null
    }
  }

  function clearMessages(): void {
    messages.value = []
  }

  function generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }

  return {
    expanded,
    sending,
    selectingMode,
    scope,
    messages,
    sessionId,
    pendingConfirm,
    lastExecutionFeedback,
    lastPageChange,
    traceEnabled,
    toggleExpanded,
    addMessage,
    appendToLastMessage,
    finalizeLastMessage,
    setPendingConfirm,
    confirmAction,
    clearMessages,
    generateId,
    recordExecutionFeedback,
    recordPageChange,
    clearFeedback,
  }
})
