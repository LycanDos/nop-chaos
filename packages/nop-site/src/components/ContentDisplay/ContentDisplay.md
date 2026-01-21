# ContentDisplay 组件

一个独立的内容展示组件，支持HTML和AMIS格式的内容展示与编辑。

## 功能特性

- **双格式支持**：支持HTML和AMIS Schema两种内容格式
- **编辑模式**：支持内容编辑和实时预览
- **自定义高度**：可配置组件显示高度
- **错误处理**：验证AMIS Schema格式并显示错误信息
- **事件系统**：提供完整的事件回调机制

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| content | String | '' | 要展示的内容 |
| contentType | String | 'html' | 内容类型，可选 'html' 或 'amis' |
| editable | Boolean | false | 是否启用编辑模式 |
| showEditor | Boolean | false | 是否显示编辑器界面 |
| height | String | '300px' | 组件高度 |

## Events

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| update:content | 内容更新时触发 | 新的内容字符串 |
| update:contentType | 内容类型更新时触发 | 新的内容类型 |
| change | 内容变更时触发 | `{ content: String, type: String }` |
| error | 发生错误时触发 | 错误信息字符串 |

## 使用示例

### 1. 基础使用 - HTML内容展示

```vue
<template>
  <ContentDisplay
    :content="htmlContent"
    content-type="html"
  />
</template>

<script setup>
import { ref } from 'vue'
import ContentDisplay from '@/components/ContentDisplay/ContentDisplay.vue'

const htmlContent = ref('<div><h4>HTML内容</h4><p>这是一个HTML内容展示</p></div>')
</script>
```

### 2. 基础使用 - AMIS内容展示

```vue
<template>
  <ContentDisplay
    :content="amisContent"
    content-type="amis"
  />
</template>

<script setup>
import { ref } from 'vue'
import ContentDisplay from '@/components/ContentDisplay/ContentDisplay.vue'

const amisContent = ref(JSON.stringify({
  type: "page",
  title: "AMIS页面",
  body: [{
    type: "html",
    html: "<div>AMIS内容</div>"
  }]
}, null, 2))
</script>
```

### 3. 可编辑模式

```vue
<template>
  <ContentDisplay
    :content="content"
    content-type="html"
    :editable="true"
    :showEditor="showEditor"
    @update:content="content = $event"
    @change="handleChange"
  />
</template>

<script setup>
import { ref } from 'vue'
import ContentDisplay from '@/components/ContentDisplay/ContentDisplay.vue'

const content = ref('<div>初始内容</div>')
const showEditor = ref(false)

const handleChange = (data) => {
  console.log('内容变更:', data)
}
</script>
```

### 4. 高度自定义

```vue
<ContentDisplay
  :content="content"
  content-type="html"
  :height="'500px'"
/>
```

### 5. 完整编辑器示例

```vue
<template>
  <div>
    <el-button @click="toggleEditor">
      {{ showEditor ? '关闭编辑器' : '打开编辑器' }}
    </el-button>

    <ContentDisplay
      :content="content"
      v-model:contentType="contentType"
      :editable="true"
      :showEditor="showEditor"
      @update:content="content = $event"
      @change="handleChange"
      @error="handleError"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ContentDisplay from '@/components/ContentDisplay/ContentDisplay.vue'

const content = ref('')
const contentType = ref('html')
const showEditor = ref(false)

const toggleEditor = () => {
  showEditor.value = !showEditor.value
}

const handleChange = (data) => {
  console.log('内容变更:', data)
}

const handleError = (error) => {
  console.error('内容错误:', error)
}
</script>
```

## 内容格式说明

### HTML格式
直接使用HTML字符串，支持所有标准HTML标签和内联样式。

### AMIS Schema格式
使用JSON格式的AMIS Schema，需要符合AMIS的规范结构。

```json
{
  "type": "page",
  "title": "页面标题",
  "body": [
    {
      "type": "html",
      "html": "<div>HTML内容</div>"
    }
  ]
}
```

## 注意事项

1. AMIS Schema必须是有效的JSON格式
2. 组件会自动验证AMIS Schema的格式
3. 在编辑模式下，内容变更会实时触发更新事件
4. 建议在生产环境中添加适当的错误边界处理

## 组件依赖

- Element Plus (el-input, el-button, el-radio-group, el-radio)
- AmisEditorDialog (用于AMIS可视化编辑)

## 开发建议

1. 在需要内容编辑功能的地方使用 `editable=true` 和 `showEditor=true`
2. 通过 `height` 属性控制组件大小以适应不同内容量
3. 使用 `change` 事件进行内容保存操作
4. 利用 `error` 事件处理内容格式错误