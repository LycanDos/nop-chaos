<template>
  <div class="content-display-integration">
    <h2>ContentDisplay 组件集成示例</h2>

    <div class="integration-section">
      <h3>BPMN节点内容配置</h3>
      <p>使用ContentDisplay组件来配置BPMN节点的内容展示</p>

      <div class="config-panel">
        <div class="node-selector">
          <el-select v-model="selectedNode" placeholder="选择节点类型">
            <el-option
              v-for="node in nodeTypes"
              :key="node.type"
              :label="node.label"
              :value="node.type"
            />
          </el-select>
        </div>

        <div class="content-config">
          <h4>节点内容配置</h4>
          <ContentDisplay
            :content="nodeContent"
            v-model:contentType="nodeContentType"
            :editable="true"
            :showEditor="showNodeEditor"
            :height="'400px'"
            @update:content="nodeContent = $event"
            @change="handleNodeContentChange"
          />

          <div class="editor-controls">
            <el-button
              @click="toggleNodeEditor"
              size="small"
              type="primary"
            >
              {{ showNodeEditor ? '关闭编辑器' : '编辑内容' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="integration-section">
      <h3>内容预览</h3>
      <div class="preview-area">
        <ContentDisplay
          :content="nodeContent"
          :contentType="nodeContentType"
          :height="'300px'"
        />
      </div>
    </div>

    <div class="integration-section">
      <h3>节点配置信息</h3>
      <div class="config-info">
        <p><strong>节点类型:</strong> {{ selectedNode }}</p>
        <p><strong>内容类型:</strong> {{ nodeContentType }}</p>
        <p><strong>内容长度:</strong> {{ nodeContent.length }} 字符</p>
        <p><strong>内容预览:</strong></p>
        <pre class="content-preview">{{ nodeContent.substring(0, 200) }}{{ nodeContent.length > 200 ? '...' : '' }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import ContentDisplay from './ContentDisplay.vue'

// 节点类型选项
const nodeTypes = [
  { type: 'bpmn:UserTask', label: '用户任务' },
  { type: 'bpmn:ServiceTask', label: '服务任务' },
  { type: 'bpmn:SendTask', label: '发送任务' },
  { type: 'bpmn:ReceiveTask', label: '接收任务' },
  { type: 'bpmn:ManualTask', label: '手工任务' },
  { type: 'bpmn:BusinessRuleTask', label: '业务规则任务' },
  { type: 'bpmn:ScriptTask', label: '脚本任务' },
  { type: 'bpmn:CallActivity', label: '调用活动' },
  { type: 'bpmn:SubProcess', label: '子流程' }
]

// 状态
const selectedNode = ref('bpmn:UserTask')
const nodeContent = ref('<div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;"><h4>用户任务内容</h4><p>这是用户任务的默认内容展示</p><ul><li>任务描述</li><li>操作指南</li><li>相关表单</li></ul></div>')
const nodeContentType = ref('html')
const showNodeEditor = ref(false)

// 根据节点类型设置默认内容
watch(selectedNode, (newNode) => {
  switch(newNode) {
    case 'bpmn:UserTask':
      nodeContent.value = '<div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;"><h4>用户任务内容</h4><p>这是用户任务的默认内容展示</p><ul><li>任务描述</li><li>操作指南</li><li>相关表单</li></ul></div>'
      nodeContentType.value = 'html'
      break
    case 'bpmn:ServiceTask':
      nodeContent.value = JSON.stringify({
        type: "page",
        title: "服务任务",
        body: [
          {
            type: "html",
            html: "<h4>服务任务</h4><p>这是一个自动化的服务任务</p>"
          },
          {
            type: "divider"
          },
          {
            type: "status",
            mode: "inline",
            placeholder: "服务执行中..."
          }
        ]
      }, null, 2)
      nodeContentType.value = 'amis'
      break
    default:
      nodeContent.value = `<div style="padding: 15px; border: 1px solid #ddd; border-radius: 4px;"><h4>${getNodeTypeLabel(newNode)}内容</h4><p>这是${getNodeTypeLabel(newNode)}的默认内容</p></div>`
      nodeContentType.value = 'html'
  }
})

// 获取节点类型标签
const getNodeTypeLabel = (nodeType) => {
  const node = nodeTypes.find(n => n.type === nodeType)
  return node ? node.label : nodeType
}

// 切换编辑器
const toggleNodeEditor = () => {
  showNodeEditor.value = !showNodeEditor.value
}

// 处理节点内容变更
const handleNodeContentChange = (data) => {
  console.log('节点内容变更:', data)
  // 这里可以触发保存或其他业务逻辑
}
</script>

<style scoped>
.content-display-integration {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.integration-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background-color: #fafafa;
}

h2 {
  color: #303133;
  margin-bottom: 25px;
  text-align: center;
}

h3 {
  color: #606266;
  margin-bottom: 15px;
}

h4 {
  color: #303133;
  margin-bottom: 10px;
}

.config-panel {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.node-selector {
  min-width: 200px;
}

.content-config {
  flex: 1;
  min-width: 400px;
}

.editor-controls {
  margin-top: 15px;
  text-align: center;
}

.preview-area {
  padding: 15px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fff;
}

.config-info {
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
}

.content-preview {
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 150px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .config-panel {
    flex-direction: column;
  }

  .content-config {
    min-width: auto;
  }
}
</style>
</template>