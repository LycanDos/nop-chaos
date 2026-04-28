<template>
  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择状态"
          clearable
          class="!w-200px"
        >
          <el-option label="运行中" value="running" />
          <el-option label="已完成" value="completed" />
          <el-option label="失败" value="failed" />
          <el-option label="已挂起" value="suspended" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词" prop="keyword">
        <el-input
          v-model="queryParams.keyword"
          placeholder="实例ID / 业务键 / 流程名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-280px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px" /> 搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-5px" /> 重置
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true">
      <el-table-column label="流程实例 ID" align="center" prop="processInstanceId" min-width="180" />
      <el-table-column label="流程定义名称" align="center" prop="flowDefDisplayName" min-width="160" />
      <el-table-column label="业务键" align="center" prop="bizKey" min-width="140" />
      <el-table-column label="启动人" align="center" prop="starterId" width="120" />
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">
            {{ statusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开始时间" align="center" prop="startTime" width="180">
        <template #default="{ row }">
          {{ formatTime(row.startTime) }}
        </template>
      </el-table-column>
      <el-table-column label="结束时间" align="center" prop="endTime" width="180">
        <template #default="{ row }">
          {{ row.endTime ? formatTime(row.endTime) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" fixed="right" width="100">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleView(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="flex justify-end mt-16px">
      <el-pagination
        v-model:current-page="queryParams.pageNo"
        v-model:page-size="queryParams.pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleQuery"
        @current-change="getList"
      />
    </div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import request from '@/config/axios'
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'

defineOptions({ name: 'FlowRuntimeList' })

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const list = ref<any[]>([])
const queryFormRef = ref()

const queryParams = reactive({
  pageNo: 1,
  pageSize: 20,
  status: undefined as string | undefined,
  keyword: undefined as string | undefined,
})

/** 状态颜色映射 */
function statusTagType(status: string) {
  const map: Record<string, string> = {
    running: '',        // primary（默认）
    completed: 'success',
    failed: 'danger',
    suspended: 'warning',
  }
  return map[status] || 'info'
}

/** 状态文本映射 */
function statusLabel(status: string) {
  const map: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    suspended: '已挂起',
  }
  return map[status] || status
}

/** 格式化时间 */
function formatTime(time: string | number | null) {
  if (!time) return '-'
  const d = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 构建 GraphQL 过滤条件 */
function buildFilter() {
  const conditions: any[] = []
  if (queryParams.status) {
    conditions.push({ $type: 'eq', name: 'status', value: queryParams.status })
  }
  if (queryParams.keyword) {
    conditions.push({
      $type: 'or',
      $body: [
        { $type: 'like', name: 'processInstanceId', value: `%${queryParams.keyword}%` },
        { $type: 'like', name: 'bizKey', value: `%${queryParams.keyword}%` },
      ],
    })
  }
  if (conditions.length === 0) return undefined
  if (conditions.length === 1) return conditions[0]
  return { $type: 'and', $body: conditions }
}

/** 查询列表 */
async function getList() {
  loading.value = true
  try {
    const filter = buildFilter()
    const offset = (queryParams.pageNo - 1) * queryParams.pageSize
    const res = await request.post({
      url: '/graphql',
      data: {
        query: `query($filter: Map, $limit: Int, $offset: Int) {
          FlowInstanceRef__findPage(filter: $filter, limit: $limit, offset: $offset) {
            total
            items {
              processInstanceId
              bizKey
              starterId
              status
              startTime
              endTime
              flowDefId
            }
          }
        }`,
        variables: {
          filter,
          limit: queryParams.pageSize,
          offset,
        },
      },
    })
    const page = res?.FlowInstanceRef__findPage || { total: 0, items: [] }
    total.value = page.total || 0
    // 获取流程定义名称（批量查询）
    const items = page.items || []
    if (items.length > 0) {
      const defIds = [...new Set(items.map((i: any) => i.flowDefId).filter(Boolean))]
      if (defIds.length > 0) {
        try {
          const defRes = await request.post({
            url: '/graphql',
            data: {
              query: `query($filter: Map) {
                FlowDef__findList(filter: $filter) {
                  flowDefId
                  displayName
                }
              }`,
              variables: {
                filter: { $type: 'in', name: 'flowDefId', value: defIds },
              },
            },
          })
          const defList = defRes?.FlowDef__findList || []
          const defMap = new Map(defList.map((d: any) => [d.flowDefId, d.displayName]))
          items.forEach((item: any) => {
            item.flowDefDisplayName = defMap.get(item.flowDefId) || '-'
          })
        } catch {
          // 查询流程定义名称失败时，使用 flowDefId 作为备选
          items.forEach((item: any) => {
            item.flowDefDisplayName = item.flowDefId || '-'
          })
        }
      }
    }
    list.value = items
  } finally {
    loading.value = false
  }
}

/** 搜索 */
function handleQuery() {
  queryParams.pageNo = 1
  getList()
}

/** 重置 */
function resetQuery() {
  queryFormRef.value?.resetFields()
  queryParams.status = undefined
  queryParams.keyword = undefined
  handleQuery()
}

/** 查看运行时视图 */
function handleView(row: any) {
  // 根据当前路由前缀决定跳转路径
  const currentPath = router.currentRoute.value.path
  const prefix = currentPath.startsWith('/process-center') ? '/process-center' : '/bpm'
  router.push(`${prefix}/flow-runtime/${row.processInstanceId}`)
}

onMounted(() => {
  getList()
})
</script>
