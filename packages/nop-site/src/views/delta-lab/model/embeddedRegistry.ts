import type { EmbeddedEditorMatch, EmbeddedMatchContext, JsonPathSegment } from './types';
import { stringifyJsonPath } from './jsonPath';

const IMAGE_DATA_URI = /^data:image\/[a-zA-Z0-9.+-]+(?:;[a-zA-Z0-9=:+-]+)?,/;
const IMAGE_URL = /^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i;
const HTTP_URL = /^https?:\/\/.+/i;
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const COLOR_FUNCTION = /^(rgb|rgba|hsl|hsla)\(/i;
const COLOR_KEY_HINT = /(color|fill|stroke|background)$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getLastKey(path: JsonPathSegment[]): string | null {
  const last = path[path.length - 1];
  return typeof last === 'string' ? last : null;
}

function prettyJson(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }
  return JSON.stringify(value, null, 2);
}

function parseJsonOrKeepObject(source: string, fallback: unknown): unknown {
  try {
    return JSON.parse(source);
  } catch {
    return fallback;
  }
}

function normalizeSource(source: string): string {
  return source
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function isImageString(value: string): boolean {
  return IMAGE_DATA_URI.test(value) || IMAGE_URL.test(value);
}

function isLinkString(value: string): boolean {
  return HTTP_URL.test(value);
}

function isColorString(value: string, keyHint = ''): boolean {
  return HEX_COLOR.test(value) || COLOR_FUNCTION.test(value) || (COLOR_KEY_HINT.test(keyHint) && /^[a-z-]+$/i.test(value));
}

function createExpressionMatch(
  kind: EmbeddedEditorMatch['kind'],
  id: string,
  key: '$jina' | '$jmes' | '$java' | '$sql',
  label: string,
  description: string,
  language: string
): (ctx: EmbeddedMatchContext) => EmbeddedEditorMatch | null {
  return (ctx) => {
    const lastKey = getLastKey(ctx.path);
    if (lastKey === key && typeof ctx.value === 'string') {
      return {
        id,
        kind,
        label,
        layer: 'value',
        description,
        language,
        canEditSource: true,
        getSource: (value) => String(value ?? ''),
        setSource: (source) => source,
        formatSource: (source) => normalizeSource(source),
      };
    }

    if (isPlainObject(ctx.value) && typeof ctx.value[key] === 'string') {
      return {
        id,
        kind,
        label,
        layer: 'value',
        description,
        language,
        canEditSource: true,
        getSource: (value) => (isPlainObject(value) ? String(value[key] ?? '') : ''),
        setSource: (source, fallback) => (isPlainObject(fallback) ? { ...fallback, [key]: source } : { [key]: source }),
        formatSource: (source) => normalizeSource(source),
      };
    }

    return null;
  };
}

const matchJsonata = createExpressionMatch(
  'jsonata',
  'jsonata-expression',
  '$jina',
  'JSONata / $jina',
  '当前节点的值表达式，只负责生成当前 key 的 value。',
  'jsonata'
);

const matchJmes = createExpressionMatch(
  'jmes',
  'jmes-expression',
  '$jmes',
  'JMES / $jmes',
  '当前节点的 JMES 值表达式，建议只用于值计算。',
  'plaintext'
);

const matchJava = createExpressionMatch(
  'java',
  'java-expression',
  '$java',
  'Java / $java',
  '当前节点的 Java 值提供器，未来应与后端签名和校验协同。',
  'java'
);

const matchSql = createExpressionMatch(
  'sql',
  'sql-expression',
  '$sql',
  'SQL / $sql',
  '当前节点的 SQL 值表达式，适合在中栏做语法编辑和格式整理。',
  'sql'
);

function matchPipeline(ctx: EmbeddedMatchContext): EmbeddedEditorMatch | null {
  const path = ctx.path as JsonPathSegment[];
  if (path.length === 1 && path[0] === '$pipeline' && Array.isArray(ctx.value)) {
    return {
      id: 'pipeline-document',
      kind: 'pipeline',
      label: '$pipeline',
      layer: 'process',
      description: '显式顺序执行的过程层。后续 step 的输入来自前一步输出。',
      language: 'json',
      canEditSource: true,
      getSource: (value) => prettyJson(value),
      setSource: (source, fallback) => parseJsonOrKeepObject(source, fallback),
      formatSource: (source) => prettyJson(parseJsonOrKeepObject(source, [])),
    };
  }

  return null;
}

function matchImage(ctx: EmbeddedMatchContext): EmbeddedEditorMatch | null {
  if (typeof ctx.value !== 'string') {
    return null;
  }
  if (!isImageString(ctx.value)) {
    return null;
  }

  return {
    id: 'image-preview',
    kind: 'image',
    label: '图片资源',
    layer: 'value',
    description: '图片值支持可视预览，也可直接修改 URL 或 data URI。',
    language: 'plaintext',
    canEditSource: true,
    getSource: (value) => String(value ?? ''),
    setSource: (source) => source,
    formatSource: (source) => normalizeSource(source),
  };
}

function matchLink(ctx: EmbeddedMatchContext): EmbeddedEditorMatch | null {
  if (typeof ctx.value !== 'string' || !isLinkString(ctx.value)) {
    return null;
  }

  return {
    id: 'link-preview',
    kind: 'link',
    label: '链接预览',
    layer: 'value',
    description: '链接值支持预览和直接修改 URL。',
    language: 'plaintext',
    canEditSource: true,
    getSource: (value) => String(value ?? ''),
    setSource: (source) => normalizeSource(source),
    formatSource: (source) => normalizeSource(source),
  };
}

function matchColor(ctx: EmbeddedMatchContext): EmbeddedEditorMatch | null {
  if (typeof ctx.value !== 'string') {
    return null;
  }

  const lastKey = getLastKey(ctx.path) ?? '';
  const isColorValue = isColorString(ctx.value, lastKey);

  if (!isColorValue) {
    return null;
  }

  return {
    id: 'color-preview',
    kind: 'color',
    label: '颜色值',
    layer: 'value',
    description: '颜色值支持即时预览，十六进制颜色可直接调色。',
    language: 'plaintext',
    canEditSource: true,
    getSource: (value) => String(value ?? ''),
    setSource: (source) => normalizeSource(source),
    formatSource: (source) => normalizeSource(source),
  };
}

function createArrayMatch(
  kind: 'array' | 'image-list' | 'link-list' | 'color-list',
  id: string,
  label: string,
  description: string
): EmbeddedEditorMatch {
  return {
    id,
    kind,
    label,
    layer: 'value',
    description,
    language: 'json',
    canEditSource: true,
    getSource: (value) => prettyJson(value),
    setSource: (source, fallback) => {
      const parsed = parseJsonOrKeepObject(source, fallback);
      return Array.isArray(parsed) ? parsed : fallback;
    },
    formatSource: (source) => {
      const parsed = parseJsonOrKeepObject(source, []);
      return prettyJson(Array.isArray(parsed) ? parsed : []);
    },
  };
}

function matchArray(ctx: EmbeddedMatchContext): EmbeddedEditorMatch | null {
  if (!Array.isArray(ctx.value)) {
    return null;
  }

  const items = ctx.value.filter((item) => item != null);
  if (items.length === 0) {
    return createArrayMatch('array', 'array-node', '数组节点', '空数组，按 JSON 数组原样编辑。');
  }

  if (items.every((item) => typeof item === 'string' && isImageString(item))) {
    return createArrayMatch('image-list', 'image-list', '图片数组', '当前节点是图片数组，中栏可批量预览并用 JSON 方式编辑。');
  }

  if (items.every((item) => typeof item === 'string' && isLinkString(item))) {
    return createArrayMatch('link-list', 'link-list', '链接数组', '当前节点是链接数组，中栏可集中预览并用 JSON 方式编辑。');
  }

  if (items.every((item) => typeof item === 'string' && isColorString(item))) {
    return createArrayMatch('color-list', 'color-list', '颜色数组', '当前节点是颜色数组，中栏可批量预览并用 JSON 方式编辑。');
  }

  return createArrayMatch('array', 'array-node', '数组节点', '当前节点是数组，按 JSON 数组原样编辑。');
}

function matchPlainText(ctx: EmbeddedMatchContext): EmbeddedEditorMatch | null {
  if (typeof ctx.value !== 'string') {
    return null;
  }

  return {
    id: 'text-value',
    kind: 'text',
    label: '文本值',
    layer: 'value',
    description: `当前文本节点路径：${stringifyJsonPath(ctx.path)}。`,
    language: 'plaintext',
    canEditSource: true,
    getSource: (value) => String(value ?? ''),
    setSource: (source) => source,
    formatSource: (source) => normalizeSource(source),
  };
}

function matchDefaultJson(ctx: EmbeddedMatchContext): EmbeddedEditorMatch {
  return {
    id: 'json-node',
    kind: 'json',
    label: 'JSON 节点',
    layer: 'structure',
    description: `当前选中节点路径：${stringifyJsonPath(ctx.path)}。默认按 JSON 原样编辑。`,
    language: 'json',
    canEditSource: true,
    getSource: (value) => prettyJson(value),
    setSource: (source, fallback) => parseJsonOrKeepObject(source, fallback),
    formatSource: (source) => prettyJson(parseJsonOrKeepObject(source, {})),
  };
}

const matchers = [matchPipeline, matchJsonata, matchJmes, matchJava, matchSql, matchImage, matchLink, matchColor, matchArray, matchPlainText];

export function matchEmbeddedEditor(ctx: EmbeddedMatchContext): EmbeddedEditorMatch {
  for (const matcher of matchers) {
    const matched = matcher(ctx);
    if (matched) {
      return matched;
    }
  }
  return matchDefaultJson(ctx);
}

export function getEmbeddedBadge(match: EmbeddedEditorMatch): string {
  switch (match.kind) {
    case 'jsonata':
      return '$jina';
    case 'jmes':
      return '$jmes';
    case 'java':
      return '$java';
    case 'sql':
      return '$sql';
    case 'pipeline':
      return '$pipeline';
    case 'image':
      return 'IMG';
    case 'image-list':
      return 'IMG[]';
    case 'link':
      return 'LINK';
    case 'link-list':
      return 'LINK[]';
    case 'color':
      return 'COLOR';
    case 'color-list':
      return 'COLOR[]';
    case 'array':
      return 'ARR';
    case 'text':
      return 'TEXT';
    default:
      return 'JSON';
  }
}
