# Xdef 可视化编辑器 - 实现文档

## 项目结构

```
xdef-visual-editor/
├── src/
│   ├── components/           # Vue 组件
│   │   ├── XdefEditor.vue          # 主编辑器组件
│   │   ├── PathSelector.vue        # 路径选择器
│   │   ├── ErrorCodeSelector.vue   # 错误码选择器
│   │   ├── ConditionBuilder.vue    # 条件构建器
│   │   └── ConditionTreeEditor.vue # 条件树编辑器
│   ├── parsers/             # 解析器
│   │   └── enhanced-xdef-parser.ts # 增强版 Xdef 解析器
│   ├── loaders/             # 加载器
│   │   └── field-mapping-loader.ts # 字段映射加载器
│   ├── engines/             # 引擎
│   │   ├── hint-engine.ts          # 提示引擎
│   │   └── export-engine.ts        # 导出引擎
│   ├── generators/          # 生成器
│   │   └── form-generator.ts       # 表单生成器
│   ├── types/               # 类型定义
│   │   └── index.ts                # 核心类型定义
│   └── index.ts             # 导出入口
├── config/                  # 配置文件
│   └── field-mapping-sample.yaml  # 示例字段映射
├── examples/                # 示例
│   ├── App.vue
│   ├── main.ts
│   └── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 核心架构

### 1. 解析器层 (Parsers)

**EnhancedXdefParser** - 增强版 Xdef 解析器

功能：
- 解析任意 Xdef 文件
- 支持 xdef:ref 引用解析
- 支持 xdef:define 定义
- 支持 unknown-tag 处理
- 支持 filter-bean 引用
- 自动解析依赖文件

关键方法：
```typescript
async parse(xdefPath: string): Promise<XdefMetadata>
private parseXdefAttributes(element, metadata, $)
private parseXdefDefines(element, metadata, $)
private parseUnknownTags(element, metadata, $)
private async resolveDependencies(metadata)
```

### 2. 加载器层 (Loaders)

**FieldMappingLoader** - 字段映射加载器

功能：
- 从 ORM 模型加载字段映射
- 从配置文件加载字段映射
- 从 API 模型加载字段映射
- 从数据库加载字段映射
- 支持多来源合并

关键方法：
```typescript
async loadFromOrmModel(ormPath: string): Promise<FieldMapping>
async loadFromConfig(configPath: string): Promise<FieldMapping>
async loadFromApiModel(apiPath: string): Promise<FieldMapping>
async loadFromDatabase(connection: any): Promise<FieldMapping>
```

### 3. 引擎层 (Engines)

**HintEngine** - 提示引擎

功能：
- 模糊搜索字段
- 中文映射支持
- 路径预览
- 运算符推荐
- 错误码建议

关键方法：
```typescript
getFieldSuggestions(input: string, context: HintContext): FieldSuggestion[]
parsePath(path: string): FieldInfo | null
getErrorCodeSuggestions(input: string, relatedField?: string): string[]
getOperatorSuggestions(fieldType?: string): Array<{label: string; value: string}>
```

**ExportEngine** - 导出引擎

功能：
- 导出为 XML
- 导出为 JSON
- 导出为树形结构
- XML 验证
- XML 格式化

关键方法：
```typescript
exportToXml(data: FormData, options?: ExportOptions): string
exportToJson(data: FormData): string
exportToTree(data: FormData): any
validateXml(xml: string): { valid: boolean; errors: string[] }
```

### 4. 生成器层 (Generators)

**FormGenerator** - 表单生成器

功能：
- 根据 Xdef 元数据生成表单配置
- 支持不同类型 Xdef
- 自动推断元素类型
- 生成验证规则

关键方法：
```typescript
generateFormConfig(metadata: XdefMetadata, hintEngine: HintEngine): DynamicFormConfig
private generateValidatorFormElements(metadata, hintEngine): FormElement[]
private generateCheckFormElements(metadata, hintEngine): FormElement[]
```

### 5. 组件层 (Components)

**XdefEditor** - 主编辑器组件

功能：
- 表单编辑
- 条件树编辑
- 实时预览
- 导出功能
- 示例数据加载

**PathSelector** - 路径选择器

功能：
- 字段路径选择
- 智能提示
- 路径预览
- 中文映射

**ErrorCodeSelector** - 错误码选择器

功能：
- 错误码选择
- 自动建议
- 错误描述显示

**ConditionBuilder** - 条件构建器

功能：
- 简单条件编辑
- AND/OR/NOT 组合
- IF 条件判断
- 嵌套条件支持

**ConditionTreeEditor** - 条件树编辑器

功能：
- 树形结构展示
- 拖拽排序
- 节点编辑
- 节点删除

## 数据流

### 初始化流程

```
1. 用户传入 xdefPath 和 fieldMappingPath
   ↓
2. EnhancedXdefParser 解析 Xdef 文件
   ↓
3. FieldMappingLoader 加载字段映射
   ↓
4. HintEngine 初始化（使用字段映射）
   ↓
5. FormGenerator 生成表单配置
   ↓
6. XdefEditor 渲染界面
```

### 编辑流程

```
1. 用户在表单中编辑
   ↓
2. 组件更新 formData
   ↓
3. 监听器检测到变化
   ↓
4. ExportEngine 生成 XML
   ↓
5. 预览区实时显示
```

### 导出流程

```
1. 用户点击导出按钮
   ↓
2. ExportEngine 生成 XML/JSON
   ↓
3. 显示导出对话框
   ↓
4. 用户选择复制或下载
   ↓
5. 完成导出
```

## 类型系统

### 核心类型

- **XdefMetadata** - Xdef 文件元数据
- **XdefElement** - Xdef 元素定义
- **XdefType** - Xdef 类型定义
- **FieldMapping** - 字段映射
- **FieldInfo** - 字段信息
- **DynamicFormConfig** - 动态表单配置
- **FormElement** - 表单元素
- **ConditionNode** - 条件节点
- **FormData** - 表单数据
- **CheckData** - 检查规则数据

### 关键接口

```typescript
interface HintEngine {
  getFieldSuggestions(input: string, context: HintContext): FieldSuggestion[]
  parsePath(path: string): FieldInfo | null
  getOperatorSuggestions(fieldType?: string): Array<{label: string; value: string}>
}

interface ExportEngine {
  exportToXml(data: FormData, options?: ExportOptions): string
  exportToJson(data: FormData): string
  validateXml(xml: string): { valid: boolean; errors: string[] }
}

interface FormGenerator {
  generateFormConfig(metadata: XdefMetadata, hintEngine: HintEngine): DynamicFormConfig
}
```

## 扩展点

### 添加新的字段映射源

```typescript
class CustomFieldMappingLoader extends FieldMappingLoader {
  async loadFromCustom(source: string): Promise<FieldMapping> {
    // 自定义加载逻辑
  }
}
```

### 添加新的运算符

```typescript
hintEngine.getOperatorSuggestions = (fieldType?: string) => {
  const operators = [...defaultOperators]
  // 添加自定义运算符
  operators.push({ label: '自定义运算符', value: 'custom', type: 'custom' })
  return operators
}
```

### 添加新的导出格式

```typescript
class CustomExportEngine extends ExportEngine {
  exportToCustom(data: FormData): string {
    // 自定义导出逻辑
  }
}
```

## 性能优化

### 1. 缓存机制

- Xdef 解析结果缓存
- 字段映射缓存
- 提示结果缓存

### 2. 懒加载

- 组件懒加载
- 大数据量分页加载

### 3. 虚拟滚动

- 大列表虚拟滚动
- 树形组件虚拟滚动

## 测试策略

### 单元测试

- 解析器测试
- 加载器测试
- 引擎测试
- 生成器测试

### 集成测试

- 组件集成测试
- 端到端测试

### 测试覆盖率

- 目标覆盖率：80%+

## 部署

### 构建

```bash
npm run build
```

### 发布

```bash
npm publish
```

## 贡献指南

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 编写单元测试

### 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

## 问题排查

### 常见问题

1. **Xdef 解析失败**
   - 检查文件路径
   - 检查文件格式
   - 查看控制台错误

2. **字段映射不生效**
   - 检查配置文件格式
   - 检查字段路径
   - 重新加载配置

3. **提示不显示**
   - 检查 HintEngine 初始化
   - 检查字段映射
   - 查看网络请求

## 后续计划

### Phase 1

- [x] 核心功能实现
- [x] 基础组件开发
- [x] 示例文档编写

### Phase 2

- [ ] 单元测试完善
- [ ] 性能优化
- [ ] 错误处理增强

### Phase 3

- [ ] 插件系统
- [ ] 主题定制
- [ ] 多语言支持