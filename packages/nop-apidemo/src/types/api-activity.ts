/**
 * API Activity 完整类型定义
 * 与后端 ApiActivity 实体保持一致
 */

// API活动主实体
export interface ApiActivity {
  id: string
  name: string
  description?: string
  type: 'http' | 'graphql' | 'grpc'
  version: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string

  // 请求配置
  request: Request

  // 预请求脚本
  preRequestScript?: string

  // 后请求测试
  postRequestTest?: string

  // 环境变量
  environmentVariables?: Record<string, string>

  // 示例响应（用于文档）
  exampleResponse?: any

  // 标签
  tags?: string[]
}

// 请求配置
export interface Request {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  url: string
  headers: Header[]
  queryParams: Param[]
  body?: BodyConfig
  auth?: AuthConfig
  timeout?: number
  followRedirects?: boolean
}

// 请求头
export interface Header {
  key: string
  value: string
  enabled: boolean
  description?: string
}

// 查询参数
export interface Param {
  key: string
  value: string
  enabled: boolean
  description?: string
}

// 请求体配置
export interface BodyConfig {
  type: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql'
  contentType?: string
  rawData?: string
  formData?: FormDataItem[]
  graphqlQuery?: string
  graphqlVariables?: string
}

// 表单数据项
export interface FormDataItem {
  key: string
  value: string
  type: 'text' | 'file'
  enabled: boolean
  description?: string
}

// 认证配置
export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'api-key'
  basic?: BasicAuth
  bearer?: BearerAuth
  oauth2?: OAuth2Config
  apiKey?: ApiKeyAuth
}

// Basic认证
export interface BasicAuth {
  username: string
  password: string
}

// Bearer Token认证
export interface BearerAuth {
  token: string
  prefix?: string
}

// OAuth2配置
export interface OAuth2Config {
  grantType: 'authorization-code' | 'password' | 'client-credentials' | 'refresh-token'
  clientId: string
  clientSecret: string
  callbackUrl: string
  authUrl: string
  accessTokenUrl: string
  scope?: string
  state?: string
}

// API Key认证
export interface ApiKeyAuth {
  key: string
  value: string
  addTo: 'header' | 'query-param'
}

// Hoppscotch分享链接数据格式
export interface HoppscotchShareData {
  v: number                    // 格式版本
  t: 'req' | 'coll'           // 类型：request 或 collection
  d: {
    name?: string
    request: Request
  }
}

// API响应类型
export interface ApiTestResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  responseTime: number
}

// API操作响应
export interface ApiOperationResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}
