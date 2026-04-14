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
  compiledRule: CompiledRuleView
  summary: string
  range?: RangeConstraint
  values?: any[]
}

interface RangeBoundary {
  value: number
  inclusive: boolean
}

interface RangeConstraint {
  lower?: RangeBoundary
  upper?: RangeBoundary
}

const familyOrder: FamilyKey[] = [
  'required',
  'range',
  'exact',
  'set',
  'regex',
  'contains',
  'default',
  'locked',
  'readonly'
]

function familyForOperator(operator: PolicyOperator): FamilyKey | null {
  if (operator === 'required')
    return 'required'
  if (operator === 'gt' || operator === 'ge' || operator === 'lt' || operator === 'le' || operator === 'between')
    return 'range'
  if (operator === 'eq')
    return 'exact'
  if (operator === 'in')
    return 'set'
  if (operator === 'regex')
    return 'regex'
  if (operator === 'contains')
    return 'contains'
  if (operator === 'default')
    return 'default'
  if (operator === 'locked')
    return 'locked'
  if (operator === 'readonly')
    return 'readonly'
  return null
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
    case 'in':
      return `in [${(rule.values || []).join(', ')}]`
    case 'between':
      return `[${rule.min}, ${rule.max}]`
    case 'contains':
      return `包含 ${rule.value}`
    case 'regex':
      return `regex ${rule.pattern}`
    case 'default':
      return `默认值 ${rule.defaultValue}`
    case 'locked':
      return `锁定值 ${rule.lockedValue} (${rule.lockMode || 'LOCKED'})`
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
    reason
  }
}

function toRangeConstraint(rule: PolicyRule): RangeConstraint | null {
  if (rule.operator === 'gt' || rule.operator === 'ge') {
    return {
      lower: {
        value: Number(rule.value),
        inclusive: rule.operator === 'ge'
      }
    }
  }

  if (rule.operator === 'lt' || rule.operator === 'le') {
    return {
      upper: {
        value: Number(rule.value),
        inclusive: rule.operator === 'le'
      }
    }
  }

  if (rule.operator === 'between') {
    return {
      lower: rule.min === undefined ? undefined : { value: Number(rule.min), inclusive: true },
      upper: rule.max === undefined ? undefined : { value: Number(rule.max), inclusive: true }
    }
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
    return `${left}${range.lower.value}, ${range.upper.value}${right}`
  }
  if (range.lower)
    return `${range.lower.inclusive ? '>=' : '>'}${range.lower.value}`
  if (range.upper)
    return `${range.upper.inclusive ? '<=' : '<'}${range.upper.value}`
  return '任意值'
}

function buildFinalFamilies(states: Map<FamilyKey, FamilyState> | undefined): EffectiveFamilyView[] {
  if (!states)
    return []

  return familyOrder
    .filter(family => states.has(family))
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
        .sort((a, b) => a.orderNo - b.orderNo)

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

        const candidate = buildCompiledRule(layer, rule, 'effective', undefined, family)
        const existing = states.get(family)
        if (!existing) {
          const initialState: FamilyState = {
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

          if (family === 'set') {
            initialState.summary = `in [${(rule.values || []).join(', ')}]`
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
            compiledRule: candidate,
            summary: candidate.summary,
            range: merged
          })
          compiled.push(candidate)
          continue
        }

        if (family === 'set') {
          const currentValues = new Set(existing.values || [])
          const nextValues = new Set(rule.values || [])
          const intersection = [...currentValues].filter(value => nextValues.has(value))
          if (intersection.length === 0) {
            compiled.push(buildCompiledRule(layer, rule, 'rejected', '集合收缩后为空', family))
          } else {
            existing.compiledRule.status = 'overridden'
            existing.compiledRule.reason = `被 ${layer.layerType} 层集合交集收缩`
            states.set(family, {
              compiledRule: candidate,
              summary: `in [${intersection.join(', ')}]`,
              values: intersection
            })
            candidate.summary = `in [${intersection.join(', ')}]`
            compiled.push(candidate)
          }
          continue
        }

        existing.compiledRule.status = 'overridden'
        existing.compiledRule.reason = `被 ${layer.layerType} 层覆盖`
        states.set(family, {
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
