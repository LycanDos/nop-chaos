import CryptoJS from 'crypto-js'

// 生成随机ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// 格式化JSON
export function formatJSON(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch (error) {
    return String(obj)
  }
}

// 解析JSON
export function parseJSON(str: string): any {
  try {
    return JSON.parse(str)
  } catch (error) {
    return null
  }
}

// 验证URL
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// 加密数据
export function encryptData(data: string, key: string): string {
  return CryptoJS.AES.encrypt(data, key).toString()
}

// 解密数据
export function decryptData(encryptedData: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// 生成签名
export function generateSignature(data: string, secret: string): string {
  return CryptoJS.HmacSHA256(data, secret).toString()
}

// 格式化时间
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 计算请求时间
export function calculateRequestTime(startTime: number, endTime: number): number {
  return endTime - startTime
}

// 验证HTTP方法
export function isValidHTTPMethod(method: string): boolean {
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
  return validMethods.includes(method.toUpperCase())
}

// 清理URL
export function cleanURL(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

// 合并Headers
export function mergeHeaders(...headers: Record<string, string>[]): Record<string, string> {
  return headers.reduce((acc, header) => ({ ...acc, ...header }), {})
}

// 过滤空值
export function filterEmptyValues(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined && value !== '')
  )
} 