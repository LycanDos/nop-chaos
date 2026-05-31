/** @jest-environment node */

import { renderCopilotMessageContent } from '../../src/components/AiCopilot/message-format'

describe('renderCopilotMessageContent', () => {
  it('should render basic markdown', () => {
    const rendered = renderCopilotMessageContent('Hello **world**')

    expect(rendered).toContain('<strong>world</strong>')
  })

  it('should render inline code', () => {
    const rendered = renderCopilotMessageContent('use `code` here')

    expect(rendered).toContain('<code>code</code>')
  })

  it('should render headings', () => {
    const rendered = renderCopilotMessageContent('# Title')

    expect(rendered).toContain('<h1')
    expect(rendered).toContain('Title')
  })

  it('should render lists', () => {
    const rendered = renderCopilotMessageContent('- item1\n- item2')

    expect(rendered).toContain('<ul>')
    expect(rendered).toContain('<li>item1</li>')
    expect(rendered).toContain('<li>item2</li>')
  })

  it('should render code blocks', () => {
    const rendered = renderCopilotMessageContent('```js\nconst x = 1\n```')

    expect(rendered).toContain('<pre>')
    expect(rendered).toContain('<code')
    expect(rendered).toContain('const x = 1')
  })

  it('should render tables', () => {
    const rendered = renderCopilotMessageContent('| a | b |\n|---|---|\n| 1 | 2 |')

    expect(rendered).toContain('<table>')
    expect(rendered).toContain('<td>1</td>')
  })

  it('should strip script tags', () => {
    const rendered = renderCopilotMessageContent('<script>alert(1)</script>')

    expect(rendered).not.toContain('<script>')
    expect(rendered).not.toContain('alert(1)')
  })

  it('should strip event handler attributes', () => {
    const rendered = renderCopilotMessageContent('<img src=x onerror=alert(1)>')

    expect(rendered).not.toContain('onerror')
    expect(rendered).not.toContain('alert(1)')
  })

  it('should render links safely', () => {
    const rendered = renderCopilotMessageContent('[click](https://example.com)')

    expect(rendered).toContain('<a')
    expect(rendered).toContain('href="https://example.com"')
    expect(rendered).toContain('click')
  })

  it('should handle empty input', () => {
    expect(renderCopilotMessageContent('')).toBe('')
    expect(renderCopilotMessageContent()).toBe('')
  })
})
