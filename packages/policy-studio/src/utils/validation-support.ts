import type {
  PolicyDocument,
  PolicyRule,
  PolicySchema,
  PolicySchemaField,
  ValidationSupportItem,
  ValidationSupportLevel
} from '../types'
import { getSchemaFieldByPath } from './schema-utils'

function toComparableValue(value: any): number {
  if (typeof value === 'number')
    return value

  const numericValue = Number(value)
  if (!Number.isNaN(numericValue) && value !== '')
    return numericValue

  if (typeof value === 'string') {
    const timeMatch = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (timeMatch) {
      const hours = Number(timeMatch[1])
      const minutes = Number(timeMatch[2])
      const seconds = Number(timeMatch[3] || '0')
      return hours * 3600 + minutes * 60 + seconds
    }

    const dateValue = Date.parse(value)
    if (!Number.isNaN(dateValue))
      return dateValue
  }

  return Number.NaN
}

function supportLevelForRule(rule: PolicyRule): { level: ValidationSupportLevel; reason: string } {
  if (rule.applyWhen)
    return { level: 'partial-supported', reason: '存在 applyWhen，前端仅能做静态字段校验。' }

  if ([
    'required',
    'notNull',
    'isNull',
    'isBlank',
    'notBlank',
    'eq',
    'ne',
    'gt',
    'ge',
    'lt',
    'le',
    'between',
    'notBetween',
    'in',
    'notIn',
    'regex',
    'contains',
    'notContains',
    'containsSpecialChars',
    'notContainsSpecialChars',
    'startsWith',
    'notStartsWith',
    'endsWith',
    'notEndsWith'
  ].includes(rule.operator)) {
    return { level: 'frontend-supported', reason: '当前规则可映射为前端同步校验。' }
  }

  if (['default', 'readonly', 'softLock', 'locked'].includes(rule.operator))
    return { level: 'frontend-supported', reason: '当前规则将作为表单行为控制处理。' }

  return { level: 'backend-only', reason: '当前规则需要后端上下文或未映射为前端校验器。' }
}

export function buildValidationSupportItems(document: PolicyDocument): ValidationSupportItem[] {
  return document.layers.flatMap(layer =>
    layer.rules.map((rule) => {
      const support = supportLevelForRule(rule)
      return {
        ruleId: rule.id,
        layerId: layer.id,
        layerName: layer.name,
        path: rule.path,
        operator: rule.operator,
        level: support.level,
        reason: support.reason
      }
    })
  )
}

function addRule(target: Record<string, any[]>, path: string, rule: any) {
  const normalizedPath = normalizeFormPath(path)
  if (!normalizedPath)
    return
  if (!target[normalizedPath])
    target[normalizedPath] = []
  target[normalizedPath].push(rule)
}

function normalizeFormPath(path: string) {
  return path.replace(/\[\]/g, '')
}

function toValueList(value: any) {
  if (Array.isArray(value))
    return value.map(item => String(item))
  return [String(value ?? '')]
}

export function buildElementFormRules(schema: PolicySchema, document: PolicyDocument) {
  const result: Record<string, any[]> = {}

  for (const fieldPath of collectLeafPaths(schema.fields)) {
    const field = getSchemaFieldByPath(schema, fieldPath)
    if (!field)
      continue

    if (field.required)
      addRule(result, field.path, { required: true, message: `${field.label}不能为空`, trigger: ['blur', 'change'] })

    if (field.minLength !== undefined || field.maxLength !== undefined) {
      addRule(result, field.path, {
        min: field.minLength,
        max: field.maxLength,
        message: `${field.label}长度不符合要求`,
        trigger: ['blur', 'change']
      })
    }

    if (field.pattern) {
      addRule(result, field.path, {
        pattern: new RegExp(field.pattern),
        message: `${field.label}格式不正确`,
        trigger: ['blur', 'change']
      })
    }
  }

  for (const layer of document.layers) {
    for (const rule of layer.rules.filter(item => item.enabled)) {
      if (rule.applyWhen)
        continue

      switch (rule.operator) {
        case 'required':
          addRule(result, rule.path, { required: true, message: `${rule.path}不能为空`, trigger: ['blur', 'change'] })
          break
        case 'notNull':
          addRule(result, rule.path, {
            validator: (_: any, value: any, callback: (error?: Error) => void) => {
              if (value === null || value === undefined)
                return callback(new Error('值不能为空'))
              callback()
            },
            trigger: ['blur', 'change']
          })
          break
        case 'isNull':
          addRule(result, rule.path, {
            validator: (_: any, value: any, callback: (error?: Error) => void) => {
              if (value !== null && value !== undefined)
                return callback(new Error('值必须为空'))
              callback()
            },
            trigger: ['blur', 'change']
          })
          break
        case 'isBlank':
        case 'notBlank':
          addRule(result, rule.path, {
            validator: (_: any, value: any, callback: (error?: Error) => void) => {
              const stringValue = value == null ? '' : String(value)
              const isBlankValue = stringValue.trim().length === 0
              if (rule.operator === 'isBlank' && !isBlankValue)
                return callback(new Error('必须为空字符串'))
              if (rule.operator === 'notBlank' && isBlankValue)
                return callback(new Error('不能为空字符串'))
              callback()
            },
            trigger: ['blur', 'change']
          })
          break
        case 'regex':
          if (rule.pattern) {
            addRule(result, rule.path, {
              pattern: new RegExp(rule.pattern),
              message: `${rule.path}格式不匹配`,
              trigger: ['blur', 'change']
            })
          }
          break
        case 'gt':
        case 'ge':
        case 'lt':
        case 'le':
        case 'between':
        case 'notBetween':
          addRule(result, rule.path, {
            validator: (_: any, value: any, callback: (error?: Error) => void) => {
              if (value === undefined || value === null || value === '')
                return callback()

              const numericValue = toComparableValue(value)
              if (Number.isNaN(numericValue))
                return callback()

              if (rule.operator === 'gt' && !(numericValue > toComparableValue(rule.value)))
                return callback(new Error(`必须大于 ${rule.value}`))
              if (rule.operator === 'ge' && !(numericValue >= toComparableValue(rule.value)))
                return callback(new Error(`必须大于等于 ${rule.value}`))
              if (rule.operator === 'lt' && !(numericValue < toComparableValue(rule.value)))
                return callback(new Error(`必须小于 ${rule.value}`))
              if (rule.operator === 'le' && !(numericValue <= toComparableValue(rule.value)))
                return callback(new Error(`必须小于等于 ${rule.value}`))
              if (rule.operator === 'between') {
                const minValue = toComparableValue(rule.min)
                const maxValue = toComparableValue(rule.max)
                const minPass = rule.minInclusive === false ? numericValue > minValue : numericValue >= minValue
                const maxPass = rule.maxInclusive === false ? numericValue < maxValue : numericValue <= maxValue
                if (!minPass || !maxPass) {
                  const left = rule.minInclusive === false ? '(' : '['
                  const right = rule.maxInclusive === false ? ')' : ']'
                  return callback(new Error(`必须位于 ${left}${rule.min}, ${rule.max}${right}`))
                }
              }
              if (rule.operator === 'notBetween') {
                const minValue = toComparableValue(rule.min)
                const maxValue = toComparableValue(rule.max)
                const inMin = rule.minInclusive === false ? numericValue > minValue : numericValue >= minValue
                const inMax = rule.maxInclusive === false ? numericValue < maxValue : numericValue <= maxValue
                if (inMin && inMax) {
                  const left = rule.minInclusive === false ? '(' : '['
                  const right = rule.maxInclusive === false ? ')' : ']'
                  return callback(new Error(`不能位于 ${left}${rule.min}, ${rule.max}${right}`))
                }
              }
              callback()
            },
            trigger: ['blur', 'change']
          })
          break
        case 'contains':
        case 'notContains':
        case 'containsSpecialChars':
        case 'notContainsSpecialChars':
        case 'startsWith':
        case 'notStartsWith':
        case 'endsWith':
        case 'notEndsWith':
        case 'eq':
        case 'ne':
          addRule(result, rule.path, {
            validator: (_: any, value: any, callback: (error?: Error) => void) => {
              const stringValue = value == null ? '' : String(value)
              const expected = String(rule.value ?? '')
              const hasSpecialChars = /[\p{P}\p{S}]/u.test(stringValue)

              if (rule.operator === 'contains' && !stringValue.includes(expected))
                return callback(new Error(`必须包含 ${expected}`))
              if (rule.operator === 'notContains' && stringValue.includes(expected))
                return callback(new Error(`不能包含 ${expected}`))
              if (rule.operator === 'containsSpecialChars' && !hasSpecialChars)
                return callback(new Error('必须包含特殊符号'))
              if (rule.operator === 'notContainsSpecialChars' && hasSpecialChars)
                return callback(new Error('不能包含特殊符号'))
              if (rule.operator === 'startsWith' && !stringValue.startsWith(expected))
                return callback(new Error(`必须以 ${expected} 开头`))
              if (rule.operator === 'notStartsWith' && stringValue.startsWith(expected))
                return callback(new Error(`不能以 ${expected} 开头`))
              if (rule.operator === 'endsWith' && !stringValue.endsWith(expected))
                return callback(new Error(`必须以 ${expected} 结尾`))
              if (rule.operator === 'notEndsWith' && stringValue.endsWith(expected))
                return callback(new Error(`不能以 ${expected} 结尾`))
              if (rule.operator === 'eq' && stringValue !== expected)
                return callback(new Error(`必须等于 ${expected}`))
              if (rule.operator === 'ne' && stringValue === expected)
                return callback(new Error(`不能等于 ${expected}`))
              callback()
            },
            trigger: ['blur', 'change']
          })
          break
        case 'in':
        case 'notIn':
          addRule(result, rule.path, {
            validator: (_: any, value: any, callback: (error?: Error) => void) => {
              const values = (rule.values || []).map(item => String(item))
              const currentValues = toValueList(value)
              if (rule.operator === 'in' && currentValues.some(item => !values.includes(item)))
                return callback(new Error(`必须在集合 ${values.join(', ')}`))
              if (rule.operator === 'notIn' && currentValues.some(item => values.includes(item)))
                return callback(new Error(`不能在集合 ${values.join(', ')}`))
              callback()
            },
            trigger: ['blur', 'change']
          })
          break
      }
    }
  }

  return result
}

function collectLeafPaths(fields: PolicySchemaField[], paths: string[] = []) {
  for (const field of fields) {
    if (field.type === 'object') {
      collectLeafPaths(field.fields || [], paths)
      continue
    }
    if (field.type === 'array') {
      if (field.item?.type === 'object')
        collectLeafPaths(field.item.fields || [], paths)
      else
        paths.push(`${field.path}[]`)
      continue
    }
    paths.push(field.path)
  }
  return paths
}
