# bpmn-process-designer

基于 [tsai996/vue-bpmn-designer](https://github.com/tsai996/vue-bpmn-designer) (Apache-2.0) 重构的 BPMN 流程设计器组件库。

## 技术栈

- Vue 3 + TypeScript + Vite 6
- Element Plus
- bpmn-js ^18.6.2
- bpmn-js-token-simulation（流程模拟）
- bpmn-js-bpmnlint（流程校验）
- diagram-js-minimap（小地图）
- CodeMirror 6（脚本编辑器）

## Nop 平台扩展

- `lProcessDescriptor.json` - l:MethodBinding 自定义 Moddle 描述符
- `MethodBindingPanel.vue` - 方法绑定属性面板
- `binding-overlay.css` - 绑定指示器样式

## 使用

```ts
import { ProcessDesigner, BpmnPanel, MethodBindingPanel } from 'bpmn-process-designer'
```

## 开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

## 协议

Apache-2.0 (继承自 tsai996/vue-bpmn-designer)
