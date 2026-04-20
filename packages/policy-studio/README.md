# Clar

`policy-studio` 是基于 `xdef-visual-editor` 演进出的多层参数策略编辑器。

第一版目标：

- 面向任意字段路径定义多层规则
- 支持 `BASE / PARTNER / NODE / INSTANCE` 四层策略
- 支持条件规则、默认值、锁定值、只读、清除覆盖
- 支持 XML 作为策略主表达
- 提供“生效规则”编译预览，便于展示原规则与覆盖规则

当前版本重点在编辑模型与导出结构，适合作为工作流参数策略的前端工作台基础包。

## 当前实现

- 复用 `xdef-visual-editor` 的 `ConditionBuilder`、`PathSelector`、`HintEngine`
- 面向字段路径编辑多规则集，并提供规则覆盖预览
- 页面布局调整为左侧规则集编辑，右侧 `Schema-JSON / 生成表单 / 规则生效预览 / 规则 XML / 规则 JSON`
- `Schema` 被视为“描述数据格式”的核心对象，驱动字段路径、值编辑器、生成表单与校验覆盖说明
- 操作符选择器为两列分组布局，并按字段类型优先展示匹配操作符
- 支持基于 Schema 的示例数据查看与编辑，日期/时间/日期时间字段会自动切换专用编辑器
- 支持通过 Markdown / zip / URL 导入 `Policy Bundle`，其中规则集以 `.rules.md` 形式保存
- 将 `gt/ge/lt/le/between` 统一抽象为 `range` 规则族，支持多层收缩
- 将 `in` 规则按交集收缩
- 导出 XML 主表达，`apply-when` 使用接近 xdef 的条件节点结构
- 示例页支持 `?id=demo`、`?resolver=/api/policy-bundle&id=xxx`，也支持直接通过 URL 传入 `schema/document/rules/sampleData`

## XML 示例

```xml
<?xml version="1.0" encoding="UTF-8"?>
<policy id="policy-order-review" name="订单审核节点策略" targetSchema="/l/process/schema/order-review-policy.xdef" version="1.0">
  <description>演示 BASE/PARTNER/NODE/INSTANCE 四层规则叠加</description>
  <layers>
    <layer id="layer-base" type="BASE" name="基础规则" orderNo="100" editable="false">
      <rule id="base-age-range" path="order.age" operator="between" enabled="true" orderNo="10">
        <range min="0" max="100"/>
      </rule>
    </layer>
  </layers>
</policy>
```

## 下一步建议

- 增加 XML 反向解析，形成完整 import/edit/export 闭环
- 将策略文档进一步落成独立 `.xdef` 或 schema
- 在规则层增加“来源、冻结窗口、审计信息、实例级变更记录”等工作流字段
