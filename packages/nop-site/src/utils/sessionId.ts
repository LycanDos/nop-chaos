/**
 * 会话 ID 生成器。
 * 页面加载时生成唯一会话标识，用于关联同一会话内的所有错误和行为。
 * 行为上报预留：此 sessionId 可在后续行为埋点中复用。
 */
let _sessionId: string;

export function getSessionId(): string {
  if (!_sessionId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      _sessionId = crypto.randomUUID();
    } else {
      _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }
  return _sessionId;
}
