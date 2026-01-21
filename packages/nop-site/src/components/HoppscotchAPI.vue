<template>
  <div class="hoppscotch-api">
    <div class="api-header">
      <h2>API测试工具</h2>
    </div>

    <div class="api-content">
      <!-- URL输入 -->
      <div class="url-section">
        <el-input
          v-model="requestUrl"
          placeholder="请输入API URL"
          @keyup.enter="sendRequest"
        >
          <template #prepend>
            <el-select v-model="currentMethod" style="width: 100px">
              <el-option 
                v-for="method in httpMethods" 
                :key="method" 
                :label="method" 
                :value="method" 
              />
            </el-select>
          </template>
          <template #append>
            <el-button type="primary" @click="sendRequest" :loading="loading">
              发送
            </el-button>
          </template>
        </el-input>
      </div>

      <!-- 响应结果 -->
      <div v-if="response" class="response-section">
        <h3>响应结果</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="状态码">
            <el-tag :type="response.status < 400 ? 'success' : 'danger'">
              {{ response.status }} {{ response.statusText }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">
            {{ responseTime }}ms
          </el-descriptions-item>
        </el-descriptions>

        <el-input
          v-model="responseBody"
          type="textarea"
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
import { ElMessage } from 'element-plus'
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
    ElMessage.warning('请输入请求URL')
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
    ElMessage.success('请求发送成功')
  } catch (error: any) {
    if (error.response) {
      response.value = error.response
      responseTime.value = Date.now() - startTime
      ElMessage.warning(`请求失败: ${error.response.status}`)
    } else {
      ElMessage.error(`请求失败: ${error.message}`)
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