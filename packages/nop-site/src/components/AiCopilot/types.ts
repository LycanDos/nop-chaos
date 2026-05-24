// ============================================================
// AI Copilot 类型定义
// ============================================================

export interface PageRuntimeContext {
  pageType: string
  route: string
  getState?: () => Record<string, any>
  selectedElement?: ElementInfo | null
  actions?: Record<string, ActionHandler>
}

export interface PageAction {
  name: string
  description: string
  params?: ParamDef[]
  handler: string
}

export interface ParamDef {
  name: string
  type: string
  required: boolean
}

export type ActionHandler = (params: any) => Promise<any>

export interface ElementInfo {
  tag: string
  id: string
  className: string
  text: string
  dataset: Record<string, string>
  domPath: string[]
}

export interface FrontendInstruction {
  type: string
  message?: string
  targetPage?: {
    pageType: string
    route: string
    needNavigate: boolean
  }
  actions: FrontendAction[]
  confirmationRequired?: boolean
}

export interface FrontendAction {
  type: 'navigate' | 'call' | 'fillForm' | 'click' | 'openDialog' | 'query'
  target: string
  params: Record<string, any>
}

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content?: string
  instruction?: FrontendInstruction
  confirmAction?: ConfirmAction
  debugPlan?: DebugPlan
  isStreaming?: boolean
  timestamp: number
}

export interface ConfirmAction {
  message: string
  actions: FrontendAction[]
}

export interface DebugPlan {
  intentMatch: string
  permissionCheck: string
  executionSteps: string
  expectedOutcome: string
  assumptions: string
}

export interface UserPermissionInfo {
  roles: string[]
  menuAccess: string[]
}

export interface ChatRequest {
  sessionId: string
  pageType: string
  message: string
  context?: PageRuntimeContext
  selectedElement?: ElementInfo | null
  userPermissions?: UserPermissionInfo
}

export interface FormFieldSchema {
  name: string
  label: string
  type: string
  required: boolean
  value?: any
}
