<template>
  <div class="content-display-container">
    <!-- 编辑器模式 -->
    <div v-if="editable && showEditor" class="editor-mode">
      <!-- 编辑器工具栏 -->
      <div class="editor-toolbar">
        <el-radio-group
          v-model="localContentType"
          @change="handleContentTypeChange"
          size="small"
          class="content-type-selector"
        >
          <el-radio label="html" title="HTML内容">HTML</el-radio>
          <el-radio label="amis" title="AMIS Schema">AMIS</el-radio>
        </el-radio-group>

        <div class="editor-actions">
          <el-button
            v-if="localContentType === 'amis'"
            type="primary"
            size="small"
            @click="openAmisEditor"
            title="使用AMIS可视化编辑器"
          >
            <i class="el-icon-edit"></i>
            AMIS编辑器
          </el-button>

          <el-button
            type="info"
            size="small"
            @click="togglePreviewMode"
            title="切换预览模式"
          >
            <i :class="isPreviewMode ? 'el-icon-view' : 'el-icon-edit'"></i>
            {{ isPreviewMode ? '编辑' : '预览' }}
          </el-button>
        </div>
      </div>

      <!-- AMIS编辑器对话框 -->
      <AmisEditorDialog
        v-if="showAmisEditor && props.isBpmnContext !== true"
        :visible="showAmisEditor"
        :initialSchema="getInitialAmisSchema()"
        @update:visible="showAmisEditor = $event"
        @save="handleAmisSave"
      />
      <BodyOnlyAmisEditor
        v-else-if="showAmisEditor && props.isBpmnContext === true"
        :visible="showAmisEditor"
        :initialBodySchema="getInitialBodySchema()"
        @update:visible="showAmisEditor = $event"
        @save="handleBodyOnlyAmisSave"
      />

      <!-- 编辑器区域 -->
      <div v-if="!isPreviewMode" class="editor-area">
        <div v-if="localContentType === 'html'" class="html-editor">
          <el-input
            v-model="currentContent"
            type="textarea"
            :rows="10"
            :style="{ height: height }"
            placeholder="请输入HTML内容"
            @input="handleContentChange"
          />
        </div>

        <div v-else class="amis-editor">
          <el-input
            v-model="currentContent"
            type="textarea"
            :rows="10"
            :style="{ height: height }"
            placeholder="请输入AMIS Schema JSON"
            @input="handleContentChange"
          />
        </div>
      </div>

      <!-- 预览区域 -->
      <div v-if="isPreviewMode" class="preview-area">
        <h4>预览效果</h4>
        <div class="preview-container" :style="{ height: height }">
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
          <div
            v-else-if="localContentType === 'html'"
            class="html-preview"
            v-html="currentContent"
          ></div>
          <div
            v-else-if="localContentType === 'amis'"
            class="amis-preview"
          >
            <div
              class="amis-content-wrapper"
              v-html="renderAmisSchema(currentContent)"
              :style="{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto'
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 只读模式 - 直接渲染内容 -->
    <div v-else class="render-mode" :style="{ height: height }">
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      <div
        v-else-if="contentType === 'html'"
        class="html-render"
        :class="{'bpmn-html-content': isBpmnContext}"
        v-html="content"
      ></div>
      <div
        v-else-if="contentType === 'amis'"
        class="amis-render"
      >
        <div
          class="amis-content-wrapper"
          v-html="renderAmisSchema(content)"
          :style="{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto'
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElButton, ElInput, ElRadioGroup, ElRadio } from 'element-plus'
import AmisEditorDialog from '../AmisEditorDialog.vue'
import BodyOnlyAmisEditor from './BodyOnlyAmisEditor.vue'

// Props
const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  contentType: {
    type: String,
    default: 'html',
    validator: (value) => ['html', 'amis'].includes(value)
  },
  editable: {
    type: Boolean,
    default: false
  },
  showEditor: {
    type: Boolean,
    default: false
  },
  height: {
    type: String,
    default: '300px'
  },
  isBpmnContext: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:content', 'update:contentType', 'change', 'error'])

// 状态
const localContent = ref(props.content)
const localContentType = ref(props.contentType)
const htmlContentValue = ref(props.contentType === 'html' ? props.content : '')
const amisContentValue = ref(props.contentType === 'amis' ? props.content : '')
const isPreviewMode = ref(false)
const showAmisEditor = ref(false)
const error = ref('')

// 计算属性
const shouldShowEditor = computed(() => props.editable && props.showEditor)

// 获取当前内容
const currentContent = computed({
  get: () => {
    return localContentType.value === 'html' ? htmlContentValue.value : amisContentValue.value
  },
  set: (value) => {
    if (localContentType.value === 'html') {
      htmlContentValue.value = value
    } else {
      amisContentValue.value = value
    }
    localContent.value = value
  }
})

// 监听props变化，但仅在内容真正改变时才更新，以避免覆盖用户编辑的内容
watch(() => props.content, (newContent) => {
  // 只在props内容与本地内容不同时才更新（避免覆盖用户编辑的内容）
  if (localContent.value !== newContent && props.content !== localContent.value) {
    if (props.contentType === 'html') {
      htmlContentValue.value = newContent
    } else {
      amisContentValue.value = newContent
    }
    localContent.value = newContent
  }
})

watch(() => props.contentType, (newType) => {
  // 只在props类型与本地类型不同时才更新（避免覆盖用户选择的类型）
  if (localContentType.value !== newType && props.contentType !== localContentType.value) {
    localContentType.value = newType
    // 切换类型时更新当前显示的内容
    localContent.value = newType === 'html' ? htmlContentValue.value : amisContentValue.value
  }
})

// 监听本地内容类型变化，确保内容同步
watch(localContentType, (newType) => {
  // 当本地内容类型变化时，确保当前内容值正确
  localContent.value = newType === 'html' ? htmlContentValue.value : amisContentValue.value
})

// 处理内容类型改变
const handleContentTypeChange = (newType) => {
  localContentType.value = newType
  // 切换类型时，确保有默认内容
  if (newType === 'amis' && !currentContent.value) {
    // 为AMIS类型设置默认Schema
    const defaultAmisSchema = JSON.stringify({
      type: "page",
      title: "AMIS页面",
      body: [
        {
          type: "html",
          html: "<div>默认AMIS内容</div>"
        }
      ]
    }, null, 2)
    amisContentValue.value = defaultAmisSchema
    localContent.value = defaultAmisSchema
  } else if (newType === 'html' && !currentContent.value) {
    // 为HTML类型设置默认内容
    htmlContentValue.value = '<div><p>默认HTML内容</p></div>'
    localContent.value = '<div><p>默认HTML内容</p></div>'
  } else {
    // 切换类型时，更新当前显示的内容
    localContent.value = currentContent.value
  }
  handleContentChange()
}

// 处理内容改变
const handleContentChange = () => {
  // 更新对应类型的内容值
  if (localContentType.value === 'html') {
    htmlContentValue.value = currentContent.value
  } else {
    amisContentValue.value = currentContent.value
  }
  localContent.value = currentContent.value
  validateContent()
  emitContentChange()
}

// 验证内容
const validateContent = () => {
  error.value = ''

  if (localContentType.value === 'amis') {
    try {
      JSON.parse(localContent.value)
    } catch (e) {
      error.value = `AMIS Schema 格式错误: ${e.message}`
    }
  }
}

// 发送内容变更事件
const emitContentChange = () => {
  validateContent()

  emit('update:content', currentContent.value)
  emit('update:contentType', localContentType.value)
  emit('change', {
    content: currentContent.value,
    type: localContentType.value
  })

  if (error.value) {
    emit('error', error.value)
  }
}

// 切换预览模式
const togglePreviewMode = () => {
  isPreviewMode.value = !isPreviewMode.value
}

// 打开AMIS编辑器
const openAmisEditor = () => {
  showAmisEditor.value = true
}

// 获取初始AMIS Schema
const getInitialAmisSchema = () => {
  if (localContentType.value === 'amis' && currentContent.value) {
    try {
      const parsed = JSON.parse(currentContent.value);
      return parsed;
    } catch (e) {
      console.log("无法解析现有AMIS内容，使用默认值")
    }
  }

  return {
    type: "page",
    title: "AMIS页面",
    body: [
      {
        type: "html",
        html: "<div>默认AMIS内容</div>"
      }
    ]
  }
}

// 处理AMIS编辑器保存
const handleAmisSave = (data) => {
  if (data && data.schema) {
    // 更新本地内容
    const newContent = JSON.stringify(data.schema, null, 2)
    // 设置内容类型为amis
    localContentType.value = 'amis'
    // 更新AMIS内容值
    amisContentValue.value = newContent
    // 更新当前内容
    currentContent.value = newContent
    // 触发内容变更
    handleContentChange()
    // 如果在预览模式下，确保界面更新
    if (isPreviewMode.value) {
      // 强制触发更新
      setTimeout(() => {
        // 确保DOM更新
      }, 0)
    }
  }
  showAmisEditor.value = false
}

// 获取初始Body Schema（用于BodyOnly编辑器）
const getInitialBodySchema = () => {
  if (localContentType.value === 'amis' && currentContent.value) {
    try {
      const parsed = JSON.parse(currentContent.value);
      // 提取body部分
      if (parsed && parsed.body) {
        return parsed.body;
      }
    } catch (e) {
      console.log("无法解析现有AMIS内容，使用默认值")
    }
  }

  return {
    type: "html",
    html: "<div>默认AMIS内容</div>"
  };
}

// 处理BodyOnly AMIS编辑器保存
const handleBodyOnlyAmisSave = (data) => {
  if (data && data.bodySchema) {
    // 创建完整的AMIS schema，只更新body部分
    const schema = {
      type: "page",
      title: "AMIS页面",
      body: data.bodySchema
    };

    // 更新本地内容
    const newContent = JSON.stringify(schema, null, 2);
    // 设置内容类型为amis
    localContentType.value = 'amis';
    // 更新AMIS内容值
    amisContentValue.value = newContent;
    // 更新当前内容
    currentContent.value = newContent;
    // 触发内容变更
    handleContentChange();
    // 如果在预览模式下，确保界面更新
    if (isPreviewMode.value) {
      // 强制触发更新
      setTimeout(() => {
        // 确保DOM更新
      }, 0);
    }
  }
  showAmisEditor.value = false;
}

// 渲染AMIS Schema为HTML（增强版本，处理样式和背景）
const renderAmisSchema = (content) => {
  try {
    if (!content) return ''

    const schema = JSON.parse(content)

    // 提取全局样式
    const globalStyles = extractGlobalStyles(schema)

    // 渲染内容
    let renderedContent = ''
    if (schema.type === 'page' && schema.body) {
      // 渲染AMIS页面的body部分
      if (Array.isArray(schema.body)) {
        renderedContent = schema.body.map(item => renderItem(item)).join('')
      } else {
        renderedContent = renderItem(schema.body)
      }
    } else {
      // 如果不是page类型，直接渲染内容
      renderedContent = renderItem(schema)
    }

    // 在BPMN上下文中，需要特殊处理样式以确保正确显示
    if (props.isBpmnContext) {
      // 为BPMN上下文添加特殊的容器样式，保留原有的全局样式
      let styleString = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;';

      if (globalStyles && Object.keys(globalStyles).length > 0) {
        // 合并全局样式
        const globalStyleString = Object.entries(globalStyles).map(([key, value]) => `${key}:${value}`).join(';');
        styleString = globalStyleString + ';' + styleString;
      }

      // 确保内容在BPMN节点中正确显示
      return `<div style="${styleString}">${renderedContent}</div>`
    } else {
      // 如果有全局样式，将其包装在带样式的容器中
      if (globalStyles && Object.keys(globalStyles).length > 0) {
        const styleString = Object.entries(globalStyles).map(([key, value]) => `${key}:${value}`).join(';')
        // 确保容器有最小尺寸以便显示背景
        return `<div style="${styleString};min-width:100%;min-height:100%;">${renderedContent}</div>`
      }
    }

    return renderedContent
  } catch (e) {
    console.error('渲染AMIS Schema失败:', e)
    return `<div class="amis-error">渲染错误: ${e.message}</div>`
  }
}

// 提取全局样式
function extractGlobalStyles(schema) {
  const styles = {}

  // 处理 themeCss 中的样式
  if (schema.themeCss && schema.themeCss.baseControlClassName) {
    const themeStyles = schema.themeCss.baseControlClassName
    for (const [key, value] of Object.entries(themeStyles)) {
      // 将AMIS样式属性转换为CSS样式
      const cssKey = key.replace(/:default$/, '').replace(/([A-Z])/g, '-$1').toLowerCase()
      if (value) {
        styles[cssKey] = value
      }
    }
  }

  // 处理直接的样式属性
  if (schema.style) {
    Object.assign(styles, schema.style)
  }

  // 处理背景色等常见样式属性
  if (schema.bodyBgColor) {
    styles['background-color'] = schema.bodyBgColor
  }

  return styles
}

// 渲染单个AMIS组件项
const renderItem = (item) => {
  if (!item) return ''

  // 处理组件样式
  const componentStyles = extractComponentStyles(item)
  const styleString = componentStyles ? Object.entries(componentStyles).map(([key, value]) => `${key}:${value}`).join(';') : ''

  if (item.type === 'html') {
    // 如果是HTML组件，返回其HTML内容
    return item.html || ''
  } else if (item.type === 'wrapper') {
    // 如果是wrapper组件，渲染其body内容
    let bodyContent = ''
    if (Array.isArray(item.body)) {
      bodyContent = item.body.map(subItem => renderItem(subItem)).join('')
    } else {
      bodyContent = renderItem(item.body)
    }

    const wrapperStyle = styleString ? `style="${styleString}"` : ''
    return `<div ${wrapperStyle}>${bodyContent}</div>`
  } else if (item.type === 'tpl') {
    // 如果是模板组件，返回其tpl内容，并处理样式
    const tplContent = item.tpl || item.body || ''
    const tplStyle = styleString ? `style="${styleString}"` : ''
    const wrapperComponent = item.wrapperComponent
    if (wrapperComponent === '' || wrapperComponent === false) {
      // 如果wrapperComponent为false或空字符串，直接返回内容
      return tplContent
    } else {
      // 否则用适当的标签包装
      return `<div ${tplStyle}>${tplContent}</div>`
    }
  } else if (item.type === 'div' || item.type === 'container') {
    // 处理div或container组件
    let bodyContent = ''
    if (Array.isArray(item.body)) {
      bodyContent = item.body.map(subItem => renderItem(subItem)).join('')
    } else {
      bodyContent = renderItem(item.body)
    }

    const divStyle = styleString ? `style="${styleString}"` : ''
    return `<div ${divStyle}>${bodyContent}</div>`
  } else if (item.type === 'checkboxes') {
    // 处理checkboxes组件
    const options = item.options || [];
    const label = item.label || '';
    const name = item.name || '';

    let checkboxesHtml = '';
    if (label) {
      checkboxesHtml += `<label>${label}</label>`;
    }

    checkboxesHtml += '<div class="checkboxes-group">';
    options.forEach(option => {
      checkboxesHtml += `
        <label style="display: block; margin: 5px 0; cursor: pointer;">
          <input type="checkbox" name="${name}" value="${option.value}" style="margin-right: 5px;">
          ${option.label}
        </label>
      `;
    });
    checkboxesHtml += '</div>';

    const checkboxesStyle = styleString ? `style="${styleString}"` : ''
    return `<div ${checkboxesStyle}>${checkboxesHtml}</div>`
  } else if (item.type === 'text' || item.type === 'input-text') {
    // 处理文本输入框
    const label = item.label || '';
    const name = item.name || '';
    const placeholder = item.placeholder || '';

    const inputHtml = label ?
      `<label>${label}: <input type="text" name="${name}" placeholder="${placeholder}" style="margin-left: 5px; padding: 2px;"></label>` :
      `<input type="text" name="${name}" placeholder="${placeholder}" style="padding: 2px;">`;

    const inputStyle = styleString ? `style="${styleString}"` : ''
    return `<div ${inputStyle}>${inputHtml}</div>`
  } else if (item.type === 'select') {
    // 处理选择框
    const label = item.label || '';
    const name = item.name || '';
    const options = item.options || [];

    let selectHtml = '<select style="padding: 2px;">';
    options.forEach(option => {
      selectHtml += `<option value="${option.value}">${option.label}</option>`;
    });
    selectHtml += '</select>';

    if (label) {
      selectHtml = `<label>${label}: ${selectHtml}</label>`;
    }

    const selectStyle = styleString ? `style="${styleString}"` : ''
    return `<div ${selectStyle}>${selectHtml}</div>`
  } else if (item.type === 'radios') {
    // 处理单选框
    const label = item.label || '';
    const name = item.name || '';
    const options = item.options || [];

    let radiosHtml = '';
    if (label) {
      radiosHtml += `<label>${label}</label>`;
    }

    radiosHtml += '<div class="radios-group">';
    options.forEach(option => {
      radiosHtml += `
        <label style="display: block; margin: 5px 0; cursor: pointer;">
          <input type="radio" name="${name}" value="${option.value}" style="margin-right: 5px;">
          ${option.label}
        </label>
      `;
    });
    radiosHtml += '</div>';

    const radiosStyle = styleString ? `style="${styleString}"` : ''
    return `<div ${radiosStyle}>${radiosHtml}</div>`
  } else {
    // 其他类型，返回一个简单表示，但包含样式
    const otherStyle = styleString ? `style="${styleString}"` : ''
    return `<div ${otherStyle} class="amis-placeholder">[AMIS: ${item.type}] ${item.tpl || item.text || (item.label ? item.label : '')}</div>`
  }
}

// 提取组件样式
function extractComponentStyles(item) {
  const styles = {}

  // 处理主题CSS
  if (item.themeCss && item.themeCss.baseControlClassName) {
    const themeStyles = item.themeCss.baseControlClassName
    for (const [key, value] of Object.entries(themeStyles)) {
      // 将AMIS样式属性转换为CSS样式
      const cssKey = key.replace(/:default$/, '').replace(/([A-Z])/g, '-$1').toLowerCase()
      if (value) {
        styles[cssKey] = value
      }
    }
  }

  // 处理直接的样式属性
  if (item.style) {
    Object.assign(styles, item.style)
  }

  // 处理背景色
  if (item.bodyBgColor) {
    styles['background-color'] = item.bodyBgColor
  }

  // 处理背景色的其他可能属性
  if (item.bgColor) {
    styles['background-color'] = item.bgColor
  }

  // 处理文本颜色
  if (item.color) {
    styles['color'] = item.color
  }

  // 处理内边距
  if (item.pagerOffset !== undefined) {
    styles['padding'] = `${item.pagerOffset}px`
  }

  return Object.keys(styles).length > 0 ? styles : null
}

// 组件挂载
onMounted(() => {
  validateContent()
})
</script>

<style scoped>
.content-display-container {
  width: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-mode {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.content-type-selector {
  margin-right: 15px;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-area {
  padding: 15px;
  flex: 1;
  display: flex;
}

.html-editor, .amis-editor {
  width: 100%;
  flex: 1;
}

.preview-area {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preview-container {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  background-color: #fafafa;
  flex: 1;
  overflow: auto;
}

.error-message {
  color: #f56c6c;
  background-color: #fef0f0;
  padding: 10px;
  border-radius: 4px;
  border-left: 4px solid #f56c6c;
}

.html-preview, .amis-preview, .html-render, .amis-render {
  width: 100%;
  flex: 1;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 15px;
  background-color: #fff;
  overflow: auto;
}

.html-render.bpmn-html-content {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
  border: none !important;
  background-color: transparent !important;
  overflow: hidden !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* BPMN上下文中的AMIS组件样式优化 */
.bpmn-html-content :deep(.amis-content-wrapper),
.bpmn-html-content :deep(.amis-render) {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  overflow: auto !important;
}

/* 优化表单组件在小空间中的显示 */
.bpmn-html-content :deep(.checkboxes-group),
.bpmn-html-content :deep(.radios-group) {
  font-size: 10px !important;
  line-height: 1.2 !important;
}

.bpmn-html-content :deep(input),
.bpmn-html-content :deep(select),
.bpmn-html-content :deep(label) {
  font-size: 10px !important;
  transform: scale(0.8);
  transform-origin: left center;
}

.amis-error {
  color: #f56c6c;
  padding: 10px;
}

.amis-content-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  min-height: 100%;
  min-width: 100%;
}

/* 特别处理小容器中的AMIS内容 */
.amis-content-wrapper :deep(*) {
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
  min-height: auto;
  min-width: auto;
}

/* 在BPMN节点小容器中的特殊样式 */
.render-mode .amis-content-wrapper,
.bpmn-html-content .amis-content-wrapper {
  width: 100% !important;
  height: 100% !important;
}

.amis-placeholder {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  color: #999;
  font-style: italic;
}

.render-mode {
  padding: 15px;
  flex: 1;
  overflow: auto;
}
</style>
