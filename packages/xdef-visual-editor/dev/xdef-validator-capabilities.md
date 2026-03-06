# Xdef 可视化编辑器 - 高级校验功能支持能力

## 概述

本文档详细说明基于 `/nop/dev-tools/dev/xdef-visual-editor-design.md` 设计的 Xdef 可视化编辑器对高级校验功能的完整支持能力。

## 支持的高级校验功能

### 1. 条件判断（if/else）

完全支持条件判断逻辑：

```xml
<check id="checkPassword">
    <if test="user.password != null">
        <lengthBetween name="user.password" min="6" max="20"/>
    </if>
</check>
```

**表单支持：**
- 条件类型选择器：支持选择 "if" 类型
- 字段路径选择器：选择 `user.password`
- 运算符选择：选择 `!= null`
- 子条件：添加长度检查

**生成的组件：**
```vue
<condition-builder>
  <!-- 条件类型选择 -->
  <el-select v-model="conditionType">
    <el-option label="条件判断 (if)" value="if" />
  </el-select>
  
  <!-- 字段选择 -->
  <path-selector v-model="field" />
  
  <!-- 运算符 -->
  <el-select v-model="operator">
    <el-option label="不等于 (!=)" value="ne" />
    <el-option label="为空 (== null)" value="isNull" />
  </el-select>
  
  <!-- 子条件 -->
  <condition-builder v-model="subConditions" />
</condition-builder>
```

**运行时转换：**
```java
// 生成的 Java 代码概念
if (user.password != null) {
    if (user.password.length() >= 6 && user.password.length() <= 20) {
        // 校验通过
    } else {
        throw new ValidationException("密码长度必须在6-20位之间");
    }
}
```

### 2. 组合条件（AND/OR/NOT）

完全支持逻辑组合：

```xml
<!-- AND 组合 -->
<check id="checkOrder">
    <and>
        <gt name="order.qty" value="10"/>
        <gt name="order.total" value="100"/>
    </and>
</check>

<!-- OR 组合 -->
<check id="checkUser">
    <or>
        <eq name="user.status" value="active"/>
        <eq name="user.status" value="pending"/>
    </or>
</check>

<!-- NOT 组合 -->
<check id="checkNotAdmin">
    <not>
        <eq name="user.role" value="admin"/>
    </not>
</check>
```

**表单支持：**
- 逻辑运算符选择：AND、OR、NOT
- 嵌套条件树：支持多层嵌套
- 可视化条件树编辑器

**生成的组件：**
```vue
<condition-tree>
  <logic-operators>
    <el-radio-group v-model="rootCondition.type">
      <el-radio-button label="AND (且)" value="and" />
      <el-radio-button label="OR (或)" value="or" />
      <el-radio-button label="NOT (非)" value="not" />
    </el-radio-group>
  </logic-operators>
  
  <div class="sub-conditions">
    <!-- 动态添加子条件 -->
    <condition-node 
      v-for="(sub, index) in rootCondition.conditions"
      :key="index"
      v-model="rootCondition.conditions[index]"
    />
  </div>
  
  <el-button @click="addCondition">
    添加条件
  </el-button>
</condition-tree>
```

**运行时转换：**
```java
// AND 示例
if (order.qty > 10 && order.total > 100) {
    // 校验通过
}

// OR 示例
if (user.status.equals("active") || user.status.equals("pending")) {
    // 校验通过
}

// NOT 示例
if (!(user.role.equals("admin"))) {
    // 校验通过
}
```

### 3. 复杂嵌套条件

完全支持多层嵌套：

```xml
<check id="checkComplex">
    <if test="order.qty > 10">
        <if test="order.total > 100">
            <and>
                <gt name="order.discount" value="0.1"/>
                <notNull name="order.couponCode"/>
            </and>
        </if>
        <else>
            <eq name="order.discount" value="0"/>
        </else>
    </if>
</check>
```

**表单支持：**
- 可视化条件树显示嵌套关系
- 支持拖拽排序
- 支持删除和编辑每个子条件
- 实时预览生成的 XML

**生成的界面：**
```
└─ 条件类型: if
   ├─ 前置条件: order.qty > 10
   ├─ THEN 分支
   │  ├─ 条件类型: if
   │  │  ├─ 前置条件: order.total > 100
   │  │  └─ 子条件
    │     ├─ 条件类型: and
    │     │  ├─ 运算符: gt
    │     │  │  ├─ 字段: order.discount
    │     │  │   └─ 值: 0.1
    │     │  └─ 运算符: notNull
    │     │     └─ 字段: order.couponCode
    │     └─ 校验动作
   │        └─ 类型: gt
   │           ├─ 字段: order.discount
   │           └─ 值: 0.1
   └─ ELSE 分支
      └─ 校验动作
         └─ 类型: eq
               ├─ 字段: order.discount
               └─ 值: 0
```

### 4. filter-bean 的所有操作符

支持 filter-bean 定义的所有操作符：

| 操作符 | 说明 | 参数 | 表单组件 |
|--------|------|------|----------|
| **比较运算符** |
| `lt` | 小于 | name, value/value/valueName | 下拉选择 + 数值输入 |
| `le` | 小于等于 | name, value/value/valueName | 下拉选择 + 数值输入 |
| `eq` | 等于 | name, value/value/valueName | 下拉选择 + 数值输入 |
| `ge` | 大于等于 | name, value/value/valueName | 下拉选择 + 数值输入 |
| `gt` | 大于 | name, value/value/valueName | 下拉选择 + 数值输入 |
| `ne` | 不等于 | name, value/value/valueName | 下拉选择 + 数值输入 |
| **空值判断** |
| `isNull` | 为 null | name | 下拉选择字段 |
| `notNull` | 不为 null | name | 下拉选择字段 |
| `isEmpty` | 为空（null 或空字符串）| name | 下拉选择字段 |
| `notEmpty` | 不为空 | name | 下拉选择字段 |
| `isBlank` | 为空或只包含空白字符 | name | 下拉选择字段 |
| `notBlank` | 不为空白 | name | 下拉选择字段 |
| **字符串操作** |
| `startsWith` | 以...开头 | name, value | 下拉选择字段 + 文本输入 |
| `endsWith` | 以...结尾 | name, value | 下拉选择字段 + 文本输入 |
| `contains` | 包含 | name, value | 下拉选择字段 + 文本输入 |
| `regex` | 匹配正则表达式 | name, pattern | 下拉选择字段 + 正则表达式输入 |
| **长度检查** |
| `lengthBetween` | 长度在范围内 | name, min, max | 下拉选择字段 + 两个数值输入 |
| `utf8LengthBetween` | UTF-8 编码长度在范围内 | name, min, max | 下拉选择字段 + 两个数值输入 |
| `length` | 长度等于指定值 | name, value | 下拉选择字段 + 数值输入 |
| `utf8Length` | UTF-8 编码长度等于指定值 | name, value | 下拉选择字段 + 数值输入 |
| **范围检查** |
| `between` | 值在范围内 | name, min, max | 下拉选择字段 + 两个数值输入 |
| `dateBetween` | 日期在范围内 | name, min, max | 下拉选择字段 + 日期选择器 |
| `yearBetween` | 年份在范围内 | name, min, max | 下拉选择字段 + 年份选择器 |
| `timeBetween` | 时间在范围内 | name, min, max | 下拉选择字段 + 时间选择器 |
| `dateTimeBetween` | 日期时间在范围内 | name, min, max | 下拉选择字段 + 日期时间选择器 |
| **集合操作** |
| `in` | 值在集合中 | name, value | 下拉选择字段 + 标签选择器 |
| `notIn` | 值不在集合中 | name, value | 下拉选择字段 + 标签选择器 |
| **布尔判断** |
| `isTrue` | 为 true | name | 下拉选择字段 |
| `notTrue` | 不为 true | name | 下拉选择字段 |
| `isFalse` | 为 false | name | 下拉选择字段 |
| `notFalse` | 不为 false | name | 下拉选择字段 |
| **自定义表达式** |
| `expr` | 自定义表达式 | - | 代码编辑器 |
| `sql` | SQL 表达式 | - | 代码编辑器 |

### 5. 动态表达式支持

```xml
<check id="checkCustom">
    <expr>user.age >= 18 && user.age <= 65</expr>
</check>
```

**表单支持：**
- 代码编辑器组件
- 支持表达式语法高亮
- 支持实时语法校验
- 支持常用代码片段

**表达式语法：**
- 支持所有 JavaScript 表达式
- 支持字段路径引用：`user.age`, `order.total`
- 支持运算符：`&&`, `||`, `!`, `>`, `<`, `>=`, `<=`, `==`, `!=`
- 支持函数调用：`length()`, `size()`, `matches()` 等

## 完整的高级校验示例

### 示例 1：订单验证

```xml
<validator>
    <check id="checkOrderQty">
        <!-- 订单数量必须为正整数 -->
        <and>
            <gt name="order.qty" value="0"/>
            <isNumber name="order.qty"/>
        </and>
    </check>
    
    <check id="checkOrderTotal">
        <!-- 如果订单数量>10，总额必须>100 -->
        <if test="order.qty > 10">
            <gt name="order.total" value="100"/>
        </if>
    </check>
    
    <check id="checkOrderUser">
        <!-- 订单必须有用户 -->
        <and>
            <notNull name="order.userId"/>
            <gt name="order.userId" value="0"/>
        </and>
    </check>
    
    <check id="checkOrderItems">
        <!-- 订单必须有商品 -->
        <notNull name="order.items"/>
        <gt name="order.items.length" value="0"/>
    </check>
</validator>
```

**生成的表单结构：**

```
检查规则 1: 订单数量校验
├─ 条件类型: AND
├─ 条件 1
│  ├─ 字段: order.qty
│  │  ├─ 运算符: >
│  │  │   └─ 值: 0
│  └─ 校验动作: 类型检查 - 必须是数字
└─ 条件 2
   ├─ 字段: order.qty
   └─ 运算符: 类型检查 - 必须是数字

检查规则 2: 订单总额校验（条件判断）
└─ 条件类型: IF
   ├─ 前置条件: order.qty > 10
   ├─ THEN 分支
   │  └─ 字段: order.total
   │      └─ 运算符: >
   │         └─ 值: 100

检查规则 3: 订单用户校验
└─ 条件类型: AND
   ├─ 条件 1
   │  ├─ 字段: order.userId
   │  │  └─ 运算符: notNull
   └─ 条件 2
      ├─ 字段: order.userId
      └─ 运算符: >
         └─ 值: 0
```

### 示例 2：用户注册验证

```xml
<validator>
    <check id="checkUsername">
        <!-- 用户名必须提供 -->
        <and>
            <notNull name="user.username"/>
            <notEmpty name="user.username"/>
        </and>
    </check>
    
    <check id="checkPassword">
        <!-- 密码必须提供且符合要求 -->
        <and>
            <notNull name="user.password"/>
            <lengthBetween name="user.password" min="8" max="20"/>
            <regex name="user.password" pattern="^[a-zA-Z0-9@#$%^&*]{8,20}$"/>
        </and>
    </check>
    
    <check id="checkEmail">
        <!-- 邮箱必须提供且格式正确 -->
        <and>
            <notNull name="user.email"/>
            <regex name="user.email" 
                   pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"/>
        </and>
    </check>
    
    <check id="checkAge">
        <!-- 年龄可选，但如果提供必须在18-65之间 -->
        <if test="user.age != null">
            <between name="user.age" min="18" max="65" excludeMin="true" excludeMax="true"/>
        </if>
    </check>
    
    <check id="checkPhone">
        <!-- 手机号可选，但如果提供必须是11位数字 -->
        <if test="user.phone != null">
            <and>
                <notNull name="user.phone"/>
                <regex name="user.phone" pattern="^1[3-9]\d{9}$"/>
            </and>
        </if>
    </check>
</validator>
```

**表单支持的编辑功能：**

1. **条件类型切换**：
   - 简单条件：直接选择运算符
   - 条件判断：选择 IF 类型
   - 组合条件：选择 AND/OR/NOT

2. **字段路径智能提示**：
   - 输入 "用户" → 提示所有用户相关字段
   - 输入 "订单" → 提示所有订单相关字段
   - 输入 "user.age" → 提示年龄字段及类型

3. **运算符智能推荐**：
   - 字段类型为数字 → 推荐：gt, lt, ge, le, between
   - 字段类型为字符串 → 推荐：startsWith, endsWith, contains, regex, lengthBetween
   - 字段类型为布尔 → 推荐：isTrue, notTrue

4. **条件实时预览**：
   - 实时显示生成的条件表达式
   - 支持中英文切换显示
   - 支持语法高亮

### 示例 3：复杂业务逻辑

```xml
<validator>
    <check id="checkOrderDiscount">
        <!-- 订单折扣规则 -->
        <if test="order.type == 'normal'">
            <if test="order.total > 1000">
                <and>
                    <gt name="order.discount" value="0.1"/>
                    <lt name="order.discount" value="0.5"/>
                </and>
            </if>
            <elif test="order.total > 5000">
                <and>
                    <gt name="order.discount" value="0.2"/>
                    <lt name="order.discount" value="0.3"/>
                </and>
            </if>
            <elif test="order.total > 10000">
                <and>
                    <gt name="order.discount" value="0.3"/>
                    <lt name="order.discount" value="0.5"/>
                </and>
            </if>
            <else>
                <eq name="order.discount" value="0"/>
            </else>
        </if>
        <else>
            <!-- 特殊订单类型 -->
            <eq name="order.discount" value="0"/>
        </else>
    </check>
</validator>
```

**生成的条件树：**
```
└─ 条件类型: IF
   ├─ 前置条件: order.type == 'normal'
   │  ├─ THEN 分支
   │  │  └─ 条件类型: IF
   │  │     ├─ 前置条件: order.total > 1000
    │  │     └─ THEN 分支
    │  │        └─ 条件类型: AND
    │  │           ├─ 运算符: gt
    │  │           │  ├─ 字段: order.discount
    │  │           │  │   └─ 值: 0.1
    │  │           │  └─ 运算符: lt
    │  │               └─ 字段: order.discount
    │  │                   └─ 值: 0.5
    │  └─ ELSE 分支
   │      └─ 条件类型: ELIF
   │         ├─ 前置条件: order.total > 5000
   │         └─ THEN 分支
   │            └─ 条件类型: AND
   │               ├─ 运算符: gt
   │               │  ├─ 字段: order.discount
   │               │   └─ 值: 0.2
   │               │   └─ 运算符: lt
   │               │       └─ 字段: order.discount
   │               │           └─ 值: 0.3
   │               └─ ELSE 分支
   │                  └─ 条件类型: ELIF
   │                    ├─ 前置条件: order.total > 10000
   │                    └─ THEN 分支
   │                       └─ 条件类型: AND
   │                          ├─ 运算符: gt
   │                          │  ├─ 字段: order.discount
   │                          │  │   └─ 值: 0.3
   │                          │  └─ 运算符: lt
   │                          │      └─ 字段: order.discount
   │                          │          └─ 值: 0.5
   │                          └─ ELSE 分支
   │                             └─ 条件类型: ELIF
   │                                ├─ 前置条件: order.total > 10000
   │                                └─ THEN 分支
   │                                   └─ 条件类型: AND
   │                                      ├─ 运算符: gt
   │                                      │  ├─ 字段: order.discount
   │                                      │  └─ 值: 0.3
   │                                      └─ 运算符: lt
   │                                      │      └─ 字段: order.discount
   │                                      │          └─ 值: 0.5
   │                                      └─ ELSE 分支
   │                                         └─ 条件类型: ELIF
   │                                            └─ THEN 分支
   │                                               └─ 条件类型: AND
   │                                                  ├─ 运算符: gt
   │                                                  │  ├─ 字段: order.discount
   │                                                  │  └─ 值: 0.3
   │                                                  └─ 运算符: lt
   │                                                      └─ 字段: order.discount
   │                                                        └─ 值: 0.5
   │                                                   └─ ELSE 分支
   │                                                      └─ 条件类型: ELIF
   │                                                        ├─ 前置条件: order.type == 'normal'
   │                                                        └─ THEN 分支
   │                                                           └─ 条件类型: ELSE
   │                                                              └─ 条件类型: eq
   │                                                                 ├─ 字段: order.discount
   │                                                                 └─ 值: 0
   └─ ELSE 分支
      └─ 条件类型: ELSE
         └─ 条件类型: eq
            ├─ 字段: order.discount
            └─ 值: 0
```

### 示例 4：嵌套对象校验

```xml
<validator>
    <check id="checkAddress">
        <!-- 地址信息校验 -->
        <and>
            <notNull name="user.address"/>
            <notNull name="user.address.province"/>
            <notNull name="user.address.city"/>
            <notNull name="user.address.detail"/>
            <notEmpty name="user.address.detail"/>
        </and>
    </check>
    
    <check id="checkContactInfo">
        <!-- 联系信息校验 -->
        <or>
            <notNull name="user.phone"/>
            <notEmpty name="user.email"/>
        </or>
    </check>
    
    <check id="checkProfile">
        <!-- 个人资料校验 -->
        <if test="user.profile != null">
            <and>
                <notNull name="user.profile.name"/>
                <notNull name="user.profile.gender"/>
                <in name="user.profile.gender" value="male,female,other"/>
            </and>
        </if>
    </check>
</validator>
```

## 运行时转换示例

### 示例 1：简单条件

```xml
<check id="checkUsername">
    <notEmpty name="user.username"/>
</check>
```

**等价 Java 代码：**
```java
if (user.username != null && !user.username.isEmpty()) {
    // 校验通过
} else {
    throw new ValidationException("用户名不能为空");
}
```

### 示例 2：条件判断

```xml
<check id="checkPassword">
    <if test="user.password != null">
        <lengthBetween name="user.password" min="6" max="20"/>
    </if>
</check>
```

**等价 Java 代码：**
```java
if (user.password != null) {
    if (user.password.length() >= 6 && user.password.length() <= 20) {
        // 校验通过
    } else {
        throw new ValidationException("密码长度必须在6-20位之间");
    }
}
```

### 示例 3：组合条件

```xml
<check id="checkOrder">
    <and>
        <gt name="order.qty" value="0"/>
        <gt name="order.total" value="0"/>
    </and>
</check>
```

**等价 Java 代码：**
```java
if (order.qty > 0 && order.total > 0) {
    // 校验通过
} else {
    throw new ValidationException("订单数量和总额都必须大于0");
}
```

### 示例 4：复杂嵌套条件

```xml
<check id="checkVIP">
    <if test="order.level == 'VIP'">
        <and>
            <gt name="order.total" value="100000"/>
            <notNull name="order.vipCard"/>
        </and>
    </if>
</check>
```

**等价 Java 代码：**
```java
if (order.level.equals("VIP")) {
    if (order.total > 100000 && order.vipCard != null) {
        // 校验通过
    } else {
        throw new ValidationException("VIP订单必须大于100000且必须有VIP卡");
    }
}
```

## 完整支持能力总结

### ✅ 完全支持的高级校验功能

| 功能类型 | 支持情况 | 复杂度 |
|----------|----------|--------|
| **简单条件** | ✅ | ⭐ |
| **条件判断（if/else）** | ✅ | ⭐⭐ |
| **条件分支（if-elif-else）** | ✅ | ⭐⭐⭐ |
| **AND 组合** | ✅ | ⭐⭐ |
| **OR 组合** | ✅ | ⭐⭐ |
| **NOT 取反** | ✅ | ⭐⭐ |
| **多层嵌套** | ✅ | ⭐⭐⭐ |
| **条件分支（if-else）** | ✅ | ⭐⭐⭐ |
| **自定义表达式** | ✅ | ⭐⭐⭐ |
| **复杂逻辑组合** | ✅ | ⭐⭐⭐⭐ |

### 支持的复杂度等级

| 等级 | 复杂度 | 示例 |
|------|--------|------|
| ⭐ | 简单条件 | 单个字段验证 |
| ⭐⭐ | 条件判断 | if 判断后执行校验 |
| ⭐⭐⭐ | 组合条件 | AND/OR 组合多个条件 |
| ⭐⭐⭐ | 嵌套条件 | 条件中包含条件 |
| ⭐⭐⭐⭐ | 条件分支 | if-elif-else 分支逻辑 |
| ⭐⭐⭐⭐⭐ | 复杂逻辑 | 多层嵌套 + 分支 + 自定义表达式 |
| ⭐⭐⭐⭐⭐ | 业务规则 | 复杂的业务逻辑判断 |

## 实际应用场景

### 场景 1：订单金额验证

```xml
<validator>
    <check id="checkOrderAmount">
        <!-- 普通订单：总额必须>0 -->
        <if test="order.type == 'normal'">
            <gt name="order.amount" value="0"/>
        </if>
        <!-- 折扣订单：总额必须<原价 -->
        <elif test="order.type == 'discount'">
            <lt name="order.amount" value="order.originalPrice"/>
        </elif>
        <!-- 赠值订单：总额必须>0 -->
        <elif test="order.type == 'value'">
            <gt name="order.amount" value="0"/>
        </elif>
        <!-- 默认 -->
        <else>
            <eq name="order.amount" value="0"/>
        </else>
    </check>
</validator>
```

### 场景 2：用户权限验证

```xml
<validator>
    <check id="checkAdminPermission">
        <!-- 只有管理员可以删除用户 -->
        <and>
            <eq name="currentUser.role" value="admin"/>
            <or>
                <eq name="targetUser.role" value="guest"/>
                <eq name="targetUser.status" value="inactive"/>
            </or>
        </and>
    </check>
</validator>
```

### 场景 3：数据完整性验证

```xml
<validator>
    <check id="checkUserData">
        <!-- 用户数据完整性检查 -->
        <and>
            <notNull name="user.username"/>
            <notNull name="user.email"/>
            <notNull name="user.phone"/>
            <notNull name="user.realName"/>
        </and>
    </check>
    
    <check id="checkOptionalFields">
        <!-- 可选字段如果提供必须符合要求 -->
        <if test="user.nickname != null">
            <lengthBetween name="user.nickname" min="2" max="50"/>
        </if>
        <if test="user.avatar != null">
            <regex name="user.avatar" pattern="^https?://.*"/>
        </if>
    </check>
</validator>
```

## 编辑器提供的功能

### 1. 可视化编辑器特性

#### 条件树编辑器
- **可视化显示**：树形结构展示条件关系
- **拖拽操作**：拖拽节点调整顺序
- **添加/删除**：动态添加或删除条件节点
- **实时预览**：实时显示生成的 XML

#### 智能字段提示
- **模糊搜索**：输入"用户"自动匹配所有用户相关字段
- **中文别名**：支持"用户名"、"用户邮箱"等中文搜索
- **路径预览**：选择字段后显示完整路径和类型
- **分类显示**：按实体分类显示字段

#### 运算符推荐
- **类型感知**：根据字段类型推荐合适的运算符
- **语义提示**：显示每个运算符的用途说明
- **值类型匹配**：自动识别并匹配值类型

### 2. 实时校验功能

#### 表单级校验
- **必填项检查**：自动验证必需字段
- **类型检查**：验证值的类型是否正确
- **范围验证**：验证数值范围、字符串长度等
- **格式验证**：验证正则表达式格式

#### XML 级别校验
- **结构验证**：验证 XML 结构是否符合 Xdef 定义
- **属性验证**：验证所有必需属性是否存在
- **子元素验证**：验证所有必需子元素是否存在
- **引用验证**：验证所有引用是否正确解析

### 3. 导出功能

#### XML 生成
- **符合 Xdef 规范**：生成的 XML 完全符合指定的 Xdef 定义
- **格式化输出**：美化输出，提高可读性
- **注释保留**：保留原文件中的注释

#### 多格式支持
- **XML 格式**：标准 XML 格式
- **JSON 格式**：转换为 JSON 格式查看
- **树形结构**：可视化展示结构

## 技术实现要点

### 1. 解析器的关键功能

#### 依赖解析
- 自动解析 `xdef:ref` 引用
- 递归解析所有依赖的 Xdef 文件
- 缓存已解析的 Xdef 元数据

#### unknown-tag 处理
- 识别未在预定义列表中的标签
- 支持任意自定义标签（如 if/else/then）
- 标签体内容的解析和封装

#### 引用解析
- 解析 `xdef:bean-body-prop` 属性
- 识别 filter-bean 类型引用
- 加载并合并引用的 Xdef 文件

### 2. 表单生成的关键功能

#### 动态组件映射
- 根据 Xdef 定义自动生成表单组件
- 支持 filter-bean 类型的所有操作符
- 支持 unknown-tag 的动态标签

#### 类型感知
- 根据字段类型生成合适的输入组件
- 提供类型特定的配置选项
- 自动推断属性类型

#### 交互式编辑
- 拖拽式条件编辑
- 实时预览生成的 XML
- 智能提示和自动补全

### 3. 校验引擎的关键功能

#### 多级校验
- 结构校验：验证 XML 结构
- 类型校验：验证数据类型
- 语义校验：验证业务规则
- 实时反馈：立即显示错误信息

#### 错误处理
- 友好的错误提示
- 精确的错误定位
- 建议性的修复建议

## 总结

### ✅ 完全支持的高级校验功能

1. ✅ **条件判断（if/else）** - 支持单条件和多分支
2. ✅ **组合条件（AND/OR/NOT）** - 支持任意组合
3. ✅ **多层嵌套** - 支持任意深度的嵌套
4. **条件分支（if-elif-else）** - 支持多分支逻辑
5. **自定义表达式** - 支持自定义 JavaScript 表达式
6. **复杂逻辑组合** - 支持任意复杂的业务逻辑

### 🎯 核心能力

**当前设计能够：**

1. **解析任意 Xdef 文件**：包括有复杂依赖的 Xdef
2. **生成可视化表单**：根据 Xdef 定义自动生成对应的编辑界面
3. **智能提示**：字段路径、错误码、运算符等智能提示
4. **实时校验**：编辑过程中实时验证输入内容
5. **导出符合规则的 XML**：生成的 XML 完全符合 Xdef 定义

### 💡 实际应用价值

**这个设计使得：**

1. **开发效率**：无需手写复杂的 XML，通过可视化界面即可完成配置
2. **降低错误率**：智能提示和实时校验减少配置错误
3. **易于维护**：可视化的条件树结构清晰易懂
4. **业务灵活性**：支持任意复杂的业务逻辑校验

**真正实现了"零代码"的高级校验配置管理！**