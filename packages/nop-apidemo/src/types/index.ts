// API请求相关类型
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  url: string
  headers?: Record<string, string>
  params?: Record<string, any>
  data?: any
  timeout?: number
}

// API响应相关类型
export interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: any
}

// 环境配置类型
export interface Environment {
  id: string
  name: string
  variables: Record<string, string>
  isDefault?: boolean
}

// 集合类型
export interface Collection {
  id: string
  name: string
  description?: string
  requests: ApiRequest[]
  environments?: Environment[]
  createdAt: Date
  updatedAt: Date
}

// Hoppscotch配置类型
export interface HoppscotchConfig {
  baseURL?: string
  timeout?: number
  defaultHeaders?: Record<string, string>
  environments?: Environment[]
  collections?: Collection[]
}

// 事件类型
export interface HoppscotchEvent {
  type: 'request' | 'response' | 'error' | 'environment-change' | 'collection-change'
  data: any
  timestamp: number
}

// 插件类型
export interface HoppscotchPlugin {
  name: string
  version: string
  install: (app: any) => void
  uninstall?: () => void
} 