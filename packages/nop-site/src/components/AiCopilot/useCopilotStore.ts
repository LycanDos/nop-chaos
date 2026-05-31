// ============================================================
// Pinia Store — AI Copilot 会话状态
// ============================================================

import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import type { CopilotMessage, FrontendInstruction, UserPermissionInfo, ExecutionFeedback, PageChange } from './types'
import { CopilotScopeLevel } from './ScopeGuard'
import { usePermissionStore } from '/@/store/modules/permission'
import { useUserStore } from '/@/store/modules/user'
import type { Menu } from '/@/router/types'

export interface ConfirmPending {
  instruction: FrontendInstruction
  resolve: (confirmed: boolean) => void
}

// 从菜单列表中提取所有路由路径
function extractMenuRoutes(menus: Menu[]): string[] {
  const routes: string[] = []
  function traverse(items: Menu[]) {
    for (const item of items) {
      if (item.path) {
        routes.push(item.path)
      }
      if (item.children?.length) {
        traverse(item.children)
      }
    }
  }
  traverse(menus)
  return routes
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

  // Permission info - menuAccess 从 permission store 获取，角色由后端服务端计算
  const userPermissions = computed<UserPermissionInfo>(() => {
    const permissionStore = usePermissionStore()

    // 从后台菜单列表中提取路由（仅作为后端校验的辅助提示）
    const backMenuList = permissionStore.getBackMenuList || []
    const menuAccess = extractMenuRoutes(backMenuList)

    return {
      menuAccess,
      siteId: 'main'
    }
  })

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
    userPermissions,
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
