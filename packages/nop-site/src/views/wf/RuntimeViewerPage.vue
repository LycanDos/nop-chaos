<template>
  <div class="runtime-viewer-page">
    <!-- 列表模式 -->
    <template v-if="mode === 'list'">
      <ContentWrap>
        <h3 style="margin-bottom:16px;font-weight:bold;">流程实例列表</h3>
        <el-form :inline="true" :model="queryParams" class="mb-16px">
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width:150px">
              <el-option label="运行中" value="running" />
              <el-option label="已完成" value="completed" />
              <el-option label="已失败" value="failed" />
              <el-option label="已终止" value="terminated" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadList">搜索</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </ContentWrap>

      <ContentWrap>
        <el-table v-loading="listLoading" :data="instanceList" stripe>
          <el-table-column label="流程实例 ID" align="center" prop="wfId" min-width="200" />
          <el-table-column label="流程定义" align="center" prop="wfName" min-width="180" />
          <el-table-column label="业务键" align="center" prop="bizKey" min-width="120" />
          <el-table-column label="状态" align="center" min-width="100">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="开始时间" align="center" prop="createdTime" min-width="160" />
          <el-table-column label="操作" align="center" min-width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="viewInstance(row.wfId)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="!listLoading && instanceList.length === 0" class="empty-list">
          暂无流程实例数据
        </div>
      </ContentWrap>
    </template>

    <!-- 查看模式: 运行时视图 -->
    <template v-else>
      <ContentWrap>
        <div class="viewer-header">
          <el-button text @click="backToList">
            <el-icon><ArrowLeft /></el-icon>
            返回列表
          </el-button>
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
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
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
    instanceList.value = res?.NopWfInstance__findList || []
  } catch (e: any) {
    console.error('加载流程实例列表失败:', e)
    instanceList.value = []
  } finally {
    listLoading.value = false
  }
}

async function loadRuntimeView(wfId: string) {
  mode.value = 'view'
  runtimeData.value = null

  try {
    const data = await fetchRuntimeData(wfId)
    runtimeData.value = data
  } catch (e: any) {
    console.error('加载运行时数据失败:', e)
    // 使用示例数据作为降级
    runtimeData.value = demoData
    ElMessage.warning('加载失败，已切换至示例数据')
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

function statusTagType(status: string) {
  const s = String(status || '')
  if (s.includes('ACTIVATED') || s.includes('30')) return 'primary'
  if (s.includes('COMPLETED') || s.includes('40')) return 'success'
  if (s.includes('FAILED') || s.includes('60')) return 'danger'
  if (s.includes('KILLED') || s.includes('70')) return 'warning'
  return 'info'
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
