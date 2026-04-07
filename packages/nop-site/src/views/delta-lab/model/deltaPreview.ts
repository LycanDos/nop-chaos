import { cloneDeep, isPlainObject } from 'lodash-es';

import type {
  DeltaPreviewResult,
  JsonPathSegment,
  PipelineStepPreview,
  PreviewWarning,
} from './types';

type Selector =
  | { kind: 'index'; index: number }
  | { kind: 'field'; fieldName: string; expectedValue: unknown };

interface PathSegment {
  propertyName: string;
  selector?: Selector;
}

interface DeltaEntry {
  key: string;
  op: 'merge' | 'replace' | 'delete' | 'insert';
  targetPath?: PathSegment[];
  locatorPath?: PathSegment[];
  insertPosition?: 'append' | 'before' | 'after';
  anchorSelector?: Selector;
  value: unknown;
}

export function simulateDeltaPreview(
  base: Record<string, unknown>,
  draft: Record<string, unknown>,
): DeltaPreviewResult {
  if (Array.isArray(draft.$pipeline)) {
    return simulatePipelinePreview(base, draft.$pipeline as unknown[]);
  }

  const warnings: PreviewWarning[] = [];
  const result = applyDeltaDocument(cloneDeep(base), draft, warnings);
  return {
    mode: 'delta',
    source: 'local-simulator',
    result,
    warnings,
    steps: [],
    unresolvedExpressions: countExpressions(draft),
  };
}

function simulatePipelinePreview(
  base: Record<string, unknown>,
  pipeline: unknown[],
): DeltaPreviewResult {
  const warnings: PreviewWarning[] = [];
  const steps: PipelineStepPreview[] = [];
  let current = cloneDeep(base);
  let unresolvedExpressions = 0;

  pipeline.forEach((step, index) => {
    if (!isPlainObject(step)) {
      steps.push({
        index,
        kind: 'unknown',
        status: 'unsupported',
        summary: 'step 不是对象，前端只做跳过展示。',
      });
      return;
    }

    if (isPlainObject(step.$delta)) {
      current = applyDeltaDocument(current, step.$delta as Record<string, unknown>, warnings);
      unresolvedExpressions += countExpressions(step.$delta);
      steps.push({
        index,
        kind: '$delta',
        status: 'applied',
        summary: `已应用 $delta step，key 数量 ${Object.keys(step.$delta as Record<string, unknown>).length}。`,
      });
      return;
    }

    steps.push({
      index,
      kind: Object.keys(step)[0] ?? 'unknown',
      status: 'unsupported',
      summary: '当前前端模拟器只顺序预览 $delta step，其他 step 交给后端权威执行。',
    });
  });

  return {
    mode: 'pipeline',
    source: 'local-simulator',
    result: current,
    warnings,
    steps,
    unresolvedExpressions,
  };
}

function applyDeltaDocument(
  base: Record<string, unknown>,
  delta: Record<string, unknown>,
  warnings: PreviewWarning[],
): Record<string, unknown> {
  const snapshot = cloneDeep(base);
  const result = cloneDeep(base);
  const entries = Object.entries(delta).map(([key, value]) => parseEntry(key, value));
  const merges = entries.filter((entry) => entry.op === 'merge');
  const replaces = entries.filter((entry) => entry.op === 'replace');
  const deletes = entries.filter((entry) => entry.op === 'delete');
  const inserts = entries.filter((entry) => entry.op === 'insert');

  merges.forEach((entry) => {
    try {
      const tokens = resolvePath(snapshot, entry.targetPath ?? [], true);
      mergeAt(result, tokens, materializeValue(entry.value));
    } catch (error) {
      warnings.push({ message: `[merge] ${entry.key}: ${toErrorMessage(error)}` });
    }
  });

  replaces.forEach((entry) => {
    try {
      const tokens = resolvePath(snapshot, entry.targetPath ?? [], true);
      setAt(result, tokens, materializeValue(entry.value));
    } catch (error) {
      warnings.push({ message: `[replace] ${entry.key}: ${toErrorMessage(error)}` });
    }
  });

  deletes
    .map((entry) => {
      try {
        return { entry, tokens: resolvePath(snapshot, entry.targetPath ?? [], false) };
      } catch (error) {
        warnings.push({ message: `[delete] ${entry.key}: ${toErrorMessage(error)}` });
        return null;
      }
    })
    .filter((item): item is { entry: DeltaEntry; tokens: JsonPathSegment[] } => item !== null)
    .sort((left, right) => right.tokens.length - left.tokens.length)
    .forEach(({ tokens }) => removeAt(result, tokens));

  inserts.forEach((entry) => {
    try {
      const containerTokens = resolvePath(snapshot, entry.locatorPath ?? [], false);
      applyInsert(result, snapshot, entry, containerTokens);
    } catch (error) {
      warnings.push({ message: `[insert] ${entry.key}: ${toErrorMessage(error)}` });
    }
  });

  return result;
}

function parseEntry(key: string, value: unknown): DeltaEntry {
  if (key.includes('.+') && key.endsWith('-')) {
    throw new Error('replace key 末尾不能再带 delete 后缀');
  }

  if (key.endsWith('+[]') || key.includes('+<[') || key.includes('+>[')) {
    return parseInsertEntry(key, value);
  }

  if (key.includes('.+')) {
    const [locatorText, replaceTail] = splitOnce(key, '.+');
    const targetText = `${locatorText}${replaceTail.startsWith('[') ? '' : '.'}${replaceTail}`;
    return {
      key,
      op: 'replace',
      locatorPath: parsePath(locatorText),
      targetPath: parsePath(targetText),
      value,
    };
  }

  if (key.endsWith('-')) {
    return {
      key,
      op: 'delete',
      targetPath: parsePath(key.slice(0, -1)),
      value,
    };
  }

  return {
    key,
    op: 'merge',
    targetPath: parsePath(key),
    value,
  };
}

function parseInsertEntry(key: string, value: unknown): DeltaEntry {
  if (key.endsWith('+[]')) {
    return {
      key,
      op: 'insert',
      locatorPath: parsePath(key.slice(0, -3)),
      insertPosition: 'append',
      value,
    };
  }

  const marker = key.includes('+<[') ? '+<[' : '+>[';
  const [containerText, selectorTextWithBracket] = splitOnce(key, marker);
  const selectorText = selectorTextWithBracket.slice(0, -1);
  return {
    key,
    op: 'insert',
    locatorPath: parsePath(containerText),
    insertPosition: marker === '+<[' ? 'before' : 'after',
    anchorSelector: parseSelector(selectorText),
    value,
  };
}

function splitOnce(value: string, separator: string) {
  const index = value.indexOf(separator);
  if (index < 0) {
    throw new Error(`缺少分隔符 ${separator}`);
  }
  return [value.slice(0, index), value.slice(index + separator.length)] as const;
}

function parsePath(value: string): PathSegment[] {
  if (!value) {
    return [];
  }
  const segments: PathSegment[] = [];
  let current = '';
  let depth = 0;
  for (const char of value) {
    if (char === '.' && depth === 0) {
      if (current) {
        segments.push(parseSegment(current));
        current = '';
      }
      continue;
    }
    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
    }
    current += char;
  }
  if (current) {
    segments.push(parseSegment(current));
  }
  return segments;
}

function parseSegment(segment: string): PathSegment {
  const bracketIndex = segment.indexOf('[');
  if (bracketIndex < 0) {
    return { propertyName: segment };
  }
  return {
    propertyName: segment.slice(0, bracketIndex),
    selector: parseSelector(segment.slice(bracketIndex + 1, -1)),
  };
}

function parseSelector(text: string): Selector {
  if (/^\d+$/.test(text)) {
    return { kind: 'index', index: Number(text) };
  }
  const [fieldName, rawExpected] = splitOnce(text, '=');
  return {
    kind: 'field',
    fieldName,
    expectedValue: parseLiteral(rawExpected),
  };
}

function parseLiteral(text: string): unknown {
  if (text.startsWith('\'') && text.endsWith('\'')) {
    return text.slice(1, -1);
  }
  if (text === 'true') {
    return true;
  }
  if (text === 'false') {
    return false;
  }
  if (text === 'null') {
    return null;
  }
  if (/^-?\d+$/.test(text)) {
    return Number(text);
  }
  if (/^-?\d+\.\d+$/.test(text)) {
    return Number(text);
  }
  return text;
}

function resolvePath(
  root: Record<string, unknown>,
  path: PathSegment[],
  allowMissingLeaf: boolean,
): JsonPathSegment[] {
  const tokens: JsonPathSegment[] = [];
  let current: unknown = root;
  let missingBranch = false;

  path.forEach((segment, index) => {
    tokens.push(segment.propertyName);
    if (segment.selector) {
      if (missingBranch) {
        throw new Error('ancestor path 缺失，无法解析 selector');
      }
      if (!isPlainObject(current)) {
        throw new Error('selector 前的父节点不是对象');
      }
      const list = current[segment.propertyName];
      if (!Array.isArray(list)) {
        throw new Error(`selector 目标不是数组: ${segment.propertyName}`);
      }
      const selectedIndex = resolveSelectorIndex(list, segment.selector);
      tokens.push(selectedIndex);
      current = list[selectedIndex];
      return;
    }

    if (missingBranch) {
      current = undefined;
      return;
    }

    if (!isPlainObject(current)) {
      throw new Error(`路径穿过了非对象节点: ${segment.propertyName}`);
    }

    const propertyValue = current[segment.propertyName];
    if (propertyValue === undefined) {
      if (index === path.length - 1 && !allowMissingLeaf) {
        current = undefined;
      } else {
        missingBranch = true;
        current = undefined;
      }
      return;
    }
    current = propertyValue;
  });

  return tokens;
}

function resolveSelectorIndex(list: unknown[], selector: Selector): number {
  if (selector.kind === 'index') {
    if (selector.index < 0 || selector.index >= list.length) {
      throw new Error(`selector index 越界: ${selector.index}`);
    }
    return selector.index;
  }

  const matches: number[] = [];
  list.forEach((item, index) => {
    if (isPlainObject(item) && item[selector.fieldName] === selector.expectedValue) {
      matches.push(index);
    }
  });

  if (matches.length !== 1) {
    throw new Error(`selector 必须唯一命中，实际命中 ${matches.length} 个`);
  }
  return matches[0];
}

function materializeValue(value: unknown): unknown {
  if (isPlainObject(value)) {
    if (typeof value.$jina === 'string') {
      return `[value:$jina] ${value.$jina}`;
    }
    if (typeof value.$jmes === 'string') {
      return `[value:$jmes] ${value.$jmes}`;
    }
    if (typeof value.$java === 'string') {
      return `[value:$java] ${value.$java}`;
    }
  }
  return cloneDeep(value);
}

function countExpressions(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + countExpressions(item), 0);
  }
  if (!isPlainObject(value)) {
    return 0;
  }

  if (
    typeof value.$jina === 'string' ||
    typeof value.$jmes === 'string' ||
    typeof value.$java === 'string'
  ) {
    return 1;
  }

  return Object.values(value).reduce((count, item) => count + countExpressions(item), 0);
}

function getByTokens(root: unknown, tokens: JsonPathSegment[]): unknown {
  let current = root;
  for (const token of tokens) {
    if (current == null) {
      return undefined;
    }
    if (typeof token === 'number') {
      if (!Array.isArray(current) || token < 0 || token >= current.length) {
        return undefined;
      }
      current = current[token];
    } else {
      if (!isPlainObject(current)) {
        return undefined;
      }
      current = current[token];
    }
  }
  return current;
}

function setAt(root: Record<string, unknown>, tokens: JsonPathSegment[], value: unknown) {
  if (tokens.length === 0) {
    return;
  }

  let current: unknown = root;
  for (let index = 0; index < tokens.length - 1; index++) {
    const token = tokens[index];
    const nextToken = tokens[index + 1];

    if (typeof token === 'number') {
      if (!Array.isArray(current)) {
        throw new Error('期望数组节点');
      }
      while (current.length <= token) {
        current.push(typeof nextToken === 'number' ? [] : {});
      }
      if (current[token] == null) {
        current[token] = typeof nextToken === 'number' ? [] : {};
      }
      current = current[token];
    } else {
      if (!isPlainObject(current)) {
        throw new Error('期望对象节点');
      }
      if (current[token] == null) {
        current[token] = typeof nextToken === 'number' ? [] : {};
      }
      current = current[token];
    }
  }

  const lastToken = tokens[tokens.length - 1];
  if (typeof lastToken === 'number') {
    if (!Array.isArray(current)) {
      throw new Error('期望数组节点');
    }
    while (current.length <= lastToken) {
      current.push(null);
    }
    current[lastToken] = cloneDeep(value);
  } else if (isPlainObject(current)) {
    current[lastToken] = cloneDeep(value);
  }
}

function mergeAt(root: Record<string, unknown>, tokens: JsonPathSegment[], value: unknown) {
  const existing = getByTokens(root, tokens);
  if (isPlainObject(existing) && isPlainObject(value)) {
    setAt(root, tokens, deepMerge(existing, value));
    return;
  }
  setAt(root, tokens, value);
}

function deepMerge(
  base: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const result = cloneDeep(base);
  Object.entries(incoming).forEach(([key, value]) => {
    if (isPlainObject(result[key]) && isPlainObject(value)) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      return;
    }
    result[key] = cloneDeep(value);
  });
  return result;
}

function removeAt(root: Record<string, unknown>, tokens: JsonPathSegment[]) {
  if (tokens.length === 0) {
    return;
  }
  const parentTokens = tokens.slice(0, -1);
  const lastToken = tokens[tokens.length - 1];
  const parent = parentTokens.length === 0 ? root : getByTokens(root, parentTokens);
  if (typeof lastToken === 'number') {
    if (Array.isArray(parent) && lastToken >= 0 && lastToken < parent.length) {
      parent.splice(lastToken, 1);
    }
  } else if (isPlainObject(parent)) {
    delete parent[lastToken];
  }
}

function applyInsert(
  result: Record<string, unknown>,
  snapshot: Record<string, unknown>,
  entry: DeltaEntry,
  containerTokens: JsonPathSegment[],
) {
  const snapshotContainer = getByTokens(snapshot, containerTokens);
  let targetContainer = getByTokens(result, containerTokens);

  if (targetContainer == null) {
    setAt(result, containerTokens, []);
    targetContainer = getByTokens(result, containerTokens);
  }

  if (!Array.isArray(targetContainer)) {
    throw new Error('插入目标不是数组');
  }

  const values = Array.isArray(entry.value)
    ? cloneDeep(entry.value).map((item) => materializeValue(item))
    : [materializeValue(entry.value)];

  if (entry.insertPosition === 'append') {
    targetContainer.push(...values);
    return;
  }

  if (!Array.isArray(snapshotContainer)) {
    throw new Error('before/after 插入需要已有数组容器');
  }

  const anchorIndex = resolveSelectorIndex(snapshotContainer, entry.anchorSelector as Selector);
  const insertIndex = entry.insertPosition === 'before' ? anchorIndex : anchorIndex + 1;
  targetContainer.splice(insertIndex, 0, ...values);
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
