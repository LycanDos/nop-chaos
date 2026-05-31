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
  line-height: 1.6;
  word-break: break-word;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin: 8px 0 4px;
    font-weight: 600;
    line-height: 1.3;
  }

  :deep(h1) { font-size: 18px; }
  :deep(h2) { font-size: 16px; }
  :deep(h3) { font-size: 14px; }
  :deep(h4) { font-size: 13px; }
  :deep(h5) { font-size: 12px; }
  :deep(h6) { font-size: 11px; color: #888; }

  :deep(p) {
    margin: 2px 0;
  }

  :deep(strong) {
    font-weight: 600;
  }

  :deep(em) {
    font-style: italic;
  }

  :deep(del) {
    text-decoration: line-through;
    opacity: 0.7;
  }

  :deep(code) {
    background: rgba(0,0,0,0.06);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 12px;
    font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  }

  :deep(pre) {
    margin: 6px 0;
    padding: 10px 12px;
    background: #1e1e1e;
    border-radius: 6px;
    overflow-x: auto;

    code {
      background: transparent;
      padding: 0;
      color: #d4d4d4;
      font-size: 12px;
      line-height: 1.5;
    }
  }

  :deep(blockquote) {
    margin: 6px 0;
    padding: 6px 12px;
    border-left: 3px solid #1890ff;
    background: rgba(24,144,255,0.04);
    color: #555;
  }

  :deep(ul), :deep(ol) {
    margin: 4px 0;
    padding-left: 20px;
  }

  :deep(li) {
    margin: 2px 0;
  }

  :deep(a) {
    color: #1890ff;
    text-decoration: underline;
  }

  :deep(table) {
    margin: 6px 0;
    border-collapse: collapse;
    font-size: 12px;
    width: 100%;
  }

  :deep(th) {
    background: #fafafa;
    font-weight: 600;
    padding: 6px 10px;
    border: 1px solid #e8e8e8;
    text-align: left;
  }

  :deep(td) {
    padding: 4px 10px;
    border: 1px solid #e8e8e8;
  }

  :deep(tr:nth-child(even) td) {
    background: #fafafa;
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid #e8e8e8;
    margin: 8px 0;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 4px;
  }

  :deep(input[type='checkbox']) {
    margin-right: 4px;
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
