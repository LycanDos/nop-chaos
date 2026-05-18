/**
 * 执行器绑定相关类型定义
 * 对应 LProcessConsole-main-v2 中的执行器、版本、方法等概念
 */

/** 执行器定义 */
export interface ExecutorDefItem {
  executorDefId: string
  executorCode: string
  executorName: string
  language?: string
  status?: string
  description?: string
  currentReleaseId?: string
}

/** 执行器发布版本 */
export interface ExecutorReleaseItem {
  executorReleaseId: string
  executorDefId: string
  releaseVersion: string
  mainClass?: string
  entryType?: string
  compatLevel?: string
  parseStatus?: string
}

/** 执行器方法 */
export interface ExecutorMethodItem {
  methodId: string
  executorReleaseId: string
  methodCode: string
  methodName: string
  methodSignature?: string
  returnJavaType?: string
  invokeMode?: string
  idempotentFlag?: boolean
  description?: string
  rollbackType?: string
  methodVersion?: string
  versionStatus?: string
  compensationMethodId?: string
  inputs?: MethodSchemaFieldItem[]
  outputs?: MethodSchemaFieldItem[]
}

/** 方法 Schema 字段 */
export interface MethodSchemaFieldItem {
  fieldId: string
  methodId: string
  schemaRole: 'INPUT' | 'OUTPUT'
  fieldPath: string
  fieldName: string
  dataType: string
  javaType?: string
  required?: boolean
  defaultValue?: string
  defaultExpr?: string
  description?: string
  /** 自定义编辑器类型，如 'hoppscotch-editor' */
  uiWidget?: string
  /** 自定义编辑器 HTML 路径（插件静态资源） */
  editorUrl?: string
}

/** 版本策略类型 */
export type VersionStrategy = 'LATEST' | 'EXACT' | 'RANGE' | 'SEMVER'

/** 入参映射项 */
export interface InputMappingItem {
  /** 来源：流程变量名或表达式 */
  source: string
  /** 目标：执行器方法入参字段路径 */
  target: string
  /** 映射表达式（可选，用于复杂转换） */
  expression?: string
  /** 来源类型：variable=流程变量, literal=字面量, expression=表达式 */
  sourceType: 'variable' | 'literal' | 'expression'
}

/** 出参 Delta 映射项 */
export interface OutputDeltaItem {
  /** 来源：执行器方法出参字段路径 */
  source: string
  /** 目标：流程变量名 */
  target: string
  /** 映射表达式（可选，用于复杂转换） */
  expression?: string
  /** 合并策略：overwrite=覆盖, merge=合并, append=追加 */
  mergeStrategy: 'overwrite' | 'merge' | 'append'
}

/** 失败策略 */
export type FailureStrategy = 'FAIL' | 'SKIP' | 'RETRY' | 'FALLBACK'

// ==================== 入参 Clar 相关类型 ====================

/** Delta 表达式类型 */
export type DeltaExpression =
  | { $jina: string }  // JSONata 表达式
  | { $jmes: string }  // JMESPath 表达式
  | { $java: string }  // Java 方法调用

/** 值类型：字面量或 Delta 表达式 */
export type ClarValue = string | number | boolean | null | DeltaExpression

/** 条件节点类型 */
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith' | 'isNull' | 'notNull' | 'isBlank' | 'notBlank'

/** 条件节点 */
export interface ConditionNode {
  id: string
  type: 'simple' | 'and' | 'or'
  operator?: ConditionOperator
  field?: string
  value?: any
  children?: ConditionNode[]
}

/** 校验规则操作符 */
export type PolicyOperator =
  | 'required'
  | 'gt' | 'ge' | 'lt' | 'le'
  | 'eq' | 'ne'
  | 'in' | 'notIn'
  | 'between' | 'notBetween'
  | 'contains' | 'notContains'
  | 'startsWith' | 'notStartsWith'
  | 'endsWith' | 'notEndsWith'
  | 'isNull' | 'notNull'
  | 'isBlank' | 'notBlank'
  | 'regex'
  | 'default'
  | 'softLock' | 'locked' | 'readonly'

/** 锁定模式 */
export type LockMode = 'HARD_LOCK' | 'SOFT_LOCK' | 'MUST_EQUAL_PREFILL'

/** 校验规则 */
export interface PolicyRule {
  id: string
  path: string
  operator: PolicyOperator
  enabled: boolean
  orderNo: number
  value?: ClarValue
  values?: ClarValue[]
  min?: ClarValue
  max?: ClarValue
  minInclusive?: boolean
  maxInclusive?: boolean
  pattern?: string
  defaultValue?: ClarValue
  lockedValue?: ClarValue
  lockMode?: LockMode
  applyWhen?: ConditionNode
  errorCode?: string
  errorDescription?: string
  severity?: number
  note?: string
  priority?: number
}

/** 校验层类型 */
export type PolicyLayerType = 'BASE' | 'PLATFORM' | 'EXECUTOR_CONFIG' | 'PROCESS_DESIGN' | 'INSTANCE' | string

/** 校验层 */
export interface PolicyLayer {
  id: string
  name: string
  layerType: PolicyLayerType
  orderNo: number
  editable: boolean
  description?: string
  rules: PolicyRule[]
}

/** 入参 Clar 文档 */
export interface InputPolicyDocument {
  id: string
  name: string
  targetSchema?: string
  description?: string
  version?: string
  layers: PolicyLayer[]
}

/** 变量项 */
export interface VariableItem {
  name: string
  path: string
  type: string
  source: 'input' | 'output' | 'context' | 'system' | 'config' | 'field'
  description?: string
}

/** 
 * 变量来源
 * 
 * 变量来源分类:
 * - system: 系统注入变量 (currentUserId, tenantId, now 等)
 * - context: 变量池 (流程中前序节点写入的变量)
 * - field: 当前入参字段 (用于字段间引用)
 */
export interface AvailableVariables {
  /** 系统注入变量 (运行时自动注入) */
  system: VariableItem[]
  /** 变量池变量 (流程中前序节点写入) */
  context: VariableItem[]
  /** 当前入参字段 (用于字段间引用) */
  field: VariableItem[]
}

/** 执行器绑定配置（保存到 BPMN XML 扩展元素中） */
export interface ExecutorBindingConfig {
  executorDefId: string
  executorCode: string
  executorName: string
  executorReleaseId: string
  releaseVersion: string
  versionStrategy: VersionStrategy
  versionExpr: string
  methodId: string
  methodCode: string
  methodName: string
  timeoutMs: number
  retryCount: number
  retryIntervalMs: number
  asyncFlag: boolean
  failureStrategy: FailureStrategy
  /** 执行器配置 JSON（插件专属配置，如 Hoppscotch 的 method/url/headers） */
  executorConfigJson?: string
  /**
   * @deprecated 使用 inputPolicyDocument 替代
   */
  inputMappings: InputMappingItem[]
  /** 入参 Clar 文档 */
  inputPolicyDocument?: InputPolicyDocument
  outputDeltas: OutputDeltaItem[]
}
