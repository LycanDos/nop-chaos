import { ajaxRequest } from '@nop-chaos/sdk';
import type { CopilotMessage, CopilotSessionSummary } from './types';

interface SessionMessageRecord {
  messageId?: string;
  role?: string;
  content?: string;
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

export async function getCopilotSessionMessages(sessionId: string): Promise<CopilotMessage[]> {
  const res = await ajaxRequest({
    url: '/r/NopCopilot__getSessionMessages',
    data: { sessionId, limit: 200, offset: 0 },
    silent: true,
  });
  return extractItems<SessionMessageRecord>(res).map((item, index) => ({
    id: item.messageId || `history_${sessionId}_${index}`,
    role: normalizeRole(item.role),
    content: item.content || '',
    timestamp: normalizeTimestamp(item.createTime),
  }));
}

export async function deleteCopilotSession(sessionId: string): Promise<void> {
  await ajaxRequest({
    url: '/r/NopCopilot__deleteSession',
    data: { sessionId },
    silent: true,
  });
}
