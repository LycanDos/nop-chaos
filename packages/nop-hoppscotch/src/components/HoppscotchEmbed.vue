/**
 * Hoppscotch 嵌入组件
 * 通过 iframe 嵌入 Hoppscotch，使用 postMessage 通信
 */
<template>
  <div class="hoppscotch-embed">
    <div v-if="loading" class="loading-overlay">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
      <span>加载 Hoppscotch...</span>
    </div>

    <iframe
      ref="iframeRef"
      :src="hoppscotchUrl"
      class="hoppscotch-iframe"
      @load="handleIframeLoad"
      frameborder="0"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useHoppscotchBridge } from '../composables/useHoppscotchBridge'
import type { ApiRequestConfig } from '../types'

interface Props {
  hoppscotchUrl: string
  initialConfig?: Partial<ApiRequestConfig>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  ready: []
  error: [error: string]
}>()

const loading = ref(true)

const bridge = useHoppscotchBridge(props.hoppscotchUrl)

/**
 * iframe 加载完成
 */
const handleIframeLoad = async () => {
  try {
    // 初始化 Hoppscotch
    await bridge.init(props.initialConfig)
    loading.value = false
    emit('ready')
  } catch (error) {
    loading.value = false
    const errorMsg = error instanceof Error ? error.message : String(error)
    emit('error', errorMsg)
  }
}

/**
 * 暴露方法给父组件
 */
defineExpose({
  getConfig: bridge.getConfig,
  updateConfig: bridge.updateConfig,
  getCurl: bridge.getCurl,
  getShareUrl: bridge.getShareUrl,
  testRequest: bridge.testRequest
})
</script>

<style scoped>
.hoppscotch-embed {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.hoppscotch-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.loading-overlay span {
  color: #606266;
  font-size: 14px;
}
</style>