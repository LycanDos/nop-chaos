/**
 * 事件总线 hook（原来从 bpmn-process-designer 导入，现在本地实现）
 * 基于 nop-site 已有的 mitt 工具
 */
import mitt from '/@/utils/mitt'
import { onBeforeUnmount } from 'vue'

const emitter = mitt()

if (typeof window !== 'undefined') {
  ;(window as any).__emitter__ = emitter
}

interface UseEmittOptions {
  name: string
  callback: (...args: any[]) => void
}

export function useEmitt(options?: UseEmittOptions) {
  if (options) {
    const { name, callback } = options
    emitter.on(name, callback)
    onBeforeUnmount(() => {
      emitter.off(name, callback)
    })
  }

  return {
    emitter,
    emit: (name: string, ...args: any[]) => {
      emitter.emit(name, args.length === 1 ? args[0] : args)
    },
    on: (name: string, callback: (...args: any[]) => void) => {
      emitter.on(name, callback)
    },
    off: (name: string, callback: (...args: any[]) => void) => {
      emitter.off(name, callback)
    },
  }
}
