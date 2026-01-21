# CheckEditor 组件

## 概述

CheckEditor 是一个重新设计的校验器编辑器组件，支持转换和校验两种操作类型，提供了更直观和功能丰富的用户界面。

## 功能特性

### 1. 操作类型支持
- **转换类型 (Z)**: 数据转换操作，将输入数据转换为指定类型
- **校验类型 (V)**: 数据校验操作，验证数据是否符合指定规则

### 2. 转换类型特性
- ✅ 置顶显示，只允许出现一次
- ✅ 树形结构展示转换结果
- ✅ 支持多种数据类型转换（String、Long、Integer、Double、Boolean、Date等）
- ✅ 转换结果可点击添加到校验类型的属性值

### 3. 校验类型特性
- ✅ 支持ID和错误描述展示
- ✅ 丰富的配置选项：
  - 错误码（下拉选择，支持搜索）
  - 错误消息（多语言支持）
  - 属性值（可点击转换结果树添加）
  - 操作方式（等于、大于、小于、区间等）
  - 配置值（根据操作类型优化展示）

### 4. 交互功能
- ✅ 转换结果树节点点击添加到校验属性值
- ✅ 区间操作支持最小值和最大值输入
- ✅ 错误码选择后自动填充默认错误描述
- ✅ 支持语言版本切换

## 使用方式

### 基本用法

```vue
<template>
  <CheckEditor 
    v-model="checkData"
    :fields="fields"
    :current-field="currentField"
  />
</template>

<script setup>
import CheckEditor from './CheckEditor.vue';

const checkData = ref([
  {
    id: 'transform_1',
    condition: {
      operationType: 'Z',
      operationValue: 'String'
    }
  },
  {
    id: 'validation_1',
    errorCode: 'VALIDATION_ERROR',
    errorDescription: '验证错误',
    condition: {
      operationType: 'V',
      type: 'eq',
      name: 'user.name',
      value: ''
    }
  }
]);

const fields = ref([
  { name: 'user.name', type: 'String', desc: '用户名' }
]);

const currentField = ref({
  name: 'user.name',
  type: 'String',
  desc: '用户名'
});
</script>
```

### Props

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| modelValue | CheckItem[] | [] | Check数据数组 |
| fields | any[] | [] | 字段列表 |
| currentField | any | null | 当前编辑字段 |
| isUnion | boolean | false | 是否为高级校验器 |

### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:modelValue | CheckItem[] | 数据更新事件 |

### 数据结构

#### CheckItem 接口

```typescript
interface CheckItem {
  id: string;                    // 唯一标识
  errorCode: string;             // 错误码
  errorParams?: string;          // 错误参数
  errorDescription?: string;     // 错误描述
  errorStatus?: number;          // 错误状态
  bizFatal?: boolean;            // 是否业务致命错误
  severity?: number;             // 严重程度
  condition?: any;               // 条件配置
  desc?: string;                 // 说明
}
```

#### Condition 结构

```typescript
interface Condition {
  type: string;                  // 操作类型 (eq, lt, gt, between等)
  name: string;                  // 属性名
  value: string;                 // 配置值
  operationType: 'Z' | 'V';      // 操作类型 (Z:转换, V:校验)
  operationValue?: string;       // 操作值
}
```

## 演示页面

访问 `/check-editor-demo` 路由可以查看完整的演示页面，包含：

1. 功能特性说明
2. 实时编辑演示
3. 数据预览

## 更新日志

### v2.0.0 (当前版本)
- 🎉 重新设计用户界面
- ✨ 支持转换和校验两种操作类型
- ✨ 转换类型置顶显示，只允许一次
- ✨ 树形结构展示转换结果
- ✨ 丰富的校验配置选项
- ✨ 支持区间操作和语言版本
- ✨ 转换结果可点击添加到校验属性值

### v1.0.0 (原版本)
- 基础校验器编辑功能
- 使用 FilterConditionEditor 组件 