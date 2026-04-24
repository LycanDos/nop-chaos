/**
 * Pure functions and types for version management in LProcessConsoleV2.
 * Extracted to enable isolated unit/property-based testing without
 * pulling in heavy component dependencies (React, systemjs, nop-core).
 */

export type VersionItem = {
  methodId: string
  methodCode: string
  methodVersion: string
  versionStatus: 'ACTIVE' | 'DEPRECATED'
  releaseVersion?: string
  executorReleaseId?: string
  inputCount?: number
  outputCount?: number
}

export type FieldDiffItem = {
  fieldPath: string
  changeType: 'ADDED' | 'REMOVED' | 'TYPE_CHANGED' | 'DEFAULT_CHANGED'
  oldValue: string | null
  newValue: string | null
}

export type MetadataDiffItem = {
  fieldName: string
  oldValue: string | null
  newValue: string | null
}

export type VersionDiffResult = {
  methodCode: string
  versionA: string
  versionB: string
  inputDiffs: FieldDiffItem[]
  outputDiffs: FieldDiffItem[]
  metadataDiffs: MetadataDiffItem[]
}

export const CHANGE_TYPE_LABELS: Record<string, string> = {
  ADDED: '新增',
  REMOVED: '移除',
  TYPE_CHANGED: '类型变更',
  DEFAULT_CHANGED: '默认值变更',
}

export function sortVersionsDesc(versions: VersionItem[]): VersionItem[] {
  return [...versions].sort((a, b) => {
    if (a.methodVersion > b.methodVersion) return -1
    if (a.methodVersion < b.methodVersion) return 1
    return 0
  })
}

export function computeDiffSummary(diff: VersionDiffResult): Record<string, number> {
  const counts: Record<string, number> = {}
  const allDiffs = [...diff.inputDiffs, ...diff.outputDiffs]
  allDiffs.forEach(d => {
    counts[d.changeType] = (counts[d.changeType] || 0) + 1
  })
  return counts
}
