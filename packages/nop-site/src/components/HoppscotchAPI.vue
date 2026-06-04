<template>
  <div class="hoppscotch-api">
    <div class="api-header">
      <h2>API测试工具</h2>
    </div>

    <div class="api-content">
      <!-- URL输入 -->
      <div class="url-section">
        <a-input
          v-model:value="requestUrl"
          placeholder="请输入API URL"
          @keyup.enter="sendRequest"
        >
          <template #addonBefore>
            <a-select v-model:value="currentMethod" style="width: 100px">
              <a-select-option
                v-for="method in httpMethods"
                :key="method"
                :value="method"
              >{{ method }}</a-select-option>
            </a-select>
          </template>
          <template #addonAfter>
            <a-button type="primary" @click="sendRequest" :loading="loading">
              发送
            </a-button>
          </template>
        </a-input>
      </div>

      <!-- 响应结果 -->
      <div v-if="response" class="response-section">
        <h3>响应结果</h3>
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="状态码">
            <a-tag :color="response.status < 400 ? 'success' : 'error'">
              {{ response.status }} {{ response.statusText }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="响应时间">
            {{ responseTime }}ms
          </a-descriptions-item>
        </a-descriptions>

        <a-textarea
          v-model:value="responseBody"
          :rows="15"
          readonly
          placeholder="响应内容将显示在这里"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import axios from 'axios'

// 响应式数据
const currentMethod = ref('GET')
const requestUrl = ref('')
const loading = ref(false)
const response = ref<any>(null)
const responseTime = ref(0)

// HTTP方法
const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

// 计算属性
const responseBody = computed(() => {
  if (!response.value) return ''
  return typeof response.value.data === 'string' 
    ? response.value.data 
    : JSON.stringify(response.value.data, null, 2)
})

// 方法
const sendRequest = async () => {
  if (!requestUrl.value) {
    message.warning('请输入请求URL')
    return
  }

  loading.value = true
  const startTime = Date.now()

  try {
    const result = await axios({
      method: currentMethod.value,
      url: requestUrl.value,
      timeout: 10000
    })
    
    response.value = result
    responseTime.value = Date.now() - startTime
    message.success('请求发送成功')
  } catch (error: any) {
    if (error.response) {
      response.value = error.response
      responseTime.value = Date.now() - startTime
      message.warning(`请求失败: ${error.response.status}`)
    } else {
      message.error(`请求失败: ${error.message}`)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.hoppscotch-api {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.api-header {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.api-header h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.api-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.url-section {
  margin-bottom: 20px;
}

.response-section {
  margin-top: 20px;
}

.response-section h3 {
  margin: 0 0 15px 0;
  color: #303133;
}
</style> 