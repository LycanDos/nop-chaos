/**
 * Xdef 可视化编辑器
 * 基于 Nop 框架的通用可视化配置管理工具
 */

// 核心引擎
export { EnhancedXdefParser } from './parsers/enhanced-xdef-parser'
export { FieldMappingLoader } from './loaders/field-mapping-loader'
export { HintEngine } from './engines/hint-engine'
export { ExportEngine } from './engines/export-engine'
export { FormGenerator } from './generators/form-generator'

// Vue 组件
export { default as XdefEditor } from './components/XdefEditor.vue'
export { default as PathSelector } from './components/PathSelector.vue'
export { default as ErrorCodeSelector } from './components/ErrorCodeSelector.vue'
export { default as ConditionBuilder } from './components/ConditionBuilder.vue'
export { default as ConditionTreeEditor } from './components/ConditionTreeEditor.vue'

// 类型定义
export * from './types'

// 版本信息
export const version = '0.1.0'