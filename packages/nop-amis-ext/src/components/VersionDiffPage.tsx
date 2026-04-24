import type { RendererProps } from 'amis'
import type { ApiObject } from 'amis-core/lib/types'
import { ajaxRequest } from '@nop-chaos/nop-core'
import { Select } from 'amis-ui'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  sortVersionsDesc,
  computeDiffSummary,
  CHANGE_TYPE_LABELS,
} from './LProcessConsoleV2.version-utils'
import type {
  VersionItem,
  VersionDiffResult,
  FieldDiffItem,
  MetadataDiffItem,
} from './LProcessConsoleV2.version-utils'

// ── Internal types ──────────────────────────────────────────────────

type ExecutorOption = { executorDefId: string; executorName: string }

type MethodOption = { methodCode: string; methodName: string }

type SimpleOption = { label: string; value: string }

type NopApi = ApiObject & {
  'gql:selection'?: string
}

// ── Style constants ─────────────────────────────────────────────────

const SECTION_CARD_STYLE: React.CSSProperties = {
  border: '1px solid #dbe1ea',
  borderRadius: 4,
  background: '#fff',
  boxShadow: 'none',
  overflow: 'hidden',
}

const SECTION_HEADER_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 6,
  padding: '5px 8px',
  borderBottom: '1px solid #eef2f7',
  background: '#f8fafc',
}

const TABLE_STYLE: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: 13,
}

const TH_STYLE: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 8px',
  background: '#f8fafc',
  borderBottom: '1px solid #e5e7eb',
  color: '#475569',
  fontWeight: 600,
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
}

const TD_STYLE: React.CSSProperties = {
  padding: '7px 8px',
  borderBottom: '1px solid #eef2f7',
  verticalAlign: 'top',
  color: '#111827',
  background: '#fff',
  overflowWrap: 'anywhere',
}

const PAGE_WRAPPER_STYLE: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  paddingTop: 4,
}

const PAGE_CONTENT_STYLE: React.CSSProperties = {
  display: 'grid',
  gap: 8,
}

const ERROR_ALERT_STYLE: React.CSSProperties = {
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#b91c1c',
  borderRadius: 4,
  padding: '10px 12px',
}

const SECTION_TITLE_STYLE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#0f172a',
  lineHeight: '20px',
}

const SECTION_DESC_STYLE: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  lineHeight: '18px',
}

const SEARCH_GROUP_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  flex: '1 1 320px',
  minWidth: 260,
  height: 32,
  border: '1px solid #d8e3ef',
  borderRadius: 4,
  background: '#fff',
  overflow: 'hidden',
}

const SOURCE_FIELD_LABEL_STYLE: React.CSSProperties = {
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: '#1d4ed8',
  lineHeight: '28px',
  whiteSpace: 'nowrap',
  minWidth: 48,
  padding: '0 8px',
  background: '#e8f1ff',
}

const SOURCE_SELECT_TRIGGER_STYLE: React.CSSProperties = {
  width: '100%',
}

const SELECTOR_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexWrap: 'wrap',
  minWidth: 0,
  width: '100%',
  padding: 4,
  border: '1px solid #d8e3ef',
  borderRadius: 4,
  background: '#fff',
}

// ── Scoped CSS ──────────────────────────────────────────────────────

const SCOPED_CSS = `
  .nop-version-diff__source-field {
    display: inline-flex;
    align-items: stretch;
    min-width: 0;
    height: 32px;
    padding: 0;
    border: 1px solid #d8e3ef;
    border-radius: 4px;
    background: #fff;
    overflow: hidden;
    transition: border-color 0.18s ease;
    position: relative;
  }
  .nop-version-diff__source-field--executor {
    flex: 1 1 630px;
    min-width: 480px;
  }
  .nop-version-diff__source-field--method {
    flex: 1 1 630px;
    min-width: 480px;
  }
  .nop-version-diff__source-field--version {
    flex: 0 1 390px;
    min-width: 330px;
  }
  .nop-version-diff__source-field-control {
    flex: 1 1 0%;
    min-width: 0;
    display: flex;
    align-items: stretch;
  }
  .nop-version-diff__resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    width: 5px;
    height: 100%;
    cursor: col-resize;
    z-index: 2;
    background: transparent;
    transition: background 0.15s;
  }
  .nop-version-diff__resize-handle:hover,
  .nop-version-diff__resize-handle--active {
    background: #3b82f6;
  }
  .nop-version-diff__rich-select {
    width: 100%;
    min-width: 0;
  }
  .nop-version-diff__rich-select .cxd-Select {
    min-height: 28px;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0;
    background: transparent;
  }
  .nop-version-diff__rich-select .cxd-Select-value {
    font-size: 12px;
    line-height: 28px;
  }
  .nop-version-diff__rich-select .cxd-Select-placeholder {
    font-size: 12px;
    line-height: 28px;
    color: #94a3b8;
  }
`

// ── Change type color themes ────────────────────────────────────────

const CHANGE_TYPE_THEMES: Record<string, { background: string; color: string }> = {
  ADDED:           { background: '#dcfce7', color: '#166534' },
  REMOVED:         { background: '#fee2e2', color: '#b91c1c' },
  TYPE_CHANGED:    { background: '#fff7ed', color: '#c2410c' },
  DEFAULT_CHANGED: { background: '#dbeafe', color: '#1d4ed8' },
}

// ── Helper functions ────────────────────────────────────────────────

function tagPill(label: React.ReactNode, theme: { background: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        background: theme.background,
        color: theme.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: '18px',
      }}
    >
      {label}
    </span>
  )
}

function statusTag(label: React.ReactNode, positive?: boolean) {
  return tagPill(label, positive
    ? { background: '#dcfce7', color: '#166534' }
    : { background: '#fef3c7', color: '#92400e' })
}

function countTag(label: string, value?: number | null) {
  return tagPill(`${label} ${value ?? 0}`, { background: '#f1f5f9', color: '#334155' })
}

function extractErrorMessage(err: any): string {
  return err?.msg || err?.message || '操作失败，请稍后重试'
}

// ── RichSelect ──────────────────────────────────────────────────────

function RichSelect(props: {
  value: string
  options: SimpleOption[]
  placeholder: string
  disabled?: boolean
  searchable?: boolean
  clearable?: boolean
  controlStyle?: React.CSSProperties
  onChange: (value: string) => void
}) {
  return (
    <Select
      className="nop-version-diff__rich-select"
      value={props.value || ''}
      options={props.options}
      simpleValue
      clearable={props.clearable ?? true}
      searchable={props.searchable ?? props.options.length > 8}
      placeholder={props.placeholder}
      noResultsText="暂无可选项"
      searchPromptText="输入关键字筛选"
      loadingPlaceholder="加载中..."
      clearValueText="清空"
      borderMode="none"
      overlayPlacement="left-bottom-left-top"
      controlStyle={props.controlStyle}
      popOverContainer={typeof document !== 'undefined' ? document.body : undefined}
      disabled={props.disabled}
      onChange={(nextValue) => {
        if (typeof nextValue === 'string') {
          props.onChange(nextValue)
          return
        }
        if (nextValue && typeof nextValue === 'object' && 'value' in nextValue) {
          props.onChange(String((nextValue as any).value || ''))
          return
        }
        props.onChange('')
      }}
    />
  )
}

// ── Resizable source field wrapper ──────────────────────────────────

function ResizableSourceField(props: {
  className: string
  children: React.ReactNode
  options?: SimpleOption[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [customWidth, setCustomWidth] = useState<number | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = containerRef.current?.offsetWidth || 200

    function onMouseMove(ev: MouseEvent) {
      const delta = ev.clientX - startX
      setCustomWidth(Math.max(160, startWidth + delta))
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleDoubleClick = useCallback(() => {
    // 计算最宽选项的宽度
    const items = props.options || []
    if (items.length === 0) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.font = '12px sans-serif'
    let maxTextWidth = 0
    for (const item of items) {
      const w = ctx.measureText(item.label).width
      if (w > maxTextWidth) maxTextWidth = w
    }
    // label宽度 + padding + 标签区域(~60px) + 清除按钮(~24px) + 余量
    setCustomWidth(Math.max(160, Math.ceil(maxTextWidth) + 120))
  }, [props.options])

  return (
    <div
      ref={containerRef}
      className={props.className}
      style={customWidth ? { width: customWidth, flex: 'none' } : undefined}
    >
      {props.children}
      <div
        className="nop-version-diff__resize-handle"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  )
}

// ── API helpers ─────────────────────────────────────────────────────

function unwrapGraphqlField(input: any): { matched: boolean; value: any } {
  if (input == null || typeof input !== 'object' || Array.isArray(input))
    return { matched: false, value: input }

  const keys = Object.keys(input)
  if (keys.length !== 1)
    return { matched: false, value: input }

  const key = keys[0]
  if (!key.includes('__'))
    return { matched: false, value: input }

  return { matched: true, value: input[key] }
}

function extractPayload(input: any): any {
  if (input == null)
    return input

  const graphqlRoot = unwrapGraphqlField(input)
  if (graphqlRoot.matched)
    return extractPayload(graphqlRoot.value)

  if (input.data != null && typeof input.data === 'object' && input.data.status === 0 && input.data.data != null)
    return extractPayload(input.data.data)

  if (input.status === 0 && input.data != null)
    return extractPayload(input.data)

  if (input.data != null && typeof input.data === 'object' && input.status != null)
    return extractPayload(input.data)

  const graphqlData = unwrapGraphqlField(input.data)
  if (graphqlData.matched)
    return extractPayload(graphqlData.value)

  if (input.data != null && input.data.result != null)
    return extractPayload(input.data.result)

  if (input.result != null)
    return extractPayload(input.result)

  return input.data ?? input
}

async function callApi(_props: RendererProps, api: NopApi, data: Record<string, any>) {
  const response = await ajaxRequest({
    ...(api as any),
    data,
    config: {
      ...(api?.config || {}),
      silent: true,
    },
  })
  return extractPayload(response)
}

// ── Component ───────────────────────────────────────────────────────

export default function VersionDiffPageView(props: RendererProps) {
  // === 执行器选择 ===
  const [executorList, setExecutorList] = useState<ExecutorOption[]>([])
  const [executorLoading, setExecutorLoading] = useState(false)
  const [selectedExecutorDefId, setSelectedExecutorDefId] = useState<string | null>(null)

  // === 方法选择 ===
  const [methodList, setMethodList] = useState<MethodOption[]>([])
  const [methodLoading, setMethodLoading] = useState(false)
  const [selectedMethodCode, setSelectedMethodCode] = useState<string | null>(null)

  // === 版本选择（存储 executorReleaseId） ===
  const [versionA, setVersionA] = useState<string | null>(null)
  const [versionB, setVersionB] = useState<string | null>(null)

  // === 对比结果 ===
  const [diffResult, setDiffResult] = useState<VersionDiffResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  // === 错误状态 ===
  const [error, setError] = useState<string | null>(null)

  // === 交换按钮处理 ===
  function handleSwap() {
    setVersionA(versionB)
    setVersionB(versionA)
    setDiffResult(null)
    setError(null)
  }

  // === 加载执行器列表 ===
  useEffect(() => {
    let cancelled = false
    async function loadExecutors() {
      setExecutorLoading(true)
      setError(null)
      try {
        const result = await callApi(props, {
          url: '@query:ExecutorDef__findList',
          'gql:selection': 'executorDefId,executorName',
        }, {})
        if (!cancelled) {
          setExecutorList(Array.isArray(result) ? result : [])
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(extractErrorMessage(err))
        }
      } finally {
        if (!cancelled) {
          setExecutorLoading(false)
        }
      }
    }
    loadExecutors()
    return () => { cancelled = true }
  }, [])

  // === 缓存 release 信息 ===
  const [releaseIds, setReleaseIds] = useState<string[]>([])
  const [releaseVersionMap, setReleaseVersionMap] = useState<Record<string, string>>({})

  // === 方法对应的 release 列表（选择方法后过滤） ===
  const [methodReleaseIds, setMethodReleaseIds] = useState<string[]>([])

  // === 加载 releases + 方法列表（监听 selectedExecutorDefId 变化） ===
  useEffect(() => {
    // 级联清空所有下游状态
    setReleaseIds([])
    setReleaseVersionMap({})
    setMethodList([])
    setSelectedMethodCode(null)
    setMethodReleaseIds([])
    setVersionA(null)
    setVersionB(null)
    setDiffResult(null)
    setError(null)

    if (!selectedExecutorDefId) {
      return
    }

    let cancelled = false
    async function loadReleasesAndMethods() {
      setMethodLoading(true)
      try {
        // 查该执行器下所有 release（含 releaseVersion）
        const releases = await callApi(props, {
          url: '@query:ExecutorRelease__findList',
          'gql:selection': 'executorReleaseId,releaseVersion',
        }, {
          filter_executorDefId: selectedExecutorDefId,
          limit: 500,
        })
        const releaseList = Array.isArray(releases) ? releases : []
        const ids = releaseList.map((r: any) => r.executorReleaseId).filter(Boolean)
        const versionMap: Record<string, string> = {}
        for (const r of releaseList) {
          if (r.executorReleaseId) {
            versionMap[r.executorReleaseId] = r.releaseVersion || r.executorReleaseId
          }
        }

        if (cancelled) return
        setReleaseIds(ids)
        setReleaseVersionMap(versionMap)

        if (ids.length === 0) {
          setMethodList([])
          return
        }

        // 并发查所有 release 下的方法（含 executorReleaseId 用于后续过滤）
        const results = await Promise.all(
          ids.map(rid =>
            callApi(props, {
              url: '@query:ExecutorMethod__findList',
              'gql:selection': 'methodCode,methodName,executorReleaseId',
            }, {
              filter_executorReleaseId: rid,
              limit: 500,
            })
          )
        )

        if (!cancelled) {
          const allMethods = results.flatMap(r => Array.isArray(r) ? r : []) as Array<{ methodCode: string; methodName: string; executorReleaseId: string }>
          // 按 methodCode 去重（用于方法选择器）
          const seen = new Set<string>()
          const deduped: MethodOption[] = []
          for (const item of allMethods) {
            if (item.methodCode && !seen.has(item.methodCode)) {
              seen.add(item.methodCode)
              deduped.push({ methodCode: item.methodCode, methodName: item.methodName })
            }
          }
          setMethodList(deduped)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(extractErrorMessage(err))
        }
      } finally {
        if (!cancelled) {
          setMethodLoading(false)
        }
      }
    }
    loadReleasesAndMethods()
    return () => { cancelled = true }
  }, [selectedExecutorDefId])

  // === 转换为 SimpleOption 格式 ===
  const executorOptions: SimpleOption[] = executorList.map(item => ({
    label: item.executorName,
    value: item.executorDefId,
  }))

  const methodOptions: SimpleOption[] = methodList.map(item => ({
    label: item.methodCode + (item.methodName ? ` | ${item.methodName}` : ''),
    value: item.methodCode,
  }))

  // === 选择方法后，查询该方法存在于哪些 release 中 ===
  useEffect(() => {
    setMethodReleaseIds([])
    setDiffResult(null)
    setError(null)

    if (!selectedMethodCode || releaseIds.length === 0) {
      return
    }

    let cancelled = false
    async function loadMethodReleases() {
      setMethodLoading(true)
      try {
        // 并发查每个 release 下是否存在该 methodCode
        const results = await Promise.all(
          releaseIds.map(rid =>
            callApi(props, {
              url: '@query:ExecutorMethod__findList',
              'gql:selection': 'executorReleaseId',
            }, {
              filter_executorReleaseId: rid,
              filter_methodCode: selectedMethodCode,
              limit: 1,
            })
          )
        )
        if (!cancelled) {
          const matchedIds: string[] = []
          results.forEach((r, idx) => {
            if (Array.isArray(r) && r.length > 0) {
              matchedIds.push(releaseIds[idx])
            }
          })
          setMethodReleaseIds(matchedIds)
          // 仅当已选版本不在新列表中时才清除
          setVersionA(prev => prev && matchedIds.includes(prev) ? prev : null)
          setVersionB(prev => prev && matchedIds.includes(prev) ? prev : null)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(extractErrorMessage(err))
        }
      } finally {
        if (!cancelled) {
          setMethodLoading(false)
        }
      }
    }
    loadMethodReleases()
    return () => { cancelled = true }
  }, [selectedMethodCode, releaseIds])

  // 版本选项仅展示包含选中方法的 release
  const versionOptions: SimpleOption[] = methodReleaseIds.map(rid => ({
    label: releaseVersionMap[rid] || rid,
    value: rid,
  }))

  // versionA/versionB 现在存的是 executorReleaseId
  const canCompareVersions = versionA !== null && versionB !== null && versionA !== versionB
  const sameVersionSelected = versionA !== null && versionB !== null && versionA === versionB

  // === 版本对比 API 调用 ===
  // 需要先根据 methodCode + releaseId 查出 methodId，再调 diff API
  async function fetchDiff() {
    if (!canCompareVersions || !selectedMethodCode) return
    setDiffLoading(true)
    setDiffResult(null)
    setError(null)
    try {
      // 并发查两个 release 下该方法的 methodId
      const [resultA, resultB] = await Promise.all([
        callApi(props, {
          url: '@query:ExecutorMethod__findList',
          'gql:selection': 'methodId',
        }, {
          filter_executorReleaseId: versionA,
          filter_methodCode: selectedMethodCode,
          limit: 1,
        }),
        callApi(props, {
          url: '@query:ExecutorMethod__findList',
          'gql:selection': 'methodId',
        }, {
          filter_executorReleaseId: versionB,
          filter_methodCode: selectedMethodCode,
          limit: 1,
        }),
      ])

      const methodIdA = Array.isArray(resultA) && resultA[0]?.methodId
      const methodIdB = Array.isArray(resultB) && resultB[0]?.methodId

      if (!methodIdA || !methodIdB) {
        setError('所选版本中未找到该方法')
        return
      }

      const result = await callApi(props, {
        url: '@query:LProcessConsole__diffMethodVersions',
        'gql:selection': 'methodCode,versionA,versionB,inputDiffs{fieldPath,changeType,oldValue,newValue},outputDiffs{fieldPath,changeType,oldValue,newValue},metadataDiffs{fieldName,oldValue,newValue}',
      }, {
        methodIdA,
        methodIdB,
      })
      setDiffResult(result as VersionDiffResult)
    } catch (err: any) {
      setError(extractErrorMessage(err))
    } finally {
      setDiffLoading(false)
    }
  }

  return (
    <div style={PAGE_WRAPPER_STYLE}>
      <style>{SCOPED_CSS}</style>
      <div style={PAGE_CONTENT_STYLE}>
        {/* 选择器区域 - 第一行：执行器 + 方法 */}
        <div style={SELECTOR_ROW_STYLE}>
          <ResizableSourceField className="nop-version-diff__source-field nop-version-diff__source-field--executor" options={executorOptions}>
            <span style={SOURCE_FIELD_LABEL_STYLE}>执行器</span>
            <div className="nop-version-diff__source-field-control">
              <RichSelect
                value={selectedExecutorDefId ?? ''}
                options={executorOptions}
                placeholder={executorLoading ? '加载中...' : '选择执行器'}
                clearable
                searchable
                controlStyle={SOURCE_SELECT_TRIGGER_STYLE}
                disabled={executorLoading}
                onChange={(value) => setSelectedExecutorDefId(value || null)}
              />
            </div>
          </ResizableSourceField>
          {!executorLoading && executorList.length === 0 && !error && (
            <span style={{ fontSize: 12, color: '#64748b', padding: '0 4px' }}>暂无可用执行器</span>
          )}

          <ResizableSourceField className="nop-version-diff__source-field nop-version-diff__source-field--method" options={methodOptions}>
            <span style={SOURCE_FIELD_LABEL_STYLE}>方法</span>
            <div className="nop-version-diff__source-field-control">
              <RichSelect
                value={selectedMethodCode ?? ''}
                options={methodOptions}
                placeholder={methodLoading ? '加载中...' : (selectedExecutorDefId ? '选择方法' : '先选择执行器')}
                clearable
                searchable
                controlStyle={SOURCE_SELECT_TRIGGER_STYLE}
                disabled={!selectedExecutorDefId || methodLoading}
                onChange={(value) => {
                  setSelectedMethodCode(value || null)
                  // 切换方法时清空对比结果（版本选择由 useEffect 清空）
                  setDiffResult(null)
                  setError(null)
                }}
              />
            </div>
          </ResizableSourceField>
        </div>

        {/* 选择器区域 - 第二行：版本 A + 交换 + 版本 B + 对比按钮（仅选择方法后显示） */}
        {selectedMethodCode && methodReleaseIds.length > 0 && (
          <div style={SELECTOR_ROW_STYLE}>
            <ResizableSourceField className="nop-version-diff__source-field nop-version-diff__source-field--version" options={versionOptions}>
              <span style={SOURCE_FIELD_LABEL_STYLE}>版本 A</span>
              <div className="nop-version-diff__source-field-control">
                <RichSelect
                  value={versionA ?? ''}
                  options={versionOptions}
                  placeholder={methodLoading ? '加载中...' : '选择版本'}
                  clearable
                  searchable
                  controlStyle={SOURCE_SELECT_TRIGGER_STYLE}
                  disabled={methodReleaseIds.length <= 1}
                  onChange={(value) => {
                    setVersionA(value || null)
                    setDiffResult(null)
                    setError(null)
                  }}
                />
              </div>
            </ResizableSourceField>

            {/* 交换按钮 ⇄ */}
            <button
              type="button"
              onClick={handleSwap}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                border: '1px solid #d8e3ef',
                borderRadius: 4,
                background: '#f8fafc',
                color: '#475569',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="交换版本 A 和版本 B"
            >
              ⇄
            </button>

            <ResizableSourceField className="nop-version-diff__source-field nop-version-diff__source-field--version" options={versionOptions}>
              <span style={SOURCE_FIELD_LABEL_STYLE}>版本 B</span>
              <div className="nop-version-diff__source-field-control">
                <RichSelect
                  value={versionB ?? ''}
                  options={versionOptions}
                  placeholder={methodLoading ? '加载中...' : '选择版本'}
                  clearable
                  searchable
                  controlStyle={SOURCE_SELECT_TRIGGER_STYLE}
                  disabled={methodReleaseIds.length <= 1}
                  onChange={(value) => {
                    setVersionB(value || null)
                    setDiffResult(null)
                    setError(null)
                  }}
                />
              </div>
            </ResizableSourceField>

            {/* 开始对比按钮 */}
            <button
              type="button"
              onClick={fetchDiff}
              disabled={!canCompareVersions || !selectedMethodCode || diffLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 32,
                padding: '0 16px',
                border: '1px solid #2563eb',
                borderRadius: 4,
                background: canCompareVersions && selectedMethodCode && !diffLoading ? '#2563eb' : '#94a3b8',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: canCompareVersions && selectedMethodCode && !diffLoading ? 'pointer' : 'not-allowed',
                opacity: canCompareVersions && selectedMethodCode && !diffLoading ? 1 : 0.6,
                flexShrink: 0,
              }}
            >
              {diffLoading ? '对比中...' : '开始对比'}
            </button>

            {/* 相同版本提示 */}
            {sameVersionSelected && (
              <span style={{ fontSize: 12, color: '#b91c1c', padding: '4px 8px' }}>
                请选择两个不同的版本
              </span>
            )}

            {/* 单版本提示 */}
            {methodReleaseIds.length === 1 && (
              <span style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', padding: '4px 8px', borderRadius: 4 }}>
                该方法仅有一个版本，无法进行对比
              </span>
            )}
          </div>
        )}

        {/* Diff_Result_Panel 区域：加载指示器 */}
        {diffLoading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: 14 }}>
            加载对比结果中...
          </div>
        )}

        {/* 错误提示 */}
        {!diffLoading && error && (
          <div style={ERROR_ALERT_STYLE}>{error}</div>
        )}

        {/* Diff_Result_Panel：对比结果标题与变更摘要 */}
        {!diffLoading && diffResult && (() => {
          const summary = computeDiffSummary(diffResult)
          return (
            <>
              <div style={SECTION_CARD_STYLE}>
                <div style={SECTION_HEADER_STYLE}>
                  <span style={SECTION_TITLE_STYLE}>
                    对比结果: {diffResult.methodCode}  {diffResult.versionA} → {diffResult.versionB}
                  </span>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.keys(CHANGE_TYPE_LABELS).map((key) => (
                      <span key={key}>{countTag(`${CHANGE_TYPE_LABELS[key]}`, summary[key] ?? 0)}</span>
                    ))}
                  </span>
                </div>
              </div>

              {/* 输入参数差异 */}
              <div style={SECTION_CARD_STYLE}>
                <div style={SECTION_HEADER_STYLE}>
                  <span style={SECTION_TITLE_STYLE}>输入参数差异</span>
                </div>
                {diffResult.inputDiffs && diffResult.inputDiffs.length > 0 ? (
                  <table style={TABLE_STYLE}>
                    <thead>
                      <tr>
                        <th style={TH_STYLE}>字段路径</th>
                        <th style={TH_STYLE}>变更类型</th>
                        <th style={TH_STYLE}>旧值</th>
                        <th style={TH_STYLE}>新值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffResult.inputDiffs.map((item: FieldDiffItem, idx: number) => (
                        <tr key={idx}>
                          <td style={TD_STYLE}>{item.fieldPath}</td>
                          <td style={TD_STYLE}>
                            {tagPill(
                              CHANGE_TYPE_LABELS[item.changeType] || item.changeType,
                              CHANGE_TYPE_THEMES[item.changeType] || { background: '#f1f5f9', color: '#334155' },
                            )}
                          </td>
                          <td style={TD_STYLE}>{item.oldValue ?? ''}</td>
                          <td style={TD_STYLE}>{item.newValue ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>无差异</div>
                )}
              </div>

              {/* 输出参数差异 */}
              <div style={SECTION_CARD_STYLE}>
                <div style={SECTION_HEADER_STYLE}>
                  <span style={SECTION_TITLE_STYLE}>输出参数差异</span>
                </div>
                {diffResult.outputDiffs && diffResult.outputDiffs.length > 0 ? (
                  <table style={TABLE_STYLE}>
                    <thead>
                      <tr>
                        <th style={TH_STYLE}>字段路径</th>
                        <th style={TH_STYLE}>变更类型</th>
                        <th style={TH_STYLE}>旧值</th>
                        <th style={TH_STYLE}>新值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffResult.outputDiffs.map((item: FieldDiffItem, idx: number) => (
                        <tr key={idx}>
                          <td style={TD_STYLE}>{item.fieldPath}</td>
                          <td style={TD_STYLE}>
                            {tagPill(
                              CHANGE_TYPE_LABELS[item.changeType] || item.changeType,
                              CHANGE_TYPE_THEMES[item.changeType] || { background: '#f1f5f9', color: '#334155' },
                            )}
                          </td>
                          <td style={TD_STYLE}>{item.oldValue ?? ''}</td>
                          <td style={TD_STYLE}>{item.newValue ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>无差异</div>
                )}
              </div>

              {/* 元数据差异 */}
              <div style={SECTION_CARD_STYLE}>
                <div style={SECTION_HEADER_STYLE}>
                  <span style={SECTION_TITLE_STYLE}>元数据差异</span>
                </div>
                {diffResult.metadataDiffs && diffResult.metadataDiffs.length > 0 ? (
                  <table style={TABLE_STYLE}>
                    <thead>
                      <tr>
                        <th style={TH_STYLE}>字段名称</th>
                        <th style={TH_STYLE}>旧值</th>
                        <th style={TH_STYLE}>新值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffResult.metadataDiffs.map((item: MetadataDiffItem, idx: number) => (
                        <tr key={idx}>
                          <td style={TD_STYLE}>{item.fieldName}</td>
                          <td style={TD_STYLE}>{item.oldValue ?? ''}</td>
                          <td style={TD_STYLE}>{item.newValue ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '12px 16px', color: '#64748b', fontSize: 13 }}>无差异</div>
                )}
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}
