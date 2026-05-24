/** @jest-environment node */

import { renderCopilotMessageContent } from '../../src/components/AiCopilot/message-format'

describe('renderCopilotMessageContent', () => {
  it('should keep supported markdown while escaping html', () => {
    const rendered = renderCopilotMessageContent('Hello **world**\n`code` <script>alert(1)</script>')

    expect(rendered).toContain('<strong>world</strong>')
    expect(rendered).toContain('<code>code</code>')
    expect(rendered).toContain('<br>')
    expect(rendered).not.toContain('<script>')
    expect(rendered).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('should escape raw html attributes and tags', () => {
    const rendered = renderCopilotMessageContent('<img src=x onerror=alert(1)>')

    expect(rendered).not.toContain('<img')
    expect(rendered).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
