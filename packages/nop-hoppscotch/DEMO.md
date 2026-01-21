# Hoppscotch Demo 访问指南

## 启动开发服务器

在 `nop-hoppscotch` 目录下运行：

```bash
pnpm run dev
```

## 访问Demo界面

启动成功后，会自动打开浏览器访问：

**http://localhost:3001**

## Demo功能说明

### 1. 请求面板
- 支持所有HTTP方法（GET、POST、PUT、DELETE等）
- 可以设置请求URL、Headers、Query参数和Body
- 实时显示响应结果和响应时间

### 2. 环境管理
- 预设了开发环境和生产环境
- 支持环境变量替换（使用 `{{变量名}}` 格式）
- 可以动态切换环境

### 3. 集合管理
- 可以保存和组织API请求
- 支持请求的导入导出

### 4. 测试API
Demo中预设了一些测试API：
- **JSONPlaceholder**: `https://jsonplaceholder.typicode.com`
- **示例请求**: `GET /posts/1`

## 快速测试

1. 在URL输入框中输入：`https://jsonplaceholder.typicode.com/posts/1`
2. 选择GET方法
3. 点击"发送请求"
4. 查看响应结果

## 环境变量使用

在URL或Headers中使用 `{{变量名}}` 格式：

```
URL: {{baseUrl}}/users
Header: Authorization: Bearer {{apiKey}}
```

## 故障排除

如果遇到问题：

1. **端口被占用**: 修改 `vite.config.ts` 中的端口号
2. **依赖问题**: 运行 `pnpm install` 重新安装依赖
3. **TypeScript错误**: 运行 `pnpm run build` 检查构建错误

## 开发模式

开发模式下支持：
- 热重载
- 源码映射
- 实时错误提示
- 浏览器开发者工具调试 