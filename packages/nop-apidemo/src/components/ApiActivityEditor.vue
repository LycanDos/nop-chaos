<template>
  <div class="api-activity-editor">
    <div class="editor-header">
      <h2>{{ isEdit ? '编辑API活动' : '新建API活动' }}</h2>
      <div class="header-actions">
        <button @click="testRequest" :disabled="testing" class="btn btn-test">
          {{ testing ? '测试中...' : '测试请求' }}
        </button>
        <button @click="generateCurl" class="btn btn-secondary">
          复制Curl
        </button>
        <button @click="openInHoppscotch" class="btn btn-primary">
          在Hoppscotch中打开
        </button>
        <button @click="save" class="btn btn-success">
          保存
        </button>
      </div>
    </div>

    <div class="editor-content">
      <!-- 基本信息 -->
      <section class="editor-section">
        <h3>基本信息</h3>
        <div class="form-group">
          <label>活动名称 *</label>
          <input
            v-model="formData.name"
            type="text"
            placeholder="请输入活动名称"
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label>描述</label>
          <textarea
            v-model="formData.description"
            rows="2"
            placeholder="请输入描述"
            class="form-control"
          />
        </div>

        <div class="form-group">
          <label>类型</label>
          <select v-model="formData.type" class="form-control">
            <option value="http">HTTP</option>
            <option value="graphql">GraphQL</option>
            <option value="grpc">gRPC</option>
          </select>
        </div>
      </section>

      <!-- 请求配置 -->
      <section class="editor-section">
        <h3>请求配置</h3>

        <div class="form-group">
          <label>请求方法</label>
          <select v-model="formData.request.method" class="form-control">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
            <option value="HEAD">HEAD</option>
            <option value="OPTIONS">OPTIONS</option>
          </select>
        </div>

        <div class="form-group">
          <label>请求URL *</label>
          <input
            v-model="formData.request.url"
            type="text"
            placeholder="https://api.example.com/endpoint"
            class="form-control"
          />
        </div>

        <!-- Headers -->
        <div class="form-group">
          <label>请求头</label>
          <div class="key-value-editor">
            <div v-for="(header, index) in formData.request.headers" :key="index" class="kv-row">
              <input
                v-model="header.key"
                type="text"
                placeholder="Key"
                class="kv-key"
              />
              <input
                v-model="header.value"
                type="text"
                placeholder="Value"
                class="kv-value"
              />
              <label class="kv-enabled">
                <input type="checkbox" v-model="header.enabled" />
                启用
              </label>
              <button @click="removeHeader(index)" class="btn-remove">删除</button>
            </div>
            <button @click="addHeader" class="btn btn-small">+ 添加Header</button>
          </div>
        </div>

        <!-- Query Params -->
        <div class="form-group">
          <label>查询参数</label>
          <div class="key-value-editor">
            <div v-for="(param, index) in formData.request.queryParams" :key="index" class="kv-row">
              <input
                v-model="param.key"
                type="text"
                placeholder="Key"
                class="kv-key"
              />
              <input
                v-model="param.value"
                type="text"
                placeholder="Value"
                class="kv-value"
              />
              <label class="kv-enabled">
                <input type="checkbox" v-model="param.enabled" />
                启用
              </label>
              <button @click="removeQueryParam(index)" class="btn-remove">删除</button>
            </div>
            <button @click="addQueryParam" class="btn btn-small">+ 添加参数</button>
          </div>
        </div>

        <!-- Body -->
        <div class="form-group">
          <label>请求体</label>
          <select v-model="formData.request.body.type" class="form-control" style="margin-bottom: 10px;">
            <option value="none">None</option>
            <option value="raw">JSON / Raw</option>
            <option value="form-data">Form Data</option>
            <option value="x-www-form-urlencoded">x-www-form-urlencoded</option>
            <option value="graphql">GraphQL</option>
          </select>

          <textarea
            v-if="formData.request.body.type === 'raw'"
            v-model="formData.request.body.rawData"
            rows="8"
            placeholder='{"key": "value"}'
            class="form-control code-editor"
          />

          <div v-if="formData.request.body.type === 'graphql'">
            <textarea
              v-model="formData.request.body.graphqlQuery"
              rows="6"
              placeholder="query { ... }"
              class="form-control code-editor"
            />
            <textarea
              v-model="formData.request.body.graphqlVariables"
              rows="4"
              placeholder='{"variable": "value"}'
              class="form-control code-editor"
              style="margin-top: 10px;"
            />
          </div>
        </div>

        <!-- 认证 -->
        <div class="form-group">
          <label>认证方式</label>
          <select v-model="formData.request.auth.type" class="form-control">
            <option value="none">None</option>
            <option value="basic">Basic Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="api-key">API Key</option>
            <option value="oauth2">OAuth 2.0</option>
          </select>

          <!-- Basic Auth -->
          <div v-if="formData.request.auth.type === 'basic'" class="auth-config">
            <input
              v-model="formData.request.auth.basic.username"
              type="text"
              placeholder="Username"
              class="form-control"
              style="margin-top: 10px;"
            />
            <input
              v-model="formData.request.auth.basic.password"
              type="password"
              placeholder="Password"
              class="form-control"
              style="margin-top: 10px;"
            />
          </div>

          <!-- Bearer Token -->
          <div v-if="formData.request.auth.type === 'bearer'" class="auth-config">
            <input
              v-model="formData.request.auth.bearer.token"
              type="text"
              placeholder="Bearer token"
              class="form-control"
              style="margin-top: 10px;"
            />
            <input
              v-model="formData.request.auth.bearer.prefix"
              type="text"
              placeholder="Prefix (默认: Bearer)"
              class="form-control"
              style="margin-top: 10px;"
            />
          </div>

          <!-- API Key -->
          <div v-if="formData.request.auth.type === 'api-key'" class="auth-config">
            <input
              v-model="formData.request.auth.apiKey.key"
              type="text"
              placeholder="Key"
              class="form-control"
              style="margin-top: 10px;"
            />
            <input
              v-model="formData.request.auth.apiKey.value"
              type="text"
              placeholder="Value"
              class="form-control"
              style="margin-top: 10px;"
            />
            <select v-model="formData.request.auth.apiKey.addTo" class="form-control" style="margin-top: 10px;">
              <option value="header">Header</option>
              <option value="query-param">Query Parameter</option>
            </select>
          </div>
        </div>
      </section>

      <!-- 脚本 -->
      <section class="editor-section">
        <h3>脚本</h3>

        <div class="form-group">
          <label>预请求脚本</label>
          <textarea
            v-model="formData.preRequestScript"
            rows="6"
            placeholder="// 在请求发送前执行的JavaScript代码"
            class="form-control code-editor"
          />
        </div>

        <div class="form-group">
          <label>后请求测试</label>
          <textarea
            v-model="formData.postRequestTest"
            rows="6"
            placeholder="// 在请求完成后执行的测试代码"
            class="form-control code-editor"
          />
        </div>
      </section>
    </div>

    <!-- 测试结果对话框 -->
    <div v-if="showTestResult" class="modal-overlay" @click="showTestResult = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>测试结果</h3>
          <button @click="showTestResult = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div v-if="testResult" class="test-result">
            <div class="result-info">
              <div class="info-item">
                <label>状态码:</label>
                <span :class="['status-badge', testResult.status < 400 ? 'success' : 'error']">
                  {{ testResult.status }}
                </span>
              </div>
              <div class="info-item">
                <label>响应时间:</label>
                <span>{{ testResult.responseTime }}ms</span>
              </div>
            </div>

            <div class="result-section">
              <h4>响应头</h4>
              <pre class="response-data">{{ formatHeaders(testResult.headers) }}</pre>
            </div>

            <div class="result-section">
              <h4>响应体</h4>
              <pre class="response-data">{{ formatResponse(testResult.body) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import type { ApiActivity, Header, Param, AuthConfig } from '../types/api-activity'

const props = defineProps<{
  activityId?: string
}>()

const emit = defineEmits<{
  (e: 'saved', id: string): void
  (e: 'cancelled'): void
}>()

const isEdit = ref(!!props.activityId)
const testing = ref(false)
const showTestResult = ref(false)
const testResult = ref<any>(null)

// 初始化表单数据
const formData = reactive<ApiActivity>({
  id: '',
  name: '',
  description: '',
  type: 'http',
  version: '1.0.0',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: '',
  updatedBy: '',
  request: {
    method: 'GET',
    url: '',
    headers: [],
    queryParams: [],
    body: {
      type: 'none',
      rawData: ''
    },
    auth: {
      type: 'none',
      basic: { username: '', password: '' },
      bearer: { token: '', prefix: 'Bearer' },
      apiKey: { key: '', value: '', addTo: 'header' }
    }
  },
  preRequestScript: '',
  postRequestTest: '',
  tags: []
})

// 添加Header
const addHeader = () => {
  formData.request.headers.push({
    key: '',
    value: '',
    enabled: true
  })
}

// 删除Header
const removeHeader = (index: number) => {
  formData.request.headers.splice(index, 1)
}

// 添加Query参数
const addQueryParam = () => {
  formData.request.queryParams.push({
    key: '',
    value: '',
    enabled: true
  })
}

// 删除Query参数
const removeQueryParam = (index: number) => {
  formData.request.queryParams.splice(index, 1)
}

// 测试请求
const testRequest = async () => {
  if (!formData.request.url) {
    alert('请输入请求URL')
    return
  }

  testing.value = true
  try {
    // 如果有ID,使用后端测试接口
    if (formData.id) {
      const response = await fetch(`/api/bpmn/activity/${formData.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      if (result.success) {
        testResult.value = result.data
        showTestResult.value = true
      } else {
        alert('测试失败: ' + result.message)
      }
    } else {
      // 临时保存后测试
      const tempId = await saveActivity()
      if (tempId) {
        const response = await fetch(`/api/bpmn/activity/${tempId}/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        const result = await response.json()
        if (result.success) {
          testResult.value = result.data
          showTestResult.value = true
        }
      }
    }
  } catch (error) {
    console.error('测试失败:', error)
    alert('测试失败: ' + error)
  } finally {
    testing.value = false
  }
}

// 生成Curl命令
const generateCurl = async () => {
  if (!formData.id) {
    alert('请先保存活动')
    return
  }

  try {
    const response = await fetch(`/api/bpmn/activity/${formData.id}/curl`)
    const result = await response.json()
    if (result.success) {
      await navigator.clipboard.writeText(result.data.curl)
      alert('Curl命令已复制到剪贴板')
    } else {
      alert('生成Curl失败: ' + result.message)
    }
  } catch (error) {
    console.error('生成Curl失败:', error)
    alert('生成Curl失败: ' + error)
  }
}

// 在Hoppscotch中打开
const openInHoppscotch = async () => {
  if (!formData.id) {
    alert('请先保存活动')
    return
  }

  try {
    const response = await fetch(`/api/bpmn/activity/${formData.id}/share-link`)
    const result = await response.json()
    if (result.success) {
      window.open(result.data.shareLink, '_blank')
    } else {
      alert('生成分享链接失败: ' + result.message)
    }
  } catch (error) {
    console.error('生成分享链接失败:', error)
    alert('生成分享链接失败: ' + error)
  }
}

// 保存活动
const saveActivity = async (): Promise<string | null> => {
  if (!formData.name) {
    alert('请输入活动名称')
    return null
  }

  if (!formData.request.url) {
    alert('请输入请求URL')
    return null
  }

  try {
    const url = props.activityId
      ? `/api/bpmn/activity/${props.activityId}`
      : '/api/bpmn/activity'
    const method = props.activityId ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    const result = await response.json()
    if (result.success) {
      const id = result.data?.id || props.activityId
      if (id) {
        formData.id = id
      }
      return id || null
    } else {
      alert('保存失败: ' + result.message)
      return null
    }
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败: ' + error)
    return null
  }
}

// 保存
const save = async () => {
  const id = await saveActivity()
  if (id) {
    alert('保存成功')
    emit('saved', id)
  }
}

// 格式化响应
const formatResponse = (body: string) => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

// 格式化响应头
const formatHeaders = (headers: Record<string, string>) => {
  return Object.entries(headers)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
}

// 加载数据
onMounted(async () => {
  if (props.activityId) {
    try {
      const response = await fetch(`/api/bpmn/activity/${props.activityId}`)
      const result = await response.json()
      if (result.success && result.data) {
        Object.assign(formData, result.data)

        // 确保嵌套对象存在
        if (!formData.request.body) {
          formData.request.body = { type: 'none', rawData: '' }
        }
        if (!formData.request.auth) {
          formData.request.auth = {
            type: 'none',
            basic: { username: '', password: '' },
            bearer: { token: '', prefix: 'Bearer' },
            apiKey: { key: '', value: '', addTo: 'header' }
          }
        }
        if (!formData.request.headers) {
          formData.request.headers = []
        }
        if (!formData.request.queryParams) {
          formData.request.queryParams = []
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      alert('加载数据失败: ' + error)
    }
  }
})
</script>

<style scoped>
.api-activity-editor {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.editor-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn:hover {
  opacity: 0.8;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-test {
  background: #2196F3;
  color: white;
}

.btn-secondary {
  background: #757575;
  color: white;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-success {
  background: #FF9800;
  color: white;
}

.btn-small {
  padding: 6px 12px;
  font-size: 13px;
  background: #e0e0e0;
  color: #333;
}

.editor-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.editor-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.editor-section h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #4CAF50;
  padding-bottom: 10px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #4CAF50;
}

.code-editor {
  font-family: 'Courier New', monospace;
  background: #f5f5f5;
}

.key-value-editor {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  background: #fafafa;
}

.kv-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.kv-key {
  flex: 0 0 30%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.kv-value {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.kv-enabled {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.btn-remove {
  padding: 6px 12px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-remove:hover {
  background: #d32f2f;
}

.auth-config {
  margin-top: 10px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
}

.btn-close {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: #999;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
}

.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.test-result {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-info {
  display: flex;
  gap: 30px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-item label {
  font-weight: 500;
  color: #666;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
  font-size: 14px;
}

.status-badge.success {
  background: #4CAF50;
  color: white;
}

.status-badge.error {
  background: #f44336;
  color: white;
}

.result-section h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.response-data {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  max-height: 300px;
  overflow: auto;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
