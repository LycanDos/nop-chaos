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
  inputMappings: InputMappingItem[]
  outputDeltas: OutputDeltaItem[]
}
