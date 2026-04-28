<template>
  <div class="delta-variable-pool">
    <!-- 标题区域 -->
    <div class="delta-variable-pool__header">
      <span class="delta-variable-pool__title">Delta 变量池</span>
      <el-tag v-if="mode === 'runtime'" size="small" type="warning">运行时</el-tag>
      <el-tag v-else size="small" type="info">设计</el-tag>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="delta-variable-pool__loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载变量规则中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="varAccessList.length === 0" class="delta-variable-pool__empty">
      <span>暂无变量访问规则</span>
    </div>

    <!-- 变量规则展示 -->
    <template v-else>
      <!-- 读取变量 (READ) -->
      <div class="delta-variable-pool__section">
        <div class="delta-variable-pool__section-title">
          <span>📖 读取变量 (READ)</span>
          <el-tag size="small" type="info">{{ readVars.length }}</el-tag>
        </div>
        <div v-if="readVars.length === 0" class="delta-variable-pool__section-empty">
          无读取变量
        </div>
        <div
          v-for="item in readVars"
          :key="item.varAccessId"
          class="delta-variable-pool__var-item"
        >
          <div class="delta-variable-pool__var-main">
            <span class="delta-variable-pool__var-name">{{ item.varName }}</span>
            <span class="delta-variable-pool__var-arrow">←</span>
            <span class="delta-variable-pool__var-expr">{{ item.mappingExpr || '(无映射)' }}</span>
          </div>
          <div v-if="item.defaultValue" class="delta-variable-pool__var-default">
            默认值: {{ item.defaultValue }}
          </div>
        </div>
      </div>

      <!-- 写入变量 (WRITE) -->
      <div class="delta-variable-pool__section">
        <div class="delta-variable-pool__section-title">
          <span>✏️ 写入变量 (WRITE)</span>
          <el-tag size="small" type="warning">{{ writeVars.length }}</el-tag>
        </div>
        <div v-if="writeVars.length === 0" class="delta-variable-pool__section-empty">
          无写入变量
        </div>
        <div
          v-for="item in writeVars"
          :key="item.varAccessId"
          class="delta-variable-pool__var-item"
        >
          <div class="delta-variable-pool__var-main">
            <span class="delta-variable-pool__var-name">{{ item.varName }}</span>
            <span class="delta-variable-pool__var-arrow">→</span>
            <span class="delta-variable-pool__var-expr">{{ item.mappingExpr || '(无映射)' }}</span>
          </div>
          <div v-if="item.defaultValue" class="delta-variable-pool__var-default">
            默认值: {{ item.defaultValue }}
          </div>
          <!-- 运行时模式：展示当前值和最近变更时间 -->
          <template v-if="mode === 'runtime' && runtimeVarMap[item.varName]">
            <div class="delta-variable-pool__var-runtime">
              当前值: {{ runtimeVarMap[item.varName].currentValue ?? '(空)' }}
            </div>
            <div v-if="runtimeVarMap[item.varName].lastChangeTime" class="delta-variable-pool__var-runtime">
              最近变更: {{ runtimeVarMap[item.varName].lastChangeTime }}
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { Loading } from '@element-plus/icons-vue'
import request from '@/config/axios'

defineOptions({ name: 'DeltaVariablePool' })

/** BindingVarAccess 数据类型 */
interface BindingVarAccessItem {
  varAccessId: string
  bindingId: string
  varName: string
  accessType: 'READ' | 'WRITE'
  mappingExpr: string
  defaultValue: string
}

/** FlowInstanceVar 数据类型 */
interface FlowInstanceVarItem {
  instanceVarId: string
  processInstanceId: string
  varName: string
  varValue: string
  varType: string
}

/** FlowVarLog 数据类型 */
interface FlowVarLogItem {
  varLogId: string
  processInstanceId: string
  varName: string
  oldValue: string
  newValue: string
  createTime: string
  nodeId: string
}

/** 运行时变量信息 */
interface RuntimeVarInfo {
  currentValue: string | null
  lastChangeTime: string | null
}

const props = defineProps({
  /** ActivityMethodBinding ID，用于查询 BindingVarAccess */
  bindingId: {
    type: String,
    required: true,
  },
  /** 可选，运行时模式下传入，用于查询 FlowInstanceVar 当前值 */
  processInstanceId: {
    type: String,
    default: '',
  },
  /** 设计模式只展示规则，运行时模式额外展示当前值和变更历史 */
  mode: {
    type: String as () => 'design' | 'runtime',
    default: 'design',
  },
})

/** 变量访问规则列表 */
const varAccessList = ref<BindingVarAccessItem[]>([])

/** 加载状态 */
const loading = ref(false)

/** 按 READ 类型过滤 */
const readVars = computed(() =>
  varAccessList.value.filter((item) => item.accessType === 'READ')
)

/** 按 WRITE 类型过滤 */
const writeVars = computed(() =>
  varAccessList.value.filter((item) => item.accessType === 'WRITE')
)

/** 运行时变量当前值列表 */
const instanceVarList = ref<FlowInstanceVarItem[]>([])

/** 运行时变量变更日志列表 */
const varLogList = ref<FlowVarLogItem[]>([])

/**
 * 运行时变量映射：varName → { currentValue, lastChangeTime }
 * 合并 FlowInstanceVar 当前值和 FlowVarLog 最近变更时间
 */
const runtimeVarMap = computed<Record<string, RuntimeVarInfo>>(() => {
  const map: Record<string, RuntimeVarInfo> = {}

  // 从 FlowInstanceVar 获取当前值
  for (const item of instanceVarList.value) {
    map[item.varName] = {
      currentValue: item.varValue,
      lastChangeTime: null,
    }
  }

  // 从 FlowVarLog 获取最近变更时间（列表已按 createTime desc 排序，取每个变量的第一条）
  for (const log of varLogList.value) {
    if (map[log.varName]) {
      // 仅取第一条（最近的）
      if (!map[log.varName].lastChangeTime) {
        map[log.varName].lastChangeTime = log.createTime
      }
    } else {
      map[log.varName] = {
        currentValue: null,
        lastChangeTime: log.createTime,
      }
    }
  }

  return map
})

/**
 * 通过 GraphQL 查询 BindingVarAccess 列表
 * 按 bindingId 过滤
 */
async function loadVarAccessList() {
  if (!props.bindingId) {
    varAccessList.value = []
    return
  }

  loading.value = true
  try {
    const res = await request.post({
      url: '/graphql',
      data: {
        query: `query($filter: Map) {
          BindingVarAccess__findList(filter: $filter) {
            varAccessId
            bindingId
            varName
            accessType
            mappingExpr
            defaultValue
          }
        }`,
        variables: {
          filter: {
            $type: 'eq',
            name: 'bindingId',
            value: props.bindingId,
          },
        },
      },
    })
    const list = res?.BindingVarAccess__findList || res || []
    varAccessList.value = Array.isArray(list) ? list : []
  } catch (err) {
    console.warn('[DeltaVariablePool] 加载变量访问规则失败:', err)
    varAccessList.value = []
  } finally {
    loading.value = false
  }
}

// 监听 bindingId 变化，重新加载变量访问规则
watch(
  () => props.bindingId,
  () => {
    loadVarAccessList()
  },
  { immediate: true }
)

// 监听 bindingId 和 processInstanceId 变化，重新加载运行时数据
watch(
  [() => props.bindingId, () => props.processInstanceId],
  () => {
    loadRuntimeVarData()
  },
  { immediate: true }
)

/**
 * 加载运行时变量数据
 * 仅在 mode === 'runtime' 且 processInstanceId 有值时执行
 * 查询 FlowInstanceVar 当前值和 FlowVarLog 最近变更记录
 */
async function loadRuntimeVarData() {
  if (props.mode !== 'runtime' || !props.processInstanceId) {
    instanceVarList.value = []
    varLogList.value = []
    return
  }

  try {
    // 并行查询 FlowInstanceVar 和 FlowVarLog
    const [varRes, logRes] = await Promise.all([
      request.post({
        url: '/graphql',
        data: {
          query: `query($filter: Map) {
            FlowInstanceVar__findList(filter: $filter) {
              instanceVarId
              processInstanceId
              varName
              varValue
              varType
            }
          }`,
          variables: {
            filter: {
              $type: 'eq',
              name: 'processInstanceId',
              value: props.processInstanceId,
            },
          },
        },
      }),
      request.post({
        url: '/graphql',
        data: {
          query: `query($filter: Map, $orderBy: [OrderFieldBean]) {
            FlowVarLog__findList(filter: $filter, orderBy: $orderBy) {
              varLogId
              processInstanceId
              varName
              oldValue
              newValue
              createTime
              nodeId
            }
          }`,
          variables: {
            filter: {
              $type: 'eq',
              name: 'processInstanceId',
              value: props.processInstanceId,
            },
            orderBy: [{ name: 'createTime', desc: true }],
          },
        },
      }),
    ])

    const vars = varRes?.FlowInstanceVar__findList || varRes || []
    instanceVarList.value = Array.isArray(vars) ? vars : []

    const logs = logRes?.FlowVarLog__findList || logRes || []
    varLogList.value = Array.isArray(logs) ? logs : []
  } catch (err) {
    console.warn('[DeltaVariablePool] 加载运行时变量数据失败:', err)
    instanceVarList.value = []
    varLogList.value = []
  }
}
</script>

<style lang="scss" scoped>
.delta-variable-pool {
  box-sizing: border-box;
  background: #fff;
}

.delta-variable-pool__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.delta-variable-pool__title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.delta-variable-pool__loading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px;
  color: #909399;
  font-size: 13px;
}

.delta-variable-pool__empty {
  padding: 16px;
  color: #909399;
  font-size: 13px;
  text-align: center;
}

.delta-variable-pool__section {
  padding: 8px 16px 12px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.delta-variable-pool__section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.delta-variable-pool__section-empty {
  font-size: 12px;
  color: #c0c4cc;
  padding: 4px 0;
}

.delta-variable-pool__var-item {
  padding: 6px 0 6px 12px;
  border-left: 2px solid #e4e7ed;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }
}

.delta-variable-pool__var-main {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.delta-variable-pool__var-name {
  font-weight: 500;
  color: #303133;
}

.delta-variable-pool__var-arrow {
  color: #909399;
  flex-shrink: 0;
}

.delta-variable-pool__var-expr {
  color: #606266;
  font-family: 'Menlo', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delta-variable-pool__var-default {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.delta-variable-pool__var-runtime {
  font-size: 11px;
  color: #e6a23c;
  margin-top: 2px;
}
</style>
