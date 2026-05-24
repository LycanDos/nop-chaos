<template>
  <Teleport to="body">
    <!-- 浮动触发按钮 -->
    <div
      v-if="!expanded"
      class="copilot-fab"
      :style="fabStyle"
      @mousedown.prevent="startDragFab"
      @click="onFabClick"
    >
      <div class="copilot-fab-icon">
        <span class="copilot-fab-robot">AI</span>
      </div>
    </div>

    <!-- 对话框 -->
    <Transition name="copilot-slide">
      <div
        v-if="expanded"
        class="copilot-dialog"
        :style="dialogStyle"
        @mousedown="onDialogMouseDown"
      >
        <!-- 标题栏 -->
        <div class="copilot-dialog-header" @mousedown.prevent="startDragDialog">
          <span class="copilot-dialog-title">AI 助手</span>
          <div class="copilot-dialog-actions">
            <button
              class="copilot-header-btn"
              :class="{ active: selectingMode }"
              @click.stop="toggleSelectMode"
              title="选择页面元素"
            >
              {{ selectingMode ? '退出选择' : '选择元素' }}
            </button>
            <button
              class="copilot-header-btn"
              @click.stop="clearChat"
              title="清空对话"
            >
              清空
            </button>
            <button
              class="copilot-header-btn copilot-close-btn"
              @click.stop="expanded = false"
              title="关闭"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- 聊天内容 -->
        <ChatPanel
          :messages="store.messages"
          :loading="store.sending"
          :pending-confirm="store.pendingConfirm"
          @send="onSendMessage"
          @confirm="store.confirmAction(true)"
          @cancel="store.confirmAction(false)"
        />

        <!-- 调整大小抓手 -->
        <div
          class="copilot-resize-handle"
          @mousedown.prevent="startResize"
        />
      </div>
    </Transition>

    <!-- 元素选择器 -->
    <ElementSelector
      v-if="selectingMode"
      @select="onElementSelected"
      @cancel="selectingMode = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useCopilotStore } from './useCopilotStore'
import { CopilotClient } from './CopilotClient'
import { actionExecutor } from './ActionExecutor'
import { checkStrictScope, CopilotScopeLevel, getRejectionMessage } from './ScopeGuard'
import { setCopilotInstance } from './usePageContext'
import ChatPanel from './ChatPanel.vue'
import ElementSelector from './ElementSelector.vue'
import type { PageRuntimeContext, CopilotMessage, ElementInfo, FrontendInstruction } from './types'

const store = useCopilotStore()
const client = new CopilotClient()

// 当前页面上下文（由页面 providePageContext 注入）
const pageContext = ref<PageRuntimeContext | null>(null)
let selectedElement: ElementInfo | null = null

// UI state
const expanded = computed({
  get: () => store.expanded,
  set: (v) => { store.expanded = v }
})
const selectingMode = computed({
  get: () => store.selectingMode,
  set: (v) => { store.selectingMode = v }
})

// 拖拽状态
let dragging = false
let dragStartX = 0
let dragStartY = 0
const dialogPos = reactive({ x: 0, y: 0 })
const dialogSize = reactive({ width: 420, height: 560 })
const fabPos = reactive({ x: 0, y: 0 })

const fabStyle = computed(() => ({
  transform: `translate(${fabPos.x}px, ${fabPos.y}px)`,
}))

const dialogStyle = computed(() => ({
  transform: `translate(${dialogPos.x}px, ${dialogPos.y}px)`,
  width: `${dialogSize.width}px`,
  height: `${dialogSize.height}px`,
}))

function onFabClick(e: MouseEvent): void {
  if (!dragging) {
    expanded.value = true
  }
  dragging = false
}

function startDragFab(e: MouseEvent): void {
  const startX = e.clientX - fabPos.x
  const startY = e.clientY - fabPos.y

  function onMove(me: MouseEvent): void {
    dragging = true
    fabPos.x = me.clientX - startX
    fabPos.y = me.clientY - startY
  }

  function onUp(): void {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function startDragDialog(e: MouseEvent): void {
  const startX = e.clientX - dialogPos.x
  const startY = e.clientY - dialogPos.y

  function onMove(me: MouseEvent): void {
    dialogPos.x = me.clientX - startX
    dialogPos.y = me.clientY - startY
  }

  function onUp(): void {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function onDialogMouseDown(): void {
  // Bring dialog to front
}

function startResize(e: MouseEvent): void {
  const startX = e.clientX
  const startY = e.clientY
  const startW = dialogSize.width
  const startH = dialogSize.height

  function onMove(me: MouseEvent): void {
    dialogSize.width = Math.max(320, startW + me.clientX - startX)
    dialogSize.height = Math.max(400, startH + me.clientY - startY)
  }

  function onUp(): void {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function toggleSelectMode(): void {
  selectingMode.value = !selectingMode.value
}

function onElementSelected(info: ElementInfo): void {
  selectedElement = info
  selectingMode.value = false

  // 将选中元素信息作为系统消息添加到对话
  store.addMessage({
    id: store.generateId(),
    role: 'system',
    content: `已选择元素: ${info.tag}${info.id ? '#' + info.id : ''} "${info.text.slice(0, 50)}"`,
    timestamp: Date.now(),
  })
}

async function onSendMessage(message: string): Promise<void> {
  if (!message.trim() || store.sending) return

  // Scope 检查
  if (store.scope === CopilotScopeLevel.STRICT_PAGE) {
    const check = checkStrictScope(message)
    if (!check.allowed) {
      store.addMessage({
        id: store.generateId(),
        role: 'assistant',
        content: check.reason || getRejectionMessage(CopilotScopeLevel.STRICT_PAGE),
        timestamp: Date.now(),
      })
      return
    }
  }

  // 添加用户消息
  store.addMessage({
    id: store.generateId(),
    role: 'user',
    content: message,
    timestamp: Date.now(),
  })

  // 添加 AI 占位消息
  const assistantMsgId = store.generateId()
  store.addMessage({
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    isStreaming: true,
    timestamp: Date.now(),
  })

  store.sending = true

  try {
    await client.sendMessage(
      {
        sessionId: store.sessionId || client.getSessionId(),
        pageType: pageContext.value?.pageType || 'unknown',
        message,
        context: pageContext.value || undefined,
        selectedElement: selectedElement,
        userPermissions: store.userPermissions,
      },
      {
        onText(text: string): void {
          store.appendToLastMessage(text)
        },
        onAction(instruction: FrontendInstruction): void {
          store.finalizeLastMessage()

          // 检查是否需要确认
          if (instruction.type === 'confirm_required' || instruction.confirmationRequired) {
            store.setPendingConfirm({
              instruction,
              resolve: async (confirmed: boolean) => {
                if (confirmed) {
                  const results = await actionExecutor.execute(instruction)
                  store.addMessage({
                    id: store.generateId(),
                    role: 'system',
                    content: `操作${results.every(r => r.success) ? '完成' : '失败'}`,
                    timestamp: Date.now(),
                  })
                }
              },
            })
            return
          }

          // 执行操作
          actionExecutor.execute(instruction).then((results) => {
            const allOk = results.every((r) => r.success)
            store.addMessage({
              id: store.generateId(),
              role: 'system',
              content: allOk ? '操作完成' : `操作部分失败: ${results.filter(r => !r.success).map(r => r.error).join(', ')}`,
              timestamp: Date.now(),
            })
          })
        },
        onConfirm(instruction: FrontendInstruction): void {
          store.setPendingConfirm({
            instruction,
            resolve: async (confirmed: boolean) => {
              if (confirmed) {
                await actionExecutor.execute(instruction)
              }
            },
          })
        },
        onDone(usage): void {
          store.finalizeLastMessage()
          store.sending = false
          selectedElement = null
        },
        onError(error: string): void {
          store.appendToLastMessage(`\n\n[错误: ${error}]`)
          store.finalizeLastMessage()
          store.sending = false
        },
      },
    )
  } catch (err: any) {
    store.appendToLastMessage(`\n\n[网络错误: ${err.message}]`)
    store.finalizeLastMessage()
    store.sending = false
  }
}

function clearChat(): void {
  store.clearMessages()
}

// 接入页面上下文
function setPageContext(ctx: PageRuntimeContext): void {
  pageContext.value = ctx
  actionExecutor.registerPageActions(ctx.pageType, ctx)
}

onMounted(() => {
  setCopilotInstance({ setPageContext })
})

onBeforeUnmount(() => {
  client.cancel()
  if (pageContext.value) {
    actionExecutor.unregisterPage(pageContext.value.pageType)
  }
})

defineExpose({ setPageContext })
</script>

<style lang="less" scoped>
.copilot-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 99990;
  cursor: pointer;
  user-select: none;

  .copilot-fab-icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
    transition: all 0.3s;

    &:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.55);
    }
  }

  .copilot-fab-robot {
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 1px;
  }
}

.copilot-dialog {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 99991;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: move;
    flex-shrink: 0;
  }

  &-title {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
  }

  &-actions {
    display: flex;
    gap: 4px;
  }
}

.copilot-header-btn {
  background: none;
  border: 1px solid transparent;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
    color: #1a1a1a;
  }

  &.active {
    background: #e6f7ff;
    border-color: #1890ff;
    color: #1890ff;
  }
}

.copilot-close-btn {
  font-size: 16px;
  padding: 4px 8px;
  &:hover {
    color: #ff4d4f;
  }
}

.copilot-resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}

.copilot-slide-enter-active {
  transition: all 0.3s ease-out;
}

.copilot-slide-leave-active {
  transition: all 0.2s ease-in;
}

.copilot-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.copilot-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
