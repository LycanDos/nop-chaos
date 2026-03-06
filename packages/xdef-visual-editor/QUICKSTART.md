# 快速启动指南

## 方法一：使用启动脚本（推荐）

```bash
# 在项目根目录执行
./start-dev.sh
```

## 方法二：手动启动

```bash
# 1. 进入 examples 目录
cd examples

# 2. 安装依赖（首次运行）
npm install

# 3. 启动开发服务器
npm run dev
```

## 访问地址

启动成功后，浏览器会自动打开：http://localhost:3000

如果没有自动打开，请手动访问：http://localhost:3000

## 功能说明

示例应用包含以下功能：

1. **加载示例** - 点击加载示例按钮，会加载预置的检查规则
2. **表单编辑** - 在表单编辑标签页中可视化编辑检查规则
3. **条件树** - 在条件树标签页中以树形结构编辑条件
4. **实时预览** - 右侧实时显示生成的 XML
5. **导出功能** - 支持导出 XML 或 JSON 格式

## 常见问题

### 404 错误

如果遇到 404 错误，请确保：

1. 在 `examples` 目录下运行
2. 已安装依赖：`npm install`
3. 使用正确的启动命令：`npm run dev`

### 端口被占用

如果 3000 端口被占用，可以修改 `examples/vite.config.ts` 中的端口号：

```typescript
server: {
  port: 3001,  // 修改为其他端口
  open: true
}
```

### 组件找不到

如果提示组件找不到，请确保：

1. 主项目已构建：在根目录执行 `npm run build`
2. 或者在 `examples/main.ts` 中直接导入组件（已配置）

## 示例数据

点击"加载示例"按钮会加载以下示例规则：

1. **用户名校验** - 检查用户名不能为空
2. **密码校验** - 检查密码长度在 6-20 位之间
3. **订单校验** - 检查订单数量和总额都必须大于 0

## 下一步

- 查看 [README.md](./README.md) 了解完整功能
- 查看 [docs/IMPLEMENTATION.md](./docs/IMPLEMENTATION.md) 了解实现细节
- 修改 `config/field-mapping-sample.yaml` 自定义字段映射