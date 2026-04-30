import type { PolicyOperator, PolicySchemaField } from '../types'

export interface OperatorOptionMeta {
  value: PolicyOperator
  title: string
  code: string
  meaning: string
  group: OperatorGroupKey
  recommendedFor: Array<FieldOperatorKind | 'all'>
}

export type OperatorGroupKey =
  | 'base'
  | 'numeric'
  | 'range'
  | 'string'
  | 'set'
  | 'form'

export type FieldOperatorKind =
  | 'number'
  | 'string'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'enum'

export interface OperatorGroupDefinition {
  key: OperatorGroupKey
  label: string
}

export interface OperatorColumn {
  title: string
  groups: Array<{
    key: OperatorGroupKey
    label: string
    options: OperatorOptionMeta[]
  }>
}

export interface OperatorGroupPanel {
  key: OperatorGroupKey
  label: string
  options: OperatorOptionMeta[]
  recommended: boolean
}

const groupDefinitions: Record<OperatorGroupKey, OperatorGroupDefinition> = {
  base: { key: 'base', label: '基础判断' },
  numeric: { key: 'numeric', label: '数值比较' },
  range: { key: 'range', label: '区间判断' },
  string: { key: 'string', label: '字符串匹配' },
  set: { key: 'set', label: '集合判断' },
  form: { key: 'form', label: '表单行为' }
}

const operatorCatalog: OperatorOptionMeta[] = [
  { value: 'eq', title: '=', code: 'eq', meaning: '等于', group: 'base', recommendedFor: ['all'] },
  { value: 'ne', title: '!=', code: 'ne', meaning: '不等于', group: 'base', recommendedFor: ['all'] },

  { value: 'gt', title: '>', code: 'gt', meaning: '大于', group: 'numeric', recommendedFor: ['number', 'date', 'time', 'datetime'] },
  { value: 'ge', title: '>=', code: 'ge', meaning: '大于等于', group: 'numeric', recommendedFor: ['number', 'date', 'time', 'datetime'] },
  { value: 'lt', title: '<', code: 'lt', meaning: '小于', group: 'numeric', recommendedFor: ['number', 'date', 'time', 'datetime'] },
  { value: 'le', title: '<=', code: 'le', meaning: '小于等于', group: 'numeric', recommendedFor: ['number', 'date', 'time', 'datetime'] },

  { value: 'between', title: '区间内', code: 'between', meaning: '在区间内', group: 'range', recommendedFor: ['number', 'date', 'time', 'datetime'] },
  { value: 'notBetween', title: '不在区间内', code: 'notBetween', meaning: '不在区间内', group: 'range', recommendedFor: ['number', 'date', 'time', 'datetime'] },

  { value: 'contains', title: '包含', code: 'contains', meaning: '包含指定文本', group: 'string', recommendedFor: ['string'] },
  { value: 'notContains', title: '不包含', code: 'notContains', meaning: '不包含指定文本', group: 'string', recommendedFor: ['string'] },
  { value: 'containsSpecialChars', title: '包含特殊符号', code: 'containsSpecialChars', meaning: '包含常见特殊符号', group: 'string', recommendedFor: ['string'] },
  { value: 'notContainsSpecialChars', title: '不包含特殊符号', code: 'notContainsSpecialChars', meaning: '不包含常见特殊符号', group: 'string', recommendedFor: ['string'] },
  { value: 'startsWith', title: '以...开头', code: 'startsWith', meaning: '以指定文本开头', group: 'string', recommendedFor: ['string'] },
  { value: 'notStartsWith', title: '不以...开头', code: 'notStartsWith', meaning: '不以指定文本开头', group: 'string', recommendedFor: ['string'] },
  { value: 'endsWith', title: '以...结尾', code: 'endsWith', meaning: '以指定文本结尾', group: 'string', recommendedFor: ['string'] },
  { value: 'notEndsWith', title: '不以...结尾', code: 'notEndsWith', meaning: '不以指定文本结尾', group: 'string', recommendedFor: ['string'] },
  { value: 'regex', title: '正则匹配', code: 'regex', meaning: '匹配正则表达式', group: 'string', recommendedFor: ['string'] },

  { value: 'in', title: '在集合中', code: 'in', meaning: '值在集合内', group: 'set', recommendedFor: ['number', 'string', 'enum', 'date', 'time', 'datetime'] },
  { value: 'notIn', title: '不在集合中', code: 'notIn', meaning: '值不在集合内', group: 'set', recommendedFor: ['number', 'string', 'enum', 'date', 'time', 'datetime'] },

  { value: 'isNull', title: '为空', code: 'isNull', meaning: '值为 null 或未提供', group: 'base', recommendedFor: ['all'] },
  { value: 'notNull', title: '非空值', code: 'notNull', meaning: '值不为 null 且已提供', group: 'base', recommendedFor: ['all'] },
  { value: 'isBlank', title: '空字符串', code: 'isBlank', meaning: '字符串为空或仅包含空白字符', group: 'string', recommendedFor: ['string'] },
  { value: 'notBlank', title: '非空字符串', code: 'notBlank', meaning: '字符串不能为空且不能全为空白字符', group: 'string', recommendedFor: ['string'] },

  { value: 'required', title: '必填', code: 'required', meaning: '字段必须填写', group: 'form', recommendedFor: ['all'] },
  { value: 'default', title: '默认值', code: 'default', meaning: '设置默认值', group: 'form', recommendedFor: ['all'] },
  { value: 'readonly', title: '只读', code: 'readonly', meaning: '字段只读', group: 'form', recommendedFor: ['all'] },
  { value: 'softLock', title: '上锁', code: 'softLock', meaning: '字段锁定为指定值，允许申请解锁', group: 'form', recommendedFor: ['all'] },
  { value: 'locked', title: '锁定', code: 'locked', meaning: '字段锁定为指定值，不允许申请解锁', group: 'form', recommendedFor: ['all'] }
]

const preferredOrderByKind: Record<FieldOperatorKind | 'unknown', OperatorGroupKey[]> = {
  number: ['base', 'numeric', 'range', 'set', 'form'],
  string: ['base', 'string', 'set', 'form'],
  date: ['base', 'numeric', 'range', 'form'],
  time: ['base', 'numeric', 'range', 'form'],
  datetime: ['base', 'numeric', 'range', 'form'],
  boolean: ['base', 'form'],
  enum: ['base', 'set', 'form'],
  unknown: ['base', 'set', 'form']
}

export function detectFieldOperatorKind(field?: PolicySchemaField): FieldOperatorKind | 'unknown' {
  if (!field)
    return 'unknown'

  if (field.options?.length)
    return 'enum'

  if (field.format === 'date')
    return 'date'
  if (field.format === 'time')
    return 'time'
  if (field.format === 'datetime')
    return 'datetime'

  if (field.type === 'number' || field.type === 'integer')
    return 'number'
  if (field.type === 'boolean')
    return 'boolean'
  return 'string'
}

export function isOperatorCompatible(operator: PolicyOperator, field?: PolicySchemaField): boolean {
  const kind = detectFieldOperatorKind(field)
  const item = operatorCatalog.find(candidate => candidate.value === operator)
  if (!item)
    return true
  if (item.recommendedFor.includes('all'))
    return true
  return item.recommendedFor.includes(kind as FieldOperatorKind)
}

function makeGrouped(groups: OperatorGroupKey[], options: OperatorOptionMeta[]) {
  return groups
    .map((groupKey) => {
      const groupedOptions = options.filter(option => option.group === groupKey)
      if (!groupedOptions.length)
        return null
      return {
        key: groupKey,
        label: groupDefinitions[groupKey].label,
        options: groupedOptions
      }
    })
    .filter(Boolean) as OperatorColumn['groups']
}

export function getOperatorColumns(field?: PolicySchemaField): {
  recommended: OperatorColumn
  secondary: OperatorColumn
} {
  const kind = detectFieldOperatorKind(field)
  const preferredGroups = preferredOrderByKind[kind]
  const recommendedOptions = operatorCatalog.filter((option) => {
    if (option.recommendedFor.includes('all'))
      return true
    return option.recommendedFor.includes(kind as FieldOperatorKind)
  })

  const secondaryOptions = operatorCatalog.filter(option => !recommendedOptions.includes(option))
  const secondaryGroupOrder = Object.keys(groupDefinitions) as OperatorGroupKey[]

  return {
    recommended: {
      title: field ? '当前类型优先' : '推荐操作符',
      groups: makeGrouped(preferredGroups, recommendedOptions)
    },
    secondary: {
      title: '其他操作符',
      groups: makeGrouped(secondaryGroupOrder, secondaryOptions)
    }
  }
}

export function getOperatorGroups(field?: PolicySchemaField): OperatorGroupPanel[] {
  const kind = detectFieldOperatorKind(field)
  const preferredGroups = preferredOrderByKind[kind]
  const recommendedOptions = operatorCatalog.filter((option) => {
    if (option.recommendedFor.includes('all'))
      return true
    return option.recommendedFor.includes(kind as FieldOperatorKind)
  })

  const secondaryOptions = operatorCatalog.filter(option => !recommendedOptions.includes(option))
  const secondaryGroupOrder = Object.keys(groupDefinitions) as OperatorGroupKey[]

  return [
    ...makeGrouped(preferredGroups, recommendedOptions).map(group => ({
      ...group,
      recommended: true
    })),
    ...makeGrouped(secondaryGroupOrder, secondaryOptions).map(group => ({
      ...group,
      recommended: false
    }))
  ]
}

export function getOperatorMeta(operator?: PolicyOperator): OperatorOptionMeta | undefined {
  if (!operator)
    return undefined
  return operatorCatalog.find(item => item.value === operator)
}
