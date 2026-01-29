<template>
  <div class="hoppscotch-panel">
    <el-card class="hoppscotch-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Connection /></el-icon>
            API 测试工具
          </span>
          <div class="header-actions">
            <el-button-group>
              <el-button 
                size="small" 
                :type="activeTab === 'request' ? 'primary' : 'default'"
                @click="activeTab = 'request'"
              >
                请求
              </el-button>
              <el-button 
                size="small" 
                :type="activeTab === 'collections' ? 'primary' : 'default'"
                @click="activeTab = 'collections'"
              >
                集合
              </el-button>
              <el-button 
                size="small" 
                :type="activeTab === 'environments' ? 'primary' : 'default'"
                @click="activeTab = 'environments'"
              >
                环境
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <!-- 请求面板 -->
      <div v-if="activeTab === 'request'" class="request-panel">
        <el-form :model="requestForm" label-width="80px">
          <el-form-item label="方法">
            <el-select v-model="requestForm.method" style="width: 120px">
              <el-option label="GET" value="GET" />
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="DELETE" value="DELETE" />
              <el-option label="PATCH" value="PATCH" />
              <el-option label="HEAD" value="HEAD" />
              <el-option label="OPTIONS" value="OPTIONS" />
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
                v-for="(_, key) in requestForm.headers"
                :key="key"
                class="header-row"
              >
                <el-input 
                  v-model="headerKeys[key]" 
                  placeholder="Header Key"
                  style="width: 40%"
                />
                <el-input 
                  v-model="requestForm.headers![key]"
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

          <el-form-item label="参数">
            <el-tabs v-model="paramsTab">
              <el-tab-pane label="Query" name="query">
                <div class="params-editor">
                  <div
                    v-for="(_, key) in requestForm.params"
                    :key="key"
                    class="param-row"
                  >
                    <el-input 
                      v-model="paramKeys[key]" 
                      placeholder="Param Key"
                      style="width: 40%"
                    />
                    <el-input 
                      v-model="requestForm.params![key]"
                      placeholder="Param Value"
                      style="width: 40%"
                    />
                    <el-button 
                      type="danger" 
                      size="small"
                      @click="removeParam(key)"
                    >
                      删除
                    </el-button>
                  </div>
                  <el-button type="primary" size="small" @click="addParam">
                    添加参数
                  </el-button>
                </div>
              </el-tab-pane>
              <el-tab-pane label="Body" name="body">
                <el-input
                  v-model="requestForm.data"
                  type="textarea"
                  :rows="8"
                  placeholder="请输入请求体数据（JSON格式）"
                />
              </el-tab-pane>
            </el-tabs>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="sendRequest" :loading="loading">
              发送请求
            </el-button>
            <el-button @click="saveToCollection">保存到集合</el-button>
          </el-form-item>
        </el-form>

        <!-- 响应结果 -->
        <div v-if="response" class="response-panel">
          <h4>响应结果</h4>
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

          <el-tabs v-model="responseTab">
            <el-tab-pane label="响应体" name="body">
              <el-input
                v-model="responseBody"
                type="textarea"
                :rows="10"
                readonly
              />
            </el-tab-pane>
            <el-tab-pane label="响应头" name="headers">
              <el-input
                v-model="responseHeaders"
                type="textarea"
                :rows="10"
                readonly
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <!-- 集合面板 -->
      <div v-if="activeTab === 'collections'" class="collections-panel">
        <div class="collections-header">
          <h4>API集合</h4>
          <el-button type="primary" size="small" @click="createCollection">
            新建集合
          </el-button>
        </div>

        <el-table :data="collections" style="width: 100%">
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="requests.length" label="请求数量" width="100" />
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button size="small" @click="viewCollection(scope.row)">
                查看
              </el-button>
              <el-button size="small" type="danger" @click="deleteCollection(scope.row.id)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 环境面板 -->
      <div v-if="activeTab === 'environments'" class="environments-panel">
        <div class="environments-header">
          <h4>环境变量</h4>
          <el-button type="primary" size="small" @click="createEnvironment">
            新建环境
          </el-button>
        </div>

        <el-table :data="environments" style="width: 100%">
          <el-table-column prop="name" label="名称" />
          <el-table-column label="变量数量" width="100">
            <template #default="scope">
              {{ Object.keys(scope.row.variables).length }}
            </template>
          </el-table-column>
          <el-table-column label="默认" width="80">
            <template #default="scope">
              <el-tag v-if="scope.row.isDefault" type="success">默认</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button size="small" @click="setEnvironment(scope.row.id)">
                切换
              </el-button>
              <el-button size="small" type="danger" @click="deleteEnvironment(scope.row.id)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { HoppscotchClient } from '../core/HoppscotchClient'
import type { ApiRequest, ApiResponse, Environment, Collection } from '../types'

// Props
const props = defineProps<{
  client?: HoppscotchClient
}>()

// Emits
const emit = defineEmits<{
  request: [request: ApiRequest]
  response: [response: ApiResponse]
  error: [error: any]
}>()

// 响应式数据
const activeTab = ref('request')
const loading = ref(false)
const response = ref<ApiResponse | null>(null)
const responseTime = ref(0)
const responseTab = ref('body')
const paramsTab = ref('query')

// 请求表单
const requestForm = reactive<ApiRequest>({
  method: 'GET',
  url: '',
  headers: {} as Record<string, string>,
  params: {} as Record<string, any>,
  data: '',
  timeout: 10000
})

// 动态键值对管理
const headerKeys = reactive<Record<string, string>>({})
const paramKeys = reactive<Record<string, string>>({})

// 计算属性
const responseBody = computed(() => {
  if (!response.value) return ''
  return typeof response.value.data === 'string' 
    ? response.value.data 
    : JSON.stringify(response.value.data, null, 2)
})

const responseHeaders = computed(() => {
  if (!response.value) return ''
  return JSON.stringify(response.value.headers, null, 2)
})

const collections = ref<Collection[]>([])
const environments = ref<Environment[]>([])

// 方法
const addHeader = () => {
  const key = `header_${Date.now()}`
  headerKeys[key] = ''
  requestForm.headers![key] = ''
}

const removeHeader = (key: string) => {
  delete headerKeys[key]
  delete requestForm.headers![key]
}

const addParam = () => {
  const key = `param_${Date.now()}`
  paramKeys[key] = ''
  requestForm.params![key] = ''
}

const removeParam = (key: string) => {
  delete paramKeys[key]
  delete requestForm.params![key]
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
      if (headerKey && requestForm.headers && requestForm.headers[key]) {
        headers[headerKey] = requestForm.headers[key]
      }
    })

    const params: Record<string, any> = {}
    Object.entries(paramKeys).forEach(([key, paramKey]) => {
      if (paramKey && requestForm.params && requestForm.params[key]) {
        params[paramKey] = requestForm.params[key]
      }
    })

    const request: ApiRequest = {
      method: requestForm.method,
      url: requestForm.url,
      headers,
      params,
      data: requestForm.data ? JSON.parse(requestForm.data) : undefined,
      timeout: requestForm.timeout
    }

    emit('request', request)

    if (props.client) {
      const result = await props.client.sendRequest(request)
      response.value = result
      responseTime.value = Date.now() - startTime
      emit('response', result)
      ElMessage.success('请求发送成功')
    }
  } catch (error: any) {
    ElMessage.error(`请求失败: ${error.message}`)
    emit('error', error)
  } finally {
    loading.value = false
  }
}

const saveToCollection = () => {
  // 实现保存到集合的逻辑
  ElMessage.info('保存到集合功能待实现')
}

const createCollection = () => {
  // 实现创建集合的逻辑
  ElMessage.info('创建集合功能待实现')
}

const viewCollection = (_collection: Collection) => {
  // 实现查看集合的逻辑
  ElMessage.info('查看集合功能待实现')
}

const deleteCollection = (_id: string) => {
  // 实现删除集合的逻辑
  ElMessage.info('删除集合功能待实现')
}

const createEnvironment = () => {
  // 实现创建环境的逻辑
  ElMessage.info('创建环境功能待实现')
}

const setEnvironment = (id: string) => {
  if (props.client) {
    props.client.setEnvironment(id)
    ElMessage.success('环境切换成功')
  }
}

const deleteEnvironment = (_id: string) => {
  // 实现删除环境的逻辑
  ElMessage.info('删除环境功能待实现')
}

// 生命周期
onMounted(() => {
  // 初始化默认数据
  addHeader()
  addParam()
})
</script>

<style scoped>
.hoppscotch-panel {
  width: 100%;
  height: 100%;
}

.hoppscotch-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.headers-editor,
.params-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background-color: #fafafa;
}

.header-row,
.param-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.response-panel {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #dcdfe6;
}

.collections-header,
.environments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.collections-header h4,
.environments-header h4 {
  margin: 0;
}
</style> 