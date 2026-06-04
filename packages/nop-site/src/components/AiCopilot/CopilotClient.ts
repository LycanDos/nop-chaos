// ============================================================
// SSE 通信客户端
// ============================================================

import { useAdapter } from '@nop-chaos/sdk';
import type { ChatRequest } from './types';
import { dispatchCopilotEvent, SseEventParser, type StreamCallbacks } from './sse';

export class CopilotClient {
  private baseUrl = '/sse/r/NopCopilot__chatStream';
  private abortController: AbortController | null = null;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId();
  }

  getSessionId(): string {
    return this.sessionId;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId || this.generateSessionId();
  }

  createSessionId(): string {
    const sessionId = this.generateSessionId();
    this.sessionId = sessionId;
    return sessionId;
  }

  async sendMessage(request: ChatRequest, callbacks: StreamCallbacks): Promise<void> {
    this.cancel();

    request.sessionId = this.sessionId;
    this.abortController = new AbortController();
    const adapter = useAdapter();
    const token = adapter.useAuthToken?.();
    const tenantId = adapter.useTenantId?.() || '0';
    const locale = adapter.useLocale?.()?.replace('_', '-');
    const appId = adapter.useAppId?.();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'x-requested-with': 'XMLHttpRequest',
    };

    if (locale) {
      headers['nop-locale'] = locale;
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers['x-timestamp'] = `${Date.now()}`;
      headers['x-tenant-id'] = tenantId;
      headers['x-version'] = adapter.globalVersion || 'v3';
      if (appId) {
        headers['nop-app-id'] = appId;
      }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        callbacks.onError(`HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError('Stream not available');
        return;
      }

      const decoder = new TextDecoder();
      const parser = new SseEventParser();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const event of parser.feed(text)) {
          dispatchCopilotEvent(event.event, event.data, callbacks);
        }
      }

      const tail = decoder.decode();
      for (const event of parser.feed(tail)) {
        dispatchCopilotEvent(event.event, event.data, callbacks);
      }
      for (const event of parser.flush()) {
        dispatchCopilotEvent(event.event, event.data, callbacks);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      callbacks.onError(err.message || 'Network error');
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
