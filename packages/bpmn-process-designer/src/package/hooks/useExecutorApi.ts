/**
 * 执行器 API 适配器
 *
 * bpmn-process-designer 是独立库，不直接依赖 @nop-chaos/sdk。
 * 使用方（如 nop-site）通过 ProcessDesigner 的 executorApi prop 注入实际的请求实现。
 *
 * 如果未注入，面板会使用 nopGraphQLAdapter 作为默认实现，
 * 通过 Nop REST 风格 URL（/r/BizModel__method?@selection=...）调用后端。
 */
import { inject, type InjectionKey } from 'vue'
import type {
  ExecutorDefItem,
  ExecutorReleaseItem,
  ExecutorMethodItem,
  MethodSchemaFieldItem,
} from '@/types/executor'

/** 执行器 API 适配器接口 */
export interface ExecutorApiAdapter {
  /** 加载执行器列表 */
  fetchExecutorList: () => Promise<ExecutorDefItem[]>
  /** 加载指定执行器的版本列表 */
  fetchReleaseList: (executorDefId: string) => Promise<ExecutorReleaseItem[]>
  /** 加载指定版本的方法列表 */
  fetchMethodList: (executorReleaseId: string) => Promise<ExecutorMethodItem[]>
  /** 加载指定方法的入参/出参 Schema 字段 */
  fetchMethodSchema: (methodId: string) => Promise<MethodSchemaFieldItem[]>
}

/** provide/inject key */
export const EXECUTOR_API_KEY: InjectionKey<ExecutorApiAdapter> = Symbol('ExecutorApi')

/**
 * 在面板组件中使用：获取注入的 API 适配器，如果未注入则使用默认实现
 */
export function useExecutorApi(): ExecutorApiAdapter {
  const injected = inject(EXECUTOR_API_KEY, null)
  if (injected) return injected
  // 未注入时使用默认的 Nop REST 适配器
  return nopGraphQLAdapter
}

// ============================================================
// 默认的 Nop REST 适配器
// Nop 平台 REST 风格: POST /r/BizModel__method?@selection=field1,field2
// 请求体为 JSON，包含 query 参数（filter、orderBy 等）
// 返回格式: { status: 0, data: { items: [...] } } 或 { status: 0, data: [...] }
// ============================================================

async function nopRestPost(url: string, body?: any): Promise<any> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = await resp.json()
    if (json.status !== undefined && json.status !== 0) {
      console.warn('[ExecutorApi] Nop REST 返回错误:', json.msg || json)
      return null
    }
    // Nop 返回 { status: 0, data: ... }
    return json.data ?? json
  } catch (e) {
    console.warn('[ExecutorApi] 请求失败:', e)
    return null
  }
}

function extractItems(res: any): any[] {
  if (!res) return []
  // findList 返回 { items: [...] } 或直接返回数组
  if (Array.isArray(res)) return res
  if (Array.isArray(res.items)) return res.items
  return []
}

export const nopGraphQLAdapter: ExecutorApiAdapter = {
  async fetchExecutorList() {
    const selection = 'executorDefId,executorCode,executorName,language,status,description,currentReleaseId'
    const res = await nopRestPost(
      `/r/ExecutorDef__findList?@selection=${selection}`,
      {
        query: {
          filter: { $type: 'eq', name: 'status', value: 'enabled' },
        },
      },
    )
    return extractItems(res)
  },

  async fetchReleaseList(executorDefId: string) {
    const selection = 'executorReleaseId,executorDefId,releaseVersion,mainClass,entryType,compatLevel,parseStatus'
    const res = await nopRestPost(
      `/r/ExecutorRelease__findList?@selection=${selection}`,
      {
        query: {
          filter: { $type: 'eq', name: 'executorDefId', value: executorDefId },
          orderBy: [{ name: 'createTime', desc: true }],
        },
      },
    )
    return extractItems(res)
  },

  async fetchMethodList(executorReleaseId: string) {
    const selection = 'methodId,executorReleaseId,methodCode,methodName,methodSignature,returnJavaType,invokeMode,description,rollbackType,methodVersion,versionStatus,compensationMethodId'
    const res = await nopRestPost(
      `/r/ExecutorMethod__findList?@selection=${selection}`,
      {
        query: {
          filter: { $type: 'eq', name: 'executorReleaseId', value: executorReleaseId },
        },
      },
    )
    return extractItems(res)
  },

  async fetchMethodSchema(methodId: string) {
    const selection = 'fieldId,methodId,schemaRole,fieldPath,fieldName,dataType,javaType,required,defaultValue,defaultExpr'
    const res = await nopRestPost(
      `/r/MethodSchemaField__findList?@selection=${selection}`,
      {
        query: {
          filter: { $type: 'eq', name: 'methodId', value: methodId },
          orderBy: [{ name: 'sortNo', desc: false }],
        },
      },
    )
    return extractItems(res)
  },
}
