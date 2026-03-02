<template>
  <div class="hoppscotch-config-editor">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>API 请求配置</span>
          <div class="header-actions">
            <el-button @click="testRequest" :loading="testing">
              <el-icon><VideoPlay /></el-icon> 测试请求
            </el-button>
            <el-button @click="copyCurl" :loading="generatingCurl">
              <el-icon><DocumentCopy /></el-icon> 复制 Curl
            </el-button>
            <el-button @click="openInHoppscotch" type="primary">
              <el-icon><Link /></el-icon> 在 Hoppscotch 中打开
            </el-button>
            <el-button @click="saveConfig" type="success">
              <el-icon><Check /></el-icon> 保存配置
            </el-button>
          </div>
        </div>
      </template>

      <!-- Hoppscotch 嵌入 -->
      <HoppscotchEmbed
        ref="hoppscotchRef"
        :hoppscotch-url="hoppscotchUrl"
        :initial-config="config"
        @ready="handleReady"
        @error="handleError"
      />

      <!-- 配置文件编辑 -->
      <el-divider>配置文件 (JSON)</el-divider>
      <el-input
        v-model="configJson"
        type="textarea"
        :rows="10"
        placeholder="API 请求配置 JSON"
        @blur="updateFromJson"
      />
    </el-card>

    <!-- 测试结果对话框 -->
    <el-dialog v-model="showTestResult" title="测试结果" width="80%">
      <div v-if="testResult">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="状态码">
            <el-tag :type="testResult.status < 400 ? 'success' : 'danger'">
              {{ testResult.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">
            {{ testResult.responseTime }}ms
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>响应体</el-divider>
        <pre class="response-body">{{ formatResponse(testResult.body) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, DocumentCopy, Link, Check } from '@element-plus/icons-vue'
import HoppscotchEmbed from './HoppscotchEmbed.vue'
import type { ApiRequestConfig } from '../types'

interface Props {
  hoppscotchUrl: string
  modelValue: ApiRequestConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: ApiRequestConfig]
  save: [config: ApiRequestConfig]
}>()

const hoppscotchRef = ref()
const testing = ref(false)
const generatingCurl = ref(false)
const showTestResult = ref(false)
const testResult = ref<any>(null)

const config = computed<ApiRequestConfig>({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const configJson = computed({
  get: () => JSON.stringify(config.value, null, 2),
  set: (value) => {
    try {
      const parsed = JSON.parse(value)
      emit('update:modelValue', parsed)
    } catch (error) {
      console.error('Invalid JSON:', error)
    }
  }
})

/**
 * Hoppscotch 就绪
 */
const handleReady = async () => {
  console.log('Hoppscotch ready')
}

/**
 * 处理错误
 */
const handleError = (error: string) => {
  ElMessage.error(error)
}

/**
 * 测试请求
 */
const testRequest = async () => {
  if (!hoppscotchRef.value) return

  testing.value = true
  try {
    const result = await hoppscotchRef.value.testRequest()
    testResult.value = result
    showTestResult.value = true
    ElMessage.success('请求测试成功')
  } catch (error) {
    ElMessage.error('请求测试失败')
  } finally {
    testing.value = false
  }
}

/**
 * 复制 Curl 命令
 */
const copyCurl = async () => {
  if (!hoppscotchRef.value) return

  generatingCurl.value = true
  try {
    const curl = await hoppscotchRef.value.getCurl()
    await navigator.clipboard.writeText(curl)
    ElMessage.success('Curl 命令已复制到剪贴板')
  } catch (error) {
    ElMessage.error('获取 Curl 命令失败')
  } finally {
    generatingCurl.value = false
  }
}

/**
 * 在 Hoppscotch 中打开
 */
const openInHoppscotch = async () => {
  if (!hoppscotchRef.value) return

  try {
    const shareUrl = await hoppscotchRef.value.getShareUrl()
    window.open(shareUrl, '_blank')
  } catch (error) {
    ElMessage.error('获取分享链接失败')
  }
}

/**
 * 保存配置
 */
const saveConfig = () => {
  emit('save', config.value)
  ElMessage.success('配置已保存')
}

/**
 * 从 JSON 更新
 */
const updateFromJson = () => {
  // configJson 的 setter 会自动处理
}

/**
 * 格式化响应
 */
const formatResponse = (body: string) => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}
</script>

<style scoped>
.hoppscotch-config-editor {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.response-body {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  max-height: 400px;
  overflow: auto;
}
</style>