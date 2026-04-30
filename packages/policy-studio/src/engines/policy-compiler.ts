import type {
  CompiledRuleStatus,
  CompiledRuleView,
  EffectivePathView,
  EffectiveFamilyView,
  PolicyCompileResult,
  PolicyDocument,
  PolicyLayer,
  PolicyRuleFamily,
  PolicyOperator,
  PolicyRule
} from '../types'

type FamilyKey =
  PolicyRuleFamily

interface FamilyState {
  rule: PolicyRule
  compiledRule: CompiledRuleView
  summary: string
  range?: RangeConstraint
  values?: any[]
}

interface RangeBoundary {
  value: number
  inclusive: boolean
  display: any
}

interface RangeConstraint {
  lower?: RangeBoundary
  upper?: RangeBoundary
}

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

const familyOrder: FamilyKey[] = [
  'required',
  'range',
  'eq',
  'ne',
  'in',
  'notIn',
  'betweenNot',
  'regex',
  'contains',
  'notContains',
  'containsSpecialChars',
  'notContainsSpecialChars',
  'startsWith',
  'notStartsWith',
  'endsWith',
  'notEndsWith',
  'isNull',
  'notNull',
  'isBlank',
  'notBlank',
  'default',
  'softLock',
  'locked',
  'readonly'
]

function familyForOperator(operator: PolicyOperator): FamilyKey | null {
  if (operator === 'required')
    return 'required'
  if (operator === 'gt' || operator === 'ge' || operator === 'lt' || operator === 'le' || operator === 'between')
    return 'range'
  if (operator === 'eq')
    return 'eq'
  if (operator === 'ne')
    return 'ne'
  if (operator === 'in')
    return 'in'
  if (operator === 'notIn')
    return 'notIn'
  if (operator === 'notBetween')
    return 'betweenNot'
  if (operator === 'regex')
    return 'regex'
  if (operator === 'contains')
    return 'contains'
  if (operator === 'notContains')
    return 'notContains'
  if (operator === 'containsSpecialChars')
    return 'containsSpecialChars'
  if (operator === 'notContainsSpecialChars')
    return 'notContainsSpecialChars'
  if (operator === 'startsWith')
    return 'startsWith'
  if (operator === 'notStartsWith')
    return 'notStartsWith'
  if (operator === 'endsWith')
    return 'endsWith'
  if (operator === 'notEndsWith')
    return 'notEndsWith'
  if (operator === 'isNull')
    return 'isNull'
  if (operator === 'notNull')
    return 'notNull'
  if (operator === 'isBlank')
    return 'isBlank'
  if (operator === 'notBlank')
    return 'notBlank'
  if (operator === 'default')
    return 'default'
  if (operator === 'locked')
    return 'locked'
  if (operator === 'softLock')
    return 'softLock'
  if (operator === 'readonly')
    return 'readonly'
  return `operator:${operator}`
}

function familyOfRule(rule: PolicyRule): FamilyKey | null {
  return rule.family || familyForOperator(rule.operator)
}

function summarize(rule: PolicyRule): string {
  switch (rule.operator) {
    case 'required':
      return '必填'
    case 'gt':
      return `>${rule.value}`
    case 'ge':
      return `>=${rule.value}`
    case 'lt':
      return `<${rule.value}`
    case 'le':
      return `<=${rule.value}`
    case 'eq':
      return `=${rule.value}`
    case 'ne':
      return `!=${rule.value}`
    case 'in':
      return `in [${(rule.values || []).join(', ')}]`
    case 'notIn':
      return `not in [${(rule.values || []).join(', ')}]`
    case 'between':
      return `${rule.minInclusive === false ? '(' : '['}${rule.min}, ${rule.max}${rule.maxInclusive === false ? ')' : ']'}`
    case 'notBetween':
      return `not between ${rule.minInclusive === false ? '(' : '['}${rule.min}, ${rule.max}${rule.maxInclusive === false ? ')' : ']'}`
    case 'contains':
      return `包含 ${rule.value}`
    case 'notContains':
      return `不包含 ${rule.value}`
    case 'containsSpecialChars':
      return '包含常见特殊符号'
    case 'notContainsSpecialChars':
      return '不包含常见特殊符号'
    case 'startsWith':
      return `以 ${rule.value} 开头`
    case 'notStartsWith':
      return `不以 ${rule.value} 开头`
    case 'endsWith':
      return `以 ${rule.value} 结尾`
    case 'notEndsWith':
      return `不以 ${rule.value} 结尾`
    case 'isNull':
      return '为空'
    case 'notNull':
      return '非空值'
    case 'isBlank':
      return '空字符串'
    case 'notBlank':
      return '非空字符串'
    case 'regex':
      return `regex ${rule.pattern}`
    case 'default':
      return `默认值 ${rule.defaultValue}`
    case 'locked':
      return `锁定值 ${rule.lockedValue} (不可解锁)`
    case 'softLock':
      return `上锁值 ${rule.lockedValue} (可申请解锁)`
    case 'readonly':
      return '只读'
    case 'clear':
      return `清除 ${rule.targetFamily || '当前层覆盖'}`
    default:
      return rule.operator
  }
}

function buildCompiledRule(
  layer: PolicyLayer,
  rule: PolicyRule,
  status: CompiledRuleStatus,
  reason?: string,
  family?: PolicyRuleFamily
): CompiledRuleView {
  return {
    ruleId: rule.id,
    layerId: layer.id,
    layerType: layer.layerType,
    path: rule.path,
    operator: rule.operator,
    family,
    summary: summarize(rule),
    status,
    reason,
    priority: rule.priority,
    sourceId: rule.sourceId
  }
}

function toRangeConstraint(rule: PolicyRule): RangeConstraint | null {
  if (rule.operator === 'gt' || rule.operator === 'ge') {
    return {
      lower: {
        value: toComparableValue(rule.value),
        inclusive: rule.operator === 'ge',
        display: rule.value
      }
    }
  }

  if (rule.operator === 'lt' || rule.operator === 'le') {
    return {
      upper: {
        value: toComparableValue(rule.value),
        inclusive: rule.operator === 'le',
        display: rule.value
      }
    }
  }

  if (rule.operator === 'between') {
    return {
      lower: rule.min === undefined
        ? undefined
        : { value: toComparableValue(rule.min), inclusive: rule.minInclusive !== false, display: rule.min },
      upper: rule.max === undefined
        ? undefined
        : { value: toComparableValue(rule.max), inclusive: rule.maxInclusive !== false, display: rule.max }
    }
  }

  return null
}

function toExcludedRangeConstraint(rule: PolicyRule): RangeConstraint | null {
  if (rule.operator !== 'notBetween')
    return null

  return {
    lower: rule.min === undefined
      ? undefined
      : { value: toComparableValue(rule.min), inclusive: rule.minInclusive !== false, display: rule.min },
    upper: rule.max === undefined
      ? undefined
      : { value: toComparableValue(rule.max), inclusive: rule.maxInclusive !== false, display: rule.max }
  }
}

function stringifyValue(value: any) {
  return value == null ? '' : String(value)
}

function uniqueValues(values?: any[]) {
  const result: any[] = []
  const seen = new Set<string>()
  for (const value of values || []) {
    const key = stringifyValue(value)
    if (seen.has(key))
      continue
    seen.add(key)
    result.push(value)
  }
  return result
}

function valuesContainAll(container: any[], subset: any[]) {
  const containerKeys = new Set(container.map(item => stringifyValue(item)))
  return subset.every(item => containerKeys.has(stringifyValue(item)))
}

function isSameValue(left: any, right: any) {
  return stringifyValue(left) === stringifyValue(right)
}

function canOverrideStringConstraint(existing: PolicyRule, candidate: PolicyRule): boolean {
  const existingValue = stringifyValue(existing.value)
  const candidateValue = stringifyValue(candidate.value)

  switch (candidate.operator) {
    case 'contains':
      return candidateValue.includes(existingValue)
    case 'notContains':
      return existingValue.includes(candidateValue)
    case 'startsWith':
      return candidateValue.startsWith(existingValue)
    case 'notStartsWith':
      return existingValue.startsWith(candidateValue)
    case 'endsWith':
      return candidateValue.endsWith(existingValue)
    case 'notEndsWith':
      return existingValue.endsWith(candidateValue)
    default:
      return false
  }
}

function isRangeValueWithinBoundary(value: number, boundary: RangeBoundary, side: 'lower' | 'upper') {
  if (side === 'lower')
    return boundary.inclusive ? value >= boundary.value : value > boundary.value
  return boundary.inclusive ? value <= boundary.value : value < boundary.value
}

function isComparableValueWithinRange(value: any, range: RangeConstraint) {
  const comparableValue = toComparableValue(value)
  if (Number.isNaN(comparableValue))
    return false
  if (range.lower && !isRangeValueWithinBoundary(comparableValue, range.lower, 'lower'))
    return false
  if (range.upper && !isRangeValueWithinBoundary(comparableValue, range.upper, 'upper'))
    return false
  return true
}

function isRangeContainedInRange(candidate: RangeConstraint, current: RangeConstraint) {
  if (current.lower && !candidate.lower)
    return false
  if (current.upper && !candidate.upper)
    return false
  if (current.lower && candidate.lower && isLowerLooser(candidate.lower, current.lower))
    return false
  if (current.upper && candidate.upper && isUpperLooser(candidate.upper, current.upper))
    return false
  return true
}

function hasRangeIntersection(left: RangeConstraint, right: RangeConstraint) {
  const merged = mergeRange(left, right)
  return !isEmptyRange(merged)
}

function getFiniteAllowedValues(rule: PolicyRule): any[] | null {
  if (rule.operator === 'eq')
    return [rule.value]
  if (rule.operator === 'in')
    return uniqueValues(rule.values)

  const range = toRangeConstraint(rule)
  if (range?.lower && range.upper && range.lower.inclusive && range.upper.inclusive && range.lower.value === range.upper.value)
    return [range.lower.display]

  return null
}

function ruleAllowsNull(rule: PolicyRule) {
  return !['required', 'eq', 'in', 'gt', 'ge', 'lt', 'le', 'between', 'regex', 'contains', 'startsWith', 'endsWith', 'containsSpecialChars', 'notBlank', 'softLock', 'locked'].includes(rule.operator)
}

function ruleAllowsBlank(rule: PolicyRule) {
  switch (rule.operator) {
    case 'contains':
    case 'startsWith':
    case 'endsWith':
    case 'containsSpecialChars':
    case 'notBlank':
    case 'eq':
      return stringifyValue(rule.value) === ''
    case 'in':
      return uniqueValues(rule.values).some(value => stringifyValue(value).trim() === '')
    case 'required':
      return true
    default:
      return true
  }
}

function ruleAllowsValue(rule: PolicyRule, value: any): boolean {
  const stringValue = stringifyValue(value)
  const finiteValues = getFiniteAllowedValues(rule)
  if (finiteValues)
    return finiteValues.some(item => isSameValue(item, value))

  switch (rule.operator) {
    case 'ne':
      return !isSameValue(rule.value, value)
    case 'notIn':
      return !uniqueValues(rule.values).some(item => isSameValue(item, value))
    case 'gt':
    case 'ge':
    case 'lt':
    case 'le':
    case 'between': {
      const range = toRangeConstraint(rule)
      return !!range && isComparableValueWithinRange(value, range)
    }
    case 'notBetween': {
      const range = toExcludedRangeConstraint(rule)
      return !!range && !isComparableValueWithinRange(value, range)
    }
    case 'contains':
      return stringValue.includes(stringifyValue(rule.value))
    case 'notContains':
      return !stringValue.includes(stringifyValue(rule.value))
    case 'containsSpecialChars':
      return /[\p{P}\p{S}]/u.test(stringValue)
    case 'notContainsSpecialChars':
      return !/[\p{P}\p{S}]/u.test(stringValue)
    case 'startsWith':
      return stringValue.startsWith(stringifyValue(rule.value))
    case 'notStartsWith':
      return !stringValue.startsWith(stringifyValue(rule.value))
    case 'endsWith':
      return stringValue.endsWith(stringifyValue(rule.value))
    case 'notEndsWith':
      return !stringValue.endsWith(stringifyValue(rule.value))
    case 'isNull':
      return value == null
    case 'notNull':
    case 'required':
      return value != null
    case 'isBlank':
      return stringValue.trim() === ''
    case 'notBlank':
      return stringValue.trim() !== ''
    default:
      return true
  }
}

function validateCandidateAgainstState(state: FamilyState, rule: PolicyRule): string | null {
  const existingRule = state.rule
  const finiteValues = getFiniteAllowedValues(rule)
  const stringWitnesses = uniqueValues([
    '',
    'plain',
    'demo',
    '!',
    stringifyValue(rule.value),
    `${stringifyValue(existingRule.value)}tail`,
    `head${stringifyValue(existingRule.value)}`,
    `head${stringifyValue(existingRule.value)}tail`,
    `${stringifyValue(existingRule.value)}${stringifyValue(rule.value)}`,
    `${stringifyValue(rule.value)}${stringifyValue(existingRule.value)}`
  ])

  if (state.range && ['gt', 'ge', 'lt', 'le', 'between'].includes(existingRule.operator)) {
    const candidateRange = toRangeConstraint(rule)
    if (candidateRange)
      return isRangeContainedInRange(candidateRange, state.range) ? null : `当前校验只能继续收缩到 ${summarizeRange(state.range)} 内，不能放宽或缺省边界`

    if (finiteValues?.length)
      return finiteValues.every(value => isComparableValueWithinRange(value, state.range!)) ? null : `当前取值必须全部位于 ${summarizeRange(state.range)} 内`

    return `当前校验只能继续收缩到 ${summarizeRange(state.range)} 内`
  }

  if (state.range && existingRule.operator === 'notBetween') {
    const candidateRange = toRangeConstraint(rule)
    if (candidateRange)
      return hasRangeIntersection(candidateRange, state.range) ? `当前校验不能落入已排除区间 ${summarize(existingRule)}` : null

    if (finiteValues?.length)
      return finiteValues.some(value => isComparableValueWithinRange(value, state.range!)) ? `当前取值不能落入已排除区间 ${summarize(existingRule)}` : null

    return null
  }

  if (existingRule.operator === 'eq') {
    return finiteValues?.length === 1 && isSameValue(finiteValues[0], existingRule.value)
      ? null
      : `当前校验只能维持精确值 ${existingRule.value}`
  }

  if (existingRule.operator === 'in') {
    const allowedValues = uniqueValues(existingRule.values)
    const hasRemainingValue = allowedValues.some(value => ruleAllowsValue(rule, value))
    return hasRemainingValue ? null : `当前校验与前序集合 ${summarize(existingRule)} 无交集`
  }

  if (existingRule.operator === 'ne') {
    return ruleAllowsValue(rule, existingRule.value)
      ? `当前校验不能重新放开被排除的值 ${existingRule.value}`
      : null
  }

  if (existingRule.operator === 'notIn') {
    const excludedValues = uniqueValues(existingRule.values)
    const hit = excludedValues.find(value => ruleAllowsValue(rule, value))
    return hit === undefined ? null : `当前校验不能重新放开被排除的值 ${hit}`
  }

  if (['contains', 'notContains', 'startsWith', 'notStartsWith', 'endsWith', 'notEndsWith'].includes(existingRule.operator)) {
    if (rule.operator === existingRule.operator)
      return canOverrideStringConstraint(existingRule, rule) ? null : `当前字符串校验只能在「${summarize(existingRule)}」基础上继续收紧`
    if (finiteValues?.length)
      return finiteValues.every(value => ruleAllowsValue(existingRule, value)) ? null : `当前取值必须满足「${summarize(existingRule)}」`
    const violatingWitness = stringWitnesses.find(value => ruleAllowsValue(rule, value) && !ruleAllowsValue(existingRule, value))
    return violatingWitness === undefined ? null : `当前校验不能放宽前序约束「${summarize(existingRule)}」`
  }

  if (existingRule.operator === 'containsSpecialChars')
    return ruleAllowsValue(rule, 'plain') ? '当前校验不能重新放开无特殊符号的值' : null

  if (existingRule.operator === 'notContainsSpecialChars' && ruleAllowsValue(rule, '!'))
    return '当前校验不能重新放开特殊符号'

  if (existingRule.operator === 'notNull' && ruleAllowsNull(rule))
    return '当前校验不能重新放开空值'

  if (existingRule.operator === 'notBlank' && ruleAllowsBlank(rule))
    return '当前校验不能重新放开空字符串'

  if (existingRule.operator === 'isNull')
    return rule.operator === 'isNull' ? null : '当前校验只能维持为空约束'

  if (existingRule.operator === 'isBlank')
    return rule.operator === 'isBlank' ? null : '当前校验只能维持空字符串约束'

  return null
}

function findHigherPriorityConflict(states: Map<FamilyKey, FamilyState>, candidateRule: PolicyRule, candidateFamily: FamilyKey | null): FamilyState | null {
  const candidatePriority = candidateRule.priority ?? 9999
  for (const [family, state] of states.entries()) {
    const existingPriority = state.rule.priority ?? 9999
    if (existingPriority < candidatePriority) {
      return state
    }
  }
  return null
}

function validateCandidateAgainstStates(states: Map<FamilyKey, FamilyState>, rule: PolicyRule) {
  for (const state of states.values()) {
    const reason = validateCandidateAgainstState(state, rule)
    if (reason)
      return reason
  }
  return null
}

function pickStricterLower(current?: RangeBoundary, next?: RangeBoundary): RangeBoundary | undefined {
  if (!current)
    return next
  if (!next)
    return current
  if (next.value > current.value)
    return next
  if (next.value < current.value)
    return current
  return next.inclusive ? current : next
}

function pickStricterUpper(current?: RangeBoundary, next?: RangeBoundary): RangeBoundary | undefined {
  if (!current)
    return next
  if (!next)
    return current
  if (next.value < current.value)
    return next
  if (next.value > current.value)
    return current
  return next.inclusive ? current : next
}

function isLowerLooser(candidate?: RangeBoundary, current?: RangeBoundary): boolean {
  if (!current || !candidate)
    return false
  if (candidate.value < current.value)
    return true
  if (candidate.value > current.value)
    return false
  return candidate.inclusive && !current.inclusive
}

function isUpperLooser(candidate?: RangeBoundary, current?: RangeBoundary): boolean {
  if (!current || !candidate)
    return false
  if (candidate.value > current.value)
    return true
  if (candidate.value < current.value)
    return false
  return candidate.inclusive && !current.inclusive
}

function mergeRange(existing: RangeConstraint | undefined, candidate: RangeConstraint): RangeConstraint {
  return {
    lower: pickStricterLower(existing?.lower, candidate.lower),
    upper: pickStricterUpper(existing?.upper, candidate.upper)
  }
}

function isEmptyRange(range: RangeConstraint): boolean {
  if ((range.lower && Number.isNaN(range.lower.value)) || (range.upper && Number.isNaN(range.upper.value)))
    return true
  if (!range.lower || !range.upper)
    return false
  if (range.lower.value > range.upper.value)
    return true
  if (range.lower.value < range.upper.value)
    return false
  return !(range.lower.inclusive && range.upper.inclusive)
}

function summarizeRange(range: RangeConstraint): string {
  if (range.lower && range.upper) {
    const left = range.lower.inclusive ? '[' : '('
    const right = range.upper.inclusive ? ']' : ')'
    return `${left}${range.lower.display}, ${range.upper.display}${right}`
  }
  if (range.lower)
    return `${range.lower.inclusive ? '>=' : '>'}${range.lower.display}`
  if (range.upper)
    return `${range.upper.inclusive ? '<=' : '<'}${range.upper.display}`
  return '任意值'
}

function buildFinalFamilies(states: Map<FamilyKey, FamilyState> | undefined): EffectiveFamilyView[] {
  if (!states)
    return []

  const sortedFamilies = [
    ...familyOrder.filter(family => states.has(family)),
    ...[...states.keys()].filter(family => !familyOrder.includes(family)).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  ]

  return sortedFamilies
    .map((family) => {
      const state = states.get(family)!
      return {
        family,
        layerId: state.compiledRule.layerId,
        layerType: state.compiledRule.layerType,
        ruleId: state.compiledRule.ruleId,
        summary: state.summary
      }
    })
}

export class PolicyCompiler {
  compile(document: PolicyDocument): PolicyCompileResult {
    const pathStates = new Map<string, Map<FamilyKey, FamilyState>>()
    const pathCompiled = new Map<string, CompiledRuleView[]>()

    const sortedLayers = [...document.layers].sort((a, b) => a.orderNo - b.orderNo)
    for (const layer of sortedLayers) {
      const sortedRules = [...layer.rules]
        .filter(rule => rule.enabled)
        .sort((a, b) => {
          const pDiff = (a.priority ?? 9999) - (b.priority ?? 9999)
          if (pDiff !== 0) return pDiff
          return a.orderNo - b.orderNo
        })

      for (const rule of sortedRules) {
        const compiled = pathCompiled.get(rule.path) || []
        pathCompiled.set(rule.path, compiled)

        if (rule.operator === 'clear') {
          const states = pathStates.get(rule.path)
          if (!states) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '目标路径尚无可清除规则'))
            continue
          }
          const targetFamily = (rule.targetFamily || '').trim() as FamilyKey
          if (!targetFamily || !states.has(targetFamily)) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '未命中可清除规则族'))
            continue
          }
          const current = states.get(targetFamily)!
          if (current.compiledRule.layerType === 'BASE') {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '不允许清除 BASE 层规则'))
            continue
          }
          current.compiledRule.status = 'cleared'
          current.compiledRule.reason = `被 ${layer.layerType} 层 clear 清除`
          states.delete(targetFamily)
          compiled.push(buildCompiledRule(layer, rule, 'effective', undefined, targetFamily))
          continue
        }

        const family = familyOfRule(rule)
        if (!family) {
          compiled.push(buildCompiledRule(layer, rule, 'rejected', '未知规则族'))
          continue
        }

        const states = pathStates.get(rule.path) || new Map<FamilyKey, FamilyState>()
        pathStates.set(rule.path, states)

        const narrowingReason = validateCandidateAgainstStates(states, rule)
        if (narrowingReason) {
          const existingState = findHigherPriorityConflict(states, rule, family)
          if (existingState) {
            const existingPriority = existingState.rule.priority ?? 9999
            const candidatePriority = rule.priority ?? 9999
            compiled.push(buildCompiledRule(layer, rule, 'rejected',
              `优先级冲突：低权限规则（优先级 ${candidatePriority}）不能放松高权限规则（优先级 ${existingPriority}）— ${narrowingReason}`, family))
          } else {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', narrowingReason, family))
          }
          continue
        }

        const candidate = buildCompiledRule(layer, rule, 'effective', undefined, family)
        const existing = states.get(family)
        if (!existing) {
          const initialState: FamilyState = {
            rule,
            compiledRule: candidate,
            summary: summarize(rule),
            values: rule.values
          }
          if (family === 'range') {
            const range = toRangeConstraint(rule)
            if (!range) {
              compiled.push(buildCompiledRule(layer, rule, 'rejected', '范围规则缺少边界定义', family))
              continue
            }
            if (isEmptyRange(range)) {
              compiled.push(buildCompiledRule(layer, rule, 'rejected', '范围无可用取值', family))
              continue
            }
            initialState.range = range
            initialState.summary = summarizeRange(range)
            candidate.summary = initialState.summary
          }

          if (family === 'in') {
            initialState.values = uniqueValues(rule.values)
            initialState.summary = `in [${initialState.values.join(', ')}]`
          }

          if (family === 'notIn') {
            initialState.values = uniqueValues(rule.values)
            initialState.summary = `not in [${initialState.values.join(', ')}]`
          }

          if (family === 'betweenNot') {
            const excludedRange = toExcludedRangeConstraint(rule)
            if (!excludedRange) {
              compiled.push(buildCompiledRule(layer, rule, 'rejected', '区间排除规则缺少边界定义', family))
              continue
            }
            if (isEmptyRange(excludedRange)) {
              compiled.push(buildCompiledRule(layer, rule, 'rejected', '区间排除规则缺少有效边界', family))
              continue
            }
            initialState.range = excludedRange
            initialState.summary = summarize(rule)
            candidate.summary = initialState.summary
          }

          states.set(family, initialState)
          compiled.push(candidate)
          continue
        }

        if (family === 'range') {
          const candidateRange = toRangeConstraint(rule)
          if (!candidateRange) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '范围规则缺少边界定义', family))
            continue
          }
          if (isLowerLooser(candidateRange.lower, existing.range?.lower) || isUpperLooser(candidateRange.upper, existing.range?.upper)) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '新规则比当前生效范围更宽松', family))
            continue
          }

          const merged = mergeRange(existing.range, candidateRange)
          if (isEmptyRange(merged)) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '范围收缩后无可用取值', family))
            continue
          }

          existing.compiledRule.status = 'overridden'
          existing.compiledRule.reason = `被 ${layer.layerType} 层范围收缩覆盖`
          candidate.summary = summarizeRange(merged)
          states.set(family, {
            rule: {
              ...rule,
              min: merged.lower?.display,
              max: merged.upper?.display,
              minInclusive: merged.lower?.inclusive,
              maxInclusive: merged.upper?.inclusive
            },
            compiledRule: candidate,
            summary: candidate.summary,
            range: merged
          })
          compiled.push(candidate)
          continue
        }

        if (family === 'in') {
          const currentValues = uniqueValues(existing.values)
          const nextValues = uniqueValues(rule.values)
          if (!valuesContainAll(currentValues, nextValues)) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '新集合不能放宽已有集合范围', family))
            continue
          }
          if (!nextValues.length) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '集合不能为空', family))
            continue
          }
          existing.compiledRule.status = 'overridden'
          existing.compiledRule.reason = `被 ${layer.layerType} 层集合收缩覆盖`
          states.set(family, {
            rule: {
              ...rule,
              values: nextValues
            },
            compiledRule: candidate,
            summary: `in [${nextValues.join(', ')}]`,
            values: nextValues
          })
          candidate.summary = `in [${nextValues.join(', ')}]`
          compiled.push(candidate)
          continue
        }

        if (family === 'notIn') {
          const currentValues = uniqueValues(existing.values)
          const nextValues = uniqueValues(rule.values)
          if (!valuesContainAll(nextValues, currentValues)) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '新集合不能缩小已有排除范围', family))
            continue
          }
          existing.compiledRule.status = 'overridden'
          existing.compiledRule.reason = `被 ${layer.layerType} 层排除集合收紧覆盖`
          states.set(family, {
            rule: {
              ...rule,
              values: nextValues
            },
            compiledRule: candidate,
            summary: `not in [${nextValues.join(', ')}]`,
            values: nextValues
          })
          candidate.summary = `not in [${nextValues.join(', ')}]`
          compiled.push(candidate)
          continue
        }

        if (family === 'betweenNot') {
          const candidateExcludedRange = toExcludedRangeConstraint(rule)
          const currentExcludedRange = existing.range
          if (!candidateExcludedRange || !currentExcludedRange) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '区间排除规则缺少边界定义', family))
            continue
          }
          if (isLowerLooser(currentExcludedRange.lower, candidateExcludedRange.lower) || isUpperLooser(currentExcludedRange.upper, candidateExcludedRange.upper)) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '新规则不能缩小已有排除区间', family))
            continue
          }
          existing.compiledRule.status = 'overridden'
          existing.compiledRule.reason = `被 ${layer.layerType} 层排除区间收紧覆盖`
          states.set(family, {
            rule,
            compiledRule: candidate,
            summary: summarize(rule),
            range: candidateExcludedRange
          })
          compiled.push(candidate)
          continue
        }

        if (family === 'eq' || family === 'required' || family === 'regex'
          || family === 'isNull' || family === 'notNull' || family === 'isBlank' || family === 'notBlank'
          || family === 'containsSpecialChars' || family === 'notContainsSpecialChars'
          || family === 'default' || family === 'softLock' || family === 'locked' || family === 'readonly') {
          const isEquivalent = family === 'regex'
            ? stringifyValue(existing.rule.pattern) === stringifyValue(rule.pattern)
            : family === 'default'
              ? isSameValue(existing.rule.defaultValue, rule.defaultValue)
              : family === 'locked' || family === 'softLock'
                ? isSameValue(existing.rule.lockedValue, rule.lockedValue) && stringifyValue(existing.rule.lockMode) === stringifyValue(rule.lockMode)
                : true

          if (!isEquivalent) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '高顺序校验只能保持相同约束，不能放宽或改写已有约束', family))
            continue
          }
        }

        if (family === 'eq' && !isSameValue(existing.rule.value, rule.value)) {
          compiled.push(buildCompiledRule(layer, rule, 'rejected', '等值校验只能维持相同取值', family))
          continue
        }

        if (family === 'ne' && !isSameValue(existing.rule.value, rule.value)) {
          compiled.push(buildCompiledRule(layer, rule, 'rejected', '不等于校验不能改写为新的排除值', family))
          continue
        }

        if (['contains', 'notContains', 'startsWith', 'notStartsWith', 'endsWith', 'notEndsWith'].includes(family)) {
          if (!canOverrideStringConstraint(existing.rule, rule)) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '字符串校验只能在原有基础上继续收紧', family))
            continue
          }
        }

        existing.compiledRule.status = 'overridden'
        existing.compiledRule.reason = `被 ${layer.layerType} 层覆盖`
        states.set(family, {
          rule,
          compiledRule: candidate,
          summary: summarize(rule),
          values: rule.values
        })
        compiled.push(candidate)
      }
    }

    const paths: EffectivePathView[] = [...pathCompiled.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([path, compiledRules]) => {
        const finalFamilies = buildFinalFamilies(pathStates.get(path))
        const effectiveSummaries = finalFamilies.map(item => `${item.layerType}/${item.family}: ${item.summary}`)
        return {
          path,
          compiledRules,
          finalFamilies,
          effectiveSummaries
        }
      })

    return { paths }
  }
}
