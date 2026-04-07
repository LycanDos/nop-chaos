export type JsonPathSegment = string | number;

export type DeltaEditorPane = 'base' | 'delta';

export type DeltaLayerKind = 'structure' | 'value' | 'process';

export type EmbeddedEditorKind =
  | 'json'
  | 'image'
  | 'jsonata'
  | 'jmes'
  | 'java'
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
