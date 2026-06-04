/**
 * 前端错误上报传输层。
 *
 * 设计原则:
 * - 使用 sendBeacon 保证页面关闭时也能发送
 * - 2 秒批量队列合并多个错误为一次请求
 * - 同指纹 10 秒内去重，避免死循环错误洪泛
 * - responseBody 自动脱敏
 * - 上报失败静默处理，避免无限循环
 * - 为行为上报预留 reportBehavior() 接口
 */

import { getSessionId } from '/@/utils/sessionId';

/** 上报条目（与后端 nop_auth_frontend_error_log 表字段对应） */
export interface FrontendErrorEntry {
  errorType: string;
  errorName?: string;
  errorMessage: string;
  errorStack?: string;
  errorDetail?: string;
  errorFile?: string;
  pageUrl: string;
  routePath?: string;
  userId?: string;
  userName?: string;
  tenantId?: string;
  sessionId: string;
  nopTrace?: string;
  userAgent: string;
  responseBody?: string;
  errorTime: number; // epoch millis
}

/** 去重指纹: errorType|errorMessage|routePath */
function fingerprint(entry: FrontendErrorEntry): string {
  return `${entry.errorType || ''}|${entry.errorMessage || ''}|${entry.routePath || ''}`;
}

/** 脱敏: 移除 token/password/secret 等敏感字段 */
function sanitizeBody(body: string): string {
  if (!body) return '';
  return body
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"***"')
    .replace(/"token"\s*:\s*"[^"]*"/gi, '"token":"***"')
    .replace(/"accessToken"\s*:\s*"[^"]*"/gi, '"accessToken":"***"')
    .replace(/"secret"\s*:\s*"[^"]*"/gi, '"secret":"***"')
    .replace(/"(authorization|set-cookie)"\s*:\s*"[^"]*"/gi, '"$1":"***"')
    .substring(0, 2000); // 截断过长响应体
}

/** 获取上报接口 URL */
function getReportUrl(): string {
  // 复用现有 API 域名配置，兼容开发/生产环境
  const base = (window as any).__GLOB_API_URL__ || '';
  return `${base}/r/NopFrontendErrorLog__batchReport`;
}

class ErrorReportTransport {
  private queue: FrontendErrorEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private dedupMap = new Map<string, number>();
  private maxQueueSize = 20;

  /** 入队一条错误，触发延迟批量发送 */
  enqueue(entry: FrontendErrorEntry) {
    // 去重: 10 秒内相同指纹不重复上报
    const fp = fingerprint(entry);
    const last = this.dedupMap.get(fp);
    if (last && Date.now() - last < 10_000) return;
    this.dedupMap.set(fp, Date.now());

    // 清理过期的去重记录（防止 Map 无限增长）
    if (this.dedupMap.size > 200) {
      const cutoff = Date.now() - 30_000;
      for (const [k, v] of this.dedupMap) {
        if (v < cutoff) this.dedupMap.delete(k);
      }
    }

    this.queue.push(entry);

    // 队列满时立即发送
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
      return;
    }

    // 2 秒后批量发送
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 2000);
    }
  }

  /** 立即发送队列中的所有错误 */
  flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.queue.length) return;

    const payload = { errors: this.queue };
    this.queue = [];
    const url = getReportUrl();

    try {
      const body = JSON.stringify(payload);
      // 使用 fetch + keepalive 以便携带 auth token
      // sendBeacon 不支持自定义 headers，故统一用 fetch
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const { getToken } = require('/@/utils/auth');
        const token = getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      } catch { /* 无 token 也继续发送 */ }

      fetch(url, { method: 'POST', body, headers, keepalive: true }).catch(() => {
        /* 静默失败 */
      });
    } catch {
      /* 静默失败 */
    }
  }

  /**
   * 构建上报条目（提取通用字段）。
   * 为行为上报预留: 后续可通过 errorType='BEHAVIOR' 调用此方法。
   */
  buildEntry(overrides: Partial<FrontendErrorEntry>): FrontendErrorEntry {
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

    return {
      errorType: overrides.errorType || 'unknown',
      errorName: overrides.errorName,
      errorMessage: overrides.errorMessage || '',
      errorStack: overrides.errorStack,
      errorDetail: overrides.errorDetail,
      errorFile: overrides.errorFile,
      pageUrl: overrides.pageUrl || pageUrl,
      routePath: overrides.routePath,
      userId: overrides.userId,
      userName: overrides.userName,
      tenantId: overrides.tenantId,
      sessionId: getSessionId(),
      nopTrace: overrides.nopTrace,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      responseBody: overrides.responseBody ? sanitizeBody(overrides.responseBody) : undefined,
      errorTime: overrides.errorTime || Date.now(),
    };
  }

  /**
   * 行为上报预留接口。
   * 后续可在行为埋点中调用此方法上报用户行为数据。
   */
  reportBehavior(action: string, data?: Record<string, any>) {
    this.enqueue(
      this.buildEntry({
        errorType: 'BEHAVIOR',
        errorMessage: action,
        errorDetail: data ? JSON.stringify(data) : undefined,
      })
    );
  }
}

export const errorReportTransport = new ErrorReportTransport();
