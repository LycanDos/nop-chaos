<!--
  通用微前端编辑器弹窗包装器

  纯 div 实现右侧滑出面板，不依赖 el-drawer。
  接收 editorUrl + configJson，通过标准的 executor-plugin-spec 桥接协议与 iframe 通信。
  保存时 emit('save', configJson) 供父组件写回 executorConfigJson。
-->
<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useExecutorEditorBridge } from '@/hooks/useExecutorEditorBridge.ts'

const props = defineProps<{
  visible: boolean
  editorUrl: string
  pluginName: string
  configJson?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'save', configJson: string): void
}>()

function handleClose() {
  emit('update:visible', false)
}

const iframeRef = ref<HTMLIFrameElement | null>(null)

const parsedConfig = computed(() => {
  if (!props.configJson) return {}
  try {
    return JSON.parse(props.configJson)
  } catch {
    return {}
  }
})

const panelWidth = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth < 1200) {
    return '95%'
  }
  return '85%'
})

const bridge = useExecutorEditorBridge({
  iframeRef,
  surfaceId: 'request',
  // 使用 getter 延迟求值，确保 init() 调用时取到最新 parsedConfig
  config: () => parsedConfig.value,
  waitForLoad: true,
  onSaved: (config) => {
    emit('save', JSON.stringify(config))
    emit('update:visible', false)
  },
  onCanceled: () => {
    emit('update:visible', false)
  },
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      nextTick(() => bridge.init())
    }
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-show="visible" class="drawer-wrapper">
      <div class="drawer-overlay" @click.self="handleClose" />
      <div class="drawer-panel" :style="{ width: panelWidth }">
        <div class="drawer-body">
          <iframe
            ref="iframeRef"
            :src="editorUrl"
            class="editor-iframe"
            frameborder="0"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer-wrapper {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  justify-content: flex-end;
}

.drawer-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.drawer-panel {
  position: relative;
  height: 100%;
  background: var(--el-bg-color, #fff);
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-iframe {
  width: 100%;
  height: 100%;
  border: none;
  flex: 1;
}
</style>
