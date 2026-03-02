/**
 * NOP-Hoppscotch 集成包主入口
 */
import HoppscotchEmbed from './components/HoppscotchEmbed.vue'
import HoppscotchConfigEditor from './components/HoppscotchConfigEditor.vue'
import { useHoppscotchBridge } from './composables/useHoppscotchBridge'
import { generateCurlCommand, parseCurlCommand } from './utils/curl-generator'
import { generateHoppscotchShareUrl, parseHoppscotchShareUrl } from './utils/share-url-generator'
import { apiConfigService } from './services/api-config.service'
import type * as Types from './types'

export {
  // 组件
  HoppscotchEmbed,
  HoppscotchConfigEditor,
  // Composables
  useHoppscotchBridge,
  // 工具
  generateCurlCommand,
  parseCurlCommand,
  generateHoppscotchShareUrl,
  parseHoppscotchShareUrl,
  // 服务
  apiConfigService,
  // 类型
  Types
}

export default {
  HoppscotchEmbed,
  HoppscotchConfigEditor,
  useHoppscotchBridge,
  generateCurlCommand,
  parseCurlCommand,
  generateHoppscotchShareUrl,
  parseHoppscotchShareUrl,
  apiConfigService
}