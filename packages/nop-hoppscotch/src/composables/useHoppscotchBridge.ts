/**
 * 通信桥接 Composable
 * 用于NOP-CHAOS与Hoppscotch iframe之间的postMessage通信
 */
import { ref, onMounted, onUnmounted } from 'vue'
import type {
  BridgeMessage,
  BridgeResponse,
  ApiRequestConfig,
  MessageType
} from '../types'

/**
 * Hoppscotch桥接钩子
 *
 * 使用方式:
 * ```ts
 * const bridge = useHoppscotchBridge('http://localhost:3000')
 * await bridge.init(config)
 * const curl = await bridge.getCurl()
 * ```
 */
export function useHoppscotchBridge(iframeUrl: string) {
  const iframeRef = ref<HTMLIFrameElement | null>(null)
  const isConnected = ref(false)
  const pendingRequests = new Map<string, {
    resolve: (value: any) => void
    reject: (reason: any) => void
  }>()

  let messageId = 0

  /**
   * 发送消息到Hoppscotch
   */
  const sendMessage = async <T = any>(
    type: MessageType,
    payload?: any
  ): Promise<T> => {
    if (!iframeRef.value || !iframeRef.value.contentWindow) {
      throw new Error('Hoppscotch iframe not available')
    }

    const id = `msg_${Date.now()}_${messageId++}`

    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject })

      const message: BridgeMessage = { type, payload, id }
      iframeRef.value!.contentWindow!.postMessage(message, iframeUrl)

      // 超时处理
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id)
          reject(new Error(`Request timeout: ${type}`))
        }
      }, 10000)
    })
  }

  /**
   * 处理来自Hoppscotch的消息
   */
  const handleMessage = (event: MessageEvent<BridgeResponse>) => {
    // 验证来源
    if (event.origin !== new URL(iframeUrl).origin) {
      console.warn('Invalid message origin:', event.origin)
      return
    }

    const { id, success, data, error } = event.data
    const pending = pendingRequests.get(id)

    if (pending) {
      pendingRequests.delete(id)

      if (success) {
        pending.resolve(data)
      } else {
        pending.reject(new Error(error || 'Unknown error'))
      }
    }
  }

  /**
   * 初始化Hoppscotch
   */
  const init = async (config?: Partial<ApiRequestConfig>) => {
    try {
      await sendMessage('init', config)
      isConnected.value = true
    } catch (error) {
      console.error('Failed to initialize Hoppscotch:', error)
      throw error
    }
  }

  /**
   * 获取当前配置
   */
  const getConfig = async (): Promise<ApiRequestConfig> => {
    return sendMessage<ApiRequestConfig>('getConfig')
  }

  /**
   * 更新配置
   */
  const updateConfig = async (config: ApiRequestConfig) => {
    await sendMessage('updateConfig', config)
  }

  /**
   * 获取Curl命令
   */
  const getCurl = async (): Promise<string> => {
    const result = await sendMessage<{ curl: string }>('getCurl')
    return result.curl
  }

  /**
   * 获取分享链接
   */
  const getShareUrl = async (): Promise<string> => {
    const result = await sendMessage<{ shareUrl: string }>('getShareUrl')
    return result.shareUrl
  }

  /**
   * 测试请求
   */
  const testRequest = async (): Promise<any> => {
    return sendMessage('test')
  }

  // 生命周期
  onMounted(() => {
    window.addEventListener('message', handleMessage)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
    pendingRequests.clear()
  })

  return {
    iframeRef,
    isConnected,
    init,
    getConfig,
    updateConfig,
    getCurl,
    getShareUrl,
    testRequest
  }
}