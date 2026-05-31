// ============================================================
// AI Copilot 类型定义 — 与后端 CopilotRequest 模型对齐
// ============================================================

export type CopilotStreamEventType = 'content' | 'instruction' | 'confirm_required' | 'clarification' | 'done' | 'error' | 'trace';

// ---- 页面上下文 ----

export interface PageRuntimeContext {
  route: string;
  pageType: string;
  pageKind?: string;
  pageTitle?: string;
  entityName?: string;
  /** 已 materialize 的页面状态快照 */
  state?: Record<string, any>;
  formSchema?: FormSchema;
  crudContext?: CrudContext;
  availableActions?: AvailableAction[];
  /** 页面注册的 action 处理函数（key: actionName, value: handler） */
  actions?: Record<string, ActionHandler>;
  /** @deprecated 过渡期：请求发送前由 materializePageContext() 捕获为 state，不会被序列化 */
  getState?: () => Record<string, any>;
}

export interface FormSchema {
  fields: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  label: string;
  type: string;
  required: boolean;
  readonly: boolean;
  value?: any;
  validationErrors?: string[];
  options?: FieldOption[];
}

export interface FieldOption {
  label: string;
  value: any;
}

export interface CrudContext {
  entityName: string;
  visibleColumns?: string[];
  filters?: Record<string, any>;
  selection?: Record<string, any>;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AvailableAction {
  name: string;
  description?: string;
  target?: string;
  params?: ParamInfo[];
}

export interface ParamInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

// ---- 元素信息（DOM + 语义字段） ----

export interface ElementInfo {
  // DOM 信息（兜底）
  tag: string;
  id: string;
  className: string;
  text: string;
  dataset: Record<string, string>;
  domPath: string[];
  // 语义字段信息
  fieldName?: string;
  label?: string;
  value?: any;
  required?: boolean;
  readonly?: boolean;
  validationErrors?: string[];
  options?: FieldOption[];
  fieldType?: string;
  actionName?: string;
}

// ---- 页面动作 ----

export interface PageAction {
  name: string;
  description: string;
  params?: ParamDef[];
  handler: string;
}

export interface ParamDef {
  name: string;
  type: string;
  required: boolean;
}

export type ActionHandler = (params: any) => Promise<any>;

// ---- 前端指令 ----

export interface FrontendInstruction {
  type: string;
  message?: string;
  summary?: string;
  intentName?: string;
  targetPage?: TargetPage;
  actions: FrontendAction[];
}

export interface TargetPage {
  pageType: string;
  route: string;
  needNavigate: boolean;
}

export interface FrontendAction {
  type: 'navigate' | 'call' | 'fillForm' | 'click' | 'openDialog' | 'query' | 'submitForm';
  target: string;
  route?: string;
  pageType?: string;
  actionName?: string;
  entityName?: string;
  fieldName?: string;
  dialogName?: string;
  domSelector?: string;
  label?: string;
  params: Record<string, any>;
}

// ---- 执行反馈与页面切换 ----

export interface ExecutionFeedback {
  status: string; // 'success' | 'partial' | 'failed' | 'cancelled'
  summary: string;
  cancelled: boolean;
  timestamp: number;
  results: ActionExecutionResult[];
}

export interface ActionExecutionResult {
  actionType: string;
  target: string;
  success: boolean;
  error?: string;
  data?: any;
}

export interface PageChange {
  fromPageType: string;
  fromRoute: string;
  toPageType: string;
  toRoute: string;
  timestamp: number;
}

// ---- 聊天 ----

export interface ChatRequest {
  sessionId: string;
  pageType: string;
  message: string;
  context?: PageRuntimeContext;
  selectedElement?: ElementInfo | null;
  userPermissions?: UserPermissionInfo;
  executionFeedback?: ExecutionFeedback;
  pageChange?: PageChange;
  traceEnabled?: boolean;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content?: string;
  instruction?: FrontendInstruction;
  confirmAction?: ConfirmAction;
  debugPlan?: DebugPlan;
  isStreaming?: boolean;
  timestamp: number;
}

export interface CopilotSessionSummary {
  sessionId: string;
  title?: string;
  lastMessageText?: string;
  messageCount?: number;
  pageType?: string;
  route?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ConfirmAction {
  message: string;
  actions: FrontendAction[];
}

export interface DebugPlan {
  intentMatch: string;
  permissionCheck: string;
  executionSteps: string;
  expectedOutcome: string;
  assumptions: string;
}

// ---- 权限与用量 ----

export interface UserPermissionInfo {
  /** @deprecated 角色由后端服务端计算，前端不再传入。保留字段仅为兼容，始终为空。 */
  roles?: string[];
  menuAccess: string[];
  siteId?: string;
}

export interface CopilotUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}

export interface TraceStep {
  step: string; // profile_resolve, scope_decision, intent_match, permission_check
  result: string; // 简短结果
  detail: string; // 详细信息
  passed: boolean; // 是否通过
  score?: number; // 意图匹配分数
}

// ---- 兼容旧接口（逐步废弃） ----

/** @deprecated 使用 PageRuntimeContext 替代 */
export interface FormFieldSchema {
  name: string;
  label: string;
  type: string;
  required: boolean;
  value?: any;
}
