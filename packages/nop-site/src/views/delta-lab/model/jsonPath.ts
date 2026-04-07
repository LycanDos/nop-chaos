import { cloneDeep } from 'lodash-es';

import type { JsonPathSegment } from './types';

export function getValueAtPath(root: unknown, path: JsonPathSegment[]): unknown {
  let current = root;
  for (const segment of path) {
    if (current == null) {
      return undefined;
    }
    if (typeof segment === 'number') {
      if (!Array.isArray(current) || segment < 0 || segment >= current.length) {
        return undefined;
      }
      current = current[segment];
    } else {
      if (typeof current !== 'object' || Array.isArray(current)) {
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

  const draft = cloneDeep(root) as unknown;
  let current = draft;

  for (let index = 0; index < path.length - 1; index++) {
    const segment = path[index];
    const nextSegment = path[index + 1];

    if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        return draft as T;
      }
      while (current.length <= segment) {
        current.push(typeof nextSegment === 'number' ? [] : {});
      }
      if (current[segment] == null) {
        current[segment] = typeof nextSegment === 'number' ? [] : {};
      }
      current = current[segment];
    } else {
      if (typeof current !== 'object' || current == null || Array.isArray(current)) {
        return draft as T;
      }
      const target = current as Record<string, unknown>;
      if (target[segment] == null) {
        target[segment] = typeof nextSegment === 'number' ? [] : {};
      }
      current = target[segment];
    }
  }

  const lastSegment = path[path.length - 1];
  if (typeof lastSegment === 'number') {
    if (!Array.isArray(current)) {
      return draft as T;
    }
    while (current.length <= lastSegment) {
      current.push(null);
    }
    current[lastSegment] = cloneDeep(value);
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
      if (typeof segment === 'number') {
        return `[${segment}]`;
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
