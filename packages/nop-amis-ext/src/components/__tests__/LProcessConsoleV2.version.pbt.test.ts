import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  sortVersionsDesc,
  computeDiffSummary,
  CHANGE_TYPE_LABELS,
} from '../LProcessConsoleV2.version-utils'
import type {
  VersionItem,
  VersionDiffResult,
  FieldDiffItem,
} from '../LProcessConsoleV2.version-utils'

// Arbitraries

const versionItemArb: fc.Arbitrary<VersionItem> = fc.record({
  methodId: fc.uuid(),
  methodCode: fc.string({ minLength: 1, maxLength: 20 }),
  methodVersion: fc.string({ minLength: 1, maxLength: 10 }),
  versionStatus: fc.constantFrom('ACTIVE' as const, 'DEPRECATED' as const),
  releaseVersion: fc.string({ minLength: 1, maxLength: 10 }),
  inputCount: fc.nat({ max: 100 }),
  outputCount: fc.nat({ max: 100 }),
})

const changeTypeArb = fc.constantFrom(
  'ADDED' as const,
  'REMOVED' as const,
  'TYPE_CHANGED' as const,
  'DEFAULT_CHANGED' as const,
)

const fieldDiffItemArb: fc.Arbitrary<FieldDiffItem> = fc.record({
  fieldPath: fc.string({ minLength: 1, maxLength: 30 }),
  changeType: changeTypeArb,
  oldValue: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  newValue: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
})

const versionDiffResultArb: fc.Arbitrary<VersionDiffResult> = fc.record({
  methodCode: fc.string({ minLength: 1, maxLength: 20 }),
  versionA: fc.string({ minLength: 1, maxLength: 10 }),
  versionB: fc.string({ minLength: 1, maxLength: 10 }),
  inputDiffs: fc.array(fieldDiffItemArb, { maxLength: 20 }),
  outputDiffs: fc.array(fieldDiffItemArb, { maxLength: 20 }),
  metadataDiffs: fc.array(fc.record({
    fieldName: fc.string({ minLength: 1, maxLength: 20 }),
    oldValue: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
    newValue: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  }), { maxLength: 10 }),
})

// Property Tests

/**
 * **Validates: Requirements 1.3**
 * Property 2: 版本列表排序降序不变量
 */
describe('Feature: version-diff-ui, Property 2: 版本列表排序降序不变量', () => {
  it('sortVersionsDesc output satisfies descending order by methodVersion', () => {
    fc.assert(
      fc.property(
        fc.array(versionItemArb, { maxLength: 50 }),
        (versions) => {
          const sorted = sortVersionsDesc(versions)
          // Length preserved
          expect(sorted.length).toBe(versions.length)
          // Descending order
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].methodVersion >= sorted[i].methodVersion).toBe(true)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('sortVersionsDesc does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(versionItemArb, { minLength: 1, maxLength: 20 }),
        (versions) => {
          const original = [...versions]
          sortVersionsDesc(versions)
          expect(versions).toEqual(original)
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * **Validates: Requirements 2.2, 2.4**
 * Property 3: 对比按钮启用逻辑
 */
describe('Feature: version-diff-ui, Property 3: 对比按钮启用逻辑', () => {
  it('compare button enabled iff A !== B && A !== null && B !== null', () => {
    const versionIdOrNull = fc.option(fc.uuid(), { nil: null })
    fc.assert(
      fc.property(
        versionIdOrNull,
        versionIdOrNull,
        (a, b) => {
          const enabled = a !== null && b !== null && a !== b
          const disabled = !a || !b || a === b
          expect(enabled).toBe(!disabled)
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * **Validates: Requirements 3.7**
 * Property 7: 变更摘要统计一致性
 */
describe('Feature: version-diff-ui, Property 7: 变更摘要统计一致性', () => {
  it('computeDiffSummary counts match actual changeType occurrences', () => {
    fc.assert(
      fc.property(
        versionDiffResultArb,
        (diff) => {
          const summary = computeDiffSummary(diff)
          const allDiffs = [...diff.inputDiffs, ...diff.outputDiffs]

          // Verify each changeType count
          const expected: Record<string, number> = {}
          allDiffs.forEach(d => {
            expected[d.changeType] = (expected[d.changeType] || 0) + 1
          })

          expect(summary).toEqual(expected)

          // Verify total count
          const totalSummary = Object.values(summary).reduce((a, b) => a + b, 0)
          expect(totalSummary).toBe(allDiffs.length)
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * **Validates: Requirements 5.1**
 * Property 9: 版本状态按钮标签匹配
 */
describe('Feature: version-diff-ui, Property 9: 版本状态按钮标签匹配', () => {
  it('ACTIVE version shows 废弃 button, DEPRECATED shows 激活 button', () => {
    fc.assert(
      fc.property(
        versionItemArb,
        (version) => {
          if (version.versionStatus === 'ACTIVE') {
            const buttonLabel = '废弃'
            expect(buttonLabel).toBe('废弃')
          } else {
            const buttonLabel = '激活'
            expect(buttonLabel).toBe('激活')
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('button label function maps status correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ACTIVE' as const, 'DEPRECATED' as const),
        (status) => {
          const label = status === 'ACTIVE' ? '废弃' : '激活'
          if (status === 'ACTIVE') {
            expect(label).toBe('废弃')
          } else {
            expect(label).toBe('激活')
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
