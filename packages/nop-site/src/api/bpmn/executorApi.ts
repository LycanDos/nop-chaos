/**
 * 执行器 API 适配器 - nop-site 实现
 *
 * 通过 @nop-chaos/sdk 的 ajaxRequest 调用 Nop REST 后端。
 * Nop REST 风格: /r/BizModel__method?@selection=field1,field2
 *
 * 传入 bpmn-process-designer 的 ProcessDesigner 组件作为 executorApi prop。
 */
import { ajaxRequest } from '@nop-chaos/sdk'
import type { ExecutorApiAdapter } from 'bpmn-process-designer'

function extractItems(res: any): any[] {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.items)) return res.items
  return []
}

export const nopSiteExecutorApi: ExecutorApiAdapter = {
  async fetchExecutorList() {
    try {
      const res = await ajaxRequest({
        url: '/r/ExecutorDef__findList?@selection=executorDefId,executorCode,executorName,language,status,description,currentReleaseId',
        data: {
          query: {
            filter: { $type: 'eq', name: 'status', value: 'enabled' },
          },
        },
      })
      return extractItems(res)
    } catch (e) {
      console.warn('[nopSiteExecutorApi] fetchExecutorList 失败:', e)
      return []
    }
  },

  async fetchReleaseList(executorDefId: string) {
    try {
      const res = await ajaxRequest({
        url: '/r/ExecutorRelease__findList?@selection=executorReleaseId,executorDefId,releaseVersion,mainClass,entryType,compatLevel,parseStatus',
        data: {
          query: {
            filter: { $type: 'eq', name: 'executorDefId', value: executorDefId },
            orderBy: [{ name: 'createTime', desc: true }],
          },
        },
      })
      return extractItems(res)
    } catch (e) {
      console.warn('[nopSiteExecutorApi] fetchReleaseList 失败:', e)
      return []
    }
  },

  async fetchMethodList(executorReleaseId: string) {
    try {
      const res = await ajaxRequest({
        url: '/r/ExecutorMethod__findList?@selection=methodId,executorReleaseId,methodCode,methodName,methodSignature,returnJavaType,invokeMode,description,rollbackType,methodVersion,versionStatus,compensationMethodId',
        data: {
          query: {
            filter: { $type: 'eq', name: 'executorReleaseId', value: executorReleaseId },
          },
        },
      })
      return extractItems(res)
    } catch (e) {
      console.warn('[nopSiteExecutorApi] fetchMethodList 失败:', e)
      return []
    }
  },

  async fetchMethodSchema(methodId: string) {
    try {
      const res = await ajaxRequest({
        url: '/r/MethodSchemaField__findList?@selection=fieldId,methodId,schemaRole,fieldPath,fieldName,dataType,javaType,required,defaultValue,defaultExpr',
        data: {
          query: {
            filter: { $type: 'eq', name: 'methodId', value: methodId },
            orderBy: [{ name: 'sortNo', desc: false }],
          },
        },
      })
      return extractItems(res)
    } catch (e) {
      console.warn('[nopSiteExecutorApi] fetchMethodSchema 失败:', e)
      return []
    }
  },
}
