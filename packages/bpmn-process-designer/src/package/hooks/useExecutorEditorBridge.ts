/**
 * 通用 iframe 桥接 composable
 *
 * 实现 executor-plugin-spec 的微前端桥接协议 v2：
 *   1. 平台 → iframe: postMessage({ type: 'init', surfaceId, config, ... })
 *   2. iframe → 平台: postMessage({ type: 'ready' })
 *   3. iframe → 平台: postMessage({ type: 'saved', surfaceId, config, ... })
 *   4. iframe → 平台: postMessage({ type: 'canceled' })
 *
 * 用法:
 *   const bridge = useExecutorEditorBridge({
 *     iframeRef,
 *     surfaceId: 'request',
 *     config: { method: 'GET', url: '...' },   // 或 () => ({...}) 延迟求值
 *     onSaved: (configJson) => { ... },
 *     onCanceled: () => { ... },
 *   })
 *   bridge.init() // 发送配置到 iframe
 */
import { onMounted, onUnmounted, type Ref } from 'vue'

export interface ExecutorEditorBridgeOptions {
  /** iframe 元素引用 */
  iframeRef: Ref<HTMLIFrameElement | null>
  /** 当前编辑的 surfaceId（如 "request"） */
  surfaceId?: string
  /** 发送给编辑器的初始配置，支持直接值或 getter 函数以便延迟求值 */
  config?: Record<string, any> | (() => Record<string, any>)
  /** 编辑器就绪回调 */
  onReady?: () => void
  /** 编辑器保存回调（收到编辑器返回的配置） */
  onSaved?: (config: Record<string, any>) => void
  /** 编辑器取消回调 */
  onCanceled?: () => void

  /**
   * 在发送 init 前等待 iframe 加载完成。
   * 设为 true 时监听 iframe 的 load 事件后再发送。
   * 默认 false（由编辑器主动发送 ready 后平台再发送 init）
   */
  waitForLoad?: boolean
}

export function useExecutorEditorBridge(options: ExecutorEditorBridgeOptions) {
  const { iframeRef, surfaceId, onReady, onSaved, onCanceled, waitForLoad } = options
  // config 不使用解构以确保通过延迟求值拿到最新值

  /** 获取当前配置，支持直接对象和 getter 函数两种形式 */
  function getConfig(): Record<string, any> {
    const cfg = options.config
    return typeof cfg === 'function' ? cfg() : (cfg || {})
  }

  /** 构造 init 消息（同时包含 config 对象和 configJson 字符串以兼容两端） */
  function buildInitMsg() {
    const cfg = getConfig()
    return {
      type: 'init',
      surfaceId,
      config: cfg,
      configJson: JSON.stringify(cfg),
    }
  }

  function postToEditor(msg: Record<string, any>) {
    const iframe = iframeRef.value
    if (!iframe?.contentWindow) {
      console.warn('[ExecutorEditorBridge] iframe 未就绪，无法发送消息')
      return
    }
    iframe.contentWindow.postMessage(msg, '*')
  }

  function handleMessage(event: MessageEvent) {
    // 仅处理来自 iframe 内的消息
    const iframe = iframeRef.value
    if (iframe && event.source !== iframe.contentWindow) return

    const { type, ...payload } = event.data || {}

    switch (type) {
      case 'ready':
        // 非 waitForLoad 模式：编辑器主动 ready，平台回复 init
        if (!waitForLoad) {
          postToEditor(buildInitMsg())
        }
        // waitForLoad 模式下，init() 已发过 init，不再重复
        onReady?.()
        break

      case 'saved': {
        // 编辑器保存 → 平台接收配置
        // 兼容两种格式:
        //   1) config: 已反序列化的配置对象
        //   2) configJson: JSON 字符串（editor/index.html 使用的格式）
        let savedConfig = payload.config
        if (!savedConfig && payload.configJson) {
          try { savedConfig = JSON.parse(payload.configJson) }
          catch { savedConfig = payload.configJson }
        }
        onSaved?.(savedConfig || payload)
        break
      }

      case 'canceled':
        // 编辑器取消
        onCanceled?.()
        break
    }
  }

  function init() {
    const iframe = iframeRef.value
    if (!iframe) return

    if (waitForLoad) {
      // 如果 iframe 已加载完成（如 v-show 保持存活），立即发送 init
      try {
        if (iframe.contentDocument?.readyState === 'complete') {
          postToEditor(buildInitMsg())
          return
        }
      } catch (_) {
        // 跨域访问 contentDocument 可能抛错，忽略后走 load 事件
      }
      // 等待 load 事件
      iframe.addEventListener('load', () => {
        postToEditor(buildInitMsg())
      })
    }
    // 非 waitForLoad 模式：等待编辑器主动发送 ready
  }

  function save(config: Record<string, any>) {
    postToEditor({ type: 'save', surfaceId, config })
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })

  return { init, save, postToEditor }
}
