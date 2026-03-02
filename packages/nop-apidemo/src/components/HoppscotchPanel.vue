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
import { ref, reactive, computed, onMounted, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  if (!requestForm.url) {
    ElMessage.warning('请先配置请求')
    return
  }

  // 弹出对话框让用户选择或创建集合
  ElMessageBox.prompt('请输入集合名称', '保存到集合', {
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '集合名称不能为空'
  }).then(({ value }) => {
    // 查找或创建集合
    let collection = collections.value.find(c => c.name === value)

    if (!collection) {
      collection = {
        id: `col_${Date.now()}`,
        name: value,
        description: '',
        requests: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      collections.value.push(collection)

      if (props.client) {
        props.client.addCollection(collection)
      }
    }

    // 添加请求到集合
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
      data: requestForm.data,
      timeout: requestForm.timeout
    }

    collection.requests.push(request)
    collection.updatedAt = new Date()

    // 保存到localStorage
    saveCollectionsToStorage()

    ElMessage.success(`已保存到集合: ${value}`)
  }).catch(() => {
    // 用户取消
  })
}

const createCollection = () => {
  ElMessageBox.prompt('请输入集合名称', '新建集合', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '集合名称不能为空'
  }).then(({ value }) => {
    const collection: Collection = {
      id: `col_${Date.now()}`,
      name: value,
      description: '',
      requests: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    collections.value.push(collection)

    if (props.client) {
      props.client.addCollection(collection)
    }

    saveCollectionsToStorage()

    ElMessage.success(`集合 "${value}" 创建成功`)
  }).catch(() => {
    // 用户取消
  })
}

const viewCollection = (collection: Collection) => {
  if (collection.requests.length === 0) {
    ElMessage.info('该集合中没有请求')
    return
  }

  // 显示集合中的请求列表
  ElMessageBox({
    title: `集合: ${collection.name}`,
    message: h('div', { style: 'max-height: 400px; overflow-y: auto;' }, [
      h('ul', { style: 'list-style: none; padding: 0;' },
        collection.requests.map((req, index) =>
          h('li', {
            style: 'padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;',
            onClick: () => loadRequest(req)
          }, [
            h('strong', `${req.method} `),
            h('span', req.url)
          ])
        )
      )
    ]),
    confirmButtonText: '关闭',
    showCancelButton: false
  })
}

const loadRequest = (request: ApiRequest) => {
  // 加载请求到表单
  requestForm.method = request.method
  requestForm.url = request.url
  requestForm.data = request.data
  requestForm.timeout = request.timeout || 10000

  // 清空现有的headers和params
  Object.keys(headerKeys).forEach(key => {
    delete headerKeys[key]
    delete requestForm.headers![key]
  })
  Object.keys(paramKeys).forEach(key => {
    delete paramKeys[key]
    delete requestForm.params![key]
  })

  // 加载headers
  if (request.headers) {
    Object.entries(request.headers).forEach(([key, value]) => {
      const internalKey = `header_${Date.now()}_${Math.random()}`
      headerKeys[internalKey] = key
      requestForm.headers![internalKey] = value
    })
  }

  // 加载params
  if (request.params) {
    Object.entries(request.params).forEach(([key, value]) => {
      const internalKey = `param_${Date.now()}_${Math.random()}`
      paramKeys[internalKey] = key
      requestForm.params![internalKey] = value
    })
  }

  // 切换到请求面板
  activeTab.value = 'request'

  ElMessage.success('请求已加载')
}

const deleteCollection = (id: string) => {
  ElMessageBox.confirm('确定要删除这个集合吗？', '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = collections.value.findIndex(c => c.id === id)
    if (index !== -1) {
      collections.value.splice(index, 1)
      saveCollectionsToStorage()
      ElMessage.success('集合已删除')
    }
  }).catch(() => {
    // 用户取消
  })
}

const createEnvironment = () => {
  ElMessageBox.prompt('请输入环境名称', '新建环境', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /.+/,
    inputErrorMessage: '环境名称不能为空'
  }).then(({ value }) => {
    const environment: Environment = {
      id: `env_${Date.now()}`,
      name: value,
      variables: {},
      isDefault: environments.value.length === 0
    }

    environments.value.push(environment)

    if (props.client) {
      props.client.addEnvironment(environment)
    }

    saveEnvironmentsToStorage()

    ElMessage.success(`环境 "${value}" 创建成功`)
  }).catch(() => {
    // 用户取消
  })
}

const setEnvironment = (id: string) => {
  if (props.client) {
    props.client.setEnvironment(id)

    // 更新默认标记
    environments.value.forEach(env => {
      env.isDefault = env.id === id
    })

    saveEnvironmentsToStorage()

    ElMessage.success('环境切换成功')
  }
}

const deleteEnvironment = (id: string) => {
  ElMessageBox.confirm('确定要删除这个环境吗？', '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const index = environments.value.findIndex(e => e.id === id)
    if (index !== -1) {
      environments.value.splice(index, 1)
      saveEnvironmentsToStorage()
      ElMessage.success('环境已删除')
    }
  }).catch(() => {
    // 用户取消
  })
}

// 存储管理
const saveCollectionsToStorage = () => {
  try {
    localStorage.setItem('hoppscotch_collections', JSON.stringify(collections.value))
  } catch (error) {
    console.error('Failed to save collections:', error)
  }
}

const loadCollectionsFromStorage = () => {
  try {
    const stored = localStorage.getItem('hoppscotch_collections')
    if (stored) {
      collections.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load collections:', error)
  }
}

const saveEnvironmentsToStorage = () => {
  try {
    localStorage.setItem('hoppscotch_environments', JSON.stringify(environments.value))
  } catch (error) {
    console.error('Failed to save environments:', error)
  }
}

const loadEnvironmentsFromStorage = () => {
  try {
    const stored = localStorage.getItem('hoppscotch_environments')
    if (stored) {
      environments.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load environments:', error)
  }
}

// 生命周期
onMounted(() => {
  // 加载存储的数据
  loadCollectionsFromStorage()
  loadEnvironmentsFromStorage()

  // 初始化默认数据
  addHeader()
  addParam()

  // 如果有client,同步数据
  if (props.client) {
    collections.value.forEach(col => {
      props.client!.addCollection(col)
    })
    environments.value.forEach(env => {
      props.client!.addEnvironment(env)
    })
  }
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