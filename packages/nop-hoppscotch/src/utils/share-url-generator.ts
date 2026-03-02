/**
 * 分享链接生成工具
 * 用于生成和解析 Hoppscotch 分享链接
 */
import type { ApiRequestConfig, HoppscotchShareData } from '../types'

/**
 * 生成 Hoppscotch 分享链接
 */
export function generateHoppscotchShareUrl(config: ApiRequestConfig): string {
  // 构建分享数据
  const shareData: HoppscotchShareData = {
    v: 1,
    t: 'req',
    d: {
      name: config.name,
      request: {
        method: config.method,
        url: config.url,
        headers: config.headers,
        queryParams: config.queryParams,
        body: config.body,
        auth: config.auth
      }
    }
  }

  // 转换为 JSON
  const json = JSON.stringify(shareData)

  // Base64 URL-safe 编码
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  // 生成分享链接
  return `https://hoppscotch.io/r/${encoded}`
}

/**
 * 从 Hoppscotch 分享链接解析配置
 */
export function parseHoppscotchShareUrl(url: string): Partial<ApiRequestConfig> | null {
  try {
    // 提取 Base64 部分
    const encoded = url.substring(url.lastIndexOf('/') + 1)

    // Base64 解码
    const json = decodeURIComponent(escape(atob(encoded)))
    const shareData: HoppscotchShareData = JSON.parse(json)

    if (shareData.d?.request) {
      return {
        name: shareData.d.name || 'Imported Request',
        ...shareData.d.request
      }
    }

    return null
  } catch (error) {
    console.error('Failed to parse share URL:', error)
    return null
  }
}