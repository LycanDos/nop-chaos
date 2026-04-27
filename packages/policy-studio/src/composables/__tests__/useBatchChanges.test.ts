import { describe, it, expect, beforeEach } from 'vitest'
import { useBatchChanges } from '../useBatchChanges'
import type { PolicyRule } from '../../types'

function makeRule(id: string, overrides?: Partial<PolicyRule>): PolicyRule {
  return {
    id,
    path: 'user.name',
    operator: 'required',
    enabled: true,
    orderNo: 10,
    ...overrides,
  }
}

describe('useBatchChanges', () => {
  let batch: ReturnType<typeof useBatchChanges>

  beforeEach(() => {
    batch = useBatchChanges()
  })

  it('starts with no changes', () => {
    expect(batch.changeCount.value).toBe(0)
    expect(batch.hasChanges.value).toBe(false)
    expect(batch.pendingChanges.value).toEqual([])
  })

  it('tracks an add', () => {
    const rule = makeRule('r1')
    batch.trackAdd('layer1', rule)

    expect(batch.changeCount.value).toBe(1)
    expect(batch.hasChanges.value).toBe(true)

    const changes = batch.pendingChanges.value
    expect(changes[0].type).toBe('add')
    expect(changes[0].ruleId).toBe('r1')
    expect(changes[0].layerId).toBe('layer1')
    expect(changes[0].originalData).toBeNull()
  })

  it('tracks a modify', () => {
    const original = makeRule('r2')
    const modified = makeRule('r2', { path: 'user.email' })
    batch.trackModify('layer1', modified, original)

    const changes = batch.pendingChanges.value
    expect(changes).toHaveLength(1)
    expect(changes[0].type).toBe('modify')
    expect(changes[0].ruleData?.path).toBe('user.email')
    expect(changes[0].originalData?.path).toBe('user.name')
  })

  it('tracks a delete', () => {
    batch.trackDelete('layer1', 'r3')

    const changes = batch.pendingChanges.value
    expect(changes).toHaveLength(1)
    expect(changes[0].type).toBe('delete')
    expect(changes[0].ruleData).toBeNull()
  })

  it('modify on an add keeps it as add with updated data', () => {
    const rule = makeRule('r4')
    batch.trackAdd('layer1', rule)

    const updated = makeRule('r4', { path: 'user.age' })
    batch.trackModify('layer1', updated)

    expect(batch.changeCount.value).toBe(1)
    const changes = batch.pendingChanges.value
    expect(changes[0].type).toBe('add')
    expect(changes[0].ruleData?.path).toBe('user.age')
  })

  it('delete on an add discards the change entirely', () => {
    const rule = makeRule('r5')
    batch.trackAdd('layer1', rule)
    expect(batch.changeCount.value).toBe(1)

    batch.trackDelete('layer1', 'r5')
    expect(batch.changeCount.value).toBe(0)
  })

  it('clearAll removes all changes', () => {
    batch.trackAdd('layer1', makeRule('r6'))
    batch.trackAdd('layer1', makeRule('r7'))
    expect(batch.changeCount.value).toBe(2)

    batch.clearAll()
    expect(batch.changeCount.value).toBe(0)
  })

  it('discardChange removes a single change', () => {
    batch.trackAdd('layer1', makeRule('r8'))
    batch.trackAdd('layer1', makeRule('r9'))
    expect(batch.changeCount.value).toBe(2)

    batch.discardChange('layer1', 'r8')
    expect(batch.changeCount.value).toBe(1)
    expect(batch.pendingChanges.value[0].ruleId).toBe('r9')
  })

  it('buildPayload returns correct structure', () => {
    batch.trackAdd('layer1', makeRule('r10', { path: 'user.name', priority: 100 }))
    batch.trackDelete('layer2', 'r11')

    const payload = batch.buildPayload()
    expect(payload).toHaveLength(2)

    const addEntry = payload.find(e => e.changeType === 'add')!
    expect(addEntry.ruleId).toBe('r10')
    expect(addEntry.layerId).toBe('layer1')
    expect(addEntry.path).toBe('user.name')
    expect(addEntry.priority).toBe(100)

    const deleteEntry = payload.find(e => e.changeType === 'delete')!
    expect(deleteEntry.ruleId).toBe('r11')
    expect(deleteEntry.layerId).toBe('layer2')
  })

  it('tracks changes across different layers independently', () => {
    const rule = makeRule('r12')
    batch.trackAdd('layerA', rule)
    batch.trackAdd('layerB', { ...rule, id: 'r12' })

    // Same ruleId but different layers = 2 separate changes
    expect(batch.changeCount.value).toBe(2)
  })
})
