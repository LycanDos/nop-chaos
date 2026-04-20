# 校验前后序收缩规则

| 前序校验 | 后序允许的收紧方式 | 后序不允许的方式 | 说明 |
| --- | --- | --- | --- |
| `between` / `gt` / `ge` / `lt` / `le` | 使用完整且更小的区间；精确值落在前序范围内 | 缺失边界、扩大区间、精确值落到范围外 | 当前实现对前序范围采用“只能继续收缩到既有允许区间内” |
| `notBetween` | 继续排除更多范围；精确值落在排除区间外 | 重新允许排除区间中的值或范围 | 不能把前序排除掉的区间重新放开 |
| `eq` | 维持同一个精确值 | 改成其他值、改成允许其他值的规则 | 前序已把允许值收敛到单点 |
| `in` | 更小的 `in`；其他规则与前序集合求交后仍有剩余值 | 与前序集合无交集 | 例如前序 `in [1,2,3]`，后序 `notIn [1,5,6]` 允许，最终剩 `[2,3]` |
| `ne` | 继续排除更多值 | 重新允许前序已排除值 | 后序不能让前序禁止的值重新合法 |
| `notIn` | 继续扩大排除集合 | 重新允许前序排除集合中的任意值 | 任一被前序排除的值都不能在后序重新被允许 |
| `contains` | 更强的 `contains`；精确值仍满足前序 `contains` | `notContains` 同词、`isBlank`、任何会允许“不包含前序文本”的规则 | 例如前序 `contains xxx`，后序 `contains order-xxx` 允许 |
| `startsWith` | 更长的相同前缀；精确值仍满足前序前缀 | 改成允许非该前缀的规则 | 例如前序 `startsWith ORD`，后序 `startsWith ORD-2026` 允许 |
| `endsWith` | 更长的相同后缀；精确值仍满足前序后缀 | 改成允许非该后缀的规则 | 与 `startsWith` 同理 |
| `notContains` | 继续排除更多模式 | 允许再次包含前序禁止文本 | 不能重新放开前序禁止的文本片段 |
| `notStartsWith` | 继续排除更多前缀 | 允许再次匹配前序禁止前缀 | 不能重新放开前序禁止的前缀 |
| `notEndsWith` | 继续排除更多后缀 | 允许再次匹配前序禁止后缀 | 不能重新放开前序禁止的后缀 |
| `containsSpecialChars` | 继续添加其他限制，但仍必须包含特殊字符 | 允许“无特殊字符”的值 | 后序不能把特殊字符要求放宽掉 |
| `notContainsSpecialChars` | 继续添加其他限制，但仍必须不含特殊字符 | 允许特殊字符 | 后序不能重新放开特殊字符 |
| `notNull` | 保持非空并继续收紧 | 允许空值 | 后序不能重新放开 `null` / `undefined` |
| `notBlank` | 保持非空字符串并继续收紧 | 允许空字符串或纯空白 | 后序不能重新放开空串 |
| `isNull` | 仅允许继续保持 `isNull` | 任何允许非空值的规则 | 前序已收敛到“只能为空” |
| `isBlank` | 仅允许继续保持 `isBlank` | 任何允许非空字符串的规则 | 前序已收敛到“只能为空串” |
| `required` | 保持必填并继续收紧其他值域 | 去掉必填语义 | 前端行为上仍要求字段存在 |
| `readonly` | 保持只读 | 改成可编辑 | 表单行为不能被放宽 |
| `locked` | 保持锁定且锁定值一致 | 改成其他锁定值或去掉锁定 | 仅保留 `LOCKED` 语义 |
| `default` | 保持相同默认值 | 改成其他默认值 | 默认值不能在后序被改写成另一套含义 |

| 当前前端校验覆盖 | 已支持 |
| --- | --- |
| 空值/空串 | `required` / `notNull` / `isNull` / `isBlank` / `notBlank` |
| 数值/时间区间 | `gt` / `ge` / `lt` / `le` / `between` / `notBetween` |
| 集合 | `in` / `notIn`，支持数组字段逐项校验 |
| 字符串 | `contains` / `notContains` / `startsWith` / `notStartsWith` / `endsWith` / `notEndsWith` / `eq` / `ne` / `containsSpecialChars` / `notContainsSpecialChars` / `regex` |
| 表单行为 | `default` / `readonly` / `locked` |
