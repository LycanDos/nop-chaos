import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import mitt, { Emitter } from 'mitt'
import type { 
  ApiRequest, 
  ApiResponse, 
  Environment, 
  Collection, 
  HoppscotchConfig, 
  HoppscotchEvent 
} from '../types'

export class HoppscotchClient {
  private axiosInstance: AxiosInstance
  private emitter: Emitter<Record<string, HoppscotchEvent>>
  private environments: Environment[] = []
  private collections: Collection[] = []
  private currentEnvironment: Environment | null = null

  constructor(config: HoppscotchConfig = {}) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: config.defaultHeaders || {
        'Content-Type': 'application/json'
      }
    })

    this.emitter = mitt()
    this.environments = config.environments || []
    this.collections = config.collections || []
    
    // 设置默认环境
    if (this.environments.length > 0) {
      this.currentEnvironment = this.environments.find(env => env.isDefault) || this.environments[0]
    }

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // 替换环境变量
        if (this.currentEnvironment) {
          config.url = this.replaceEnvironmentVariables(config.url || '', this.currentEnvironment.variables)
          // 修复headers类型问题
          if (config.headers) {
            config.headers = this.replaceEnvironmentVariablesInHeaders(config.headers as Record<string, any>, this.currentEnvironment.variables) as any
          }
        }

        this.emit('request', {
          type: 'request',
          data: config,
          timestamp: Date.now()
        })

        return config
      },
      (error) => {
        this.emit('error', {
          type: 'error',
          data: error,
          timestamp: Date.now()
        })
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.emit('response', {
          type: 'response',
          data: response,
          timestamp: Date.now()
        })
        return response
      },
      (error) => {
        this.emit('error', {
          type: 'error',
          data: error,
          timestamp: Date.now()
        })
        return Promise.reject(error)
      }
    )
  }

  private replaceEnvironmentVariables(text: string, variables: Record<string, string>): string {
    let result = text
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
      result = result.replace(regex, value)
    })
    return result
  }

  private replaceEnvironmentVariablesInHeaders(
    headers: Record<string, any>, 
    variables: Record<string, string>
  ): Record<string, any> {
    const result: Record<string, any> = {}
    Object.entries(headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        result[key] = this.replaceEnvironmentVariables(value, variables)
      } else {
        result[key] = value
      }
    })
    return result
  }

  // 发送API请求
  async sendRequest(request: ApiRequest): Promise<ApiResponse> {
    const config: AxiosRequestConfig = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      data: request.data,
      timeout: request.timeout
    }

    try {
      const response = await this.axiosInstance.request(config)
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        config: response.config
      }
    } catch (error: any) {
      if (error.response) {
        return {
          data: error.response.data,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers as Record<string, string>,
          config: error.config
        }
      }
      throw error
    }
  }

  // 环境管理
  setEnvironment(environmentId: string): void {
    const environment = this.environments.find(env => env.id === environmentId)
    if (environment) {
      this.currentEnvironment = environment
      this.emit('environment-change', {
        type: 'environment-change',
        data: environment,
        timestamp: Date.now()
      })
    }
  }

  getCurrentEnvironment(): Environment | null {
    return this.currentEnvironment
  }

  addEnvironment(environment: Environment): void {
    this.environments.push(environment)
  }

  getEnvironments(): Environment[] {
    return this.environments
  }

  // 集合管理
  addCollection(collection: Collection): void {
    this.collections.push(collection)
    this.emit('collection-change', {
      type: 'collection-change',
      data: collection,
      timestamp: Date.now()
    })
  }

  getCollections(): Collection[] {
    return this.collections
  }

  getCollection(collectionId: string): Collection | undefined {
    return this.collections.find(col => col.id === collectionId)
  }

  // 事件管理
  on(event: string, handler: (event: HoppscotchEvent) => void): void {
    this.emitter.on(event, handler)
  }

  off(event: string, handler: (event: HoppscotchEvent) => void): void {
    this.emitter.off(event, handler)
  }

  private emit(event: string, data: HoppscotchEvent): void {
    this.emitter.emit(event, data)
  }

  // 工具方法
  generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  // 导入/导出
  exportConfig(): HoppscotchConfig {
    return {
      baseURL: this.axiosInstance.defaults.baseURL,
      timeout: this.axiosInstance.defaults.timeout,
      defaultHeaders: this.axiosInstance.defaults.headers as Record<string, string>,
      environments: this.environments,
      collections: this.collections
    }
  }

  importConfig(config: HoppscotchConfig): void {
    if (config.baseURL) {
      this.axiosInstance.defaults.baseURL = config.baseURL
    }
    if (config.timeout) {
      this.axiosInstance.defaults.timeout = config.timeout
    }
    if (config.defaultHeaders) {
      // 修复headers类型问题
      this.axiosInstance.defaults.headers = config.defaultHeaders as any
    }
    if (config.environments) {
      this.environments = config.environments
    }
    if (config.collections) {
      this.collections = config.collections
    }
  }

  // Hoppscotch分享链接生成
  generateHoppscotchShareLink(request: ApiRequest, name?: string): string {
    const shareData = {
      v: 1,
      t: 'req',
      d: {
        name: name || 'API Request',
        request: {
          method: request.method,
          url: request.url,
          headers: this.convertHeadersToArray(request.headers || {}),
          params: this.convertParamsToArray(request.params || {}),
          body: request.data ? {
            type: 'raw',
            rawData: typeof request.data === 'string' ? request.data : JSON.stringify(request.data)
          } : undefined
        }
      }
    }

    // 转为JSON并Base64编码
    const json = JSON.stringify(shareData)
    const encoded = this.base64UrlEncode(json)

    // 生成分享链接
    return `https://hoppscotch.io/r/${encoded}`
  }

  // 从Hoppscotch分享链接解析
  parseHoppscotchShareLink(shareLink: string): ApiRequest | null {
    try {
      // 提取Base64编码部分
      const encoded = shareLink.substring(shareLink.lastIndexOf('/') + 1)

      // Base64解码
      const json = this.base64UrlDecode(encoded)
      const shareData = JSON.parse(json)

      if (shareData.t !== 'req') {
        throw new Error('Invalid share link type')
      }

      const requestData = shareData.d.request

      return {
        method: requestData.method || 'GET',
        url: requestData.url || '',
        headers: this.convertArrayToHeaders(requestData.headers || []),
        params: this.convertArrayToParams(requestData.params || []),
        data: requestData.body?.rawData
      }
    } catch (error) {
      console.error('Failed to parse Hoppscotch share link:', error)
      return null
    }
  }

  // 生成Curl命令
  generateCurlCommand(request: ApiRequest): string {
    let curl = `curl -X ${request.method}`

    // 添加URL
    curl += ` '${request.url}'`

    // 添加Headers
    if (request.headers) {
      Object.entries(request.headers).forEach(([key, value]) => {
        curl += ` \\\n  -H '${key}: ${value}'`
      })
    }

    // 添加Query参数
    if (request.params && Object.keys(request.params).length > 0) {
      const queryString = Object.entries(request.params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
      curl += ` \\\n  --url '${request.url}?${queryString}'`
    }

    // 添加Body
    if (request.data) {
      const dataStr = typeof request.data === 'string'
        ? request.data
        : JSON.stringify(request.data)
      curl += ` \\\n  -d '${dataStr.replace(/'/g, "'\\''")}'`
    }

    return curl
  }

  // Base64 URL-safe编码
  private base64UrlEncode(str: string): string {
    const base64 = btoa(unescape(encodeURIComponent(str)))
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  // Base64 URL-safe解码
  private base64UrlDecode(str: string): string {
    let base64 = str
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    // 补齐padding
    while (base64.length % 4) {
      base64 += '='
    }

    return decodeURIComponent(escape(atob(base64)))
  }

  // 转换Headers对象为数组格式
  private convertHeadersToArray(headers: Record<string, string>): Array<{key: string, value: string, enabled: boolean}> {
    return Object.entries(headers).map(([key, value]) => ({
      key,
      value,
      enabled: true
    }))
  }

  // 转换Params对象为数组格式
  private convertParamsToArray(params: Record<string, any>): Array<{key: string, value: string, enabled: boolean}> {
    return Object.entries(params).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true
    }))
  }

  // 转换数组格式为Headers对象
  private convertArrayToHeaders(headers: Array<{key: string, value: string, enabled?: boolean}>): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach(header => {
      if (header.enabled !== false) {
        result[header.key] = header.value
      }
    })
    return result
  }

  // 转换数组格式为Params对象
  private convertArrayToParams(params: Array<{key: string, value: string, enabled?: boolean}>): Record<string, any> {
    const result: Record<string, any> = {}
    params.forEach(param => {
      if (param.enabled !== false) {
        result[param.key] = param.value
      }
    })
    return result
  }
} 