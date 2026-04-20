import type {
  EntityFieldMap,
  FieldInfo,
  FieldMapping,
  PolicySchema,
  PolicySchemaField,
  PolicySchemaFieldType
} from '../types'
import { safeStructuredClone } from './clone-utils'

function inferFieldType(field: PolicySchemaField): string {
  if (field.format === 'date' || field.format === 'time' || field.format === 'datetime')
    return field.format
  if (field.type === 'number')
    return 'number'
  if (field.type === 'integer')
    return 'integer'
  if (field.type === 'boolean')
    return 'boolean'
  return 'string'
}

function defaultValueForField(field: PolicySchemaField): any {
  if (field.defaultValue !== undefined)
    return safeStructuredClone(field.defaultValue)
  if (field.options?.length)
    return field.options[0].value
  if (field.type === 'object')
    return createObjectSample(field.fields || [])
  if (field.type === 'array')
    return []
  if (field.type === 'boolean')
    return false
  if (field.type === 'number' || field.type === 'integer')
    return undefined
  return ''
}

function createObjectSample(fields: PolicySchemaField[]): Record<string, any> {
  const result: Record<string, any> = {}
  for (const field of fields)
    result[field.name] = defaultValueForField(field)
  return result
}

function rebaseField(field: PolicySchemaField, path: string): PolicySchemaField {
  if (field.type === 'object') {
    return {
      ...field,
      path,
      fields: (field.fields || []).map(child => rebaseField(child, `${path}.${child.name}`))
    }
  }

  if (field.type === 'array' && field.item) {
    const itemPath = `${path}[]`
    return {
      ...field,
      path,
      item: field.item.type === 'object'
        ? {
            ...field.item,
            path: itemPath,
            fields: (field.item.fields || []).map(child => rebaseField(child, `${itemPath}.${child.name}`))
          }
        : { ...field.item, path: itemPath }
    }
  }

  return { ...field, path }
}

function collectFields(
  rootField: PolicySchemaField,
  mapping: FieldMapping,
  entityMap: EntityFieldMap
) {
  if (rootField.type === 'object') {
    for (const child of rootField.fields || [])
      collectFields(child, mapping, entityMap)
    return
  }

  if (rootField.type === 'array') {
    const item = rootField.item
    if (!item)
      return

    if (item.type === 'object') {
      for (const child of item.fields || [])
        collectFields(rebaseField(child, `${rootField.path}[].${child.name}`), mapping, entityMap)
      return
    }

    const arrayField: FieldInfo = {
      name: rootField.name,
      displayName: rootField.label,
      type: inferFieldType(item),
      path: `${rootField.path}[]`,
      aliases: rootField.aliases || [],
      searchable: rootField.searchable ?? true,
      format: item.format,
      required: rootField.required,
      options: item.options
    }
    entityMap.fields.set(arrayField.path, arrayField)
    mapping.globalFields.set(arrayField.path, arrayField)
    return
  }

  const fieldInfo: FieldInfo = {
    name: rootField.name,
    displayName: rootField.label,
    type: inferFieldType(rootField),
    path: rootField.path,
    aliases: rootField.aliases || [],
    searchable: rootField.searchable ?? true,
    format: rootField.format,
    required: rootField.required,
    options: rootField.options
  }
  entityMap.fields.set(fieldInfo.path, fieldInfo)
  mapping.globalFields.set(fieldInfo.path, fieldInfo)
}

export function createEmptyFieldMapping(): FieldMapping {
  return {
    entities: new Map(),
    globalFields: new Map(),
    pathAliases: new Map()
  }
}

export function createFieldMappingFromSchema(schema?: PolicySchema): FieldMapping {
  const mapping = createEmptyFieldMapping()
  if (!schema)
    return mapping

  for (const rootField of schema.fields) {
    const entityMap: EntityFieldMap = {
      entityName: rootField.name,
      displayName: rootField.label,
      fields: new Map(),
      relations: new Map()
    }

    collectFields(rootField, mapping, entityMap)
    mapping.entities.set(rootField.name, entityMap)
  }

  return mapping
}

export function createSampleDataFromSchema(schema?: PolicySchema): Record<string, any> {
  if (!schema)
    return {}
  if (schema.sampleData)
    return safeStructuredClone(schema.sampleData)
  return createObjectSample(schema.fields)
}

export function getSchemaFieldByPath(
  schema: PolicySchema | undefined,
  path: string
): PolicySchemaField | undefined {
  if (!schema || !path)
    return undefined

  const stack = [...schema.fields]
  while (stack.length) {
    const current = stack.shift()!
    if (current.type === 'array' && `${current.path}[]` === path && current.item && current.item.type !== 'object') {
      return {
        ...current.item,
        name: current.name,
        label: current.label,
        path
      }
    }

    if (current.path === path)
      return current

    if (current.type === 'object' && current.fields)
      stack.push(...current.fields)

    if (current.type === 'array' && current.item) {
      if (current.item.type === 'object' && current.item.fields) {
        stack.push(...current.item.fields.map(field => rebaseField(field, `${current.path}[].${field.name}`)))
      }
      else {
        stack.push({
          ...current.item,
          name: current.name,
          label: current.label,
          path: `${current.path}[]`
        })
      }
    }
  }

  return undefined
}

export function toSchemaFieldType(fieldType?: string): PolicySchemaFieldType {
  const normalized = (fieldType || '').toLowerCase()
  if (normalized === 'number' || normalized === 'decimal' || normalized === 'double' || normalized === 'float')
    return 'number'
  if (normalized === 'integer' || normalized === 'int' || normalized === 'long')
    return 'integer'
  if (normalized === 'boolean')
    return 'boolean'
  return 'string'
}
