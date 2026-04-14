export interface FieldMapping {
  entities: Map<string, EntityFieldMap>
  globalFields: Map<string, FieldInfo>
  pathAliases: Map<string, string[]>
}

export interface EntityFieldMap {
  entityName: string
  displayName: string
  fields: Map<string, FieldInfo>
  relations: Map<string, RelationInfo>
}

export interface FieldInfo {
  name: string
  displayName: string
  type: string
  path: string
  aliases: string[]
  searchable: boolean
}

export interface RelationInfo {
  name: string
  displayName: string
  type: 'to-one' | 'to-many' | 'many-to-many'
  targetEntity: string
  path: string
}

export interface FieldSuggestion {
  value: string
  label: string
  path: string
  type: string
  description?: string
  icon?: string
  category?: string
}

export interface MatchResult {
  field: FieldInfo
  score: number
  matchedParts: string[]
}

export interface HintContext {
  currentPath: string
  fieldType?: string
  availableFields: FieldInfo[]
  recentFields: FieldInfo[]
  popularFields: FieldInfo[]
}

export interface HintConfig {
  enabled: boolean
  showDescriptions: boolean
  showChineseNames: boolean
  showPathPreview: boolean
  autoComplete: boolean
  fuzzySearch: boolean
}

export type ConditionType =
  | 'simple'
  | 'and'
  | 'or'
  | 'not'
  | 'if'
  | 'elif'
  | 'else'
  | 'expr'

export type OperatorType =
  | 'lt' | 'le' | 'eq' | 'ge' | 'gt' | 'ne'
  | 'isNull' | 'notNull' | 'isEmpty' | 'notEmpty' | 'isBlank' | 'notBlank'
  | 'startsWith' | 'endsWith' | 'contains' | 'regex'
  | 'lengthBetween' | 'utf8LengthBetween' | 'length' | 'utf8Length'
  | 'between' | 'dateBetween' | 'yearBetween' | 'timeBetween' | 'dateTimeBetween'
  | 'in' | 'notIn'
  | 'isTrue' | 'notTrue' | 'isFalse' | 'notFalse'
  | 'expr' | 'sql'

export interface ConditionNode {
  id: string
  type: ConditionType
  operator?: OperatorType
  field?: string
  value?: any
  min?: any
  max?: any
  pattern?: string
  test?: string
  conditions?: ConditionNode[]
  then?: ConditionNode
  else?: ConditionNode
  errorCode?: string
  errorDescription?: string
  severity?: number
}

export type PolicyLayerType = 'BASE' | 'PARTNER' | 'NODE' | 'INSTANCE'

export type PolicyRuleFamily =
  | 'required'
  | 'range'
  | 'exact'
  | 'set'
  | 'regex'
  | 'contains'
  | 'default'
  | 'locked'
  | 'readonly'

export type PolicyOperator =
  | 'required'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'eq'
  | 'in'
  | 'between'
  | 'contains'
  | 'regex'
  | 'default'
  | 'locked'
  | 'readonly'
  | 'clear'

export type LockMode = 'LOCKED' | 'MUST_EQUAL_PREFILL'

export interface PolicyRule {
  id: string
  path: string
  operator: PolicyOperator
  enabled: boolean
  orderNo: number
  family?: PolicyRuleFamily
  value?: any
  values?: any[]
  min?: number
  max?: number
  pattern?: string
  defaultValue?: any
  lockedValue?: any
  lockMode?: LockMode
  targetFamily?: string
  applyWhen?: ConditionNode
  errorCode?: string
  errorDescription?: string
  severity?: number
  note?: string
}

export interface PolicyLayer {
  id: string
  name: string
  layerType: PolicyLayerType
  orderNo: number
  editable: boolean
  description?: string
  rules: PolicyRule[]
}

export interface PolicyDocument {
  id: string
  name: string
  targetSchema?: string
  description?: string
  version?: string
  layers: PolicyLayer[]
}

export type CompiledRuleStatus =
  | 'effective'
  | 'overridden'
  | 'rejected'
  | 'cleared'

export interface CompiledRuleView {
  ruleId: string
  layerId: string
  layerType: PolicyLayerType
  path: string
  operator: PolicyOperator
  family?: PolicyRuleFamily
  summary: string
  status: CompiledRuleStatus
  reason?: string
}

export interface EffectiveFamilyView {
  family: PolicyRuleFamily
  layerId: string
  layerType: PolicyLayerType
  ruleId: string
  summary: string
}

export interface EffectivePathView {
  path: string
  compiledRules: CompiledRuleView[]
  finalFamilies: EffectiveFamilyView[]
  effectiveSummaries: string[]
}

export interface PolicyCompileResult {
  paths: EffectivePathView[]
}
