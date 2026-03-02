/**
 * API 请求配置
 */
export interface ApiRequestConfig {
  id?: string
  name: string
  description?: string
  version?: string
  method: HttpMethod
  url: string
  headers: HeaderItem[]
  queryParams: QueryParam[]
  body?: BodyConfig
  auth?: AuthConfig
  timeout?: number
  followRedirects?: boolean
  preRequestScript?: string
  postRequestTest?: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE'

export interface HeaderItem {
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface QueryParam {
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface BodyConfig {
  type: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql'
  contentType?: string
  rawData?: string
  formData?: FormDataItem[]
  graphqlQuery?: string
  graphqlVariables?: string
}

export interface FormDataItem {
  key: string
  value: string
  type: 'text' | 'file'
  enabled: boolean
  description?: string
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'api-key'
  basic?: { username: string; password: string }
  bearer?: { token: string; prefix?: string }
  oauth2?: OAuth2Config
  apiKey?: { key: string; value: string; addTo: 'header' | 'query-param' }
}

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

/**
 * Hoppscotch 分享数据格式
 */
export interface HoppscotchShareData {
  v: number
  t: 'req' | 'coll'
  d: {
    name?: string
    request: Partial<ApiRequestConfig>
  }
}

/**
 * 通信消息类型
 */
export type MessageType =
  | 'init'
  | 'getConfig'
  | 'updateConfig'
  | 'getCurl'
  | 'getShareUrl'
  | 'test'

export interface BridgeMessage<T = any> {
  type: MessageType
  payload?: T
  id: string
}

export interface BridgeResponse<T = any> {
  id: string
  success: boolean
  data?: T
  error?: string
}

/**
 * 集成选项
 */
export interface HoppscotchIntegrationOptions {
  hoppscotchUrl: string
  onConfigChange?: (config: ApiRequestConfig) => void
  onCurlGenerated?: (curl: string) => void
  onShareUrlGenerated?: (url: string) => void
  onError?: (error: string) => void
}

/**
 * 测试请求响应
 */
export interface TestRequestResponse {
  status: number
  statusText: string
  responseTime: number
  headers: Record<string, string>
  body: string
}