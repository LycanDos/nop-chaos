<template>
  <div class="wf-definition-designer">
    <div class="wf-designer-header">
      <div class="header-left">
        <el-button @click="handleBack" text>
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h3>{{ displayName || wfName || '流程设计器' }}</h3>
        <el-tag v-if="wfId" size="small" type="info" class="ml-2">{{ wfName }}</el-tag>
      </div>
      <div class="header-right">
        <el-button @click="handleSave" type="primary" :loading="saving">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </div>
    </div>
    <div class="bpmn-designer-wrapper">
      <div v-if="loading" class="designer-loading">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span>加载流程定义...</span>
      </div>
      <ProcessDesigner
        v-else
        ref="processDesignerRef"
        :xml="bpmnXml"
        :executor-api="nopSiteExecutorApi"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ProcessDesigner } from 'bpmn-process-designer'
import { nopSiteExecutorApi } from '../../api/bpmn/executorApi'
import { ajaxRequest } from '@nop-chaos/sdk'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Loading } from '@element-plus/icons-vue'
// bpmn-js 样式
import 'bpmn-process-designer/dist/bpmn-process-designer.css'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'
import 'bpmn-js-color-picker/colors/color-picker.css'

defineOptions({ name: 'WfDefinitionDesigner' })

const route = useRoute()
const router = useRouter()

const wfId = (route.query.wfId as string) || ''
const wfName = (route.query.wfName as string) || ''
const displayName = (route.query.displayName as string) || ''

const processDesignerRef = ref<any>(null)
const bpmnXml = ref('')
const loading = ref(false)
const saving = ref(false)

onMounted(async () => {
  if (wfId) {
    await loadDefinition()
  }
})

async function loadDefinition() {
  try {
    loading.value = true
    const res = await ajaxRequest({
      url: `/r/NopWfDefinition__get?id=${wfId}`,
    })
    if (res?.modelText) {
      bpmnXml.value = res.modelText
    }
  } catch (e) {
    console.error('加载工作流定义失败:', e)
    ElMessage.error('加载工作流定义失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!processDesignerRef.value) return
  try {
    saving.value = true
    const xml = await processDesignerRef.value.getXml()
    if (!xml) {
      ElMessage.warning('无法获取流程 XML')
      return
    }
    await ajaxRequest({
      url: '/r/NopWfDefinition__update',
      data: {
        data: {
          id: wfId,
          modelText: xml,
        },
      },
    })
    ElMessage.success('保存成功')
  } catch (e) {
    console.error('保存失败:', e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

function handleBack() {
  router.back()
}
</script>

<style lang="scss">
.wf-definition-designer {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.wf-designer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    h3 {
      margin: 0;
      font-size: 16px;
    }
  }
}
.bpmn-designer-wrapper {
  flex: 1;
  overflow: hidden;
  background: #fff;
}
.designer-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 8px;
  color: #999;
  font-size: 14px;
}
</style>
