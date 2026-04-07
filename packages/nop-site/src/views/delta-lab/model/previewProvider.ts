import type {
  DeltaPreviewProvider,
  DeltaPreviewRequest,
  DeltaPreviewResult,
} from './types';
import { simulateDeltaPreview } from './deltaPreview';

export class LocalDeltaPreviewProvider implements DeltaPreviewProvider {
  async preview(request: DeltaPreviewRequest): Promise<DeltaPreviewResult> {
    return simulateDeltaPreview(request.base, request.draft);
  }
}

export class HttpDeltaPreviewProvider implements DeltaPreviewProvider {
  constructor(private readonly endpoint: string) {}

  async preview(request: DeltaPreviewRequest): Promise<DeltaPreviewResult> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`后端预览请求失败: ${response.status}`);
    }

    return response.json() as Promise<DeltaPreviewResult>;
  }
}

export const localPreviewProvider = new LocalDeltaPreviewProvider();

export const backendContractExample = {
  previewEndpoint: 'POST /api/delta/editor/preview',
  validateEndpoint: 'POST /api/delta/editor/validate',
  applyEndpoint: 'POST /api/delta/editor/apply',
  body: {
    base: '{...}',
    draft: '{...}',
  },
  response: {
    mode: 'delta | pipeline',
    source: 'backend',
    result: '{...}',
    warnings: [{ message: '...' }],
    steps: [{ index: 0, kind: '$delta', status: 'applied', summary: '...' }],
    unresolvedExpressions: 0,
  },
};
