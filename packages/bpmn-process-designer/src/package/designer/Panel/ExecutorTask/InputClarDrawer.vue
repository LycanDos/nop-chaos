<!--
  入参 Clar 编辑抽屉
  复用 PolicyStudio 组件实现完整的校验和值管理能力
  
  结构说明:
  - 左侧: 可用变量面板 (可拖拽调整宽度，收缩后只留小 tab)
    - 使用 vanilla-jsoneditor 展示变量 JSON
  - 右侧: Clar 编辑区 (使用 PolicyStudio 组件)
    - 校验集 tab: 执行器开发者层 (只读) + 流程模板设计者层 (可编辑)
-->
<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { PolicyStudio } from '@nop-chaos/policy-studio'
import { DoubleLeftOutlined, DoubleRightOutlined, LoadingOutlined, SettingOutlined } from '@ant-design/icons-vue'
import type { InputPolicyDocument, MethodSchemaFieldItem, VariableItem } from '@/types/executor.ts'
import type { PolicyDocument, PolicySchema, PolicyLayer } from '@nop-chaos/policy-studio/types'
import { ajaxRequest } from '@nop-chaos/nop-core'
import JsonPreviewEditor from './JsonPreviewEditor.vue'

defineOptions({ name: 'InputClarDrawer' , inheritAttrs: false })

const emit = defineEmits<{
  (e: 'confirm', document: InputPolicyDocument): void
  (e: 'close'): void
}>()

const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const methodId = ref('')
const nodeId = ref('')

// 变量面板宽度 (可拖拽调整)
const variablePanelWidth = ref(300)
const variablePanelCollapsed = ref(false)
const isDraggingPanel = ref(false)
const panelMinWidth = 28
const panelMaxWidth = 450
const dragStartX = ref(0)
const dragStartWidth = ref(0)
const variablePanelRef = ref<HTMLElement | null>(null)

// PolicyStudio 数据
const schema = ref<PolicySchema>({ id: '', name: '未加载 Schema', fields: [] })
const documentValue = ref<PolicyDocument>({
  id: 'input-clar',
  name: '入参 Clar',
  layers: []
})
const developerPolicyDocument = ref<PolicyDocument>({
  id: 'input-clar-developer',
  name: '执行器开发者层',
  layers: []
})
const sampleData = ref<Record<string, any>>({})

// 可用变量
const availableVariables = ref<{
  system: VariableItem[]   // 系统注入: currentUserId, tenantId, now 等
  context: VariableItem[]  // 变量池: 流程中前序节点写入的变量
  field: VariableItem[]    // 当前入参: 当前执行节点的其他入参字段
}>({
  system: [],
  context: [],
  field: []
})

// 当前选中的变量来源 tab
const activeVariableTab = ref<'system' | 'context' | 'field'>('field')
const previewEditorKey = ref(0)

const currentVariableJsonValue = computed(() => {
  const preview = buildVariablePreviewJson(
    activeVariableTab.value,
    availableVariables.value,
    schema.value,
    sampleData.value,
  )

  console.log('[ClarDebug][InputClarDrawer] currentVariableJsonValue recomputed', {
    activeVariableTab: activeVariableTab.value,
    fieldCount: availableVariables.value.field.length,
    contextCount: availableVariables.value.context.length,
    systemCount: availableVariables.value.system.length,
    sampleDataKeys: sampleData.value && typeof sampleData.value === 'object' ? Object.keys(sampleData.value).slice(0, 10) : [],
    schemaFieldCount: Array.isArray(schema.value?.fields) ? schema.value.fields.length : 0,
    previewSummary: summarizeJsonValue(preview),
  })

  return preview
})

const EXECUTOR_DEVELOPER_LAYER_ID = 'input-clar-executor-developer-layer'
const DESIGNER_LAYER_ID = 'input-clar-designer-layer'
const EXECUTOR_DEVELOPER_LAYER_NAME = '执行器开发者层'
const DESIGNER_LAYER_NAME = '流程模板设计层'

/**
 * 打开抽屉
 */
async function openDrawer(
  currentMethodId: string,
  currentNodeId: string,
  currentProcessDefId?: string,
  currentDocument?: InputPolicyDocument,
  fields?: MethodSchemaFieldItem[]
) {
  console.log('[ClarDebug][InputClarDrawer] openDrawer:start', {
    currentMethodId,
    currentNodeId,
    currentProcessDefId,
    incomingDocumentLayerCount: currentDocument?.layers?.length || 0,
    incomingFieldsCount: fields?.length || 0,
    incomingFields: (fields || []).map((field) => ({
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      fieldPath: field.fieldPath,
      schemaRole: field.schemaRole,
      dataType: field.dataType,
    })),
  })

  methodId.value = currentMethodId
  nodeId.value = currentNodeId
  variablePanelCollapsed.value = false
  variablePanelWidth.value = 300
  isDraggingPanel.value = false
  
  visible.value = true
  loading.value = true
  error.value = ''
  
  try {
    // 加载入参 Clar + 执行器开发者层数据
    const [inputResponse, developerResponse] = await Promise.all([
      loadInputPolicyStudio(currentMethodId, currentNodeId, currentProcessDefId),
      loadMethodPolicyStudio(currentMethodId).catch((err) => {
        console.warn('[InputClarDrawer] 加载执行器开发者层失败:', err)
        return null
      }),
    ])

    const fallbackDocument = parseJson(inputResponse.documentJson)
    const developerDocument = parseJson(developerResponse?.documentJson)

    const nextSchema = applyDescriptionAsLabel(parseJson(inputResponse.schemaJson))
    console.log('[ClarDebug][InputClarDrawer] openDrawer:responses', {
      inputResponseSummary: summarizeResponsePayload(inputResponse),
      developerResponseSummary: summarizeResponsePayload(developerResponse),
      fallbackDocumentSummary: summarizeDocument(fallbackDocument),
      developerDocumentSummary: summarizeDocument(developerDocument),
      schemaSummary: summarizeSchema(nextSchema),
      availableVariablesRawSummary: summarizeAvailableVariablesRaw(inputResponse?.availableVariables),
    })

    schema.value = nextSchema
    developerPolicyDocument.value = normalizeMethodPolicyDocument(developerDocument)
    documentValue.value = normalizeInputPolicyDocument(
      currentDocument || fallbackDocument,
      fallbackDocument,
      developerPolicyDocument.value,
    )
    sampleData.value = resolveSampleData(inputResponse.sampleDataJson, nextSchema)
    availableVariables.value = normalizeAvailableVariables(inputResponse.availableVariables, fields, nextSchema)
    activeVariableTab.value = resolveInitialVariableTab(availableVariables.value)
    previewEditorKey.value += 1

    console.log('[ClarDebug][InputClarDrawer] openDrawer:ready', {
      normalizedDocumentSummary: summarizeDocument(documentValue.value),
      normalizedDeveloperDocumentSummary: summarizeDocument(developerPolicyDocument.value),
      normalizedAvailableVariables: summarizeNormalizedVariables(availableVariables.value),
      activeVariableTab: activeVariableTab.value,
      sampleDataSummary: summarizeJsonValue(sampleData.value),
      previewEditorKey: previewEditorKey.value,
    })
    
  } catch (err: any) {
    error.value = err?.message || '加载入参 Clar 数据失败'
    console.error('[InputClarDrawer] 加载失败:', err)
  } finally {
    loading.value = false
  }
}

/**
 * 加载入参 PolicyStudio 数据
 */
async function loadInputPolicyStudio(methodId: string, nodeId: string, processDefId?: string) {
  console.log('[ClarDebug][InputClarDrawer] loadInputPolicyStudio:request', {
    methodId,
    nodeId,
    processDefId,
  })

  const response = await ajaxRequest({
    url: '@query:LProcessConsole__loadInputPolicyStudio',
    method: 'post',
    data: {
      methodId,
      nodeId,
      processDefId: processDefId || undefined,
    },
    'gql:selection': 'methodId,methodCode,methodName,schemaJson,documentJson,sampleDataJson,availableVariables{system{name,path,type,source,description}context{name,path,type,source,description}field{name,path,type,source,description}}title,subtitle'
  }, {
    methodId,
    nodeId,
    processDefId
  })

  const payload = extractPayload(response)
  console.log('[ClarDebug][InputClarDrawer] loadInputPolicyStudio:response', {
    payloadSummary: summarizeResponsePayload(payload),
  })

  return payload
}

/**
 * 加载执行器开发者层 PolicyStudio 数据
 */
async function loadMethodPolicyStudio(methodId: string) {
  console.log('[ClarDebug][InputClarDrawer] loadMethodPolicyStudio:request', {
    methodId,
  })

  const response = await ajaxRequest({
    url: '@query:LProcessConsole__loadMethodPolicyStudio',
    method: 'post',
    data: {
      methodId,
      schemaRole: 'INPUT',
    },
    'gql:selection': 'methodId,methodCode,methodName,schemaRole,fieldPath,title,subtitle,schemaJson,documentJson,sampleDataJson'
  }, {
    methodId,
    schemaRole: 'INPUT',
  })

  const payload = extractPayload(response)
  console.log('[ClarDebug][InputClarDrawer] loadMethodPolicyStudio:response', {
    payloadSummary: summarizeResponsePayload(payload),
  })

  return payload
}

/**
 * 保存入参 PolicyStudio 数据
 */
async function saveInputPolicyStudio(methodId: string, nodeId: string, documentJson: string) {
  const response = await ajaxRequest({
    url: '@mutation:LProcessConsole__saveInputPolicyStudio',
    method: 'post',
    data: {
      methodId,
      nodeId,
      documentJson
    },
    'gql:selection': 'success,message,methodId,nodeId'
  }, {
    methodId,
    nodeId,
    documentJson
  })
  
  return extractPayload(response)
}

/**
 * 提取 API 响应数据
 */
function extractPayload(input: any): any {
  if (input == null) return input

  const graphqlRoot = unwrapGraphqlField(input)
  if (graphqlRoot.matched) return extractPayload(graphqlRoot.value)

  if (input.data != null && typeof input.data === 'object' && input.data.status === 0 && input.data.data != null) {
    return extractPayload(input.data.data)
  }

  if (input.status === 0 && input.data != null) {
    return extractPayload(input.data)
  }

  if (input.data != null && typeof input.data === 'object' && input.status != null) {
    return extractPayload(input.data)
  }

  const graphqlData = unwrapGraphqlField(input.data)
  if (graphqlData.matched) return extractPayload(graphqlData.value)

  if (input.data != null && input.data.result != null) {
    return extractPayload(input.data.result)
  }

  if (input.result != null) {
    return extractPayload(input.result)
  }

  return input.data ?? input
}

function unwrapGraphqlField(input: any): { matched: boolean; value: any } {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return { matched: false, value: input }
  }

  const keys = Object.keys(input)
  if (keys.length !== 1) {
    return { matched: false, value: input }
  }

  const key = keys[0]
  if (!key.includes('__')) {
    return { matched: false, value: input }
  }

  return {
    matched: true,
    value: input[key],
  }
}

function normalizeInputPolicyDocument(document: any, fallbackDocument?: any, developerDocument?: any): InputPolicyDocument {
  const sourceDocument = toPlainObject(document || {}) as Partial<InputPolicyDocument> & { layers?: PolicyLayer[] }
  const fallback = toPlainObject(fallbackDocument || {}) as Partial<InputPolicyDocument> & { layers?: PolicyLayer[] }
  const developerSource = toPlainObject(developerDocument || {}) as Partial<InputPolicyDocument> & { layers?: PolicyLayer[] }
  const sourceLayers = Array.isArray(sourceDocument.layers) ? sourceDocument.layers : []
  const fallbackLayers = Array.isArray(fallback.layers) ? fallback.layers : []
  const developerLayers = Array.isArray(developerSource.layers) ? developerSource.layers : []

  const designerSourceLayer = findDesignerLayer(sourceLayers) || findDesignerLayer(fallbackLayers)
  const sourceDeveloperLayers = findDeveloperLayers(sourceLayers)
  const fallbackDeveloperLayers = findDeveloperLayers(fallbackLayers)
  const developerSourceLayers = developerLayers.length > 0
    ? developerLayers
    : sourceDeveloperLayers.length > 0
      ? sourceDeveloperLayers
      : fallbackDeveloperLayers

  return {
    id: firstNonBlank(sourceDocument.id, fallback.id) || 'input-clar',
    name: firstNonBlank(sourceDocument.name, fallback.name) || '入参 Clar',
    targetSchema: firstNonBlank(sourceDocument.targetSchema, fallback.targetSchema) || undefined,
    description: firstNonBlank(sourceDocument.description, fallback.description) || undefined,
    version: firstNonBlank(sourceDocument.version, fallback.version) || undefined,
    layers: [
      buildDeveloperLayer(developerSourceLayers, fallbackLayers),
      buildDesignerLayer(designerSourceLayer, fallbackLayers),
    ],
  }
}

function buildDeveloperLayer(sourceLayers: PolicyLayer[], fallbackLayers: PolicyLayer[]): PolicyLayer {
  const mergedRules = sourceLayers
    .flatMap((layer) => {
      const rules = Array.isArray(layer.rules) ? layer.rules : []
      return rules.map((rule) => ({
        layerOrderNo: layer.orderNo ?? 0,
        ruleOrderNo: rule.orderNo ?? 0,
        rule: toPlainObject(rule),
      }))
    })
    .sort((left, right) => left.layerOrderNo - right.layerOrderNo || left.ruleOrderNo - right.ruleOrderNo)
    .map((item) => item.rule)

  return {
    id: EXECUTOR_DEVELOPER_LAYER_ID,
    name: EXECUTOR_DEVELOPER_LAYER_NAME,
    layerType: 'EXECUTOR_DEVELOPER',
    orderNo: Math.min(10, ...sourceLayers.map((layer) => Number(layer.orderNo ?? 10)).filter((value) => Number.isFinite(value)).concat(10)),
    editable: false,
    description: firstNonBlank(
      sourceLayers.find((layer) => !isBlank(layer.description))?.description,
      fallbackLayers.find((layer) => !isBlank(layer.description))?.description,
    ),
    rules: mergedRules,
  }
}

function buildDesignerLayer(sourceLayer?: PolicyLayer, fallbackLayers?: PolicyLayer[]): PolicyLayer {
  const layer = sourceLayer ? toPlainObject(sourceLayer) : undefined
  const fallbackLayer = fallbackLayers?.find((item) => isDesignerLayer(item))

  return {
    id: DESIGNER_LAYER_ID,
    name: DESIGNER_LAYER_NAME,
    layerType: 'DESIGNER',
    orderNo: layer?.orderNo ?? fallbackLayer?.orderNo ?? 20,
    editable: true,
    description: firstNonBlank(layer?.description, fallbackLayer?.description),
    rules: Array.isArray(layer?.rules) ? layer.rules : [],
  }
}

function normalizeMethodPolicyDocument(document: any): PolicyDocument {
  const sourceDocument = toPlainObject(document || {}) as Partial<PolicyDocument> & { layers?: PolicyLayer[] }
  const sourceLayers = Array.isArray(sourceDocument.layers) ? sourceDocument.layers : []

  return {
    id: firstNonBlank(sourceDocument.id, 'input-clar-developer') || 'input-clar-developer',
    name: firstNonBlank(sourceDocument.name, EXECUTOR_DEVELOPER_LAYER_NAME) || EXECUTOR_DEVELOPER_LAYER_NAME,
    targetSchema: firstNonBlank(sourceDocument.targetSchema) || undefined,
    description: firstNonBlank(sourceDocument.description) || undefined,
    version: firstNonBlank(sourceDocument.version) || undefined,
    layers: sourceLayers.map(layer => toPlainObject(layer)),
  }
}

function normalizeAvailableVariables(raw: any, fields?: MethodSchemaFieldItem[], currentSchema?: PolicySchema) {
  console.log('[ClarDebug][InputClarDrawer] normalizeAvailableVariables:input', {
    rawSummary: summarizeAvailableVariablesRaw(raw),
    fieldsCount: fields?.length || 0,
    fields: (fields || []).map((field) => ({
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      fieldPath: field.fieldPath,
      dataType: field.dataType,
    })),
    schemaSummary: summarizeSchema(currentSchema),
  })

  const source = parseRawVariables(raw)
  const normalized = {
    system: normalizeVariableItems(source?.system),
    context: normalizeVariableItems(source?.context),
    field: normalizeVariableItems(source?.field),
  }

  if (normalized.field.length === 0 && Array.isArray(fields)) {
    normalized.field = fields.map((field) => ({
      name: field.fieldName || field.fieldPath || field.fieldId,
      path: `field.${field.fieldPath}`,
      type: field.dataType || 'string',
      source: 'field',
      description: field.description,
    }))
  }

  if (normalized.field.length === 0 && Array.isArray(currentSchema?.fields)) {
    normalized.field = collectSchemaVariableItems(currentSchema.fields)
  }

  console.log('[ClarDebug][InputClarDrawer] normalizeAvailableVariables:output', {
    normalizedSummary: summarizeNormalizedVariables(normalized),
  })

  return normalized
}

function collectSchemaVariableItems(fields: any[], parentPath = 'field'): VariableItem[] {
  const result: VariableItem[] = []

  fields.forEach((field) => {
    if (!field || typeof field !== 'object') return

    const name = firstNonBlank(field.name, field.fieldName, field.path, field.fieldPath)
    const localPath = firstNonBlank(field.path, field.fieldPath, field.name, field.fieldName)
    if (!name || !localPath) return

    const normalizedPath = normalizeSchemaVariablePath(localPath, parentPath)

    result.push({
      name,
      path: normalizedPath,
      type: firstNonBlank(field.type, field.dataType, 'string'),
      source: 'field',
      description: firstNonBlank(field.description, field.label) || undefined,
    })

    if (Array.isArray(field.fields) && field.fields.length > 0) {
      result.push(...collectSchemaVariableItems(field.fields, normalizedPath))
    }
  })

  return result
}

function normalizeSchemaVariablePath(localPath: string, parentPath: string) {
  if (localPath.startsWith('field.')) {
    return localPath
  }

  if (localPath.includes('.') || localPath.includes('[]')) {
    return `field.${localPath}`
  }

  return `${parentPath}.${localPath}`
}

function buildVariablePreviewJson(
  tab: 'system' | 'context' | 'field',
  variables: { system: VariableItem[]; context: VariableItem[]; field: VariableItem[] },
  currentSchema?: PolicySchema,
  currentSampleData?: Record<string, any>,
) {
  const items = variables[tab] || []

  if (tab === 'field') {
    const fieldPreview = buildFieldPreviewJson(items, currentSchema, currentSampleData)
    if (!isEmptyPlainObject(fieldPreview)) {
      return fieldPreview
    }
  }

  const preview = buildPreviewFromVariableItems(items)
  if (!isEmptyPlainObject(preview)) {
    return preview
  }

  return tab === 'field' ? {} : []
}

function buildFieldPreviewJson(
  items: VariableItem[],
  currentSchema?: PolicySchema,
  currentSampleData?: Record<string, any>,
) {
  if (!isEmptyJsonData(currentSampleData)) {
    return toPlainObject(currentSampleData)
  }

  const preview: Record<string, any> = {}

  const schemaFields = Array.isArray(currentSchema?.fields) ? currentSchema!.fields : []
  schemaFields.forEach((field) => {
    populatePreviewFromSchemaField(preview, field, currentSampleData)
  })

  if (!isEmptyPlainObject(preview)) {
    return preview
  }

  return buildPreviewFromVariableItems(items)
}

function populatePreviewFromSchemaField(
  target: Record<string, any>,
  field: any,
  currentSampleData?: Record<string, any>,
) {
  if (!field || typeof field !== 'object') return

  const path = firstNonBlank(field.path, field.fieldPath, field.name)
  if (!path) return

  const sampleValue = getValueByPath(currentSampleData, path)
  if (sampleValue !== undefined) {
    setValueByPath(target, path, toPlainObject(sampleValue))
    return
  }

  setValueByPath(target, path, buildSchemaPlaceholder(field))
}

function buildSchemaPlaceholder(field: any): any {
  const type = String(firstNonBlank(field.type, field.dataType)).toLowerCase()

  if (type === 'object') {
    const result: Record<string, any> = {}
    const fields = Array.isArray(field.fields) ? field.fields : []
    fields.forEach((child) => populatePreviewFromSchemaField(result, child))
    return result
  }

  if (type === 'array') {
    if (field.item && typeof field.item === 'object') {
      return [buildSchemaPlaceholder(field.item)]
    }
    return []
  }

  return createValuePlaceholder(type, field.path || field.name || '{{field}}')
}

function buildPreviewFromVariableItems(items: VariableItem[]) {
  const preview: Record<string, any> = {}

  items.forEach((item) => {
    const previewPath = normalizeVariablePreviewPath(item)
    if (!previewPath) return
    setValueByPath(preview, previewPath, createValuePlaceholder(item.type, item.path))
  })

  return preview
}

function normalizeVariablePreviewPath(item: VariableItem) {
  const rawPath = firstNonBlank(item.path, item.name)
  if (!rawPath) return ''

  const normalized = rawPath
    .replace(/^\$+/, '')
    .replace(/^field\./, '')
    .replace(/^context\./, '')
    .replace(/^system\./, '')
    .replace(/^input\./, '')
    .replace(/^output\./, '')
    .replace(/^config\./, '')

  return normalized
}

function createValuePlaceholder(typeName?: string, fallbackPath = '{{value}}') {
  const type = String(typeName || '').toLowerCase()
  if (
    type.includes('int') ||
    type.includes('long') ||
    type.includes('double') ||
    type.includes('float') ||
    type.includes('decimal') ||
    type.includes('number') ||
    type.includes('integer')
  ) {
    return 0
  }

  if (type.includes('bool')) {
    return false
  }

  if (type.includes('list') || type.includes('array')) {
    return []
  }

  if (type.includes('map') || type.includes('object') || type.includes('json')) {
    return {}
  }

  return fallbackPath
}

function getValueByPath(target: any, path?: string) {
  if (!target || !path) return undefined
  const segments = parsePath(path)
  let current = target

  for (const segment of segments) {
    if (current == null) return undefined
    current = current[segment as any]
  }

  return current
}

function setValueByPath(target: Record<string, any>, path: string, value: any) {
  const segments = parsePath(path)
  if (!segments.length) return

  let current: any = target
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const nextSegment = segments[index + 1]
    const isLast = index === segments.length - 1

    if (isLast) {
      current[segment as any] = value
      return
    }

    if (current[segment as any] == null) {
      current[segment as any] = typeof nextSegment === 'number' ? [] : {}
    }

    if (typeof nextSegment === 'number' && !Array.isArray(current[segment as any])) {
      current[segment as any] = []
    }

    current = current[segment as any]

    if (typeof nextSegment === 'number' && current[nextSegment] == null) {
      current[nextSegment] = {}
    }
  }
}

function parsePath(path: string): Array<string | number> {
  return path
    .replace(/\[\]/g, '[0]')
    .split('.')
    .flatMap((segment) => {
      const parts: Array<string | number> = []
      const pattern = /([^[\]]+)|\[(\d+)\]/g
      let match: RegExpExecArray | null

      while ((match = pattern.exec(segment))) {
        if (match[1]) {
          parts.push(match[1])
        } else if (match[2]) {
          parts.push(Number(match[2]))
        }
      }

      return parts
    })
    .filter((segment) => segment !== '')
}

function isEmptyPlainObject(value: any) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0
}

function isEmptyJsonData(value: any) {
  if (value == null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

function normalizeVariableItems(items: any): VariableItem[] {
  const sourceItems = unwrapItems(items)
  if (!Array.isArray(sourceItems)) return []

  return sourceItems
    .map((item) => toPlainObject(item))
    .map((item) => normalizeVariableItem(item))
    .filter((item): item is VariableItem => !!item && !isBlank(item.path))
}

function parseRawVariables(raw: any) {
  if (!raw) return {}
  if (typeof raw === 'string') {
    const parsed = parseJson(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  }
  return raw
}

function unwrapItems(input: any) {
  if (Array.isArray(input)) return input
  if (!input || typeof input !== 'object') return []
  if (Array.isArray(input.items)) return input.items
  if (Array.isArray(input.data)) return input.data
  if (Array.isArray(input.list)) return input.list
  if (Array.isArray(input.value)) return input.value
  return []
}

function normalizeVariableItem(item: any): VariableItem | null {
  if (!item || typeof item !== 'object') return null

  const rawPath = firstNonBlank(item.path, item.fieldPath, item.varPath, item.name)
  if (!rawPath) return null

  const rawSource = firstNonBlank(item.source, item.scope)
  return {
    name: firstNonBlank(item.name, item.fieldName, rawPath),
    path: rawPath,
    type: firstNonBlank(item.type, item.dataType, 'string'),
    source: (rawSource || 'context') as VariableItem['source'],
    description: firstNonBlank(item.description, item.remark) || undefined,
  }
}

function resolveInitialVariableTab(variables: { system: VariableItem[]; context: VariableItem[]; field: VariableItem[] }) {
  const nextTab = variables.field.length > 0
    ? 'field'
    : variables.context.length > 0
      ? 'context'
      : 'system'

  console.log('[ClarDebug][InputClarDrawer] resolveInitialVariableTab', {
    fieldCount: variables.field.length,
    contextCount: variables.context.length,
    systemCount: variables.system.length,
    nextTab,
  })

  return nextTab
}

function findDesignerLayer(layers: PolicyLayer[]) {
  return layers.find((layer) => isDesignerLayer(layer))
}

function findDeveloperLayers(layers: PolicyLayer[]) {
  const developerLayers = layers.filter((layer) => layer.layerType === 'EXECUTOR_DEVELOPER')
  if (developerLayers.length > 0) {
    return developerLayers
  }
  return layers.filter((layer) => !isDesignerLayer(layer))
}

function isDesignerLayer(layer?: PolicyLayer) {
  return !!layer && (layer.layerType === 'DESIGNER' || layer.layerType === 'PROCESS_DESIGN')
}

function firstNonBlank(...values: Array<string | undefined | null>) {
  for (const value of values) {
    if (!isBlank(value)) {
      return String(value).trim()
    }
  }
  return ''
}

function isBlank(value?: string | null) {
  return !value || !String(value).trim()
}

/**
 * 解析 JSON
 */
function parseJson(text?: string): any {
  if (text == null || text === '') return {}
  if (typeof text !== 'string') return toPlainObject(text)
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function resolveSampleData(rawSampleData: any, currentSchema?: PolicySchema) {
  const parsedSampleData = parseJson(rawSampleData)
  if (!isEmptyJsonData(parsedSampleData)) {
    return parsedSampleData
  }

  const schemaSampleData = toPlainObject(currentSchema?.sampleData)
  if (!isEmptyJsonData(schemaSampleData)) {
    return schemaSampleData
  }

  return {}
}

function applyDescriptionAsLabel(schema: any): PolicySchema {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  const result = toPlainObject(schema) as PolicySchema
  result.fields = Array.isArray(result.fields)
    ? result.fields.map((field: any) => applyDescriptionAsLabelField(field))
    : []
  return result
}

function applyDescriptionAsLabelField(field: any): any {
  if (!field || typeof field !== 'object') {
    return field
  }

  const result = toPlainObject(field)

  if (!isBlank(result.description)) {
    result.label = result.description
  }

  if (Array.isArray(result.fields)) {
    result.fields = result.fields.map((child: any) => applyDescriptionAsLabelField(child))
  }

  if (result.item && typeof result.item === 'object') {
    result.item = applyDescriptionAsLabelField(result.item)
  }

  return result
}

/**
 * 转换为纯对象
 */
function toPlainObject<T>(value: T): T {
  if (value == null) return value
  try {
    return structuredClone(value)
  } catch {
    try {
      return JSON.parse(JSON.stringify(value)) as T
    } catch {
      return value
    }
  }
}

/**
 * 关闭抽屉
 */
function close() {
  visible.value = false
  emit('close')
}

/**
 * 确认保存
 */
async function confirm() {
  if (!methodId.value) return
  
  saving.value = true
  error.value = ''
  
  try {
    const documentJson = JSON.stringify(documentValue.value)
    
    const result = await saveInputPolicyStudio(methodId.value, nodeId.value, documentJson)
    
    if (result.success) {
      emit('confirm', toPlainObject(documentValue.value) as InputPolicyDocument)
      close()
    } else {
      error.value = result.message || '保存失败'
    }
  } catch (err: any) {
    error.value = err?.message || '保存入参 Clar 数据失败'
    console.error('[InputClarDrawer] 保存失败:', err)
  } finally {
    saving.value = false
  }
}

/**
 * 切换变量面板折叠状态
 */
function toggleVariablePanel() {
  const nextCollapsed = !variablePanelCollapsed.value
  variablePanelCollapsed.value = nextCollapsed
  if (!nextCollapsed && variablePanelWidth.value <= panelMinWidth + 4) {
    variablePanelWidth.value = 300
  }
}

/**
 * 开始拖拽变量面板宽度
 */
function startDragPanel(e: MouseEvent) {
  if (variablePanelCollapsed.value) return
  e.preventDefault()
  isDraggingPanel.value = true
  dragStartX.value = e.clientX
  dragStartWidth.value = variablePanelWidth.value

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

/**
 * 处理拖拽
 */
function handleDragPanel(e: MouseEvent) {
  if (!isDraggingPanel.value) return
  
  const deltaX = e.clientX - dragStartX.value
  const newWidth = Math.max(panelMinWidth, Math.min(panelMaxWidth, dragStartWidth.value + deltaX))
  
  if (newWidth <= panelMinWidth + 20) {
    variablePanelCollapsed.value = true
    variablePanelWidth.value = panelMinWidth
  } else {
    variablePanelCollapsed.value = false
    variablePanelWidth.value = newWidth
  }
}

/**
 * 结束拖拽
 */
function endDragPanel() {
  if (!isDraggingPanel.value) return
  isDraggingPanel.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

/**
 * 处理点击遮罩层关闭
 */
function handleWrapperClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.classList.contains('el-drawer__wrapper') || target.classList.contains('el-overlay')) {
    close()
  }
}

/**
 * 插入变量表达式
 */
function insertVariable(variable: VariableItem) {
  const path = variable.path
  const expression = `{ "$jina": "${path}" }`
  
  navigator.clipboard.writeText(expression).then(() => {
    console.log('[InputClarDrawer] 已复制表达式:', expression)
  })
}

/**
 * 处理 document 变化
 */
function handleDocumentChange(val: PolicyDocument) {
  documentValue.value = normalizeInputPolicyDocument(val, documentValue.value, developerPolicyDocument.value)
}

function handleSampleDataChange(val: Record<string, any>) {
  sampleData.value = val
}

watch(activeVariableTab, () => {
  console.log('[ClarDebug][InputClarDrawer] activeVariableTab changed', {
    activeVariableTab: activeVariableTab.value,
    normalizedAvailableVariables: summarizeNormalizedVariables(availableVariables.value),
  })
  previewEditorKey.value += 1
  nextTick(() => {
    logVariablePanelDom(`tab changed:${activeVariableTab.value}`)
  })
})

watch(previewEditorKey, () => {
  nextTick(() => {
    logVariablePanelDom(`preview key changed:${previewEditorKey.value}`)
  })
})

function summarizeJsonValue(value: any) {
  if (value == null) return { kind: 'nullish' }
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      length: value.length,
      firstItemType: value.length > 0 ? typeof value[0] : 'none',
    }
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    return {
      kind: 'object',
      keys: keys.slice(0, 12),
      keyCount: keys.length,
    }
  }
  return {
    kind: typeof value,
    value: String(value).slice(0, 120),
  }
}

function summarizeSchema(currentSchema?: PolicySchema) {
  if (!currentSchema) return { exists: false }
  return {
    exists: true,
    id: currentSchema.id,
    name: currentSchema.name,
    fieldCount: Array.isArray(currentSchema.fields) ? currentSchema.fields.length : 0,
    fieldPaths: Array.isArray(currentSchema.fields)
      ? currentSchema.fields.slice(0, 10).map((field: any) => field?.path || field?.name)
      : [],
  }
}

function logVariablePanelDom(stage: string) {
  const panel = variablePanelRef.value
  const tabsRoot = panel?.querySelector('.variable-tabs') as HTMLElement | null
  const preview = panel?.querySelector('.variable-json-preview') as HTMLElement | null
  const editor = panel?.querySelector('.json-preview-editor') as HTMLElement | null
  const list = panel?.querySelector('.variable-list') as HTMLElement | null

  console.log('[ClarDebug][InputClarDrawer] variablePanelDom', {
    stage,
    hasPanel: !!panel,
    hasTabsRoot: !!tabsRoot,
    hasPreview: !!preview,
    hasEditor: !!editor,
    hasList: !!list,
    panelChildren: panel ? Array.from(panel.children).map((child) => (child as HTMLElement).className) : [],
    previewRect: preview
      ? {
          width: preview.getBoundingClientRect().width,
          height: preview.getBoundingClientRect().height,
        }
      : null,
    editorRect: editor
      ? {
          width: editor.getBoundingClientRect().width,
          height: editor.getBoundingClientRect().height,
        }
      : null,
    previewText: preview?.textContent?.slice(0, 120) || '',
  })
}

function summarizeDocument(document: any) {
  if (!document || typeof document !== 'object') {
    return { exists: false }
  }

  const layers = Array.isArray(document.layers) ? document.layers : []
  return {
    exists: true,
    id: document.id,
    name: document.name,
    layerCount: layers.length,
    layers: layers.map((layer: any) => ({
      id: layer?.id,
      name: layer?.name,
      layerType: layer?.layerType,
      rulesCount: Array.isArray(layer?.rules) ? layer.rules.length : 0,
    })),
  }
}

function summarizeAvailableVariablesRaw(raw: any) {
  const parsed = parseRawVariables(raw)
  return {
    rawType: typeof raw,
    parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
    systemCount: unwrapItems(parsed?.system)?.length || 0,
    contextCount: unwrapItems(parsed?.context)?.length || 0,
    fieldCount: unwrapItems(parsed?.field)?.length || 0,
    fieldPreview: (unwrapItems(parsed?.field) || []).slice(0, 5).map((item: any) => ({
      name: item?.name,
      path: item?.path || item?.fieldPath,
      type: item?.type || item?.dataType,
    })),
  }
}

function summarizeNormalizedVariables(variables: { system: VariableItem[]; context: VariableItem[]; field: VariableItem[] }) {
  return {
    systemCount: variables.system.length,
    contextCount: variables.context.length,
    fieldCount: variables.field.length,
    systemPreview: variables.system.slice(0, 5).map((item) => ({ name: item.name, path: item.path, type: item.type })),
    contextPreview: variables.context.slice(0, 5).map((item) => ({ name: item.name, path: item.path, type: item.type })),
    fieldPreview: variables.field.slice(0, 8).map((item) => ({ name: item.name, path: item.path, type: item.type })),
  }
}

function summarizeResponsePayload(payload: any) {
  if (!payload || typeof payload !== 'object') {
    return {
      exists: false,
      payloadType: typeof payload,
    }
  }

  return {
    exists: true,
    keys: Object.keys(payload),
    methodId: payload.methodId,
    methodCode: payload.methodCode,
    methodName: payload.methodName,
    title: payload.title,
    subtitle: payload.subtitle,
    schemaJsonLength: typeof payload.schemaJson === 'string' ? payload.schemaJson.length : 0,
    documentJsonLength: typeof payload.documentJson === 'string' ? payload.documentJson.length : 0,
    sampleDataJsonLength: typeof payload.sampleDataJson === 'string' ? payload.sampleDataJson.length : 0,
    availableVariablesSummary: summarizeAvailableVariablesRaw(payload.availableVariables),
  }
}

onMounted(() => {
  document.addEventListener('mousemove', handleDragPanel)
  document.addEventListener('mouseup', endDragPanel)
  
  setTimeout(() => {
    const wrapper = document.querySelector('.ant-drawer-content-wrapper')
    if (wrapper) {
      wrapper.addEventListener('click', handleWrapperClick)
    }
  }, 100)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleDragPanel)
  document.removeEventListener('mouseup', endDragPanel)
  
  const wrapper = document.querySelector('.ant-drawer-content-wrapper')
  if (wrapper) {
    wrapper.removeEventListener('click', handleWrapperClick)
  }
})

defineExpose({ openDrawer })
</script>

<template>
  <a-drawer v-model:visible="visible" :show-close="false" placement="rtl" width="90%" :closable="false" class="input-clar-drawer-wrapper" @close="close">
    <div class="input-clar-drawer">
      <!-- 加载中 -->
      <div v-if="loading" class="loading-container">
        <LoadingOutlined spin :style="{ fontSize: '32px' }" />
        <span>正在加载入参 Clar 数据...</span>
      </div>
      
      <!-- 错误提示 -->
      <a-alert v-if="error" :title="error" type="error" :closable="false" class="error-alert" />
      
      <!-- Clar 编辑器 -->
      <div v-if="!loading && !error" class="clar-container">
        <div class="clar-main">
          <!-- 左侧: 可用变量面板 (可拖拽调整宽度) -->
          <div 
            ref="variablePanelRef"
            class="variable-panel" 
            :class="{ 'is-collapsed': variablePanelCollapsed }"
            :style="{
              width: variablePanelCollapsed ? panelMinWidth + 'px' : variablePanelWidth + 'px',
              flex: variablePanelCollapsed ? '0 0 ' + panelMinWidth + 'px' : '0 0 ' + variablePanelWidth + 'px'
            }"
          >
            <!-- 折叠状态: 只显示竖排标签 -->
            <div v-if="variablePanelCollapsed" class="panel-collapsed-bar" @click="toggleVariablePanel">
              <a-tooltip title="展开可用变量" placement="right">
                <div class="panel-collapsed-content">
                  <DoubleRightOutlined :style="{ fontSize: '16px' }" />
                  <span class="panel-collapsed-text">可用变量</span>
                </div>
              </a-tooltip>
            </div>
            
            <!-- 展开状态 -->
            <template v-else>
              <div class="panel-header">
                <span class="panel-title">可用变量</span>
                <a-button 
                  link 
                  size="small" 
                  class="collapse-btn"
                  @click="toggleVariablePanel"
                >
                  <DoubleLeftOutlined />
                </a-button>
              </div>
              
              <a-tabs v-model:activeKey="activeVariableTab" class="variable-tabs">
                <a-tab-pane tab="系统注入" key="system" />
                <a-tab-pane tab="变量池" key="context" />
                <a-tab-pane tab="当前入参" key="field" />
              </a-tabs>
              
              <!-- JSON 展示变量 -->
              <div class="variable-json-preview">
                <JsonPreviewEditor :key="previewEditorKey" :model-value="currentVariableJsonValue" read-only />
              </div>
              
              <!-- 变量列表 (点击可复制) -->
              <div class="variable-list">
                <div
                  v-for="variable in availableVariables[activeVariableTab]"
                  :key="variable.path"
                  class="variable-item"
                  @click="insertVariable(variable)"
                >
                  <div class="variable-info">
                    <span class="variable-name">{{ variable.name }}</span>
                    <a-tag size="small" color="processing">{{ variable.type }}</a-tag>
                  </div>
                  <div class="variable-path">${{ variable.path }}</div>
                </div>
                
                <a-empty v-if="availableVariables[activeVariableTab].length === 0" description="暂无可用变量" :image-size="60" />
              </div>
            </template>
            
            <!-- 拖拽分隔条 -->
            <div 
              v-if="!variablePanelCollapsed"
              class="panel-resize-handle"
              @mousedown="startDragPanel"
            />
          </div>
          
          <!-- 右侧: PolicyStudio 编辑器 -->
          <div class="clar-editor-panel">
            <PolicyStudio
              v-if="schema.fields.length > 0"
              v-model="documentValue"
              :schema="schema"
              :sample-data="sampleData"
              :allow-add-layer="false"
              @update:model-value="handleDocumentChange"
              @update:sample-data="handleSampleDataChange"
            />
            
            <a-empty v-else description="未加载到方法入参 Schema" :image-size="120" />
          </div>
        </div>
        
        <!-- 底部操作栏 -->
        <div class="clar-footer">
          <a-button @click="close">取消</a-button>
          <a-button type="primary" :loading="saving" :disabled="loading" @click="confirm">
            {{ saving ? '保存中...' : '保存 Clar' }}
          </a-button>
        </div>
      </div>
    </div>
  </a-drawer>
</template>

<style scoped lang="scss">
.input-clar-drawer-wrapper {
  :deep(.ant-drawer-header) {
    display: none;
  }
  
  :deep(.ant-drawer-body) {
    padding: 0;
    height: 100%;
  }
}

.input-clar-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
  color: var(--el-text-color-secondary);
}

.error-alert {
  margin: 16px;
}

.clar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.clar-main {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

// 变量面板
.variable-panel {
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  min-width: 0;
  transition: width 0.15s ease;
  overflow: visible;
  
  &.is-collapsed {
    box-shadow: none;
    overflow: hidden;
  }
}

.panel-collapsed-bar {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--el-bg-color, #fff);
  
  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.panel-collapsed-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.panel-collapsed-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  line-height: 1;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.collapse-btn {
  padding: 4px;
}

.variable-tabs {
  flex-shrink: 0;
  height: auto !important;
  
  :deep(.ant-tabs-nav) {
    margin: 0;
    padding: 0 16px;
  }

  :deep(.ant-tabs-content) {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
  }
  
  :deep(.ant-tabs-tab) {
    font-size: 12px;
    padding: 0 8px;
  }
}

.variable-json-preview {
  flex-shrink: 0;
  height: 200px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-lighter);
}

.variable-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.variable-item {
  padding: 8px 10px;
  margin-bottom: 4px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-fill-color-lighter);
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
  }
}

.variable-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.variable-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.variable-path {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  font-family: monospace;
}

// 拖拽分隔条
.panel-resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 10;
  
  &:hover {
    background: var(--el-color-primary-light-7);
  }
}

// Clar 编辑区
.clar-editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

// 底部操作栏
.clar-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-blank);
}
</style>
