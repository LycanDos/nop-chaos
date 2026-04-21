export type JsonPathSegment = string | number;

export type DeltaEditorPane = 'base' | 'delta';

export type DeltaLayerKind = 'structure' | 'value' | 'process';

/** 左侧 Source tab 类型 */
export type SourceTabKind = 'source';

/** 右侧 Delta tab 类型 */
export type DeltaTabKind = 'delta' | 'reverse' | 'pipeline-step';

export interface SourceTab {
  id: string;
  name: string;
  isTarget: boolean;
  data: Record<string, unknown>;
}

export interface DeltaTab {
  id: string;
  kind: DeltaTabKind;
  label: string;
  data: Record<string, unknown>;
}

export type EmbeddedEditorKind =
  | 'json'
  | 'array'
  | 'text'
  | 'image'
  | 'image-list'
  | 'link'
  | 'link-list'
  | 'color'
  | 'color-list'
  | 'jsonata'
  | 'jmes'
  | 'java'
  | 'sql'
  | 'pipeline';

export interface EmbeddedMatchContext {
  side: DeltaEditorPane;
  path: JsonPathSegment[];
  value: unknown;
  root: unknown;
  base: Record<string, unknown>;
  delta: Record<string, unknown>;
}

export interface EmbeddedEditorMatch {
  id: string;
  kind: EmbeddedEditorKind;
  label: string;
  layer: DeltaLayerKind;
  description: string;
  language: string;
  canEditSource: boolean;
  getSource: (value: unknown) => string;
  setSource: (source: string, value: unknown) => unknown;
  formatSource?: (source: string) => string;
}

export interface PreviewWarning {
  message: string;
  path?: string;
}

export interface PipelineStepPreview {
  index: number;
  kind: string;
  status: 'applied' | 'skipped' | 'unsupported';
  summary: string;
}

export interface DeltaPreviewResult {
  mode: 'delta' | 'pipeline';
  source: 'local-simulator' | 'backend';
  result: Record<string, unknown>;
  warnings: PreviewWarning[];
  steps: PipelineStepPreview[];
  unresolvedExpressions: number;
}

export interface DeltaPreviewRequest {
  base: Record<string, unknown>;
  draft: Record<string, unknown>;
}

export interface DeltaPreviewProvider {
  preview(request: DeltaPreviewRequest): Promise<DeltaPreviewResult>;
}
