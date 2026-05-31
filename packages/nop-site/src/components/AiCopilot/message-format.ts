import showdown from 'showdown'
import xss from 'xss'

const converter = new showdown.Converter({
  tables: true,
  tasklists: true,
  strikethrough: true,
  simpleLineBreaks: true,
  openLinksInNewWindow: true,
})

const XSS_WHITELIST: Record<string, string[]> = {
  br: [],
  code: [],
  strong: [],
  em: [],
  del: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  ul: [],
  ol: [],
  li: [],
  a: ['href', 'target', 'rel'],
  p: [],
  pre: [],
  blockquote: [],
  hr: [],
  table: [],
  thead: [],
  tbody: [],
  tr: [],
  th: [],
  td: [],
  img: ['src', 'alt'],
  input: ['type', 'checked', 'disabled'],
}

export function renderCopilotMessageContent(text?: string): string {
  if (!text) return ''

  // 清理 DeepSeek thinking mode 偶尔混入的反斜杠
  let cleaned = text
    // 成对包裹中文：\去后台\ → 去后台
    .replace(/\\([一-鿿][^\\]{0,50})\\(?=[一-鿿\s，。！？、；：""''""''"）\)】』\w]|$)/g, '$1')
    // 单边反斜杠后跟中文：\看流程日志" → 看流程日志"
    .replace(/\\(?=[一-鿿])/g, '')
    // markdown 标记前误加反斜杠：*\xxx* → **xxx**
    .replace(/\\([*_~`])/g, '$1')

  const html = converter.makeHtml(cleaned)

  return xss(html, {
    whiteList: XSS_WHITELIST,
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  })
}
