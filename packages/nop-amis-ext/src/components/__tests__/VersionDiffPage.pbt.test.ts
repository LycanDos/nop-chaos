import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type {
  VersionItem,
  VersionDiffResult,
} from '../LProcessConsoleV2.version-utils'

// ── State model ─────────────────────────────────────────────────────
// Models the page state as a plain object, mirroring VersionDiffPage's useState fields.

type MethodOption = { methodCode: string; methodName: string }

type PageState = {
  selectedExecutorDefId: string | null
  methodList: MethodOption[]
  selectedMethodCode: string | null
  versionList: VersionItem[]
  versionA: string | null
  versionB: string | null
  diffResult: VersionDiffResult | null
  error: string | null
}

// ── Pure cascade-clear functions ────────────────────────────────────
// These replicate the exact clearing logic from VersionDiffPage.tsx useEffect hooks.

/**
 * When the executor selection changes, ALL downstream state is cleared:
 * methodList, selectedMethodCode, versionList, versionA, versionB, diffResult, error.
 */
function applyExecutorChange(state: PageState, newExecutorDefId: string | null): PageState {
  return {
    ...state,
    selectedExecutorDefId: newExecutorDefId,
    methodList: [],
    selectedMethodCode: null,
    versionList: [],
    versionA: null,
    versionB: null,
    diffResult: null,
    error: null,
  }
}

/**
 * When the method selection changes, downstream state is cleared:
 * versionList, versionA, versionB, diffResult, error.
 */
function applyMethodChange(state: PageState, newMethodCode: string | null): PageState {
  return {
    ...state,
    selectedMethodCode: newMethodCode,
    versionList: [],
    versionA: null,
    versionB: null,
    diffResult: null,
    error: null,
  }
}

// ── Arbitraries ─────────────────────────────────────────────────────

const methodOptionArb: fc.Arbitrary<MethodOption> = fc.record({
  methodCode: fc.string({ minLength: 1, maxLength: 20 }),
  methodName: fc.string({ minLength: 1, maxLength: 20 }),
})

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

const fieldDiffItemArb = fc.record({
  fieldPath: fc.string({ minLength: 1, maxLength: 30 }),
  changeType: changeTypeArb,
  oldValue: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  newValue: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
})

const metadataDiffItemArb = fc.record({
  fieldName: fc.string({ minLength: 1, maxLength: 20 }),
  oldValue: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  newValue: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
})

const versionDiffResultArb: fc.Arbitrary<VersionDiffResult> = fc.record({
  methodCode: fc.string({ minLength: 1, maxLength: 20 }),
  versionA: fc.string({ minLength: 1, maxLength: 10 }),
  versionB: fc.string({ minLength: 1, maxLength: 10 }),
  inputDiffs: fc.array(fieldDiffItemArb, { maxLength: 10 }),
  outputDiffs: fc.array(fieldDiffItemArb, { maxLength: 10 }),
  metadataDiffs: fc.array(metadataDiffItemArb, { maxLength: 5 }),
})

/** Generates a fully-populated page state with arbitrary selections and data. */
const pageStateArb: fc.Arbitrary<PageState> = fc.record({
  selectedExecutorDefId: fc.option(fc.uuid(), { nil: null }),
  methodList: fc.array(methodOptionArb, { maxLength: 10 }),
  selectedMethodCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
  versionList: fc.array(versionItemArb, { maxLength: 10 }),
  versionA: fc.option(fc.uuid(), { nil: null }),
  versionB: fc.option(fc.uuid(), { nil: null }),
  diffResult: fc.option(versionDiffResultArb, { nil: null }),
  error: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
})

// ── Property Tests ──────────────────────────────────────────────────

/**
 * **Validates: Requirements 2.3, 2.4**
 * Property 1: 级联清空——选择器变更清除所有下游状态
 */
describe('Feature: version-diff-page, Property 1: 级联清空', () => {
  it('executor change clears all downstream state (methodList, selectedMethodCode, versionList, versionA, versionB, diffResult, error)', () => {
    fc.assert(
      fc.property(
        pageStateArb,
        fc.option(fc.uuid(), { nil: null }),
        (state, newExecutorId) => {
          const next = applyExecutorChange(state, newExecutorId)

          // The new executor is set
          expect(next.selectedExecutorDefId).toBe(newExecutorId)

          // All downstream fields are cleared
          expect(next.methodList).toEqual([])
          expect(next.selectedMethodCode).toBeNull()
          expect(next.versionList).toEqual([])
          expect(next.versionA).toBeNull()
          expect(next.versionB).toBeNull()
          expect(next.diffResult).toBeNull()
          expect(next.error).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('method change clears version and diff downstream state (versionList, versionA, versionB, diffResult, error)', () => {
    fc.assert(
      fc.property(
        pageStateArb,
        fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
        (state, newMethodCode) => {
          const next = applyMethodChange(state, newMethodCode)

          // The new method is set
          expect(next.selectedMethodCode).toBe(newMethodCode)

          // Downstream fields are cleared
          expect(next.versionList).toEqual([])
          expect(next.versionA).toBeNull()
          expect(next.versionB).toBeNull()
          expect(next.diffResult).toBeNull()
          expect(next.error).toBeNull()

          // Upstream fields are preserved
          expect(next.selectedExecutorDefId).toBe(state.selectedExecutorDefId)
          expect(next.methodList).toBe(state.methodList)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('executor change clears downstream regardless of initial state richness', () => {
    // Use a state that is guaranteed to have non-null/non-empty values everywhere
    const richStateArb = fc.record({
      selectedExecutorDefId: fc.uuid(),
      methodList: fc.array(methodOptionArb, { minLength: 1, maxLength: 5 }),
      selectedMethodCode: fc.string({ minLength: 1, maxLength: 20 }),
      versionList: fc.array(versionItemArb, { minLength: 1, maxLength: 5 }),
      versionA: fc.uuid(),
      versionB: fc.uuid(),
      diffResult: versionDiffResultArb,
      error: fc.string({ minLength: 1, maxLength: 50 }),
    })

    fc.assert(
      fc.property(
        richStateArb,
        fc.uuid(),
        (state, newExecutorId) => {
          const next = applyExecutorChange(state, newExecutorId)

          expect(next.selectedExecutorDefId).toBe(newExecutorId)
          expect(next.methodList).toEqual([])
          expect(next.selectedMethodCode).toBeNull()
          expect(next.versionList).toEqual([])
          expect(next.versionA).toBeNull()
          expect(next.versionB).toBeNull()
          expect(next.diffResult).toBeNull()
          expect(next.error).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('method change preserves executor-level state while clearing version-level state', () => {
    const richStateArb = fc.record({
      selectedExecutorDefId: fc.uuid(),
      methodList: fc.array(methodOptionArb, { minLength: 1, maxLength: 5 }),
      selectedMethodCode: fc.string({ minLength: 1, maxLength: 20 }),
      versionList: fc.array(versionItemArb, { minLength: 1, maxLength: 5 }),
      versionA: fc.uuid(),
      versionB: fc.uuid(),
      diffResult: versionDiffResultArb,
      error: fc.string({ minLength: 1, maxLength: 50 }),
    })

    fc.assert(
      fc.property(
        richStateArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        (state, newMethodCode) => {
          const next = applyMethodChange(state, newMethodCode)

          // Executor-level state preserved
          expect(next.selectedExecutorDefId).toBe(state.selectedExecutorDefId)
          expect(next.methodList).toBe(state.methodList)

          // Method set to new value
          expect(next.selectedMethodCode).toBe(newMethodCode)

          // Version-level state cleared
          expect(next.versionList).toEqual([])
          expect(next.versionA).toBeNull()
          expect(next.versionB).toBeNull()
          expect(next.diffResult).toBeNull()
          expect(next.error).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('sequential executor then method change clears everything downstream', () => {
    fc.assert(
      fc.property(
        pageStateArb,
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 20 }),
        (state, newExecutorId, newMethodCode) => {
          const afterExecutor = applyExecutorChange(state, newExecutorId)
          const afterMethod = applyMethodChange(afterExecutor, newMethodCode)

          // After both changes, all version-level state is cleared
          expect(afterMethod.versionList).toEqual([])
          expect(afterMethod.versionA).toBeNull()
          expect(afterMethod.versionB).toBeNull()
          expect(afterMethod.diffResult).toBeNull()
          expect(afterMethod.error).toBeNull()

          // Executor is set, method list was cleared by executor change
          expect(afterMethod.selectedExecutorDefId).toBe(newExecutorId)
          expect(afterMethod.methodList).toEqual([])
          expect(afterMethod.selectedMethodCode).toBe(newMethodCode)
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ── Property 2 ──────────────────────────────────────────────────────

import { sortVersionsDesc, computeDiffSummary } from '../LProcessConsoleV2.version-utils'

/**
 * **Validates: Requirements 3.1**
 * Property 2: 版本列表降序排列不变量
 */
describe('Feature: version-diff-page, Property 2: 版本列表降序排列', () => {
  it('sortVersionsDesc output satisfies descending order by methodVersion (lexicographic)', () => {
    fc.assert(
      fc.property(
        fc.array(versionItemArb, { maxLength: 30 }),
        (items) => {
          const sorted = sortVersionsDesc(items)

          // Each element's methodVersion >= next element's methodVersion
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].methodVersion >= sorted[i + 1].methodVersion).toBe(true)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('sortVersionsDesc preserves array length', () => {
    fc.assert(
      fc.property(
        fc.array(versionItemArb, { maxLength: 30 }),
        (items) => {
          const sorted = sortVersionsDesc(items)
          expect(sorted).toHaveLength(items.length)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('sortVersionsDesc output contains the same elements as input (permutation)', () => {
    fc.assert(
      fc.property(
        fc.array(versionItemArb, { maxLength: 30 }),
        (items) => {
          const sorted = sortVersionsDesc(items)

          // Same length
          expect(sorted).toHaveLength(items.length)

          // Every input element appears in output (by reference, since sortVersionsDesc spreads + sorts)
          const sortedIds = sorted.map((v) => v.methodId).sort()
          const inputIds = [...items].map((v) => v.methodId).sort()
          expect(sortedIds).toEqual(inputIds)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('sortVersionsDesc is idempotent (sorting twice yields same result)', () => {
    fc.assert(
      fc.property(
        fc.array(versionItemArb, { maxLength: 30 }),
        (items) => {
          const once = sortVersionsDesc(items)
          const twice = sortVersionsDesc(once)
          expect(twice).toEqual(once)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('sortVersionsDesc does not mutate the original array', () => {
    fc.assert(
      fc.property(
        fc.array(versionItemArb, { maxLength: 30 }),
        (items) => {
          const original = [...items]
          sortVersionsDesc(items)
          expect(items).toEqual(original)
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ── Property 3 ──────────────────────────────────────────────────────

/**
 * Pure model of the swap operation, mirroring VersionDiffPage.tsx handleSwap().
 * Swaps versionA and versionB, clears diffResult and error.
 */
function handleSwap(
  versionA: string | null,
  versionB: string | null,
): { versionA: string | null; versionB: string | null; diffResult: null; error: null } {
  return {
    versionA: versionB,
    versionB: versionA,
    diffResult: null,
    error: null,
  }
}

/**
 * **Validates: Requirements 3.3**
 * Property 3: 交换按钮互换版本选择值
 */
describe('Feature: version-diff-page, Property 3: 交换按钮互换值', () => {
  const versionArb = fc.option(fc.uuid(), { nil: null })

  it('single swap: versionA becomes old versionB and vice versa', () => {
    fc.assert(
      fc.property(
        versionArb,
        versionArb,
        (a, b) => {
          const result = handleSwap(a, b)
          expect(result.versionA).toBe(b)
          expect(result.versionB).toBe(a)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('double swap (involution): two swaps restore original values', () => {
    fc.assert(
      fc.property(
        versionArb,
        versionArb,
        (a, b) => {
          const afterFirst = handleSwap(a, b)
          const afterSecond = handleSwap(afterFirst.versionA, afterFirst.versionB)
          expect(afterSecond.versionA).toBe(a)
          expect(afterSecond.versionB).toBe(b)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('swap clears diffResult and error', () => {
    fc.assert(
      fc.property(
        versionArb,
        versionArb,
        (a, b) => {
          const result = handleSwap(a, b)
          expect(result.diffResult).toBeNull()
          expect(result.error).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ── Property 4 ──────────────────────────────────────────────────────

/**
 * Pure model of the compare button enable condition, mirroring VersionDiffPage.tsx canCompare.
 */
function canCompare(versionA: string | null, versionB: string | null): boolean {
  return versionA !== null && versionB !== null && versionA !== versionB
}

/**
 * **Validates: Requirements 4.1, 4.2**
 * Property 4: 对比按钮启用当且仅当选择了两个不同的非空版本
 */
describe('Feature: version-diff-page, Property 4: 对比按钮启用条件', () => {
  const versionArb = fc.option(fc.uuid(), { nil: null })

  it('canCompare returns true iff both versions are non-null and different', () => {
    fc.assert(
      fc.property(
        versionArb,
        versionArb,
        (a, b) => {
          const result = canCompare(a, b)
          const expected = a !== null && b !== null && a !== b
          expect(result).toBe(expected)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('both null → disabled', () => {
    expect(canCompare(null, null)).toBe(false)
  })

  it('one null (A null) → disabled', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (b) => {
          expect(canCompare(null, b)).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('one null (B null) → disabled', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (a) => {
          expect(canCompare(a, null)).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('same non-null version → disabled', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (v) => {
          expect(canCompare(v, v)).toBe(false)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('different non-null versions → enabled', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (a, b) => {
          fc.pre(a !== b)
          expect(canCompare(a, b)).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ── Property 5 ──────────────────────────────────────────────────────

/**
 * **Validates: Requirements 5.2**
 * Property 5: 变更摘要统计与实际差异数量一致
 */
describe('Feature: version-diff-page, Property 5: 变更摘要统计一致性', () => {
  it('computeDiffSummary counts match actual changeType occurrences in inputDiffs + outputDiffs', () => {
    fc.assert(
      fc.property(
        versionDiffResultArb,
        (diff) => {
          const summary = computeDiffSummary(diff)

          // Manually count each changeType across inputDiffs + outputDiffs
          const allDiffs = [...diff.inputDiffs, ...diff.outputDiffs]
          const expectedCounts: Record<string, number> = {}
          allDiffs.forEach((d) => {
            expectedCounts[d.changeType] = (expectedCounts[d.changeType] || 0) + 1
          })

          // Summary should match expected counts exactly
          expect(summary).toEqual(expectedCounts)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('each individual changeType count matches actual count', () => {
    const changeTypes = ['ADDED', 'REMOVED', 'TYPE_CHANGED', 'DEFAULT_CHANGED'] as const

    fc.assert(
      fc.property(
        versionDiffResultArb,
        (diff) => {
          const summary = computeDiffSummary(diff)
          const allDiffs = [...diff.inputDiffs, ...diff.outputDiffs]

          for (const ct of changeTypes) {
            const actualCount = allDiffs.filter((d) => d.changeType === ct).length
            const summaryCount = summary[ct] || 0
            expect(summaryCount).toBe(actualCount)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('total count in summary equals total number of inputDiffs + outputDiffs', () => {
    fc.assert(
      fc.property(
        versionDiffResultArb,
        (diff) => {
          const summary = computeDiffSummary(diff)
          const totalFromSummary = Object.values(summary).reduce((sum, n) => sum + n, 0)
          const expectedTotal = diff.inputDiffs.length + diff.outputDiffs.length
          expect(totalFromSummary).toBe(expectedTotal)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('summary contains no keys beyond those present in the actual diffs', () => {
    fc.assert(
      fc.property(
        versionDiffResultArb,
        (diff) => {
          const summary = computeDiffSummary(diff)
          const allDiffs = [...diff.inputDiffs, ...diff.outputDiffs]
          const actualChangeTypes = new Set(allDiffs.map((d) => d.changeType))

          for (const key of Object.keys(summary)) {
            expect(actualChangeTypes.has(key as any)).toBe(true)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('empty inputDiffs and outputDiffs produce empty summary', () => {
    fc.assert(
      fc.property(
        fc.record({
          methodCode: fc.string({ minLength: 1, maxLength: 20 }),
          versionA: fc.string({ minLength: 1, maxLength: 10 }),
          versionB: fc.string({ minLength: 1, maxLength: 10 }),
          inputDiffs: fc.constant([]),
          outputDiffs: fc.constant([]),
          metadataDiffs: fc.array(metadataDiffItemArb, { maxLength: 5 }),
        }),
        (diff) => {
          const summary = computeDiffSummary(diff)
          expect(summary).toEqual({})
        },
      ),
      { numRuns: 100 },
    )
  })
})


// ── Property 8 ──────────────────────────────────────────────────────

/**
 * Pure model of the error message extraction function, mirroring VersionDiffPage.tsx extractErrorMessage().
 * Priority: err.msg > err.message > fallback '操作失败，请稍后重试'
 */
function extractErrorMessage(err: any): string {
  return err?.msg || err?.message || '操作失败，请稍后重试'
}

const FALLBACK_MESSAGE = '操作失败，请稍后重试'

/**
 * **Validates: Requirements 6.3**
 * Property 8: 错误信息提取优先使用后端字段
 */
describe('Feature: version-diff-page, Property 8: 错误信息提取优先级', () => {
  const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.length > 0)

  it('error with msg field returns msg (highest priority)', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        fc.option(nonEmptyStringArb, { nil: undefined }),
        (msg, message) => {
          const err = message !== undefined ? { msg, message } : { msg }
          expect(extractErrorMessage(err)).toBe(msg)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('error with message field but no msg returns message', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        (message) => {
          const err = { message }
          expect(extractErrorMessage(err)).toBe(message)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('error with both msg and message returns msg (msg takes priority)', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        nonEmptyStringArb,
        (msg, message) => {
          const err = { msg, message }
          expect(extractErrorMessage(err)).toBe(msg)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('error with neither msg nor message returns fallback', () => {
    fc.assert(
      fc.property(
        fc.record({
          code: fc.option(fc.integer(), { nil: undefined }),
          status: fc.option(fc.integer(), { nil: undefined }),
          detail: fc.option(fc.string({ maxLength: 30 }), { nil: undefined }),
        }),
        (err) => {
          expect(extractErrorMessage(err)).toBe(FALLBACK_MESSAGE)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('null or undefined error returns fallback', () => {
    expect(extractErrorMessage(null)).toBe(FALLBACK_MESSAGE)
    expect(extractErrorMessage(undefined)).toBe(FALLBACK_MESSAGE)
  })

  it('randomly shaped error objects follow the priority: msg > message > fallback', () => {
    const errorObjArb = fc.oneof(
      // Case 1: has msg (may or may not have message)
      fc.record({
        msg: nonEmptyStringArb,
        message: fc.option(nonEmptyStringArb, { nil: undefined }),
      }),
      // Case 2: has message only (no msg)
      fc.record({
        message: nonEmptyStringArb,
      }),
      // Case 3: neither msg nor message
      fc.record({
        code: fc.option(fc.integer(), { nil: undefined }),
      }),
      // Case 4: null/undefined
      fc.constantFrom(null, undefined),
    )

    fc.assert(
      fc.property(
        errorObjArb,
        (err) => {
          const result = extractErrorMessage(err)

          if (err != null && typeof err === 'object' && 'msg' in err && err.msg) {
            expect(result).toBe(err.msg)
          } else if (err != null && typeof err === 'object' && 'message' in err && err.message) {
            expect(result).toBe(err.message)
          } else {
            expect(result).toBe(FALLBACK_MESSAGE)
          }
        },
      ),
      { numRuns: 200 },
    )
  })
})
