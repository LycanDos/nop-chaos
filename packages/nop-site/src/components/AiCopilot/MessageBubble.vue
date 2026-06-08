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
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.6;
    word-break: break-word;

    &.user {
      background: @primary-color;
      color: #fff;
      border-bottom-right-radius: 2px;
      box-shadow: 0 2px 8px fade(@primary-color, 25%);

      &::selection,
      *::selection {
        background: #fff;
        color: @primary-color;
      }

      &::-moz-selection,
      *::-moz-selection {
        background: #fff;
        color: @primary-color;
      }
    }

    &.assistant {
      background: @primary-1;
      color: @text-color;
      border-bottom-left-radius: 2px;
      border: 1px solid @border-color-base;
    }

    &.system {
      background: fade(@warning-color, 15%);
      color: @text-color-secondary;
      font-size: 12px;
      border-radius: 6px;
      border: 1px solid fade(@warning-color, 30%);
    }
  }

  &-time {
    font-size: 11px;
    color: @text-color-help-dark;
    margin-top: 4px;
    padding: 0 8px;
  }
}

.copilot-markdown {
  line-height: 1.7;
  word-break: break-word;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin: 12px 0 6px;
    font-weight: 600;
    line-height: 1.4;
    color: @text-color;
  }

  :deep(h1) { font-size: 16px; }
  :deep(h2) { font-size: 15px; }
  :deep(h3) { font-size: 14px; }
  :deep(h4) { font-size: 13px; }
  :deep(h5) { font-size: 12px; }
  :deep(h6) { font-size: 12px; color: @text-color-help-dark; }

  :deep(p) {
    margin: 4px 0;
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
    background: @primary-1;
    color: @primary-color;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  }

  :deep(pre) {
    margin: 8px 0;
    padding: 12px 14px;
    background: #1e1e1e;
    border-radius: 8px;
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
    margin: 8px 0;
    padding: 8px 14px;
    border-left: 3px solid @primary-color;
    background: @primary-1;
    color: @text-color-secondary;
    border-radius: 0 6px 6px 0;
  }

  :deep(ul), :deep(ol) {
    margin: 6px 0;
    padding-left: 20px;
  }

  :deep(li) {
    margin: 3px 0;
  }

  :deep(a) {
    color: @primary-color;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  :deep(table) {
    margin: 8px 0;
    border-collapse: collapse;
    font-size: 12px;
    width: 100%;
    border-radius: 6px;
    overflow: hidden;
  }

  :deep(th) {
    background: @primary-1;
    font-weight: 600;
    padding: 8px 12px;
    border: 1px solid @border-color-base;
    text-align: left;
    color: @text-color;
  }

  :deep(td) {
    padding: 6px 12px;
    border: 1px solid @border-color-base;
    color: @text-color-secondary;
  }

  :deep(tr:nth-child(even) td) {
    background: #fafafa;
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid @border-color-base;
    margin: 12px 0;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 6px;
  }

  :deep(input[type='checkbox']) {
    margin-right: 4px;
    accent-color: @primary-color;
  }
}

.copilot-cursor {
  animation: copilot-blink 0.8s infinite;
  color: @primary-color;
  font-weight: 300;
  font-size: 14px;
}

@keyframes copilot-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.copilot-debug-plan {
  margin-top: 10px;
  padding: 12px;
  background: @primary-1;
  border: 1px solid @primary-3;
  border-radius: 8px;
  font-size: 12px;
  color: @text-color;

  &-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: @primary-color;
    font-size: 13px;
  }

  &-section {
    margin: 6px 0;
    line-height: 1.5;

    strong {
      color: @text-color;
    }

    pre {
      margin: 4px 0;
      padding: 6px 10px;
      background: fade(@primary-color, 6%);
      border-radius: 4px;
      white-space: pre-wrap;
      font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      color: @text-color;
    }
  }
}
</style>
