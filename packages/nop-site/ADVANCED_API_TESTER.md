# 高级API测试工具使用说明

## 概述

本项目集成了高级API测试工具，支持REST、GraphQL等多种API类型，并提供预定义接口配置功能。

## 功能特性

### ✅ 核心功能
- **预定义接口**: 支持预先配置接口地址、参数、Headers等
- **多种API类型**: 支持REST、GraphQL、gRPC等
- **环境变量**: 支持环境变量替换和配置
- **接口集合**: 支持接口分组和管理
- **实时测试**: 实时发送请求并查看响应

### ✅ 界面特性
- **现代化界面**: 基于Element Plus的响应式设计
- **直观操作**: 下拉选择预定义接口，一键加载配置
- **实时反馈**: 加载状态、错误提示、响应格式化

## 预定义接口

### 1. REST API示例
- **用户列表**: `GET /users`
- **用户详情**: `GET /users/{id}`
- **创建用户**: `POST /users`

### 2. GraphQL示例
- **GitHub GraphQL**: 查询用户信息
- **自定义查询**: 支持复杂GraphQL查询

### 3. 自定义配置
您可以在 `AdvancedAPITester.vue` 中添加更多预定义接口：

```javascript
const predefinedApis = ref([
  {
    id: 'your-api',
    name: '您的API',
    method: 'POST',
    url: 'https://api.example.com/endpoint',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    data: JSON.stringify({
      // 您的请求体
    }, null, 2)
  }
])
```

## 使用方法

### 1. 访问页面
```
http://localhost:3000/#/sys/hoppscotch
```

### 2. 选择预定义接口
1. 从下拉菜单中选择预定义的接口
2. 系统自动加载接口配置（URL、Headers、Body等）
3. 根据需要修改参数

### 3. 发送请求
1. 确认或修改请求配置
2. 点击"发送请求"按钮
3. 查看响应结果

### 4. 查看响应
- **状态码**: HTTP状态码和状态文本
- **响应时间**: 请求耗时统计
- **响应内容**: 格式化的JSON响应

## 支持的API类型

### REST API
- **GET**: 获取数据
- **POST**: 创建数据
- **PUT**: 更新数据
- **DELETE**: 删除数据
- **PATCH**: 部分更新
- **HEAD**: 获取响应头
- **OPTIONS**: 获取支持的方法

### GraphQL
- **查询**: 获取数据
- **变更**: 修改数据
- **订阅**: 实时数据

### 示例GraphQL查询
```graphql
query {
  viewer {
    login
    name
    repositories(first: 10) {
      nodes {
        name
        description
      }
    }
  }
}
```

## 环境配置

### 环境变量
支持使用 `{{变量名}}` 格式的环境变量：

```javascript
// 环境配置
const environments = [
  {
    id: 'dev',
    name: '开发环境',
    variables: {
      baseUrl: 'https://api-dev.example.com',
      apiKey: 'dev-api-key'
    }
  },
  {
    id: 'prod',
    name: '生产环境',
    variables: {
      baseUrl: 'https://api.example.com',
      apiKey: 'prod-api-key'
    }
  }
]
```

### 变量使用
在URL或Headers中使用环境变量：
```
URL: {{baseUrl}}/users
Header: Authorization: Bearer {{apiKey}}
```

## 扩展功能

### 1. 接口集合管理
- 创建接口集合
- 组织相关接口
- 批量操作

### 2. 历史记录
- 保存请求历史
- 快速重发请求
- 响应对比

### 3. 团队协作
- 分享接口配置
- 权限管理
- 版本控制

## 技术实现

### 核心组件
- **AdvancedAPITester.vue**: 主要的API测试组件
- **axios**: HTTP客户端库
- **Element Plus**: UI组件库

### 功能模块
- **接口配置**: 预定义接口管理
- **请求发送**: 基于axios的HTTP请求
- **响应处理**: 自动格式化响应
- **环境管理**: 环境变量和配置

## 故障排除

### 常见问题

1. **跨域问题**
   - 确保目标API支持CORS
   - 配置代理服务器
   - 使用浏览器插件

2. **认证问题**
   - 检查API Key是否正确
   - 确认Token是否过期
   - 验证权限设置

3. **GraphQL错误**
   - 检查查询语法
   - 验证Schema
   - 确认字段存在

## 开发说明

### 文件结构
```
src/
├── components/
│   └── AdvancedAPITester.vue    # 高级API测试组件
├── views/sys/hoppscotch/
│   └── index.vue                # 页面容器
└── router/modules/
    └── hoppscotch.ts            # 路由配置
```

### 依赖项
- `axios`: HTTP请求
- `element-plus`: UI组件
- `vue`: 框架

## 更新日志

- **v2.0.0**: 高级版本
  - 预定义接口配置
  - GraphQL支持
  - 环境变量管理
  - 接口集合功能

- **v1.0.0**: 基础版本
  - 基本HTTP请求功能
  - 响应显示和格式化
  - 错误处理机制 