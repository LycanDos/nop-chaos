import { computed, reactive, ref } from 'vue'
import type { PolicyRule } from '../types'

/**
 * Change types tracked by the batch accumulator.
 */
export type ChangeType = 'add' | 'modify' | 'delete'

/**
 * A single tracked rule change.
 */
export interface RuleChange {
  type: ChangeType
  ruleId: string
  layerId: string
  /** Snapshot of the rule data (null for deletes). */
  ruleData: Partial<PolicyRule> | null
  /** Original rule snapshot before modification (null for adds). */
  originalData: Partial<PolicyRule> | null
  timestamp: number
}

/**
 * Result returned from the backend batchSubmitRules mutation.
 */
export interface BatchSubmitResult {
  appliedCount: number
  draftCount: number
  createdUnlockRequestIds: string[]
}

/**
 * Composable that accumulates local rule changes (add/modify/delete)
 * and provides a batch for submission to the server.
 */
export function useBatchChanges() {
  const changes = reactive<Map<string, RuleChange>>(new Map())
  const isSubmitting = ref(false)

  /** Number of pending changes. */
  const changeCount = computed(() => changes.size)

  /** Whether there are any pending changes. */
  const hasChanges = computed(() => changes.size > 0)

  /** All pending changes as an array. */
  const pendingChanges = computed<RuleChange[]>(() => Array.from(changes.values()))

  /**
   * Track a rule addition.
   */
  function trackAdd(layerId: string, rule: PolicyRule) {
    const key = `${layerId}::${rule.id}`
    changes.set(key, {
      type: 'add',
      ruleId: rule.id,
      layerId,
      ruleData: { ...rule },
      originalData: null,
      timestamp: Date.now(),
    })
  }

  /**
   * Track a rule modification.
   * If the rule was previously tracked as 'add', keep it as 'add' with updated data.
   */
  function trackModify(layerId: string, rule: PolicyRule, originalRule?: PolicyRule) {
    const key = `${layerId}::${rule.id}`
    const existing = changes.get(key)

    if (existing?.type === 'add') {
      // Still a new rule — just update the snapshot
      existing.ruleData = { ...rule }
      existing.timestamp = Date.now()
      return
    }

    changes.set(key, {
      type: 'modify',
      ruleId: rule.id,
      layerId,
      ruleData: { ...rule },
      originalData: existing?.originalData ?? (originalRule ? { ...originalRule } : null),
      timestamp: Date.now(),
    })
  }

  /**
   * Track a rule deletion.
   * If the rule was previously tracked as 'add', simply remove it (never persisted).
   */
  function trackDelete(layerId: string, ruleId: string) {
    const key = `${layerId}::${ruleId}`
    const existing = changes.get(key)

    if (existing?.type === 'add') {
      // Rule was added locally and never saved — just discard
      changes.delete(key)
      return
    }

    changes.set(key, {
      type: 'delete',
      ruleId,
      layerId,
      ruleData: null,
      originalData: existing?.originalData ?? existing?.ruleData ?? null,
      timestamp: Date.now(),
    })
  }

  /**
   * Discard a single tracked change.
   */
  function discardChange(layerId: string, ruleId: string) {
    changes.delete(`${layerId}::${ruleId}`)
  }

  /**
   * Clear all tracked changes (e.g. after successful submit).
   */
  function clearAll() {
    changes.clear()
  }

  /**
   * Build the ruleChanges payload expected by the backend
   * `batchSubmitRules` mutation.
   */
  function buildPayload(): Array<Record<string, unknown>> {
    return pendingChanges.value.map((change) => {
      const entry: Record<string, unknown> = {
        changeType: change.type,
        ruleId: change.ruleId,
        layerId: change.layerId,
      }
      if (change.ruleData) {
        Object.assign(entry, change.ruleData)
      }
      return entry
    })
  }

  return {
    changes,
    changeCount,
    hasChanges,
    pendingChanges,
    isSubmitting,
    trackAdd,
    trackModify,
    trackDelete,
    discardChange,
    clearAll,
    buildPayload,
  }
}
