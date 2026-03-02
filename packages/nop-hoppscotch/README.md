# NopHoppscotch 集成包

用于将 Hoppscotch API 测试工具集成到 NOP-CHAOS 项目的 Vue 组件库。

## 功能特性

- ✅ 通过 iframe 嵌入 Hoppscotch
- ✅ 使用 postMessage 进行双向通信
- ✅ API 请求配置编辑
- ✅ Curl 命令生成
- ✅ Hoppscotch 分享链接生成
- ✅ 请求测试功能
- ✅ 配置文件导入/导出

## 安装

```bash
npm install @nop-chaos/nop-hoppscotch
```

## 使用方式

### 1. 基础嵌入组件

```vue
<template>
  <HoppscotchEmbed
    ref="hoppscotchRef"
    hoppscotch-url="http://localhost:3000"
    :initial-config="initialConfig"
    @ready="handleReady"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { HoppscotchEmbed } from '@nop-chaos/nop-hoppscotch'
import type { ApiRequestConfig } from '@nop-chaos/nop-hoppscotch'

const hoppscotchRef = ref()
const initialConfig: Partial<ApiRequestConfig> = {
  name: '用户API',
  method: 'GET',
  url: 'https://api.example.com/users',
  headers: [
    { key: 'Content-Type', value: 'application/json', enabled: true }
  ]
}

const handleReady = () => {
  console.log('Hoppscotch 已就绪')
}

const handleError = (error: string) => {
  console.error('Hoppscotch 错误:', error)
}
</script>
```

### 2. 完整配置编辑器

```vue
<template>
  <HoppscotchConfigEditor
    v-model="apiConfig"
    hoppscotch-url="http://localhost:3000"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { HoppscotchConfigEditor } from '@nop-chaos/nop-hoppscotch'
import type { ApiRequestConfig } from '@nop-chaos/nop-hoppscotch'

const apiConfig = ref<ApiRequestConfig>({
  id: 'api-001',
  name: '用户信息API',
  method: 'GET',
  url: 'https://api.example.com/users/1',
  headers: [],
  queryParams: [],
  body: { type: 'none' }
})

const handleSave = (config: ApiRequestConfig) => {
  console.log('保存配置:', config)
  // 保存到后端或本地存储
}
</script>
```

### 3. 使用 Composable

```typescript
import { useHoppscotchBridge } from '@nop-chaos/nop-hoppscotch'

const bridge = useHoppscotchBridge('http://localhost:3000')

// 初始化
await bridge.init({ method: 'GET', url: 'https://api.example.com' })

// 获取配置
const config = await bridge.getConfig()

// 更新配置
await bridge.updateConfig(config)

// 获取 Curl 命令
const curl = await bridge.getCurl()

// 获取分享链接
const shareUrl = await bridge.getShareUrl()

// 测试请求
const result = await bridge.testRequest()
```

### 4. 工具函数

```typescript
import {
  generateCurlCommand,
  parseCurlCommand,
  generateHoppscotchShareUrl,
  parseHoppscotchShareUrl
} from '@nop-chaos/nop-hoppscotch'

// 生成 Curl 命令
const curl = generateCurlCommand(config)

// 解析 Curl 命令
const config = parseCurlCommand(curl)

// 生成分享链接
const shareUrl = generateHoppscotchShareUrl(config)

// 解析分享链接
const config = parseHoppscotchShareUrl(shareUrl)
```

### 5. 配置服务

```typescript
import { apiConfigService } from '@nop-chaos/nop-hoppscotch'

// 保存配置
await apiConfigService.saveConfig(config)

// 获取所有配置
const configs = await apiConfigService.getAllConfigs()

// 获取单个配置
const config = await apiConfigService.getConfig('api-001')

// 删除配置
await apiConfigService.deleteConfig('api-001')

// 导出配置
const json = apiConfigService.exportConfig(config)

// 导入配置
const config = apiConfigService.importConfig(json)
```

## 配置 Hoppscotch

### 1. 本地部署 Hoppscotch

```bash
cd /path/to/Hoppscotch
pnpm install
pnpm dev
```

### 2. 启用 NOP 集成

在 Hoppscotch 项目中：

1. 复制环境变量配置：
```bash
cp .env.nop-integration.example .env
```

2. 修改 `.env` 文件：
```env
VITE_ENABLE_NOP_INTEGRATION=true
VITE_NOP_ALLOWED_ORIGINS=http://localhost:5173
```

3. 在 `src/main.ts` 中添加集成代码：
```typescript
if (import.meta.env.VITE_ENABLE_NOP_INTEGRATION === 'true') {
  import('./nop-integration')
}
```

## 类型定义

```typescript
interface ApiRequestConfig {
  id?: string
  name: string
  description?: string
  method: HttpMethod
  url: string
  headers: HeaderItem[]
  queryParams: QueryParam[]
  body?: BodyConfig
  auth?: AuthConfig
  timeout?: number
  followRedirects?: boolean
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

interface HeaderItem {
  key: string
  value: string
  enabled: boolean
  description?: string
}

interface QueryParam {
  key: string
  value: string
  enabled: boolean
  description?: string
}
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 预览
npm run preview
```

## 注意事项

1. **安全性**：生产环境必须配置 `VITE_NOP_ALLOWED_ORIGINS`
2. **跨域**：确保 Hoppscotch 和 NOP-CHAOS 允许跨域通信
3. **版本兼容**：保持与 Hoppscotch 官方版本的兼容性

## 许可证

MIT