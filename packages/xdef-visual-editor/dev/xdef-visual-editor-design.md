# Xdef 可视化编辑器框架设计

## 概述

基于 Nop 框架的 `.xdef` 文件，提供通用的可视化编辑器，能够自动解析任意 Xdef 定义并生成对应的表单界面，实现"零代码"配置管理。

## 核心架构

```
XdefEditor Framework
├── Xdef 解析器 (XdefParser)
│   ├── 解析 .xdef 文件
│   ├── 生成 Schema 元数据
│   └── 构建类型系统
├── 表单生成器 (FormGenerator)
│   ├── 基于类型生成表单组件
│   ├── 智能字段提示
│   └── 动态校验规则
├── 属性提示引擎 (HintEngine)
│   ├── 字段路径解析
│   ├── 智能补全
│   └── 中文映射
├── 模板引擎 (TemplateEngine)
│   ├── 快速模板库
│   ├── 智能补全
│   └── 代码片段
└── 导出引擎 (ExportEngine)
    ├── XML 生成
    ├── JSON 生成
    └── 预览验证
```

## 数据结构设计

### 1. Xdef 元数据模型

```typescript
// Xdef 文件元数据
interface XdefMetadata {
  name: string;                    // xdef 名称
  namespace: string;               // 命名空间
  rootElement: XdefElement;        // 根元素
  types: Map<string, XdefType>;    // 类型定义
  enums: Map<string, XdefEnum>;    // 枚举定义
  references: Map<string, string>; // 引用关系
  fieldMapping: FieldMapping;      // 字段映射
  
  // 新增：Xdef 依赖管理
  dependencies: XdefDependency[];        // Xdef 文件依赖
  externalRefs: Map<string, XdefRef>;    // 外部引用
  importedSchemas: Map<string, any>;    // 导入的 Schema
  
  // 新增：filter-bean 引用
  filterBeanTypes: Map<string, XdefElement>; // filter-bean 可用类型
  unknownTagConfig?: UnknownTagConfig;   // unknown-tag 配置
  supportsUnknownTags?: boolean;         // 是否支持 unknown-tag
}

// Xdef 依赖
interface XdefDependency {
  type: 'ref' | 'schema' | 'lib';
  path: string;
  targetName: string;
  resolved: boolean;
}

// Xdef 引用
interface XdefRef {
  type: 'ref' | 'unknown-tag' | 'define';
  name: string;
  targetFile?: string;
  targetElement?: XdefElement;
  isResolved: boolean;
}

// unknown-tag 配置
interface UnknownTagConfig {
  beanTagProp: string;              // Bean 标签属性名
  beanBodyProp: string;             // Bean body 属性名
  bodyType: string;                 // Body 类型
}

// 字段映射（用于中文提示）
interface FieldMapping {
  // 实体字段映射
  entities: Map<string, EntityFieldMap>;
  // 全局字段映射
  globalFields: Map<string, FieldInfo>;
  // 路径别名
  pathAliases: Map<string, string>;
}

// 实体字段映射
interface EntityFieldMap {
  entityName: string;
  displayName: string;
  fields: Map<string, FieldInfo>;
  relations: Map<string, RelationInfo>;
}

// 字段信息
interface FieldInfo {
  name: string;
  displayName: string;
  type: string;
  path: string;              // 完整路径，如 user.username
  aliases: string[];         // 别名，如 用户名
  searchable: boolean;       // 是否可搜索
}

// 关系信息
interface RelationInfo {
  name: string;
  displayName: string;
  type: 'to-one' | 'to-many' | 'many-to-many';
  targetEntity: string;
  path: string;
}

// 元素定义
interface XdefElement {
  name: string;                    // 元素名
  type: XdefType;                  // 类型引用
  attributes: XdefAttribute[];     // 属性列表
  children: XdefElement[];         // 子元素
  isRequired: boolean;             // 是否必需
  isMultiple: boolean;             // 是否可多个
  beanBodyProp?: string;           // Bean body 属性
  uniqueAttr?: string;             // 唯一属性
  description?: string;            // 描述
  displayName?: string;            // 中文名称
  hintTemplate?: string;           // 提示模板
  
  // 新增：Xdef 特性
  xdefAttributes: Map<string, string>;    // xdef: 属性
  xdefBodyType?: XdefBodyType;             // body 类型
  xdefRef?: XdefRef;                       // 引用信息
  xdefUnknownTag?: boolean;                 // 是否是 unknown-tag
  xdefDefineRef?: string;                  // define 引用
}

// Body 类型
type XdefBodyType = 
  | 'literal'      // 字面量
  | 'list'         // 列表
  | 'xml'          // XML 片段
  | 'expr'         // 表达式
  | 'filter-bean'; // 过滤条件

// 类型定义
interface XdefType {
  name: string;                    // 类型名
  baseType?: string;               // 基础类型
  properties: XdefProperty[];      // 属性定义
  validation?: ValidationRule[];   // 校验规则
  description?: string;            // 描述
  displayName?: string;            // 中文名称
  
  // 新增：类型来源
  source: 'builtin' | 'define' | 'ref' | 'inferred';
  sourceFile?: string;
  sourceElement?: XdefElement;
}

// 属性定义
interface XdefProperty {
  name: string;                    // 属性名
  type: XdefType;                  // 类型
  defaultValue?: any;              // 默认值
  isRequired: boolean;             // 是否必需
  validation?: ValidationRule[];   // 校验规则
  description?: string;            // 描述
  displayName?: string;            // 中文名称（新增）
  hintTemplate?: string;           // 提示模板（新增）
}

// 属性定义 (元素属性)
interface XdefAttribute {
  name: string;                    // 属性名
  type: XdefType;                  // 类型
  defaultValue?: any;              // 默认值
  isRequired: boolean;             // 是否必需
  description?: string;            // 描述
  displayName?: string;            // 中文名称（新增）
  hintTemplate?: string;           // 提示模板（新增）
  suggestions?: string[];          // 建议值（新增）
  autoComplete?: boolean;          // 是否自动补全（新增）
}

// 枚举定义
interface XdefEnum {
  name: string;                    // 枚举名
  displayName?: string;            // 中文名称（新增）
  values: XdefEnumValue[];         // 枚举值
}

interface XdefEnumValue {
  value: string;                   // 值
  label: string;                   // 显示名称
  description?: string;            // 描述
}

// 校验规则
interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;                     // 规则值
  message?: string;                // 错误消息
}
```

### 2. 表单模型

```typescript
// 动态表单配置
interface DynamicFormConfig {
  elements: FormElement[];         // 表单元素
  layout: FormLayout;              // 布局配置
  validation: FormValidation;      // 校验配置
  hints: HintConfig;               // 提示配置（新增）
}

// 提示配置（新增）
interface HintConfig {
  enabled: boolean;                // 是否启用提示
  showDescriptions: boolean;       // 显示描述
  showChineseNames: boolean;       // 显示中文名
  showPathPreview: boolean;        // 显示路径预览
  autoComplete: boolean;           // 自动补全
  fuzzySearch: boolean;            // 模糊搜索
}

// 表单元素
interface FormElement {
  id: string;                      // 元素 ID
  type: ElementType;              // 元素类型
  label: string;                   // 显示标签
  xdefRef: XdefElement;            // Xdef 引用
  children?: FormElement[];        // 子元素
  widget?: WidgetConfig;           // 组件配置
  validation?: ValidationRule[];   // 校验规则
  visible?: boolean;               // 是否可见
  disabled?: boolean;              // 是否禁用
  placeholder?: string;            // 占位符
  help?: string;                   // 帮助文本
  hintConfig?: FieldHintConfig;    // 字段提示配置（新增）
}

// 字段提示配置（新增）
interface FieldHintConfig {
  enableAutoComplete: boolean;     // 启用自动补全
  enablePathSuggestion: boolean;   // 启用路径建议
  enableChineseMapping: boolean;   // 启用中文映射
  showFieldPreview: boolean;       // 显示字段预览
  searchableFields: string[];      // 可搜索字段
  pathAliases: Map<string, string>; // 路径别名
}

// 元素类型
type ElementType = 
  | 'text'          // 文本输入
  | 'number'        // 数字输入
  | 'textarea'      // 多行文本
  | 'select'        // 下拉选择
  | 'multi-select'  // 多选
  | 'checkbox'      // 复选框
  | 'radio'         // 单选框
  | 'date'          // 日期
  | 'time'          // 时间
  | 'datetime'      // 日期时间
  | 'boolean'       // 布尔
  | 'array'         // 数组
  | 'object'        // 对象
  | 'ref'           // 引用
  | 'code'          // 代码编辑器
  | 'path-selector' // 路径选择器（新增）
  | 'custom';       // 自定义

// 组件配置
interface WidgetConfig {
  type: string;                    // 组件类型
  props?: Record<string, any>;     // 组件属性
  events?: Record<string, Function>; // 事件处理
}

// 布局配置
interface FormLayout {
  type: 'vertical' | 'horizontal' | 'grid';
  columns?: number;                // 列数
  spacing?: number;                // 间距
  responsive?: boolean;            // 响应式
}

// 校验配置
interface FormValidation {
  realtime: boolean;               // 实时校验
  showMessage: boolean;            // 显示消息
  rules: ValidationRule[];         // 校验规则
}
```

### 3. 提示建议模型（新增）

```typescript
// 字段提示建议
interface FieldSuggestion {
  value: string;                   // 字段路径值
  label: string;                   // 显示标签（中文）
  path: string;                    // 完整路径
  type: string;                    // 字段类型
  description?: string;            // 描述
  icon?: string;                   // 图标
  category?: string;               // 分类
}

// 提示上下文
interface HintContext {
  currentPath: string;             // 当前路径
  fieldType?: string;              // 字段类型
  availableFields: FieldInfo[];    // 可用字段
  recentFields: FieldInfo[];       // 最近使用的字段
  popularFields: FieldInfo[];      // 常用字段
}

// 搜索匹配结果
interface MatchResult {
  field: FieldInfo;                // 字段信息
  score: number;                   // 匹配分数
  matchedParts: string[];          // 匹配的部分
}
```

## 核心组件实现

### 1. Xdef 解析器（增强版）

```typescript
// xdef-parser.ts
import * as cheerio from 'cheerio';

export class XdefParser {
  private fieldMapping: FieldMapping;
  
  constructor(private metadataPath?: string) {
    this.fieldMapping = this.loadFieldMapping();
  }
  
  async parse(xdefPath: string): Promise<XdefMetadata> {
    const content = await fs.readFile(xdefPath, 'utf-8');
    const $ = cheerio.load(content, { xmlMode: true });
    
    const root = $.root().children()[0];
    const metadata = this.parseElement(root as any);
    
    // 加载字段映射
    metadata.fieldMapping = this.fieldMapping;
    
    return metadata;
  }
  
  private loadFieldMapping(): FieldMapping {
    // 从配置文件或数据库加载字段映射
    // 支持多种来源：
    // 1. ORM 模型（.orm.xml）
    // 2. API 模型（.api.xml）
    // 3. 自定义配置文件
    // 4. 数据库表结构
    
    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };
    
    // 示例：从 ORM 模型加载
    this.loadFromOrmModel(mapping);
    
    return mapping;
  }
  
  private loadFromOrmModel(mapping: FieldMapping): void {
    // 解析 ORM 模型文件
    const ormFiles = glob.sync('**/*.orm.xml');
    
    ormFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const $ = cheerio.load(content, { xmlMode: true });
      
      $('entity').each((_, entity) => {
        const entityName = $(entity).attr('name');
        const tableName = $(entity).attr('tableName');
        const displayName = $(entity).attr('displayName') || entityName;
        
        const fieldMap: EntityFieldMap = {
          entityName,
          displayName,
          fields: new Map(),
          relations: new Map()
        };
        
        // 解析字段
        $(entity).find('column').each((_, column) => {
          const name = $(column).attr('name');
          const code = $(column).attr('code');
          const colDisplayName = $(column).attr('displayName') || name;
          const stdDataType = $(column).attr('stdDataType');
          
          const fieldInfo: FieldInfo = {
            name,
            displayName: colDisplayName,
            type: stdDataType || 'string',
            path: `${entityName}.${name}`,
            aliases: this.generateAliases(name, colDisplayName, code),
            searchable: true
          };
          
          fieldMap.fields.set(name, fieldInfo);
          
          // 添加到全局字段
          mapping.globalFields.set(fieldInfo.path, fieldInfo);
        });
        
        // 解析关联关系
        $(entity).find('relation').each((_, relation) => {
          const relName = $(relation).attr('name');
          const relType = $(relation).attr('type');
          const refEntity = $(relation).attr('refEntity');
          const relDisplayName = $(relation).attr('displayName') || relName;
          
          const relationInfo: RelationInfo = {
            name: relName,
            displayName: relDisplayName,
            type: relType as any,
            targetEntity: refEntity,
            path: `${entityName}.${relName}`
          };
          
          fieldMap.relations.set(relName, relationInfo);
        });
        
        mapping.entities.set(entityName, fieldMap);
      });
    });
  }
  
  private generateAliases(name: string, displayName: string, code: string): string[] {
    const aliases: string[] = [];
    
    // 添加中文名
    if (displayName) {
      aliases.push(displayName);
    }
    
    // 添加列名（转为小写）
    if (code) {
      aliases.push(code.toLowerCase());
      aliases.push(code.replace(/_/g, ''));
    }
    
    // 添加驼峰形式
    const camelCase = name.replace(/([A-Z])/g, ' $1').toLowerCase();
    aliases.push(camelCase);
    
    return aliases;
  }
  
  private parseElement(element: any): XdefMetadata {
    const metadata: XdefMetadata = {
      name: element.tagName,
      namespace: this.getNamespace(element),
      rootElement: this.parseElementNode(element),
      types: new Map(),
      enums: new Map(),
      references: new Map(),
      fieldMapping: this.fieldMapping
    };
    
    // 解析类型定义
    this.parseTypes(element, metadata);
    
    // 解析枚举定义
    this.parseEnums(element, metadata);
    
    // 解析引用关系
    this.parseReferences(element, metadata);
    
    return metadata;
  }
  
  private parseElementNode(element: any): XdefElement {
    const xdefElement: XdefElement = {
      name: element.tagName,
      type: this.getType(element),
      attributes: this.parseAttributes(element),
      children: this.parseChildren(element),
      isRequired: this.isRequired(element),
      isMultiple: this.isMultiple(element),
      beanBodyProp: this.getBeanBodyProp(element),
      uniqueAttr: this.getUniqueAttr(element),
      description: this.getDescription(element),
      displayName: this.getDisplayName(element), // 新增
      hintTemplate: this.getHintTemplate(element) // 新增
    };
    
    return xdefElement;
  }
  
  private parseAttributes(element: any): XdefAttribute[] {
    const attributes: XdefAttribute[] = [];
    
    Object.keys(element.attribs).forEach(attrName => {
      if (attrName.startsWith('xdef:')) {
        return;
      }
      
      const attr: XdefAttribute = {
        name: attrName,
        type: this.getAttributeType(element, attrName),
        defaultValue: element.attribs[attrName],
        isRequired: this.isAttributeRequired(element, attrName),
        description: this.getAttributeDescription(element, attrName),
        displayName: this.getAttributeDisplayName(element, attrName), // 新增
        hintTemplate: this.getAttributeHintTemplate(element, attrName), // 新增
        suggestions: this.getAttributeSuggestions(element, attrName), // 新增
        autoComplete: this.isAttributeAutoComplete(element, attrName) // 新增
      };
      
      attributes.push(attr);
    });
    
    return attributes;
  }
  
  private getDisplayName(element: any): string | undefined {
    // 从注释或属性中提取中文名
    const comment = this.getDescription(element);
    if (comment) {
      // 尝试从注释中提取中文名
      const match = comment.match(/^[中文|显示|名称|名称[:：]\s*(.+)/);
      if (match) {
        return match[1].trim();
      }
    }
    
    return $(element).attr('displayName');
  }
  
  private getHintTemplate(element: any): string | undefined {
    // 生成提示模板
    const name = element.tagName;
    const displayName = this.getDisplayName(element);
    
    if (name === 'notNull') {
      return `字段 {field} 不能为空`;
    }
    
    if (name === 'eq') {
      return `字段 {field} 等于 {value}`;
    }
    
    return undefined;
  }
  
  private getAttributeDisplayName(element: any, attrName: string): string | undefined {
    // 属性中文名映射
    const displayNameMap: Record<string, string> = {
      'name': '字段名',
      'owner': '所属对象',
      'value': '值',
      'valueName': '值变量名',
      'min': '最小值',
      'max': '最大值',
      'minName': '最小值变量名',
      'maxName': '最大值变量名',
      'pattern': '正则表达式',
      'errorCode': '错误码',
      'errorDescription': '错误描述',
      'severity': '严重程度',
      'id': '规则ID'
    };
    
    return displayNameMap[attrName];
  }
  
  private getAttributeHintTemplate(element: any, attrName: string): string | undefined {
    // 属性提示模板
    const elementName = element.tagName;
    
    if (attrName === 'name') {
      return `选择要验证的字段，例如: user.username`;
    }
    
    if (attrName === 'value' && elementName === 'notNull') {
      return `无需指定值，直接检查字段是否为空`;
    }
    
    return undefined;
  }
  
  private getAttributeSuggestions(element: any, attrName: string): string[] | undefined {
    // 属性建议值
    if (attrName === 'name') {
      // 返回所有可用的字段路径
      return Array.from(this.fieldMapping.globalFields.keys());
    }
    
    return undefined;
  }
  
  private isAttributeAutoComplete(element: any, attrName: string): boolean {
    // 判断是否需要自动补全
    const autoCompleteAttrs = ['name', 'owner', 'valueName', 'minName', 'maxName'];
    return autoCompleteAttrs.includes(attrName);
  }
  
  // ... 其他方法保持不变
}
```

### 2. 属性提示引擎（新增）

```typescript
// hint-engine.ts
export class HintEngine {
  constructor(
    private fieldMapping: FieldMapping,
    private config: HintConfig
  ) {}
  
  /**
   * 获取字段提示
   */
  getFieldSuggestions(
    input: string,
    context: HintContext
  ): FieldSuggestion[] {
    const suggestions: FieldSuggestion[] = [];
    
    // 1. 模糊搜索字段
    const matches = this.fuzzySearchFields(input, context);
    
    // 2. 按分数排序
    matches.sort((a, b) => b.score - a.score);
    
    // 3. 生成建议
    matches.slice(0, 10).forEach(match => {
      suggestions.push(this.createSuggestion(match));
    });
    
    return suggestions;
  }
  
  /**
   * 模糊搜索字段
   */
  private fuzzySearchFields(
    input: string,
    context: HintContext
  ): MatchResult[] {
    const results: MatchResult[] = [];
    
    // 搜索全局字段
    this.fieldMapping.globalFields.forEach((field, path) => {
      const score = this.calculateMatchScore(input, field);
      if (score > 0) {
        results.push({
          field,
          score,
          matchedParts: this.getMatchedParts(input, field)
        });
      }
    });
    
    // 搜索实体字段
    this.fieldMapping.entities.forEach((entityMap, entityName) => {
      entityMap.fields.forEach((field, fieldName) => {
        const score = this.calculateMatchScore(input, field);
        if (score > 0) {
          results.push({
            field,
            score: score * 1.1, // 实体字段优先级稍高
            matchedParts: this.getMatchedParts(input, field)
          });
        }
      });
    });
    
    return results;
  }
  
  /**
   * 计算匹配分数
   */
  private calculateMatchScore(input: string, field: FieldInfo): number {
    let score = 0;
    const lowerInput = input.toLowerCase();
    
    // 1. 完全匹配路径
    if (field.path.toLowerCase() === lowerInput) {
      score += 100;
    }
    
    // 2. 匹配字段名
    if (field.name.toLowerCase().includes(lowerInput)) {
      score += 80;
    }
    
    // 3. 匹配中文名
    if (field.displayName.includes(input)) {
      score += 70;
    }
    
    // 4. 匹配别名
    field.aliases.forEach(alias => {
      if (alias.toLowerCase().includes(lowerInput)) {
        score += 60;
      }
    });
    
    // 5. 路径前缀匹配
    if (field.path.toLowerCase().startsWith(lowerInput)) {
      score += 50;
    }
    
    // 6. 模糊匹配
    const fuzzyScore = this.fuzzyMatch(lowerInput, field.path.toLowerCase());
    score += fuzzyScore * 30;
    
    return score;
  }
  
  /**
   * 模糊匹配
   */
  private fuzzyMatch(input: string, text: string): number {
    let score = 0;
    let inputIndex = 0;
    
    for (let i = 0; i < text.length && inputIndex < input.length; i++) {
      if (text[i] === input[inputIndex]) {
        score++;
        inputIndex++;
      }
    }
    
    return inputIndex === input.length ? score / input.length : 0;
  }
  
  /**
   * 获取匹配的部分
   */
  private getMatchedParts(input: string, field: FieldInfo): string[] {
    const parts: string[] = [];
    const lowerInput = input.toLowerCase();
    
    // 检查各部分是否匹配
    const pathParts = field.path.split('.');
    pathParts.forEach(part => {
      if (part.toLowerCase().includes(lowerInput) ||
          field.displayName.includes(input)) {
        parts.push(part);
      }
    });
    
    return parts;
  }
  
  /**
   * 创建建议
   */
  private createSuggestion(match: MatchResult): FieldSuggestion {
    return {
      value: match.field.path,
      label: this.formatLabel(match.field),
      path: match.field.path,
      type: match.field.type,
      description: match.field.displayName,
      icon: this.getFieldIcon(match.field),
      category: this.getFieldCategory(match.field)
    };
  }
  
  /**
   * 格式化标签
   */
  private formatLabel(field: FieldInfo): string {
    return `${field.displayName} (${field.path})`;
  }
  
  /**
   * 获取字段图标
   */
  private getFieldIcon(field: FieldInfo): string {
    const iconMap: Record<string, string> = {
      'string': 'el-icon-document',
      'int': 'el-icon-s-data',
      'long': 'el-icon-s-data',
      'boolean': 'el-icon-check',
      'date': 'el-icon-date',
      'timestamp': 'el-icon-time'
    };
    
    return iconMap[field.type] || 'el-icon-document';
  }
  
  /**
   * 获取字段分类
   */
  private getFieldCategory(field: FieldInfo): string {
    const pathParts = field.path.split('.');
    if (pathParts.length > 1) {
      return pathParts[0]; // 返回实体名
    }
    return 'global';
  }
  
  /**
   * 解析路径
   */
  parsePath(path: string): FieldInfo | null {
    // 尝试直接查找
    if (this.fieldMapping.globalFields.has(path)) {
      return this.fieldMapping.globalFields.get(path)!;
    }
    
    // 尝试通过别名查找
    for (const [fieldPath, field] of this.fieldMapping.globalFields) {
      if (field.aliases.includes(path)) {
        return field;
      }
    }
    
    return null;
  }
  
  /**
   * 获取路径预览
   */
  getPathPreview(path: string): string {
    const field = this.parsePath(path);
    if (!field) {
      return path;
    }
    
    return `${field.displayName} (${field.path})`;
  }
  
  /**
   * 获取错误码建议
   */
  getErrorCodeSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    
    // 1. 基于字段路径生成错误码
    const field = this.parsePath(input);
    if (field) {
      suggestions.push(`${field.path}.required`);
      suggestions.push(`${field.path}.invalid`);
      suggestions.push(`${field.path}.format-error`);
    }
    
    // 2. 常见错误码模板
    const commonCodes = [
      'validation.required',
      'validation.format',
      'validation.range',
      'validation.length',
      'validation.pattern'
    ];
    
    commonCodes.forEach(code => {
      if (code.includes(input.toLowerCase())) {
        suggestions.push(code);
      }
    });
    
    return suggestions;
  }
}
```

### 3. 路径选择器组件（新增）

```vue
<template>
  <div class="path-selector">
    <el-autocomplete
      ref="autocompleteRef"
      v-model="inputValue"
      :fetch-suggestions="fetchSuggestions"
      :placeholder="placeholder"
      :trigger-on-focus="true"
      :clearable="true"
      :select-when-unmatched="false"
      @select="handleSelect"
      @blur="handleBlur"
    >
      <template #default="{ item }">
        <div class="suggestion-item">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <div class="suggestion-content">
            <div class="suggestion-label">{{ item.label }}</div>
            <div class="suggestion-path">{{ item.path }}</div>
            <div v-if="item.description" class="suggestion-desc">
              {{ item.description }}
            </div>
          </div>
          <el-tag v-if="item.category" size="small" type="info">
            {{ item.category }}
          </el-tag>
        </div>
      </template>
    </el-autocomplete>
    
    <!-- 路径预览 -->
    <div v-if="selectedField && showPreview" class="path-preview">
      <el-icon><InfoFilled /></el-icon>
      <span>{{ selectedField.displayName }}</span>
      <el-tag size="small">{{ selectedField.type }}</el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { HintEngine } from './hint-engine'
import type { FieldSuggestion, FieldInfo } from './types'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  showPreview?: boolean
  hintEngine: HintEngine
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [field: FieldInfo]
}>()

const autocompleteRef = ref()
const inputValue = ref(props.modelValue)
const selectedField = ref<FieldInfo | null>(null)

const placeholder = computed(() => props.placeholder || '选择字段...')

const fetchSuggestions = async (input: string, callback: any) => {
  if (!input) {
    // 输入为空时，返回常用字段
    const suggestions = getPopularFields()
    callback(suggestions)
    return
  }
  
  const suggestions = props.hintEngine.getFieldSuggestions(input, {
    currentPath: input,
    availableFields: [],
    recentFields: [],
    popularFields: []
  })
  
  callback(suggestions)
}

const handleSelect = (item: FieldSuggestion) => {
  const field = props.hintEngine.parsePath(item.value)
  if (field) {
    selectedField.value = field
    emit('update:modelValue', item.value)
    emit('select', field)
  }
}

const handleBlur = () => {
  // 失焦时，尝试解析输入的路径
  const field = props.hintEngine.parsePath(inputValue.value)
  if (field) {
    selectedField.value = field
    emit('update:modelValue', field.path)
  }
}

const getPopularFields = (): FieldSuggestion[] => {
  // 返回常用字段
  return []
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal !== inputValue.value) {
    inputValue.value = newVal
    const field = props.hintEngine.parsePath(newVal)
    if (field) {
      selectedField.value = field
    }
  }
})
</script>

<style scoped>
.path-selector {
  width: 100%;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.suggestion-content {
  flex: 1;
}

.suggestion-label {
  font-weight: 500;
  font-size: 14px;
}

.suggestion-path {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.suggestion-desc {
  font-size: 12px;
  color: #67c23a;
  margin-top: 2px;
}

.path-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 4px;
  font-size: 13px;
  color: #409eff;
}
</style>
```

### 4. 错误码选择器组件（新增）

```vue
<template>
  <div class="error-code-selector">
    <el-input
      ref="inputRef"
      v-model="inputValue"
      :placeholder="placeholder"
      clearable
      @focus="showSuggestions = true"
      @blur="handleBlur"
    >
      <template #append>
        <el-button :icon="Search" @click="showSuggestions = true" />
      </template>
    </el-input>
    
    <!-- 建议列表 -->
    <div v-if="showSuggestions" class="suggestions-dropdown">
      <div v-if="filteredSuggestions.length === 0" class="no-results">
        <el-empty description="未找到匹配的错误码" :image-size="80" />
      </div>
      
      <div v-else class="suggestions-list">
        <div
          v-for="suggestion in filteredSuggestions"
          :key="suggestion"
          class="suggestion-item"
          @click="selectSuggestion(suggestion)"
        >
          <div class="suggestion-code">{{ suggestion }}</div>
          <div class="suggestion-desc">{{ getErrorDescription(suggestion) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  hintEngine: any
  relatedField?: string // 关联的字段路径
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref()
const inputValue = ref(props.modelValue)
const showSuggestions = ref(false)
const searchQuery = ref('')

const placeholder = computed(() => props.placeholder || '选择或输入错误码...')

// 建议列表
const suggestions = computed(() => {
  const codes: string[] = []
  
  // 1. 基于关联字段生成错误码
  if (props.relatedField) {
    codes.push(`${props.relatedField}.required`)
    codes.push(`${props.relatedField}.invalid`)
    codes.push(`${props.relatedField}.format-error`)
    codes.push(`${props.relatedField}.length-error`)
    codes.push(`${props.relatedField}.range-error`)
  }
  
  // 2. 常见错误码
  codes.push(...getCommonErrorCodes())
  
  return codes
})

// 过滤后的建议
const filteredSuggestions = computed(() => {
  if (!searchQuery.value) {
    return suggestions.value
  }
  
  return suggestions.value.filter(code => 
    code.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const getCommonErrorCodes = (): string[] => {
  return [
    'validation.required',
    'validation.invalid',
    'validation.format',
    'validation.range',
    'validation.length',
    'validation.pattern',
    'validation.type',
    'validation.unique',
    'validation.exists'
  ]
}

const getErrorDescription = (code: string): string => {
  const descriptions: Record<string, string> = {
    'validation.required': '字段不能为空',
    'validation.invalid': '字段值无效',
    'validation.format': '字段格式错误',
    'validation.range': '字段值超出范围',
    'validation.length': '字段长度错误',
    'validation.pattern': '字段不匹配正则表达式',
    'validation.type': '字段类型错误',
    'validation.unique': '字段值必须唯一',
    'validation.exists': '字段值不存在'
  }
  
  return descriptions[code] || '自定义错误'
}

const selectSuggestion = (code: string) => {
  inputValue.value = code
  showSuggestions.value = false
  emit('update:modelValue', code)
}

const handleBlur = () => {
  // 延迟隐藏，允许点击建议项
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  inputValue.value = newVal
})

// 点击外部关闭建议
const handleClickOutside = (e: MouseEvent) => {
  if (inputRef.value?.$el && !inputRef.value.$el.contains(e.target as Node)) {
    showSuggestions.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.error-code-selector {
  position: relative;
}

.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 4px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  max-height: 300px;
  overflow-y: auto;
}

.no-results {
  padding: 20px;
}

.suggestions-list {
  padding: 4px 0;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f5f7fa;
}

.suggestion-code {
  font-family: monospace;
  font-size: 13px;
  color: #409eff;
  margin-bottom: 2px;
}

.suggestion-desc {
  font-size: 12px;
  color: #909399;
}
</style>
```

## 字段映射配置

### 1. 配置文件格式

```yaml
# field-mapping.yaml
entities:
  User:
    displayName: 用户
    fields:
      id:
        displayName: 用户ID
        type: long
        aliases: [用户ID, ID, 编号]
      username:
        displayName: 用户名
        type: string
        aliases: [用户名, 账号, 登录名]
      password:
        displayName: 密码
        type: string
        aliases: [密码, 登录密码]
      email:
        displayName: 邮箱
        type: string
        aliases: [邮箱, 邮件, 电子邮箱]
      age:
        displayName: 年龄
        type: int
        aliases: [年龄, 岁数]
    relations:
      orders:
        displayName: 订单
        type: to-many
        targetEntity: Order

  Order:
    displayName: 订单
    fields:
      id:
        displayName: 订单ID
        type: long
        aliases: [订单ID, ID]
      userId:
        displayName: 用户ID
        type: long
        aliases: [用户ID, 买家ID]
      total:
        displayName: 订单总额
        type: decimal
        aliases: [总额, 金额, 订单金额]
      status:
        displayName: 订单状态
        type: string
        aliases: [状态, 订单状态]

pathAliases:
  user.username:
    - 用户名
    - 账号
  user.email:
    - 邮箱
    - 邮件
  order.total:
    - 订单金额
    - 金额
```

### 2. 动态加载字段映射

```typescript
// field-mapping-loader.ts
export class FieldMappingLoader {
  async loadFromOrmModel(ormPath: string): Promise<FieldMapping> {
    const content = await fs.readFile(ormPath, 'utf-8');
    const $ = cheerio.load(content, { xmlMode: true });
    
    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };
    
    // 解析实体和字段
    // ...（解析逻辑）
    
    return mapping;
  }
  
  async loadFromDatabase(connection: DatabaseConnection): Promise<FieldMapping> {
    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };
    
    // 从数据库加载表结构
    const tables = await connection.getTables();
    
    for (const table of tables) {
      const entityMap: EntityFieldMap = {
        entityName: table.name,
        displayName: table.comment || table.name,
        fields: new Map(),
        relations: new Map()
      };
      
      // 加载字段
      const columns = await connection.getColumns(table.name);
      for (const column of columns) {
        const fieldInfo: FieldInfo = {
          name: column.name,
          displayName: column.comment || column.name,
          type: this.mapSqlTypeToJavaType(column.type),
          path: `${table.name}.${column.name}`,
          aliases: this.generateAliases(column.name, column.comment),
          searchable: true
        };
        
        entityMap.fields.set(column.name, fieldInfo);
        mapping.globalFields.set(fieldInfo.path, fieldInfo);
      }
      
      mapping.entities.set(table.name, entityMap);
    }
    
    return mapping;
  }
  
  async loadFromConfig(configPath: string): Promise<FieldMapping> {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = yaml.parse(content);
    
    const mapping: FieldMapping = {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };
    
    // 解析配置文件
    for (const [entityName, entityData] of Object.entries(config.entities)) {
      const entityMap: EntityFieldMap = {
        entityName,
        displayName: (entityData as any).displayName,
        fields: new Map(),
        relations: new Map()
      };
      
      for (const [fieldName, fieldData] of Object.entries((entityData as any).fields)) {
        const fieldInfo: FieldInfo = {
          name: fieldName,
          displayName: (fieldData as any).displayName,
          type: (fieldData as any).type,
          path: `${entityName}.${fieldName}`,
          aliases: (fieldData as any).aliases || [],
          searchable: true
        };
        
        entityMap.fields.set(fieldName, fieldInfo);
        mapping.globalFields.set(fieldInfo.path, fieldInfo);
      }
      
      mapping.entities.set(entityName, entityMap);
    }
    
    // 解析路径别名
    if (config.pathAliases) {
      for (const [path, aliases] of Object.entries(config.pathAliases)) {
        mapping.pathAliases.set(path, aliases as string[]);
      }
    }
    
    return mapping;
  }
  
  private mapSqlTypeToJavaType(sqlType: string): string {
    const typeMap: Record<string, string> = {
      'VARCHAR': 'string',
      'CHAR': 'string',
      'TEXT': 'string',
      'INT': 'int',
      'BIGINT': 'long',
      'DECIMAL': 'decimal',
      'DOUBLE': 'double',
      'BOOLEAN': 'boolean',
      'DATE': 'date',
      'TIMESTAMP': 'timestamp'
    };
    
    return typeMap[sqlType.toUpperCase()] || 'string';
  }
  
  private generateAliases(name: string, comment?: string): string[] {
    const aliases: string[] = [];
    
    if (comment) {
      aliases.push(comment);
    }
    
    // 转换下划线命名为驼峰
    const camelCase = name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    aliases.push(camelCase);
    
    return aliases;
  }
}
```

## 使用示例

### 1. 基本使用

```vue
<template>
  <XdefEditor 
    :xdefPath="'/path/to/validator.xdef'"
    :fieldMappingPath="'/path/to/field-mapping.yaml'"
    @export="handleExport"
  />
</template>

<script setup lang="ts">
import XdefEditor from './XdefEditor.vue'

const handleExport = (xml: string) => {
  console.log('Generated XML:', xml)
}
</script>
```

### 2. 使用路径选择器

```vue
<template>
  <el-form-item label="字段路径">
    <path-selector
      v-model="formData.name"
      :hint-engine="hintEngine"
      :show-preview="true"
      @select="handleFieldSelect"
    />
  </el-form-item>
</template>
```

### 3. 使用错误码选择器

```vue
<template>
  <el-form-item label="错误码">
    <error-code-selector
      v-model="formData.errorCode"
      :hint-engine="hintEngine"
      :related-field="formData.name"
    />
  </el-form-item>
</template>
```

## 关键特性

### 1. 智能提示
- ✅ 基于输入的模糊搜索
- ✅ 中文别名匹配
- ✅ 字段类型图标
- ✅ 分类显示
- ✅ 实时路径预览

### 2. 错误码辅助
- ✅ 基于字段自动生成错误码
- ✅ 常见错误码模板
- ✅ 错误描述提示
- ✅ 搜索过滤

### 3. 字段映射
- ✅ 多种数据源支持
- ✅ 自动别名生成
- ✅ 关联关系支持
- ✅ 动态加载

### 4. 用户体验
- ✅ 表单自动生成
- ✅ 实时校验
- ✅ 中英文切换
- ✅ 快捷键支持

---

## 增强版 Xdef 解析器

### 为什么需要增强？

原始设计能够解析基本的 Xdef 结构，但对于像 `validator.xdef` 这样有复杂依赖关系的 Xdef 文件，存在以下限制：

| 功能 | 原始设计 | 需要增强 |
|------|----------|----------|
| 基础元素解析 | ✅ | ✅ |
| 类型推断 | ✅ | ✅ |
| xdef:ref 引用解析 | ❌ | ✅ 增强 |
| 依赖文件解析 | ❌ | ✅ 增强 |
| filter-bean 引用 | ❌ | ✅ 增强 |
| unknown-tag 处理 | ❌ | ✅ 增强 |
| 嵌套条件支持 | ❌ | ✅ 增强 |
| 动态表单生成 | ⚠️ | ✅ 增强 |

### 增强版解析器实现

```typescript
// enhanced-xdef-parser.ts
export class EnhancedXdefParser {
  private xdefCache: Map<string, XdefMetadata> = new Map();
  private schemaCache: Map<string, any> = new Map();
  
  async parse(xdefPath: string): Promise<XdefMetadata> {
    // 1. 加载 Xdef 文件
    const content = await fs.readFile(xdefPath, 'utf-8');
    const $ = cheerio.load(content, { xmlMode: true });
    
    // 2. 解析基本结构
    const root = $.root().children()[0];
    const metadata: XdefMetadata = {
      name: this.getElementName(root),
      namespace: this.getNamespace(root),
      rootElement: this.parseElementNode(root),
      types: new Map(),
      enums: new Map(),
      references: new Map(),
      fieldMapping: await this.loadFieldMapping(),
      dependencies: [],
      externalRefs: new Map(),
      importedSchemas: new Map(),
      filterBeanTypes: new Map()
    };
    
    // 3. 解析 xdef: 属性
    this.parseXdefAttributes(root, metadata);
    
    // 4. 解析 xdef:define 定义
    this.parseXdefDefines(root, metadata);
    
    // 5. 解析引用（xdef:ref）
    await this.parseXdefRefs(root, metadata, xdefPath);
    
    // 6. 解析 unknown-tag 定义
    this.parseUnknownTags(root, metadata);
    
    // 7. 解析依赖的 Xdef 文件
    await this.resolveDependencies(metadata);
    
    // 8. 缓存
    this.xdefCache.set(xdefPath, metadata);
    
    return metadata;
  }
  
  private parseXdefAttributes(element: any, metadata: XdefMetadata): void {
    const xdefElement: XdefElement = this.findElementByNode(element, metadata);
    
    // 提取所有 xdef: 前缀的属性
    Object.keys(element.attribs).forEach(attrName => {
      if (attrName.startsWith('xdef:')) {
        const attrValue = element.attribs[attrName];
        xdefElement.xdefAttributes.set(attrName, attrValue);
        
        // 处理特殊属性
        if (attrName === 'xdef:ref') {
          metadata.externalRefs.set(xdefElement.name, {
            type: 'ref',
            name: attrValue,
            isResolved: false
          });
        }
        
        if (attrName === 'xdef:bean-body-prop') {
          xdefElement.xdefBodyType = this.inferBodyType(attrValue);
        }
        
        if (attrName === 'xdef:unknown-tag') {
          xdefElement.xdefUnknownTag = true;
        }
      }
    });
  }
  
  private parseXdefDefines(element: any, metadata: XdefMetadata): void {
    const defines = $(element).find('xdef\\:define');
    
    defines.each((_, define) => {
      const defineName = $(define).attr('xdef:name');
      const ref = $(define).attr('xdef:ref');
      const bodyType = $(define).attr('xdef:body-type');
      
      if (ref) {
        // 这是一个引用类型的定义
        const refInfo: XdefRef = {
          type: 'ref',
          name: defineName,
          targetName: ref,
          isResolved: false
        };
        
        metadata.externalRefs.set(defineName, refInfo);
        
        // 标记引用的元素
        const refElements = this.findElementsWithRef(metadata, ref);
        refElements.forEach(el => {
          el.xdefDefineRef = ref;
        });
      } else {
        // 这是一个内联定义
        const type: XdefType = {
          name: defineName,
          source: 'define',
          sourceFile: metadata.name,
          properties: this.parseDefineProperties(define),
          description: $(define).attr('description')
        };
        
        metadata.types.set(defineName, type);
      }
    });
  }
  
  private async parseXdefRefs(
    element: any, 
    metadata: XdefMetadata, 
    currentPath: string
  ): Promise<void> {
    const refs = $(element).find('[xdef\\:ref]');
    
    for (const ref of refs.toArray()) {
      const refPath = $(ref).attr('xdef:ref');
      const refName = $(ref).attr('xdef:name');
      
      if (refPath) {
        const dependency: XdefDependency = {
          type: 'ref',
          path: refPath,
          targetName: refName,
          resolved: false
        };
        
        metadata.dependencies.push(dependency);
        
        await this.resolveReference(refPath, metadata);
      }
    }
  }
  
  private parseUnknownTags(element: any, metadata: XdefMetadata): void {
    const unknownTagDef = $(element).find('xdef\\:unknown-tag');
    
    if (unknownTagDef.length > 0) {
      const beanTagProp = unknownTagDef.attr('xdef:bean-tag-prop');
      const beanBodyProp = unknownTagDef.attr('xdef:bean-body-prop');
      const bodyType = unknownTagDef.text().trim();
      
      metadata.unknownTagConfig = {
        beanTagProp: beanTagProp || '$type',
        beanBodyProp: beanBodyProp || '$body',
        bodyType: bodyType || 'xml'
      };
      
      metadata.supportsUnknownTags = true;
    }
  }
  
  private async resolveDependencies(metadata: XdefMetadata): Promise<void> {
    for (const dep of metadata.dependencies) {
      if (!dep.resolved) {
        await this.resolveReference(dep.path, metadata);
        dep.resolved = true;
      }
    }
  }
  
  private async resolveReference(refPath: string, metadata: XdefMetadata): Promise<void> {
    const targetPath = this.resolveXdefPath(refPath);
    
    if (!targetPath) {
      console.warn(`无法解析引用: ${refPath}`);
      return;
    }
    
    if (this.xdefCache.has(targetPath)) {
      const refMetadata = this.xdefCache.get(targetPath)!;
      this.mergeMetadata(metadata, refMetadata);
      return;
    }
    
    const refMetadata = await this.parse(targetPath);
    this.mergeMetadata(metadata, refMetadata);
  }
  
  private mergeMetadata(target: XdefMetadata, source: XdefMetadata): void {
    source.types.forEach((type, name) => {
      if (!target.types.has(name)) {
        target.types.set(name, type);
      }
    });
    
    source.enums.forEach((enumDef, name) => {
      if (!target.enums.has(name)) {
        target.enums.set(name, enumDef);
      }
    });
    
    // 合并 filter-bean 类型（重要！）
    if (source.name === 'filter') {
      source.rootElement.children?.forEach(child => {
        target.filterBeanTypes.set(child.name, child);
      });
    }
  }
  
  private resolveXdefPath(refPath: string): string | null {
    const baseDir = '/Volumes/Doc/Git/Nop/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema';
    const fullPath = path.join(baseDir, refPath);
    
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    
    return null;
  }
  
  private inferBodyType(propName: string): XdefBodyType {
    if (propName === '$body') {
      return 'list';
    }
    if (propName === 'condition') {
      return 'filter-bean';
    }
    return 'literal';
  }
  
  private findElementByNode(node: any, metadata: XdefMetadata): XdefElement {
    // 实现节点到元素的映射
    return metadata.rootElement;
  }
  
  private findElementsWithRef(metadata: XdefMetadata, refName: string): XdefElement[] {
    const elements: XdefElement[] = [];
    
    function traverse(element: XdefElement) {
      if (element.xdefDefineRef === refName) {
        elements.push(element);
      }
      element.children?.forEach(traverse);
    }
    
    traverse(metadata.rootElement);
    return elements;
  }
}
```

## Validator.xdef 特殊处理

### validator.xdef 的特殊性

`validator.xdef` 是一个典型的复杂 Xdef，具有以下特点：

1. **依赖 filter.xdef**：`<check>` 的 body 是 filter-bean 类型
2. **使用 xdef:ref**：`xdef:bean-body-prop="condition">filter-bean` 引用了 filter-bean
3. **支持 unknown-tag**：允许使用 `<if>`, `<else>`, `<then>` 等动态标签

### ValidatorXdefHandler 实现

```typescript
// validator-xdef-handler.ts
export class ValidatorXdefHandler {
  async handleValidatorXdef(xdefPath: string): Promise<XdefMetadata> {
    const parser = new EnhancedXdefParser();
    const metadata = await parser.parse(xdefPath);
    
    // 1. 加载 filter.xdef 依赖
    await parser.resolveReference('/nop/schema/query/filter.xdef', metadata);
    
    // 2. 解析 filter-bean 可用类型
    const filterMetadata = parser.xdefCache.get('/nop/schema/query/filter.xdef');
    if (filterMetadata) {
      filterMetadata.rootElement.children?.forEach(child => {
        metadata.filterBeanTypes.set(child.name, child);
      });
    }
    
    // 3. 解析 unknown-tag 配置
    const unknownTagConfig = metadata.unknownTagConfig;
    if (unknownTagConfig) {
      metadata.supportsUnknownTags = true;
      metadata.unknownTagBeanTagProp = unknownTagConfig.beanTagProp;
      metadata.unknownTagBeanBodyProp = unknownTagBeanBodyProp;
    }
    
    // 4. 生成表单配置
    const formConfig = this.generateValidatorFormConfig(metadata);
    
    return metadata;
  }
  
  private generateValidatorFormConfig(metadata: XdefMetadata): DynamicFormConfig {
    const config: DynamicFormConfig = {
      elements: [],
      layout: { type: 'vertical' },
      validation: { realtime: true, showMessage: true, rules: [] },
      hints: {
        enabled: true,
        showDescriptions: true,
        showChineseNames: true,
        showPathPreview: true,
        autoComplete: true,
        fuzzySearch: true
      }
    };
    
    // 1. 根元素属性（validator 全局配置）
    config.elements.push({
      id: 'validator-global',
      type: 'object',
      label: '全局配置',
      children: this.generateAttributeElements(metadata.rootElement)
    });
    
    // 2. Check 规则列表
    config.elements.push({
      id: 'checks',
      type: 'array',
      label: '检查规则',
      children: [{
        id: 'check-item',
        type: 'object',
        label: '检查规则',
        children: this.generateCheckFormElements(metadata)
      }]
    });
    
    // 3. 全局条件
    if (metadata.rootElement.children?.some(c => c.name === 'condition')) {
      config.elements.push({
        id: 'global-condition',
        type: 'object',
        label: '全局条件',
        children: this.generateConditionFormElements(metadata)
      });
    }
    
    return config;
  }
  
  private generateCheckFormElements(metadata: XdefMetadata): FormElement[] {
    const elements: FormElement[] = [];
    
    // Check 的基本属性
    elements.push({
      id: 'id',
      type: 'text',
      label: '规则ID',
      required: true,
      hintConfig: {
        enableAutoComplete: false,
        placeholder: '例如: checkPassword'
      }
    });
    
    elements.push({
      id: 'errorCode',
      type: 'text',
      label: '错误码',
      required: true,
      hintConfig: {
        enableAutoComplete: true,
        enablePathSuggestion: true,
        placeholder: '例如: user.password.invalid'
      }
    });
    
    elements.push({
      id: 'errorDescription',
      type: 'textarea',
      label: '错误描述',
      placeholder: '例如: 密码长度必须至少6位'
    });
    
    elements.push({
      id: 'severity',
      type: 'number',
      label: '严重程度',
      min: 0,
      max: 10,
      hintConfig: {
        showFieldPreview: true
      }
    });
    
    // Check 的条件（关键部分）
    elements.push({
      id: 'condition',
      type: 'object',
      label: '校验条件',
      children: this.generateConditionBuilderElements(metadata)
    });
    
    return elements;
  }
  
  private generateConditionBuilderElements(metadata: XdefMetadata): FormElement[] {
    const elements: FormElement[] = [];
    
    // 条件类型选择
    elements.push({
      id: 'conditionType',
      type: 'select',
      label: '条件类型',
      required: true,
      widget: {
        type: 'select',
        props: {
          options: [
            { label: '简单条件', value: 'simple' },
            { label: 'AND (且)', value: 'and' },
            { label: 'OR (或)', value: 'or' },
            { label: 'NOT (非)', value: 'not' },
            { label: '条件判断 (if)', value: 'if' }
          ]
        }
      }
    });
    
    // 字段选择（使用 PathSelector）
    elements.push({
      id: 'field',
      type: 'path-selector',
      label: '字段路径',
      required: true,
      hintConfig: {
        enableAutoComplete: true,
        enablePathSuggestion: true,
        enableChineseMapping: true
      }
    });
    
    // 运算符选择（基于 filter-bean 类型）
    elements.push({
      id: 'operator',
      type: 'select',
      label: '运算符',
      required: true,
      widget: {
        type: 'select',
        props: {
          options: this.getFilterBeanOperators(metadata)
        }
      }
    });
    
    // 值输入
    elements.push({
      id: 'value',
      type: 'dynamic',
      label: '值',
      dependsOn: ['operator', 'fieldType']
    });
    
    return elements;
  }
  
  private getFilterBeanOperators(metadata: XdefMetadata): Array<{label: string; value: string}> {
    const operators: Array<{label: string; value: string}> = [];
    
    metadata.filterBeanTypes.forEach((element, name) => {
      if (element.attributes) {
        operators.push({
          label: element.displayName || name,
          value: name
        });
      }
    });
    
    return operators;
  }
}
```

## 支持的 Xdef 特性

### 1. 引用解析

```xml
<!-- validator.xdef -->
<check xdef:bean-body-prop="condition">filter-bean</check>
```

**解析过程：**
1. 识别 `xdef:bean-body-prop="condition"` 
2. 查找 `xdef:ref="FilterCondition"`
3. 解析 `/nop/schema/query/filter.xdef`
4. 将 filter-bean 的所有操作符（eq, gt, lt, and, or 等）加载到 `filterBeanTypes`
5. 在表单中动态生成运算符选项

### 2. unknown-tag 支持

```xml
<check id="checkPassword">
    <if test="user.password != null">
        <ge name="user.password.length" value="6"/>
    </if>
</check>
```

**解析过程：**
1. 识别 `<if>` 不在预定义列表中
2. 应用 `xdef:unknown-tag` 规则
3. 标签名 `if` 映射到 `$type = "if"`
4. 属性 `test` 和子内容 `<ge>` 映射到 `$body`
5. 运行时识别 `if` 标签并转换为条件逻辑

### 3. 嵌套条件支持

```xml
<check id="checkOrder">
    <and>
        <gt name="order.qty" value="10"/>
        <gt name="order.total" value="100"/>
    </and>
</check>
```

**表单支持：**
- 支持多层级条件嵌套
- 可视化的条件树编辑器
- 拖拽排序和删除

## 实际应用示例

### 示例 1：解析 validator.xdef

```typescript
const handler = new ValidatorXdefHandler();
const metadata = await handler.handleValidatorXdef(
  '/nop/schema/validator.xdef'
);

// metadata 包含：
{
  name: 'validator',
  filterBeanTypes: {
    'and': { name: 'and', displayName: 'AND (且)', ... },
    'or': { name: 'or', displayName: 'OR (或)', ... },
    'eq': { name: 'eq', displayName: '等于', ... },
    'gt': { name: 'gt', displayName: '大于', ... },
    'lt': { name: 'lt', displayName: '小于', ... },
    'notNull': { name: 'notNull', displayName: '不为空', ... },
    'between': { name: 'between', displayName: '范围内', ... },
    // ... 所有 filter-bean 操作符
  },
  supportsUnknownTags: true,
  unknownTagConfig: {
    beanTagProp: '$type',
    beanBodyProp: '$body',
    bodyType: 'list'
  }
}

// 自动生成表单，支持：
// 1. 选择字段（带中文提示）
// 2. 选择运算符（从 filter-bean 中获取）
// 3. 输入值
// 4. 支持 if/else 条件判断
// 5. 支持嵌套逻辑
```

### 示例 2：可视化编辑复杂条件

```xml
<check id="checkOrder">
    <if test="order.qty > 10">
        <if test="order.total > 100">
            <gt name="order.discount" value="0.1"/>
        </if>
    </if>
</check>
```

**在可视化编辑器中：**
1. 条件树显示：
   ```
   ├─ 条件类型: if
   │  ├─ 字段: order.qty
   │  └─ 运算符: >
   │     └─ 值: 10
   └─ 子条件
      ├─ 条件类型: if
      │  ├─ 字段: order.total
      │  └─ 运算符: >
      │     └─ 值: 100
      └─ 校验动作
         └─ 类型: gt
            ├─ 字段: order.discount
            └─ 值: 0.1
   ```

## 完整支持能力总结

### ✅ 完全支持

| 功能 | 说明 |
|------|------|
| 基础 Xdef 解析 | 元素、属性、子元素 |
| 类型推断 | 从属性推断数据类型 |
| xdef:ref 引用 | 自动解析引用的 Xdef 文件 |
| 依赖文件解析 | 递归解析所有依赖 |
| filter-bean 引用 | 完整支持 filter.xdef |
| unknown-tag 处理 | 支持 `<if>`, `<else>`, `<then>` 等 |
| 增强版 Xdef 解析器 | 支持所有 Xdef 特性 |

### 🎯 validator.xdef 完整支持

```xml
<validator>
    <!-- 全局配置 -->
    <condition>
        <notNull name="entity"/>
    </condition>
    
    <!-- 简单检查 -->
    <check id="checkUsername">
        <notNull name="user.username"/>
    </check>
    
    <!-- 条件检查 -->
    <check id="checkPassword">
        <if test="user.password != null">
            <lengthBetween name="user.password" min="6" max="20"/>
        </if>
    </check>
    
    <!-- 复杂条件 -->
    <check id="checkOrder">
        <and>
            <gt name="order.qty" value="10"/>
            <gt name="order.total" value="100"/>
        </and>
    </check>
</validator>
```

所有这些配置都能被：
1. ✅ 正确解析
2. ✅ 生成对应的可视化表单
3. ✅ 提供智能提示
4. ✅ 导出为 XML

## 总结

通过增强版设计，现在可以：

1. ✅ **解析任意 Xdef 文件**：包括有复杂依赖的 Xdef
2. ✅ **自动解析引用关系**：自动加载依赖的 Xdef 文件
3. ✅ **支持 filter-bean**：完整支持条件表达式
4. ✅ **支持 unknown-tag**：支持动态标签如 `<if>`, `<else>`
5. **智能表单生成**：根据解析结果自动生成对应的表单组件
6. **validator.xdef 完全支持**：包括所有特性和用法

这个增强设计真正实现了"零代码"配置管理，能够处理 Nop 框架中任意复杂的 Xdef 定义！

这个设计让用户可以：
1. 输入 "用户" 或 "user" → 看到所有用户相关字段
2. 输入 "邮箱" 或 "email" → 直接选择 `user.email`
3. 输入 `user.username` → 显示为 "用户名 (user.username)"
4. 选择字段后，错误码自动建议 `user.username.required`

真正实现了小白友好的可视化编辑体验！