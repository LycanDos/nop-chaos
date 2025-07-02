declare module 'vue' {
  export interface GlobalComponents {
    Icon: typeof import('@/Icon')['Icon']
    DictTag: typeof import('@/DictTag')['DictTag']
  }
}

export {}
