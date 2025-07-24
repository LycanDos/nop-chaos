import mitt from 'mitt'
import { onBeforeUnmount } from 'vue';

// 全局唯一emitter
const globalAny = window as any;
if (!globalAny.__global_emitter__) {
  globalAny.__global_emitter__ = mitt();
}
const emitter = globalAny.__global_emitter__;
export { emitter };

interface Option {
  name: string // 事件名称
  callback: Fn // 回调
}

type Fn = (...args: any[]) => any;

export const useEmitt = (option?: Option) => {
  if (option) {
    emitter.on(option.name, option.callback)

    onBeforeUnmount(() => {
      emitter.off(option.name)
    })
  }

  return {
    emitter
  }
}
