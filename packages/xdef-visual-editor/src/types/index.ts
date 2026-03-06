/**
 * Xdef 可视化编辑器核心类型定义
 */

// ============================================================================
// Xdef 元数据模型
// ============================================================================

/**
 * Xdef 文件元数据
 */
export interface XdefMetadata {
  /** xdef 名称 */
  name: string;
  /** 命名空间 */
  namespace: string;
  /** 根元素 */
  rootElement: XdefElement;
  /** 类型定义 */
  types: Map<string, XdefType>;
  /** 枚举定义 */
  enums: Map<string, XdefEnum>;
  /** 引用关系 */
  references: Map<string, string>;
  /** 字段映射 */
  fieldMapping: FieldMapping;
  
  // 新增：Xdef 依赖管理
  /** Xdef 文件依赖 */
  dependencies: XdefDependency[];
  /** 外部引用 */
  externalRefs: Map<string, XdefRef>;
  /** 导入的 Schema */
  importedSchemas: Map<string, any>;
  
  // 新增：filter-bean 引用
  /** filter-bean 可用类型 */
  filterBeanTypes: Map<string, XdefElement>;
  /** unknown-tag 配置 */
  unknownTagConfig?: UnknownTagConfig;
  /** 是否支持 unknown-tag */
  supportsUnknownTags?: boolean;
}

/**
 * Xdef 依赖
 */
export interface XdefDependency {
  /** 依赖类型 */
  type: 'ref' | 'schema' | 'lib';
  /** 依赖路径 */
  path: string;
  /** 目标名称 */
  targetName: string;
  /** 是否已解析 */
  resolved: boolean;
}

/**
 * Xdef 引用
 */
export interface XdefRef {
  /** 引用类型 */
  type: 'ref' | 'unknown-tag' | 'define';
  /** 引用名称 */
  name: string;
  /** 目标文件 */
  targetFile?: string;
  /** 目标元素 */
  targetElement?: XdefElement;
  /** 是否已解析 */
  isResolved: boolean;
}

/**
 * unknown-tag 配置
 */
export interface UnknownTagConfig {
  /** Bean 标签属性名 */
  beanTagProp: string;
  /** Bean body 属性名 */
  beanBodyProp: string;
  /** Body 类型 */
  bodyType: string;
}

/**
 * 字段映射（用于中文提示）
 */
export interface FieldMapping {
  /** 实体字段映射 */
  entities: Map<string, EntityFieldMap>;
  /** 全局字段映射 */
  globalFields: Map<string, FieldInfo>;
  /** 路径别名 */
  pathAliases: Map<string, string[]>;
}

/**
 * 实体字段映射
 */
export interface EntityFieldMap {
  /** 实体名称 */
  entityName: string;
  /** 显示名称 */
  displayName: string;
  /** 字段列表 */
  fields: Map<string, FieldInfo>;
  /** 关联关系 */
  relations: Map<string, RelationInfo>;
}

/**
 * 字段信息
 */
export interface FieldInfo {
  /** 字段名 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 字段类型 */
  type: string;
  /** 完整路径，如 user.username */
  path: string;
  /** 别名，如 用户名 */
  aliases: string[];
  /** 是否可搜索 */
  searchable: boolean;
}

/**
 * 关系信息
 */
export interface RelationInfo {
  /** 关系名称 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 关系类型 */
  type: 'to-one' | 'to-many' | 'many-to-many';
  /** 目标实体 */
  targetEntity: string;
  /** 关系路径 */
  path: string;
}

/**
 * 元素定义
 */
export interface XdefElement {
  /** 元素名 */
  name: string;
  /** 类型引用 */
  type: XdefType;
  /** 属性列表 */
  attributes: XdefAttribute[];
  /** 子元素 */
  children?: XdefElement[];
  /** 是否必需 */
  isRequired: boolean;
  /** 是否可多个 */
  isMultiple: boolean;
  /** Bean body 属性 */
  beanBodyProp?: string;
  /** 唯一属性 */
  uniqueAttr?: string;
  /** 描述 */
  description?: string;
  /** 中文名称 */
  displayName?: string;
  /** 提示模板 */
  hintTemplate?: string;
  
  // 新增：Xdef 特性
  /** xdef: 属性 */
  xdefAttributes: Map<string, string>;
  /** body 类型 */
  xdefBodyType?: XdefBodyType;
  /** 引用信息 */
  xdefRef?: XdefRef;
  /** 是否是 unknown-tag */
  xdefUnknownTag?: boolean;
  /** define 引用 */
  xdefDefineRef?: string;
}

/**
 * Body 类型
 */
export type XdefBodyType = 
  | 'literal'      // 字面量
  | 'list'         // 列表
  | 'xml'          // XML 片段
  | 'expr'         // 表达式
  | 'filter-bean'; // 过滤条件

/**
 * 类型定义
 */
export interface XdefType {
  /** 类型名 */
  name: string;
  /** 基础类型 */
  baseType?: string;
  /** 属性定义 */
  properties: XdefProperty[];
  /** 校验规则 */
  validation?: ValidationRule[];
  /** 描述 */
  description?: string;
  /** 中文名称 */
  displayName?: string;
  
  // 新增：类型来源
  /** 类型来源 */
  source: 'builtin' | 'define' | 'ref' | 'inferred';
  /** 源文件 */
  sourceFile?: string;
  /** 源元素 */
  sourceElement?: XdefElement;
}

/**
 * 属性定义
 */
export interface XdefProperty {
  /** 属性名 */
  name: string;
  /** 类型 */
  type: XdefType;
  /** 默认值 */
  defaultValue?: any;
  /** 是否必需 */
  isRequired: boolean;
  /** 校验规则 */
  validation?: ValidationRule[];
  /** 描述 */
  description?: string;
  /** 中文名称 */
  displayName?: string;
  /** 提示模板 */
  hintTemplate?: string;
}

/**
 * 属性定义 (元素属性)
 */
export interface XdefAttribute {
  /** 属性名 */
  name: string;
  /** 类型 */
  type: XdefType;
  /** 默认值 */
  defaultValue?: any;
  /** 是否必需 */
  isRequired: boolean;
  /** 描述 */
  description?: string;
  /** 中文名称 */
  displayName?: string;
  /** 提示模板 */
  hintTemplate?: string;
  /** 建议值 */
  suggestions?: string[];
  /** 是否自动补全 */
  autoComplete?: boolean;
}

/**
 * 枚举定义
 */
export interface XdefEnum {
  /** 枚举名 */
  name: string;
  /** 中文名称 */
  displayName?: string;
  /** 枚举值 */
  values: XdefEnumValue[];
}

/**
 * 枚举值
 */
export interface XdefEnumValue {
  /** 值 */
  value: string;
  /** 显示名称 */
  label: string;
  /** 描述 */
  description?: string;
}

/**
 * 校验规则
 */
export interface ValidationRule {
  /** 规则类型 */
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  /** 规则值 */
  value?: any;
  /** 错误消息 */
  message?: string;
}

// ============================================================================
// 表单模型
// ============================================================================

/**
 * 动态表单配置
 */
export interface DynamicFormConfig {
  /** 表单元素 */
  elements: FormElement[];
  /** 布局配置 */
  layout: FormLayout;
  /** 校验配置 */
  validation: FormValidation;
  /** 提示配置 */
  hints: HintConfig;
}

/**
 * 提示配置
 */
export interface HintConfig {
  /** 是否启用提示 */
  enabled: boolean;
  /** 显示描述 */
  showDescriptions: boolean;
  /** 显示中文名 */
  showChineseNames: boolean;
  /** 显示路径预览 */
  showPathPreview: boolean;
  /** 自动补全 */
  autoComplete: boolean;
  /** 模糊搜索 */
  fuzzySearch: boolean;
}

/**
 * 表单元素
 */
export interface FormElement {
  /** 元素 ID */
  id: string;
  /** 元素类型 */
  type: ElementType;
  /** 显示标签 */
  label: string;
  /** Xdef 引用 */
  xdefRef: XdefElement;
  /** 子元素 */
  children?: FormElement[];
  /** 组件配置 */
  widget?: WidgetConfig;
  /** 校验规则 */
  validation?: ValidationRule[];
  /** 是否可见 */
  visible?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 帮助文本 */
  help?: string;
  /** 字段提示配置 */
  hintConfig?: FieldHintConfig;
}

/**
 * 字段提示配置
 */
export interface FieldHintConfig {
  /** 启用自动补全 */
  enableAutoComplete: boolean;
  /** 启用路径建议 */
  enablePathSuggestion: boolean;
  /** 启用中文映射 */
  enableChineseMapping: boolean;
  /** 显示字段预览 */
  showFieldPreview: boolean;
  /** 可搜索字段 */
  searchableFields: string[];
  /** 路径别名 */
  pathAliases: Map<string, string>;
}

/**
 * 元素类型
 */
export type ElementType = 
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
  | 'path-selector' // 路径选择器
  | 'error-code-selector' // 错误码选择器
  | 'condition-builder' // 条件构建器
  | 'custom';       // 自定义

/**
 * 组件配置
 */
export interface WidgetConfig {
  /** 组件类型 */
  type: string;
  /** 组件属性 */
  props?: Record<string, any>;
  /** 事件处理 */
  events?: Record<string, Function>;
}

/**
 * 布局配置
 */
export interface FormLayout {
  /** 布局类型 */
  type: 'vertical' | 'horizontal' | 'grid';
  /** 列数 */
  columns?: number;
  /** 间距 */
  spacing?: number;
  /** 响应式 */
  responsive?: boolean;
}

/**
 * 校验配置
 */
export interface FormValidation {
  /** 实时校验 */
  realtime: boolean;
  /** 显示消息 */
  showMessage: boolean;
  /** 校验规则 */
  rules: ValidationRule[];
}

// ============================================================================
// 提示建议模型
// ============================================================================

/**
 * 字段提示建议
 */
export interface FieldSuggestion {
  /** 字段路径值 */
  value: string;
  /** 显示标签（中文） */
  label: string;
  /** 完整路径 */
  path: string;
  /** 字段类型 */
  type: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: string;
  /** 分类 */
  category?: string;
}

/**
 * 提示上下文
 */
export interface HintContext {
  /** 当前路径 */
  currentPath: string;
  /** 字段类型 */
  fieldType?: string;
  /** 可用字段 */
  availableFields: FieldInfo[];
  /** 最近使用的字段 */
  recentFields: FieldInfo[];
  /** 常用字段 */
  popularFields: FieldInfo[];
}

/**
 * 搜索匹配结果
 */
export interface MatchResult {
  /** 字段信息 */
  field: FieldInfo;
  /** 匹配分数 */
  score: number;
  /** 匹配的部分 */
  matchedParts: string[];
}

// ============================================================================
// 条件模型
// ============================================================================

/**
 * 条件节点
 */
export interface ConditionNode {
  /** 节点 ID */
  id: string;
  /** 条件类型 */
  type: ConditionType;
  /** 运算符（用于简单条件） */
  operator?: string;
  /** 字段路径 */
  field?: string;
  /** 值 */
  value?: any;
  /** 最小值 */
  min?: any;
  /** 最大值 */
  max?: any;
  /** 正则表达式 */
  pattern?: string;
  /** 前置条件（用于 if/elif） */
  test?: string;
  /** 子条件（用于 and/or） */
  conditions?: ConditionNode[];
  /** THEN 分支（用于 if） */
  then?: ConditionNode;
  /** ELSE/ELIF 分支 */
  else?: ConditionNode;
  /** 错误码 */
  errorCode?: string;
  /** 错误描述 */
  errorDescription?: string;
  /** 严重程度 */
  severity?: number;
}

/**
 * 条件类型
 */
export type ConditionType = 
  | 'simple'        // 简单条件
  | 'and'           // AND 组合
  | 'or'            // OR 组合
  | 'not'           // NOT 取反
  | 'if'            // IF 条件判断
  | 'elif'          // ELIF 条件分支
  | 'else'          // ELSE 分支
  | 'expr'          // 自定义表达式;

/**
 * 运算符类型
 */
export type OperatorType = 
  // 比较运算符
  | 'lt' | 'le' | 'eq' | 'ge' | 'gt' | 'ne'
  // 空值判断
  | 'isNull' | 'notNull' | 'isEmpty' | 'notEmpty' | 'isBlank' | 'notBlank'
  // 字符串操作
  | 'startsWith' | 'endsWith' | 'contains' | 'regex'
  // 长度检查
  | 'lengthBetween' | 'utf8LengthBetween' | 'length' | 'utf8Length'
  // 范围检查
  | 'between' | 'dateBetween' | 'yearBetween' | 'timeBetween' | 'dateTimeBetween'
  // 集合操作
  | 'in' | 'notIn'
  // 布尔判断
  | 'isTrue' | 'notTrue' | 'isFalse' | 'notFalse'
  // 自定义
  | 'expr' | 'sql';

/**
 * 运算符定义
 */
export interface OperatorDefinition {
  /** 运算符名称 */
  name: OperatorType;
  /** 显示名称 */
  displayName: string;
  /** 描述 */
  description: string;
  /** 参数列表 */
  params: OperatorParam[];
  /** 支持的字段类型 */
  supportedTypes: string[];
}

/**
 * 运算符参数
 */
export interface OperatorParam {
  /** 参数名 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 是否必需 */
  required: boolean;
  /** 参数类型 */
  type: string;
  /** 默认值 */
  defaultValue?: any;
}

// ============================================================================
// 表单数据模型
// ============================================================================

/**
 * 表单数据
 */
export interface FormData {
  /** 检查规则列表 */
  checks: CheckData[];
  /** 全局条件 */
  globalCondition?: ConditionNode;
}

/**
 * 检查规则数据
 */
export interface CheckData {
  /** 规则 ID */
  id: string;
  /** 条件 */
  condition: ConditionNode;
  /** 错误码 */
  errorCode?: string;
  /** 错误描述 */
  errorDescription?: string;
  /** 严重程度 */
  severity?: number;
}