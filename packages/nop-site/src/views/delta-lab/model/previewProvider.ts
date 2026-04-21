import { ajaxRequest } from '@nop-chaos/sdk';

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

/**
 * 多 Source 后端执行请求。
 */
export interface BackendApplyRequest {
  sources: Record<string, Record<string, unknown>>;
  target: string;
  delta: Record<string, unknown>;
}

/**
 * 通过 Nop GraphQL 调用后端 DeltaLab BizModel 执行 Delta apply。
 */
export async function backendApplyDelta(request: BackendApplyRequest): Promise<DeltaPreviewResult> {
  try {
    const response = await ajaxRequest({
      url: '@mutation:DeltaLab__applyDelta',
      data: {
        sources: request.sources,
        target: request.target,
        delta: request.delta,
      },
    });

    // ajaxRequest 返回的是 GraphQL data 字段的内容
    const data = response as Record<string, unknown>;
    return {
      mode: (data.mode as 'delta' | 'pipeline') ?? 'delta',
      source: 'backend',
      result: (data.result as Record<string, unknown>) ?? {},
      warnings: Array.isArray(data.warnings)
        ? (data.warnings as Array<{ message: string }>)
        : [],
      steps: Array.isArray(data.steps)
        ? (data.steps as Array<{ index: number; kind: string; status: 'applied' | 'skipped' | 'unsupported'; summary: string }>)
        : [],
      unresolvedExpressions: (data.unresolvedExpressions as number) ?? 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      mode: 'delta',
      source: 'backend',
      result: {},
      warnings: [{ message: `后端执行失败: ${message}` }],
      steps: [],
      unresolvedExpressions: 0,
    };
  }
}

/**
 * 通过 Nop GraphQL 调用后端 DeltaLab BizModel 生成逆向 Delta。
 */
export async function backendReverseDelta(request: BackendApplyRequest): Promise<{
  reverseDelta: Record<string, unknown>;
  success: boolean;
  error?: string;
}> {
  try {
    const response = await ajaxRequest({
      url: '@mutation:DeltaLab__reverseDelta',
      data: {
        sources: request.sources,
        target: request.target,
        delta: request.delta,
      },
    });

    const data = response as Record<string, unknown>;
    return {
      reverseDelta: (data.reverseDelta as Record<string, unknown>) ?? {},
      success: data.success as boolean ?? false,
      error: data.error as string | undefined,
    };
  } catch (error) {
    return {
      reverseDelta: {},
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const localPreviewProvider = new LocalDeltaPreviewProvider();
