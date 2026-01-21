<template>
  <div class="hoppscotch-demo">
    <el-container>
      <el-header>
        <h1>Nop Hoppscotch 演示</h1>
      </el-header>
      
      <el-main>
        <HoppscotchPanel 
          :client="hoppscotchClient"
          @request="handleRequest"
          @response="handleResponse"
          @error="handleError"
        />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { HoppscotchClient, HoppscotchPanel } from '../src/index'
import type { ApiRequest, ApiResponse } from '../src/types'

// 创建Hoppscotch客户端实例
const hoppscotchClient = new HoppscotchClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 10000,
  defaultHeaders: {
    'Content-Type': 'application/json'
  },
  environments: [
    {
      id: 'dev',
      name: '开发环境',
      variables: {
        baseUrl: 'https://jsonplaceholder.typicode.com',
        apiKey: 'dev-api-key'
      },
      isDefault: true
    },
    {
      id: 'prod',
      name: '生产环境',
      variables: {
        baseUrl: 'https://api.example.com',
        apiKey: 'prod-api-key'
      }
    }
  ]
})

// 事件处理
const handleRequest = (request: ApiRequest) => {
  console.log('发送请求:', request)
  ElMessage.info(`发送 ${request.method} 请求到 ${request.url}`)
}

const handleResponse = (response: ApiResponse) => {
  console.log('收到响应:', response)
  ElMessage.success(`请求成功，状态码: ${response.status}`)
}

const handleError = (error: any) => {
  console.error('请求错误:', error)
  ElMessage.error(`请求失败: ${error.message}`)
}

// 生命周期
onMounted(() => {
  // 监听客户端事件
  hoppscotchClient.on('request', (event) => {
    console.log('客户端事件 - 请求:', event)
  })

  hoppscotchClient.on('response', (event) => {
    console.log('客户端事件 - 响应:', event)
  })

  hoppscotchClient.on('error', (event) => {
    console.error('客户端事件 - 错误:', event)
  })

  hoppscotchClient.on('environment-change', (event) => {
    console.log('客户端事件 - 环境切换:', event)
    ElMessage.success(`切换到环境: ${event.data.name}`)
  })
})
</script>

<style scoped>
.hoppscotch-demo {
  height: 100vh;
  background-color: #f5f5f5;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.el-header h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.el-main {
  padding: 20px;
  height: calc(100vh - 60px);
}
</style> 