import { toRaw } from 'vue'

function cloneFallback<T>(value: T, seen = new WeakMap<object, any>): T {
  const rawValue = typeof value === 'object' && value !== null
    ? toRaw(value as object) as T
    : value

  if (rawValue == null || typeof rawValue !== 'object')
    return rawValue

  if (rawValue instanceof Date)
    return new Date(rawValue.getTime()) as T

  if (rawValue instanceof RegExp)
    return new RegExp(rawValue.source, rawValue.flags) as T

  if (Array.isArray(rawValue))
    return rawValue.map(item => cloneFallback(item, seen)) as T

  if (rawValue instanceof Map) {
    const clonedMap = new Map()
    for (const [key, mapValue] of rawValue.entries())
      clonedMap.set(cloneFallback(key, seen), cloneFallback(mapValue, seen))
    return clonedMap as T
  }

  if (rawValue instanceof Set) {
    const clonedSet = new Set()
    for (const setValue of rawValue.values())
      clonedSet.add(cloneFallback(setValue, seen))
    return clonedSet as T
  }

  if (seen.has(rawValue as object))
    return seen.get(rawValue as object)

  const tag = Object.prototype.toString.call(rawValue)
  if (tag !== '[object Object]') {
    try {
      return structuredClone(rawValue) as T
    }
    catch {
      return undefined as T
    }
  }

  const clonedObject: Record<string, any> = {}
  seen.set(rawValue as object, clonedObject)

  for (const [key, itemValue] of Object.entries(rawValue as Record<string, any>))
    clonedObject[key] = cloneFallback(itemValue, seen)

  return clonedObject as T
}

export function safeStructuredClone<T>(value: T): T {
  try {
    return structuredClone(toRaw(value as object)) as T
  }
  catch {
    return cloneFallback(value)
  }
}
