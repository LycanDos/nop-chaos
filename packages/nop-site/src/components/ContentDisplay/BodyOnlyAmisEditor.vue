<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="AMIS内容编辑器"
    width="80%"
    :before-close="handleClose"
    destroy-on-close
    class="body-only-amis-editor-dialog"
  >
    <div class="editor-container">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="可视化编辑" name="visual">
          <div class="visual-editor" style="height: 400px;">
            <iframe
              ref="editorRef"
              style="width: 100%; height: 100%; border: none"
              :src="editorUrl"
              v-if="showEditor"
            ></iframe>
          </div>
        </el-tab-pane>
        <el-tab-pane label="源码编辑" name="code">
          <el-input
            v-model="bodySchemaJson"
            type="textarea"
            :rows="15"
            placeholder="请输入AMIS Body内容的JSON格式"
            @input="handleBodySchemaChange"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSave">保存并关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, nextTick, toRefs, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  initialBodySchema: {
    type: [Object, Array],
    default: () => ({
      type: "html",
      html: "<div>默认AMIS内容</div>"
    })
  }
})

const emit = defineEmits(['update:visible', 'save'])

const editorRef = ref(null)
const showEditor = ref(true)
const activeTab = ref('visual')
const currentBodySchema = ref(null)
const editorUrl = ref('/amis-editor/index.html')
const bodySchemaJson = ref('')

// 初始化
onMounted(async () => {
  // 检查AMIS编辑器资源是否存在
  try {
    const response = await fetch('/amis-editor/index.html', { method: 'HEAD' });
    if (!response.ok) {
      console.warn('AMIS编辑器资源未找到，请确保已构建AMIS编辑器资源');
    }
  } catch (e) {
    console.warn('无法访问AMIS编辑器资源:', e);
  }

  // 监听iframe消息
  window.addEventListener('message', handleEditorMessage)
})

// 重新加载编辑器以确保状态正确
const reloadEditor = async () => {
  showEditor.value = false
  await nextTick()
  showEditor.value = true
  await nextTick()
}

// 处理编辑器消息
const handleEditorMessage = (event) => {
  // 防止跨域安全问题
  if (event.source !== editorRef.value?.contentWindow) return

  let data = event.data
  if (typeof data === 'string' && data.startsWith('{')) {
    try {
      data = JSON.parse(data)
    } catch (e) {
      console.warn('无法解析的消息:', event.data)
      return
    }
  }

  if (data === 'amis-editor-inited') {
    // 编辑器初始化完成，发送Schema数据（只发送body部分）
    setTimeout(() => {
      const schemaForEditor = createSchemaForEditor(props.initialBodySchema)
      sendSchemaToEditor(schemaForEditor)
    }, 100)
  } else if (typeof data === 'object' && (data.type === 'save' || data.type === 'saveSchema')) {
    // 接收到编辑器保存的Schema数据（从中提取body）
    if (data.data && data.data.body) {
      currentBodySchema.value = data.data.body
      ElMessage.success('AMIS内容已更新')
    }
  }
}

// 创建用于编辑器的完整schema（因为编辑器可能需要完整的结构）
const createSchemaForEditor = (bodySchema) => {
  return {
    type: "page",
    title: "内容编辑",
    body: bodySchema
  }
}

// 发送Schema到编辑器
const sendSchemaToEditor = (schema) => {
  const frame = editorRef.value
  if (!frame) return

  const msg = {
    type: 'setSchema',
    data: schema,
    config: {
      mode: 'normal' // 可限制为只编辑body部分的配置
    }
  }

  const str = JSON.stringify(msg)
  frame.contentWindow.postMessage(str, '*')
}

// 处理body schema变化
const handleBodySchemaChange = (value) => {
  try {
    const parsed = JSON.parse(value)
    currentBodySchema.value = parsed
  } catch (e) {
    // JSON格式错误，不更新
    console.log("JSON格式错误", e)
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  let finalBodySchema = null;

  // 如果是在代码编辑模式下编辑了JSON
  if (activeTab.value === 'code' && bodySchemaJson.value) {
    try {
      finalBodySchema = JSON.parse(bodySchemaJson.value)
    } catch (e) {
      ElMessage.error('JSON格式错误，请检查输入')
      return
    }
  }
  // 如果是可视化编辑模式的更改
  else if (currentBodySchema.value) {
    finalBodySchema = currentBodySchema.value
  }

  // 如果都没有，则使用初始值
  if (!finalBodySchema) {
    finalBodySchema = props.initialBodySchema
  }

  // 如果是数组形式的body内容，保持不变；如果是单个对象，也保持结构
  if (Array.isArray(finalBodySchema)) {
    // 如果是数组，保持数组形式
  } else {
    // 如果是单个对象，确保它是一个有效的body对象
    if (!finalBodySchema.type) {
      finalBodySchema = {
        type: "html",
        html: "<div>内容</div>"
      }
    }
  }

  emit('save', {
    bodySchema: finalBodySchema
  })
  handleClose()
}

// 监听visible变化
const { visible } = toRefs(props)
watch(visible, async (newVal) => {
  if (newVal) {
    // 显示弹窗时重新加载编辑器和初始化数据
    await reloadEditor()

    // 初始化JSON编辑器的内容
    try {
      bodySchemaJson.value = JSON.stringify(props.initialBodySchema, null, 2)
      currentBodySchema.value = props.initialBodySchema
    } catch (e) {
      console.error('初始化AMIS内容失败:', e)
      bodySchemaJson.value = JSON.stringify({ type: "html", html: "<div>默认内容</div>" }, null, 2)
      currentBodySchema.value = { type: "html", html: "<div>默认内容</div>" }
    }
  }
}, { immediate: true })

// 清理事件监听器
onUnmounted(() => {
  window.removeEventListener('message', handleEditorMessage)
})
</script>

<style scoped>
.editor-container {
  min-height: 400px;
}

.body-only-amis-editor-dialog :deep(.el-dialog__body) {
  padding: 10px;
}

.body-only-amis-editor-dialog :deep(.el-dialog) {
  --el-dialog-content-font-size: 14px;
}

.visual-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}
</style>
