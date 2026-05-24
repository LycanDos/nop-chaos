// ============================================================
// SSE 通信客户端
// ============================================================

import type { ChatRequest, FrontendInstruction, CopilotMessage } from './types'

export interface StreamCallbacks {
  onText: (text: string) => void
  onAction: (instruction: FrontendInstruction) => void
  onConfirm: (instruction: FrontendInstruction) => void
  onDone: (usage?: { promptTokens: number; completionTokens: number }) => void
  onError: (error: string) => void
}

export class CopilotClient {
  private baseUrl = '/sse/r/NopCopilot__chatStream'
  private abortController: AbortController | null = null
  private sessionId: string

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateSessionId()
  }

  getSessionId(): string {
    return this.sessionId
  }

  async sendMessage(
    request: ChatRequest,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    this.cancel()

    request.sessionId = this.sessionId
    this.abortController = new AbortController()

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        callbacks.onError(`HTTP ${response.status}: ${response.statusText}`)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError('Stream not available')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let eventType = ''
      let eventData = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        eventType = ''
        eventData = ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6)
          } else if (line === '' && eventType) {
            // Empty line = end of event
            this.processEvent(eventType, eventData, callbacks)
            eventType = ''
            eventData = ''
          }
        }
      }

      // Flush TextDecoder internal buffer
      buffer += decoder.decode()
      const finalLine = buffer.trim()
      if (finalLine) {
        // Process any final data line (e.g., data: {...} without trailing blank line)
        if (finalLine.startsWith('data: ')) {
          eventData = finalLine.slice(6)
        }
      }

      // Process remaining event
      if (eventType && eventData) {
        this.processEvent(eventType, eventData, callbacks)
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return
      callbacks.onError(err.message || 'Network error')
    }
  }

  private processEvent(
    type: string,
    data: string,
    callbacks: StreamCallbacks,
  ): void {
    try {
      const parsed = JSON.parse(data)
      switch (type) {
        case 'content':
          callbacks.onText(parsed.text || parsed.content || '')
          break
        case 'action':
          callbacks.onAction(parsed.instruction || parsed)
          break
        case 'confirm':
          callbacks.onConfirm(parsed.instruction || parsed)
          break
        case 'done':
          callbacks.onDone(parsed.usage)
          break
        case 'error':
          callbacks.onError(parsed.error || 'Unknown error')
          break
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }
}
