import type {
  EmbeddedEditorMatch,
  EmbeddedMatchContext,
  JsonPathSegment,
} from './types';
import { stringifyJsonPath } from './jsonPath';

const IMAGE_DATA_URI = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;
const IMAGE_URL = /^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseJsonOrKeepObject(source: string, fallback: unknown): unknown {
  try {
    return JSON.parse(source);
  } catch {
    return fallback;
  }
}

function createExpressionMatch(
  kind: EmbeddedEditorMatch['kind'],
  id: string,
  key: '$jina' | '$jmes' | '$java',
  label: string,
  description: string,
  language: string,
): (ctx: EmbeddedMatchContext) => EmbeddedEditorMatch | null {
  return (ctx) => {
    if (!isPlainObject(ctx.value) || typeof ctx.value[key] !== 'string') {
      return null;
    }

    return {
      id,
      kind,
      label,
      layer: 'value',
      description,
      language,
      canEditSource: true,
      getSource: (value) => (isPlainObject(value) ? String(value[key] ?? '') : ''),
      setSource: (source) => ({ [key]: source }),
      formatSource: (source) => source.trim(),
    };
  };
}

const matchJsonata = createExpressionMatch(
  'jsonata',
  'jsonata-expression',
  '$jina',
  'JSONata / $jina',
  '当前节点的值表达式，只负责生成当前 key 的 value。',
  'jsonata',
);

const matchJmes = createExpressionMatch(
  'jmes',
  'jmes-expression',
  '$jmes',
  'JMES / $jmes',
  '当前节点的 JMES 值表达式，建议只用于值计算。',
  'plaintext',
);

const matchJava = createExpressionMatch(
  'java',
  'java-expression',
  '$java',
  'Java / $java',
  '当前节点的 Java 值提供器，未来应与后端签名和校验协同。',
  'java',
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
  if (!IMAGE_DATA_URI.test(ctx.value) && !IMAGE_URL.test(ctx.value)) {
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
    formatSource: (source) => source.trim(),
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

const matchers = [matchPipeline, matchJsonata, matchJmes, matchJava, matchImage];

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
    case 'pipeline':
      return '$pipeline';
    case 'image':
      return 'IMG';
    default:
      return 'JSON';
  }
}
