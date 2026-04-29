/**
 * bpmn-process-designer 库入口
 * 基于 tsai996/vue-bpmn-designer 重构，集成 Nop 平台 lProcess 扩展
 *
 * 注意：CSS 依赖需要由消费者自行导入，因为字体文件路径在库构建后会断裂。
 * 请在使用方项目中添加以下 import：
 *   import 'bpmn-js/dist/assets/diagram-js.css'
 *   import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
 *   import 'bpmn-js/dist/assets/bpmn-js.css'
 *   import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
 *   import 'diagram-js-minimap/assets/diagram-js-minimap.css'
 *   import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
 *   import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'
 *   import 'bpmn-js-color-picker/colors/color-picker.css'
 */

// 组件内部样式（不含字体引用）
import './styles/bpmn.scss'
import './extensions/binding-overlay.css'

// 注册连接器 SVG 图标 sprite
import { registerSvgSprite } from './assets/svgSprite'
registerSvgSprite()

// 核心设计器组件
export { default as ProcessDesigner } from './designer/index.vue'

// 属性面板组件
export { default as BpmnPanel } from './designer/BpmnPanel.vue'

// BpmnModeler 渲染组件（TSX）
export { default as BpmnDesigner } from './designer/BpmnModeler.tsx'

// 工具函数
export * from './designer/utils/ElementUtil'
export * from './designer/utils/ExtensionElementsUtil'
export * from './designer/utils/EventDefinitionUtil'

// hooks
export { useBpmnContextService, bpmnContext, selectedElementRef } from './hooks/useService'

// 类型定义
export * from './types/index'

// Flowable moddle 描述符
export { default as flowableModdleDescriptors } from './designer/flowable.json'

// lProcess 扩展描述符
export { default as lProcessModdleDescriptor } from './extensions/lProcessDescriptor.json'

// lProcess 方法绑定面板
export { default as MethodBindingPanel } from './extensions/MethodBindingPanel.vue'

// 自定义模块（供外部按需使用）
export { default as CustomContextPad } from './designer/ContextPad'
export { default as CustomPopupMenu } from './designer/PopupMenu'
export { default as CustomReplace } from './designer/Replace'
export { default as CustomModeling } from './designer/Modeling'
export { default as RerenderPalette } from './designer/Palette'
export { default as ElementParse } from './designer/Parse'
export { default as httpTaskRenderer } from './designer/Renderer'
export { default as Translate } from './designer/Translate'
export { default as LintModule } from './designer/Lint'

// 空白 XML 模板
export { default as EmptyXML } from './designer/EmptyXML'

// ============ 向后兼容别名（供 nop-site 旧代码使用） ============
export { default as MyProcessDesigner } from './designer/index.vue'
export { default as MyProcessPenal } from './designer/BpmnPanel.vue'
