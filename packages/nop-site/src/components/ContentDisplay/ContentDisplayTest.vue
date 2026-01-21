<template>
  <div class="content-display-test">
    <h2>ContentDisplay 组件测试页面</h2>

    <div class="test-section">
      <h3>1. 只读模式 - HTML内容</h3>
      <ContentDisplay
        :content="htmlContent"
        content-type="html"
      />
    </div>

    <div class="test-section">
      <h3>2. 只读模式 - AMIS内容</h3>
      <ContentDisplay
        :content="amisContent"
        content-type="amis"
      />
    </div>

    <div class="test-section">
      <h3>3. 编辑模式 - HTML内容</h3>
      <el-button @click="toggleHtmlEditor" size="small" style="margin-bottom: 10px;">
        {{ showHtmlEditor ? '关闭编辑器' : '打开编辑器' }}
      </el-button>
      <ContentDisplay
        :content="htmlContent"
        content-type="html"
        :editable="true"
        :showEditor="showHtmlEditor"
        @update:content="htmlContent = $event"
        @change="handleChange"
      />
    </div>

    <div class="test-section">
      <h3>4. 编辑模式 - AMIS内容</h3>
      <el-button @click="toggleAmisEditor" size="small" style="margin-bottom: 10px;">
        {{ showAmisEditor ? '关闭编辑器' : '打开编辑器' }}
      </el-button>
      <ContentDisplay
        :content="amisContent"
        content-type="amis"
        :editable="true"
        :showEditor="showAmisEditor"
        @update:content="amisContent = $event"
        @change="handleChange"
      />
    </div>

    <div class="test-section">
      <h3>5. 编辑模式 - 带初始内容</h3>
      <el-button @click="toggleInitialEditor" size="small" style="margin-bottom: 10px;">
        {{ showInitialEditor ? '关闭编辑器' : '打开编辑器' }}
      </el-button>
      <ContentDisplay
        :content="initialContent"
        content-type="html"
        :editable="true"
        :showEditor="showInitialEditor"
        @update:content="initialContent = $event"
        @change="handleChange"
      />
    </div>

    <div class="test-section">
      <h3>状态信息</h3>
      <div>
        <p>HTML内容: {{ htmlContent }}</p>
        <p>AMIS内容: {{ amisContent.substring(0, 100) }}...</p>
        <p>初始内容: {{ initialContent }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ContentDisplay from './ContentDisplay.vue'

// 示例HTML内容
const htmlContent = ref('<div><h4>这是一个HTML内容</h4><p>这里是可以编辑的HTML内容</p><ul><li>列表项1</li><li>列表项2</li></ul></div>')

// 示例AMIS内容
const amisContent = ref(JSON.stringify({
  type: "page",
  title: "AMIS测试页面",
  body: [
    {
      type: "html",
      html: "<h4>这是一个AMIS内容</h4><p>这是AMIS渲染的内容</p>"
    },
    {
      type: "wrapper",
      body: [
        {
          type: "html",
          html: "<div style='background-color: #f0f0f0; padding: 10px;'>AMIS包装内容</div>"
        }
      ]
    }
  ]
}, null, 2))

// 初始内容
const initialContent = ref('<div><p>这是带有初始内容的编辑器</p><p>可以在这里编辑内容</p></div>')

// 编辑器显示状态
const showHtmlEditor = ref(false)
const showAmisEditor = ref(false)
const showInitialEditor = ref(false)

// 切换编辑器显示
const toggleHtmlEditor = () => {
  showHtmlEditor.value = !showHtmlEditor.value
}

const toggleAmisEditor = () => {
  showAmisEditor.value = !showAmisEditor.value
}

const toggleInitialEditor = () => {
  showInitialEditor.value = !showInitialEditor.value
}

// 处理内容变更
const handleChange = (data) => {
  console.log('内容变更:', data)
}
</script>

<style scoped>
.content-display-test {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

h2 {
  color: #303133;
  margin-bottom: 20px;
}

h3 {
  color: #606266;
  margin-bottom: 15px;
}
</style>
</template>