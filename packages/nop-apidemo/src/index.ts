// 导出核心类
export { HoppscotchClient } from './core/HoppscotchClient'

// 导出组件
export { default as HoppscotchPanel } from './components/HoppscotchPanel.vue'

// 导出类型
export type {
  ApiRequest,
  ApiResponse,
  Environment,
  Collection,
  HoppscotchConfig,
  HoppscotchEvent,
  HoppscotchPlugin
} from './types'

// 导出工具函数
export * from './utils'

// 默认导出
import { HoppscotchClient } from './core/HoppscotchClient'
import HoppscotchPanel from './components/HoppscotchPanel.vue'

export default {
  HoppscotchClient,
  HoppscotchPanel
} 