<template>
  <div class="content-display-usage">
    <h2>ContentDisplay 组件使用示例</h2>

    <!-- 基础使用 - 只读展示 -->
    <section class="usage-section">
      <h3>1. 基础使用 - HTML内容只读展示</h3>
      <ContentDisplay
        :content="basicHtmlContent"
        content-type="html"
      />
    </section>

    <!-- 基础使用 - AMIS内容 -->
    <section class="usage-section">
      <h3>2. 基础使用 - AMIS内容只读展示</h3>
      <ContentDisplay
        :content="basicAmisContent"
        content-type="amis"
      />
    </section>

    <!-- 可编辑模式 -->
    <section class="usage-section">
      <h3>3. 可编辑模式</h3>
      <el-button
        @click="toggleEditable"
        size="small"
        style="margin-bottom: 10px;"
      >
        {{ showEditable ? '隐藏编辑器' : '显示编辑器' }}
      </el-button>

      <ContentDisplay
        :content="editableContent"
        content-type="html"
        :editable="true"
        :showEditor="showEditable"
        @update:content="editableContent = $event"
        @change="onContentChange"
      />
    </section>

    <!-- 高度自定义 -->
    <section class="usage-section">
      <h3>4. 高度自定义</h3>
      <ContentDisplay
        :content="tallContent"
        content-type="html"
        :height="'500px'"
      />
    </section>

    <!-- 高级编辑模式 -->
    <section class="usage-section">
      <h3>5. 高级编辑模式 - 支持AMIS Schema</h3>
      <el-button
        @click="toggleAdvancedEditor"
        size="small"
        style="margin-bottom: 10px;"
      >
        {{ showAdvancedEditor ? '隐藏编辑器' : '显示AMIS编辑器' }}
      </el-button>

      <ContentDisplay
        :content="advancedContent"
        content-type="amis"
        :editable="true"
        :showEditor="showAdvancedEditor"
        :height="'400px'"
        @update:content="advancedContent = $event"
        @update:contentType="advancedContentType = $event"
        @change="onAdvancedContentChange"
      />
    </section>

    <!-- 状态面板 -->
    <section class="usage-section">
      <h3>6. 当前状态</h3>
      <div class="status-panel">
        <p><strong>HTML内容预览:</strong></p>
        <pre class="content-preview">{{ basicHtmlContent }}</pre>

        <p><strong>AMIS内容预览:</strong></p>
        <pre class="content-preview">{{ basicAmisContent.substring(0, 200) }}...</pre>

        <p><strong>可编辑内容:</strong></p>
        <pre class="content-preview">{{ editableContent }}</pre>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ContentDisplay from './ContentDisplay.vue'

// 基础HTML内容
const basicHtmlContent = ref(`
<div style="padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
  <h4 style="color: #333;">基础HTML内容展示</h4>
  <p>这是使用ContentDisplay组件展示的HTML内容。</p>
  <ul>
    <li>支持富文本内容</li>
    <li>支持自定义样式</li>
    <li>可实时渲染HTML</li>
  </ul>
  <div style="margin-top: 15px;">
    <button style="padding: 8px 16px; background-color: #409eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
      示例按钮
    </button>
  </div>
</div>
`)

// 基础AMIS内容
const basicAmisContent = ref(JSON.stringify({
  type: "page",
  title: "AMIS页面示例",
  body: [
    {
      type: "wrapper",
      className: "bg-light",
      body: [
        {
          type: "html",
          html: "<h4>AMIS内容展示</h4><p>这是使用AMIS Schema渲染的内容</p>"
        }
      ]
    },
    {
      type: "divider"
    },
    {
      type: "form",
      body: [
        {
          type: "text",
          name: "name",
          label: "姓名"
        },
        {
          type: "select",
          name: "city",
          label: "城市",
          options: [
            { label: "北京", value: "beijing" },
            { label: "上海", value: "shanghai" },
            { label: "广州", value: "guangzhou" }
          ]
        }
      ]
    }
  ]
}, null, 2))

// 可编辑内容
const editableContent = ref('<div><h4>可编辑内容</h4><p>这是一个可以编辑的内容区域</p><ul><li>列表项1</li><li>列表项2</li></ul></div>')
const showEditable = ref(false)

// 高内容量的内容
const tallContent = ref(`
<div style="padding: 20px;">
  <h4>高度自定义内容</h4>
  <p>这个内容区域设置了自定义高度为500px。</p>

  <div style="margin: 15px 0; padding: 10px; background-color: #f0f9eb; border: 1px solid #e1f3d8; border-radius: 4px;">
    <h5>特色功能模块</h5>
    <p>支持多种内容格式和自定义样式</p>
  </div>

  <div style="margin: 15px 0; padding: 10px; background-color: #f4f4f5; border: 1px solid #e4e7ed; border-radius: 4px;">
    <h5>配置选项</h5>
    <ul>
      <li>支持HTML和AMIS格式</li>
      <li>可编辑模式</li>
      <li>高度自定义</li>
      <li>实时预览</li>
      <li>错误处理</li>
    </ul>
  </div>

  <div style="margin: 15px 0; padding: 10px; background-color: #ecf5ff; border: 1px solid #d9ecff; border-radius: 4px;">
    <h5>使用场景</h5>
    <ol>
      <li>BPMN节点内容配置</li>
      <li>表单内容展示</li>
      <li>动态页面渲染</li>
      <li>可视化编辑器</li>
    </ol>
  </div>

  <p>这个组件非常适合需要动态内容展示和编辑的场景。通过简单的props配置，可以实现丰富的功能。</p>
  <p>组件支持以下特性:</p>
  <ul>
    <li>HTML内容渲染</li>
    <li>AMIS Schema渲染</li>
    <li>编辑模式切换</li>
    <li>内容类型切换</li>
    <li>实时预览</li>
    <li>错误处理</li>
    <li>高度自定义</li>
  </ul>
</div>
`)

// 高级内容编辑
const advancedContent = ref(JSON.stringify({
  type: "page",
  title: "高级AMIS编辑",
  body: [
    {
      type: "html",
      html: "<h4>高级AMIS内容</h4><p>这个内容使用AMIS Schema进行定义</p>"
    },
    {
      type: "grid",
      columns: [
        {
          body: [
            {
              type: "html",
              html: "<div style='padding: 10px; background: #f0f0f0; border-radius: 4px;'>列1</div>"
            }
          ],
          md: 6
        },
        {
          body: [
            {
              type: "html",
              html: "<div style='padding: 10px; background: #e6f4ff; border-radius: 4px;'>列2</div>"
            }
          ],
          md: 6
        }
      ]
    }
  ]
}, null, 2))
const advancedContentType = ref('amis')
const showAdvancedEditor = ref(false)

// 方法
const toggleEditable = () => {
  showEditable.value = !showEditable.value
}

const toggleAdvancedEditor = () => {
  showAdvancedEditor.value = !showAdvancedEditor.value
}

const onContentChange = (data) => {
  console.log('内容变更:', data)
}

const onAdvancedContentChange = (data) => {
  console.log('高级内容变更:', data)
}
</script>

<style scoped>
.content-display-usage {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.usage-section {
  margin-bottom: 40px;
  padding: 25px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background-color: #fafafa;
}

h2 {
  color: #303133;
  margin-bottom: 30px;
  text-align: center;
}

h3 {
  color: #606266;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
}

.status-panel {
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
  max-height: 200px;
  overflow-y: auto;
}

pre {
  margin: 10px 0;
}
</style>
</template>