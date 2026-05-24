// ============================================================
// AI 回答范围前端预过滤（低成本，节省 LLM token）
// ============================================================

export enum CopilotScopeLevel {
  STRICT_PAGE = 'strict_page',
  SYSTEM = 'system',
  EXTENDED = 'extended',
  DEVELOPER_DEBUG = 'developer_debug',
}

/**
 * STRICT_PAGE 模式下明显的外部话题关键词。
 * 命中后在前端直接拒绝，不发送到后端。
 */
const STRICT_BLOCKED_KEYWORDS = [
  '天气', '新闻', '股票', '足球', '篮球', '娱乐', '八卦', '笑话',
  '你是谁', '讲个故事', '今天星期几', '几点了', '今天日期',
  '帮我写', '翻译', '计算', '百科',
]

/**
 * 检查消息是否应在 STRICT_PAGE 模式下被前端预过滤
 */
export function checkStrictScope(message: string): { allowed: boolean; reason?: string } {
  if (!message || message.trim().length === 0) {
    return { allowed: false, reason: '消息为空' }
  }

  for (const kw of STRICT_BLOCKED_KEYWORDS) {
    if (message.includes(kw)) {
      return {
        allowed: false,
        reason: '抱歉，我只能协助你填写当前表单，不能回答此类问题。',
      }
    }
  }

  return { allowed: true }
}

/**
 * 获取 scope 对应的拒绝消息
 */
export function getRejectionMessage(scope: CopilotScopeLevel): string {
  switch (scope) {
    case CopilotScopeLevel.STRICT_PAGE:
      return '抱歉，我只能协助你填写当前表单。'
    case CopilotScopeLevel.SYSTEM:
      return '抱歉，我只能回答与系统相关的问题。'
    default:
      return '抱歉，我无法回答这个问题。'
  }
}
