<template>
  <Teleport to="body">
    <!-- 浮动触发按钮 -->
    <div v-if="!expanded" class="copilot-fab" :style="fabStyle" @mousedown.prevent="startDragFab" @click="onFabClick">
      <div class="copilot-fab-icon">
        <span class="copilot-fab-robot">AI</span>
      </div>
    </div>

    <!-- 对话框 -->
    <Transition
      :css="false"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @after-leave="onAfterLeave"
    >
      <div v-if="expanded" class="copilot-dialog" :style="dialogStyle" @mousedown="onDialogMouseDown">
        <!-- 标题栏 -->
        <div class="copilot-dialog-header" @mousedown.prevent="startDragDialog">
          <div class="copilot-dialog-title-group">
            <span class="copilot-dialog-title">知音</span>
            <span v-if="activeSessionLabel" class="copilot-dialog-subtitle">{{ activeSessionLabel }}</span>
          </div>
          <div class="copilot-dialog-actions">
            <button class="copilot-header-btn" :class="{ active: sessionPanelVisible }" @click.stop="toggleSessionPanel" title="切换会话">
              会话
            </button>
            <button class="copilot-header-btn" :class="{ active: selectingMode }" @click.stop="toggleSelectMode" title="选择页面元素">
              {{ selectingMode ? '退出选择' : '选择元素' }}
            </button>
            <button class="copilot-header-btn" @click.stop="clearChat" title="清空对话"> 清空 </button>
            <button class="copilot-header-btn copilot-close-btn" @click.stop="expanded = false" title="关闭"> − </button>
          </div>
        </div>

        <div v-if="sessionPanelVisible" class="copilot-session-panel">
          <div class="copilot-session-panel-toolbar">
            <button class="copilot-session-primary-btn" :disabled="store.sending || sessionLoading" @click="createNewSession"> 新建会话 </button>
            <button class="copilot-session-text-btn" :disabled="sessionLoading" @click="refreshSessions"> 刷新 </button>
          </div>

          <div v-if="sessionLoading" class="copilot-session-empty">会话加载中...</div>
          <div v-else-if="sessionError" class="copilot-session-empty">{{ sessionError }}</div>
          <div v-else-if="sessions.length === 0" class="copilot-session-empty">暂无历史会话</div>

          <div v-else class="copilot-session-list">
            <button
              v-for="session in sessions"
              :key="session.sessionId"
              class="copilot-session-item"
              :class="{ active: session.sessionId === store.sessionId }"
              :disabled="store.sending || sessionSwitchingId === session.sessionId"
              @click="switchSession(session.sessionId)"
            >
              <div class="copilot-session-item-main">
                <div class="copilot-session-item-title">{{ session.title || '未命名会话' }}</div>
                <div class="copilot-session-item-meta">
                  {{ formatSessionMeta(session) }}
                </div>
                <div v-if="session.lastMessageText" class="copilot-session-item-snippet">
                  {{ session.lastMessageText }}
                </div>
              </div>
              <span class="copilot-session-delete" title="删除会话" @click.stop="removeSession(session.sessionId)"> 删除 </span>
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

        <!-- 调整大小抓手（左上角） -->
        <div class="copilot-resize-handle" @mousedown.prevent="startResize">
          <svg width="10" height="10" viewBox="0 0 10 10" class="copilot-resize-icon">
            <path d="M0 0 L10 10 M0 4 L6 10 M0 8 L2 10" stroke="#bbb" stroke-width="1" fill="none" />
          </svg>
        </div>
      </div>
    </Transition>

    <!-- 元素选择器 -->
    <ElementSelector v-if="selectingMode" @select="onElementSelected" @cancel="selectingMode = false" />
  </Teleport>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
  import { useCopilotStore } from './useCopilotStore';
  import { CopilotClient } from './CopilotClient';
  import { actionExecutor } from './ActionExecutor';
  import { checkStrictScope, CopilotScopeLevel, getRejectionMessage } from './ScopeGuard';
  import { setCopilotInstance } from './usePageContext';
  import { deleteCopilotSession, getCopilotSessionMessages, listCopilotSessions } from './session-api';
  import ChatPanel from './ChatPanel.vue';
  import ElementSelector from './ElementSelector.vue';
  import type { PageRuntimeContext, CopilotSessionSummary, ElementInfo, FrontendInstruction, ChatRequest } from './types';

  const store = useCopilotStore();
  const client = new CopilotClient();

  // 当前页面上下文（由页面 providePageContext 注入）
  const pageContext = ref<PageRuntimeContext | null>(null);
  let selectedElement: ElementInfo | null = null;

  // UI state
  const expanded = computed({
    get: () => store.expanded,
    set: (v) => {
      store.expanded = v;
    },
  });
  const selectingMode = computed({
    get: () => store.selectingMode,
    set: (v) => {
      store.selectingMode = v;
    },
  });
  const sessionPanelVisible = ref(false);
  const sessions = ref<CopilotSessionSummary[]>([]);
  const sessionLoading = ref(false);
  const sessionError = ref('');
  const sessionSwitchingId = ref('');
  const sessionBootstrapped = ref(false);

  const activeSessionLabel = computed(() => {
    const session = sessions.value.find((item) => item.sessionId === store.sessionId);
    return session?.title || '';
  });

  // 拖拽状态
  let dragging = false;
  const dialogPos = reactive({ x: 0, y: 0 });
  const dialogSize = reactive({ width: 420, height: 560 });
  const lastDialogPos = reactive({ x: 0, y: 0 });
  const lastDialogSize = reactive({ width: 420, height: 560 });
  const fabPos = reactive({ x: 0, y: 0 });

  const fabStyle = computed(() => ({
    transform: `translate(${fabPos.x}px, ${fabPos.y}px)`,
  }));

  const dialogStyle = computed(() => ({
    transform: `translate(${dialogPos.x}px, ${dialogPos.y}px)`,
    width: `${dialogSize.width}px`,
    height: `${dialogSize.height}px`,
  }));

  function onFabClick(): void {
    if (!dragging) {
      expanded.value = true;
    }
    dragging = false;
  }

  function startDragFab(e: MouseEvent): void {
    const startX = e.clientX - fabPos.x;
    const startY = e.clientY - fabPos.y;

    function onMove(me: MouseEvent): void {
      dragging = true;
      fabPos.x = me.clientX - startX;
      fabPos.y = me.clientY - startY;
    }

    function onUp(): void {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function startDragDialog(e: MouseEvent): void {
    const startX = e.clientX - dialogPos.x;
    const startY = e.clientY - dialogPos.y;

    function onMove(me: MouseEvent): void {
      dialogPos.x = me.clientX - startX;
      dialogPos.y = me.clientY - startY;
    }

    function onUp(): void {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  function onDialogMouseDown(): void {
    // Bring dialog to front
  }

  function startResize(e: MouseEvent): void {
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = dialogSize.width;
    const startH = dialogSize.height;

    function onMove(me: MouseEvent): void {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      dialogSize.width = Math.max(360, startW - dx);
      dialogSize.height = Math.max(320, startH - dy);
    }

    function onUp(): void {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // 展开动画：从 FAB 位置/大小过渡到对话框位置/大小
  function onBeforeEnter(el: Element): void {
    const dlg = el as HTMLElement;
    dialogPos.x = fabPos.x;
    dialogPos.y = fabPos.y;
    dialogSize.width = 52;
    dialogSize.height = 52;
    dlg.style.opacity = '0';
  }

  function onEnter(el: Element, done: () => void): void {
    const dlg = el as HTMLElement;
    requestAnimationFrame(() => {
      dlg.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.2), width 0.3s ease, height 0.3s ease, opacity 0.2s ease';
      dialogPos.x = lastDialogPos.x;
      dialogPos.y = lastDialogPos.y;
      dialogSize.width = lastDialogSize.width;
      dialogSize.height = lastDialogSize.height;
      dlg.style.opacity = '1';
      setTimeout(done, 300);
    });
  }

  function onAfterEnter(el: Element): void {
    const dlg = el as HTMLElement;
    dlg.style.transition = '';
    dlg.style.opacity = '';
  }

  function onBeforeLeave(_el: Element): void {
    fabPos.x = dialogPos.x;
    fabPos.y = dialogPos.y;
    lastDialogPos.x = dialogPos.x;
    lastDialogPos.y = dialogPos.y;
    lastDialogSize.width = dialogSize.width;
    lastDialogSize.height = dialogSize.height;
  }

  function onLeave(el: Element, done: () => void): void {
    const dlg = el as HTMLElement;

    // 委屈缩起：先微微一颤（受惊），顿一下，再快速缩回 FAB
    // Phase 1 — flinch: 轻微缩小，像是被点了一下 (0-120ms)
    dlg.style.transition = 'width 0.12s ease-out, height 0.12s ease-out';
    dialogSize.width = Math.max(lastDialogSize.width - 10, 360);
    dialogSize.height = Math.max(lastDialogSize.height - 14, 320);

    // Phase 2 — crumple: 快速缩成 FAB，带一点回弹 (150-480ms)
    setTimeout(() => {
      dlg.style.transition =
        'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.1s ease-in';
      dialogPos.x = fabPos.x;
      dialogPos.y = fabPos.y;
      dialogSize.width = 52;
      dialogSize.height = 52;
      dlg.style.opacity = '0';
    }, 120);

    setTimeout(done, 480);
  }

  function onAfterLeave(): void {
    // FAB is now visible at the dialog's previous position
  }

  function toggleSessionPanel(): void {
    sessionPanelVisible.value = !sessionPanelVisible.value;
    if (sessionPanelVisible.value) {
      void refreshSessions();
    }
  }

  function toggleSelectMode(): void {
    selectingMode.value = !selectingMode.value;
  }

  function ensureSessionId(): string {
    if (store.sessionId) {
      client.setSessionId(store.sessionId);
      return store.sessionId;
    }
    const sessionId = client.createSessionId();
    store.sessionId = sessionId;
    return sessionId;
  }

  function formatSessionMeta(session: CopilotSessionSummary): string {
    const parts: string[] = [];
    if (session.messageCount != null) {
      parts.push(`${session.messageCount} 条`);
    }
    if (session.pageType) {
      parts.push(session.pageType);
    }
    const time = session.updateTime || session.createTime;
    if (time) {
      parts.push(formatSessionTime(time));
    }
    return parts.join(' · ');
  }

  function formatSessionTime(value: string): string {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    const date = new Date(parsed);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }

  async function refreshSessions(): Promise<void> {
    sessionLoading.value = true;
    sessionError.value = '';
    try {
      sessions.value = await listCopilotSessions();
    } catch (err: any) {
      sessionError.value = err?.message || '加载会话失败';
    } finally {
      sessionLoading.value = false;
    }
  }

  async function loadSessionMessages(sessionId: string): Promise<void> {
    sessionSwitchingId.value = sessionId;
    try {
      const messages = await getCopilotSessionMessages(sessionId);
      store.clearMessages();
      for (const message of messages) {
        store.addMessage(message);
      }
      store.clearFeedback();
      store.setPendingConfirm(null);
      sessionError.value = '';
    } catch (err: any) {
      sessionError.value = err?.message || '加载会话消息失败';
      throw err;
    } finally {
      sessionSwitchingId.value = '';
    }
  }

  async function switchSession(sessionId: string): Promise<void> {
    if (!sessionId || store.sending || sessionId === store.sessionId) {
      return;
    }
    const previousSessionId = store.sessionId;
    store.sending = false;
    client.cancel();
    client.setSessionId(sessionId);
    store.sessionId = sessionId;
    try {
      await loadSessionMessages(sessionId);
    } catch (err) {
      client.setSessionId(previousSessionId);
      store.sessionId = previousSessionId;
    }
  }

  function createNewSession(): void {
    if (store.sending) return;
    client.cancel();
    store.sending = false;
    store.sessionId = client.createSessionId();
    store.clearMessages();
    store.clearFeedback();
    store.setPendingConfirm(null);
  }

  async function removeSession(sessionId: string): Promise<void> {
    if (!sessionId || store.sending) return;
    try {
      const deletingCurrent = sessionId === store.sessionId;
      await deleteCopilotSession(sessionId);
      sessions.value = sessions.value.filter((item) => item.sessionId !== sessionId);
      sessionError.value = '';
      if (deletingCurrent) {
        createNewSession();
      }
    } catch (err: any) {
      sessionError.value = err?.message || '删除会话失败';
    }
  }

  async function bootstrapSessions(): Promise<void> {
    if (sessionBootstrapped.value) return;
    sessionBootstrapped.value = true;
    ensureSessionId();
    try {
      await refreshSessions();
      const currentSession = store.sessionId;
      if (currentSession && sessions.value.some((item) => item.sessionId === currentSession)) {
        await loadSessionMessages(currentSession);
      }
    } catch (err) {
      // refreshSessions 已写入错误状态；这里只避免未处理 rejection
    }
  }

  function onElementSelected(info: ElementInfo): void {
    selectedElement = info;
    selectingMode.value = false;

    // 将选中元素信息作为系统消息添加到对话
    store.addMessage({
      id: store.generateId(),
      role: 'system',
      content: `已选择元素: ${info.tag}${info.id ? '#' + info.id : ''} "${info.text.slice(0, 50)}"`,
      timestamp: Date.now(),
    });
  }

  async function onSendMessage(message: string): Promise<void> {
    if (!message.trim() || store.sending) return;

    // Scope 检查
    if (store.scope === CopilotScopeLevel.STRICT_PAGE) {
      const check = checkStrictScope(message);
      if (!check.allowed) {
        store.addMessage({
          id: store.generateId(),
          role: 'assistant',
          content: check.reason || getRejectionMessage(CopilotScopeLevel.STRICT_PAGE),
          timestamp: Date.now(),
        });
        return;
      }
    }

    // 添加用户消息
    store.addMessage({
      id: store.generateId(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    });

    // 添加 AI 占位消息
    const assistantMsgId = store.generateId();
    store.addMessage({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    });

    store.sending = true;

    try {
      await client.sendMessage(buildChatRequest(message), {
        onText(text: string): void {
          store.appendToLastMessage(text);
        },
        onInstruction(instruction: FrontendInstruction): void {
          // 将指令描述消息加入聊天显示
          if (instruction.message) {
            store.appendToLastMessage(instruction.message);
          }
          store.finalizeLastMessage();

          // 检查是否需要确认
          if (instruction.type === 'confirm_required') {
            store.setPendingConfirm({
              instruction,
              resolve: async (confirmed: boolean) => {
                if (confirmed) {
                  const results = await actionExecutor.execute(instruction);
                  store.addMessage({
                    id: store.generateId(),
                    role: 'system',
                    content: `操作${results.every((r) => r.success) ? '完成' : '失败'}`,
                    timestamp: Date.now(),
                  });
                }
              },
            });
            return;
          }

          // 执行操作
          actionExecutor.execute(instruction).then((results) => {
            const allOk = results.every((r) => r.success);
            store.addMessage({
              id: store.generateId(),
              role: 'system',
              content: allOk
                ? '操作完成'
                : `操作部分失败: ${results
                    .filter((r) => !r.success)
                    .map((r) => r.error)
                    .join(', ')}`,
              timestamp: Date.now(),
            });
          });
        },
        onConfirmRequired(instruction: FrontendInstruction): void {
          store.setPendingConfirm({
            instruction,
            resolve: async (confirmed: boolean) => {
              if (confirmed) {
                const results = await actionExecutor.execute(instruction);
                const allOk = results.every((r) => r.success);
                store.addMessage({
                  id: store.generateId(),
                  role: 'assistant',
                  content: allOk
                    ? instruction.summary
                      ? `✅ ${instruction.summary}`
                      : '✅ 操作完成'
                    : `❌ 操作失败: ${results
                        .filter((r) => !r.success)
                        .map((r) => r.error)
                        .join('; ')}`,
                  timestamp: Date.now(),
                });
              } else {
                store.addMessage({
                  id: store.generateId(),
                  role: 'assistant',
                  content: '已取消操作。',
                  timestamp: Date.now(),
                });
              }
            },
          });
        },
        onClarification(text: string): void {
          store.appendToLastMessage(text);
        },
        onDone(_usage): void {
          store.finalizeLastMessage();
          store.sending = false;
          selectedElement = null;
          void refreshSessions();
        },
        onError(error: string): void {
          store.appendToLastMessage(`\n\n[错误: ${error}]`);
          store.finalizeLastMessage();
          store.sending = false;
          void refreshSessions();
        },
        onTrace(steps): void {
          if (steps && steps.length > 0) {
            const traceLines = steps.map((s: any) => {
              const icon = s.passed ? '✓' : '✗';
              const score = s.score != null ? ` (score: ${s.score.toFixed(2)})` : '';
              return `| ${icon} **${s.step}** → ${s.result}${score} | ${s.detail} |`;
            });
            store.appendToLastMessage('\n\n---\n### 决策链路\n' + traceLines.join('\n'));
          }
        },
      });
    } catch (err: any) {
      store.appendToLastMessage(`\n\n[网络错误: ${err.message}]`);
      store.finalizeLastMessage();
      store.sending = false;
      void refreshSessions();
    }
  }

  function clearChat(): void {
    createNewSession();
  }

  // materialize 页面上下文：将 getState 函数替换为真实 state 快照
  function materializePageContext(ctx: any): PageRuntimeContext {
    const materialized: PageRuntimeContext = {
      route: ctx.route || '',
      pageType: ctx.pageType || 'unknown',
      pageKind: ctx.pageKind,
      pageTitle: ctx.pageTitle,
      entityName: ctx.entityName,
      state: ctx.state,
      formSchema: ctx.formSchema,
      crudContext: ctx.crudContext,
      availableActions: ctx.availableActions,
    };

    // 如果存在旧的 getState 函数，调用它并将返回值合并到 state
    if (typeof ctx.getState === 'function') {
      try {
        const fnState = ctx.getState();
        materialized.state = { ...(materialized.state || {}), ...fnState };
      } catch (e) {
        /* 忽略函数调用异常 */
      }
    }

    return materialized;
  }

  function buildChatRequest(message: string): ChatRequest {
    // 当页面未显式注册上下文时，从 URL 自动推导最小上下文
    const ctx = pageContext.value || deriveFallbackContext();
    const sessionId = ensureSessionId();

    return {
      sessionId,
      pageType: ctx.pageType || 'unknown',
      message,
      context: materializePageContext(ctx),
      selectedElement: selectedElement,
      userPermissions: store.userPermissions,
      executionFeedback: store.lastExecutionFeedback,
      pageChange: store.lastPageChange,
      traceEnabled: store.traceEnabled,
    };
  }

  // 从浏览器 URL 自动推导最小页面上下文（当页面未调用 providePageContext 时）
  function deriveFallbackContext(): PageRuntimeContext {
    const route = window.location.hash?.replace(/^#/, '') || window.location.pathname;
    const pageType =
      route
        .replace(/^\/+/, '')
        .replace(/[^a-zA-Z0-9一-鿿_-]/g, '-')
        .replace(/-+/g, '-') || 'unknown';
    return {
      route,
      pageType,
      pageTitle: document.title || '',
    };
  }

  // 接入页面上下文
  function setPageContext(ctx: PageRuntimeContext): void {
    const prevPageType = pageContext.value?.pageType;

    // 检测页面切换，记录 PageChange
    if (prevPageType && prevPageType !== ctx.pageType) {
      store.recordPageChange({
        fromPageType: prevPageType,
        fromRoute: pageContext.value?.route || '',
        toPageType: ctx.pageType,
        toRoute: ctx.route || '',
        timestamp: Date.now(),
      });
      // 清理旧页面的 action handlers
      actionExecutor.unregisterPage(prevPageType);
    }

    pageContext.value = ctx;
    actionExecutor.registerPageActions(ctx.pageType, ctx);
  }

  // CustomEvent 处理：copilot:page-context
  function handlePageContextEvent(e: Event): void {
    const ctx = (e as CustomEvent).detail as PageRuntimeContext;
    if (ctx && ctx.pageType) {
      setPageContext(ctx);
    }
  }

  // CustomEvent 处理：copilot:page-unregister
  function handlePageUnregisterEvent(e: Event): void {
    const pageType = (e as CustomEvent).detail?.pageType;
    if (pageType) {
      actionExecutor.unregisterPage(pageType);
      if (pageContext.value?.pageType === pageType) {
        pageContext.value = null;
      }
    }
  }

  onMounted(() => {
    setCopilotInstance({ setPageContext });
    window.addEventListener('copilot:page-context', handlePageContextEvent);
    window.addEventListener('copilot:page-unregister', handlePageUnregisterEvent);
    void bootstrapSessions();
  });

  onBeforeUnmount(() => {
    client.cancel();
    window.removeEventListener('copilot:page-context', handlePageContextEvent);
    window.removeEventListener('copilot:page-unregister', handlePageUnregisterEvent);
    if (pageContext.value) {
      actionExecutor.unregisterPage(pageContext.value.pageType);
    }
  });

  defineExpose({ setPageContext });

  watch(expanded, (value) => {
    if (value) {
      void bootstrapSessions();
    }
  });
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

    &-title-group {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &-subtitle {
      font-size: 11px;
      color: #8c8c8c;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    &-actions {
      display: flex;
      gap: 4px;
    }
  }

  .copilot-session-panel {
    flex-shrink: 0;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 220px;
  }

  .copilot-session-panel-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .copilot-session-primary-btn,
  .copilot-session-text-btn {
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .copilot-session-primary-btn {
    border: 1px solid #1890ff;
    background: #1890ff;
    color: #fff;
    padding: 4px 10px;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .copilot-session-text-btn {
    border: 1px solid #d9d9d9;
    background: #fff;
    color: #595959;
    padding: 4px 10px;
  }

  .copilot-session-empty {
    font-size: 12px;
    color: #999;
    padding: 8px 2px;
  }

  .copilot-session-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
  }

  .copilot-session-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    text-align: left;
    border: 1px solid #e8e8e8;
    background: #fff;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #91d5ff;
      background: #f6ffed;
    }

    &.active {
      border-color: #1890ff;
      background: #e6f7ff;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.75;
    }
  }

  .copilot-session-item-main {
    min-width: 0;
    flex: 1;
  }

  .copilot-session-item-title {
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .copilot-session-item-meta {
    margin-top: 2px;
    font-size: 11px;
    color: #8c8c8c;
  }

  .copilot-session-item-snippet {
    margin-top: 4px;
    font-size: 12px;
    color: #595959;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .copilot-session-delete {
    font-size: 11px;
    color: #ff4d4f;
    flex-shrink: 0;
    padding-top: 1px;
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
    left: 2px;
    top: 2px;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 1px 0 0 1px;
    border-radius: 10px 0 0 0;
    opacity: 0.5;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }

  .copilot-resize-icon {
    display: block;
    pointer-events: none;
  }
</style>
