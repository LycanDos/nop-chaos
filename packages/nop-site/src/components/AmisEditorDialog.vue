<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="AMIS编辑器"
    width="90%"
    :before-close="handleClose"
    destroy-on-close
    class="amis-editor-dialog"
  >
    <div class="amis-editor-container" style="height: 600px;">
      <iframe
        ref="editorRef"
        style="width: 100%; height: 100%; border: none"
        :src="editorUrl"
        v-if="showEditor"
      ></iframe>
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
  initialSchema: {
    type: Object,
    default: () => ({
      type: "page",
      title: "AMIS页面",
      body: "AMIS内容"
    })
  },
  editorMode: {
    type: String,
    default: 'full', // 'full' 或 'body-only'
    validator: (value) => ['full', 'body-only'].includes(value)
  }
})

const emit = defineEmits(['update:visible', 'save'])

const editorRef = ref(null)
const showEditor = ref(true)
const currentSchema = ref(null)
const editorUrl = ref('/amis-editor/index.html')

// 检查是否有构建后的AMIS编辑器，如果没有，尝试使用相对路径
onMounted(async () => {
  // 检查AMIS编辑器资源是否存在
  try {
    const response = await fetch('/amis-editor/index.html', { method: 'HEAD' });
    if (!response.ok) {
      // 如果默认路径不存在，可以尝试其他可能的路径
      console.warn('AMIS编辑器资源未找到，请确保已构建AMIS编辑器资源');
    }
  } catch (e) {
    console.warn('无法访问AMIS编辑器资源:', e);
  }
})

// 重新加载编辑器以确保状态正确
const reloadEditor = async () => {
  showEditor.value = false
  await nextTick()
  showEditor.value = true
  await nextTick()
}

onMounted(() => {
  // 监听iframe消息
  window.addEventListener('message', handleEditorMessage)
})

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
    // 编辑器初始化完成，发送Schema数据
    setTimeout(() => {
      sendSchemaToEditor(props.initialSchema)
    }, 100)
  } else if (typeof data === 'object' && data.type === 'save') {
    // 接收到编辑器保存的Schema数据
    currentSchema.value = data.data
    ElMessage.success('AMIS Schema 已保存到临时变量')
  } else if (typeof data === 'object' && data.type === 'saveSchema') {
    // 接收到编辑器保存的Schema数据
    currentSchema.value = data.data
    ElMessage.success('AMIS Schema 已保存到临时变量')
  } else if (typeof data === 'object' && data.type === 'toast') {
    // 显示提示信息
    const level = data.level || 'info'
    if (level === 'info') {
      ElMessage.info(data.message || '操作成功')
    } else {
      ElMessage.error(data.message || '操作失败')
    }
  } else if (typeof data === 'object' && data.type === 'alert') {
    // 显示警告信息
    alert(data.message)
  }
}

const sendSchemaToEditor = (schema) => {
  const frame = editorRef.value
  if (!frame) return

  const msg = {
    type: 'setSchema',
    data: schema,
    config: {
      mode: props.editorMode
    }
  }

  const str = JSON.stringify(msg)
  frame.contentWindow.postMessage(str, '*')
}

const postMsgToEditor = (msg) => {
  const frame = editorRef.value
  if (!frame) return

  const str = typeof msg === 'string' ? msg : JSON.stringify(msg)
  frame.contentWindow.postMessage(str, '*')
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  if (!currentSchema.value) {
    ElMessage.warning('请先编辑AMIS内容')
    return
  }

  emit('save', {
    schema: currentSchema.value,
    // 返回schema对象，由父组件决定如何使用
  })
  handleClose()
}

// 监听visible变化
const { visible } = toRefs(props)
watch(visible, async (newVal) => {
  if (newVal) {
    // 显示弹窗时重新加载编辑器
    await reloadEditor()
  }
}, { immediate: true })

// 清理事件监听器
onUnmounted(() => {
  window.removeEventListener('message', handleEditorMessage)
})
</script>

<style scoped>
.amis-editor-container {
  position: relative;
  min-height: 500px;
}

.amis-editor-dialog :deep(.el-dialog__body) {
  padding: 10px;
}

.amis-editor-dialog :deep(.el-dialog) {
  --el-dialog-content-font-size: 14px;
}
</style>