# Delta-first 编辑器内核设计

## 1. 文档目标

本文定义一个面向 Delta DSL 的编辑器内核设计，目标不是简单包装一个 JSON 编辑器，而是在尽量保持 `vanilla-jsoneditor` 上游可合并性的前提下，fork 出一个 **Delta-first editor kernel**。

本文聚焦：

- 保留 `delta_new` 现有 flat Delta 语法作为唯一 canonical format
- 在 `text/tree/table` 三种模式下统一支持 Delta Key 与 Value 的语言能力
- 引入 grouped / flat 投影视图，但不暴露假的 JSON 中间结构
- 支持多 Source、Target 选择、Pipeline 多标签编排
- 为后续 completion、lint、selector 提示、Monaco 适配预留稳定接口

本文不讨论：

- `delta_new` parser / validator / engine 的细节实现
- 后端表达式引擎本身的语义扩展
- 与具体持久化协议、数据库模型的集成细节

---

## 2. 核心结论

### 2.1 Canonical Format 不变

对用户可见、对后端传输、对校验和预览生效的唯一格式，仍然是 flat Delta：

```json
{
  "user.profile.displayName": {
    "$jina": "firstName & ' ' & lastName"
  },
  "user.profile.avatar": {
    "$jina": "$user.avatar ? $user.avatar : $tenant.defaultAvatar"
  },
  "user.profile.+name": "A",
  "user.profile.email-": true
}
```

必须继续保留：

- `.` 路径语义
- `.+` replace 语义
- `-` delete 语义
- `+[]` / `+<` / `+>` 数组插入语义
- selector 语义

不能把这些语义替换成另一套 `entries` DSL，也不能把 grouped 持久化为假的嵌套 JSON。

### 2.2 Grouped 只是 Projection，不是另一份 Delta

grouped 的本质是视图投影：

- 底层真实文档永远是 flat Delta JSON
- grouped 只是编辑器内部构造出的虚拟节点树
- grouped 中的编辑会立即回写到 flat Delta
- 切换回 flat 时，看到的仍然是原始 key map

### 2.3 Delta-first Editor Kernel 的三个核心层

建议 fork 后新增三个稳定层：

1. Canonical Document Layer
2. Projection Layer
3. Delta Language Layer

这三层是所有增强能力的基础。

---

## 3. 总体架构

## 3.1 Canonical Document Layer

唯一真实文档：

- Base / Sources 文档
- Delta / Pipeline 草稿

其中 Delta 草稿在任意时刻都以 flat JSON object 存在。

这层负责：

- 保存真实 JSON 内容
- 为后端 `preview / validate / apply` 提供输入
- 作为 grouped / flat / pipeline 投影的唯一来源

这层不负责：

- grouped 视图组织
- Delta Key 高亮
- Key 编辑器行为

## 3.2 Projection Layer

Projection Layer 负责把 canonical doc 投影为不同的编辑视图。

建议最少支持以下 projection：

1. `flat`
2. `grouped`
3. `pipeline-tabs`

这层的职责：

- 根据 flat Delta 生成虚拟节点
- 将 grouped/pipeline 编辑操作反写成 flat Delta
- 维持视图内选中节点与 canonical key 的映射

这层不直接保存真实文档，只生成视图状态。

## 3.3 Delta Language Layer

Delta Language Layer 负责 Delta 的语言能力，不关心 UI 细节。

建议至少包含：

1. Delta Key tokenizer
2. Delta Key bracket matcher
3. Delta Key rainbow bracket provider
4. Delta Value language registry
5. completion provider
6. lint / diagnostics provider
7. selector hint provider

它必须同时服务：

- `text` 模式
- `tree` 模式的 key 展示
- `tree` 模式的 key 编辑
- `table` 模式的 key 展示/编辑

---

## 4. 与 Upstream Merge 的兼容原则

fork 目标不是“全面重写”，而是尽可能少侵入上游实现。

### 4.1 新增扩展点，不改默认行为

原则：

- 不修改默认 JSON 编辑语义
- 不改变非 Delta 模式行为
- 新能力默认关闭
- 所有 Delta 行为通过显式配置开启

推荐新增配置：

```ts
type DeltaEditorOptions = {
  deltaMode?: boolean
  projectionMode?: 'flat' | 'grouped'
  languageEngine?: 'codemirror' | 'monaco'
  deltaLanguageService?: DeltaLanguageService
  projectionStrategy?: ProjectionStrategy
  keyEditorAdapter?: KeyEditorAdapter
}
```

### 4.2 扩展点优先级高于直接改组件分支

不要到处散写：

```ts
if (isDelta) { ... }
if (groupedMode) { ... }
```

更合适的方式是：

- 新增 `ProjectionStrategy`
- 新增 `DeltaLanguageService`
- 新增 `TextEngineAdapter`
- 新增 `KeyEditorAdapter`

### 4.3 控制改动范围

尽量把 fork 修改集中在以下四块：

1. text mode adapter
2. tree/table key renderer + key editor
3. projection layer
4. Delta language service

避免在业务层、宿主层、右侧 drawer 层散布底层语义逻辑。

---

## 5. Projection 设计

## 5.1 为什么必须引入 Virtual Node

`vanilla-jsoneditor` 当前适合渲染真实 JSON 树，不适合直接渲染 grouped Delta。

如果直接把 grouped 生成为：

```json
{
  "scope": "user.profile",
  "items": [...]
}
```

会带来两个问题：

1. 用户看到假的 JSON 结构
2. 视图切换时很难与真实 key 建立稳定映射

因此必须引入虚拟节点：

- 用户看到的是 group 节点
- 真实文档里并不存在该节点
- group 节点只是视图树的一部分

## 5.2 节点模型

建议定义：

```ts
type DocumentNode = {
  kind: 'document'
  key: string
  path: string[]
  value: unknown
}

type VirtualGroupNode = {
  kind: 'virtual-group'
  groupKey: string
  canonicalPrefix: string
  children: ProjectedNode[]
}

type DeltaEntryNode = {
  kind: 'delta-entry'
  rawKey: string
  scope: string
  displayKey: string
  operation: 'merge' | 'replace' | 'delete' | 'insert'
  value: unknown
}

type ProjectedNode = DocumentNode | VirtualGroupNode | DeltaEntryNode
```

## 5.3 Grouped 视图规则

grouped 不显示 fake JSON，而是显示虚拟 group。

示例：

flat：

```json
{
  "user.profile.displayName": "...",
  "user.profile.avatar": "...",
  "user.profile.+name": "A",
  "user.profile.email-": true,
  "fields[name='age'].label": "年龄",
  "fields+>[name='age']": {
    "name": "ageUnit"
  }
}
```

grouped 视图显示为：

- `user.profile`
  - `displayName`
  - `avatar`
  - `+name`
  - `email-`
- `fields[name='age']`
  - `label`
- `fields`
  - `+>[name='age']`

注意：

- 这是视图树，不是另一份 JSON
- `+name`、`email-`、`+>[name='age']` 等仍然以 Delta 语义展示
- group 内项目可以直接编辑 suffix / op / value

## 5.4 Grouped 与 Flat 切换

切换规则：

1. 真实草稿始终保存为 flat Delta
2. grouped 模式每次由 flat 草稿即时投影生成
3. grouped 中的任何编辑立即编码回 flat
4. 切回 flat 时显示 canonical key map

因此：

- 不会存在两份真实草稿
- 不会存在 grouped 特有协议
- 不需要后端理解 grouped

## 5.5 Text 模式下的 Grouped

第一阶段建议：

- `text` 模式只显示 canonical flat Delta
- grouped 只在 `tree/table` 模式启用

原因：

- grouped text 需要另一套投影序列化语法
- 会大幅增加 text mode 复杂度
- 也不利于与后端 canonical format 保持一致

后续如确有必要，再考虑增加“只读 grouped text preview”。

---

## 6. Text / Tree / Table 的 Delta 语言能力

## 6.1 统一目标

三种模式都必须支持：

- Delta Key 语法高亮
- Key 内部括号配对高亮
- Key 内部彩虹括号
- Delta Value 的语法识别与切换
- 编辑态与预览态一致

不能接受：

- 预览态有高亮，编辑态丢失
- tree 能看，text 不能看
- text 有彩虹括号，tree 没有配对

## 6.2 Text Mode

text mode 底层应做成可插拔语言层。

默认：

- 使用 CodeMirror

可选：

- 切换到 Monaco

必须抽象：

```ts
type TextEngineAdapter = {
  id: 'codemirror' | 'monaco'
  createEditor: (options: TextEditorOptions) => TextEditorInstance
  setLanguageService: (service: DeltaLanguageService) => void
  setProjectionMode: (mode: 'flat' | 'grouped') => void
}
```

建议：

- CodeMirror 继续做默认实现，保证 upstream merge 成本最小
- Monaco 作为可选 adapter 接入
- Delta Key 高亮、彩虹括号、lint、completion 尽量先通过统一的 `DeltaLanguageService` 输出

### 6.2.1 优先基于 Monaco 能力建模

即使第一阶段默认引擎仍是 CodeMirror，也建议把语言能力模型设计得更接近 Monaco：

- token provider
- completion provider
- hover provider
- diagnostics provider
- bracket pair provider

这样后续接 Monaco 时不需要重做语义层。

## 6.3 Tree Mode

tree mode 必须区分两个阶段：

1. key 展示态
2. key 编辑态

当前基于 DOM 二次加工的方式只适合展示态，不适合编辑态。

fork 后建议：

- 展示态改为走统一 tokenizer
- 编辑态使用 `KeyEditorAdapter`
- 不再依赖裸 `contenteditable` 注入 span

建议：

```ts
type KeyEditorAdapter = {
  open: (ctx: KeyEditorContext) => void
  close: () => void
  getValue: () => string
  setLanguageService: (service: DeltaLanguageService) => void
}
```

第一阶段可以做：

- overlay key editor
- inline mini CodeMirror

不建议继续直接在编辑态 DOM 中注入 token span。

## 6.4 Table Mode

table mode 与 tree mode 共用：

- Delta Key tokenizer
- KeyEditorAdapter
- Value language registry

不要让 table 成为 tree 的弱化版本，而应共享同一套 Delta 语言层能力。

---

## 7. Delta Value Language 设计

## 7.1 语言注册表

Value 侧建议抽象为统一 registry：

```ts
type ValueLanguageDefinition = {
  id: string
  match: (value: unknown, key: string, path: string[]) => boolean
  languageId: string
  getSource: (value: unknown) => string
  setSource: (source: string, oldValue: unknown) => unknown
  completion?: CompletionProvider
  lint?: DiagnosticsProvider
}
```

第一批支持：

1. `$jina`
2. `$jmes`
3. `$java`
4. 图片 / URL / SQL 等扩展类型

## 7.2 Key 与 Value 语言能力分离

必须区分：

- Key language
- Value language

不要把 `$jina` 的语法能力和 Delta Key 的语法能力混在一起。

Delta Key 负责：

- `.` `+` `-`
- selector
- bracket pair
- grouped 投影展示

Value language 负责：

- 表达式源码
- completion
- lint
- formatter

---

## 8. Base / Sources / Target 设计

## 8.1 左侧 Base 改为 Sources Workspace

左侧不再只是单一 Base，而是一个 Sources Workspace。

建议 UI：

- 顶部：`Target` 选择器
- 下方：多标签页

示例标签：

- `Source-main`
- `Source-user`
- `Source-tenant`

规则：

1. 如果只有一个 source，则可省略 `Target`
2. 如果有多个 source，则 `Target` 必填
3. Target 表示当前 Delta 写入哪个 source
4. 其他 source 只读参与表达式计算，不直接被这份 Delta 修改

## 8.2 表达式上下文精简

表达式上下文建议精简为：

1. `$sources`
2. `$main` / `$user` / `$tenant` 等别名
3. 当前 target source 作为默认 root input

不再鼓励 `$base`。

语义：

- `$sources.main`
  代表名为 `main` 的 source
- `$main`
  是 `$sources.main` 的简写
- 当前 target 对应的 source 会作为表达式默认 root
- 因此写 target 下字段时可以直接写相对路径

示例：

```json
{
  "user.profile.displayName": {
    "$jina": "firstName & ' ' & $user.lastName"
  },
  "user.profile.avatar": {
    "$jina": "$user.avatar ? $user.avatar : $tenant.defaultAvatar"
  }
}
```

当 `target = main` 时：

- `firstName`
  从 `main.firstName` 读取
- `$user.lastName`
  从 `sources.user.lastName` 读取

如果表达式需要显式访问 target source，也可写：

```text
$main.user.profile.name
```

## 8.3 Target 的真正含义

`target` 不是“选择当前显示哪个 source”，而是：

- 当前这份 Delta 写入哪个 source 文档

即：

```text
result = applyDelta(base = sources[target], delta = draft, readableSources = sources)
```

---

## 9. Delta 多标签与 Pipeline 多标签

## 9.1 Delta 支持多标签

右侧 Delta Workspace 建议支持多标签：

- `Pipeline`
- `Delta-1`
- `Delta-2`
- `Delta-3`

## 9.2 Pipeline 标签语义

当存在 pipeline 时：

- 第一标签固定为 `Pipeline`
- 后续标签自动由 pipeline step 解析而来

例如：

```json
{
  "$pipeline": [
    { "$delta": { "a.b": 1 } },
    { "$delta": { "a.c": 2 } }
  ]
}
```

会投影为：

- `Pipeline`
- `Delta-1`
- `Delta-2`

## 9.3 与左侧 Sources 联动

选择不同 Delta 标签时，左侧 Base 必须联动。

规则：

1. 选择 `Delta-1`
   - 左侧显示 `sources[target]` 的原始输入
2. 选择 `Delta-2`
   - 左侧显示 `Delta-1` 的执行结果
3. 选择 `Delta-3`
   - 左侧显示 `Delta-2` 的执行结果

即：

- 每个 Delta 标签的左侧 base，都是前一步的结果快照
- 这样用户可以明确理解 pipeline 顺序

## 9.4 非 Pipeline 模式

如果当前没有 `$pipeline`：

- 右侧只显示单个 Delta 标签
- 左侧 Base 直接取 `sources[target]`

---

## 10. Menu 与视图切换

建议在原 `jse-menu` 中新增 View 控制项：

1. `Projection`
   - `Flat`
   - `Grouped`
2. `Text Engine`
   - `CodeMirror`
   - `Monaco`
3. `Language Features`
   - `Highlight`
   - `Rainbow Brackets`
   - `Lint`
   - `Completion`

要求：

- 这些选项是编辑器级别的能力开关
- 不影响 canonical doc
- 切换 projection 不会破坏当前草稿

---

## 11. 分阶段实施建议

## 11.1 Phase 1

- 保持 flat Delta 为唯一真实文档
- fork `vanilla-jsoneditor`
- text mode 增加可插拔语言层
- tree/table 引入统一 Delta Key tokenizer

## 11.2 Phase 2

- 引入 `KeyEditorAdapter`
- 让 tree/table 的 key 编辑态也支持高亮与括号配对
- 接入 value language registry

## 11.3 Phase 3

- 引入 Projection Layer
- 完成 grouped / flat 切换
- 增加 virtual group nodes

## 11.4 Phase 4

- 引入 Sources Workspace
- 增加 target 选择
- 支持多 source 标签

## 11.5 Phase 5

- 引入 Pipeline 多标签投影
- 与左侧 Base 结果快照联动

## 11.6 Phase 6

- completion
- lint
- selector hint
- Monaco adapter

---

## 12. 最终建议

最终建议压缩成几条：

1. flat Delta 继续作为唯一 canonical format
2. grouped 只作为 projection，不持久化为 fake JSON
3. fork `vanilla-jsoneditor`，但以新增扩展层为主，不改默认行为
4. 把 Delta Key 与 Value 的语言能力抽成统一 `DeltaLanguageService`
5. text/tree/table 三种模式都必须支持编辑态语言能力
6. 左侧升级为 Sources Workspace，支持 target 与多 source 标签
7. 右侧 Delta Workspace 支持 pipeline 多标签，并与左侧 base 快照联动
8. CodeMirror 继续做默认 text 引擎，Monaco 作为可插拔 adapter 接入

这套设计的关键不是做出更多视图，而是先建立：

- 唯一真实文档
- 稳定的 projection
- 稳定的语言层

只有这三点稳定，后面再做 grouped、pipeline、多 source、completion、lint 才不会反复推翻。
