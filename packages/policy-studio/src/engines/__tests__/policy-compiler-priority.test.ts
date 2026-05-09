/**
 * Property 7: Priority-aware compilation order and conflict resolution
 *
 * For any PolicyDocument containing rules with priority values,
 * PolicyCompiler should process rules by (priority ASC, orderNo ASC).
 * When a lower-privilege rule (higher priority number) relaxes a
 * higher-privilege rule (lower priority number) in the same family and path,
 * the lower-privilege rule's CompiledRuleView status should be "rejected".
 * When a lower-privilege rule tightens a higher-privilege rule,
 * its status should be "effective".
 *
 * **Validates: Requirements 16.1, 16.2, 16.3**
 */
import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { PolicyCompiler } from '../policy-compiler'
import type {
  PolicyDocument,
  PolicyLayer,
  PolicyRule,
  PolicyOperator
} from '../../types'

// --- Helpers ---

let idCounter = 0
function nextId(): string {
  return `id-${++idCounter}`
}

function makeRule(overrides: Partial<PolicyRule> & { path: string; operator: PolicyOperator }): PolicyRule {
  return {
    id: nextId(),
    enabled: true,
    orderNo: 1,
    ...overrides
  }
}

function makeLayer(overrides: Partial<PolicyLayer> & { rules: PolicyRule[] }): PolicyLayer {
  return {
    id: nextId(),
    name: 'Layer',
    layerType: 'BASE',
    orderNo: 1,
    editable: true,
    ...overrides
  }
}

function makeDocument(layers: PolicyLayer[]): PolicyDocument {
  return {
    id: nextId(),
    name: 'TestDoc',
    layers
  }
}

// --- Arbitraries ---

/** Generate a priority value in [0, 9999] */
const arbPriority = fc.integer({ min: 0, max: 9999 })

/** Generate a distinct pair of priorities where highPriv < lowPriv (numerically) */
const arbPriorityPair = fc.tuple(arbPriority, arbPriority)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => a < b ? { highPriv: a, lowPriv: b } : { highPriv: b, lowPriv: a })

const arbOrderNo = fc.integer({ min: 1, max: 100 })

const arbPath = fc.constantFrom('field.a', 'field.b', 'field.c', 'field.x', 'data.name', 'data.value')

// --- Property Tests ---

describe('Feature: multi-layer-validation-priority, Property 7: Priority-aware compilation order and conflict resolution', () => {

  const compiler = new PolicyCompiler()

  beforeEach(() => {
    idCounter = 0
  })

  it('should sort rules by (priority ASC, orderNo ASC) within each layer', () => {
    fc.assert(
      fc.property(
        arbPath,
        fc.array(fc.tuple(arbPriority, arbOrderNo), { minLength: 2, maxLength: 10 }),
        (path, priorityOrderPairs) => {
          // Create rules with 'ge' operator (range family) with increasingly tight values
          // so they don't conflict — each rule tightens the previous
          const rules: PolicyRule[] = priorityOrderPairs.map(([priority, orderNo], idx) => makeRule({
            path,
            operator: 'ge',
            value: 100 + idx * 10, // increasingly tight lower bounds
            priority,
            orderNo,
            sourceId: `src-${idx}`
          }))

          const layer = makeLayer({
            rules,
            orderNo: 1
          })

          const doc = makeDocument([layer])
          const result = compiler.compile(doc)

          // Get compiled rules for this path
          const pathView = result.paths.find(p => p.path === path)
          if (!pathView) return // no rules compiled (shouldn't happen)

          // Verify the compiled rules appear in priority ASC, orderNo ASC order
          const compiledRules = pathView.compiledRules
          for (let i = 1; i < compiledRules.length; i++) {
            const prev = compiledRules[i - 1]
            const curr = compiledRules[i]
            const prevPriority = prev.priority ?? 9999
            const currPriority = curr.priority ?? 9999
            // Priority should be non-decreasing
            expect(prevPriority).toBeLessThanOrEqual(currPriority)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject lower-privilege rules that relax higher-privilege rules in the same family/path', () => {
    fc.assert(
      fc.property(
        arbPath,
        arbPriorityPair,
        (path, { highPriv, lowPriv }) => {
          // High-privilege rule: ge 100 (lower bound >= 100)
          const highPrivRule = makeRule({
            path,
            operator: 'ge',
            value: 100,
            priority: highPriv,
            orderNo: 1,
            sourceId: 'high-priv'
          })

          // Low-privilege rule tries to RELAX: ge 50 (lower bound >= 50, which is looser)
          const lowPrivRule = makeRule({
            path,
            operator: 'ge',
            value: 50,
            priority: lowPriv,
            orderNo: 2,
            sourceId: 'low-priv'
          })

          const layer = makeLayer({
            rules: [highPrivRule, lowPrivRule],
            orderNo: 1
          })

          const doc = makeDocument([layer])
          const result = compiler.compile(doc)

          const pathView = result.paths.find(p => p.path === path)
          expect(pathView).toBeDefined()

          // Find the low-privilege rule's compiled view
          const lowPrivCompiled = pathView!.compiledRules.find(cr => cr.ruleId === lowPrivRule.id)
          expect(lowPrivCompiled).toBeDefined()
          expect(lowPrivCompiled!.status).toBe('rejected')
          // Reason should mention priority conflict
          expect(lowPrivCompiled!.reason).toContain('优先级冲突')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should mark lower-privilege rules as effective when they tighten higher-privilege rules', () => {
    fc.assert(
      fc.property(
        arbPath,
        arbPriorityPair,
        (path, { highPriv, lowPriv }) => {
          // High-privilege rule: ge 50 (lower bound >= 50)
          const highPrivRule = makeRule({
            path,
            operator: 'ge',
            value: 50,
            priority: highPriv,
            orderNo: 1,
            sourceId: 'high-priv'
          })

          // Low-privilege rule TIGHTENS: ge 100 (lower bound >= 100, which is stricter)
          const lowPrivRule = makeRule({
            path,
            operator: 'ge',
            value: 100,
            priority: lowPriv,
            orderNo: 2,
            sourceId: 'low-priv'
          })

          const layer = makeLayer({
            rules: [highPrivRule, lowPrivRule],
            orderNo: 1
          })

          const doc = makeDocument([layer])
          const result = compiler.compile(doc)

          const pathView = result.paths.find(p => p.path === path)
          expect(pathView).toBeDefined()

          // Find the low-privilege rule's compiled view
          const lowPrivCompiled = pathView!.compiledRules.find(cr => cr.ruleId === lowPrivRule.id)
          expect(lowPrivCompiled).toBeDefined()
          expect(lowPrivCompiled!.status).toBe('effective')
        }
      ),
      { numRuns: 100 }
    )
  })


  it('should include priority and sourceId in CompiledRuleView output', () => {
    fc.assert(
      fc.property(
        arbPath,
        arbPriority,
        fc.string({ minLength: 1, maxLength: 10 }),
        (path, priority, sourceId) => {
          const rule = makeRule({
            path,
            operator: 'required',
            priority,
            orderNo: 1,
            sourceId
          })

          const layer = makeLayer({
            rules: [rule],
            orderNo: 1
          })

          const doc = makeDocument([layer])
          const result = compiler.compile(doc)

          const pathView = result.paths.find(p => p.path === path)
          expect(pathView).toBeDefined()

          const compiled = pathView!.compiledRules.find(cr => cr.ruleId === rule.id)
          expect(compiled).toBeDefined()
          expect(compiled!.priority).toBe(priority)
          expect(compiled!.sourceId).toBe(sourceId)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should use default priority 9999 for rules without explicit priority', () => {
    const path = 'field.test'

    // Rule with explicit low priority (high privilege)
    const explicitRule = makeRule({
      path,
      operator: 'ge',
      value: 50,
      priority: 10,
      orderNo: 2,
      sourceId: 'explicit'
    })

    // Rule without priority (defaults to 9999)
    const defaultRule = makeRule({
      path,
      operator: 'ge',
      value: 100, // tightens
      orderNo: 1,
      sourceId: 'default'
    })

    const layer = makeLayer({
      rules: [defaultRule, explicitRule],
      orderNo: 1
    })

    const doc = makeDocument([layer])
    const result = compiler.compile(doc)

    const pathView = result.paths.find(p => p.path === path)
    expect(pathView).toBeDefined()

    // The explicit priority=10 rule should be processed first (lower number = higher privilege)
    // The default priority=9999 rule tightens (ge 100 > ge 50), so it should be effective
    const defaultCompiled = pathView!.compiledRules.find(cr => cr.ruleId === defaultRule.id)
    expect(defaultCompiled).toBeDefined()
    expect(defaultCompiled!.status).toBe('effective')
  })

  it('should reject relaxation across different range operators in same family', () => {
    fc.assert(
      fc.property(
        arbPath,
        arbPriorityPair,
        (path, { highPriv, lowPriv }) => {
          // High-privilege rule: between [100, 200]
          const highPrivRule = makeRule({
            path,
            operator: 'between',
            min: 100,
            max: 200,
            priority: highPriv,
            orderNo: 1,
            sourceId: 'high-priv'
          })

          // Low-privilege rule tries to relax: ge 50 (wider lower bound)
          const lowPrivRule = makeRule({
            path,
            operator: 'ge',
            value: 50,
            priority: lowPriv,
            orderNo: 2,
            sourceId: 'low-priv'
          })

          const layer = makeLayer({
            rules: [highPrivRule, lowPrivRule],
            orderNo: 1
          })

          const doc = makeDocument([layer])
          const result = compiler.compile(doc)

          const pathView = result.paths.find(p => p.path === path)
          expect(pathView).toBeDefined()

          const lowPrivCompiled = pathView!.compiledRules.find(cr => cr.ruleId === lowPrivRule.id)
          expect(lowPrivCompiled).toBeDefined()
          // The ge 50 relaxes the between [100, 200] lower bound, so should be rejected
          expect(lowPrivCompiled!.status).toBe('rejected')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle in-set relaxation with priority conflict', () => {
    fc.assert(
      fc.property(
        arbPath,
        arbPriorityPair,
        (path, { highPriv, lowPriv }) => {
          // High-privilege rule: in [1, 2, 3]
          const highPrivRule = makeRule({
            path,
            operator: 'in',
            values: [1, 2, 3],
            priority: highPriv,
            orderNo: 1,
            sourceId: 'high-priv'
          })

          // Low-privilege rule tries to relax: in [1, 2, 3, 4, 5] (wider set)
          const lowPrivRule = makeRule({
            path,
            operator: 'in',
            values: [1, 2, 3, 4, 5],
            priority: lowPriv,
            orderNo: 2,
            sourceId: 'low-priv'
          })

          const layer = makeLayer({
            rules: [highPrivRule, lowPrivRule],
            orderNo: 1
          })

          const doc = makeDocument([layer])
          const result = compiler.compile(doc)

          const pathView = result.paths.find(p => p.path === path)
          expect(pathView).toBeDefined()

          const lowPrivCompiled = pathView!.compiledRules.find(cr => cr.ruleId === lowPrivRule.id)
          expect(lowPrivCompiled).toBeDefined()
          // Wider set relaxes the constraint, should be rejected
          expect(lowPrivCompiled!.status).toBe('rejected')
        }
      ),
      { numRuns: 100 }
    )
  })
})
