import type { RendererProps } from 'amis'
import type { IServiceStore } from 'amis'
import type { ApiObject } from 'amis-core/lib/types'
import { ajaxRequest } from '@nop-chaos/nop-core'
import { Select } from 'amis-ui'
import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'

type ConsoleSourceMode = 'existing' | 'upload'

type ExecutorSnapshot = {
  executorDefId?: string
  executorReleaseId?: string
  fileId?: string
  executorCode?: string
  executorName?: string
  parseStatus?: string
  language?: string
  releaseVersion?: string
  entryType?: string
  compatLevel?: string
  mainClass?: string
  description?: string
  configCount?: number
  methodCount?: number
  inputFieldCount?: number
  outputFieldCount?: number
  configs?: ConfigItem[]
  methods?: MethodItem[]
  fields?: FieldItem[]
}

type ConfigItem = {
  configSpecId?: string
  configKey?: string
  configName?: string
  configType?: string
  required?: boolean
  secretFlag?: boolean
  defaultValue?: string
  description?: string
  remark?: string
}

type MethodItem = {
  methodId?: string
  methodCode?: string
  methodName?: string
  methodSignature?: string
  description?: string
  returnJavaType?: string
  invokeMode?: string
  idempotentFlag?: boolean
  inputCount?: number
  outputCount?: number
  remark?: string
}

type FieldItem = {
  fieldId?: string
  methodId?: string
  methodCode?: string
  methodName?: string
  schemaRole?: string
  fieldName?: string
  fieldPath?: string
  dataType?: string
  javaType?: string
  required?: boolean
  defaultValue?: string
  description?: string
  parentFieldId?: string
  sortNo?: number
  schemaJson?: string
  remark?: string
}

type SimpleOption = {
  value: string
  label: string
}

type ExecutorDraft = {
  executorCode: string
  executorName: string
  language: string
  releaseVersion: string
  mainClass: string
  entryType: string
  description: string
}

type ConfigSearchScope =
  | 'configKey'
  | 'configName'
  | 'configType'
  | 'required'
  | 'secretFlag'
  | 'defaultValue'
  | 'description'
  | 'remark'

type MethodSearchScope =
  | 'summary'
  | 'methodCode'
  | 'methodName'
  | 'methodSignature'
  | 'returnJavaType'
  | 'invokeMode'
  | 'idempotentFlag'
  | 'description'
  | 'remark'

type ParamSearchScope =
  | 'method'
  | 'role'
  | 'fieldName'
  | 'fieldPath'
  | 'dataType'
  | 'javaType'
  | 'required'
  | 'defaultValue'
  | 'description'
  | 'remark'

type SearchFilter<T extends string> = {
  scope: T | 'all'
  keyword: string
}

type ColumnDef<T extends string> = {
  key: T
  label: string
  width?: number
}

type ScopeOption<T extends string> = {
  label: string
  value: T | 'all'
}

type ColumnWidths<T extends string> = Record<T, number>

type ParamColumnKey =
  | 'method'
  | 'role'
  | 'fieldName'
  | 'fieldPath'
  | 'dataType'
  | 'javaType'
  | 'required'
  | 'defaultValue'
  | 'description'
  | 'remark'

type ConfigColumnKey =
  | 'configKey'
  | 'configName'
  | 'configType'
  | 'required'
  | 'secretFlag'
  | 'defaultValue'
  | 'description'
  | 'remark'

type MethodColumnKey =
  | 'summary'
  | 'returnJavaType'
  | 'invokeMode'
  | 'idempotentFlag'
  | 'inputCount'
  | 'outputCount'
  | 'remark'

type ColumnVisibility<T extends string> = Record<T, boolean>
type ColumnFixed<T extends string> = Partial<Record<T, 'left' | 'right'>>
type TableDensity = 'default' | 'compact' | 'loose'

type MethodParamGroup = {
  method: MethodItem
  roleGroups: Array<{
    role: 'INPUT' | 'OUTPUT'
    rows: FieldItem[]
  }>
  rowCount: number
}

type LProcessConsoleV2Props = RendererProps
type NopApi = ApiObject & {
  'gql:selection'?: string
}
type EditDialogState =
  | { kind: 'config', item: ConfigItem }
  | { kind: 'method', item: MethodItem }
  | { kind: 'field', item: FieldItem }
  | null

const SNAPSHOT_SELECTION = [
  'executorDefId',
  'executorReleaseId',
  'fileId',
  'executorCode',
  'executorName',
  'parseStatus',
  'language',
  'releaseVersion',
  'entryType',
  'compatLevel',
  'mainClass',
  'description',
  'configCount',
  'methodCount',
  'inputFieldCount',
  'outputFieldCount',
  'configs{configSpecId,configKey,configName,configType,required,secretFlag,defaultValue,description,remark}',
  'methods{methodId,methodCode,methodName,methodSignature,description,returnJavaType,invokeMode,idempotentFlag,inputCount,outputCount,remark}',
  'fields{fieldId,methodId,methodCode,methodName,schemaRole,fieldName,fieldPath,dataType,javaType,required,defaultValue,description,parentFieldId,sortNo,schemaJson,remark}',
].join(',')

const CONFIG_COLUMNS: ColumnDef<ConfigColumnKey>[] = [
  { key: 'configKey', label: '配置键', width: 160 },
  { key: 'configName', label: '配置名称', width: 160 },
  { key: 'configType', label: '类型', width: 100 },
  { key: 'required', label: '必填', width: 74 },
  { key: 'secretFlag', label: '敏感', width: 74 },
  { key: 'defaultValue', label: '默认值', width: 140 },
  { key: 'description', label: '描述', width: 200 },
  { key: 'remark', label: '备注', width: 160 },
]

const METHOD_COLUMNS: ColumnDef<MethodColumnKey>[] = [
  { key: 'summary', label: '方法', width: 320 },
  { key: 'returnJavaType', label: '返回类型', width: 124 },
  { key: 'invokeMode', label: '调用', width: 92 },
  { key: 'idempotentFlag', label: '幂等', width: 74 },
  { key: 'inputCount', label: '入参', width: 72 },
  { key: 'outputCount', label: '出参', width: 72 },
  { key: 'remark', label: '备注', width: 160 },
]

const PARAM_COLUMNS: ColumnDef<ParamColumnKey>[] = [
  { key: 'method', label: '方法', width: 280 },
  { key: 'role', label: '分组', width: 74 },
  { key: 'fieldName', label: '参数名', width: 132 },
  { key: 'fieldPath', label: '路径', width: 180 },
  { key: 'dataType', label: '数据类型', width: 120 },
  { key: 'javaType', label: 'Java类型', width: 156 },
  { key: 'required', label: '必填', width: 74 },
  { key: 'defaultValue', label: '默认值', width: 132 },
  { key: 'description', label: '描述', width: 180 },
  { key: 'remark', label: '备注', width: 160 },
]

const DEFAULT_CONFIG_COLUMNS = makeVisibleMap(CONFIG_COLUMNS)
const DEFAULT_METHOD_COLUMNS = makeVisibleMap(METHOD_COLUMNS)
const DEFAULT_PARAM_COLUMNS = makeVisibleMap(PARAM_COLUMNS)
const DEFAULT_CONFIG_WIDTHS = makeWidthMap(CONFIG_COLUMNS)
const DEFAULT_METHOD_WIDTHS = makeWidthMap(METHOD_COLUMNS)
const DEFAULT_PARAM_WIDTHS = makeWidthMap(PARAM_COLUMNS)

DEFAULT_CONFIG_COLUMNS.remark = false
DEFAULT_METHOD_COLUMNS.remark = false
DEFAULT_PARAM_COLUMNS.remark = false

const EMPTY_CONFIG_FILTER: SearchFilter<ConfigSearchScope> = {
  scope: 'all',
  keyword: '',
}

const EMPTY_METHOD_FILTER: SearchFilter<MethodSearchScope> = {
  scope: 'all',
  keyword: '',
}

const EMPTY_PARAM_FILTER: SearchFilter<ParamSearchScope> = {
  scope: 'all',
  keyword: '',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  border: '1px solid #d1d5db',
  borderRadius: 2,
  padding: '4px 6px',
  fontSize: 12,
  lineHeight: '16px',
  background: '#fff',
  color: '#111827',
}

const SECTION_CARD_STYLE: React.CSSProperties = {
  border: '1px solid #dbe1ea',
  borderRadius: 2,
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

const PANEL_BODY_STYLE: React.CSSProperties = {
  padding: 8,
  display: 'grid',
  gap: 4,
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

const STICKY_SECTION_STYLE: React.CSSProperties = {
  ...SECTION_CARD_STYLE,
  overflow: 'visible',
}

const ERROR_ALERT_STYLE: React.CSSProperties = {
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#b91c1c',
  borderRadius: 6,
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

const SEARCH_TOOLBAR_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'nowrap',
  minWidth: 0,
  overflowX: 'auto',
}

const SEARCH_GROUP_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  flex: '1 1 320px',
  minWidth: 260,
  height: 30,
  border: '1px solid #d1d5db',
  borderRadius: 2,
  background: '#fff',
  overflow: 'hidden',
}

const SEARCH_PREFIX_STYLE: React.CSSProperties = {
  flex: '0 0 auto',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 8px',
  borderRight: '1px solid #e5e7eb',
  background: '#f8fafc',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  whiteSpace: 'nowrap',
}

const SEARCH_INPUT_STYLE: React.CSSProperties = {
  flex: '1 1 260px',
  minWidth: 160,
  height: 30,
  border: 0,
  borderRadius: 0,
  padding: '0 8px',
  outline: 'none',
  background: 'transparent',
  fontSize: 12,
  color: '#111827',
}

const SEARCH_SCOPE_TRIGGER_STYLE: React.CSSProperties = {
  width: 132,
  minWidth: 132,
  borderRight: '1px solid #e5e7eb',
}

const SOURCE_SELECT_TRIGGER_STYLE: React.CSSProperties = {
  width: '100%',
}

const SOURCE_FIELD_LABEL_STYLE: React.CSSProperties = {
  flex: '0 0 auto',
  fontSize: 12,
  fontWeight: 600,
  color: '#64748b',
  lineHeight: '18px',
  whiteSpace: 'nowrap',
  minWidth: 42,
  textAlign: 'right',
}

const SECTION_HEAD_MAIN_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 8,
  flexWrap: 'wrap',
}

const TABLE_SCROLL_STYLE: React.CSSProperties = {
  overflowX: 'auto',
}

const CHOOSER_ROOT_STYLE: React.CSSProperties = {
  position: 'relative',
}

const CHOOSER_PANEL_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  boxShadow: '0 18px 48px rgba(15, 23, 42, 0.16)',
  padding: 14,
}

const CHOOSER_HEADER_STYLE: React.CSSProperties = {
  display: 'grid',
  gap: 10,
}

const CHOOSER_TITLE_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#475569',
}

const CHOOSER_DENSITY_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
}

const CHOOSER_DENSITY_GROUP_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 6,
}

const CHOOSER_LIST_STYLE: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  marginTop: 10,
}

const CHOOSER_FOOTER_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  paddingTop: 10,
  marginTop: 10,
  borderTop: '1px solid #e5e7eb',
}

const MODAL_OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(15, 23, 42, 0.32)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
}

const MODAL_HEADER_STYLE: React.CSSProperties = {
  ...SECTION_HEADER_STYLE,
  position: 'sticky',
  top: 0,
  zIndex: 2,
}

const MODAL_BODY_STYLE: React.CSSProperties = {
  padding: 20,
}

const MODAL_FORM_GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
  gap: 16,
}

const MODAL_FOOTER_STYLE: React.CSSProperties = {
  padding: '0 20px 20px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
}

const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  minHeight: 88,
  resize: 'vertical',
}

const FULL_WIDTH_TEXTAREA_STYLE: React.CSSProperties = {
  ...TEXTAREA_STYLE,
  gridColumn: '1 / -1',
}

const LPROCESS_V2_CSS = `
  .nop-lprocess-v2-page > .cxd-Page-header {
    display: none !important;
  }
  .nop-lprocess-v2-page > .cxd-Page-body {
    padding-top: 4px;
    padding-bottom: 6px;
  }
  .nop-lprocess-v2__sticky {
    position: sticky;
    z-index: 40;
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.05);
  }
  .nop-lprocess-v2__sticky-body {
    display: grid;
    gap: 5px;
    padding: 6px 8px 7px;
    background: #f8fafc;
  }
  .nop-lprocess-v2__sticky-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .nop-lprocess-v2__sticky-head {
    display: grid;
    gap: 4px;
    min-width: 0;
    flex: 0 1 auto;
  }
  .nop-lprocess-v2__sticky-head-main {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .nop-lprocess-v2__sticky-title {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    line-height: 16px;
    min-width: 0;
  }
  .nop-lprocess-v2__sticky-tags {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .nop-lprocess-v2__sticky-controls {
    display: grid;
    gap: 6px;
    width: 100%;
  }
  .nop-lprocess-v2__source-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
    width: 100%;
  }
  .nop-lprocess-v2__source-mode {
    flex: 0 0 auto;
  }
  .nop-lprocess-v2__source-field {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    min-height: 30px;
    padding: 0 6px;
    border: 1px solid #cbd5e1;
    border-radius: 2px;
    background: #fff;
  }
  .nop-lprocess-v2__source-field--executor {
    flex: 1 1 360px;
    min-width: 300px;
  }
  .nop-lprocess-v2__source-field--release {
    flex: 0 1 220px;
    min-width: 200px;
  }
  .nop-lprocess-v2__source-field--upload {
    flex: 1 1 360px;
    min-width: 280px;
  }
  .nop-lprocess-v2__source-field-control {
    flex: 1 1 auto;
    min-width: 0;
  }
  .nop-lprocess-v2__rich-select,
  .nop-lprocess-v2__rich-select .cxd-Select {
    width: 100%;
  }
  .nop-lprocess-v2__rich-select .cxd-Select {
    min-height: 28px;
    background: transparent;
  }
  .nop-lprocess-v2__rich-select .cxd-Select-valueWrap {
    min-height: 28px;
    padding-left: 0;
  }
  .nop-lprocess-v2__rich-select .cxd-Select-input {
    margin: 0;
  }
  .nop-lprocess-v2__rich-select .cxd-Select-placeholder,
  .nop-lprocess-v2__rich-select .cxd-Select-valueLabel,
  .nop-lprocess-v2__rich-select .cxd-Select-input input {
    font-size: 12px;
  }
  .nop-lprocess-v2__rich-select .cxd-Select-arrow,
  .nop-lprocess-v2__rich-select .cxd-Select-clear {
    right: 0;
  }
  .nop-lprocess-v2__source-field:focus-within {
    border-color: #2563eb;
    box-shadow: inset 0 0 0 1px #2563eb;
  }
  .nop-lprocess-v2__source-action {
    flex: 0 0 auto;
  }
  .nop-lprocess-v2__source-field .cxd-Form-item,
  .nop-lprocess-v2__source-field .cxd-Form-control,
  .nop-lprocess-v2__source-field .cxd-Form-value,
  .nop-lprocess-v2__source-field .cxd-InputFile,
  .nop-lprocess-v2__source-field .cxd-Button,
  .nop-lprocess-v2__source-field .cxd-SelectControl,
  .nop-lprocess-v2__source-field .cxd-ButtonGroupSelect,
  .nop-lprocess-v2__source-action .cxd-Form-item,
  .nop-lprocess-v2__source-action .cxd-Form-control,
  .nop-lprocess-v2__source-action .cxd-Form-value,
  .nop-lprocess-v2__source-action .cxd-InputFile,
  .nop-lprocess-v2__source-action .cxd-Button,
  .nop-lprocess-v2__source-action .cxd-SelectControl,
  .nop-lprocess-v2__source-action .cxd-ButtonGroupSelect {
    margin: 0 !important;
    min-width: 0;
    width: 100%;
  }
  .nop-lprocess-v2__source-field .cxd-Button,
  .nop-lprocess-v2__source-field .cxd-SelectControl,
  .nop-lprocess-v2__source-field .cxd-InputFile-control,
  .nop-lprocess-v2__source-action .cxd-Button,
  .nop-lprocess-v2__source-action .cxd-SelectControl,
  .nop-lprocess-v2__source-action .cxd-InputFile-control {
    min-height: 28px;
    border-radius: 2px;
  }
  .nop-lprocess-v2__source-field .cxd-PopOver,
  .nop-lprocess-v2__source-field .cxd-PopOverAble-popover,
  .nop-lprocess-v2__source-field .cxd-Select-menu,
  .nop-lprocess-v2__source-action .cxd-PopOver,
  .nop-lprocess-v2__source-action .cxd-PopOverAble-popover,
  .nop-lprocess-v2__source-action .cxd-Select-menu {
    z-index: 1200 !important;
  }
  .nop-lprocess-v2__mode-switch {
    display: inline-flex;
    border: 1px solid #cbd5e1;
    border-radius: 2px;
    overflow: hidden;
    background: #fff;
  }
  .nop-lprocess-v2__mode-switch button {
    border: 0;
    background: transparent;
    color: #475569;
    min-height: 30px;
    padding: 0 10px;
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
    cursor: pointer;
  }
  .nop-lprocess-v2__mode-switch button + button {
    border-left: 1px solid #e2e8f0;
  }
  .nop-lprocess-v2__mode-switch button.is-active {
    background: #e8f1ff;
    color: #1d4ed8;
    font-weight: 600;
  }
  .nop-lprocess-v2__sticky-meta {
    display: flex;
    gap: 6px 12px;
    flex-wrap: wrap;
    align-items: center;
    min-width: 0;
  }
  .nop-lprocess-v2__sticky-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    max-width: 100%;
  }
  .nop-lprocess-v2__sticky-meta-label {
    flex: 0 0 auto;
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
  }
  .nop-lprocess-v2__sticky-meta-value {
    min-width: 0;
    max-width: 720px;
    font-size: 12px;
    color: #0f172a;
    line-height: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .nop-lprocess-v2__sticky-meta-item--wide {
    flex: 1 1 280px;
  }
  .nop-lprocess-v2__notice {
    padding: 6px 8px 7px;
  }
  .nop-lprocess-v2__hint-box {
    padding: 6px 8px;
    border: 1px dashed #cbd5e1;
    border-radius: 2px;
    background: #fff;
    color: #64748b;
    text-align: center;
    line-height: 16px;
  }
  .nop-lprocess-v2__method-summary {
    display: grid;
    gap: 1px;
  }
  .nop-lprocess-v2__method-summary-head {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    max-width: 100%;
  }
  .nop-lprocess-v2__method-summary-secondary {
    color: #475569;
    line-height: 16px;
  }
  .nop-lprocess-v2__method-summary-desc {
    color: #64748b;
    line-height: 16px;
  }
  .nop-lprocess-v2__mark {
    background: #fff3bf;
    color: inherit;
    padding: 0 1px;
    border-radius: 2px;
  }
  .nop-lprocess-v2__chooser-panel-label {
    font-size: 12px;
    color: #64748b;
  }
  .nop-lprocess-v2__chooser-row {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto auto auto auto;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    color: #0f172a;
  }
  .nop-lprocess-v2__chooser-handle {
    color: #64748b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .nop-lprocess-v2__chooser-label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .nop-lprocess-v2__chooser-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .nop-lprocess-v2__field {
    display: grid;
    gap: 6px;
  }
  .nop-lprocess-v2__field-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
  }
  .nop-lprocess-v2__section-link {
    border: 0;
    padding: 0;
    background: transparent;
    color: #2563eb;
    font-size: 12px;
    line-height: 16px;
    min-height: 20px;
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    white-space: nowrap;
  }
  .nop-lprocess-v2__section-link--muted {
    color: #64748b;
  }
  .nop-lprocess-v2__search-scope {
    display: inline-flex;
    align-items: stretch;
    min-width: 132px;
    height: 100%;
  }
  .nop-lprocess-v2__compact-select {
    position: relative;
    width: 100%;
    min-width: 0;
  }
  .nop-lprocess-v2__compact-select-trigger {
    width: 100%;
    min-width: 0;
    min-height: 28px;
    border: 0;
    padding: 0 8px;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #0f172a;
    cursor: pointer;
    text-align: left;
  }
  .nop-lprocess-v2__compact-select-trigger.is-disabled {
    color: #94a3b8;
    cursor: not-allowed;
  }
  .nop-lprocess-v2__compact-select-trigger.is-placeholder .nop-lprocess-v2__compact-select-text {
    color: #94a3b8;
  }
  .nop-lprocess-v2__compact-select-text {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    line-height: 18px;
  }
  .nop-lprocess-v2__compact-select-caret {
    flex: 0 0 auto;
    color: #64748b;
    transition: transform 0.16s ease;
  }
  .nop-lprocess-v2__compact-select-caret.is-open {
    transform: rotate(180deg);
  }
  .nop-lprocess-v2__select-panel {
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    box-shadow: 0 14px 40px rgba(15, 23, 42, 0.14);
    padding: 4px;
    overflow: auto;
  }
  .nop-lprocess-v2__select-option {
    width: 100%;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: #0f172a;
    padding: 6px 8px;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    text-align: left;
    cursor: pointer;
  }
  .nop-lprocess-v2__select-option:hover {
    background: #f8fafc;
  }
  .nop-lprocess-v2__select-option.is-active {
    background: #e8f1ff;
    color: #1d4ed8;
    font-weight: 600;
  }
  .nop-lprocess-v2__select-option-label {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    line-height: 18px;
  }
  .nop-lprocess-v2__select-option-check {
    flex: 0 0 auto;
    font-size: 12px;
    line-height: 16px;
  }
  .nop-lprocess-v2__dialog-title {
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    line-height: 24px;
  }
  .nop-lprocess-v2__dialog-subtitle {
    line-height: 18px;
    margin-top: 4px;
    font-size: 13px;
    color: #64748b;
  }
  @media (max-width: 960px) {
    .nop-lprocess-v2__sticky {
      top: 0;
    }
    .nop-lprocess-v2__source-row {
      align-items: stretch;
    }
    .nop-lprocess-v2__source-field {
      flex: 1 1 100%;
      min-width: 0;
    }
    .nop-lprocess-v2__source-field--executor,
    .nop-lprocess-v2__source-field--release,
    .nop-lprocess-v2__source-field--upload {
      min-width: 0;
    }
    .nop-lprocess-v2__sticky-meta-value {
      max-width: 100%;
    }
  }
`

const EXECUTOR_HEADER_MODAL_STYLE: React.CSSProperties = {
  width: 'min(760px, 100%)',
  maxHeight: '85vh',
  overflow: 'auto',
  background: '#fff',
  borderRadius: 8,
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
  border: '1px solid #dbe2ea',
}

const OPERATION_COLUMN_WIDTH = 52

const LANGUAGE_OPTIONS = [
  { label: 'Java', value: 'java' },
  { label: 'Python', value: 'python' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Shell', value: 'shell' },
]

const ENTRY_TYPE_OPTIONS = [
  { label: 'CLASS', value: 'CLASS' },
  { label: 'HTTP', value: 'HTTP' },
  { label: 'SCRIPT', value: 'SCRIPT' },
  { label: 'FUNCTION', value: 'FUNCTION' },
]

const CONFIG_SEARCH_OPTIONS: ScopeOption<ConfigSearchScope>[] = [
  { label: '全部字段', value: 'all' },
  { label: '配置键', value: 'configKey' },
  { label: '配置名称', value: 'configName' },
  { label: '配置类型', value: 'configType' },
  { label: '必填', value: 'required' },
  { label: '敏感', value: 'secretFlag' },
  { label: '默认值', value: 'defaultValue' },
  { label: '描述', value: 'description' },
  { label: '备注', value: 'remark' },
]

const METHOD_SEARCH_OPTIONS: ScopeOption<MethodSearchScope>[] = [
  { label: '全部字段', value: 'all' },
  { label: '方法摘要', value: 'summary' },
  { label: '方法编码', value: 'methodCode' },
  { label: '方法名称', value: 'methodName' },
  { label: '方法签名', value: 'methodSignature' },
  { label: '返回类型', value: 'returnJavaType' },
  { label: '调用方式', value: 'invokeMode' },
  { label: '幂等', value: 'idempotentFlag' },
  { label: '描述', value: 'description' },
  { label: '备注', value: 'remark' },
]

const PARAM_SEARCH_OPTIONS: ScopeOption<ParamSearchScope>[] = [
  { label: '全部字段', value: 'all' },
  { label: '所属方法', value: 'method' },
  { label: '参数角色', value: 'role' },
  { label: '参数名', value: 'fieldName' },
  { label: '参数路径', value: 'fieldPath' },
  { label: '数据类型', value: 'dataType' },
  { label: 'Java类型', value: 'javaType' },
  { label: '必填', value: 'required' },
  { label: '默认值', value: 'defaultValue' },
  { label: '描述', value: 'description' },
  { label: '备注', value: 'remark' },
]

function makeVisibleMap<T extends string>(columns: ColumnDef<T>[]): ColumnVisibility<T> {
  const ret = {} as ColumnVisibility<T>
  columns.forEach(column => {
    ret[column.key] = true
  })
  return ret
}

function makeWidthMap<T extends string>(columns: ColumnDef<T>[]): ColumnWidths<T> {
  const ret = {} as ColumnWidths<T>
  columns.forEach((column) => {
    ret[column.key] = column.width || 160
  })
  return ret
}

function lower(value?: string | null) {
  return value == null ? '' : String(value).toLowerCase()
}

function textContains(source: string, keyword: string) {
  return !keyword || source.includes(keyword)
}

function normalizedKeyword(value?: string | null) {
  return lower(value).trim()
}

function highlightText(value: React.ReactNode, keyword?: string | null) {
  if (value == null || value === '')
    return value

  const text = String(value)
  const hit = normalizedKeyword(keyword)
  if (!hit)
    return text

  const source = text.toLowerCase()
  const parts: React.ReactNode[] = []
  let start = 0
  let index = source.indexOf(hit)

  if (index < 0)
    return text

  while (index >= 0) {
    if (index > start)
      parts.push(text.slice(start, index))

    const matched = text.slice(index, index + hit.length)
    parts.push(<mark key={`${index}-${matched}`} className="nop-lprocess-v2__mark">{matched}</mark>)
    start = index + hit.length
    index = source.indexOf(hit, start)
  }

  if (start < text.length)
    parts.push(text.slice(start))

  return parts
}

function normalizeBoolText(value?: boolean | null) {
  if (value == null)
    return ''
  return value ? 'true' : 'false'
}

function toDisplayBool(value?: boolean | null) {
  if (value == null)
    return '-'
  return value ? '是' : '否'
}

function boolSearchText(value?: boolean | null) {
  if (value == null)
    return ''
  return value ? 'true 是' : 'false 否'
}

function valueOfOption(options: { label: string, value: string }[], value?: string | null) {
  if (!value)
    return ''
  const hit = options.find(option => option.value === value)
  return hit?.value || value
}

function configTypeTheme(value?: string | null) {
  const normalized = lower(value)
  if (normalized === 'string') {
    return { background: '#dcfce7', color: '#166534' }
  }
  if (normalized === 'boolean') {
    return { background: '#ccfbf1', color: '#0f766e' }
  }
  if (['int', 'integer', 'long', 'double', 'float', 'decimal', 'number', 'bigdecimal'].includes(normalized)) {
    return { background: '#ffedd5', color: '#c2410c' }
  }
  if (['map', 'object', 'json'].includes(normalized)) {
    return { background: '#fce7f3', color: '#be185d' }
  }
  if (['list', 'array', 'set'].includes(normalized)) {
    return { background: '#dbeafe', color: '#1d4ed8' }
  }
  return { background: '#e5e7eb', color: '#374151' }
}

function tagPill(label: React.ReactNode, theme: { background: string, color: string }) {
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

function dataTypeTag(value?: string | null, keyword?: string | null) {
  return tagPill(highlightText(value || '-', keyword), configTypeTheme(value))
}

function roleTag(label: React.ReactNode, role: 'INPUT' | 'OUTPUT' = 'INPUT') {
  return tagPill(label, role === 'INPUT'
    ? { background: '#dcfce7', color: '#166534' }
    : { background: '#fee2e2', color: '#b91c1c' })
}

function countTag(label: string, value?: number | null) {
  return tagPill(`${label} ${value ?? 0}`, { background: '#f1f5f9', color: '#334155' })
}

function roleSearchText(role: 'INPUT' | 'OUTPUT') {
  return role === 'INPUT' ? 'input 入参' : 'output 出参'
}

function arrayValue<T>(value?: T[] | null): T[] {
  return Array.isArray(value) ? value : []
}

function toTimestamp(value?: string | null) {
  if (!value)
    return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function emptyDraft(snapshot?: ExecutorSnapshot | null): ExecutorDraft {
  return {
    executorCode: snapshot?.executorCode || '',
    executorName: snapshot?.executorName || '',
    language: snapshot?.language || '',
    releaseVersion: snapshot?.releaseVersion || '',
    mainClass: snapshot?.mainClass || '',
    entryType: snapshot?.entryType || '',
    description: snapshot?.description || '',
  }
}

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

  if (input.data != null && input.data.result != null) {
    return extractPayload(input.data.result)
  }
  if (input.result != null) {
    return extractPayload(input.result)
  }
  return input.data ?? input
}

async function callApi(props: LProcessConsoleV2Props, api: NopApi, data: Record<string, any>) {
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

function updateFormValues(props: LProcessConsoleV2Props, values: Record<string, any>) {
  const store = props.store as (IServiceStore & {
    updateData?: (data: Record<string, any>) => void
    changeValue?: (name: string, value: any) => void
  }) | undefined

  if (!store)
    return

  if (typeof store.updateData === 'function') {
    store.updateData(values)
    return
  }

  if (typeof store.changeValue === 'function') {
    Object.keys(values).forEach((key) => {
      store.changeValue?.(key, values[key])
    })
  }
}

function matchesScopedKeyword<T extends string>(
  filter: SearchFilter<T>,
  values: Record<T, string>,
) {
  const keyword = lower(filter.keyword).trim()
  if (!keyword)
    return true

  if (filter.scope === 'all') {
    return textContains(Object.values(values).join(' '), keyword)
  }

  return textContains(values[filter.scope] || '', keyword)
}

function buildParamGroups(snapshot: ExecutorSnapshot | null, filter: SearchFilter<ParamSearchScope>): MethodParamGroup[] {
  if (!snapshot)
    return []

  const fieldMap = new Map<string, FieldItem[]>()
  arrayValue(snapshot.fields).forEach((field) => {
    const key = `${field.methodId || ''}#${field.schemaRole || 'INPUT'}`
    const list = fieldMap.get(key)
    if (list) {
      list.push(field)
    }
    else {
      fieldMap.set(key, [field])
    }
  })

  fieldMap.forEach((list) => {
    list.sort((left, right) => (left.sortNo || Number.MAX_SAFE_INTEGER) - (right.sortNo || Number.MAX_SAFE_INTEGER))
  })

  const groups: MethodParamGroup[] = []
  arrayValue(snapshot.methods).forEach((method) => {
    const methodSearchText = lower([
      method.methodCode,
      method.methodName,
      method.methodSignature,
      method.description,
      method.returnJavaType,
      method.invokeMode,
      method.remark,
    ].join(' '))

    const roleGroups: MethodParamGroup['roleGroups'] = []
    ;(['INPUT', 'OUTPUT'] as const).forEach((role) => {
      const rows = arrayValue(fieldMap.get(`${method.methodId || ''}#${role}`)).filter((field) => {
        return matchesScopedKeyword(filter, {
          method: methodSearchText,
          role: roleSearchText(role),
          fieldName: lower(field.fieldName),
          fieldPath: lower(field.fieldPath),
          dataType: lower(field.dataType),
          javaType: lower(field.javaType),
          required: boolSearchText(field.required),
          defaultValue: lower(field.defaultValue),
          description: lower(field.description),
          remark: lower(field.remark),
        })
      })

      if (!rows.length)
        return

      roleGroups.push({ role, rows })
    })

    if (!roleGroups.length)
      return

    groups.push({
      method,
      roleGroups,
      rowCount: roleGroups.reduce((total, group) => total + group.rows.length, 0),
    })
  })

  return groups
}

function methodSummaryCell(method: MethodItem, keyword?: string) {
  const primaryLabel = method.methodName || method.methodCode || '-'
  const secondaryLabel = method.methodName && method.methodCode && method.methodName !== method.methodCode
    ? method.methodCode
    : ''

  return (
    <div className="nop-lprocess-v2__method-summary">
      <div className="nop-lprocess-v2__method-summary-head">
        <strong>{highlightText(primaryLabel, keyword)}</strong>
        {secondaryLabel && <span className="nop-lprocess-v2__method-summary-secondary">{highlightText(secondaryLabel, keyword)}</span>}
      </div>
      <div className="nop-lprocess-v2__method-summary-secondary">{highlightText(method.methodSignature || '-', keyword)}</div>
    </div>
  )
}

function moveColumn<T extends string>(order: T[], key: T, direction: -1 | 1) {
  const index = order.indexOf(key)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= order.length)
    return order
  const next = [...order]
  const [item] = next.splice(index, 1)
  next.splice(targetIndex, 0, item)
  return next
}

function orderedColumns<T extends string>(
  columns: ColumnDef<T>[],
  order: T[],
  fixed: ColumnFixed<T>,
) {
  const map = new Map(columns.map(column => [column.key, column]))
  const arranged = order.map(key => map.get(key)).filter(Boolean) as ColumnDef<T>[]
  const left = arranged.filter(column => fixed[column.key] === 'left')
  const middle = arranged.filter(column => !fixed[column.key])
  const right = arranged.filter(column => fixed[column.key] === 'right')
  return [...left, ...middle, ...right]
}

function columnWidth<T extends string>(column: ColumnDef<T>) {
  return column.width || 160
}

function buildStickyOffsets<T extends string>(
  columns: ColumnDef<T>[],
  fixed: ColumnFixed<T>,
  widths: ColumnWidths<T>,
  includeOperation = false,
) {
  const leftOffsets = {} as Partial<Record<T, number>>
  const rightOffsets = {} as Partial<Record<T, number>>

  let left = 0
  columns.forEach((column) => {
    if (fixed[column.key] === 'left') {
      leftOffsets[column.key] = left
      left += widths[column.key] || columnWidth(column)
    }
  })

  let right = includeOperation ? OPERATION_COLUMN_WIDTH : 0
  for (let index = columns.length - 1; index >= 0; index -= 1) {
    const column = columns[index]
    if (fixed[column.key] === 'right') {
      rightOffsets[column.key] = right
      right += widths[column.key] || columnWidth(column)
    }
  }

  return { leftOffsets, rightOffsets }
}

function stickyCellStyle<T extends string>(
  column: ColumnDef<T>,
  fixed: ColumnFixed<T>,
  leftOffsets: Partial<Record<T, number>>,
  rightOffsets: Partial<Record<T, number>>,
  isHeader = false,
): React.CSSProperties {
  const position = fixed[column.key]
  const baseBackground = isHeader ? '#f8fafc' : '#fff'

  if (position === 'left') {
    return {
      position: 'sticky',
      left: leftOffsets[column.key] || 0,
      zIndex: isHeader ? 4 : 2,
      background: baseBackground,
      boxShadow: '1px 0 0 #e5e7eb',
    }
  }

  if (position === 'right') {
    return {
      position: 'sticky',
      right: rightOffsets[column.key] || 0,
      zIndex: isHeader ? 4 : 2,
      background: baseBackground,
      boxShadow: '-1px 0 0 #e5e7eb',
    }
  }

  return {}
}

function operationCellStyle(isHeader = false): React.CSSProperties {
  return {
    position: 'sticky',
    right: 0,
    zIndex: isHeader ? 5 : 3,
    background: isHeader ? '#f8fafc' : '#fff',
    boxShadow: '-1px 0 0 #e5e7eb',
    width: OPERATION_COLUMN_WIDTH,
    minWidth: OPERATION_COLUMN_WIDTH,
  }
}

function densityOptionStyle(active: boolean): React.CSSProperties {
  return {
    border: `1px solid ${active ? '#14b8a6' : '#d1d5db'}`,
    background: active ? '#f0fdfa' : '#fff',
    color: active ? '#0f766e' : '#475569',
    borderRadius: 2,
    padding: '3px 8px',
    fontSize: 12,
    cursor: 'pointer',
  }
}

function resizeHandleStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    right: -4,
    width: 10,
    height: '100%',
    cursor: 'col-resize',
    userSelect: 'none',
    touchAction: 'none',
    zIndex: 6,
  }
}

function resizeGripStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    top: '25%',
    bottom: '25%',
    left: '50%',
    width: 2,
    transform: 'translateX(-50%)',
    borderRadius: 999,
    background: '#cbd5e1',
  }
}

function highlightedCellStyle(active: boolean, baseBackground = '#fff'): React.CSSProperties {
  if (!active)
    return {}
  return {
    background: baseBackground === '#f8fafc' ? '#dbeafe' : '#eef6ff',
    boxShadow: 'inset 0 0 0 1px #bfdbfe',
  }
}

function startColumnResize<T extends string>(
  event: React.MouseEvent,
  key: T,
  startWidth: number,
  setter: React.Dispatch<React.SetStateAction<ColumnWidths<T>>>,
) {
  event.preventDefault()
  event.stopPropagation()

  const originX = event.clientX
  const previousCursor = document.body.style.cursor
  const previousUserSelect = document.body.style.userSelect
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  function handleMove(moveEvent: MouseEvent) {
    const nextWidth = Math.max(96, startWidth + moveEvent.clientX - originX)
    setter(prev => ({ ...prev, [key]: nextWidth }))
  }

  function handleUp() {
    document.body.style.cursor = previousCursor
    document.body.style.userSelect = previousUserSelect
    window.removeEventListener('mousemove', handleMove)
    window.removeEventListener('mouseup', handleUp)
  }

  window.addEventListener('mousemove', handleMove)
  window.addEventListener('mouseup', handleUp)
}

function popupPanelPosition(trigger: HTMLElement | null, options?: {
  width?: number
  minWidth?: number
  matchTriggerWidth?: boolean
  maxHeight?: number
}) {
  if (!trigger)
    return null

  const rect = trigger.getBoundingClientRect()
  const gap = 4
  const fallbackWidth = options?.width || 280
  const width = options?.matchTriggerWidth
    ? Math.max(rect.width, options?.minWidth || 0)
    : Math.max(rect.width, options?.minWidth || 0, fallbackWidth)
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
  const availableBelow = window.innerHeight - rect.bottom - 12
  const availableAbove = rect.top - 12
  const openUpward = availableBelow < 220 && availableAbove > availableBelow
  const maxHeight = Math.max(
    140,
    Math.min(options?.maxHeight || 320, openUpward ? availableAbove : availableBelow),
  )
  const top = openUpward
    ? Math.max(8, rect.top - maxHeight - gap)
    : Math.max(8, rect.bottom + gap)

  return {
    position: 'fixed' as const,
    top,
    left,
    width,
    zIndex: 4000,
    maxHeight,
  }
}

function ColumnChooser<T extends string>(props: {
  title: string
  columns: ColumnDef<T>[]
  visibility: ColumnVisibility<T>
  fixed: ColumnFixed<T>
  order: T[]
  density: TableDensity
  onToggle: (key: T) => void
  onMove: (key: T, direction: -1 | 1) => void
  onFixed: (key: T, fixed: 'left' | 'right') => void
  onReset: () => void
  onDensityChange: (density: TableDensity) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const [panelStyle, setPanelStyle] = useState<ReturnType<typeof popupPanelPosition>>(null)

  useEffect(() => {
    if (!open)
      return

    function syncPosition() {
      setPanelStyle(popupPanelPosition(rootRef.current, {
        width: 320,
        minWidth: 320,
        matchTriggerWidth: false,
      }))
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null
      if (target
        && rootRef.current
        && !rootRef.current.contains(target)
        && (!popupRef.current || !popupRef.current.contains(target))) {
        setOpen(false)
      }
    }

    syncPosition()
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
    }
  }, [open])

  return (
    <div ref={rootRef} style={CHOOSER_ROOT_STYLE}>
      <IconButton
        active={open}
        title={props.title}
        onClick={() => setOpen(value => !value)}
      >
        <ColumnsIcon />
      </IconButton>
      {open && typeof document !== 'undefined' && panelStyle && ReactDOM.createPortal(
        <div
          ref={popupRef}
          style={{
            ...panelStyle,
            ...CHOOSER_PANEL_STYLE,
          }}
        >
          <div style={CHOOSER_HEADER_STYLE}>
            <div style={CHOOSER_TITLE_STYLE}>{props.title}</div>
            <div style={CHOOSER_DENSITY_ROW_STYLE}>
              <span className="nop-lprocess-v2__chooser-panel-label">列表展示</span>
              <div style={CHOOSER_DENSITY_GROUP_STYLE}>
                <button type="button" style={densityOptionStyle(props.density === 'default')} onClick={() => props.onDensityChange('default')}>默认</button>
                <button type="button" style={densityOptionStyle(props.density === 'compact')} onClick={() => props.onDensityChange('compact')}>紧凑</button>
                <button type="button" style={densityOptionStyle(props.density === 'loose')} onClick={() => props.onDensityChange('loose')}>宽松</button>
              </div>
            </div>
          </div>
          <div style={CHOOSER_LIST_STYLE}>
            {props.order.map((key, index) => {
              const column = props.columns.find(item => item.key === key)
              if (!column)
                return null
              return (
                <div key={column.key} className="nop-lprocess-v2__chooser-row">
                  <span className="nop-lprocess-v2__chooser-handle">
                    <DragHandleIcon />
                  </span>
                  <label className="nop-lprocess-v2__chooser-label">
                    <input
                      type="checkbox"
                      checked={props.visibility[column.key]}
                      onChange={() => props.onToggle(column.key)}
                    />
                    <span className="nop-lprocess-v2__chooser-text">{column.label}</span>
                  </label>
                  <button type="button" title="上移" onClick={() => props.onMove(column.key, -1)} disabled={index === 0} style={chooserIconButtonStyle(index === 0)}>
                    <MoveUpIcon />
                  </button>
                  <button type="button" title="下移" onClick={() => props.onMove(column.key, 1)} disabled={index === props.order.length - 1} style={chooserIconButtonStyle(index === props.order.length - 1)}>
                    <MoveDownIcon />
                  </button>
                  <button type="button" title="固定在左侧" onClick={() => props.onFixed(column.key, 'left')} style={chooserIconButtonStyle(false, props.fixed[column.key] === 'left')}>
                    <PinLeftIcon />
                  </button>
                  <button type="button" title="固定在右侧" onClick={() => props.onFixed(column.key, 'right')} style={chooserIconButtonStyle(false, props.fixed[column.key] === 'right')}>
                    <PinRightIcon />
                  </button>
                </div>
              )
            })}
          </div>
          <div style={CHOOSER_FOOTER_STYLE}>
            <button type="button" onClick={props.onReset} style={secondaryButtonStyle()}>
              重置
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

function SearchToolbar<T extends string>(props: {
  chooser: React.ReactNode
  filter: SearchFilter<T>
  options: ScopeOption<T>[]
  placeholder: string
  resetLabel: string
  onChange: React.Dispatch<React.SetStateAction<SearchFilter<T>>>
}) {
  return (
    <div style={SEARCH_TOOLBAR_STYLE}>
      {props.chooser}
      <div style={SEARCH_GROUP_STYLE}>
        <span style={SEARCH_PREFIX_STYLE}>搜索</span>
        <div className="nop-lprocess-v2__search-scope">
          <RichSelect
            value={props.filter.scope}
            options={props.options}
            placeholder="全部字段"
            clearable
            searchable={props.options.length > 6}
            controlStyle={SEARCH_SCOPE_TRIGGER_STYLE}
            onChange={value => props.onChange(prev => ({ ...prev, scope: (value || 'all') as T | 'all' }))}
          />
        </div>
        <input
          value={props.filter.keyword}
          onChange={event => props.onChange(prev => ({ ...prev, keyword: event.target.value }))}
          placeholder={props.placeholder}
          style={SEARCH_INPUT_STYLE}
        />
      </div>
      <TextActionButton
        label={props.resetLabel}
        title={props.resetLabel}
        muted
        onClick={() => props.onChange({ scope: 'all', keyword: '' })}
      />
    </div>
  )
}

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
      className="nop-lprocess-v2__rich-select"
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

function chooserIconButtonStyle(disabled = false, active = false): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    border: `1px solid ${active ? '#14b8a6' : '#d1d5db'}`,
    borderRadius: 2,
    background: active ? '#f0fdfa' : '#fff',
    color: disabled ? '#cbd5e1' : active ? '#0f766e' : '#64748b',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

function IconButton(props: {
  title: string
  onClick: () => void
  children: React.ReactNode
  active?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      onClick={props.onClick}
      style={{
        width: 32,
        height: 32,
        borderRadius: 2,
        border: `1px solid ${props.danger ? '#fecaca' : props.active ? '#93c5fd' : '#cbd5e1'}`,
        background: props.danger ? '#fff1f2' : props.active ? '#eff6ff' : '#fff',
        color: props.danger ? '#b91c1c' : props.active ? '#2563eb' : '#334155',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: 'none',
      }}
    >
      {props.children}
    </button>
  )
}

function TextActionButton(props: {
  label: string
  title?: string
  onClick: () => void
  muted?: boolean
}) {
  return (
    <button
      type="button"
      title={props.title || props.label}
      onClick={props.onClick}
      className={`nop-lprocess-v2__section-link${props.muted ? ' nop-lprocess-v2__section-link--muted' : ''}`}
    >
      {props.label}
    </button>
  )
}

function iconSvg(path: React.ReactNode) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {path}
    </svg>
  )
}

function ColumnsIcon() {
  return iconSvg(
    <>
      <path d="M3 4.5H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3 8H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M3 11.5H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="6" cy="4.5" r="1.2" fill="currentColor" />
      <circle cx="10" cy="8" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" />
    </>
  )
}

function DragHandleIcon() {
  return iconSvg(
    <>
      <circle cx="6" cy="5" r="1.25" fill="currentColor" />
      <circle cx="12" cy="5" r="1.25" fill="currentColor" />
      <circle cx="6" cy="9" r="1.25" fill="currentColor" />
      <circle cx="12" cy="9" r="1.25" fill="currentColor" />
      <circle cx="6" cy="13" r="1.25" fill="currentColor" />
      <circle cx="12" cy="13" r="1.25" fill="currentColor" />
    </>
  )
}

function CollapseIcon(props: { collapsed: boolean }) {
  return iconSvg(
    <path
      d={props.collapsed ? 'M4.5 6.5L8 10L11.5 6.5' : 'M4.5 9.5L8 6L11.5 9.5'}
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function CloseIcon() {
  return iconSvg(
    <>
      <path d="M4.5 4.5L11.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  )
}

function MoveUpIcon() {
  return iconSvg(
    <>
      <path d="M9 2.75L4.25 7.5H7.25V14.25H10.75V7.5H13.75L9 2.75Z" fill="currentColor" />
      <path d="M4.25 15.5H13.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>,
  )
}

function MoveDownIcon() {
  return iconSvg(
    <>
      <path d="M9 15.25L13.75 10.5H10.75V3.75H7.25V10.5H4.25L9 15.25Z" fill="currentColor" />
      <path d="M4.25 2.5H13.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>,
  )
}

function PinLeftIcon() {
  return iconSvg(
    <>
      <path d="M3.5 3H6.25V15H3.5V3Z" fill="currentColor" />
      <path d="M14.5 9L9 13.25V10.75H6.75V7.25H9V4.75L14.5 9Z" fill="currentColor" />
    </>
  )
}

function PinRightIcon() {
  return iconSvg(
    <>
      <path d="M11.75 3H14.5V15H11.75V3Z" fill="currentColor" />
      <path d="M3.5 9L9 4.75V7.25H11.25V10.75H9V13.25L3.5 9Z" fill="currentColor" />
    </>
  )
}

function detectStickyTopOffset() {
  if (typeof document === 'undefined')
    return 0

  const nodes = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
  let maxBottom = 0

  nodes.forEach((node) => {
    if (node.closest('.nop-lprocess-v2'))
      return

    const style = window.getComputedStyle(node)
    if (!['fixed', 'sticky'].includes(style.position))
      return

    const rect = node.getBoundingClientRect()
    if (rect.height <= 0 || rect.width <= 0)
      return

    if (rect.top > 80 || rect.height > window.innerHeight * 0.4)
      return

    maxBottom = Math.max(maxBottom, rect.bottom)
  })

  return Math.max(0, Math.min(120, Math.ceil(maxBottom)))
}

function LProcessConsoleV2View(props: LProcessConsoleV2Props) {
  const data = props.data || {}
  const sourceMode = (data.sourceMode || 'existing') as ConsoleSourceMode
  const selectedExecutorDefId = String(data.selectedExecutorDefId || '')
  const selectedExecutorReleaseId = String(data.selectedExecutorReleaseId || '')
  const uploadedExecutorDefId = String(data.executorDefId || '')
  const uploadedExecutorReleaseId = String(data.executorReleaseId || '')
  const uploadedFileId = String(data.fileId || '')
  const prevSourceModeRef = useRef<ConsoleSourceMode>(sourceMode)
  const uploadBaselineRef = useRef({
    executorDefId: uploadedExecutorDefId,
    executorReleaseId: uploadedExecutorReleaseId,
    fileId: uploadedFileId,
  })
  const [waitForFreshUpload, setWaitForFreshUpload] = useState(() => sourceMode === 'upload' && !uploadedExecutorDefId)
  const uploadSnapshotLocked = sourceMode === 'upload' && (waitForFreshUpload || prevSourceModeRef.current !== sourceMode)
  const activeExecutorDefId = sourceMode === 'upload'
    ? (uploadSnapshotLocked ? '' : uploadedExecutorDefId)
    : selectedExecutorDefId
  const activeExecutorReleaseId = sourceMode === 'upload'
    ? (uploadSnapshotLocked ? '' : uploadedExecutorReleaseId)
    : selectedExecutorReleaseId
  const sourceReady = sourceMode === 'upload'
    ? !!activeExecutorDefId
    : !!activeExecutorDefId && !!activeExecutorReleaseId
  const activeSourceKey = `${sourceMode}:${activeExecutorDefId || ''}:${activeExecutorReleaseId || ''}`

  const [snapshotCache, setSnapshotCache] = useState<Record<string, ExecutorSnapshot | null>>({})
  const [visibleSnapshotKey, setVisibleSnapshotKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [executorOptions, setExecutorOptions] = useState<SimpleOption[]>([])
  const [releaseOptions, setReleaseOptions] = useState<SimpleOption[]>([])
  const [currentReleaseId, setCurrentReleaseId] = useState('')
  const [executorEditing, setExecutorEditing] = useState(false)
  const [executorSaving, setExecutorSaving] = useState(false)
  const [executorDraft, setExecutorDraft] = useState<ExecutorDraft>(emptyDraft())

  const [configCollapsed, setConfigCollapsed] = useState(false)
  const [methodCollapsed, setMethodCollapsed] = useState(false)
  const [paramCollapsed, setParamCollapsed] = useState(false)

  const [configFilter, setConfigFilter] = useState<SearchFilter<ConfigSearchScope>>(EMPTY_CONFIG_FILTER)
  const [methodFilter, setMethodFilter] = useState<SearchFilter<MethodSearchScope>>(EMPTY_METHOD_FILTER)
  const [paramFilter, setParamFilter] = useState<SearchFilter<ParamSearchScope>>(EMPTY_PARAM_FILTER)

  const [configColumns, setConfigColumns] = useState(DEFAULT_CONFIG_COLUMNS)
  const [methodColumns, setMethodColumns] = useState(DEFAULT_METHOD_COLUMNS)
  const [paramColumns, setParamColumns] = useState(DEFAULT_PARAM_COLUMNS)
  const [configColumnOrder, setConfigColumnOrder] = useState(CONFIG_COLUMNS.map(column => column.key))
  const [methodColumnOrder, setMethodColumnOrder] = useState(METHOD_COLUMNS.map(column => column.key))
  const [paramColumnOrder, setParamColumnOrder] = useState(PARAM_COLUMNS.map(column => column.key))
  const [configColumnFixed, setConfigColumnFixed] = useState<ColumnFixed<ConfigColumnKey>>({})
  const [methodColumnFixed, setMethodColumnFixed] = useState<ColumnFixed<MethodColumnKey>>({})
  const [paramColumnFixed, setParamColumnFixed] = useState<ColumnFixed<ParamColumnKey>>({})
  const [configColumnWidths, setConfigColumnWidths] = useState(DEFAULT_CONFIG_WIDTHS)
  const [methodColumnWidths, setMethodColumnWidths] = useState(DEFAULT_METHOD_WIDTHS)
  const [paramColumnWidths, setParamColumnWidths] = useState(DEFAULT_PARAM_WIDTHS)
  const [tableDensity, setTableDensity] = useState<TableDensity>('compact')
  const [editDialog, setEditDialog] = useState<EditDialogState>(null)
  const [stickyTopOffset, setStickyTopOffset] = useState(0)
  const [hoveredParamRow, setHoveredParamRow] = useState<null | {
    groupKey: string
    roleKey: string
    rowKey: string
  }>(null)

  const requestRef = useRef(0)
  const snapshot = sourceReady && visibleSnapshotKey === activeSourceKey ? snapshotCache[activeSourceKey] || null : null

  useEffect(() => {
    function syncStickyTop() {
      setStickyTopOffset(detectStickyTopOffset())
    }

    syncStickyTop()
    window.addEventListener('resize', syncStickyTop)
    window.addEventListener('scroll', syncStickyTop, true)
    return () => {
      window.removeEventListener('resize', syncStickyTop)
      window.removeEventListener('scroll', syncStickyTop, true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadExecutors() {
      try {
        const list = arrayValue<{
          executorDefId?: string
          executorCode?: string
          executorName?: string
        }>(await callApi(props, {
          url: '@query:ExecutorDef__findList',
          method: 'post',
          data: {
            limit: 200,
          },
          'gql:selection': 'executorDefId,executorCode,executorName',
        }, {
          limit: 200,
        }))

        if (cancelled)
          return

        setExecutorOptions(list.map(item => ({
          value: String(item.executorDefId || ''),
          label: item.executorCode
            ? `${item.executorCode}${item.executorName ? ` | ${item.executorName}` : ''}`
            : String(item.executorDefId || ''),
        })).filter(item => item.value))
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
  }, [props.store])

  useEffect(() => {
    if (!selectedExecutorDefId) {
      setReleaseOptions([])
      setCurrentReleaseId('')
      return
    }

    let cancelled = false

    async function loadReleases() {
      try {
        const executorDef = await callApi(props, {
          url: '@query:ExecutorDef__get',
          method: 'post',
          data: {
            id: selectedExecutorDefId,
          },
          'gql:selection': 'executorDefId,currentReleaseId',
        }, {
          id: selectedExecutorDefId,
        })

        const resolvedCurrentReleaseId = String(executorDef?.currentReleaseId || '')
        const list = arrayValue<{
          executorReleaseId?: string
          releaseVersion?: string
          createTime?: string
          updateTime?: string
        }>(await callApi(props, {
          url: '@query:ExecutorRelease__findList',
          method: 'post',
          data: {
            filter_executorDefId: selectedExecutorDefId,
            limit: 200,
          },
          'gql:selection': 'executorReleaseId,releaseVersion,createTime,updateTime',
        }, {
          filter_executorDefId: selectedExecutorDefId,
          limit: 200,
        }))

        if (cancelled)
          return

        const sortedList = [...list].sort((left, right) => {
          const leftId = String(left.executorReleaseId || '')
          const rightId = String(right.executorReleaseId || '')
          if (leftId === resolvedCurrentReleaseId)
            return -1
          if (rightId === resolvedCurrentReleaseId)
            return 1

          const timeDiff = toTimestamp(right.updateTime || right.createTime) - toTimestamp(left.updateTime || left.createTime)
          if (timeDiff !== 0)
            return timeDiff
          return String(right.releaseVersion || '').localeCompare(String(left.releaseVersion || ''))
        })

        setCurrentReleaseId(resolvedCurrentReleaseId)
        setReleaseOptions(sortedList.map(item => {
          const value = String(item.executorReleaseId || '')
          const label = item.releaseVersion || value
          return {
            value,
            label: value && value === resolvedCurrentReleaseId ? `${label}（当前）` : label,
          }
        }).filter(item => item.value))

        if (!selectedExecutorReleaseId) {
          const preferredReleaseId = resolvedCurrentReleaseId || String(sortedList[0]?.executorReleaseId || '')
          if (preferredReleaseId) {
            updateFormValues(props, { selectedExecutorReleaseId: preferredReleaseId })
          }
        }
      }
      catch {
        if (!cancelled) {
          setReleaseOptions([])
          setCurrentReleaseId('')
        }
      }
    }

    loadReleases()
    return () => {
      cancelled = true
    }
  }, [props.store, selectedExecutorDefId, selectedExecutorReleaseId])

  useEffect(() => {
    const prevSourceMode = prevSourceModeRef.current
    if (prevSourceMode === sourceMode)
      return

    requestRef.current += 1
    setVisibleSnapshotKey('')
    setError('')

    if (sourceMode === 'upload') {
      uploadBaselineRef.current = {
        executorDefId: uploadedExecutorDefId,
        executorReleaseId: uploadedExecutorReleaseId,
        fileId: uploadedFileId,
      }
      setWaitForFreshUpload(true)
      updateFormValues(props, {
        selectedExecutorDefId: '',
        selectedExecutorReleaseId: '',
        executorDefId: '',
        executorReleaseId: '',
        fileId: '',
        packageFile: '',
      })
      setLoading(false)
      setExecutorEditing(false)
      setExecutorDraft(emptyDraft())
      setHoveredParamRow(null)
      setEditDialog(null)
    }

    if (sourceMode === 'existing') {
      setWaitForFreshUpload(false)
      updateFormValues(props, {
        selectedExecutorDefId: '',
        selectedExecutorReleaseId: '',
      })
      setLoading(false)
      setExecutorEditing(false)
      setExecutorDraft(emptyDraft())
      setHoveredParamRow(null)
      setEditDialog(null)
    }

    prevSourceModeRef.current = sourceMode
  }, [props.store, sourceMode, uploadedExecutorDefId, uploadedExecutorReleaseId, uploadedFileId])

  useEffect(() => {
    if (sourceMode !== 'upload' || !waitForFreshUpload)
      return

    const baseline = uploadBaselineRef.current
    const nextExecutorDefId = uploadedExecutorDefId
    const nextExecutorReleaseId = uploadedExecutorReleaseId
    const nextFileId = uploadedFileId
    const hasFreshUpload = !!nextExecutorDefId && (
      nextExecutorDefId !== baseline.executorDefId
      || nextExecutorReleaseId !== baseline.executorReleaseId
      || nextFileId !== baseline.fileId
    )

    if (hasFreshUpload)
      setWaitForFreshUpload(false)
  }, [sourceMode, uploadedExecutorDefId, uploadedExecutorReleaseId, uploadedFileId, waitForFreshUpload])

  useEffect(() => {
    if (!sourceReady) {
      requestRef.current += 1
      setVisibleSnapshotKey('')
      setError('')
      setLoading(false)
      setExecutorEditing(false)
      setExecutorDraft(emptyDraft())
      return
    }

    const currentRequestId = ++requestRef.current
    setLoading(true)
    setError('')
    setVisibleSnapshotKey('')
    setExecutorEditing(false)
    setExecutorDraft(emptyDraft(snapshotCache[activeSourceKey] || null))

    callApi(props, {
      url: '@query:LProcessConsole__loadExecutorReleaseSnapshot',
      method: 'post',
      data: {
        executorDefId: activeExecutorDefId,
        executorReleaseId: activeExecutorReleaseId,
      },
      'gql:selection': SNAPSHOT_SELECTION,
    }, {
      executorDefId: activeExecutorDefId,
      executorReleaseId: activeExecutorReleaseId,
    }).then((payload) => {
      if (currentRequestId !== requestRef.current)
        return
      setSnapshotCache(prev => ({ ...prev, [activeSourceKey]: payload || null }))
      setVisibleSnapshotKey(activeSourceKey)
      setExecutorDraft(emptyDraft(payload || null))
      setExecutorEditing(false)
      setConfigFilter(EMPTY_CONFIG_FILTER)
      setMethodFilter(EMPTY_METHOD_FILTER)
      setParamFilter(EMPTY_PARAM_FILTER)
    }).catch((err) => {
      if (currentRequestId !== requestRef.current)
        return
      setError(err?.message || '加载执行器快照失败')
      setVisibleSnapshotKey('')
      setSnapshotCache(prev => ({ ...prev, [activeSourceKey]: null }))
    }).finally(() => {
      if (currentRequestId === requestRef.current)
        setLoading(false)
    })
  }, [activeSourceKey, sourceReady])

  useEffect(() => {
    if (sourceMode === 'upload' && uploadSnapshotLocked) {
      requestRef.current += 1
      setVisibleSnapshotKey('')
      setLoading(false)
      setExecutorEditing(false)
      setExecutorDraft(emptyDraft())
      setHoveredParamRow(null)
      setEditDialog(null)
      return
    }

    if (sourceMode === 'existing' && (!selectedExecutorDefId || !selectedExecutorReleaseId)) {
      requestRef.current += 1
      setVisibleSnapshotKey('')
      setLoading(false)
      setExecutorEditing(false)
      setExecutorDraft(emptyDraft())
      setHoveredParamRow(null)
      setEditDialog(null)
    }
  }, [selectedExecutorDefId, selectedExecutorReleaseId, sourceMode, uploadSnapshotLocked])

  const filteredConfigs = arrayValue(snapshot?.configs).filter((item) => {
    return matchesScopedKeyword(configFilter, {
      configKey: lower(item.configKey),
      configName: lower(item.configName),
      configType: lower(item.configType),
      required: boolSearchText(item.required),
      secretFlag: boolSearchText(item.secretFlag),
      defaultValue: lower(item.defaultValue),
      description: lower(item.description),
      remark: lower(item.remark),
    })
  })

  const filteredMethods = arrayValue(snapshot?.methods).filter((item) => {
    return matchesScopedKeyword(methodFilter, {
      summary: lower([item.methodCode, item.methodName, item.methodSignature, item.description].join(' ')),
      methodCode: lower(item.methodCode),
      methodName: lower(item.methodName),
      methodSignature: lower(item.methodSignature),
      returnJavaType: lower(item.returnJavaType),
      invokeMode: lower(item.invokeMode),
      idempotentFlag: boolSearchText(item.idempotentFlag),
      description: lower(item.description),
      remark: lower(item.remark),
    })
  })

  const paramGroups = buildParamGroups(snapshot, paramFilter)
  const paramRowCount = paramGroups.reduce((total, group) => total + group.rowCount, 0)
  const visibleConfigColumns = orderedColumns(CONFIG_COLUMNS, configColumnOrder, configColumnFixed).filter(column => configColumns[column.key])
  const visibleMethodColumns = orderedColumns(METHOD_COLUMNS, methodColumnOrder, methodColumnFixed).filter(column => methodColumns[column.key])
  const visibleParamColumns = orderedColumns(PARAM_COLUMNS, paramColumnOrder, paramColumnFixed).filter(column => paramColumns[column.key])
  const configSticky = buildStickyOffsets(visibleConfigColumns, configColumnFixed, configColumnWidths, true)
  const methodSticky = buildStickyOffsets(visibleMethodColumns, methodColumnFixed, methodColumnWidths, true)
  const paramSticky = buildStickyOffsets(visibleParamColumns, paramColumnFixed, paramColumnWidths, true)

  function renderAmisControl(region: string, schema: any) {
    if (!props.render)
      return null
    return props.render(region, schema, { onAction: props.onAction }) as React.ReactNode
  }

  async function reloadSnapshot() {
    if (!sourceReady)
      return
    setLoading(true)
    setError('')
    try {
      const payload = await callApi(props, {
        url: '@query:LProcessConsole__loadExecutorReleaseSnapshot',
        method: 'post',
        data: {
          executorDefId: activeExecutorDefId,
          executorReleaseId: activeExecutorReleaseId,
        },
        'gql:selection': SNAPSHOT_SELECTION,
      }, {
        executorDefId: activeExecutorDefId,
        executorReleaseId: activeExecutorReleaseId,
      })
      setSnapshotCache(prev => ({ ...prev, [activeSourceKey]: payload || null }))
      setVisibleSnapshotKey(activeSourceKey)
      setExecutorDraft(emptyDraft(payload || null))
      setExecutorEditing(false)
    }
    catch (err: any) {
      setError(err?.message || '重新加载执行器快照失败')
    }
    finally {
      setLoading(false)
    }
  }

  async function saveExecutorInfo() {
    if (!snapshot?.executorDefId || !snapshot?.executorReleaseId)
      return
    setExecutorSaving(true)
    setError('')
    try {
      await callApi(props, {
        url: '@mutation:LProcessConsole__updateExecutorSnapshot',
        method: 'post',
        data: {
          executorDefId: snapshot.executorDefId,
          executorReleaseId: snapshot.executorReleaseId,
          executorCode: executorDraft.executorCode,
          executorName: executorDraft.executorName,
          language: executorDraft.language,
          releaseVersion: executorDraft.releaseVersion,
          mainClass: executorDraft.mainClass,
          entryType: executorDraft.entryType,
          description: executorDraft.description,
        },
        'gql:selection': SNAPSHOT_SELECTION,
      }, {
        executorDefId: snapshot.executorDefId,
        executorReleaseId: snapshot.executorReleaseId,
        executorCode: executorDraft.executorCode,
        executorName: executorDraft.executorName,
        language: executorDraft.language,
        releaseVersion: executorDraft.releaseVersion,
        mainClass: executorDraft.mainClass,
        entryType: executorDraft.entryType,
        description: executorDraft.description,
      })
      await reloadSnapshot()
    }
    catch (err: any) {
      setError(err?.message || '保存执行器信息失败')
    }
    finally {
      setExecutorSaving(false)
    }
  }

  function renderConfigCell(item: ConfigItem, column: ConfigColumnKey) {
    const keyword = configFilter.keyword
    switch (column) {
      case 'configKey':
        return <strong>{highlightText(item.configKey || '-', keyword)}</strong>
      case 'configName':
        return highlightText(item.configName || '-', keyword)
      case 'configType':
        return dataTypeTag(item.configType, keyword)
      case 'required':
        return statusTag(highlightText(toDisplayBool(item.required), keyword) as string, item.required)
      case 'secretFlag':
        return statusTag(highlightText(toDisplayBool(item.secretFlag), keyword) as string, !item.secretFlag)
      case 'defaultValue':
        return highlightText(item.defaultValue || '-', keyword)
      case 'description':
        return highlightText(item.description || '-', keyword)
      case 'remark':
        return highlightText(item.remark || '-', keyword)
    }
  }

  function renderMethodCell(item: MethodItem, column: MethodColumnKey) {
    const keyword = methodFilter.keyword
    switch (column) {
      case 'summary':
        return methodSummaryCell(item, keyword)
      case 'returnJavaType':
        return dataTypeTag(item.returnJavaType, keyword)
      case 'invokeMode':
        return tagPill(highlightText(item.invokeMode || '-', keyword), { background: '#dbeafe', color: '#1d4ed8' })
      case 'idempotentFlag':
        return statusTag(highlightText(toDisplayBool(item.idempotentFlag), keyword) as string, item.idempotentFlag)
      case 'inputCount':
        return item.inputCount ?? 0
      case 'outputCount':
        return item.outputCount ?? 0
      case 'remark':
        return highlightText(item.remark || '-', keyword)
    }
  }

  function toggleConfigColumn(key: ConfigColumnKey) {
    setConfigColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleMethodColumn(key: MethodColumnKey) {
    setMethodColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleParamColumn(key: ParamColumnKey) {
    setParamColumns(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleFixed<T extends string>(
    setter: React.Dispatch<React.SetStateAction<ColumnFixed<T>>>,
    key: T,
    position: 'left' | 'right',
  ) {
    setter((prev) => {
      const current = prev[key]
      if (current === position) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: position }
    })
  }

  function densityMetrics() {
    if (tableDensity === 'compact') {
      return {
        th: { ...TH_STYLE, padding: '6px 8px', fontSize: 12 },
        td: { ...TD_STYLE, padding: '6px 8px', fontSize: 12 },
      }
    }
    if (tableDensity === 'loose') {
      return {
        th: { ...TH_STYLE, padding: '12px 12px', fontSize: 13 },
        td: { ...TD_STYLE, padding: '12px 12px', fontSize: 13 },
      }
    }
    return {
      th: TH_STYLE,
      td: TD_STYLE,
    }
  }

  function openConfigEditor(item: ConfigItem) {
    setEditDialog({ kind: 'config', item: { ...item } })
  }

  function openMethodEditor(item: MethodItem) {
    setEditDialog({ kind: 'method', item: { ...item } })
  }

  function openFieldEditor(item: FieldItem) {
    setEditDialog({ kind: 'field', item: { ...item } })
  }

  function updateDialogField(name: string, value: any) {
    setEditDialog((prev) => {
      if (!prev)
        return prev
      return {
        ...prev,
        item: {
          ...prev.item,
          [name]: value,
        },
      } as EditDialogState
    })
  }

  function notifyEditorNotReady() {
    setError('当前版本尚未接入配置项/方法项/参数项保存接口，请先补充对应 mutation。')
  }

  function setSourceMode(nextMode: ConsoleSourceMode) {
    if (nextMode === sourceMode)
      return

    updateFormValues(props, {
      sourceMode: nextMode,
      selectedExecutorDefId: '',
      selectedExecutorReleaseId: '',
      executorDefId: '',
      executorReleaseId: '',
      fileId: '',
      packageFile: '',
    })
  }

  function renderStickyMetaItem(label: string, value: React.ReactNode, wide = false) {
    return (
      <span className={`nop-lprocess-v2__sticky-meta-item${wide ? ' nop-lprocess-v2__sticky-meta-item--wide' : ''}`}>
        <span className="nop-lprocess-v2__sticky-meta-label">{label}</span>
        <span className="nop-lprocess-v2__sticky-meta-value">
          {value || '-'}
        </span>
      </span>
    )
  }

  function renderSourceControls() {
    return (
      <div className="nop-lprocess-v2__sticky-controls">
        <div className="nop-lprocess-v2__source-row">
          <div className="nop-lprocess-v2__source-mode">
            <div className="nop-lprocess-v2__mode-switch">
              <button
                type="button"
                className={sourceMode === 'existing' ? 'is-active' : ''}
                onClick={() => setSourceMode('existing')}
              >
                现有执行器
              </button>
              <button
                type="button"
                className={sourceMode === 'upload' ? 'is-active' : ''}
                onClick={() => setSourceMode('upload')}
              >
                上传压缩包
              </button>
            </div>
          </div>

          {sourceMode === 'existing' && (
            <>
              <div className="nop-lprocess-v2__source-field nop-lprocess-v2__source-field--executor">
                <span style={SOURCE_FIELD_LABEL_STYLE}>执行器</span>
                <div className="nop-lprocess-v2__source-field-control">
                  <RichSelect
                    value={selectedExecutorDefId}
                    options={executorOptions}
                    placeholder="选择执行器"
                    clearable
                    searchable
                    controlStyle={SOURCE_SELECT_TRIGGER_STYLE}
                    onChange={(value) => {
                      updateFormValues(props, {
                        selectedExecutorDefId: value,
                        selectedExecutorReleaseId: '',
                      })
                    }}
                  />
                </div>
              </div>

              <div className="nop-lprocess-v2__source-field nop-lprocess-v2__source-field--release">
                <span style={SOURCE_FIELD_LABEL_STYLE}>版本</span>
                <div className="nop-lprocess-v2__source-field-control">
                  <RichSelect
                    value={selectedExecutorReleaseId}
                    options={releaseOptions}
                    placeholder={selectedExecutorDefId ? '选择版本' : '先选择执行器'}
                    disabled={!selectedExecutorDefId}
                    clearable
                    searchable
                    controlStyle={SOURCE_SELECT_TRIGGER_STYLE}
                    onChange={value => updateFormValues(props, { selectedExecutorReleaseId: value })}
                  />
                </div>
                {!!currentReleaseId && (
                  <span style={{ flex: '0 0 auto' }}>
                    {tagPill('当前', { background: '#e0f2fe', color: '#0369a1' })}
                  </span>
                )}
              </div>
            </>
          )}

          {sourceMode === 'upload' && (
            <>
              <div className="nop-lprocess-v2__source-field nop-lprocess-v2__source-field--upload">
                <span style={SOURCE_FIELD_LABEL_STYLE}>文件</span>
                <div className="nop-lprocess-v2__source-field-control">
                  {renderAmisControl('l-process-console-v2-upload-file', {
                    type: 'input-file',
                    name: 'packageFile',
                    label: false,
                    size: 'sm',
                    required: true,
                    receiver: '/f/upload?bizObjName=LProcessConsole&fieldName=packageFile',
                    useChunk: false,
                    accept: '.zip,.jar',
                  })}
                </div>
              </div>

              <div className="nop-lprocess-v2__source-action">
                {renderAmisControl('l-process-console-v2-upload-submit', {
                  type: 'button',
                  label: '上传',
                  level: 'primary',
                  size: 'sm',
                  actionType: 'submit',
                })}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  function renderSourceHint() {
    if (sourceMode === 'upload' && uploadSnapshotLocked) {
      return (
        <div className="nop-lprocess-v2__hint-box">
          当前处于上传压缩包模式，待上传并解析。
        </div>
      )
    }

    if (sourceMode === 'existing' && !selectedExecutorDefId) {
      return (
        <div className="nop-lprocess-v2__hint-box">
          请选择现有执行器后再查看当前快照。
        </div>
      )
    }

    if (sourceMode === 'existing' && selectedExecutorDefId && !selectedExecutorReleaseId) {
      return (
        <div className="nop-lprocess-v2__hint-box">
          请选择版本后再查看当前快照。
        </div>
      )
    }

    return null
  }

  const sourceHint = renderSourceHint()

  return (
    <div style={PAGE_WRAPPER_STYLE}>
      <style>{`
        ${LPROCESS_V2_CSS}
        .nop-lprocess-v2 table tbody tr:hover td { background: #eef6ff; }
      `}</style>
      <div className="nop-lprocess-v2" style={PAGE_CONTENT_STYLE}>

        {error && (
          <div style={ERROR_ALERT_STYLE}>
            {error}
          </div>
        )}

        <section style={{ ...STICKY_SECTION_STYLE, top: stickyTopOffset }} className="nop-lprocess-v2__sticky">
          <div className="nop-lprocess-v2__sticky-body">
            <div className="nop-lprocess-v2__sticky-top">
              <div className="nop-lprocess-v2__sticky-head">
                <div className="nop-lprocess-v2__sticky-head-main">
                  <div className="nop-lprocess-v2__sticky-title">{snapshot?.executorName || '执行器信息'}</div>
                  {snapshot && (
                    <TextActionButton label="编辑" onClick={() => setExecutorEditing(true)} />
                  )}
                </div>
                <div className="nop-lprocess-v2__sticky-tags">
                  {snapshot?.executorCode && tagPill(snapshot.executorCode, { background: '#eef2ff', color: '#4338ca' })}
                  {snapshot?.releaseVersion && tagPill(`v${snapshot.releaseVersion}`, { background: '#eff6ff', color: '#1d4ed8' })}
                  {snapshot?.parseStatus && statusTag(snapshot.parseStatus, lower(snapshot.parseStatus) === 'success')}
                  {snapshot?.language && dataTypeTag(snapshot.language)}
                  {snapshot?.entryType && tagPill(snapshot.entryType, { background: '#eef2ff', color: '#4338ca' })}
                  {snapshot?.compatLevel && tagPill(snapshot.compatLevel, { background: '#f8fafc', color: '#475569' })}
                  {snapshot && countTag('配', snapshot.configCount)}
                  {snapshot && countTag('法', snapshot.methodCount)}
                  {snapshot && countTag('入', snapshot.inputFieldCount)}
                  {snapshot && countTag('出', snapshot.outputFieldCount)}
                </div>
              </div>
            </div>
            {renderSourceControls()}

            {snapshot && (snapshot.mainClass || snapshot.description) && (
              <div className="nop-lprocess-v2__sticky-meta">
                {renderStickyMetaItem('入口', snapshot.mainClass || '-')}
                {renderStickyMetaItem('说明', snapshot.description || '-', true)}
              </div>
            )}
          </div>

          {(!sourceReady || (sourceReady && loading && !snapshot)) && (
            <div className="nop-lprocess-v2__notice">
              {sourceHint}
              {!sourceReady && !sourceHint && (
                <div className="nop-lprocess-v2__hint-box">
                  先选择执行器或上传压缩包，再查看下方数据。
                </div>
              )}
              {sourceReady && loading && !snapshot && (
                <div className="nop-lprocess-v2__hint-box">
                  正在加载当前快照...
                </div>
              )}
            </div>
          )}

          {sourceReady && !loading && !snapshot && !error && (
            <div className="nop-lprocess-v2__notice">
              <div className="nop-lprocess-v2__hint-box">
                已选择当前来源，但未获取到快照数据。
              </div>
            </div>
          )}
        </section>

        {snapshot && (
          <>
            <section style={SECTION_CARD_STYLE}>
              <div style={SECTION_HEADER_STYLE}>
                <div style={SECTION_HEAD_MAIN_STYLE}>
                  <div style={SECTION_TITLE_STYLE}>执行器配置</div>
                  <div style={SECTION_DESC_STYLE}>共 {snapshot.configCount || 0} 条 / 当前 {filteredConfigs.length} 条</div>
                </div>
                <IconButton title={configCollapsed ? '展开配置' : '收起配置'} onClick={() => setConfigCollapsed(value => !value)}>
                  <CollapseIcon collapsed={configCollapsed} />
                </IconButton>
              </div>
              {!configCollapsed && (
                <div style={PANEL_BODY_STYLE}>
                  <SearchToolbar
                    chooser={(
                      <ColumnChooser
                        title="执行器配置列"
                        columns={CONFIG_COLUMNS}
                        visibility={configColumns}
                        fixed={configColumnFixed}
                        order={configColumnOrder}
                        density={tableDensity}
                        onToggle={toggleConfigColumn}
                        onMove={(key, direction) => setConfigColumnOrder(prev => moveColumn(prev, key, direction))}
                        onFixed={(key, position) => toggleFixed(setConfigColumnFixed, key, position)}
                        onReset={() => {
                          setConfigColumns(DEFAULT_CONFIG_COLUMNS)
                          setConfigColumnOrder(CONFIG_COLUMNS.map(column => column.key))
                          setConfigColumnFixed({})
                          setConfigColumnWidths(DEFAULT_CONFIG_WIDTHS)
                          setTableDensity('compact')
                        }}
                        onDensityChange={setTableDensity}
                      />
                    )}
                    filter={configFilter}
                    options={CONFIG_SEARCH_OPTIONS}
                    placeholder="默认搜索全部配置字段"
                    resetLabel="重置"
                    onChange={setConfigFilter}
                  />
                  <div style={TABLE_SCROLL_STYLE}>
                    <table style={TABLE_STYLE}>
                      <thead>
                        <tr>
                          {visibleConfigColumns.map(column => (
                            <th
                              key={column.key}
                              style={{
                                ...densityMetrics().th,
                                position: 'relative',
                                minWidth: configColumnWidths[column.key] || columnWidth(column),
                                width: configColumnWidths[column.key] || columnWidth(column),
                                ...stickyCellStyle(column, configColumnFixed, configSticky.leftOffsets, configSticky.rightOffsets, true),
                              }}
                            >
                              {column.label}
                              <span
                                role="separator"
                                aria-orientation="vertical"
                                title={`拖拽调整${column.label}列宽`}
                                style={resizeHandleStyle()}
                                onMouseDown={event => startColumnResize(event, column.key, configColumnWidths[column.key] || columnWidth(column), setConfigColumnWidths)}
                              >
                                <span style={resizeGripStyle()} />
                              </span>
                            </th>
                          ))}
                          <th style={{ ...densityMetrics().th, ...operationCellStyle(true) }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredConfigs.length > 0
                          ? filteredConfigs.map(item => (
                              <tr key={item.configSpecId || item.configKey}>
                                {visibleConfigColumns.map(column => (
                                  <td
                                    key={column.key}
                                    style={{
                                      ...densityMetrics().td,
                                      minWidth: configColumnWidths[column.key] || columnWidth(column),
                                      width: configColumnWidths[column.key] || columnWidth(column),
                                      ...stickyCellStyle(column, configColumnFixed, configSticky.leftOffsets, configSticky.rightOffsets),
                                    }}
                                  >
                                    {renderConfigCell(item, column.key)}
                                  </td>
                                ))}
                                <td style={{ ...densityMetrics().td, ...operationCellStyle() }}>
                                  <TextActionButton label="编辑" title="编辑配置项" onClick={() => openConfigEditor(item)} />
                                </td>
                              </tr>
                            ))
                          : (
                              <tr>
                                <td style={densityMetrics().td} colSpan={(visibleConfigColumns.length || 1) + 1}>
                                  暂无匹配的配置项。
                                </td>
                              </tr>
                            )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            <section style={SECTION_CARD_STYLE}>
              <div style={SECTION_HEADER_STYLE}>
                <div style={SECTION_HEAD_MAIN_STYLE}>
                  <div style={SECTION_TITLE_STYLE}>执行器方法列表</div>
                  <div style={SECTION_DESC_STYLE}>共 {snapshot.methodCount || 0} 条 / 当前 {filteredMethods.length} 条</div>
                </div>
                <IconButton title={methodCollapsed ? '展开方法列表' : '收起方法列表'} onClick={() => setMethodCollapsed(value => !value)}>
                  <CollapseIcon collapsed={methodCollapsed} />
                </IconButton>
              </div>
              {!methodCollapsed && (
                <div style={PANEL_BODY_STYLE}>
                  <SearchToolbar
                    chooser={(
                      <ColumnChooser
                        title="执行器方法列"
                        columns={METHOD_COLUMNS}
                        visibility={methodColumns}
                        fixed={methodColumnFixed}
                        order={methodColumnOrder}
                        density={tableDensity}
                        onToggle={toggleMethodColumn}
                        onMove={(key, direction) => setMethodColumnOrder(prev => moveColumn(prev, key, direction))}
                        onFixed={(key, position) => toggleFixed(setMethodColumnFixed, key, position)}
                        onReset={() => {
                          setMethodColumns(DEFAULT_METHOD_COLUMNS)
                          setMethodColumnOrder(METHOD_COLUMNS.map(column => column.key))
                          setMethodColumnFixed({})
                          setMethodColumnWidths(DEFAULT_METHOD_WIDTHS)
                          setTableDensity('compact')
                        }}
                        onDensityChange={setTableDensity}
                      />
                    )}
                    filter={methodFilter}
                    options={METHOD_SEARCH_OPTIONS}
                    placeholder="默认搜索全部方法字段"
                    resetLabel="重置"
                    onChange={setMethodFilter}
                  />
                  <div style={TABLE_SCROLL_STYLE}>
                    <table style={TABLE_STYLE}>
                      <thead>
                        <tr>
                          {visibleMethodColumns.map(column => (
                            <th
                              key={column.key}
                              style={{
                                ...densityMetrics().th,
                                position: 'relative',
                                minWidth: methodColumnWidths[column.key] || columnWidth(column),
                                width: methodColumnWidths[column.key] || columnWidth(column),
                                ...stickyCellStyle(column, methodColumnFixed, methodSticky.leftOffsets, methodSticky.rightOffsets, true),
                              }}
                            >
                              {column.label}
                              <span
                                role="separator"
                                aria-orientation="vertical"
                                title={`拖拽调整${column.label}列宽`}
                                style={resizeHandleStyle()}
                                onMouseDown={event => startColumnResize(event, column.key, methodColumnWidths[column.key] || columnWidth(column), setMethodColumnWidths)}
                              >
                                <span style={resizeGripStyle()} />
                              </span>
                            </th>
                          ))}
                          <th style={{ ...densityMetrics().th, ...operationCellStyle(true) }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMethods.length > 0
                          ? filteredMethods.map(item => (
                              <tr key={item.methodId || item.methodCode}>
                                {visibleMethodColumns.map(column => (
                                  <td
                                    key={column.key}
                                    style={{
                                      ...densityMetrics().td,
                                      minWidth: methodColumnWidths[column.key] || columnWidth(column),
                                      width: methodColumnWidths[column.key] || columnWidth(column),
                                      ...stickyCellStyle(column, methodColumnFixed, methodSticky.leftOffsets, methodSticky.rightOffsets),
                                    }}
                                  >
                                    {renderMethodCell(item, column.key)}
                                  </td>
                                ))}
                                <td style={{ ...densityMetrics().td, ...operationCellStyle() }}>
                                  <TextActionButton label="编辑" title="编辑方法" onClick={() => openMethodEditor(item)} />
                                </td>
                              </tr>
                            ))
                          : (
                              <tr>
                                <td style={densityMetrics().td} colSpan={(visibleMethodColumns.length || 1) + 1}>
                                  暂无匹配的方法。
                                </td>
                              </tr>
                            )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            <section style={SECTION_CARD_STYLE}>
              <div style={SECTION_HEADER_STYLE}>
                <div style={SECTION_HEAD_MAIN_STYLE}>
                  <div style={SECTION_TITLE_STYLE}>执行器方法参数</div>
                  <div style={SECTION_DESC_STYLE}>共 {paramRowCount} 条，按方法 / 入参 / 出参合并</div>
                </div>
                <IconButton title={paramCollapsed ? '展开参数表' : '收起参数表'} onClick={() => setParamCollapsed(value => !value)}>
                  <CollapseIcon collapsed={paramCollapsed} />
                </IconButton>
              </div>
              {!paramCollapsed && (
                <div style={PANEL_BODY_STYLE}>
                  <SearchToolbar
                    chooser={(
                      <ColumnChooser
                        title="方法参数列"
                        columns={PARAM_COLUMNS}
                        visibility={paramColumns}
                        fixed={paramColumnFixed}
                        order={paramColumnOrder}
                        density={tableDensity}
                        onToggle={toggleParamColumn}
                        onMove={(key, direction) => setParamColumnOrder(prev => moveColumn(prev, key, direction))}
                        onFixed={(key, position) => toggleFixed(setParamColumnFixed, key, position)}
                        onReset={() => {
                          setParamColumns(DEFAULT_PARAM_COLUMNS)
                          setParamColumnOrder(PARAM_COLUMNS.map(column => column.key))
                          setParamColumnFixed({})
                          setParamColumnWidths(DEFAULT_PARAM_WIDTHS)
                          setTableDensity('compact')
                        }}
                        onDensityChange={setTableDensity}
                      />
                    )}
                    filter={paramFilter}
                    options={PARAM_SEARCH_OPTIONS}
                    placeholder="默认搜索全部参数字段"
                    resetLabel="重置"
                    onChange={setParamFilter}
                  />
                  <div style={TABLE_SCROLL_STYLE}>
                    <table style={TABLE_STYLE}>
                      <thead>
                        <tr>
                          {visibleParamColumns.map(column => (
                            <th
                              key={column.key}
                              style={{
                                ...densityMetrics().th,
                                position: 'relative',
                                minWidth: paramColumnWidths[column.key] || columnWidth(column),
                                width: paramColumnWidths[column.key] || columnWidth(column),
                                ...stickyCellStyle(column, paramColumnFixed, paramSticky.leftOffsets, paramSticky.rightOffsets, true),
                              }}
                            >
                              {column.label}
                              <span
                                role="separator"
                                aria-orientation="vertical"
                                title={`拖拽调整${column.label}列宽`}
                                style={resizeHandleStyle()}
                                onMouseDown={event => startColumnResize(event, column.key, paramColumnWidths[column.key] || columnWidth(column), setParamColumnWidths)}
                              >
                                <span style={resizeGripStyle()} />
                              </span>
                            </th>
                          ))}
                          <th style={{ ...densityMetrics().th, ...operationCellStyle(true) }}>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paramGroups.length > 0
                          ? paramGroups.flatMap((group) => {
                              const groupKey = group.method.methodId || group.method.methodCode || `method-${group.method.methodSignature || 'unknown'}`
                              return group.roleGroups.flatMap((roleGroup, roleIndex) => roleGroup.rows.map((field, rowIndex) => {
                                const roleKey = `${groupKey}:${roleGroup.role}`
                                const rowKey = `${roleKey}:${field.fieldId || field.fieldPath || field.fieldName || rowIndex}`
                                const highlightMethod = hoveredParamRow?.groupKey === groupKey
                                const highlightRole = hoveredParamRow?.roleKey === roleKey
                                const highlightRow = hoveredParamRow?.rowKey === rowKey

                                return (
                                <tr
                                  key={rowKey}
                                  onMouseEnter={() => setHoveredParamRow({ groupKey, roleKey, rowKey })}
                                  onMouseLeave={() => {
                                    setHoveredParamRow(current => current?.rowKey === rowKey ? null : current)
                                  }}
                                >
                                  {visibleParamColumns.map((column) => {
                                    if (column.key === 'method') {
                                      if (!(roleIndex === 0 && rowIndex === 0))
                                        return null
                                      return (
                                        <td
                                          key={column.key}
                                          style={{
                                            ...densityMetrics().td,
                                            minWidth: paramColumnWidths[column.key] || columnWidth(column),
                                            width: paramColumnWidths[column.key] || columnWidth(column),
                                            ...stickyCellStyle(column, paramColumnFixed, paramSticky.leftOffsets, paramSticky.rightOffsets),
                                            ...highlightedCellStyle(highlightMethod),
                                          }}
                                          rowSpan={group.rowCount}
                                      >
                                          {methodSummaryCell(group.method, paramFilter.keyword)}
                                        </td>
                                      )
                                    }

                                    if (column.key === 'role') {
                                      if (rowIndex !== 0)
                                        return null
                                      return (
                                        <td
                                          key={column.key}
                                          style={{
                                            ...densityMetrics().td,
                                            minWidth: paramColumnWidths[column.key] || columnWidth(column),
                                            width: paramColumnWidths[column.key] || columnWidth(column),
                                            ...stickyCellStyle(column, paramColumnFixed, paramSticky.leftOffsets, paramSticky.rightOffsets),
                                            ...highlightedCellStyle(highlightRole),
                                          }}
                                          rowSpan={roleGroup.rows.length}
                                        >
                                          {roleTag(highlightText(roleGroup.role === 'INPUT' ? '入参' : '出参', paramFilter.keyword), roleGroup.role)}
                                        </td>
                                      )
                                    }

                                    let value: React.ReactNode = '-'
                                    switch (column.key) {
                                      case 'fieldName':
                                        value = <strong>{highlightText(field.fieldName || '-', paramFilter.keyword)}</strong>
                                        break
                                      case 'fieldPath':
                                        value = highlightText(field.fieldPath || '-', paramFilter.keyword)
                                        break
                                      case 'dataType':
                                        value = dataTypeTag(field.dataType, paramFilter.keyword)
                                        break
                                      case 'javaType':
                                        value = highlightText(field.javaType || '-', paramFilter.keyword)
                                        break
                                      case 'required':
                                        value = statusTag(highlightText(toDisplayBool(field.required), paramFilter.keyword), field.required)
                                        break
                                      case 'defaultValue':
                                        value = highlightText(field.defaultValue || '-', paramFilter.keyword)
                                        break
                                      case 'description':
                                        value = highlightText(field.description || '-', paramFilter.keyword)
                                        break
                                      case 'remark':
                                        value = highlightText(field.remark || '-', paramFilter.keyword)
                                        break
                                    }

                                    return (
                                      <td
                                        key={column.key}
                                        style={{
                                          ...densityMetrics().td,
                                          minWidth: paramColumnWidths[column.key] || columnWidth(column),
                                          width: paramColumnWidths[column.key] || columnWidth(column),
                                          ...stickyCellStyle(column, paramColumnFixed, paramSticky.leftOffsets, paramSticky.rightOffsets),
                                          ...highlightedCellStyle(highlightRow),
                                        }}
                                      >
                                        {value}
                                      </td>
                                    )
                                  })}
                                  <td style={{ ...densityMetrics().td, ...operationCellStyle(), ...highlightedCellStyle(highlightRow) }}>
                                    <TextActionButton label="编辑" title="编辑参数" onClick={() => openFieldEditor(field)} />
                                  </td>
                                </tr>
                                )
                              }))
                            })
                          : (
                              <tr>
                                <td style={densityMetrics().td} colSpan={(visibleParamColumns.length || 1) + 1}>
                                  暂无匹配的参数记录。
                                </td>
                              </tr>
                            )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {snapshot && executorEditing && (
          <div style={MODAL_OVERLAY_STYLE}>
            <div style={EXECUTOR_HEADER_MODAL_STYLE}>
              <div style={MODAL_HEADER_STYLE}>
                <div>
                  <div className="nop-lprocess-v2__dialog-title">编辑执行器信息</div>
                  <div className="nop-lprocess-v2__dialog-subtitle">保存后会刷新当前快照。</div>
                </div>
                <IconButton
                  title="关闭编辑窗口"
                  onClick={() => {
                    setExecutorEditing(false)
                    setExecutorDraft(emptyDraft(snapshot))
                  }}
                  danger
                >
                  <CloseIcon />
                </IconButton>
              </div>
              <div style={MODAL_BODY_STYLE}>
                <div style={MODAL_FORM_GRID_STYLE}>
                  {renderInputItem('执行器编码', <input value={executorDraft.executorCode} onChange={e => setExecutorDraft(prev => ({ ...prev, executorCode: e.target.value }))} style={INPUT_STYLE} />)}
                  {renderInputItem('执行器名称', <input value={executorDraft.executorName} onChange={e => setExecutorDraft(prev => ({ ...prev, executorName: e.target.value }))} style={INPUT_STYLE} />)}
                  {renderInputItem('语言', (
                    <select value={valueOfOption(LANGUAGE_OPTIONS, executorDraft.language)} onChange={e => setExecutorDraft(prev => ({ ...prev, language: e.target.value }))} style={INPUT_STYLE}>
                      <option value="">请选择</option>
                      {LANGUAGE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ))}
                  {renderInputItem('发布版本号', <input value={executorDraft.releaseVersion} onChange={e => setExecutorDraft(prev => ({ ...prev, releaseVersion: e.target.value }))} style={INPUT_STYLE} />)}
                  {renderInputItem('主类/入口点', <input value={executorDraft.mainClass} onChange={e => setExecutorDraft(prev => ({ ...prev, mainClass: e.target.value }))} style={INPUT_STYLE} />)}
                  {renderInputItem('调用入口类型', (
                    <select value={valueOfOption(ENTRY_TYPE_OPTIONS, executorDraft.entryType)} onChange={e => setExecutorDraft(prev => ({ ...prev, entryType: e.target.value }))} style={INPUT_STYLE}>
                      <option value="">请选择</option>
                      {ENTRY_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ))}
                  {renderInputItem('描述', (
                    <textarea
                      value={executorDraft.description}
                      onChange={e => setExecutorDraft(prev => ({ ...prev, description: e.target.value }))}
                      style={FULL_WIDTH_TEXTAREA_STYLE}
                    />
                  ))}
                </div>
              </div>
              <div style={MODAL_FOOTER_STYLE}>
                <button
                  type="button"
                  onClick={() => {
                    setExecutorEditing(false)
                    setExecutorDraft(emptyDraft(snapshot))
                  }}
                  style={secondaryButtonStyle()}
                >
                  取消
                </button>
                <button type="button" onClick={saveExecutorInfo} disabled={executorSaving} style={primaryButtonStyle()}>
                  {executorSaving ? '提交中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editDialog && (
          <div style={MODAL_OVERLAY_STYLE}>
            <div style={EXECUTOR_HEADER_MODAL_STYLE}>
              <div style={MODAL_HEADER_STYLE}>
                <div>
                  <div className="nop-lprocess-v2__dialog-title">
                    {editDialog.kind === 'config' ? '编辑配置项' : editDialog.kind === 'method' ? '编辑方法' : '编辑参数'}
                  </div>
                  <div className="nop-lprocess-v2__dialog-subtitle">当前先提供弹窗编辑形态，保存接口待补。</div>
                </div>
                <IconButton title="关闭编辑窗口" onClick={() => setEditDialog(null)} danger>
                  <CloseIcon />
                </IconButton>
              </div>
              <div style={MODAL_BODY_STYLE}>
                {editDialog.kind === 'config'
                  ? (
                      <div style={MODAL_FORM_GRID_STYLE}>
                        {renderInputItem('配置键', <input value={editDialog.item.configKey || ''} onChange={e => updateDialogField('configKey', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('配置名称', <input value={editDialog.item.configName || ''} onChange={e => updateDialogField('configName', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('配置类型', <input value={editDialog.item.configType || ''} onChange={e => updateDialogField('configType', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('默认值', <input value={editDialog.item.defaultValue || ''} onChange={e => updateDialogField('defaultValue', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('必填', (
                          <select value={normalizeBoolText(editDialog.item.required)} onChange={e => updateDialogField('required', e.target.value === 'true')} style={INPUT_STYLE}>
                            <option value="">未设置</option>
                            <option value="true">是</option>
                            <option value="false">否</option>
                          </select>
                        ))}
                        {renderInputItem('敏感', (
                          <select value={normalizeBoolText(editDialog.item.secretFlag)} onChange={e => updateDialogField('secretFlag', e.target.value === 'true')} style={INPUT_STYLE}>
                            <option value="">未设置</option>
                            <option value="true">是</option>
                            <option value="false">否</option>
                          </select>
                        ))}
                        {renderInputItem('描述', <textarea value={editDialog.item.description || ''} onChange={e => updateDialogField('description', e.target.value)} style={TEXTAREA_STYLE} />)}
                        {renderInputItem('备注', <textarea value={editDialog.item.remark || ''} onChange={e => updateDialogField('remark', e.target.value)} style={TEXTAREA_STYLE} />)}
                      </div>
                    )
                  : editDialog.kind === 'method'
                    ? (
                      <div style={MODAL_FORM_GRID_STYLE}>
                        {renderInputItem('方法编码', <input value={editDialog.item.methodCode || ''} onChange={e => updateDialogField('methodCode', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('方法名称', <input value={editDialog.item.methodName || ''} onChange={e => updateDialogField('methodName', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('方法签名', <input value={editDialog.item.methodSignature || ''} onChange={e => updateDialogField('methodSignature', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('返回类型', <input value={editDialog.item.returnJavaType || ''} onChange={e => updateDialogField('returnJavaType', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('调用方式', <input value={editDialog.item.invokeMode || ''} onChange={e => updateDialogField('invokeMode', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('幂等', (
                          <select value={normalizeBoolText(editDialog.item.idempotentFlag)} onChange={e => updateDialogField('idempotentFlag', e.target.value === 'true')} style={INPUT_STYLE}>
                            <option value="">未设置</option>
                            <option value="true">是</option>
                            <option value="false">否</option>
                          </select>
                        ))}
                        {renderInputItem('入参数量', <input value={String(editDialog.item.inputCount ?? '')} onChange={e => updateDialogField('inputCount', Number(e.target.value || 0))} style={INPUT_STYLE} />)}
                        {renderInputItem('出参数量', <input value={String(editDialog.item.outputCount ?? '')} onChange={e => updateDialogField('outputCount', Number(e.target.value || 0))} style={INPUT_STYLE} />)}
                        {renderInputItem('描述', <textarea value={editDialog.item.description || ''} onChange={e => updateDialogField('description', e.target.value)} style={TEXTAREA_STYLE} />)}
                        {renderInputItem('备注', <textarea value={editDialog.item.remark || ''} onChange={e => updateDialogField('remark', e.target.value)} style={TEXTAREA_STYLE} />)}
                      </div>
                      )
                    : (
                      <div style={MODAL_FORM_GRID_STYLE}>
                        {renderInputItem('所属方法编码', <input value={editDialog.item.methodCode || ''} onChange={e => updateDialogField('methodCode', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('所属方法名称', <input value={editDialog.item.methodName || ''} onChange={e => updateDialogField('methodName', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('参数角色', (
                          <select value={editDialog.item.schemaRole || ''} onChange={e => updateDialogField('schemaRole', e.target.value)} style={INPUT_STYLE}>
                            <option value="">未设置</option>
                            <option value="INPUT">入参</option>
                            <option value="OUTPUT">出参</option>
                          </select>
                        ))}
                        {renderInputItem('参数名', <input value={editDialog.item.fieldName || ''} onChange={e => updateDialogField('fieldName', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('参数路径', <input value={editDialog.item.fieldPath || ''} onChange={e => updateDialogField('fieldPath', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('数据类型', <input value={editDialog.item.dataType || ''} onChange={e => updateDialogField('dataType', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('Java类型', <input value={editDialog.item.javaType || ''} onChange={e => updateDialogField('javaType', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('默认值', <input value={editDialog.item.defaultValue || ''} onChange={e => updateDialogField('defaultValue', e.target.value)} style={INPUT_STYLE} />)}
                        {renderInputItem('必填', (
                          <select value={normalizeBoolText(editDialog.item.required)} onChange={e => updateDialogField('required', e.target.value === 'true')} style={INPUT_STYLE}>
                            <option value="">未设置</option>
                            <option value="true">是</option>
                            <option value="false">否</option>
                          </select>
                        ))}
                        {renderInputItem('排序号', <input value={String(editDialog.item.sortNo ?? '')} onChange={e => updateDialogField('sortNo', Number(e.target.value || 0))} style={INPUT_STYLE} />)}
                        {renderInputItem('描述', <textarea value={editDialog.item.description || ''} onChange={e => updateDialogField('description', e.target.value)} style={TEXTAREA_STYLE} />)}
                        {renderInputItem('备注', <textarea value={editDialog.item.remark || ''} onChange={e => updateDialogField('remark', e.target.value)} style={TEXTAREA_STYLE} />)}
                      </div>
                    )}
              </div>
              <div style={MODAL_FOOTER_STYLE}>
                <button type="button" onClick={() => setEditDialog(null)} style={secondaryButtonStyle()}>
                  关闭
                </button>
                <button type="button" onClick={notifyEditorNotReady} style={primaryButtonStyle()}>
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function renderInputItem(label: string, input: React.ReactNode) {
  return (
    <label className="nop-lprocess-v2__field">
      <span className="nop-lprocess-v2__field-label">{label}</span>
      {input}
    </label>
  )
}

function primaryButtonStyle(): React.CSSProperties {
  return {
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: '#fff',
    borderRadius: 6,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#334155',
    borderRadius: 6,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

export default LProcessConsoleV2View
