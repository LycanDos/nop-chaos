import type {
  CopilotStreamEventType,
  CopilotUsage,
  FrontendInstruction,
} from './types'

export interface ParsedSseEvent {
  event: string
  data: string
}

interface CurrentEventState {
  event: string
  dataLines: string[]
}

export interface StreamCallbacks {
  onText: (text: string) => void
  onInstruction: (instruction: FrontendInstruction) => void
  onConfirmRequired: (instruction: FrontendInstruction) => void
  onClarification?: (text: string) => void
  onDone: (usage?: CopilotUsage) => void
  onError: (error: string) => void
}

export class SseEventParser {
  private buffer = ''
  private current: CurrentEventState = this.newEvent()

  feed(chunk: string): ParsedSseEvent[] {
    if (!chunk) {
      return []
    }

    this.buffer += chunk
    return this.drainBuffer(false)
  }

  flush(): ParsedSseEvent[] {
    const events = this.drainBuffer(true)
    const pending = this.finalizeEvent()
    if (pending) {
      events.push(pending)
    }
    return events
  }

  private consumeLine(line: string): ParsedSseEvent | null {
    if (line === '') {
      return this.finalizeEvent()
    }

    if (line.startsWith(':')) {
      return null
    }

    const colonIndex = line.indexOf(':')
    const field = colonIndex >= 0 ? line.slice(0, colonIndex) : line
    let value = colonIndex >= 0 ? line.slice(colonIndex + 1) : ''
    if (value.startsWith(' ')) {
      value = value.slice(1)
    }

    switch (field) {
      case 'event':
        this.current.event = value || 'message'
        break
      case 'data':
        this.current.dataLines.push(value)
        break
      default:
        break
    }

    return null
  }

  private finalizeEvent(): ParsedSseEvent | null {
    if (this.current.dataLines.length === 0) {
      this.current = this.newEvent()
      return null
    }

    const event = {
      event: this.current.event || 'message',
      data: this.current.dataLines.join('\n'),
    }

    this.current = this.newEvent()
    return event
  }

  private newEvent(): CurrentEventState {
    return {
      event: 'message',
      dataLines: [],
    }
  }

  private drainBuffer(flushTrailingCr: boolean): ParsedSseEvent[] {
    this.buffer = normalizeLineEndings(this.buffer, flushTrailingCr)

    const events: ParsedSseEvent[] = []
    let lineEnd = this.buffer.indexOf('\n')

    while (lineEnd >= 0) {
      const line = this.buffer.slice(0, lineEnd)
      this.buffer = this.buffer.slice(lineEnd + 1)
      const event = this.consumeLine(line)
      if (event) {
        events.push(event)
      }
      lineEnd = this.buffer.indexOf('\n')
    }

    if (flushTrailingCr && this.buffer.length > 0) {
      const event = this.consumeLine(this.buffer)
      if (event) {
        events.push(event)
      }
      this.buffer = ''
    }

    return events
  }
}

function normalizeLineEndings(input: string, flushTrailingCr: boolean): string {
  if (!input) {
    return input
  }

  const preserveTrailingCr = !flushTrailingCr && input.endsWith('\r')
  const body = preserveTrailingCr ? input.slice(0, -1) : input
  const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return preserveTrailingCr ? `${normalized}\r` : normalized
}

export function dispatchCopilotEvent(
  eventType: string,
  data: string,
  callbacks: StreamCallbacks,
): void {
  const type = normalizeEventType(eventType)
  const parsed = parseEventPayload(data)

  switch (type) {
    case 'content':
      callbacks.onText(readTextPayload(parsed))
      break
    case 'instruction':
      callbacks.onInstruction(readInstructionPayload(parsed))
      break
    case 'confirm_required':
      callbacks.onConfirmRequired(readInstructionPayload(parsed))
      break
    case 'clarification':
      if (callbacks.onClarification) {
        callbacks.onClarification(readTextPayload(parsed))
      } else {
        callbacks.onText(readTextPayload(parsed))
      }
      break
    case 'done':
      callbacks.onDone(readUsagePayload(parsed))
      break
    case 'error':
      callbacks.onError(readErrorPayload(parsed))
      break
    default:
      break
  }
}

function normalizeEventType(eventType: string): CopilotStreamEventType | null {
  switch (eventType) {
    case 'content':
    case 'instruction':
    case 'confirm_required':
    case 'clarification':
    case 'done':
    case 'error':
      return eventType
    case 'action':
      return 'instruction'
    case 'confirm':
      return 'confirm_required'
    default:
      return null
  }
}

function parseEventPayload(data: string): any {
  if (!data) {
    return {}
  }

  try {
    return JSON.parse(data)
  } catch {
    return {
      text: data,
      error: data,
    }
  }
}

function readTextPayload(parsed: any): string {
  if (parsed == null) {
    return ''
  }
  return parsed.text || parsed.content || parsed.message || ''
}

function readInstructionPayload(parsed: any): FrontendInstruction {
  return parsed?.instruction || parsed
}

function readUsagePayload(parsed: any): CopilotUsage | undefined {
  return parsed?.usage
}

function readErrorPayload(parsed: any): string {
  return parsed?.error || parsed?.message || 'Unknown error'
}
