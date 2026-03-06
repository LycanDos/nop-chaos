# Xdef 可视化编辑器

基于 Nop 框架的 `.xdef` 文件可视化编辑器，能够自动解析任意 Xdef 定义并生成对应的表单界面，实现"零代码"配置管理。

## ✨ 核心特性

### 🎯 完整的校验功能支持

- ✅ **简单条件**：单字段验证
- ✅ **条件判断**：if/else 逻辑
- ✅ **条件分支**：if-elif-else 多分支
- ✅ **组合条件**：AND/OR/NOT 逻辑组合
- ✅ **多层嵌套**：支持任意深度的条件嵌套
- ✅ **自定义表达式**：支持 JavaScript 表达式

### 🚀 智能提示引擎

- 🔍 **模糊搜索**：输入中文或英文自动匹配字段
- 🌐 **中文映射**：支持"用户名"、"邮箱"等中文搜索
- 📝 **路径预览**：选择字段后显示完整路径和类型
- 🏷️ **分类显示**：按实体分类显示字段
- 💡 **运算符推荐**：根据字段类型推荐合适的运算符

### 🎨 可视化编辑

- 📊 **条件树编辑器**：树形结构展示条件关系
- 🖱️ **拖拽操作**：拖拽节点调整顺序
- ➕ **动态添加**：动态添加或删除条件节点
- 👁️ **实时预览**：实时显示生成的 XML
- 🎯 **语法高亮**：支持表达式语法高亮

## 📦 安装

```bash
npm install @nop-chaos/xdef-visual-editor
```

## 🚀 快速开始

### 基本使用

```vue
<template>
  <XdefEditor 
    :xdefPath="'/path/to/validator.xdef'"
    :fieldMappingPath="'/path/to/field-mapping.yaml'"
    @export="handleExport"
  />
</template>

<script setup lang="ts">
import { XdefEditor } from '@nop-chaos/xdef-visual-editor'

const handleExport = (xml: string) => {
  console.log('Generated XML:', xml)
}
</script>
```

### 自定义字段映射

```typescript
import { FieldMappingLoader, HintEngine } from '@nop-chaos/xdef-visual-editor'

const loader = new FieldMappingLoader()
const fieldMapping = await loader.loadFromOrmModel('/path/to/model.orm.xml')

const hintEngine = new HintEngine(fieldMapping)
```

### 程序化使用

```typescript
import { 
  EnhancedXdefParser, 
  FormGenerator, 
  ExportEngine,
  HintEngine 
} from '@nop-chaos/xdef-visual-editor'

// 1. 解析 Xdef
const parser = new EnhancedXdefParser()
const metadata = await parser.parse('/path/to/validator.xdef')

// 2. 生成表单
const formGenerator = new FormGenerator()
const formConfig = formGenerator.generateFormConfig(metadata, hintEngine)

// 3. 导出 XML
const exportEngine = new ExportEngine()
const xml = exportEngine.exportToXml(formData)
```

## 📖 API 文档

### 组件 Props

#### XdefEditor

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| xdefPath | string | '' | Xdef 文件路径 |
| fieldMappingPath | string | '' | 字段映射配置文件路径 |

#### XdefEditor Events

| 事件 | 参数 | 说明 |
|------|------|------|
| export | (xml: string) => void | 导出 XML 时触发 |
| change | (data: FormData) => void | 表单数据变化时触发 |

### 核心类

#### EnhancedXdefParser

增强版 Xdef 解析器，支持复杂的 Xdef 文件解析。

```typescript
const parser = new EnhancedXdefParser(baseDir?)
const metadata = await parser.parse(xdefPath)
```

#### HintEngine

属性提示引擎，提供智能字段提示。

```typescript
const hintEngine = new HintEngine(fieldMapping, config?)
const suggestions = hintEngine.getFieldSuggestions(input, context)
```

#### ExportEngine

导出引擎，支持多种格式导出。

```typescript
const exportEngine = new ExportEngine()
const xml = exportEngine.exportToXml(formData, options?)
const json = exportEngine.exportToJson(formData)
const tree = exportEngine.exportToTree(formData)
```

#### FormGenerator

表单生成器，根据 Xdef 元数据生成动态表单。

```typescript
const formGenerator = new FormGenerator()
const formConfig = formGenerator.generateFormConfig(metadata, hintEngine)
```

## 📝 配置文件

### 字段映射配置 (YAML)

```yaml
entities:
  User:
    displayName: 用户
    fields:
      username:
        displayName: 用户名
        type: string
        aliases: [用户名, 账号, 登录名]
      email:
        displayName: 邮箱
        type: string
        aliases: [邮箱, 邮件]

pathAliases:
  user.username:
    - 用户名
    - 账号
```

## 🎯 支持的运算符

### 比较运算符

- `eq` - 等于
- `ne` - 不等于
- `gt` - 大于
- `ge` - 大于等于
- `lt` - 小于
- `le` - 小于等于

### 空值判断

- `isNull` - 为 null
- `notNull` - 不为 null
- `isEmpty` - 为空（null 或空字符串）
- `notEmpty` - 不为空
- `isBlank` - 为空或只包含空白字符
- `notBlank` - 不为空白

### 字符串操作

- `startsWith` - 以...开头
- `endsWith` - 以...结尾
- `contains` - 包含
- `regex` - 匹配正则表达式

### 长度检查

- `lengthBetween` - 长度在范围内
- `utf8LengthBetween` - UTF-8 编码长度在范围内
- `length` - 长度等于指定值
- `utf8Length` - UTF-8 编码长度等于指定值

### 范围检查

- `between` - 值在范围内
- `dateBetween` - 日期在范围内
- `yearBetween` - 年份在范围内
- `timeBetween` - 时间在范围内
- `dateTimeBetween` - 日期时间在范围内

### 集合操作

- `in` - 值在集合中
- `notIn` - 值不在集合中

### 布尔判断

- `isTrue` - 为 true
- `notTrue` - 不为 true
- `isFalse` - 为 false
- `notFalse` - 不为 false

## 🔧 开发

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 构建
npm run build

# 类型检查
npm run type-check
```

## 📄 许可证

Apache-2.0

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

- 项目地址：https://github.com/nop-chaos/xdef-visual-editor
- 问题反馈：https://github.com/nop-chaos/xdef-visual-editor/issues