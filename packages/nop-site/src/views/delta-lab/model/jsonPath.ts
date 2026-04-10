import { cloneDeep } from 'lodash-es';

import type { JsonPathSegment } from './types';

function toArrayIndex(segment: JsonPathSegment): number | null {
  if (typeof segment === 'number' && Number.isInteger(segment)) {
    return segment;
  }
  if (typeof segment === 'string' && /^\d+$/.test(segment)) {
    return Number(segment);
  }
  return null;
}

export function normalizeJsonPath(path: JsonPathSegment[]): JsonPathSegment[] {
  return path.map((segment) => {
    const index = toArrayIndex(segment);
    return index == null ? segment : index;
  });
}

export function getValueAtPath(root: unknown, path: JsonPathSegment[]): unknown {
  let current = root;
  for (const segment of normalizeJsonPath(path)) {
    if (current == null) {
      return undefined;
    }
    const arrayIndex = toArrayIndex(segment);
    if (arrayIndex != null) {
      if (!Array.isArray(current) || arrayIndex < 0 || arrayIndex >= current.length) {
        return undefined;
      }
      current = current[arrayIndex];
    } else {
      if (typeof current !== 'object' || current == null || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
  }
  return current;
}

export function setValueAtPath<T>(root: T, path: JsonPathSegment[], value: unknown): T {
  if (path.length === 0) {
    return cloneDeep(value) as T;
  }

  const normalizedPath = normalizeJsonPath(path);
  const draft = cloneDeep(root) as unknown;
  let current = draft;

  for (let index = 0; index < normalizedPath.length - 1; index++) {
    const segment = normalizedPath[index];
    const nextSegment = normalizedPath[index + 1];
    const arrayIndex = toArrayIndex(segment);
    const nextArrayIndex = toArrayIndex(nextSegment);

    if (arrayIndex != null) {
      if (!Array.isArray(current)) {
        return draft as T;
      }
      while (current.length <= arrayIndex) {
        current.push(nextArrayIndex != null ? [] : {});
      }
      if (current[arrayIndex] == null) {
        current[arrayIndex] = nextArrayIndex != null ? [] : {};
      }
      current = current[arrayIndex];
    } else {
      if (typeof current !== 'object' || current == null || Array.isArray(current)) {
        return draft as T;
      }
      const target = current as Record<string, unknown>;
      if (target[segment] == null) {
        target[segment] = nextArrayIndex != null ? [] : {};
      }
      current = target[segment];
    }
  }

  const lastSegment = normalizedPath[normalizedPath.length - 1];
  const lastArrayIndex = toArrayIndex(lastSegment);
  if (lastArrayIndex != null) {
    if (!Array.isArray(current)) {
      return draft as T;
    }
    while (current.length <= lastArrayIndex) {
      current.push(null);
    }
    current[lastArrayIndex] = cloneDeep(value);
  } else if (typeof current === 'object' && current != null && !Array.isArray(current)) {
    (current as Record<string, unknown>)[lastSegment] = cloneDeep(value);
  }

  return draft as T;
}

export function stringifyJsonPath(path: JsonPathSegment[]): string {
  if (path.length === 0) {
    return '$';
  }

  return path
    .map((segment, index) => {
      const arrayIndex = toArrayIndex(segment);
      if (arrayIndex != null) {
        return `[${arrayIndex}]`;
      }
      return index === 0 ? segment : `.${segment}`;
    })
    .join('');
}

export function parseObjectPath(value: string): JsonPathSegment[] {
  if (!value || value === '$') {
    return [];
  }

  const segments: JsonPathSegment[] = [];
  let buffer = '';
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '.') {
      if (buffer) {
        segments.push(buffer);
        buffer = '';
      }
      continue;
    }
    if (char === '[') {
      if (buffer) {
        segments.push(buffer);
        buffer = '';
      }
      const endIndex = value.indexOf(']', index);
      if (endIndex < 0) {
        break;
      }
      const indexText = value.slice(index + 1, endIndex);
      const parsedIndex = Number(indexText);
      segments.push(Number.isInteger(parsedIndex) ? parsedIndex : indexText);
      index = endIndex;
      continue;
    }
    buffer += char;
  }

  if (buffer) {
    segments.push(buffer);
  }

  return segments;
}
