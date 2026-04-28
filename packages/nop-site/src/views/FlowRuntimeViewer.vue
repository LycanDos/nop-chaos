<template>
  <div class="flow-runtime-viewer-page">
    <ContentWrap>
      <h3 style="margin-bottom: 16px; font-weight: bold;">流程运行展示器</h3>
      <el-form :inline="true" :model="queryParams" class="mb-16px">
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 150px">
            <el-option label="运行中" value="running" />
            <el-option label="已完成" value="completed" />
            <el-option label="已失败" value="failed" />
            <el-option label="已终止" value="terminated" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="getList">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <ContentWrap>
      <el-table v-loading="loading" :data="list" :stripe="true">
        <el-table-column label="流程实例 ID" align="center" prop="processInstanceId" min-width="200" />
        <el-table-column label="流程定义" align="center" prop="flowDefId" min-width="180" />
        <el-table-column label="业务键" align="center" prop="businessKey" min-width="120" />
        <el-table-column label="状态" align="center" prop="status" min-width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.status || '未知' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开始时间" align="center" prop="startTime" min-width="160" />
        <el-table-column label="操作" align="center" min-width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleView(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!loading && list.length === 0" style="text-align: center; padding: 40px; color: #999;">
        暂无流程实例数据。请确保后端已启动并有流程实例记录。
      </div>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ajaxRequest } from '@nop-chaos/sdk'

defineOptions({ name: 'FlowRuntimeViewerPage' })

const loading = ref(false)
const list = ref<any[]>([])

const queryParams = reactive({
  status: ''
})

function statusTagType(status: string) {
  switch (status) {
    case 'running': return ''
    case 'completed': return 'success'
    case 'failed': return 'danger'
    case 'terminated': return 'warning'
    default: return 'info'
  }
}

async function getList() {
  loading.value = true
  try {
    const filter: any = {}
    if (queryParams.status) {
      filter['filter_status'] = queryParams.status
    }

    const res = await ajaxRequest({
      url: '/graphql',
      data: {
        query: `query { FlowInstanceRef__findList { processInstanceId flowDefId businessKey status startTime endTime } }`
      }
    })
    list.value = res?.FlowInstanceRef__findList || []
  } catch (e: any) {
    console.error('加载流程实例列表失败:', e)
    list.value = []
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  queryParams.status = ''
  getList()
}

function handleView(row: any) {
  // TODO: 跳转到运行时视图（需要构建 bpmn-process-designer 包后集成）
  window.alert(`查看流程实例: ${row.processInstanceId}\n\n完整的运行时视图（BPMN画布+状态叠加+回退模式）需要重新构建 bpmn-process-designer 包。\n\n请执行:\ncd Nop_Chaos/packages/bpmn-process-designer && pnpm run build`)
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
.flow-runtime-viewer-page {
  padding: 16px;
}
</style>
