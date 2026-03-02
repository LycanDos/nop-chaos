/**
 * API 配置服务
 * 用于管理 API 请求配置的 CRUD 操作
 */
import type { ApiRequestConfig } from '../types'

export class ApiConfigService {
  private storageKey = 'nop-hoppscotch-configs'

  /**
   * 保存配置
   */
  async saveConfig(config: ApiRequestConfig): Promise<void> {
    const configs = await this.getAllConfigs()
    const index = configs.findIndex(c => c.id === config.id)

    if (index >= 0) {
      configs[index] = config
    } else {
      configs.push(config)
    }

    localStorage.setItem(this.storageKey, JSON.stringify(configs))
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<ApiRequestConfig[]> {
    const data = localStorage.getItem(this.storageKey)
    if (!data) return []

    try {
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  /**
   * 获取单个配置
   */
  async getConfig(id: string): Promise<ApiRequestConfig | null> {
    const configs = await this.getAllConfigs()
    return configs.find(c => c.id === id) || null
  }

  /**
   * 删除配置
   */
  async deleteConfig(id: string): Promise<void> {
    const configs = await this.getAllConfigs()
    const filtered = configs.filter(c => c.id !== id)
    localStorage.setItem(this.storageKey, JSON.stringify(filtered))
  }

  /**
   * 导出配置为 JSON
   */
  exportConfig(config: ApiRequestConfig): string {
    return JSON.stringify(config, null, 2)
  }

  /**
   * 从 JSON 导入配置
   */
  importConfig(json: string): ApiRequestConfig | null {
    try {
      const config = JSON.parse(json)
      // 验证必需字段
      if (!config.name || !config.method || !config.url) {
        throw new Error('Invalid config: missing required fields')
      }
      return config
    } catch (error) {
      console.error('Failed to import config:', error)
      return null
    }
  }
}

// 导出单例
export const apiConfigService = new ApiConfigService()