<template>
  <div class="runtime-viewer-page">
    <!-- 列表模式 -->
    <template v-if="mode === 'list'">
      <ContentWrap>
        <h3 style="margin-bottom:16px;font-weight:bold;">流程实例列表</h3>
        <a-form layout="inline" :model="queryParams" class="mb-16px">
          <a-form-item label="状态">
            <a-select v-model:value="queryParams.status" placeholder="全部" allowClear style="width:150px">
              <a-select-option value="running">运行中</a-select-option>
              <a-select-option value="completed">已完成</a-select-option>
              <a-select-option value="failed">已失败</a-select-option>
              <a-select-option value="terminated">已终止</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="loadList">搜索</a-button>
            <a-button @click="resetQuery">重置</a-button>
          </a-form-item>
        </a-form>
      </ContentWrap>

      <ContentWrap>
        <a-table :loading="listLoading" :dataSource="instanceList" :pagination="false">
          <a-table-column title="流程实例 ID" align="center" dataIndex="wfId" :minWidth="200" />
          <a-table-column title="流程定义" align="center" dataIndex="wfName" :minWidth="180" />
          <a-table-column title="业务键" align="center" dataIndex="bizKey" :minWidth="120" />
          <a-table-column title="状态" align="center" :minWidth="100">
            <template #default="{ record }">
              <a-tag :color="statusTagColor(record.status)">{{ record.status }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="开始时间" align="center" dataIndex="createdTime" :minWidth="160" />
          <a-table-column title="操作" align="center" :minWidth="100" fixed="right">
            <template #default="{ record }">
              <a-button type="link" @click="viewInstance(record.wfId)">查看</a-button>
            </template>
          </a-table-column>
        </a-table>
        <div v-if="!listLoading && instanceList.length === 0" class="empty-list">
          暂无流程实例数据
        </div>
      </ContentWrap>
    </template>

    <!-- 查看模式: 运行时视图 -->
    <template v-else>
      <ContentWrap>
        <div class="viewer-header">
          <a-button type="text" @click="backToList">
            <ArrowLeftOutlined />
            返回列表
          </a-button>
        </div>
      </ContentWrap>
      <ContentWrap>
        <RuntimeViewer
          :model-value="runtimeData"
          height="calc(100vh - 260px)"
        />
      </ContentWrap>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { ajaxRequest } from '@nop-chaos/sdk'
import RuntimeViewer from './RuntimeViewer.vue'
import { fetchRuntimeData, demoData } from './RuntimeDataProvider'
import type { RuntimeViewerViewModel } from './RuntimeDataProvider'

defineOptions({ name: 'WfRuntimeViewerPage' })

const route = useRoute()
const router = useRouter()

const mode = ref<'list' | 'view'>('list')
const listLoading = ref(false)
const instanceList = ref<any[]>([])
const runtimeData = ref<RuntimeViewerViewModel | null>(null)

const queryParams = ref({ status: '' })

onMounted(async () => {
  // 优先从 URL 参数读取 wfId
  const wfId = route.query.wfId as string || ''
  if (wfId) {
    await loadRuntimeView(wfId)
  } else {
    mode.value = 'list'
    loadList()
  }
})

const DEMO_INSTANCES = [
  { wfId: 'demo-001', wfName: 'leaveProcess', wfVersion: 1, status: 'ACTIVATED', createdTime: '2026-05-10 09:00:00', finishedTime: '', bizKey: 'LEAVE-2026-001' },
  { wfId: 'demo-002', wfName: 'leaveProcess', wfVersion: 1, status: 'COMPLETED', createdTime: '2026-05-09 08:00:00', finishedTime: '2026-05-09 10:30:00', bizKey: 'LEAVE-2026-002' },
]

async function loadList() {
  listLoading.value = true
  try {
    const filter: any = {}
    if (queryParams.value.status) {
      filter.filter_status = queryParams.value.status
    }

    const res = await ajaxRequest({
      url: '/graphql',
      data: {
        query: `query {
          NopWfInstance__findList {
            wfId wfName wfVersion status createdTime finishedTime bizKey
          }
        }`,
      },
    })
    instanceList.value = res?.NopWfInstance__findList || DEMO_INSTANCES
  } catch (e: any) {
    console.warn('后端工作流服务不可用，使用示例数据:', e)
    instanceList.value = DEMO_INSTANCES
  } finally {
    listLoading.value = false
  }
}

async function loadRuntimeView(wfId: string) {
  mode.value = 'view'
  runtimeData.value = null

  // 示例 ID 直接使用 demo 数据，不请求后端
  if (wfId.startsWith('demo-')) {
    runtimeData.value = demoData
    return
  }

  try {
    const data = await fetchRuntimeData(wfId)
    runtimeData.value = data
  } catch (e: any) {
    console.warn('加载运行时数据失败，使用示例数据:', e)
    // 使用示例数据作为降级
    runtimeData.value = demoData
    message.warning('加载失败，已切换至示例数据')
  }
}

function viewInstance(wfId: string) {
  // 同页面跳转，使用 query 更新
  router.replace({ query: { wfId } })
  loadRuntimeView(wfId)
}

function backToList() {
  mode.value = 'list'
  router.replace({ query: {} })
  loadList()
}

function resetQuery() {
  queryParams.value.status = ''
  loadList()
}

function statusTagColor(status: string) {
  const s = String(status || '')
  if (s.includes('ACTIVATED') || s.includes('30')) return 'processing'
  if (s.includes('COMPLETED') || s.includes('40')) return 'success'
  if (s.includes('FAILED') || s.includes('60')) return 'error'
  if (s.includes('KILLED') || s.includes('70')) return 'warning'
  return 'default'
}
</script>

<style scoped>
.runtime-viewer-page {
  padding: 16px;
}
.viewer-header {
  margin-bottom: 8px;
}
.empty-list {
  text-align: center;
  padding: 40px;
  color: #999;
}
:deep(.mb-16px) {
  margin-bottom: 16px;
}
</style>
