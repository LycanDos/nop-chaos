# Delta 三层编辑器与后端协同设计

## 1. 目标

在 `Nop_Chaos/packages/nop-site` 中新增一个可直接运行的三栏编辑器页面：

- 第一栏：`Base` JSON 编辑
- 第二栏：工作区
- 第三栏：`Delta / Draft` JSON 编辑

其中第二栏不是简单预览，而是承接三层模型：

1. 结构层：Delta
2. 值层：`$jina / $jmes / $java`
3. 过程层：`$pipeline`

这意味着前端不只是“两个 JSON 编辑器 + 一个 diff 视图”，而是要给后续后端执行模型预留稳定接口。

---

## 2. 当前实现落点

页面入口：

- `/delta-three-pane-editor`

主要文件：

- `packages/nop-site/src/views/delta-lab/DeltaThreePaneEditor.vue`
- `packages/nop-site/src/views/delta-lab/components/JsonEditorPane.vue`
- `packages/nop-site/src/views/delta-lab/components/WorkbenchPanel.vue`
- `packages/nop-site/src/views/delta-lab/components/MonacoSurface.vue`

模型与支撑层：

- `packages/nop-site/src/views/delta-lab/model/embeddedRegistry.ts`
- `packages/nop-site/src/views/delta-lab/model/deltaPreview.ts`
- `packages/nop-site/src/views/delta-lab/model/previewProvider.ts`
- `packages/nop-site/src/views/delta-lab/model/sampleDocuments.ts`

---

## 3. 前端架构

## 3.1 左右两栏

左右两栏统一使用 `vanilla-jsoneditor`：

- Base 栏负责编辑基础数据
- Delta 栏负责编辑结构层草稿，也允许顶层切换为 `$pipeline`

当前实现里：

- `tree` / `table` / `text` 都可以切换
- 选中节点时会把当前路径同步给中栏
- 使用 `onRenderMenu` 增加“在中栏查看”
- 使用 `onRenderValue` + `onClassName` 给嵌入 DSL 节点打标签

## 3.2 中栏工作区

中栏职责：

- 跟随当前活跃编辑器
- 预览当前节点
- 用插件化方式编辑特殊值
- 在右栏活跃时展示整体 Delta 预览
- 展示未来后端接口契约

当前中栏已经支持：

- 普通 JSON 节点预览
- 图片值预览与编辑
- `$jina` 的 Monaco + JSONata 语言支持
- `$jmes` 的源码编辑
- `$java` 的 Java 高亮编辑
- `$pipeline` 的摘要与源码编辑

---

## 4. 插件化设计

当前通过 `embeddedRegistry` 实现：

- 匹配当前节点是否属于嵌入编辑器类型
- 返回节点所属层级：结构层 / 值层 / 过程层
- 返回语言类型、摘要、源码提取和回写逻辑

第一批内置类型：

1. 图片值
2. `$jina`
3. `$jmes`
4. `$java`
5. `$pipeline`
6. 默认 JSON 节点

这意味着未来继续扩展：

- `$sql`
- `$groovy`
- `$python`
- 自定义业务 DSL

都不需要改左右 JSONEditor 主体，只需要给 registry 增加一条规则。

---

## 5. 当前“整体预览”的语义

## 5.1 当前实现的是前端本地模拟器

中栏的“整体 Delta 预览”当前不是后端真实执行结果，而是：

- `LocalDeltaPreviewProvider`
- 基于 `deltaPreview.ts` 的前端模拟器

它当前能做：

- Delta key 解析
- merge / replace / delete / array insert
- selector 定位
- 顶层 `$pipeline` 下 `$delta` step 的顺序预览

它当前不能替代后端：

- 表达式权威求值
- 安全校验
- Java 真实执行
- 完整的冲突检测
- 权限、上下文、外部服务参与

## 5.2 当前对表达式的处理

当前前端对 `$jina / $jmes / $java` 仅做占位：

- `[value:$jina] ...`
- `[value:$jmes] ...`
- `[value:$java] ...`

这是为了让中栏结构预览可读，但不制造“前端已经真实执行”的错觉。

---

## 6. 与后端的协同边界

## 6.1 前端负责什么

前端负责：

- 结构编辑
- 节点定位
- 嵌入值编辑
- 本地模拟预览
- 草稿组织
- UI 层的层级识别

## 6.2 后端负责什么

后端负责：

- `delta_new` 的真实 parser / validator / engine
- `$jina / $jmes / $java` 的权威执行
- `$pipeline` 的顺序执行
- 冲突检测
- 权限和上下文
- 持久化与版本化

## 6.3 正确的接口分工

推荐后端提供三类接口：

1. 预览接口
2. 校验接口
3. 执行/保存接口

推荐接口：

- `POST /api/delta/editor/preview`
- `POST /api/delta/editor/validate`
- `POST /api/delta/editor/apply`

请求体统一建议：

```json
{
  "base": {},
  "draft": {}
}
```

返回体建议：

```json
{
  "mode": "delta",
  "source": "backend",
  "result": {},
  "warnings": [],
  "steps": [],
  "unresolvedExpressions": 0
}
```

---

## 7. 三层语义如何与后端对齐

## 7.1 结构层

前端：

- 编辑扁平路径 Delta key
- 做基础本地模拟

后端：

- 用 `delta_new` 真实解析与执行

## 7.2 值层

前端：

- 负责源码编辑体验
- 负责语法级辅助

后端：

- 负责值求解
- 负责安全和上下文

## 7.3 过程层

前端：

- 负责 step 编排编辑
- 负责 step 摘要与顺序展示

后端：

- 负责串行执行
- 负责 step 间状态传递

---

## 8. 下一步建议

建议后续按下面顺序继续推进：

1. 后端补 `preview / validate / apply` 接口
2. 前端新增 `HttpDeltaPreviewProvider`
3. 中栏增加“本地模拟 / 后端权威”切换
4. `$jmes` 补语言支持
5. `$java` 接后端校验能力
6. `$pipeline` 从源码编辑升级为 step 面板编辑

---

## 9. 当前验证情况

当前已确认：

- 页面、路由、三栏布局已经接入
- `vanilla-jsoneditor`、Monaco、JSONata 语言插件已集成
- Vite 构建能走到打包阶段

当前验证阻塞：

- 仓库内原有 `vue-tsc` 因无关文件 `src/components/jeecg/comment/MyComment.vue` 报错而无法做全量类型检查
- `nop-site` 原有构建流程在 `packages/sdk/lib/sdk.js` 上存在无关的 `amis` 解析问题，导致全量 build 最终失败

这两个问题都不是本次 Delta 三层编辑器引入的。
