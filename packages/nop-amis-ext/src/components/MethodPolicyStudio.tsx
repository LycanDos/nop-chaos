import type { RendererProps } from 'amis'
import type { ApiObject } from 'amis-core/lib/types'
import { ajaxRequest } from '@nop-chaos/nop-core'
import { PolicyStudio } from '@nop-chaos/policy-studio'
import { Select } from 'amis-ui'
import ElementPlus from 'element-plus'
import React, { useEffect, useMemo, useState } from 'react'
import { applyPureVueInReact } from 'veaury'

type MethodPolicyStudioProps = RendererProps
type NopApi = ApiObject & {
  'gql:selection'?: string
}

type SimpleOption = {
  value: string
  label: string
}

type PolicyPayload = {
  methodId?: string
  methodCode?: string
  methodName?: string
  schemaRole?: string
  fieldPath?: string
  title?: string
  subtitle?: string
  schemaJson?: string
  documentJson?: string
  sampleDataJson?: string
}

type PolicyStudioNavigationPayload = {
  executorDefId?: string
  executorReleaseId?: string
  methodId?: string
  schemaRole?: 'INPUT' | 'OUTPUT'
  fieldPath?: string
}

const POLICY_STUDIO_NAV_STATE_KEY = 'nop:policy-studio:navigation'
const POLICY_STUDIO_NAV_EVENT = 'nop-policy-studio:navigate'

const PolicyStudioInReact = applyPureVueInReact(PolicyStudio as any, {
  beforeVueAppMount(app: any) {
    app.use(ElementPlus)
  },
})

function unwrapGraphqlField(input: any): { matched: boolean, value: any } {
  if (input == null || typeof input !== 'object' || Array.isArray(input))
    return { matched: false, value: input }

  const keys = Object.keys(input)
  if (keys.length !== 1)
    return { matched: false, value: input }

  const key = keys[0]
  if (!key.includes('__'))
    return { matched: false, value: input }

  return {
    matched: true,
    value: input[key],
  }
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

async function callApi(api: NopApi, data: Record<string, any>) {
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

function parseJson(text?: string) {
  if (!text)
    return {}
  try {
    return JSON.parse(text)
  }
  catch {
    return {}
  }
}

function toPlainObject<T>(value: T): T {
  if (value == null)
    return value

  try {
    return structuredClone(value)
  }
  catch {
    try {
      return JSON.parse(JSON.stringify(value)) as T
    }
    catch {
      return value
    }
  }
}

function readPolicyStudioNavigation(): PolicyStudioNavigationPayload | null {
  if (typeof window === 'undefined')
    return null

  const raw = window.sessionStorage.getItem(POLICY_STUDIO_NAV_STATE_KEY)
  if (!raw)
    return null

  try {
    const parsed = JSON.parse(raw) as PolicyStudioNavigationPayload
    window.sessionStorage.removeItem(POLICY_STUDIO_NAV_STATE_KEY)
    return parsed
  }
  catch {
    window.sessionStorage.removeItem(POLICY_STUDIO_NAV_STATE_KEY)
    return null
  }
}

function pickNavigationValue(primary: any, fallback: any) {
  if (primary == null || primary === '')
    return fallback
  return primary
}

function flattenLeafPaths(fields?: any[]): string[] {
  if (!Array.isArray(fields))
    return []

  const results: string[] = []
  fields.forEach((field) => {
    if (!field || typeof field !== 'object')
      return

    if (field.type === 'object') {
      results.push(...flattenLeafPaths(field.fields))
      return
    }

    if (field.type === 'array') {
      if (field.item?.type === 'object') {
        results.push(...flattenLeafPaths(field.item.fields))
      }
      else if (field.path) {
        results.push(String(field.path))
      }
      return
    }

    if (field.path)
      results.push(String(field.path))
  })
  return results
}

function applyDescriptionAsLabel(schema: any): any {
  if (!schema || typeof schema !== 'object')
    return schema

  const result = { ...schema }
  if (Array.isArray(result.fields)) {
    result.fields = result.fields.map((field: any) => applyDescriptionAsLabelField(field))
  }
  return result
}

function applyDescriptionAsLabelField(field: any): any {
  if (!field || typeof field !== 'object')
    return field

  const result = { ...field }
  if (result.description)
    result.label = result.description

  if (Array.isArray(result.fields))
    result.fields = result.fields.map((child: any) => applyDescriptionAsLabelField(child))

  if (result.item && typeof result.item === 'object')
    result.item = applyDescriptionAsLabelField(result.item)

  return result
}

function SearchableSelect(props: {
  value: string
  options: SimpleOption[]
  placeholder: string
  disabled?: boolean
  searchable?: boolean
  onChange: (value: string) => void
}) {
  return (
    <Select
      className="nop-method-policy__select"
      value={props.value || ''}
      options={props.options}
      simpleValue
      clearable
      searchable={props.searchable ?? props.options.length > 6}
      placeholder={props.placeholder}
      noResultsText="没有匹配项"
      searchPromptText="输入关键字筛选"
      loadingPlaceholder="加载中..."
      clearValueText="清空"
      borderMode="none"
      overlayPlacement="left-bottom-left-top"
      controlStyle={POLICY_SELECT_TRIGGER_STYLE}
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

function MethodPolicyStudioView(props: MethodPolicyStudioProps) {
  const data = props.data || {}
  const navigationData = readPolicyStudioNavigation()
  const resolvedData = {
    executorDefId: pickNavigationValue(data.executorDefId, navigationData?.executorDefId),
    executorReleaseId: pickNavigationValue(data.executorReleaseId, navigationData?.executorReleaseId),
    methodId: pickNavigationValue(data.methodId, navigationData?.methodId),
    schemaRole: pickNavigationValue(data.schemaRole, navigationData?.schemaRole),
    fieldPath: pickNavigationValue(data.fieldPath, navigationData?.fieldPath),
  }
  const initialExecutorDefId = String(resolvedData.executorDefId || '')
  const initialExecutorReleaseId = String(resolvedData.executorReleaseId || '')
  const initialMethodId = String(resolvedData.methodId || '')
  const initialSchemaRole = String(resolvedData.schemaRole || 'INPUT').toUpperCase() === 'OUTPUT' ? 'OUTPUT' : 'INPUT'
  const initialFieldPath = String(resolvedData.fieldPath || '')

  const [executorDefId, setExecutorDefId] = useState(initialExecutorDefId)
  const [executorReleaseId, setExecutorReleaseId] = useState(initialExecutorReleaseId)
  const [methodId, setMethodId] = useState(initialMethodId)
  const [schemaRole, setSchemaRole] = useState<'INPUT' | 'OUTPUT'>(initialSchemaRole as 'INPUT' | 'OUTPUT')
  const [fieldPath, setFieldPath] = useState(initialFieldPath)

  const [executorOptions, setExecutorOptions] = useState<SimpleOption[]>([])
  const [releaseOptions, setReleaseOptions] = useState<SimpleOption[]>([])
  const [methodOptions, setMethodOptions] = useState<SimpleOption[]>([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [payload, setPayload] = useState<PolicyPayload | null>(null)
  const [schema, setSchema] = useState<Record<string, any>>({})
  const [documentValue, setDocumentValue] = useState<Record<string, any>>({})
  const [sampleData, setSampleData] = useState<Record<string, any>>({})

  useEffect(() => {
    if (typeof window === 'undefined')
      return

    const handleNavigation = (event: Event) => {
      const detail = (event as CustomEvent<PolicyStudioNavigationPayload>).detail || {}
      if (detail.executorDefId != null)
        setExecutorDefId(String(detail.executorDefId || ''))
      if (detail.executorReleaseId != null)
        setExecutorReleaseId(String(detail.executorReleaseId || ''))
      if (detail.methodId != null)
        setMethodId(String(detail.methodId || ''))
      setSchemaRole(String(detail.schemaRole || 'INPUT').toUpperCase() === 'OUTPUT' ? 'OUTPUT' : 'INPUT')
      setFieldPath(String(detail.fieldPath || ''))
    }

    window.addEventListener(POLICY_STUDIO_NAV_EVENT, handleNavigation as EventListener)
    return () => {
      window.removeEventListener(POLICY_STUDIO_NAV_EVENT, handleNavigation as EventListener)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadExecutors() {
      try {
        const list = await callApi({
          url: '@query:ExecutorDef__findList',
          method: 'post',
          data: {
            limit: 200,
          },
          'gql:selection': 'executorDefId,executorCode,executorName',
        }, {
          limit: 200,
        })

        if (cancelled)
          return

        const options = Array.isArray(list)
          ? list.map((item: any) => ({
              value: String(item.executorDefId || ''),
              label: item.executorCode
                ? `${item.executorCode}${item.executorName ? ` | ${item.executorName}` : ''}`
                : String(item.executorDefId || ''),
            })).filter((item: SimpleOption) => item.value)
          : []
        setExecutorOptions(options)
      }
      catch {
        if (!cancelled)
          setExecutorOptions([])
      }
    }

    loadExecutors()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!executorDefId) {
      setReleaseOptions([])
      if (executorReleaseId)
        setExecutorReleaseId('')
      return
    }

    let cancelled = false

    async function loadReleases() {
      try {
        const list = await callApi({
          url: '@query:ExecutorRelease__findList',
          method: 'post',
          data: {
            filter_executorDefId: executorDefId,
            limit: 200,
          },
          'gql:selection': 'executorReleaseId,releaseVersion',
        }, {
          filter_executorDefId: executorDefId,
          limit: 200,
        })

        if (cancelled)
          return

        const options = Array.isArray(list)
          ? list.map((item: any) => ({
              value: String(item.executorReleaseId || ''),
              label: String(item.releaseVersion || item.executorReleaseId || ''),
            })).filter((item: SimpleOption) => item.value)
          : []
        setReleaseOptions(options)

        if (!options.find(option => option.value === executorReleaseId)) {
          setExecutorReleaseId(options[0]?.value || '')
        }
      }
      catch {
        if (!cancelled)
          setReleaseOptions([])
      }
    }

    loadReleases()
    return () => {
      cancelled = true
    }
  }, [executorDefId])

  useEffect(() => {
    if (!executorReleaseId) {
      setMethodOptions([])
      if (methodId)
        setMethodId('')
      return
    }

    let cancelled = false

    async function loadMethods() {
      try {
        const list = await callApi({
          url: '@query:ExecutorMethod__findList',
          method: 'post',
          data: {
            filter_executorReleaseId: executorReleaseId,
            limit: 500,
          },
          'gql:selection': 'methodId,methodCode,methodName,methodSignature',
        }, {
          filter_executorReleaseId: executorReleaseId,
          limit: 500,
        })

        if (cancelled)
          return

        const options = Array.isArray(list)
          ? list.map((item: any) => ({
              value: String(item.methodId || ''),
              label: item.methodCode
                ? `${item.methodCode}${item.methodName ? ` | ${item.methodName}` : ''}${item.methodSignature ? ` | ${item.methodSignature}` : ''}`
                : String(item.methodId || ''),
            })).filter((item: SimpleOption) => item.value)
          : []
        setMethodOptions(options)

        if (!options.find(option => option.value === methodId)) {
          setMethodId(options[0]?.value || '')
          setFieldPath('')
        }
      }
      catch {
        if (!cancelled)
          setMethodOptions([])
      }
    }

    loadMethods()
    return () => {
      cancelled = true
    }
  }, [executorReleaseId])

  useEffect(() => {
    if (!methodId) {
      setPayload(null)
      setSchema({})
      setDocumentValue({})
      setSampleData({})
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    setNotice('')

    callApi({
      url: '@query:LProcessConsole__loadMethodPolicyStudio',
      method: 'post',
      data: {
        methodId,
        schemaRole,
        fieldPath,
      },
      'gql:selection': 'methodId,methodCode,methodName,schemaRole,fieldPath,title,subtitle,schemaJson,documentJson,sampleDataJson',
    }, {
      methodId,
      schemaRole,
      fieldPath,
    }).then((nextPayload) => {
      if (cancelled)
        return

      const normalizedPayload = (nextPayload || {}) as PolicyPayload
      const nextSchema = applyDescriptionAsLabel(parseJson(normalizedPayload.schemaJson))
      setPayload(normalizedPayload)
      setSchema(nextSchema)
      setDocumentValue(parseJson(normalizedPayload.documentJson))
      setSampleData(parseJson(normalizedPayload.sampleDataJson))
      if (fieldPath && !flattenLeafPaths(nextSchema?.fields).includes(fieldPath))
        setFieldPath('')
    }).catch((err: any) => {
      if (!cancelled)
        setError(err?.message || '加载 PolicyStudio 数据失败')
    }).finally(() => {
      if (!cancelled)
        setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [methodId, schemaRole, fieldPath])

  const fieldOptions = useMemo(() => {
    const paths = flattenLeafPaths(schema?.fields)
    return paths.map(path => ({ value: path, label: path }))
  }, [schema])

  const plainSchema = useMemo(() => toPlainObject(schema), [schema])
  const plainDocumentValue = useMemo(() => toPlainObject(documentValue), [documentValue])
  const plainSampleData = useMemo(() => toPlainObject(sampleData), [sampleData])

  async function savePolicy() {
    if (!methodId)
      return

    setSaving(true)
    setError('')
    setNotice('')
    try {
      const nextPayload = await callApi({
        url: '@mutation:LProcessConsole__saveMethodPolicyStudio',
        method: 'post',
        data: {
          methodId,
          schemaRole,
          fieldPath,
          documentJson: JSON.stringify(documentValue || {}),
        },
        'gql:selection': 'methodId,methodCode,methodName,schemaRole,fieldPath,title,subtitle,schemaJson,documentJson,sampleDataJson',
      }, {
        methodId,
        schemaRole,
        fieldPath,
        documentJson: JSON.stringify(documentValue || {}),
      })

      const normalizedPayload = (nextPayload || {}) as PolicyPayload
      setPayload(normalizedPayload)
      setSchema(applyDescriptionAsLabel(parseJson(normalizedPayload.schemaJson)))
      setDocumentValue(parseJson(normalizedPayload.documentJson))
      setSampleData(parseJson(normalizedPayload.sampleDataJson))
      setNotice('Policy 已保存。')
    }
    catch (err: any) {
      setError(err?.message || '保存 Policy 失败')
    }
    finally {
      setSaving(false)
    }
  }

  return (
    <div style={PAGE_STYLE}>
      <style>{POLICY_STUDIO_PAGE_CSS}</style>

      <section style={HEADER_CARD_STYLE}>
        <div style={HEADER_ROW_STYLE}>
          <div>
            <div style={TITLE_STYLE}>PolicyStudio</div>
            <div style={SUBTITLE_STYLE}>
              方法级入参 / 出参 Policy 编辑器，可从菜单直接进入，也可由工作台操作跳转。
            </div>
          </div>
          <div style={ACTION_ROW_STYLE}>
            <button type="button" style={ROLE_BUTTON_STYLE(schemaRole === 'INPUT')} onClick={() => setSchemaRole('INPUT')}>
              入参
            </button>
            <button type="button" style={ROLE_BUTTON_STYLE(schemaRole === 'OUTPUT')} onClick={() => setSchemaRole('OUTPUT')}>
              出参
            </button>
            <button type="button" style={PRIMARY_BUTTON_STYLE} onClick={savePolicy} disabled={!methodId || saving || loading}>
              {saving ? '保存中...' : '保存 Policy'}
            </button>
          </div>
        </div>

        <div className="nop-method-policy__filters">
          <div className={`nop-method-policy__field${!executorOptions.length ? ' is-disabled' : ''}`}>
            <span className="nop-method-policy__label">执行器</span>
            <div className="nop-method-policy__control-shell">
              <SearchableSelect
                value={executorDefId}
                options={executorOptions}
                placeholder="搜索执行器编码、名称"
                searchable
                onChange={setExecutorDefId}
              />
            </div>
          </div>

          <div className={`nop-method-policy__field${!executorDefId ? ' is-disabled' : ''}`}>
            <span className="nop-method-policy__label">版本</span>
            <div className="nop-method-policy__control-shell">
              <SearchableSelect
                value={executorReleaseId}
                options={releaseOptions}
                placeholder={executorDefId ? '搜索或选择版本' : '先选择执行器'}
                disabled={!executorDefId}
                searchable={releaseOptions.length > 5}
                onChange={setExecutorReleaseId}
              />
            </div>
          </div>

          <div className={`nop-method-policy__field nop-method-policy__field--wide${!executorReleaseId ? ' is-disabled' : ''}`}>
            <span className="nop-method-policy__label">方法</span>
            <div className="nop-method-policy__control-shell">
              <SearchableSelect
                value={methodId}
                options={methodOptions}
                placeholder={executorReleaseId ? '搜索方法编码、名称、签名' : '先选择版本'}
                disabled={!executorReleaseId}
                searchable
                onChange={setMethodId}
              />
            </div>
          </div>

          <div className={`nop-method-policy__field nop-method-policy__field--wide${!methodId || !fieldOptions.length ? ' is-disabled' : ''}`}>
            <span className="nop-method-policy__label">字段聚焦</span>
            <div className="nop-method-policy__control-shell">
              <SearchableSelect
                value={fieldPath}
                options={fieldOptions}
                placeholder={methodId ? '搜索字段路径，默认查看全部' : '先选择方法'}
                disabled={!methodId || !fieldOptions.length}
                searchable
                onChange={setFieldPath}
              />
            </div>
          </div>
        </div>

        {payload && (
          <div style={META_STYLE}>
            <span>{payload.title || '-'}</span>
            <span>{payload.subtitle || '-'}</span>
          </div>
        )}
      </section>

      {error && <div style={ERROR_STYLE}>{error}</div>}
      {notice && <div style={NOTICE_STYLE}>{notice}</div>}

      {!methodId && (
        <div style={EMPTY_STYLE}>
          先选择执行器版本和方法，再查看对应的 Policy。
        </div>
      )}

      {methodId && loading && (
        <div style={EMPTY_STYLE}>
          正在加载 PolicyStudio 数据...
        </div>
      )}

      {methodId && !loading && payload && (
        <section style={STUDIO_CARD_STYLE}>
          {React.createElement(PolicyStudioInReact as any, {
            schema: plainSchema,
            modelValue: plainDocumentValue,
            sampleData: plainSampleData,
            'onUpdate:modelValue': (nextValue: Record<string, any>) => setDocumentValue(toPlainObject(nextValue || {})),
            'onUpdate:sampleData': (nextValue: Record<string, any>) => setSampleData(toPlainObject(nextValue || {})),
          })}
        </section>
      )}
    </div>
  )
}

const PAGE_STYLE: React.CSSProperties = {
  display: 'grid',
  gap: 12,
}

const HEADER_CARD_STYLE: React.CSSProperties = {
  border: '1px solid #dbe2ea',
  borderRadius: 4,
  background: '#fff',
  padding: 10,
  display: 'grid',
  gap: 8,
}

const STUDIO_CARD_STYLE: React.CSSProperties = {
  border: '1px solid #dbe2ea',
  borderRadius: 4,
  background: '#fff',
  padding: 8,
  minHeight: 640,
}

const HEADER_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
}

const ACTION_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
}

const TITLE_STYLE: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#0f172a',
}

const POLICY_SELECT_TRIGGER_STYLE: React.CSSProperties = {
  width: '100%',
}

const SUBTITLE_STYLE: React.CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: '#64748b',
  lineHeight: '20px',
}

const META_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  fontSize: 12,
  color: '#475569',
}

const ERROR_STYLE: React.CSSProperties = {
  border: '1px solid #fecaca',
  borderRadius: 4,
  background: '#fef2f2',
  color: '#b91c1c',
  padding: '10px 12px',
}

const NOTICE_STYLE: React.CSSProperties = {
  border: '1px solid #bbf7d0',
  borderRadius: 4,
  background: '#f0fdf4',
  color: '#166534',
  padding: '10px 12px',
}

const EMPTY_STYLE: React.CSSProperties = {
  border: '1px dashed #cbd5e1',
  borderRadius: 4,
  background: '#fff',
  color: '#64748b',
  padding: '32px 20px',
  textAlign: 'center',
}

const PRIMARY_BUTTON_STYLE: React.CSSProperties = {
  border: '1px solid #2563eb',
  borderRadius: 4,
  background: '#2563eb',
  color: '#fff',
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

function ROLE_BUTTON_STYLE(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? '#2563eb' : '#cbd5e1'}`,
    borderRadius: 4,
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1d4ed8' : '#334155',
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

const POLICY_STUDIO_PAGE_CSS = `
  .nop-method-policy__filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 6px;
  }
  .nop-method-policy__field {
    display: flex;
    align-items: stretch;
    min-width: 0;
    height: 32px;
    padding: 0;
    border: 1px solid #d8e3ef;
    border-radius: 4px;
    background: #fff;
    overflow: hidden;
    transition: border-color 0.18s ease;
  }
  .nop-method-policy__field--wide {
    grid-column: span 2;
  }
  .nop-method-policy__field:focus-within {
    border-color: #2563eb;
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.3);
  }
  .nop-method-policy__field.is-disabled {
    background: #f8fafc;
  }
  .nop-method-policy__label {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    padding: 0 8px;
    background: #e8f1ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .nop-method-policy__control-shell {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    padding: 0 4px 0 6px;
    background: transparent;
  }
  .nop-method-policy__select,
  .nop-method-policy__select .cxd-Select {
    width: 100%;
  }
  .nop-method-policy__select .cxd-Select {
    min-height: 28px;
    background: transparent;
    position: relative;
  }
  .nop-method-policy__select .cxd-Select-valueWrap {
    min-height: 28px;
    padding-left: 2px;
    display: flex;
    align-items: center;
  }
  .nop-method-policy__select .cxd-Select-input {
    margin: 0;
  }
  .nop-method-policy__select .cxd-Select-placeholder,
  .nop-method-policy__select .cxd-Select-valueLabel,
  .nop-method-policy__select .cxd-Select-input input {
    font-size: 12px;
    color: #0f172a;
    line-height: 28px;
  }
  .nop-method-policy__select .cxd-Select-placeholder,
  .nop-method-policy__select .cxd-Select.is-disabled .cxd-Select-valueLabel {
    color: #94a3b8;
  }
  .nop-method-policy__select .cxd-Select-arrow,
  .nop-method-policy__select .cxd-Select-clear {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
  }
  .nop-method-policy__select .cxd-Select.is-disabled {
    cursor: not-allowed;
  }
  @media (max-width: 960px) {
    .nop-method-policy__field--wide {
      grid-column: span 1;
    }
    .nop-method-policy__field {
      height: 32px;
    }
    .nop-method-policy__label {
      min-width: 42px;
      padding: 0 6px;
    }
  }
`

export default MethodPolicyStudioView
