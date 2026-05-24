<template>
  <div :class="['copilot-bubble', `copilot-bubble-${message.role}`]">
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="copilot-bubble-content user">
      {{ message.content }}
    </div>

    <!-- 系统消息 -->
    <div v-else-if="message.role === 'system'" class="copilot-bubble-content system">
      {{ message.content }}
    </div>

    <!-- AI 助手消息 -->
    <div v-else class="copilot-bubble-content assistant">
      <!-- Markdown 渲染的内容 -->
      <div v-if="message.content" class="copilot-markdown" v-html="renderedContent" />

      <!-- 流式内容指示 -->
      <span v-if="message.isStreaming" class="copilot-cursor">|</span>

      <!-- 调试执行计划 -->
      <div v-if="message.debugPlan" class="copilot-debug-plan">
        <div class="copilot-debug-title">执行计划</div>
        <div class="copilot-debug-section">
          <strong>意图匹配:</strong> {{ message.debugPlan.intentMatch }}
        </div>
        <div class="copilot-debug-section">
          <strong>权限检查:</strong> {{ message.debugPlan.permissionCheck }}
        </div>
        <div class="copilot-debug-section">
          <strong>执行步骤:</strong>
          <pre>{{ message.debugPlan.executionSteps }}</pre>
        </div>
        <div class="copilot-debug-section">
          <strong>预期结果:</strong> {{ message.debugPlan.expectedOutcome }}
        </div>
      </div>
    </div>

    <!-- 时间戳 -->
    <div class="copilot-bubble-time">
      {{ formatTime(message.timestamp) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CopilotMessage } from './types'
import { renderCopilotMessageContent } from './message-format'

const props = defineProps<{
  message: CopilotMessage
}>()

const renderedContent = computed(() => {
  return renderCopilotMessageContent(props.message.content)
})

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style lang="less" scoped>
.copilot-bubble {
  display: flex;
  flex-direction: column;
  max-width: 85%;

  &-user { align-self: flex-end; }
  &-assistant { align-self: flex-start; }
  &-system { align-self: center; }

  &-content {
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-word;

    &.user {
      background: #1890ff;
      color: #fff;
      border-bottom-right-radius: 3px;
    }

    &.assistant {
      background: #f5f5f5;
      color: #1a1a1a;
      border-bottom-left-radius: 3px;
    }

    &.system {
      background: #fff7e6;
      color: #8c6900;
      font-size: 12px;
      border-radius: 6px;
    }
  }

  &-time {
    font-size: 10px;
    color: #bbb;
    margin-top: 2px;
    padding: 0 8px;
  }
}

.copilot-markdown {
  :deep(code) {
    background: rgba(0,0,0,0.06);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 12px;
  }

  :deep(strong) {
    font-weight: 600;
  }
}

.copilot-cursor {
  animation: blink 0.8s infinite;
  color: #1890ff;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.copilot-debug-plan {
  margin-top: 8px;
  padding: 10px;
  background: #f0f5ff;
  border: 1px solid #adc6ff;
  border-radius: 8px;
  font-size: 12px;
  color: #1d39c4;

  &-title {
    font-weight: 600;
    margin-bottom: 6px;
  }

  &-section {
    margin: 4px 0;

    pre {
      margin: 2px 0;
      padding: 4px 8px;
      background: rgba(0,0,0,0.04);
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 11px;
    }
  }
}
</style>
