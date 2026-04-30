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
  format?: string
  required?: boolean
  options?: PolicySchemaOption[]
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

export interface PolicySchemaOption {
  label: string
  value: any
}

export type PolicySchemaFormat =
  | 'date'
  | 'time'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'json'

export type PolicySchemaFieldType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'

export interface PolicySchemaField {
  name: string
  label: string
  path: string
  type: PolicySchemaFieldType
  description?: string
  format?: PolicySchemaFormat
  required?: boolean
  aliases?: string[]
  searchable?: boolean
  options?: PolicySchemaOption[]
  defaultValue?: any
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  fields?: PolicySchemaField[]
  item?: PolicySchemaField
}

export interface PolicySchema {
  id: string
  name: string
  description?: string
  rootLabel?: string
  fields: PolicySchemaField[]
  sampleData?: Record<string, any>
}

export interface PolicyBundleMeta {
  format: 'policy-bundle/v1'
  bundleId: string
  bundleName: string
  version: string
  schemaFormat: 'json' | 'yaml'
}

export interface PolicyBundle {
  meta: PolicyBundleMeta
  schema: PolicySchema
  document: PolicyDocument
  sampleData?: Record<string, any>
  sourceType?: 'sample' | 'markdown' | 'zip' | 'url'
}

export type PolicyLayerType = 'BASE' | 'PARTNER' | 'NODE' | 'INSTANCE' | (string & {})

export type PolicyRuleFamily =
  | 'required'
  | 'range'
  | 'eq'
  | 'ne'
  | 'in'
  | 'notIn'
  | 'betweenNot'
  | 'regex'
  | 'contains'
  | 'notContains'
  | 'containsSpecialChars'
  | 'notContainsSpecialChars'
  | 'startsWith'
  | 'notStartsWith'
  | 'endsWith'
  | 'notEndsWith'
  | 'isNull'
  | 'notNull'
  | 'isBlank'
  | 'notBlank'
  | 'default'
  | 'softLock'
  | 'locked'
  | 'readonly'
  | (string & {})

export type PolicyOperator =
  | 'required'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'eq'
  | 'ne'
  | 'in'
  | 'notIn'
  | 'between'
  | 'notBetween'
  | 'contains'
  | 'notContains'
  | 'containsSpecialChars'
  | 'notContainsSpecialChars'
  | 'startsWith'
  | 'notStartsWith'
  | 'endsWith'
  | 'notEndsWith'
  | 'isNull'
  | 'notNull'
  | 'isBlank'
  | 'notBlank'
  | 'regex'
  | 'default'
  | 'softLock'
  | 'locked'
  | 'readonly'
  | 'clear'
  | (string & {})

export type LockMode = 'HARD_LOCK' | 'SOFT_LOCK' | 'MUST_EQUAL_PREFILL'

export interface PolicyRule {
  id: string
  path: string
  operator: PolicyOperator
  enabled: boolean
  orderNo: number
  family?: PolicyRuleFamily
  value?: any
  values?: any[]
  min?: any
  max?: any
  minInclusive?: boolean
  maxInclusive?: boolean
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
  priority?: number
  sourceId?: string
}

export type ValidationSupportLevel =
  | 'frontend-supported'
  | 'partial-supported'
  | 'backend-only'

export interface ValidationSupportItem {
  ruleId: string
  layerId: string
  layerName: string
  path: string
  operator: PolicyOperator
  level: ValidationSupportLevel
  reason: string
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

export interface FieldValidationRuleItem {
  key: string
  ruleId: string
  layerId: string
  layerName: string
  layerType: PolicyLayerType
  operator: PolicyOperator
  operatorTitle: string
  operatorMeaning: string
  summary: string
  status: CompiledRuleStatus
  reason?: string
  supportLevel: ValidationSupportLevel
}

export interface FieldValidationHint {
  path: string
  rules: FieldValidationRuleItem[]
  hasServerValidation: boolean
}

export interface FieldValidationRuleItem {
  key: string
  ruleId: string
  layerId: string
  layerName: string
  layerType: PolicyLayerType
  operator: PolicyOperator
  operatorTitle: string
  operatorMeaning: string
  summary: string
  status: CompiledRuleStatus
  reason?: string
  supportLevel: ValidationSupportLevel
}

export interface FieldValidationHint {
  path: string
  rules: FieldValidationRuleItem[]
  hasServerValidation: boolean
}

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
  priority?: number
  sourceId?: string
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

export interface PolicyPreviewTreeNode {
  key: string
  type: 'group' | 'field'
  label: string
  path?: string
  aliases?: string[]
  description?: string
  meta?: string
  fieldCount: number
  finalFamilies: EffectiveFamilyView[]
  effectiveSummaries: string[]
  compiledRules: CompiledRuleView[]
  children: PolicyPreviewTreeNode[]
}
