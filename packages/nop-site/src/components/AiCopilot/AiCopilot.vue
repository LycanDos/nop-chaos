<template>
  <Teleport to="body">
    <!-- 浮动触发按钮 - 知音 -->
    <div
      ref="fabRef"
      v-show="fabVisible"
      class="copilot-fab"
      :style="fabStyle"
      @mousedown.prevent="startDragFab"
      @click="onFabClick"
    >
      <div class="copilot-fab-icon">
        <div class="copilot-fab-glow"></div>
        <svg class="copilot-fab-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-dasharray="8 5" />
          <circle cx="32" cy="32" r="16" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" />
          <circle cx="32" cy="32" r="5" fill="white" opacity="0.95" />
          <circle cx="18" cy="22" r="2.8" fill="white" opacity="0.85" />
          <circle cx="46" cy="42" r="2.8" fill="white" opacity="0.85" />
          <path d="M19 25 Q32 38 45 45" stroke="white" stroke-width="1.3" stroke-linecap="round" opacity="0.5" />
        </svg>
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
      <div v-if="expanded" ref="dialogRef" class="copilot-dialog" :style="dialogStyle" @mousedown="onDialogMouseDown">
        <!-- 标题栏 -->
        <div class="copilot-dialog-header" @mousedown="startDragDialog">
          <div class="copilot-dialog-title-group">
            <div class="copilot-dialog-title-row">
              <div ref="avatarRef" class="copilot-avatar-small">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="26" stroke="rgba(255,255,255,0.25)" stroke-width="1.2" stroke-dasharray="8 5" />
                  <circle cx="32" cy="32" r="16" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" />
                  <circle cx="32" cy="32" r="5" fill="white" opacity="0.95" />
                  <circle cx="18" cy="22" r="2.8" fill="white" opacity="0.85" />
                  <circle cx="46" cy="42" r="2.8" fill="white" opacity="0.85" />
                  <path d="M19 25 Q32 38 45 45" stroke="white" stroke-width="1.3" stroke-linecap="round" opacity="0.5" />
                </svg>
              </div>
              <span class="copilot-dialog-title">知音</span>
            </div>
            <div v-if="selectedElement" class="copilot-context-tag">
              <span class="copilot-context-tag-label">{{ getElementDisplayName(selectedElement) }}</span>
              <span class="copilot-context-tag-clear" @click.stop="clearSelectedElement" title="清除">×</span>
            </div>
            <span v-else-if="activeSessionLabel" class="copilot-dialog-subtitle">{{ activeSessionLabel }}</span>
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

        <!-- 对话框主体：左侧边栏 + 聊天区域 -->
        <div class="copilot-dialog-body">
          <!-- 左侧会话边栏 -->
          <div v-if="sessionPanelVisible" class="copilot-sidebar">
            <div class="copilot-sidebar-search">
              <input
                v-model="sessionSearch"
                class="copilot-search-input"
                placeholder="搜索会话..."
                type="text"
              />
            </div>
            <div class="copilot-sidebar-toolbar">
              <button class="copilot-session-primary-btn" :disabled="store.sending || sessionLoading" @click="createNewSession"> 新建会话 </button>
              <button
                class="copilot-session-text-btn"
                :class="{ active: batchMode }"
                :disabled="sessionLoading"
                @click="toggleBatchMode"
                title="批量管理"
              >
                ☰
              </button>
              <button class="copilot-session-text-btn" :disabled="sessionLoading" @click="refreshSessions" title="刷新"> ↻ </button>
            </div>
            <!-- 批量操作栏 -->
            <div v-if="batchMode" class="copilot-batch-toolbar">
              <span class="copilot-batch-count">已选 {{ selectedSessionIds.size }} 项</span>
              <button
                class="copilot-batch-delete-btn"
                :disabled="selectedSessionIds.size === 0 || store.sending"
                @click="batchDeleteSessions"
              >
                批量删除
              </button>
              <button class="copilot-batch-cancel-btn" @click="toggleBatchMode"> 取消 </button>
            </div>

            <div v-if="sessionLoading" class="copilot-session-empty">会话加载中...</div>
            <div v-else-if="sessionError" class="copilot-session-empty">{{ sessionError }}</div>
            <div v-else-if="filteredSessions.length === 0 && sessions.length === 0" class="copilot-session-empty">暂无历史会话</div>
            <div v-else-if="filteredSessions.length === 0" class="copilot-session-empty">无匹配会话</div>

            <div v-else class="copilot-session-list">
              <div
                v-for="session in filteredSessions"
                :key="session.sessionId"
                class="copilot-session-item"
                :class="{ active: session.sessionId === store.sessionId }"
              >
                <!-- 批量模式：复选框 -->
                <label v-if="batchMode" class="copilot-session-checkbox" @click.stop>
                  <input
                    type="checkbox"
                    :checked="selectedSessionIds.has(session.sessionId)"
                    @change="toggleSessionSelect(session.sessionId)"
                  />
                </label>
                <!-- 会话内容 -->
                <button
                  class="copilot-session-item-content"
                  :disabled="store.sending || sessionSwitchingId === session.sessionId"
                  @click="batchMode ? toggleSessionSelect(session.sessionId) : switchSession(session.sessionId)"
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
                </button>
                <span v-if="!batchMode" class="copilot-session-delete" title="删除会话" @click.stop="removeSession(session.sessionId)"> × </span>
              </div>
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
        </div>

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
  import { createCopilotSession, deleteCopilotSession, deleteCopilotSessions, getCopilotSessionMessages, listCopilotSessions } from './session-api';
  import ChatPanel from './ChatPanel.vue';
  import ElementSelector from './ElementSelector.vue';
  import type { PageRuntimeContext, CopilotSessionSummary, ElementInfo, FrontendInstruction, ChatRequest } from './types';
  import { COPILOT_WINDOW_STATE_KEY } from '/@/enums/cacheEnum';

  const store = useCopilotStore();
  const client = new CopilotClient();

  // DOM refs for animation
  const fabRef = ref<HTMLElement | null>(null);
  const dialogRef = ref<HTMLElement | null>(null);
  const avatarRef = ref<HTMLElement | null>(null);
  const fabVisible = ref(true);

  // 当前页面上下文（由页面 providePageContext 注入）
  const pageContext = ref<PageRuntimeContext | null>(null);
  const selectedElement = ref<ElementInfo | null>(null);

  // Agentic Loop 控制
  const MAX_AGENTIC_LOOPS = 5
  let agenticLoopCount = 0

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
  const sessionSearch = ref('');
  const sessions = ref<CopilotSessionSummary[]>([]);
  const sessionLoading = ref(false);
  const sessionError = ref('');
  const sessionSwitchingId = ref('');
  const sessionBootstrapped = ref(false);

  // 批量管理模式
  const batchMode = ref(false);
  const selectedSessionIds = ref(new Set<string>());

  const filteredSessions = computed(() => {
    const q = sessionSearch.value.trim().toLowerCase();
    if (!q) return sessions.value;
    return sessions.value.filter((s) => {
      const title = (s.title || '').toLowerCase();
      const snippet = (s.lastMessageText || '').toLowerCase();
      return title.includes(q) || snippet.includes(q);
    });
  });

  const activeSessionLabel = computed(() => {
    const session = sessions.value.find((item) => item.sessionId === store.sessionId);
    return session?.title || '';
  });

  // 默认值 - 对话框锚定在右下角，FAB 缩小为 48px
  const FAB_SIZE = 48;
  const DEFAULT_DIALOG_SIZE = { width: 640, height: 560 };
  const DEFAULT_FAB_POS = { x: 0, y: 0 };
  const MIN_DIALOG_SIZE = { width: 520, height: 320 };
  const VIEWPORT_MARGIN = 24;

  // 拖拽状态
  let dragging = false;
  // dialogPos: right/bottom 定位 transformX/transformY（负值=向左/上移动）
  const dialogPos = reactive({ x: 0, y: 0 });
  const dialogSize = reactive({ width: DEFAULT_DIALOG_SIZE.width, height: DEFAULT_DIALOG_SIZE.height });
  const lastDialogPos = reactive({ x: 0, y: 0 });
  const lastDialogSize = reactive({ width: DEFAULT_DIALOG_SIZE.width, height: DEFAULT_DIALOG_SIZE.height });
  // fabPos: right/bottom 定位 transformX/transformY
  const fabPos = reactive({ x: DEFAULT_FAB_POS.x, y: DEFAULT_FAB_POS.y });

  interface WindowState {
    fabPos: { x: number; y: number };
    lastDialogPos: { x: number; y: number };
    lastDialogSize: { width: number; height: number };
  }

  /** 将对话框位置限制在视口范围内（对话框 right/bottom 定位 + transform） */
  function clampDialogPos(pos: { x: number; y: number }, size: { width: number; height: number }): { x: number; y: number } {
    const maxX = window.innerWidth - size.width - VIEWPORT_MARGIN * 2;
    const maxY = window.innerHeight - size.height - VIEWPORT_MARGIN * 2;
    return {
      x: Math.min(0, Math.max(-maxX, pos.x)),
      y: Math.min(0, Math.max(-maxY, pos.y)),
    };
  }

  /** 将 FAB 位置限制在视口范围内 */
  function clampFabPos(pos: { x: number; y: number }): { x: number; y: number } {
    const maxX = window.innerWidth - FAB_SIZE - VIEWPORT_MARGIN * 2;
    const maxY = window.innerHeight - FAB_SIZE - VIEWPORT_MARGIN * 2;
    return {
      x: Math.min(0, Math.max(-maxX, pos.x)),
      y: Math.min(0, Math.max(-maxY, pos.y)),
    };
  }

  function loadWindowState(): void {
    try {
      const raw = localStorage.getItem(COPILOT_WINDOW_STATE_KEY);
      if (!raw) return;
      const saved: WindowState = JSON.parse(raw);
      if (saved.fabPos) {
        fabPos.x = saved.fabPos.x;
        fabPos.y = saved.fabPos.y;
      }
      if (saved.lastDialogPos) {
        lastDialogPos.x = saved.lastDialogPos.x;
        lastDialogPos.y = saved.lastDialogPos.y;
      }
      if (saved.lastDialogSize) {
        lastDialogSize.width = Math.min(
          window.innerWidth - VIEWPORT_MARGIN * 2,
          Math.max(MIN_DIALOG_SIZE.width, saved.lastDialogSize.width),
        );
        lastDialogSize.height = Math.min(
          window.innerHeight - VIEWPORT_MARGIN * 2,
          Math.max(MIN_DIALOG_SIZE.height, saved.lastDialogSize.height),
        );
      }
      // 限制位置确保在当前窗口大小下可见
      Object.assign(fabPos, clampFabPos(fabPos));
      Object.assign(lastDialogPos, clampDialogPos(lastDialogPos, lastDialogSize));
    } catch {
      // 忽略解析错误，使用默认值
    }
  }

  function saveWindowState(): void {
    // 同步当前对话框位置/大小到持久化变量
    lastDialogPos.x = dialogPos.x;
    lastDialogPos.y = dialogPos.y;
    lastDialogSize.width = dialogSize.width;
    lastDialogSize.height = dialogSize.height;

    const state: WindowState = {
      fabPos: { x: fabPos.x, y: fabPos.y },
      lastDialogPos: { x: lastDialogPos.x, y: lastDialogPos.y },
      lastDialogSize: { width: lastDialogSize.width, height: lastDialogSize.height },
    };
    try {
      localStorage.setItem(COPILOT_WINDOW_STATE_KEY, JSON.stringify(state));
    } catch {
      // 忽略存储错误
    }
  }

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
      saveWindowState();
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
      saveWindowState();
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
      dialogSize.width = Math.max(MIN_DIALOG_SIZE.width, startW - dx);
      dialogSize.height = Math.max(MIN_DIALOG_SIZE.height, startH - dy);
    }

    function onUp(): void {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveWindowState();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ═══════════════════════════════════════════
  // 展开/收缩动画
  // 核心：展开时 dialogPos 保持 = fabPos（右下角锚死不动）
  // 只改变 width/height/borderRadius，对话框向左上方生长
  // 收缩：反向，缩回 48x48 圆形
  // ═══════════════════════════════════════════

  const AVATAR_SIZE = 22;
  const AVATAR_LEFT = 16;
  const AVATAR_TOP = 12;
  let flyClone: HTMLElement | null = null;
  let flyAnim: Animation | null = null;

  function getFabCenter() {
    const el = fabRef.value;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function getAvatarScreenCenter() {
    const el = avatarRef.value;
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    // 展开时头像未渲染，用数学算
    const sz = lastDialogSize;
    const w = sz.width || DEFAULT_DIALOG_SIZE.width;
    const h = sz.height || DEFAULT_DIALOG_SIZE.height;
    const dlgLeft = window.innerWidth - 24 - w + lastDialogPos.x;
    const dlgTop = window.innerHeight - 24 - h + lastDialogPos.y;
    return { x: dlgLeft + AVATAR_LEFT + AVATAR_SIZE / 2, y: dlgTop + AVATAR_TOP + AVATAR_SIZE / 2 };
  }

  function createFlyClone(small: boolean): HTMLElement {
    const fab = fabRef.value;
    if (!fab) { const el = document.createElement('div'); el.style.cssText = 'position:fixed;z-index:99992;pointer-events:none;'; return el; }
    const icon = fab.querySelector('.copilot-fab-icon') as HTMLElement;
    const clone = icon.cloneNode(true) as HTMLElement;
    const r = icon.getBoundingClientRect();
    clone.style.cssText = `position:fixed;z-index:99992;pointer-events:none;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    if (small) clone.style.transform = `scale(${AVATAR_SIZE / FAB_SIZE})`;
    document.body.appendChild(clone);
    return clone;
  }

  function destroyFlyClone() {
    if (flyClone) { flyClone.remove(); flyClone = null; }
    if (flyAnim) { flyAnim.cancel(); flyAnim = null; }
  }

  // ── 展开/收缩：scale + transform-origin: 100% 100% ──
  // 注意：dlg.style.transform 必须包含 translate，否则会覆写 Vue :style="dialogStyle"

  const DIALOG_SAFE = 8;

  function clampExpandedPos(pos: { x: number; y: number }): { x: number; y: number } {
    const dw = lastDialogSize.width || DEFAULT_DIALOG_SIZE.width;
    const dh = lastDialogSize.height || DEFAULT_DIALOG_SIZE.height;
    const minX = -(window.innerWidth - 24 - dw - DIALOG_SAFE);
    const minY = -(window.innerHeight - 24 - dh - DIALOG_SAFE);
    return { x: Math.min(0, Math.max(minX, pos.x)), y: Math.min(0, Math.max(minY, pos.y)) };
  }

  function clampDialogSize(size: { width: number; height: number }): { width: number; height: number } {
    return {
      width: Math.min(size.width, window.innerWidth - 24 - DIALOG_SAFE),
      height: Math.min(size.height, window.innerHeight - 24 - DIALOG_SAFE),
    };
  }

  /** 获取带 translate 的完整 transform 字符串 */
  function dialogTransform(scale: number) {
    return `translate(${dialogPos.x}px, ${dialogPos.y}px) scale(${scale})`;
  }

  /** 最终 transform（scale=1，纯 translate）用于动画结束后恢复 */
  function dialogTranslate() {
    return `translate(${dialogPos.x}px, ${dialogPos.y}px)`;
  }

  // ── 展开：scale(0→1) + 背景从透明渐变到毛玻璃 ──

  const GLASS_BG = 'rgba(255,255,255,0.88)';

  function onBeforeEnter(el: Element) {
    const dlg = el as HTMLElement;

    // 钳位尺寸
    const cs = clampDialogSize(lastDialogSize);
    lastDialogSize.width = Math.max(MIN_DIALOG_SIZE.width, cs.width);
    lastDialogSize.height = Math.max(MIN_DIALOG_SIZE.height, cs.height);
    // 钳位位置
    dialogPos.x = fabPos.x;
    dialogPos.y = fabPos.y;
    const cp = clampExpandedPos(dialogPos);
    dialogPos.x = cp.x;
    dialogPos.y = cp.y;
    lastDialogPos.x = cp.x;
    lastDialogPos.y = cp.y;

    dialogSize.width = lastDialogSize.width;
    dialogSize.height = lastDialogSize.height;
    dlg.style.transformOrigin = '100% 100%';
    dlg.style.transform = dialogTransform(0);
    dlg.style.borderRadius = '50%';
    dlg.style.overflow = 'hidden';
    dlg.style.opacity = '0';
    dlg.style.background = 'rgba(255,255,255,0)';
    dlg.style.boxShadow = 'none';

    fabVisible.value = true;
    destroyFlyClone();
    flyClone = createFlyClone(false);
  }

  function onEnter(el: Element, done: () => void) {
    const dlg = el as HTMLElement;

    requestAnimationFrame(() => {
      dlg.style.transition =
        'transform 0.32s ease, border-radius 0.32s ease, opacity 0.25s ease, background 0.32s ease, box-shadow 0.32s ease';
      dlg.style.transform = dialogTransform(1);
      dlg.style.borderRadius = '12px';
      dlg.style.opacity = '1';
      dlg.style.background = GLASS_BG;
      dlg.style.boxShadow =
        '0 8px 32px rgba(99,102,241,0.08), 0 2px 8px rgba(0,0,0,0.06)';

      if (flyClone) {
        const fc = getFabCenter();
        const ac = getAvatarScreenCenter();
        flyAnim = flyClone.animate(
          [
            { left: `${fc.x - FAB_SIZE / 2}px`, top: `${fc.y - FAB_SIZE / 2}px`, width: `${FAB_SIZE}px`, height: `${FAB_SIZE}px`, offset: 0 },
            { left: `${ac.x - AVATAR_SIZE / 2}px`, top: `${ac.y - AVATAR_SIZE / 2}px`, width: `${AVATAR_SIZE}px`, height: `${AVATAR_SIZE}px`, offset: 1 },
          ],
          { duration: 320, easing: 'ease', fill: 'forwards' },
        );
      }

      if (fabRef.value) {
        fabRef.value.style.transition = 'opacity 0.15s ease';
        fabRef.value.style.opacity = '0';
      }

      setTimeout(() => {
        dlg.style.transition = '';
        dlg.style.transform = dialogTranslate();
        dlg.style.transformOrigin = '';
        dlg.style.overflow = '';
        dlg.style.borderRadius = '';
        dlg.style.background = '';
        dlg.style.boxShadow = '';
        done();
      }, 320);
    });
  }

  function onAfterEnter() {
    destroyFlyClone();
    fabVisible.value = false;
    if (fabRef.value) { fabRef.value.style.transition = ''; fabRef.value.style.opacity = ''; }
  }

  // ── 收缩：逆动画 ──

  function onBeforeLeave(_el: Element) {
    lastDialogPos.x = dialogPos.x;
    lastDialogPos.y = dialogPos.y;
    lastDialogSize.width = dialogSize.width;
    lastDialogSize.height = dialogSize.height;
    fabPos.x = dialogPos.x;
    fabPos.y = dialogPos.y;

    fabVisible.value = true;
    if (fabRef.value) fabRef.value.style.opacity = '0';

    destroyFlyClone();
    flyClone = createFlyClone(true);
    if (flyClone) {
      const ac = getAvatarScreenCenter();
      flyClone.style.left = `${ac.x - AVATAR_SIZE / 2}px`;
      flyClone.style.top = `${ac.y - AVATAR_SIZE / 2}px`;
      flyClone.style.width = `${AVATAR_SIZE}px`;
      flyClone.style.height = `${AVATAR_SIZE}px`;
    }

    saveWindowState();
  }

  function onLeave(el: Element, done: () => void) {
    const dlg = el as HTMLElement;
    dlg.style.transformOrigin = '100% 100%';
    dlg.style.overflow = 'hidden';
    dlg.style.transform = dialogTransform(1);
    // 显式设当前值以触发 transition
    dlg.style.background = GLASS_BG;
    dlg.style.boxShadow =
      '0 8px 32px rgba(99,102,241,0.08), 0 2px 8px rgba(0,0,0,0.06)';

    requestAnimationFrame(() => {
      dlg.style.transition =
        'transform 0.28s ease, border-radius 0.28s ease, opacity 0.2s ease-in, background 0.28s ease, box-shadow 0.28s ease';
      dlg.style.transform = dialogTransform(0);
      dlg.style.borderRadius = '50%';
      dlg.style.opacity = '0';
      dlg.style.background = 'rgba(255,255,255,0)';
      dlg.style.boxShadow = 'none';

      if (flyClone) {
        const fc = getFabCenter();
        const ac = getAvatarScreenCenter();
        flyAnim = flyClone.animate(
          [
            { left: `${ac.x - AVATAR_SIZE / 2}px`, top: `${ac.y - AVATAR_SIZE / 2}px`, width: `${AVATAR_SIZE}px`, height: `${AVATAR_SIZE}px`, offset: 0 },
            { left: `${fc.x - FAB_SIZE / 2}px`, top: `${fc.y - FAB_SIZE / 2}px`, width: `${FAB_SIZE}px`, height: `${FAB_SIZE}px`, offset: 1 },
          ],
          { duration: 280, easing: 'ease', fill: 'forwards' },
        );
      }

      if (fabRef.value) {
        fabRef.value.style.transition = 'opacity 0.15s ease 0.08s';
        fabRef.value.style.opacity = '1';
      }

      setTimeout(() => {
        dlg.style.transition = '';
        dlg.style.transform = '';
        dlg.style.transformOrigin = '';
        dlg.style.overflow = '';
        dlg.style.borderRadius = '';
        dlg.style.opacity = '';
        dlg.style.background = '';
        dlg.style.boxShadow = '';
        done();
      }, 280);
    });
  }

  function onAfterLeave() {
    destroyFlyClone();
    if (fabRef.value) { fabRef.value.style.transition = ''; fabRef.value.style.opacity = ''; }
    dialogSize.width = lastDialogSize.width;
    dialogSize.height = lastDialogSize.height;
    dialogPos.x = lastDialogPos.x;
    dialogPos.y = lastDialogPos.y;
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

  async function createNewSession(): Promise<void> {
    if (store.sending || sessionLoading.value) return;
    client.cancel();
    store.sending = false;
    const sessionId = client.createSessionId();
    store.sessionId = sessionId;
    store.clearMessages();
    store.clearFeedback();
    store.setPendingConfirm(null);
    sessionError.value = '';

    try {
      sessionLoading.value = true;
      await createCopilotSession(
        sessionId,
        pageContext.value?.pageType || deriveFallbackContext().pageType,
        pageContext.value?.route || deriveFallbackContext().route
      );
      await refreshSessions();
    } catch (err: any) {
      sessionError.value = err?.message || '创建会话失败';
    } finally {
      sessionLoading.value = false;
    }
  }

  async function removeSession(sessionId: string): Promise<void> {
    if (!sessionId || store.sending) return;
    try {
      const deletingCurrent = sessionId === store.sessionId;
      await deleteCopilotSession(sessionId);
      sessions.value = sessions.value.filter((item) => item.sessionId !== sessionId);
      selectedSessionIds.value.delete(sessionId);
      sessionError.value = '';
      if (deletingCurrent) {
        await createNewSession();
      }
    } catch (err: any) {
      sessionError.value = err?.message || '删除会话失败';
    }
  }

  // === 批量管理模式 ===

  function toggleBatchMode(): void {
    batchMode.value = !batchMode.value;
    if (!batchMode.value) {
      selectedSessionIds.value = new Set();
    }
  }

  function toggleSessionSelect(sessionId: string): void {
    const next = new Set(selectedSessionIds.value);
    if (next.has(sessionId)) {
      next.delete(sessionId);
    } else {
      next.add(sessionId);
    }
    selectedSessionIds.value = next;
  }

  async function batchDeleteSessions(): Promise<void> {
    if (selectedSessionIds.value.size === 0 || store.sending) return;
    const ids = Array.from(selectedSessionIds.value);
    try {
      const deletingCurrent = ids.includes(store.sessionId);
      await deleteCopilotSessions(ids);
      sessions.value = sessions.value.filter((item) => !ids.includes(item.sessionId));
      selectedSessionIds.value = new Set();
      sessionError.value = '';
      if (deletingCurrent) {
        await createNewSession();
      }
    } catch (err: any) {
      sessionError.value = err?.message || '批量删除失败';
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
    selectedElement.value = info;
    selectingMode.value = false;

    // 将选中元素信息作为系统消息添加到对话（使用友好名称）
    const displayName = getElementDisplayName(info);
    store.addMessage({
      id: store.generateId(),
      role: 'system',
      content: `已选择元素: ${displayName}`,
      timestamp: Date.now(),
    });
  }

  /** 生成用户友好的元素显示名称 */
  function getElementDisplayName(info: ElementInfo): string {
    // 按钮类元素
    if (info.fieldType === 'action' && info.label) {
      return `「${info.label}」按钮`;
    }
    if (info.fieldType === 'action' && info.actionName) {
      return `「${info.actionName}」按钮`;
    }
    // 表单字段 — 优先使用 label
    if (info.label && info.fieldName) {
      let desc = `「${info.label}」`;
      if (info.fieldType === 'select') desc += '下拉框';
      else if (info.fieldType === 'textarea') desc += '文本框';
      else if (info.fieldType === 'boolean') desc += '开关';
      else if (info.fieldType === 'date') desc += '日期选择';
      else if (info.fieldType === 'number') desc += '数字输入';
      else if (info.fieldType === 'text') desc += '输入框';
      if (info.value !== undefined && info.value !== null && info.value !== '') {
        desc += ` (当前值: ${String(info.value).slice(0, 30)})`;
      }
      return desc;
    }
    if (info.label && !info.fieldName) {
      return `「${info.label}」`;
    }
    if (info.fieldName) {
      return `「${info.fieldName}」字段`;
    }
    // 退化：使用标签名 + 文本内容
    const tagName = info.tag || '元素';
    const text = info.text ? info.text.slice(0, 30) : '';
    if (text && text !== info.tag) {
      return `「${text}」(${tagName})`;
    }
    return `「${tagName}」元素`;
  }

  /** 清除已选择元素 */
  function clearSelectedElement(): void {
    if (selectedElement.value) {
      store.addMessage({
        id: store.generateId(),
        role: 'system',
        content: `已清除元素选择`,
        timestamp: Date.now(),
      });
    }
    selectedElement.value = null;
  }

  async function onSendMessage(message: string): Promise<void> {
    if (!message.trim() || store.sending) return;
    agenticLoopCount = 0; // 新用户消息重置循环计数

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
                  await runAgenticLoop(instruction, message);
                } else {
                  agenticLoopCount = 0;
                  store.addMessage({
                    id: store.generateId(),
                    role: 'assistant',
                    content: '已取消操作。',
                    timestamp: Date.now(),
                  });
                }
              },
            });
            return;
          }

          // 启动 Agentic Loop
          runAgenticLoop(instruction, message);
        },
        onConfirmRequired(instruction: FrontendInstruction): void {
          store.setPendingConfirm({
            instruction,
            resolve: async (confirmed: boolean) => {
              if (confirmed) {
                await runAgenticLoop(instruction, message);
              } else {
                agenticLoopCount = 0;
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

  /**
   * Agentic Loop: 执行指令 → 观察结果 → 自动反馈后端 → 继续下一轮。
   * 实现"不间断对话直到完成任务"的核心机制。
   */
  async function runAgenticLoop(
    instruction: FrontendInstruction,
    userMessage: string,
  ): Promise<void> {
    agenticLoopCount++;

    if (agenticLoopCount >= MAX_AGENTIC_LOOPS) {
      store.addMessage({
        id: store.generateId(),
        role: 'system',
        content: `已达到最大操作轮次 (${MAX_AGENTIC_LOOPS})，如有需要请继续指示。`,
        timestamp: Date.now(),
      });
      agenticLoopCount = 0;
      store.sending = false;
      return;
    }

    // 执行指令（带重试）
    const results = await actionExecutor.executeWithRetry(instruction);
    const allOk = results.every((r) => r.success);

    // 构建结构化执行反馈
    const feedback = {
      status: allOk ? 'success' : 'partial' as const,
      summary: allOk
        ? `${instruction.actions.length} 个操作全部完成`
        : `${results.filter((r) => !r.success).length} 个操作失败`,
      cancelled: false,
      timestamp: Date.now(),
      results: results.map((r) => ({
        actionType: r.data?.type || 'unknown',
        target: r.data?.target || '',
        success: r.success,
        error: r.error,
        data: r.data,
      })),
    };

    store.recordExecutionFeedback(feedback);

    if (!allOk) {
      // 操作失败：报告并停止循环
      store.addMessage({
        id: store.generateId(),
        role: 'system',
        content: `操作失败: ${results
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join('; ')}`,
        timestamp: Date.now(),
      });
      agenticLoopCount = 0;
      store.sending = false;
      return;
    }

    // 操作成功：添加系统消息并自动继续
    store.addMessage({
      id: store.generateId(),
      role: 'system',
      content: `${instruction.summary || '操作完成'} (${instruction.actions.length} 步)`,
      timestamp: Date.now(),
    });

    // 构建 __continue__ 请求发送给后端
    const continueRequest = buildChatRequest('__continue__');
    continueRequest.executionFeedback = feedback;

    // 添加 AI 占位消息用于流式响应
    store.addMessage({
      id: store.generateId(),
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: Date.now(),
    });

    try {
      await client.sendMessage(continueRequest, {
        onText(text: string): void {
          store.appendToLastMessage(text);
        },
        onInstruction(nextInstruction: FrontendInstruction): void {
          if (nextInstruction.message) {
            store.appendToLastMessage(nextInstruction.message);
          }
          store.finalizeLastMessage();

          if (nextInstruction.type === 'confirm_required') {
            store.setPendingConfirm({
              instruction: nextInstruction,
              resolve: async (confirmed: boolean) => {
                if (confirmed) {
                  await runAgenticLoop(nextInstruction, userMessage);
                } else {
                  agenticLoopCount = 0;
                  store.addMessage({
                    id: store.generateId(),
                    role: 'assistant',
                    content: '已取消操作。',
                    timestamp: Date.now(),
                  });
                }
              },
            });
            return;
          }

          runAgenticLoop(nextInstruction, userMessage);
        },
        onConfirmRequired(nextInstruction: FrontendInstruction): void {
          store.setPendingConfirm({
            instruction: nextInstruction,
            resolve: async (confirmed: boolean) => {
              if (confirmed) {
                await runAgenticLoop(nextInstruction, userMessage);
              } else {
                agenticLoopCount = 0;
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
          store.finalizeLastMessage();
          store.sending = false;
          agenticLoopCount = 0;
        },
        onDone(_usage): void {
          store.finalizeLastMessage();
          store.sending = false;
          agenticLoopCount = 0;
          void refreshSessions();
        },
        onError(error: string): void {
          store.appendToLastMessage(`\n\n[错误: ${error}]`);
          store.finalizeLastMessage();
          store.sending = false;
          agenticLoopCount = 0;
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
      agenticLoopCount = 0;
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
      selectedElement: selectedElement.value,
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
    loadWindowState();
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
    // 收起态时 FAB 在右下角，展开时通过动画移到左上角
    animation: copilot-fab-appear 0.3s ease both;

    .copilot-fab-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow:
        0 4px 20px rgba(99, 102, 241, 0.4),
        0 0 60px rgba(139, 92, 246, 0.15);
      transition:
        transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.2),
        box-shadow 0.3s ease;

      &:hover {
        transform: scale(1.06);
        box-shadow:
          0 6px 28px rgba(99, 102, 241, 0.5),
          0 0 80px rgba(139, 92, 246, 0.22);
      }
    }

    // 外层扩散光晕
    .copilot-fab-glow {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      background: transparent;
      border: 2px solid rgba(139, 92, 246, 0.25);
      animation: copilot-fab-pulse 3s ease-in-out infinite;
      pointer-events: none;
    }

    .copilot-fab-svg {
      width: 32px;
      height: 32px;
      position: relative;
      z-index: 1;
    }
  }

  @keyframes copilot-fab-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.15);
      opacity: 1;
    }
  }

  @keyframes copilot-fab-appear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .copilot-dialog {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 99991;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
    border-radius: 12px;
    box-shadow:
      0 8px 32px rgba(99, 102, 241, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid rgba(139, 92, 246, 0.08);

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(99, 102, 241, 0.06);
      background: rgba(255, 255, 255, 0.5);
      cursor: move;
      flex-shrink: 0;
      user-select: none;
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
      gap: 4px;
    }

    // 标题行：小头像 + 标题文字
    .copilot-dialog-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    // 对话框内小头像（知音图标缩小版）
    .copilot-avatar-small {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #a855f7 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);

      svg {
        width: 14px;
        height: 14px;
      }
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

  // ---- 对话框主体 ----
  .copilot-dialog-body {
    flex: 1;
    display: flex;
    min-height: 0;
  }

  // ---- 左侧边栏 ----
  .copilot-sidebar {
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid rgba(99, 102, 241, 0.06);
    background: rgba(249, 250, 251, 0.6);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .copilot-sidebar-search {
    padding: 10px 10px 6px;
    flex-shrink: 0;
  }

  .copilot-search-input {
    width: 100%;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    outline: none;
    background: #fff;
    transition: border-color 0.2s;

    &:focus {
      border-color: #1890ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }

    &::placeholder {
      color: #bfbfbf;
    }
  }

  .copilot-sidebar-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px 8px;
    flex-shrink: 0;
  }

  // ---- 批量操作栏 ----
  .copilot-batch-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 8px;
    flex-shrink: 0;
  }

  .copilot-batch-count {
    font-size: 12px;
    color: #595959;
    flex: 1;
  }

  .copilot-batch-delete-btn {
    padding: 3px 10px;
    font-size: 12px;
    border: 1px solid #ff4d4f;
    background: #fff;
    color: #ff4d4f;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #ff4d4f;
      color: #fff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .copilot-batch-cancel-btn {
    padding: 3px 8px;
    font-size: 12px;
    border: 1px solid #d9d9d9;
    background: #fff;
    color: #595959;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #1890ff;
      color: #1890ff;
    }
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
    flex: 1;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .copilot-session-text-btn {
    border: 1px solid #d9d9d9;
    background: #fff;
    color: #595959;
    padding: 4px 8px;
    font-size: 14px;
    line-height: 1;

    &.active {
      background: #e6f7ff;
      border-color: #1890ff;
      color: #1890ff;
    }
  }

  .copilot-session-empty {
    font-size: 12px;
    color: #999;
    padding: 16px 10px;
    text-align: center;
  }

  .copilot-session-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    padding: 0 8px 8px;
  }

  .copilot-session-item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    width: 100%;
    border: 1px solid #e8e8e8;
    background: #fff;
    border-radius: 8px;
    padding: 8px 10px;
    transition: all 0.2s;

    &:hover {
      border-color: #91d5ff;
      background: #f6ffed;
    }

    &.active {
      border-color: #1890ff;
      background: #e6f7ff;
    }
  }

  .copilot-session-checkbox {
    flex-shrink: 0;
    padding-top: 2px;
    cursor: pointer;

    input[type='checkbox'] {
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: #1890ff;
    }
  }

  .copilot-session-item-content {
    flex: 1;
    min-width: 0;
    text-align: left;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    font-family: inherit;

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
    font-size: 14px;
    color: #ff4d4f;
    flex-shrink: 0;
    line-height: 1;
    cursor: pointer;
  }

  // ---- 已选中元素上下文标签（显示在标题下方） ----
  .copilot-context-tag {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: #f0f5ff;
    border: 1px solid #adc6ff;
    border-radius: 4px;
    padding: 1px 4px 1px 8px;
    font-size: 12px;
    max-width: 240px;

    &-label {
      color: #1d39c4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &-clear {
      flex-shrink: 0;
      background: none;
      border: none;
      color: #597ef7;
      font-size: 14px;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;

      &:hover {
        color: #ff4d4f;
      }
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
