<template>
  <div class="advanced-api-tester">
    <div class="tester-header">
      <h2>高级API测试工具</h2>
    </div>

    <div class="tester-content">
      <!-- 接口选择 -->
      <div class="api-selector">
        <el-select 
          v-model="selectedApi" 
          placeholder="选择预定义接口"
          style="width: 100%"
          @change="loadApiConfig"
        >
          <el-option 
            v-for="api in predefinedApis" 
            :key="api.id" 
            :label="api.name" 
            :value="api.id" 
          />
        </el-select>
      </div>

      <!-- 请求配置 -->
      <div class="request-config">
        <el-form :model="requestForm" label-width="80px">
          <el-form-item label="方法">
            <el-select v-model="requestForm.method" style="width: 120px">
              <el-option 
                v-for="method in httpMethods" 
                :key="method" 
                :label="method" 
                :value="method" 
              />
            </el-select>
          </el-form-item>

          <el-form-item label="URL">
            <el-input 
              v-model="requestForm.url" 
              placeholder="请输入请求URL"
              @keyup.enter="sendRequest"
            />
          </el-form-item>

          <el-form-item label="Headers">
            <div class="headers-editor">
              <div 
                v-for="(value, key) in requestForm.headers" 
                :key="key"
                class="header-row"
              >
                <el-input 
                  v-model="headerKeys[key]" 
                  placeholder="Header Key"
                  style="width: 40%"
                />
                <el-input 
                  v-model="requestForm.headers[key]" 
                  placeholder="Header Value"
                  style="width: 40%"
                />
                <el-button 
                  type="danger" 
                  size="small"
                  @click="removeHeader(key)"
                >
                  删除
                </el-button>
              </div>
              <el-button type="primary" size="small" @click="addHeader">
                添加Header
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="Body">
            <el-input
              v-model="requestForm.data"
              type="textarea"
              :rows="8"
              placeholder="请输入请求体数据（JSON格式）"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="sendRequest" :loading="loading">
              发送请求
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 响应结果 -->
      <div v-if="response" class="response-panel">
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
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

// 响应式数据
const selectedApi = ref('')
const loading = ref(false)
const response = ref<any>(null)
const responseTime = ref(0)

// 请求表单
const requestForm = reactive({
  method: 'GET',
  url: '',
  headers: {} as Record<string, string>,
  data: ''
})

// 动态键值对管理
const headerKeys = reactive<Record<string, string>>({})

// HTTP方法
const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

// 预定义接口
const predefinedApis = ref([
  {
    id: 'user-list',
    name: '用户列表',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users',
    headers: {
      'Content-Type': 'application/json'
    },
    data: ''
  },
  {
    id: 'user-detail',
    name: '用户详情',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users/1',
    headers: {
      'Content-Type': 'application/json'
    },
    data: ''
  },
  {
    id: 'create-user',
    name: '创建用户',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/users',
    headers: {
      'Content-Type': 'application/json'
    },
    data: JSON.stringify({
      name: 'John Doe',
      email: 'john@example.com'
    }, null, 2)
  },
  {
    id: 'graphql-example',
    name: 'GraphQL示例',
    method: 'POST',
    url: 'https://api.github.com/graphql',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    data: JSON.stringify({
      query: `
        query {
          viewer {
            login
            name
          }
        }
      `
    }, null, 2)
  }
])

// 计算属性
const responseBody = computed(() => {
  if (!response.value) return ''
  return typeof response.value.data === 'string' 
    ? response.value.data 
    : JSON.stringify(response.value.data, null, 2)
})

// 方法
const loadApiConfig = () => {
  const api = predefinedApis.value.find(a => a.id === selectedApi.value)
  if (api) {
    requestForm.method = api.method
    requestForm.url = api.url
    requestForm.data = api.data || ''
    
    // 清空当前配置
    Object.keys(requestForm.headers).forEach(key => delete requestForm.headers[key])
    Object.keys(headerKeys).forEach(key => delete headerKeys[key])
    
    // 加载配置
    Object.entries(api.headers || {}).forEach(([key, value]) => {
      const headerKey = `header_${Date.now()}_${key}`
      headerKeys[headerKey] = key
      requestForm.headers[headerKey] = value as string
    })
  }
}

const addHeader = () => {
  const key = `header_${Date.now()}`
  headerKeys[key] = ''
  requestForm.headers[key] = ''
}

const removeHeader = (key: string) => {
  delete headerKeys[key]
  delete requestForm.headers[key]
}

const sendRequest = async () => {
  if (!requestForm.url) {
    ElMessage.warning('请输入请求URL')
    return
  }

  loading.value = true
  const startTime = Date.now()

  try {
    // 处理动态键值对
    const headers: Record<string, string> = {}
    Object.entries(headerKeys).forEach(([key, headerKey]) => {
      if (headerKey && requestForm.headers[key]) {
        headers[headerKey] = requestForm.headers[key]
      }
    })

    const config: any = {
      method: requestForm.method,
      url: requestForm.url,
      headers,
      timeout: 10000
    }

    if (requestForm.data && ['POST', 'PUT', 'PATCH'].includes(requestForm.method)) {
      try {
        config.data = JSON.parse(requestForm.data)
      } catch (error) {
        config.data = requestForm.data
      }
    }

    const result = await axios(config)
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
.advanced-api-tester {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.tester-header {
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tester-header h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.tester-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.api-selector {
  margin-bottom: 20px;
}

.request-config {
  margin-bottom: 20px;
}

.headers-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background-color: #fafafa;
}

.header-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.response-panel {
  margin-top: 20px;
}

.response-panel h3 {
  margin: 0 0 15px 0;
  color: #303133;
}
</style> 