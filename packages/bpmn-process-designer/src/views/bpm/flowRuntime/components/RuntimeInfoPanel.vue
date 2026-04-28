<template>
  <div class="runtime-info-panel">
    <!-- 无节点选中或节点未执行时，展示实例概览 -->
    <template v-if="!nodeExecution">
      <div class="runtime-info-panel__overview">
        <h3 class="runtime-info-panel__title">流程实例概览</h3>
        <p class="runtime-info-panel__hint">点击已执行节点查看详情</p>
        <div v-if="runtimeData?.instance" class="runtime-info-panel__instance">
          <div class="info-row">
            <span class="info-label">实例 ID</span>
            <span class="info-value">{{ runtimeData.instance.processInstanceId || processInstanceId }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">状态</span>
            <span class="info-value">
              <el-tag :type="instanceStatusType" size="small">{{ instanceStatusLabel }}</el-tag>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">已执行节点</span>
            <span class="info-value">{{ executedNodeCount }} 个</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 节点已执行时，展示运行时详情 -->
    <template v-else>
      <!-- 8.1: 节点基本信息 -->
      <section class="runtime-info-panel__section">
        <h3 class="runtime-info-panel__title">节点信息</h3>
        <div class="info-row">
          <span class="info-label">节点 ID</span>
          <span class="info-value">{{ nodeExecution.nodeId }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">名称</span>
          <span class="info-value">{{ nodeExecution.nodeName || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">类型</span>
          <span class="info-value">{{ nodeExecution.nodeType || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">执行状态</span>
          <span class="info-value">
            <el-tag :type="nodeStatusTagType" size="small">{{ nodeStatusLabel }}</el-tag>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">执行序号</span>
          <span class="info-value">{{ nodeExecution.executionSeq ?? '-' }}</span>
        </div>
      </section>

      <!-- 8.1: 执行时间信息 -->
      <section class="runtime-info-panel__section" v-if="latestLog">
        <h3 class="runtime-info-panel__title">执行时间</h3>
        <div class="info-row">
          <span class="info-label">开始时间</span>
          <span class="info-value">{{ formatTime(latestLog.createTime) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">结束时间</span>
          <span class="info-value">{{ formatTime(latestLog.endTime) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">耗时</span>
          <span class="info-value">{{ computeDuration(latestLog.createTime, latestLog.endTime) }}</span>
        </div>
      </section>

      <!-- 8.1: 方法调用信息 -->
      <section class="runtime-info-panel__section" v-if="latestLog">
        <h3 class="runtime-info-panel__title">方法调用</h3>
        <div class="info-row">
          <span class="info-label">执行器</span>
          <span class="info-value">{{ latestLog.executorName || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">方法名</span>
          <span class="info-value">{{ latestLog.methodName || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">入口类型</span>
          <span class="info-value">
            <el-tag v-if="latestLog.entryType" size="small" type="info">{{ latestLog.entryType }}</el-tag>
            <span v-else>-</span>
          </span>
        </div>
      </section>

      <!-- 8.2: 请求/响应数据折叠展示 -->
      <section class="runtime-info-panel__section" v-if="latestLog">
        <h3 class="runtime-info-panel__title">请求 / 响应数据</h3>
        <!-- 失败时突出显示错误信息 -->
        <div v-if="latestLog.resultStatus === 'failed'" class="runtime-info-panel__error">
          <div class="info-row">
            <span class="info-label">错误码</span>
            <span class="info-value error-text">{{ latestLog.errCode || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">错误信息</span>
            <span class="info-value error-text">{{ latestLog.errMsg || '-' }}</span>
          </div>
        </div>
        <el-collapse v-model="activeCollapse">
          <el-collapse-item title="请求数据 (requestJson)" name="request">
            <pre class="runtime-info-panel__json">{{ formatJson(latestLog.requestJson) }}</pre>
          </el-collapse-item>
          <el-collapse-item title="响应数据 (responseJson)" name="response">
            <pre class="runtime-info-panel__json">{{ formatJson(latestLog.responseJson) }}</pre>
          </el-collapse-item>
        </el-collapse>
      </section>

      <!-- 8.3: 变量快照对比展示 -->
      <section class="runtime-info-panel__section" v-if="varChanges.length > 0">
        <h3 class="runtime-info-panel__title">变量快照对比</h3>
        <el-table :data="varChanges" size="small" border stripe>
          <el-table-column label="变量名" prop="varName" min-width="100" />
          <el-table-column label="执行前值" min-width="100">
            <template #default="{ row }">
              <span :class="{ 'var-changed': row.changeType !== 'unchanged' }">
                {{ row.beforeValue ?? '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="执行后值" min-width="100">
            <template #default="{ row }">
              <span :class="{ 'var-changed': row.changeType !== 'unchanged' }">
                {{ row.afterValue ?? '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="变更类型" width="90" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="row.changeType !== 'unchanged'"
                :type="changeTypeTagType(row.changeType)"
                size="small"
              >
                {{ changeTypeLabel(row.changeType) }}
              </el-tag>
              <span v-else class="text-muted">无变更</span>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <!-- 8.4: 多次执行时间线列表 -->
      <section class="runtime-info-panel__section" v-if="invokeLogs.length > 1">
        <h3 class="runtime-info-panel__title">执行时间线（{{ invokeLogs.length }} 次）</h3>
        <el-timeline>
          <el-timeline-item
            v-for="(log, idx) in invokeLogs"
            :key="idx"
            :type="timelineItemType(log.resultStatus)"
            :timestamp="formatTime(log.createTime)"
            placement="top"
          >
            <div
              class="runtime-info-panel__timeline-item"
              :class="{ 'is-active': expandedLogIndex === idx }"
              @click="toggleLogDetail(idx)"
            >
              <div class="timeline-summary">
                <span class="timeline-seq">第 {{ idx + 1 }} 次</span>
                <el-tag :type="logStatusTagType(log.resultStatus)" size="small">
                  {{ logStatusLabel(log.resultStatus) }}
                </el-tag>
                <span class="timeline-duration">{{ computeDuration(log.createTime, log.endTime) }}</span>
              </div>
              <!-- 展开的详细信息 -->
              <div v-if="expandedLogIndex === idx" class="timeline-detail">
                <div class="info-row">
                  <span class="info-label">执行器</span>
                  <span class="info-value">{{ log.executorName || '-' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">方法名</span>
                  <span class="info-value">{{ log.methodName || '-' }}</span>
                </div>
                <div v-if="log.resultStatus === 'failed'" class="runtime-info-panel__error">
                  <div class="info-row">
                    <span class="info-label">错误码</span>
                    <span class="info-value error-text">{{ log.errCode || '-' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">错误信息</span>
                    <span class="info-value error-text">{{ log.errMsg || '-' }}</span>
                  </div>
                </div>
                <el-collapse v-model="timelineCollapse">
                  <el-collapse-item title="请求数据" :name="'req-' + idx">
                    <pre class="runtime-info-panel__json">{{ formatJson(log.requestJson) }}</pre>
                  </el-collapse-item>
                  <el-collapse-item title="响应数据" :name="'res-' + idx">
                    <pre class="runtime-info-panel__json">{{ formatJson(log.responseJson) }}</pre>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </section>
    </template>
  </div>
</template>

<script lang="ts" setup>
/**
 * 运行时信息面板组件
 * 展示节点执行详情、请求/响应数据、变量快照对比、多次执行时间线
 */
import { computed, ref } from 'vue'

const props = defineProps<{
  /** 当前选中的节点 ID */
  nodeId: string | null
  /** 流程实例 ID */
  processInstanceId: string
  /** 完整运行时数据（来自 loadFlowInstanceRuntime） */
  runtimeData: any
}>()

/** 折叠面板激活项 */
const activeCollapse = ref<string[]>([])
/** 时间线中展开的日志索引 */
const expandedLogIndex = ref<number | null>(null)
/** 时间线内折叠面板激活项 */
const timelineCollapse = ref<string[]>([])

// ========== 计算属性 ==========

/** 当前选中节点的执行信息 */
const nodeExecution = computed(() => {
  if (!props.nodeId || !props.runtimeData?.nodeExecutions) return null
  return props.runtimeData.nodeExecutions.find((n: any) => n.nodeId === props.nodeId) || null
})

/** 当前节点的所有调用日志 */
const invokeLogs = computed<any[]>(() => {
  if (!nodeExecution.value?.invokeLogs) return []
  // 按 createTime 排序
  return [...nodeExecution.value.invokeLogs].sort(
    (a: any, b: any) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
  )
})

/** 最新一条调用日志（用于单次执行展示） */
const latestLog = computed(() => {
  if (invokeLogs.value.length === 0) return null
  return invokeLogs.value[invokeLogs.value.length - 1]
})

/** 已执行节点数量 */
const executedNodeCount = computed(() => {
  return props.runtimeData?.nodeExecutions?.length || 0
})

/** 实例状态标签类型 */
const instanceStatusType = computed(() => {
  const status = props.runtimeData?.instance?.status
  return statusToTagType(status)
})

/** 实例状态文本 */
const instanceStatusLabel = computed(() => {
  const status = props.runtimeData?.instance?.status
  return statusToLabel(status)
})

/** 节点状态标签类型 */
const nodeStatusTagType = computed(() => {
  return statusToTagType(nodeExecution.value?.status)
})

/** 节点状态文本 */
const nodeStatusLabel = computed(() => {
  return statusToLabel(nodeExecution.value?.status)
})

/** 变量快照对比数据 */
const varChanges = computed(() => {
  if (!props.nodeId || !props.runtimeData?.varLogs) return []
  // 筛选与当前节点相关的变量日志
  const nodeLogs: any[] = props.runtimeData.varLogs.filter(
    (v: any) => v.nodeId === props.nodeId,
  )
  if (nodeLogs.length === 0) return []

  // 按变量名分组，提取执行前后值
  const varMap = new Map<string, { beforeValue: any; afterValue: any; changeType: string }>()
  for (const log of nodeLogs) {
    const varName = log.varName
    if (!varMap.has(varName)) {
      varMap.set(varName, {
        beforeValue: log.oldValue ?? null,
        afterValue: log.newValue ?? null,
        changeType: deriveChangeType(log.oldValue, log.newValue),
      })
    } else {
      // 多条日志时取最后一条的 newValue 作为 afterValue
      const entry = varMap.get(varName)!
      entry.afterValue = log.newValue ?? null
      entry.changeType = deriveChangeType(entry.beforeValue, entry.afterValue)
    }
  }

  return Array.from(varMap.entries()).map(([varName, data]) => ({
    varName,
    ...data,
  }))
})

// ========== 工具函数 ==========

/** 推导变量变更类型 */
function deriveChangeType(oldVal: any, newVal: any): string {
  if (oldVal == null && newVal != null) return 'added'
  if (oldVal != null && newVal == null) return 'deleted'
  if (oldVal != null && newVal != null && JSON.stringify(oldVal) !== JSON.stringify(newVal)) return 'modified'
  return 'unchanged'
}

/** 状态 → ElTag type 映射 */
function statusToTagType(status: string | undefined): string {
  const map: Record<string, string> = {
    completed: 'success',
    running: '',
    failed: 'danger',
    rolled_back: 'info',
    suspended: 'warning',
  }
  return map[status || ''] || 'info'
}

/** 状态 → 中文文本映射 */
function statusToLabel(status: string | undefined): string {
  const map: Record<string, string> = {
    completed: '已完成',
    running: '运行中',
    failed: '失败',
    rolled_back: '已回退',
    suspended: '已挂起',
    pending: '未执行',
  }
  return map[status || ''] || status || '未知'
}

/** 变更类型 → ElTag type */
function changeTypeTagType(type: string): string {
  const map: Record<string, string> = { added: 'success', modified: 'warning', deleted: 'danger' }
  return map[type] || 'info'
}

/** 变更类型 → 中文文本 */
function changeTypeLabel(type: string): string {
  const map: Record<string, string> = { added: '新增', modified: '修改', deleted: '删除' }
  return map[type] || type
}

/** 日志状态 → ElTag type */
function logStatusTagType(status: string): string {
  return statusToTagType(status)
}

/** 日志状态 → 中文文本 */
function logStatusLabel(status: string): string {
  return statusToLabel(status)
}

/** 时间线节点类型 */
function timelineItemType(status: string): string {
  const map: Record<string, string> = {
    success: 'success',
    completed: 'success',
    failed: 'danger',
    running: 'primary',
    async_pending: 'primary',
  }
  return map[status] || 'info'
}

/** 格式化时间 */
function formatTime(time: string | number | null | undefined): string {
  if (!time) return '-'
  const d = new Date(time)
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 计算耗时 */
function computeDuration(start: any, end: any): string {
  if (!start || !end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (isNaN(ms) || ms < 0) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

/** 格式化 JSON 数据 */
function formatJson(json: any): string {
  if (!json) return '(无数据)'
  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(json)
  }
}

/** 切换时间线日志详情展开/收起 */
function toggleLogDetail(idx: number) {
  expandedLogIndex.value = expandedLogIndex.value === idx ? null : idx
  timelineCollapse.value = []
}
</script>

<style scoped>
.runtime-info-panel {
  font-size: 13px;
  color: #303133;
}

.runtime-info-panel__title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.runtime-info-panel__section {
  margin-bottom: 20px;
}

.runtime-info-panel__overview {
  text-align: center;
  padding-top: 20px;
}

.runtime-info-panel__hint {
  color: #909399;
  font-size: 13px;
  margin-bottom: 16px;
}

.runtime-info-panel__instance {
  text-align: left;
  margin-top: 16px;
}

/* 信息行 */
.info-row {
  display: flex;
  align-items: flex-start;
  padding: 4px 0;
  line-height: 1.6;
}

.info-label {
  flex-shrink: 0;
  width: 80px;
  color: #909399;
  font-size: 12px;
}

.info-value {
  flex: 1;
  word-break: break-all;
  font-size: 13px;
}

/* 错误信息高亮 */
.runtime-info-panel__error {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  padding: 8px 10px;
  margin-bottom: 8px;
}

.error-text {
  color: #f56c6c;
  font-weight: 500;
}

/* JSON 代码块 */
.runtime-info-panel__json {
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  margin: 0;
  font-family: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
  color: #303133;
}

/* 变量变更高亮 */
.var-changed {
  color: #e6a23c;
  font-weight: 500;
}

.text-muted {
  color: #c0c4cc;
  font-size: 12px;
}

/* 时间线项 */
.runtime-info-panel__timeline-item {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.runtime-info-panel__timeline-item:hover {
  background: #f5f7fa;
}

.runtime-info-panel__timeline-item.is-active {
  background: #f0f5ff;
}

.timeline-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-seq {
  font-weight: 500;
  font-size: 13px;
}

.timeline-duration {
  color: #909399;
  font-size: 12px;
  margin-left: auto;
}

.timeline-detail {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #ebeef5;
}
</style>
