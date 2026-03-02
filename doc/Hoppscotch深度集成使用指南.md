# Hoppscotch深度集成使用指南

## 快速开始

### 1. 在BPMN中创建API Activity

1. 打开BPMN设计器
2. 拖拽一个**服务任务**(Service Task)到画布
3. 将任务命名为包含"API"或"HTTP"的名称,例如:
   - "HTTP请求"
   - "API调用"
   - "获取用户信息API"

### 2. 配置API Activity

1. 按住 **Ctrl键**(Mac用户按住⌘键)
2. 点击刚创建的服务任务
3. 系统会自动打开**API Activity编辑器**

### 3. 编辑API请求

在编辑器中配置:

#### 基本信息
- **活动名称**: 给API活动起个名字
- **描述**: 简要说明这个API的用途
- **类型**: 选择HTTP/GraphQL/gRPC

#### 请求配置
- **请求方法**: GET/POST/PUT/DELETE等
- **请求URL**: 完整的API地址
- **请求头**: 点击"添加Header"添加请求头
  - 例如: `Authorization: Bearer token123`
  - 例如: `Content-Type: application/json`
- **查询参数**: 点击"添加参数"添加URL参数
  - 例如: `page=1`, `limit=10`
- **请求体**: 选择类型并输入数据
  - JSON: `{"name": "张三", "age": 25}`
  - Form Data: 键值对形式

#### 认证配置
- **None**: 无需认证
- **Basic Auth**: 输入用户名和密码
- **Bearer Token**: 输入Token
- **API Key**: 输入Key和Value,选择添加位置(Header或Query)

### 4. 测试API

1. 点击**"测试请求"**按钮
2. 系统会发送真实的HTTP请求
3. 查看测试结果:
   - 状态码(200表示成功)
   - 响应时间
   - 响应头
   - 响应体

### 5. 保存配置

点击**"保存"**按钮,系统会:
- 保存API配置到后端
- 将API Activity ID关联到BPMN元素
- 下次打开会自动加载配置

---

## 高级功能

### 在Hoppscotch中打开

1. 点击**"在Hoppscotch中打开"**按钮
2. 系统会生成Hoppscotch分享链接
3. 自动在新标签页打开Hoppscotch
4. 可以在Hoppscotch中进一步编辑和测试

**分享链接格式**: `https://hoppscotch.io/r/xxxxx`

### 导出Curl命令

1. 点击**"复制Curl"**按钮
2. 系统会生成标准的Curl命令
3. 命令已复制到剪贴板
4. 可以直接在终端中执行

**示例**:
```bash
curl -X GET 'https://api.example.com/users' \
  -H 'Authorization: Bearer xxx' \
  -H 'Content-Type: application/json'
```

### 从Hoppscotch导入

1. 在Hoppscotch中创建请求
2. 生成分享链接
3. 调用后端导入接口:
```bash
POST /api/bpmn/activity/import-from-hoppscotch
{
  "shareLink": "https://hoppscotch.io/r/xxxxx"
}
```

---

## 集合管理

### 创建集合

1. 在HoppscotchPanel中切换到**"集合"**标签
2. 点击**"新建集合"**按钮
3. 输入集合名称
4. 点击确认

### 保存请求到集合

1. 在请求面板配置好请求
2. 点击**"保存到集合"**按钮
3. 输入集合名称(新建或选择已有)
4. 请求会保存到集合中

### 从集合加载请求

1. 切换到**"集合"**标签
2. 点击集合的**"查看"**按钮
3. 点击列表中的请求
4. 请求会自动加载到请求面板

---

## 环境管理

### 创建环境

1. 切换到**"环境"**标签
2. 点击**"新建环境"**按钮
3. 输入环境名称(如"开发环境"、"生产环境")

### 使用环境变量

在URL或Headers中使用变量:
```
URL: {{baseUrl}}/api/users
Header: Authorization: Bearer {{token}}
```

### 切换环境

1. 在环境列表中点击**"切换"**按钮
2. 系统会自动替换所有环境变量

---

## API端点说明

### 获取所有API活动
```
GET /api/bpmn/activities
```

### 获取单个API活动
```
GET /api/bpmn/activity/{id}
```

### 创建API活动
```
POST /api/bpmn/activity
Content-Type: application/json

{
  "name": "获取用户列表",
  "type": "http",
  "request": {
    "method": "GET",
    "url": "https://api.example.com/users",
    "headers": [
      {"key": "Authorization", "value": "Bearer xxx", "enabled": true}
    ]
  }
}
```

### 更新API活动
```
PUT /api/bpmn/activity/{id}
Content-Type: application/json

{同创建}
```

### 删除API活动
```
DELETE /api/bpmn/activity/{id}
```

### 生成Hoppscotch分享链接
```
GET /api/bpmn/activity/{id}/share-link

响应:
{
  "success": true,
  "data": {
    "shareLink": "https://hoppscotch.io/r/xxxxx"
  }
}
```

### 导出Curl命令
```
GET /api/bpmn/activity/{id}/curl

响应:
{
  "success": true,
  "data": {
    "curl": "curl -X GET ..."
  }
}
```

### 测试API请求
```
POST /api/bpmn/activity/{id}/test

响应:
{
  "success": true,
  "data": {
    "status": 200,
    "statusText": "OK",
    "headers": {...},
    "body": "...",
    "responseTime": 123
  }
}
```

### 从Hoppscotch导入
```
POST /api/bpmn/activity/import-from-hoppscotch
Content-Type: application/json

{
  "shareLink": "https://hoppscotch.io/r/xxxxx"
}

响应:
{
  "success": true,
  "data": {
    "id": "新创建的API Activity ID"
  }
}
```

---

## 常见问题

### Q: 如何识别哪些BPMN元素是API Activity?
A: 服务任务名称包含"API"或"HTTP",或者扩展元素中包含`apiActivityId`。

### Q: API Activity数据存储在哪里?
A: 当前存储在内存中(ConcurrentHashMap),生产环境建议使用数据库。

### Q: 如何在BPMN中查看API Activity的配置?
A: 按住Ctrl键点击服务任务,会打开编辑器显示完整配置。

### Q: 集合和环境数据存储在哪里?
A: 存储在浏览器的LocalStorage中,清除浏览器数据会丢失。

### Q: 支持哪些认证方式?
A: 支持None、Basic Auth、Bearer Token、API Key、OAuth2(预留)。

### Q: 可以导出整个集合吗?
A: 当前版本支持单个请求导出,集合导出功能可在后续版本添加。

---

## 技巧和最佳实践

### 1. 命名规范
- API Activity名称要清晰描述功能
- 集合名称按模块或功能分组
- 环境名称明确标识环境类型

### 2. 使用环境变量
- 将baseUrl、token等提取为环境变量
- 不同环境使用不同的变量值
- 避免在请求中硬编码敏感信息

### 3. 组织集合
- 按功能模块创建不同集合
- 相关的API放在同一集合
- 定期清理不用的请求

### 4. 测试流程
- 先在编辑器中测试单个请求
- 确认无误后保存到集合
- 在BPMN流程中引用

### 5. 分享和协作
- 使用Hoppscotch分享链接分享API配置
- 团队成员可以导入链接快速复用
- Curl命令方便在终端中调试

---

## 下一步

- 探索更多认证方式
- 尝试GraphQL请求
- 使用预请求脚本和后请求测试
- 集成到完整的BPMN流程中

祝使用愉快! 🚀
