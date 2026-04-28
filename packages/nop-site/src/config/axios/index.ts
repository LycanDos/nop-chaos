import { ajaxRequest } from '@nop-chaos/sdk'

/**
 * 兼容 bpmn-process-designer 的 request 封装
 * 将请求代理到 nop-site 的 ajaxRequest
 */
const request = {
  get: async <T = any>(option: any) => {
    const res = await ajaxRequest({ url: option.url, method: 'GET', data: option.params || option.data })
    return res as unknown as T
  },
  post: async <T = any>(option: any) => {
    const res = await ajaxRequest({ url: option.url, method: 'POST', data: option.data })
    return res as unknown as T
  },
  postOriginal: async (option: any) => {
    return await ajaxRequest({ url: option.url, method: 'POST', data: option.data })
  },
  delete: async <T = any>(option: any) => {
    const res = await ajaxRequest({ url: option.url, method: 'DELETE', data: option.data })
    return res as unknown as T
  },
  put: async <T = any>(option: any) => {
    const res = await ajaxRequest({ url: option.url, method: 'PUT', data: option.data })
    return res as unknown as T
  },
  download: async <T = any>(option: any) => {
    const res = await ajaxRequest({ url: option.url, method: 'GET', data: option.data })
    return res as unknown as Promise<T>
  },
  upload: async <T = any>(option: any) => {
    const res = await ajaxRequest({ url: option.url, method: 'POST', data: option.data })
    return res as unknown as Promise<T>
  }
}

export default request
