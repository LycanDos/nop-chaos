<template>
  <div class="runtime-detail-panel" :class="{ collapsed: !visible }">
    <div v-if="visible" class="detail-panel-content">
      <div class="detail-panel-header">
        <span class="detail-panel-title">节点详情</span>
        <el-button text size="small" @click="$emit('close')">
          <template #icon><el-icon><Close /></el-icon></template>
        </el-button>
      </div>

      <template v-if="stepInfo">
        <div class="detail-node-title">
          <span class="detail-node-name">{{ stepInfo.displayName }}</span>
          <el-tag :type="statusTagType(stepInfo.status)" size="small" effect="dark">
            {{ statusLabel(stepInfo.status) }}
          </el-tag>
        </div>

        <el-tabs v-model="activeTab" class="detail-tabs">
          <el-tab-pane label="基本信息" name="basic">
            <div class="detail-section">
              <div class="detail-row">
                <span class="detail-label">节点类型</span>
                <span class="detail-value">{{ stepTypeLabel(stepInfo.stepType) }}</span>
              </div>
              <div v-if="stepInfo.actorName" class="detail-row">
                <span class="detail-label">处理人</span>
                <span class="detail-value">{{ stepInfo.actorName }}</span>
              </div>
              <div v-if="stepInfo.startTime" class="detail-row">
                <span class="detail-label">到达时间</span>
                <span class="detail-value">{{ stepInfo.startTime }}</span>
              </div>
              <div v-if="stepInfo.endTime" class="detail-row">
                <span class="detail-label">完成时间</span>
                <span class="detail-value">{{ stepInfo.endTime }}</span>
              </div>
              <div v-if="stepInfo.execIndex !== undefined" class="detail-row">
                <span class="detail-label">执行序号</span>
                <span class="detail-value">#{{ stepInfo.execIndex + 1 }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">元素 ID</span>
                <span class="detail-value code">{{ stepInfo.elementId }}</span>
              </div>
              <div v-if="stepInfo.stepId" class="detail-row">
                <span class="detail-label">步骤 ID</span>
                <span class="detail-value code">{{ stepInfo.stepId }}</span>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="动作历史" name="actions">
            <div v-if="stepInfo.actions.length > 0" class="detail-section">
              <div v-for="(action, idx) in stepInfo.actions" :key="idx" class="action-item">
                <div class="action-header">
                  <el-tag size="small" type="primary">{{ action.actionName }}</el-tag>
                  <span class="action-actor">{{ action.actorName }}</span>
                  <span class="action-time">{{ action.actionTime }}</span>
                </div>
                <div v-if="action.comment" class="action-comment">
                  {{ action.comment }}
                </div>
              </div>
            </div>
            <div v-else class="empty-state">暂无动作记录</div>
          </el-tab-pane>

          <el-tab-pane label="日志" name="logs">
            <div v-if="stepInfo.logs.length > 0" class="detail-section log-section">
              <div v-for="(log, idx) in stepInfo.logs" :key="idx" class="log-item">
                <span class="log-level" :class="logLevelClass(log.logLevel)">{{ log.logLevel }}</span>
                <span class="log-time">{{ log.logTime }}</span>
                <span class="log-content">{{ log.logContent }}</span>
              </div>
            </div>
            <div v-else class="empty-state">暂无日志记录</div>
          </el-tab-pane>
        </el-tabs>
      </template>

      <div v-else class="detail-empty">
        <el-icon :size="48" color="#d9d9d9"><InfoFilled /></el-icon>
        <p>请点击节点查看详情</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Close, InfoFilled } from '@element-plus/icons-vue'
import type { StepRuntimeInfo } from './RuntimeDataProvider'

const props = defineProps<{
  visible: boolean
  stepInfo: StepRuntimeInfo | null
}>()

defineEmits<{
  close: []
}>()

const activeTab = ref('basic')

// 切换节点时重置到第一个 tab
watch(() => props.stepInfo, () => {
  activeTab.value = 'basic'
})

function statusTagType(status: string) {
  switch (status) {
    case 'completed': return 'success'
    case 'active': return 'primary'
    case 'failed': return 'danger'
    case 'rejected': return 'warning'
    case 'killed': return 'info'
    default: return 'info'
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: '已完成',
    active: '执行中',
    failed: '失败',
    rejected: '已驳回',
    killed: '已终止',
  }
  return map[status] || status
}

function stepTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    startEvent: '开始事件',
    endEvent: '结束事件',
    userTask: '用户任务',
    serviceTask: '服务任务',
    scriptTask: '脚本任务',
    callActivity: '调用活动',
    exclusiveGateway: '排他网关',
    parallelGateway: '并行网关',
    inclusiveGateway: '包容网关',
  }
  return map[type || ''] || type || '未知'
}

function logLevelClass(level: string): string {
  const lower = (level || '').toLowerCase()
  if (lower === 'error' || lower === 'warn') return 'is-warn'
  return 'is-info'
}
</script>

<style scoped>
.runtime-detail-panel {
  width: 0;
  overflow: hidden;
  transition: width 0.25s ease;
  background: #fff;
  border-left: 1px solid #e8e8e8;
  flex-shrink: 0;
}
.runtime-detail-panel.collapsed {
  width: 0 !important;
  min-width: 0 !important;
  border-left: none;
}
.runtime-detail-panel:not(.collapsed) {
  width: 360px;
  min-width: 360px;
}
.detail-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.detail-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-panel-title {
  font-weight: 600;
  font-size: 14px;
}
.detail-node-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-node-name {
  font-weight: 600;
  font-size: 15px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-tabs {
  flex: 1;
  overflow: auto;
  padding: 0 16px;
}
.detail-section {
  padding: 8px 0;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px dashed #f5f5f5;
}
.detail-label {
  color: #999;
  flex-shrink: 0;
}
.detail-value {
  color: #333;
  text-align: right;
  margin-left: 16px;
}
.detail-value.code {
  font-family: monospace;
  font-size: 12px;
  color: #666;
}
.action-item {
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.action-item:last-child {
  border-bottom: none;
}
.action-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.action-actor {
  color: #666;
  font-size: 12px;
}
.action-time {
  color: #999;
  font-size: 11px;
  margin-left: auto;
}
.action-comment {
  margin-top: 4px;
  font-size: 12px;
  color: #666;
  padding-left: 4px;
}
.log-section {
  max-height: 100%;
}
.log-item {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  line-height: 1.5;
}
.log-level {
  flex-shrink: 0;
  font-weight: 600;
  width: 36px;
}
.log-level.is-warn { color: #faad14; }
.log-level.is-info { color: #1890ff; }
.log-time {
  flex-shrink: 0;
  color: #999;
  white-space: nowrap;
}
.log-content {
  color: #333;
  word-break: break-all;
}
.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #999;
  gap: 12px;
}
.empty-state {
  text-align: center;
  color: #999;
  padding: 24px 0;
  font-size: 13px;
}
</style>
