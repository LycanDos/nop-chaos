# Nop Apidemo

Nop平台的Hoppscotch API客户端集成包，提供现代化的API测试和调试功能。

## 特性

- 🚀 **现代化API测试**：基于Vue 3和Element Plus构建
- 🔧 **环境变量管理**：支持多环境配置和变量替换
- 📚 **集合管理**：组织和管理API请求集合
- 🔒 **安全加密**：支持请求数据加密和签名
- 📊 **实时监控**：请求响应实时监控和统计
- 🎨 **美观界面**：现代化的用户界面设计

## 安装

```bash
# 在项目根目录安装依赖
pnpm install

# 构建包
pnpm build
```

## 使用方法

### 基本使用

```vue
<template>
  <div>
    <HoppscotchPanel :client="hoppscotchClient" />
  </div>
</template>

<script setup>
import { HoppscotchClient, HoppscotchPanel } from '@nop-chaos/nop-apidemo'

// 创建客户端实例
const hoppscotchClient = new HoppscotchClient({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  defaultHeaders: {
    'Content-Type': 'application/json'
  }
})
</script>
```

### 环境配置

```javascript
import { HoppscotchClient } from '@nop-chaos/nop-apidemo'

const client = new HoppscotchClient({
  environments: [
    {
      id: 'dev',
      name: '开发环境',
      variables: {
        baseUrl: 'https://dev-api.example.com',
        token: 'dev-token'
      },
      isDefault: true
    },
    {
      id: 'prod',
      name: '生产环境',
      variables: {
        baseUrl: 'https://api.example.com',
        token: 'prod-token'
      }
    }
  ]
})

// 切换环境
client.setEnvironment('prod')
```

### 事件监听

```javascript
// 监听请求事件
client.on('request', (event) => {
  console.log('发送请求:', event.data)
})

// 监听响应事件
client.on('response', (event) => {
  console.log('收到响应:', event.data)
})

// 监听错误事件
client.on('error', (event) => {
  console.error('请求错误:', event.data)
})
```

### 集合管理

```javascript
// 添加集合
const collection = {
  id: 'user-api',
  name: '用户API',
  description: '用户相关的API接口',
  requests: [
    {
      method: 'GET',
      url: '{{baseUrl}}/users',
      headers: {
        'Authorization': 'Bearer {{token}}'
      }
    }
  ],
  environments: [
    {
      id: 'dev',
      name: '开发环境',
      variables: {
        baseUrl: 'https://dev-api.example.com',
        token: 'dev-token'
      }
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

client.addCollection(collection)
```

## API 参考

### HoppscotchClient

#### 构造函数

```typescript
new HoppscotchClient(config?: HoppscotchConfig)
```

#### 方法

- `sendRequest(request: ApiRequest): Promise<ApiResponse>` - 发送API请求
- `setEnvironment(environmentId: string): void` - 设置当前环境
- `getCurrentEnvironment(): Environment | null` - 获取当前环境
- `addEnvironment(environment: Environment): void` - 添加环境
- `getEnvironments(): Environment[]` - 获取所有环境
- `addCollection(collection: Collection): void` - 添加集合
- `getCollections(): Collection[]` - 获取所有集合
- `getCollection(collectionId: string): Collection | undefined` - 获取指定集合
- `on(event: string, handler: Function): void` - 监听事件
- `off(event: string, handler: Function): void` - 移除事件监听
- `exportConfig(): HoppscotchConfig` - 导出配置
- `importConfig(config: HoppscotchConfig): void` - 导入配置

### HoppscotchPanel

#### Props

- `client?: HoppscotchClient` - Hoppscotch客户端实例

#### Events

- `request` - 发送请求时触发
- `response` - 收到响应时触发
- `error` - 发生错误时触发

## 类型定义

```typescript
interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  url: string
  headers?: Record<string, string>
  params?: Record<string, any>
  data?: any
  timeout?: number
}

interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: any
}

interface Environment {
  id: string
  name: string
  variables: Record<string, string>
  isDefault?: boolean
}

interface Collection {
  id: string
  name: string
  description?: string
  requests: ApiRequest[]
  environments?: Environment[]
  createdAt: Date
  updatedAt: Date
}
```

## 开发

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 预览
pnpm preview
```

## 许可证

MIT License
