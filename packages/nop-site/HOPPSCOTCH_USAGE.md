# Hoppscotch API测试工具使用说明

## 概述

本项目已集成Hoppscotch开源项目的核心功能，提供API测试能力。

## 功能特性

### ✅ 基本功能
- **HTTP方法支持**: GET、POST、PUT、DELETE、PATCH、HEAD、OPTIONS
- **URL输入**: 支持完整的API URL输入
- **响应显示**: 实时显示响应状态码、响应时间和响应内容
- **错误处理**: 完善的错误提示和处理机制

### ✅ 界面特性
- **简洁界面**: 基于Element Plus的现代化界面
- **响应式设计**: 适配不同屏幕尺寸
- **实时反馈**: 加载状态和操作反馈

## 使用方法

### 1. 访问页面
```
http://localhost:3000/#/sys/hoppscotch
```

### 2. 发送请求
1. 选择HTTP方法（默认为GET）
2. 输入完整的API URL
3. 点击"发送"按钮或按回车键
4. 查看响应结果

### 3. 查看响应
- **状态码**: 显示HTTP状态码和状态文本
- **响应时间**: 显示请求耗时
- **响应内容**: 格式化显示响应数据

## 示例用法

### 测试GET请求
```
URL: https://jsonplaceholder.typicode.com/posts/1
方法: GET
```

### 测试POST请求
```
URL: https://jsonplaceholder.typicode.com/posts
方法: POST
```

## 技术实现

### 核心组件
- **HoppscotchAPI.vue**: 主要的API测试组件
- **axios**: HTTP客户端库
- **Element Plus**: UI组件库

### 功能模块
- **请求发送**: 基于axios的HTTP请求
- **响应处理**: 自动格式化JSON响应
- **错误处理**: 完善的异常捕获和提示

## 扩展功能

### 预定义接口
您可以在组件中添加预定义的接口配置：

```javascript
// 在HoppscotchAPI.vue中添加
const predefinedApis = [
  {
    name: '用户列表',
    url: 'https://api.example.com/users',
    method: 'GET'
  },
  {
    name: '创建用户',
    url: 'https://api.example.com/users',
    method: 'POST'
  }
]
```

### 环境变量
支持环境变量替换：

```javascript
// 支持 {{变量名}} 格式
const baseUrl = 'https://api.example.com'
const apiUrl = `${baseUrl}/users`
```

## 故障排除

### 常见问题

1. **跨域问题**
   - 确保目标API支持CORS
   - 或配置代理服务器

2. **网络错误**
   - 检查网络连接
   - 验证URL格式

3. **响应格式问题**
   - 确保API返回有效的JSON
   - 检查响应头Content-Type

## 开发说明

### 文件结构
```
src/
├── components/
│   └── HoppscotchAPI.vue    # API测试组件
├── views/sys/hoppscotch/
│   └── index.vue            # 页面容器
└── router/modules/
    └── hoppscotch.ts        # 路由配置
```

### 依赖项
- `axios`: HTTP请求
- `element-plus`: UI组件
- `vue`: 框架

## 更新日志

- **v1.0.0**: 初始版本
  - 基本HTTP请求功能
  - 响应显示和格式化
  - 错误处理机制 