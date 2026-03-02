/**
 * Curl 命令生成和解析工具
 */
import type { ApiRequestConfig } from '../types'

/**
 * 生成 Curl 命令
 */
export function generateCurlCommand(config: ApiRequestConfig): string {
  const parts: string[] = []

  // 基本命令
  parts.push(`curl -X ${config.method}`)

  // URL
  parts.push(`'${config.url}'`)

  // Headers
  const enabledHeaders = config.headers.filter(h => h.enabled)
  if (enabledHeaders.length > 0) {
    enabledHeaders.forEach(header => {
      parts.push(`  -H '${header.key}: ${header.value}'`)
    })
  }

  // Query Parameters
  const enabledParams = config.queryParams.filter(p => p.enabled)
  if (enabledParams.length > 0) {
    parts.push(`  -G`)
    enabledParams.forEach(param => {
      parts.push(`  --data-urlencode '${param.key}=${param.value}'`)
    })
  }

  // Body
  if (config.body && config.body.type !== 'none' && config.body.rawData) {
    parts.push(`  -d '${config.body.rawData}'`)
  }

  // Auth
  if (config.auth) {
    switch (config.auth.type) {
      case 'basic':
        if (config.auth.basic) {
          parts.push(`  -u '${config.auth.basic.username}:${config.auth.basic.password}'`)
        }
        break
      case 'bearer':
        if (config.auth.bearer) {
          const prefix = config.auth.bearer.prefix || 'Bearer'
          parts.push(`  -H 'Authorization: ${prefix} ${config.auth.bearer.token}'`)
        }
        break
      case 'api-key':
        if (config.auth.apiKey) {
          if (config.auth.apiKey.addTo === 'header') {
            parts.push(`  -H '${config.auth.apiKey.key}: ${config.auth.apiKey.value}'`)
          }
        }
        break
    }
  }

  return parts.join(' \\\n')
}

/**
 * 解析 Curl 命令为配置
 */
export function parseCurlCommand(curl: string): Partial<ApiRequestConfig> {
  const config: Partial<ApiRequestConfig> = {
    method: 'GET',
    url: '',
    headers: [],
    queryParams: [],
    body: { type: 'none' }
  }

  // 简单解析逻辑
  const lines = curl.split('\\\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // 解析方法
    const methodMatch = trimmed.match(/curl\s+-X\s+(\w+)/)
    if (methodMatch) {
      config.method = methodMatch[1] as any
    }

    // 解析 URL
    const urlMatch = trimmed.match(/'([^']+)'/)
    if (urlMatch && !trimmed.includes('-H') && !trimmed.includes('-d')) {
      config.url = urlMatch[1]
    }

    // 解析 Header
    const headerMatch = trimmed.match(/-H\s+'([^:]+):\s*(.+?)'/)
    if (headerMatch) {
      config.headers!.push({
        key: headerMatch[1],
        value: headerMatch[2],
        enabled: true
      })
    }

    // 解析 Body
    const bodyMatch = trimmed.match(/-d\s+'(.+)'/)
    if (bodyMatch) {
      config.body = {
        type: 'raw',
        rawData: bodyMatch[1]
      }
    }
  }

  return config
}