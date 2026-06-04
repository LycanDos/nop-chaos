import { ajaxRequest } from '@nop-chaos/sdk';
import type { CopilotMessage, CopilotSessionSummary, FrontendInstruction } from './types';

interface SessionMessageRecord {
  messageId?: string;
  role?: string;
  content?: string;
  toolCalls?: string | null;
  metadata?: string | null;
  createTime?: string;
}

function extractItems<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.items)) return res.items;
  return [];
}

function normalizeRole(role?: string): CopilotMessage['role'] {
  const normalized = role?.toUpperCase();
  if (normalized === 'USER') return 'user';
  if (normalized === 'ASSISTANT') return 'assistant';
  return 'system';
}

function parseJsonObject(raw?: string | null): Record<string, any> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeInstructionPayload(payload: Record<string, any> | null): FrontendInstruction | undefined {
  if (!payload) return undefined;
  if (payload.instruction && typeof payload.instruction === 'object') {
    return payload.instruction as FrontendInstruction;
  }
  if (Array.isArray(payload.actions) || payload.type || payload.message || payload.summary) {
    return payload as FrontendInstruction;
  }
  return undefined;
}

function isExecutionFeedbackPayload(payload: Record<string, any> | null): boolean {
  return !!payload && (
    typeof payload.status === 'string'
    || typeof payload.summary === 'string'
    || Array.isArray(payload.results)
  );
}

function isContinueMessage(item: SessionMessageRecord): boolean {
  return item.role?.toUpperCase() === 'USER' && item.content === '__continue__';
}

function toMessage(sessionId: string, item: SessionMessageRecord, index: number): CopilotMessage | null {
  if (isContinueMessage(item)) {
    return null;
  }

  const metadata = parseJsonObject(item.metadata);
  const toolCalls = parseJsonObject(item.toolCalls);
  const instruction = normalizeInstructionPayload(metadata) || normalizeInstructionPayload(toolCalls);
  const executionFeedback = isExecutionFeedbackPayload(metadata) ? metadata : null;

  const role = normalizeRole(item.role);
  const content = item.content || instruction?.summary || instruction?.message || executionFeedback?.summary || '';

  return {
    id: item.messageId || `history_${sessionId}_${index}`,
    role,
    content,
    instruction,
    timestamp: normalizeTimestamp(item.createTime),
  };
}

function normalizeTimestamp(time?: string): number {
  if (!time) return Date.now();
  const parsed = Date.parse(time);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export async function listCopilotSessions(): Promise<CopilotSessionSummary[]> {
  const res = await ajaxRequest({
    url: '/r/NopCopilot__listSessions',
    data: { limit: 30, offset: 0 },
    silent: true,
  });
  return extractItems<CopilotSessionSummary>(res);
}

export async function createCopilotSession(sessionId: string, pageType?: string, route?: string): Promise<CopilotSessionSummary | null> {
  const res = await ajaxRequest({
    url: '/r/NopCopilot__createSession',
    data: { sessionId, pageType, route },
    silent: true,
  });
  return res || null;
}

export async function getCopilotSessionMessages(sessionId: string): Promise<CopilotMessage[]> {
  const res = await ajaxRequest({
    url: '/r/NopCopilot__getSessionMessages',
    data: { sessionId, limit: 200, offset: 0 },
    silent: true,
  });
  return extractItems<SessionMessageRecord>(res)
    .map((item, index) => toMessage(sessionId, item, index))
    .filter((item): item is CopilotMessage => item != null);
}

export async function renameCopilotSession(sessionId: string, title: string): Promise<void> {
  await ajaxRequest({
    url: '/r/NopCopilot__renameSession',
    data: { sessionId, title },
    silent: true,
  });
}

export async function deleteCopilotSession(sessionId: string): Promise<void> {
  await ajaxRequest({
    url: '/r/NopCopilot__deleteSession',
    data: { sessionId },
    silent: true,
  });
}

export async function deleteCopilotSessions(sessionIds: string[]): Promise<number> {
  const res = await ajaxRequest({
    url: '/r/NopCopilot__deleteSessions',
    data: { sessionIds },
    silent: true,
  });
  return typeof res === 'number' ? res : 0;
}
