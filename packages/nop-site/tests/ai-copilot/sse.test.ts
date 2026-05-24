/** @jest-environment node */

import {
  dispatchCopilotEvent,
  SseEventParser,
  type StreamCallbacks,
} from '../../src/components/AiCopilot/sse'

describe('SseEventParser', () => {
  it('should parse split multi-line SSE events', () => {
    const parser = new SseEventParser()

    const first = parser.feed('event: content\r\ndata: {"text":"hel')
    const second = parser.feed('lo"}\r\n\r\nevent: clarification\r\ndata: {"text":"line1"')
    const third = parser.feed('\r\ndata: "line2"}\r\n\r\n')

    expect(first).toEqual([])
    expect(second).toEqual([
      {
        event: 'content',
        data: '{"text":"hello"}',
      },
    ])
    expect(third).toEqual([
      {
        event: 'clarification',
        data: '{"text":"line1"\n"line2"}',
      },
    ])
  })

  it('should handle CRLF split across chunk boundaries', () => {
    const parser = new SseEventParser()

    const first = parser.feed('event: content\r')
    const second = parser.feed('\ndata: {"text":"hello"}\r')
    const third = parser.feed('\n\r\n')

    expect(first).toEqual([])
    expect(second).toEqual([])
    expect(third).toEqual([
      {
        event: 'content',
        data: '{"text":"hello"}',
      },
    ])
  })

  it('should flush trailing event without final blank line', () => {
    const parser = new SseEventParser()
    parser.feed('event: error\ndata: {"error":"boom"}')

    expect(parser.flush()).toEqual([
      {
        event: 'error',
        data: '{"error":"boom"}',
      },
    ])
  })
})

describe('dispatchCopilotEvent', () => {
  function createCallbacks() {
    return {
      texts: [] as string[],
      clarifications: [] as string[],
      instructions: [] as any[],
      confirmations: [] as any[],
      usages: [] as any[],
      errors: [] as string[],
    }
  }

  function toCallbacks(recorder: ReturnType<typeof createCallbacks>): StreamCallbacks {
    return {
      onText: (text) => recorder.texts.push(text),
      onInstruction: (instruction) => recorder.instructions.push(instruction),
      onConfirmRequired: (instruction) => recorder.confirmations.push(instruction),
      onClarification: (text) => recorder.clarifications.push(text),
      onDone: (usage) => recorder.usages.push(usage),
      onError: (error) => recorder.errors.push(error),
    }
  }

  it('should dispatch explicit event types and legacy aliases', () => {
    const recorder = createCallbacks()
    const callbacks = toCallbacks(recorder)

    dispatchCopilotEvent('content', '{"text":"hello"}', callbacks)
    dispatchCopilotEvent('instruction', '{"instruction":{"type":"instruction","actions":[]}}', callbacks)
    dispatchCopilotEvent('confirm', '{"instruction":{"type":"confirm_required","actions":[]}}', callbacks)
    dispatchCopilotEvent('clarification', '{"text":"need more info"}', callbacks)
    dispatchCopilotEvent('done', '{"usage":{"promptTokens":1,"completionTokens":2}}', callbacks)
    dispatchCopilotEvent('error', '{"error":"boom"}', callbacks)

    expect(recorder.texts).toEqual(['hello'])
    expect(recorder.instructions).toHaveLength(1)
    expect(recorder.confirmations).toHaveLength(1)
    expect(recorder.clarifications).toEqual(['need more info'])
    expect(recorder.usages).toEqual([{ promptTokens: 1, completionTokens: 2 }])
    expect(recorder.errors).toEqual(['boom'])
  })
})
