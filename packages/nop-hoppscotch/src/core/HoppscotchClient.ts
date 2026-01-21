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
} 