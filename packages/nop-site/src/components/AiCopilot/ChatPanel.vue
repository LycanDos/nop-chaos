<template>
  <div class="copilot-chat-panel">
    <!-- 消息列表 -->
    <div ref="msgListRef" class="copilot-messages">
      <div v-if="messages.length === 0" class="copilot-empty">
        <p>有什么可以帮助你的？</p>
        <p class="copilot-hint">试试输入你想做的事情，比如：</p>
        <ul>
          <li>"帮我创建一个下单流程"</li>
          <li>"当前流程如何流转的"</li>
          <li>"检查集群选举配置有没有问题"</li>
        </ul>
      </div>

      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />

      <!-- 确认卡片 -->
      <div v-if="pendingConfirm" class="copilot-confirm-card">
        <div class="copilot-confirm-text">{{ pendingConfirm.instruction?.message || '确认执行此操作？' }}</div>
        <div class="copilot-confirm-actions">
          <button
            class="copilot-confirm-btn confirm"
            @click="$emit('confirm')"
          >
            确认执行
          </button>
          <button
            class="copilot-confirm-btn cancel"
            @click="$emit('cancel')"
          >
            取消
          </button>
        </div>
      </div>

      <!-- 加载指示器 -->
      <div v-if="loading" class="copilot-typing">
        <span class="copilot-typing-dot" />
        <span class="copilot-typing-dot" />
        <span class="copilot-typing-dot" />
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="copilot-input-area">
      <textarea
        ref="inputRef"
        v-model="inputText"
        class="copilot-input"
        :placeholder="'输入你想做的事情...'"
        rows="1"
        :disabled="loading"
        @keydown.enter.exact.prevent="sendMessage"
        @input="autoResize"
      />
      <button
        class="copilot-send-btn"
        :disabled="!inputText.trim() || loading"
        @click="sendMessage"
      >
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import MessageBubble from './MessageBubble.vue'
import type { CopilotMessage, ConfirmAction } from './types'
import type { ConfirmPending } from './useCopilotStore'

const props = defineProps<{
  messages: CopilotMessage[]
  loading: boolean
  pendingConfirm: ConfirmPending | null
}>()

const emit = defineEmits<{
  send: [message: string]
  confirm: []
  cancel: []
}>()

const inputText = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const msgListRef = ref<HTMLDivElement | null>(null)

function focusInput(): void {
  nextTick(() => {
    inputRef.value?.focus()
  })
}

defineExpose({ focusInput })

function sendMessage(): void {
  const text = inputText.value.trim()
  if (!text || props.loading) return
  emit('send', text)
  inputText.value = ''
  autoResize()
}

function autoResize(): void {
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.style.height = 'auto'
      inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 100) + 'px'
    }
  })
}

// 自动滚动到底部
watch(
  () => props.messages.length,
  () => {
    nextTick(() => {
      if (msgListRef.value) {
        msgListRef.value.scrollTop = msgListRef.value.scrollHeight
      }
    })
  },
)

// 监听流式内容更新
watch(
  () => props.messages,
  () => {
    nextTick(() => {
      if (msgListRef.value) {
        const atBottom =
          msgListRef.value.scrollTop + msgListRef.value.clientHeight >=
          msgListRef.value.scrollHeight - 50
        if (atBottom) {
          msgListRef.value.scrollTop = msgListRef.value.scrollHeight
        }
      }
    })
  },
  { deep: true },
)
</script>

<style lang="less" scoped>
.copilot-chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.copilot-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.copilot-empty {
  text-align: center;
  color: @text-color-help-dark;
  margin-top: 48px;

  p { margin: 4px 0; }

  .copilot-hint {
    font-size: 12px;
    margin-top: 16px;
  }

  ul {
    text-align: left;
    font-size: 12px;
    color: @text-color-help-dark;
    padding-left: 20px;
    margin-top: 8px;
    list-style: none;

    li {
      margin: 6px 0;
      position: relative;
      padding-left: 12px;
      &::before {
        content: '•';
        position: absolute;
        left: 0;
        color: @primary-color;
      }

      &::after { content: none; }
    }
  }
}

.copilot-typing {
  display: flex;
  gap: 5px;
  padding: 10px 0 6px;
  align-items: center;

  &-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: @primary-color;
    animation: copilot-typing 1.4s infinite both;
    opacity: 0.4;

    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes copilot-typing {
  0%, 60%, 100% { opacity: 0.4; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-5px); }
}

.copilot-confirm-card {
  background: @primary-1;
  border: 1px solid @primary-3;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 6px 0;

  &-text {
    font-size: 13px;
    color: @text-color;
    margin-bottom: 10px;
    line-height: 1.5;
  }

  &-actions {
    display: flex;
    gap: 8px;
  }
}

.copilot-confirm-btn {
  padding: 5px 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.5;

  &.confirm {
    background: @primary-color;
    color: #fff;
    border: none;
    box-shadow: 0 2px 6px fade(@primary-color, 30%);
    &:hover { background: @primary-5; }
  }

  &.cancel {
    background: #fff;
    color: @text-color-secondary;
    border: 1px solid @border-color-base;
    &:hover { border-color: @primary-color; color: @primary-color; }
  }
}

.copilot-input-area {
  padding: 10px 14px 12px;
  border-top: 1px solid @border-color-base;
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-shrink: 0;
  background: #fff;
}

.copilot-input {
  flex: 1;
  border: 1px solid @border-color-base;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  resize: none;
  outline: none;
  min-height: 36px;
  max-height: 100px;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s;

  &:focus {
    border-color: @primary-color;
    box-shadow: 0 0 0 2px fade(@primary-color, 10%);
  }

  &::placeholder {
    color: @text-color-help-dark;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
}

.copilot-send-btn {
  padding: 8px 18px;
  background: @primary-color;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
  height: 36px;
  transition: all 0.2s;
  font-weight: 500;

  &:hover:not(:disabled) { background: @primary-5; box-shadow: 0 2px 8px fade(@primary-color, 30%); }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { background: @border-color-shallow-dark; cursor: not-allowed; color: #fff; }
}
</style>
