import type { Element } from 'bpmn-js/lib/model/Types'
import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil'
import type { MethodSchemaFieldItem, OutputDeltaItem } from '@/types/executor.ts'
import { getExtensionElementsList } from '@/designer/utils/ExtensionElementsUtil.ts'

interface BuildVariablePoolPreviewOptions {
  currentElement: Element
  rootElement: Element
  fetchMethodSchema: (methodId: string) => Promise<MethodSchemaFieldItem[]>
}

interface VariablePoolPreviewResult {
  variablePool: Record<string, any>
  warnings: string[]
}

interface ExecutorBindingSnapshot {
  nodeId: string
  nodeName: string
  methodId: string
  outputDeltas: OutputDeltaItem[]
}

export async function buildVariablePoolPreview(
  options: BuildVariablePoolPreviewOptions,
): Promise<VariablePoolPreviewResult> {
  const warnings: string[] = []
  const variablePool = buildInitialVariablePool(options.rootElement)
  const predecessors = collectPredecessorExecutorNodes(options.currentElement)
  const sortedPredecessors = topologicalSort(predecessors)
  const schemaCache = new Map<string, MethodSchemaFieldItem[]>()

  for (const node of sortedPredecessors) {
    const binding = readExecutorBinding(node)
    if (!binding || !binding.outputDeltas.length) {
      continue
    }

    const resultPreview = await loadNodeResultPreview(
      binding,
      options.fetchMethodSchema,
      schemaCache,
      warnings,
    )

    binding.outputDeltas.forEach((delta) => {
      if (!delta?.target || !delta?.source) {
        return
      }
      const sourceValue =
        getValueByPath(resultPreview, delta.source) ??
        `{{${binding.nodeId}.result.${delta.source}}}`
      applyDeltaToVariablePool(variablePool, delta, sourceValue)
    })
  }

  return {
    variablePool,
    warnings,
  }
}

export function buildMethodResultPreview(
  fields: MethodSchemaFieldItem[],
  currentElement?: Element,
): Record<string, any> {
  const nodeId = currentElement?.id || 'current-node'
  const nodeName = getBusinessObject(currentElement)?.get?.('name') || nodeId
  const document: Record<string, any> = {}

  fields
    .filter((field) => field.schemaRole === 'OUTPUT')
    .forEach((field) => {
      const path = field.fieldPath || field.fieldName
      setValueByPath(
        document,
        path,
        createFieldPlaceholder(field, {
          nodeId,
          nodeName,
          path,
        }),
      )
    })

  return document
}

function buildInitialVariablePool(rootElement: Element) {
  const businessObject = getBusinessObject(rootElement)
  const flowElements = businessObject?.get?.('flowElements') || []
  const variablePool: Record<string, any> = {}

  flowElements.forEach((item: any) => {
    if (!is(item, 'bpmn:DataObject')) {
      return
    }

    const varName = item.get('name') || item.get('id')
    if (!varName) {
      return
    }

    const dataType = item.get('flowable:itemSubjectRef')
    const rawValue = readDataObjectValue(item)
    variablePool[varName] =
      rawValue !== undefined ? rawValue : createTypePlaceholder(dataType, `{{init.${varName}}}`)
  })

  return variablePool
}

function readDataObjectValue(dataObject: any) {
  const extensionElements = dataObject.get?.('extensionElements')
  const values = extensionElements?.get?.('values') || []
  const valueElement = values.find((item: any) => item.$type === 'flowable:Value')
  const rawValue = valueElement?.get?.('value')
  if (rawValue == null || rawValue === '') {
    return undefined
  }
  return tryParsePrimitive(rawValue)
}

function tryParsePrimitive(rawValue: any) {
  if (typeof rawValue !== 'string') {
    return rawValue
  }

  const text = rawValue.trim()
  if (!text) return text
  if (text === 'true') return true
  if (text === 'false') return false
  if (text === 'null') return null
  if (!Number.isNaN(Number(text)) && text === String(Number(text))) {
    return Number(text)
  }
  if (
    (text.startsWith('{') && text.endsWith('}')) ||
    (text.startsWith('[') && text.endsWith(']'))
  ) {
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }
  return text
}

function collectPredecessorExecutorNodes(currentElement: Element) {
  const visited = new Set<string>()
  const predecessors: Element[] = []

  function visit(node: Element | undefined | null) {
    if (!node?.id || visited.has(node.id)) {
      return
    }
    visited.add(node.id)

    const incoming = ((node as any).incoming || []) as any[]
    incoming.forEach((connection) => {
      const source = connection?.source as Element | undefined
      if (!source) {
        return
      }
      predecessors.push(source)
      visit(source)
    })
  }

  visit(currentElement)

  return dedupeById(
    predecessors.filter((node) => {
      if (!node?.id || node.id === currentElement.id) {
        return false
      }
      return !!readExecutorBinding(node)
    }),
  )
}

function topologicalSort(nodes: Element[]) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const indegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  nodes.forEach((node) => {
    indegree.set(node.id, 0)
    adjacency.set(node.id, [])
  })

  nodes.forEach((node) => {
    const outgoing = ((node as any).outgoing || []) as any[]
    outgoing.forEach((connection) => {
      const target = connection?.target as Element | undefined
      if (!target?.id || !nodeMap.has(target.id)) {
        return
      }
      adjacency.get(node.id)?.push(target.id)
      indegree.set(target.id, (indegree.get(target.id) || 0) + 1)
    })
  })

  const queue = nodes
    .filter((node) => (indegree.get(node.id) || 0) === 0)
    .sort((a, b) => a.id.localeCompare(b.id))
  const result: Element[] = []

  while (queue.length) {
    const node = queue.shift()!
    result.push(node)
    ;(adjacency.get(node.id) || []).forEach((targetId) => {
      const nextDegree = (indegree.get(targetId) || 0) - 1
      indegree.set(targetId, nextDegree)
      if (nextDegree === 0 && nodeMap.has(targetId)) {
        queue.push(nodeMap.get(targetId)!)
      }
    })
  }

  if (result.length !== nodes.length) {
    return nodes
  }

  return result
}

function readExecutorBinding(element: Element): ExecutorBindingSnapshot | null {
  const bindings = getExtensionElementsList(element, 'l:ExecutorBinding')
  const binding = bindings[0] as any
  if (!binding) {
    return null
  }

  let outputDeltas: OutputDeltaItem[] = []
  try {
    outputDeltas = JSON.parse(binding.get('outputDeltaJson') || '[]')
  } catch {
    outputDeltas = []
  }

  return {
    nodeId: element.id,
    nodeName: getBusinessObject(element)?.get?.('name') || element.id,
    methodId: binding.get('methodId') || '',
    outputDeltas,
  }
}

async function loadNodeResultPreview(
  binding: ExecutorBindingSnapshot,
  fetchMethodSchema: (methodId: string) => Promise<MethodSchemaFieldItem[]>,
  schemaCache: Map<string, MethodSchemaFieldItem[]>,
  warnings: string[],
) {
  if (!binding.methodId) {
    warnings.push(`节点 ${binding.nodeName} 未配置 methodId，变量池预览使用占位路径`)
    return {}
  }

  if (!schemaCache.has(binding.methodId)) {
    try {
      schemaCache.set(binding.methodId, await fetchMethodSchema(binding.methodId))
    } catch (err: any) {
      warnings.push(
        `节点 ${binding.nodeName} 的方法 Schema 加载失败：${err?.message || binding.methodId}`,
      )
      schemaCache.set(binding.methodId, [])
    }
  }

  const fields = schemaCache.get(binding.methodId) || []
  const document: Record<string, any> = {}

  fields
    .filter((field) => field.schemaRole === 'OUTPUT')
    .forEach((field) => {
      const path = field.fieldPath || field.fieldName
      setValueByPath(
        document,
        path,
        createFieldPlaceholder(field, {
          nodeId: binding.nodeId,
          nodeName: binding.nodeName,
          path,
        }),
      )
    })

  return document
}

function createFieldPlaceholder(
  field: MethodSchemaFieldItem,
  context: { nodeId: string; nodeName: string; path: string },
) {
  const marker = `{{${context.nodeId}.${context.path}}}`
  return createTypePlaceholder(field.dataType, marker, context.nodeName)
}

function createTypePlaceholder(typeName?: string, fallback = '{{value}}', label?: string): any {
  const type = (typeName || '').toLowerCase()
  if (
    type.includes('int') ||
    type.includes('long') ||
    type.includes('double') ||
    type.includes('float') ||
    type.includes('decimal') ||
    type.includes('number')
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
  return label ? `${fallback} @ ${label}` : fallback
}

function applyDeltaToVariablePool(
  variablePool: Record<string, any>,
  delta: OutputDeltaItem,
  sourceValue: any,
) {
  const currentValue = getValueByPath(variablePool, delta.target)

  if (delta.mergeStrategy === 'append') {
    const nextValue = Array.isArray(currentValue)
      ? [...currentValue, sourceValue]
      : currentValue == null
        ? [sourceValue]
        : [currentValue, sourceValue]
    setValueByPath(variablePool, delta.target, nextValue)
    return
  }

  if (delta.mergeStrategy === 'merge') {
    if (isPlainObject(currentValue) && isPlainObject(sourceValue)) {
      setValueByPath(variablePool, delta.target, deepMerge(currentValue, sourceValue))
      return
    }
  }

  setValueByPath(variablePool, delta.target, sourceValue)
}

function getValueByPath(target: any, path: string) {
  if (!path) return target
  const segments = parsePath(path)
  let current = target
  for (const segment of segments) {
    if (current == null) {
      return undefined
    }
    current = current[segment as any]
  }
  return current
}

function setValueByPath(target: Record<string, any>, path: string, value: any) {
  const segments = parsePath(path)
  if (!segments.length) {
    return
  }

  let current: any = target
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const nextSegment = segments[i + 1]
    const isLast = i === segments.length - 1

    if (isLast) {
      current[segment as any] = value
      return
    }

    if (current[segment as any] == null) {
      current[segment as any] =
        typeof nextSegment === 'number' ? [] : {}
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

function deepMerge(base: any, extra: any): any {
  if (!isPlainObject(base) || !isPlainObject(extra)) {
    return extra
  }

  const merged: Record<string, any> = { ...base }
  Object.entries(extra).forEach(([key, value]) => {
    if (isPlainObject(merged[key]) && isPlainObject(value)) {
      merged[key] = deepMerge(merged[key], value)
    } else {
      merged[key] = value
    }
  })
  return merged
}

function isPlainObject(value: any): value is Record<string, any> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function dedupeById(nodes: Element[]) {
  const seen = new Set<string>()
  return nodes.filter((node) => {
    if (!node?.id || seen.has(node.id)) {
      return false
    }
    seen.add(node.id)
    return true
  })
}
