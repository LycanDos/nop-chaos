

# Hoppscotch深度集成NOP-CHAOS技术实现方案

## 一、总体架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      NOP-CHAOS 前端                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ BPMN Designer│  │ Hoppscotch  │  │ API Activity Editor │ │
│  │   (现有)    │  │   Panel     │  │    (新增)           │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                   │             │
│         └────────────────┼───────────────────┘             │
│                          ↓                                  │
│                  API Request Manager                        │
│                          ↓                                  │
└──────────────────────────┼──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   NOP-CHAOS 后端                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │API Endpoint │  │ Hoppscotch  │  │ Storage Service     │ │
│  │Controller   │  │ Service     │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                   │             │
│         └────────────────┼───────────────────┘             │
│                          ↓                                  │
│                  API Request Repository                     │
│                          ↓                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
              ┌────────────────────────┐
              │   Hoppscotch 服务      │
              │   (本地部署)           │
              │   https://localhost   │
              └────────────────────────┘
```

## 二、数据格式规范

### 2.1 API Activity 数据模型

```typescript
// src/types/api-activity.ts
export interface ApiActivity {
  id: string                          // 唯一标识 (UUID)
  name: string                        // 活动名称
  description?: string                // 描述
  type: 'http' | 'graphql' | 'grpc'  // 请求类型
  version: string                     // 版本号
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string

  // 请求配置
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
    url: string
    headers: Header[]
    queryParams: Param[]
    body?: BodyConfig
    auth?: AuthConfig
    timeout?: number
    followRedirects?: boolean
  }

  // 预请求脚本
  preRequestScript?: string

  // 后请求测试
  postRequestTest?: string

  // 环境变量
  environmentVariables?: Record<string, string>

  // 示例响应（用于文档）
  exampleResponse?: any

  // 标签
  tags?: string[]
}

export interface Header {
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface Param {
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface BodyConfig {
  type: 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'graphql'
  contentType?: string
  rawData?: string
  formData?: FormDataItem[]
  graphqlQuery?: string
  graphqlVariables?: string
}

export interface FormDataItem {
  key: string
  value: string
  type: 'text' | 'file'
  enabled: boolean
  description?: string
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'api-key'
  basic?: { username: string; password: string }
  bearer?: { token: string; prefix?: string }
  oauth2?: OAuth2Config
  apiKey?: { key: string; value: string; addTo: 'header' | 'query-param' }
}

export interface OAuth2Config {
  grantType: 'authorization-code' | 'password' | 'client-credentials' | 'refresh-token'
  clientId: string
  clientSecret: string
  callbackUrl: string
  authUrl: string
  accessTokenUrl: string
  scope?: string
  state?: string
}

// Hoppscotch分享链接数据格式
export interface HoppscotchShareData {
  v: number                    // 格式版本
  t: 'req' | 'coll'           // 类型：request 或 collection
  d: {
    name?: string
    request: ApiActivity['request']
  }
}
```

### 2.2 Hoppscotch 分享链接格式

```
格式: https://hoppscotch.io/r/{base64-encoded-json}
示例: https://hoppscotch.io/r/u2Fk1QnynNoqd

{base64-encoded-json} 结构:
- 使用 Base64 URL-safe 编码
- 压缩后的 JSON 数据
- 包含请求的所有必要信息
```

## 三、后端实现方案

### 3.1 Spring Boot Controller

```java
// src/main/java/com/lycan/ldemo/controller/ApiActivityController.java
package com.lycan.ldemo.controller;

import cn.hutool.core.util.IdUtil;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/bpmn")
public class ApiActivityController {

    @Resource
    private ApiActivityService apiActivityService;

    /**
     * 获取所有API活动列表
     */
    @GetMapping("/activities")
    public Map<String, Object> getActivities() {
        log.info("获取API活动列表");
        return Map.of(
            "success", true,
            "data", apiActivityService.getAllActivities()
        );
    }

    /**
     * 根据ID获取API活动详情
     */
    @GetMapping("/activity/{id}")
    public Map<String, Object> getActivity(@PathVariable String id) {
        log.info("获取API活动详情: {}", id);
        return Map.of(
            "success", true,
            "data", apiActivityService.getActivityById(id)
        );
    }

    /**
     * 创建API活动
     */
    @PostMapping("/activity")
    public Map<String, Object> createActivity(@RequestBody ApiActivityDto dto) {
        log.info("创建API活动: {}", dto.getName());
        String id = apiActivityService.createActivity(dto);
        return Map.of(
            "success", true,
            "data", Map.of("id", id)
        );
    }

    /**
     * 更新API活动
     */
    @PutMapping("/activity/{id}")
    public Map<String, Object> updateActivity(
        @PathVariable String id,
        @RequestBody ApiActivityDto dto
    ) {
        log.info("更新API活动: {}", id);
        apiActivityService.updateActivity(id, dto);
        return Map.of("success", true);
    }

    /**
     * 删除API活动
     */
    @DeleteMapping("/activity/{id}")
    public Map<String, Object> deleteActivity(@PathVariable String id) {
        log.info("删除API活动: {}", id);
        apiActivityService.deleteActivity(id);
        return Map.of("success", true);
    }

    /**
     * 生成Hoppscotch分享链接
     */
    @GetMapping("/activity/{id}/share-link")
    public Map<String, Object> generateShareLink(@PathVariable String id) {
        log.info("生成分享链接: {}", id);
        String link = apiActivityService.generateHoppscotchShareLink(id);
        return Map.of(
            "success", true,
            "data", Map.of("shareLink", link)
        );
    }

    /**
     * 从Hoppscotch分享链接导入
     */
    @PostMapping("/activity/import-from-hoppscotch")
    public Map<String, Object> importFromHoppscotch(@RequestBody Map<String, String> body) {
        String shareLink = body.get("shareLink");
        log.info("从Hoppscotch导入: {}", shareLink);
        String id = apiActivityService.importFromHoppscotch(shareLink);
        return Map.of(
            "success", true,
            "data", Map.of("id", id)
        );
    }

    /**
     * 导出为Curl命令
     */
    @GetMapping("/activity/{id}/curl")
    public Map<String, Object> exportCurl(@PathVariable String id) {
        log.info("导出Curl: {}", id);
        String curl = apiActivityService.generateCurlCommand(id);
        return Map.of(
            "success", true,
            "data", Map.of("curl", curl)
        );
    }

    /**
     * 执行API请求（测试）
     */
    @PostMapping("/activity/{id}/test")
    public Map<String, Object> testRequest(@PathVariable String id) {
        log.info("测试API请求: {}", id);
        Map<String, Object> result = apiActivityService.executeRequest(id);
        return Map.of(
            "success", true,
            "data", result
        );
    }
}
```

### 3.2 Service层实现

```java
// src/main/java/com/lycan/ldemo/service/ApiActivityService.java
package com.lycan.ldemo.service;

import cn.hutool.core.codec.Base64;
import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class ApiActivityService {

    // 使用内存存储（生产环境应使用数据库）
    private final Map<String, ApiActivity> activityStore = new ConcurrentHashMap<>();

    /**
     * 生成Hoppscotch分享链接
     */
    public String generateHoppscotchShareLink(String activityId) {
        ApiActivity activity = activityStore.get(activityId);
        if (activity == null) {
            throw new RuntimeException("Activity not found: " + activityId);
        }

        // 构建Hoppscotch分享数据格式
        Map<String, Object> shareData = new HashMap<>();
        shareData.put("v", 1);
        shareData.put("t", "req");

        Map<String, Object> data = new HashMap<>();
        data.put("name", activity.getName());
        data.put("request", activity.getRequest());
        shareData.put("d", data);

        // 转为JSON并Base64编码
        String json = JSONUtil.toJsonStr(shareData);
        String encoded = Base64.encodeUrlSafe(json.getBytes(StandardCharsets.UTF_8));

        // 生成分享链接
        return "https://hoppscotch.io/r/" + encoded;
    }

    /**
     * 从Hoppscotch分享链接导入
     */
    public String importFromHoppscotch(String shareLink) {
        try {
            // 提取Base64编码部分
            String encoded = shareLink.substring(shareLink.lastIndexOf('/') + 1);

            // Base64解码
            String json = Base64.decodeStr(encoded, StandardCharsets.UTF_8);
            JSONObject shareData = JSONUtil.parseObj(json);

            // 解析数据
            JSONObject data = shareData.getJSONObject("d");
            ApiActivity activity = new ApiActivity();
            activity.setId(IdUtil.simpleUUID());
            activity.setName(data.getStr("name", "Imported from Hoppscotch"));
            activity.setRequest(data.getBean("request", ApiActivity.Request.class));
            activity.setCreatedAt(new Date());
            activity.setUpdatedAt(new Date());

            // 保存
            activityStore.put(activity.getId(), activity);

            return activity.getId();
        } catch (Exception e) {
            log.error("导入Hoppscotch数据失败", e);
            throw new RuntimeException("Failed to import from Hoppscotch", e);
        }
    }

    /**
     * 生成Curl命令
     */
    public String generateCurlCommand(String activityId) {
        ApiActivity activity = activityStore.get(activityId);
        if (activity == null) {
            throw new RuntimeException("Activity not found: " + activityId);
        }

        StringBuilder curl = new StringBuilder();
        curl.append("curl -X ").append(activity.getRequest().getMethod());
        curl.append(" '").append(activity.getRequest().getUrl()).append("'");

        // 添加Headers
        for (ApiActivity.Header header : activity.getRequest().getHeaders()) {
            if (header.isEnabled()) {
                curl.append(" \\\n  -H '").append(header.getKey())
                    .append(": ").append(header.getValue()).append("'");
            }
        }

        // 添加Body
        if (activity.getRequest().getBody() != null) {
            ApiActivity.BodyConfig body = activity.getRequest().getBody();
            if (StrUtil.isNotBlank(body.getRawData())) {
                curl.append(" \\\n  -d '").append(body.getRawData()).append("'");
            }
        }

        return curl.toString();
    }

    /**
     * 执行API请求
     */
    public Map<String, Object> executeRequest(String activityId) {
        ApiActivity activity = activityStore.get(activityId);
        if (activity == null) {
            throw new RuntimeException("Activity not found: " + activityId);
        }

        ApiActivity.Request request = activity.getRequest();
        HttpRequest httpRequest = new HttpRequest(request.getUrl())
            .method(cn.hutool.http.Method.valueOf(request.getMethod()));

        // 添加Headers
        for (ApiActivity.Header header : request.getHeaders()) {
            if (header.isEnabled()) {
                httpRequest.header(header.getKey(), header.getValue());
            }
        }

        // 添加Body
        if (request.getBody() != null && StrUtil.isNotBlank(request.getBody().getRawData())) {
            httpRequest.body(request.getBody().getRawData());
        }

        // 执行请求
        HttpResponse response = httpRequest.execute();

        Map<String, Object> result = new HashMap<>();
        result.put("status", response.getStatus());
        result.put("statusText", response.getStatus());
        result.put("headers", response.headers());
        result.put("body", response.body());
        result.put("responseTime", response.getTime());

        return result;
    }

    // 其他CRUD方法...
}
```

## 四、前端实现方案

### 4.1 API Activity 编辑器组件

```vue
<!-- src/components/ApiActivityEditor.vue -->
<template>
  <div class="api-activity-editor">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑API活动' : '新建API活动' }}</span>
          <div class="header-actions">
            <el-button @click="testRequest" :loading="testing">
              <el-icon><VideoPlay /></el-icon> 测试请求
            </el-button>
            <el-button @click="generateCurl">
              <el-icon><DocumentCopy /></el-icon> 复制Curl
            </el-button>
            <el-button @click="openInHoppscotch" type="primary">
              <el-icon><Link /></el-icon> 在Hoppscotch中打开
            </el-button>
            <el-button @click="save" type="success">
              <el-icon><Check /></el-icon> 保存
            </el-button>
          </div>
        </div>
      </template>

      <el-form :model="formData" label-width="100px">
        <!-- 基本信息 -->
        <el-form-item label="活动名称">
          <el-input v-model="formData.name" placeholder="请输入活动名称" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="2"
            placeholder="请输入描述"
          />
        </el-form-item>

        <!-- 请求配置 -->
        <el-divider content-position="left">请求配置</el-divider>

        <el-form-item label="请求方法">
          <el-select v-model="formData.request.method">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="DELETE" value="DELETE" />
            <el-option label="PATCH" value="PATCH" />
          </el-select>
        </el-form-item>

        <el-form-item label="请求URL">
          <el-input v-model="formData.request.url" placeholder="https://api.example.com/endpoint" />
        </el-form-item>

        <!-- Headers -->
        <el-form-item label="请求头">
          <div class="key-value-editor">
            <div v-for="(header, index) in formData.request.headers" :key="index" class="kv-row">
              <el-input v-model="header.key" placeholder="Key" style="width: 30%" />
              <el-input v-model="header.value" placeholder="Value" style="width: 50%" />
              <el-switch v-model="header.enabled" />
              <el-button type="danger" @click="removeHeader(index)" :icon="Delete" />
            </div>
            <el-button @click="addHeader" type="primary" size="small">添加Header</el-button>
          </div>
        </el-form-item>

        <!-- Query Params -->
        <el-form-item label="查询参数">
          <div class="key-value-editor">
            <div v-for="(param, index) in formData.request.queryParams" :key="index" class="kv-row">
              <el-input v-model="param.key" placeholder="Key" style="width: 30%" />
              <el-input v-model="param.value" placeholder="Value" style="width: 50%" />
              <el-switch v-model="param.enabled" />
              <el-button type="danger" @click="removeQueryParam(index)" :icon="Delete" />
            </div>
            <el-button @click="addQueryParam" type="primary" size="small">添加参数</el-button>
          </div>
        </el-form-item>

        <!-- Body -->
        <el-form-item label="请求体">
          <el-select v-model="formData.request.body.type" style="width: 200px; margin-right: 10px">
            <el-option label="None" value="none" />
            <el-option label="JSON" value="raw" />
            <el-option label="Form Data" value="form-data" />
            <el-option label="GraphQL" value="graphql" />
          </el-select>
          <el-input
            v-if="formData.request.body.type === 'raw'"
            v-model="formData.request.body.rawData"
            type="textarea"
            :rows="8"
            placeholder='{"key": "value"}'
          />
        </el-form-item>

        <!-- 认证 -->
        <el-form-item label="认证方式">
          <el-select v-model="formData.request.auth.type" style="width: 200px">
            <el-option label="None" value="none" />
            <el-option label="Basic Auth" value="basic" />
            <el-option label="Bearer Token" value="bearer" />
            <el-option label="API Key" value="api-key" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="formData.request.auth.type === 'bearer'" label="Token">
          <el-input v-model="formData.request.auth.bearer.token" placeholder="Bearer token" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 测试结果对话框 -->
    <el-dialog v-model="showTestResult" title="测试结果" width="80%">
      <div v-if="testResult">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="状态码">
            <el-tag :type="testResult.status < 400 ? 'success' : 'danger'">
              {{ testResult.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="响应时间">
            {{ testResult.responseTime }}ms
          </el-descriptions-item>
        </el-descriptions>

        <el-divider>响应体</el-divider>
        <pre class="response-body">{{ formatResponse(testResult.body) }}</pre>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoPlay, DocumentCopy, Link, Check, Delete } from '@element-plus/icons-vue'
import type { ApiActivity } from '../types/api-activity'

const props = defineProps<{
  activityId?: string
}>()

const isEdit = ref(!!props.activityId)
const testing = ref(false)
const showTestResult = ref(false)
const testResult = ref<any>(null)

const formData = reactive<ApiActivity>({
  id: '',
  name: '',
  description: '',
  type: 'http',
  version: '1.0.0',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: '',
  updatedBy: '',
  request: {
    method: 'GET',
    url: '',
    headers: [],
    queryParams: [],
    body: {
      type: 'none',
      rawData: ''
    },
    auth: {
      type: 'none'
    }
  }
})

// 添加Header
const addHeader = () => {
  formData.request.headers.push({
    key: '',
    value: '',
    enabled: true
  })
}

// 删除Header
const removeHeader = (index: number) => {
  formData.request.headers.splice(index, 1)
}

// 添加Query参数
const addQueryParam = () => {
  formData.request.queryParams.push({
    key: '',
    value: '',
    enabled: true
  })
}

// 删除Query参数
const removeQueryParam = (index: number) => {
  formData.request.queryParams.splice(index, 1)
}

// 测试请求
const testRequest = async () => {
  testing.value = true
  try {
    const response = await fetch('/api/bpmn/activity/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: formData.id })
    })
    const result = await response.json()
    if (result.success) {
      testResult.value = result.data
      showTestResult.value = true
    }
  } catch (error) {
    ElMessage.error('测试失败')
  } finally {
    testing.value = false
  }
}

// 生成Curl命令
const generateCurl = async () => {
  try {
    const response = await fetch(`/api/bpmn/activity/${formData.id}/curl`)
    const result = await response.json()
    if (result.success) {
      navigator.clipboard.writeText(result.data.curl)
      ElMessage.success('Curl命令已复制到剪贴板')
    }
  } catch (error) {
    ElMessage.error('生成Curl失败')
  }
}

// 在Hoppscotch中打开
const openInHoppscotch = async () => {
  try {
    const response = await fetch(`/api/bpmn/activity/${formData.id}/share-link`)
    const result = await response.json()
    if (result.success) {
      window.open(result.data.shareLink, '_blank')
    }
  } catch (error) {
    ElMessage.error('生成分享链接失败')
  }
}

// 保存
const save = async () => {
  try {
    const url = props.activityId
      ? `/api/bpmn/activity/${props.activityId}`
      : '/api/bpmn/activity'
    const method = props.activityId ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    const result = await response.json()
    if (result.success) {
      ElMessage.success('保存成功')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

// 格式化响应
const formatResponse = (body: string) => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

// 加载数据
onMounted(async () => {
  if (props.activityId) {
    const response = await fetch(`/api/bpmn/activity/${props.activityId}`)
    const result = await response.json()
    if (result.success) {
      Object.assign(formData, result.data)
    }
  }
})
</script>

<style scoped>
.api-activity-editor {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.key-value-editor {
  width: 100%;
}

.kv-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.response-body {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  max-height: 400px;
  overflow: auto;
}
</style>
```

### 4.2 BPMN集成 - 在流程节点中显示API配置

在 `BpmnDesigner.vue` 中添加API Activity的渲染：

```typescript
// 在BpmnDesigner.vue中添加
const isApiActivity = (element: any) => {
  const businessObject = element.businessObject;
  if (!businessObject) return false;

  // 检查是否为服务任务且名称包含API或HTTP
  if (element.type === 'bpmn:ServiceTask') {
    const name = businessObject.name?.toLowerCase() || '';
    return name.includes('api') || name.includes('http');
  }

  // 检查扩展元素
  if (businessObject.extensionElements) {
    return businessObject.extensionElements.values.some((ext: any) => {
      if (ext.$type === 'bpmn:Documentation' && ext.text) {
        return ext.text.startsWith('apiActivityId:');
      }
      return false;
    });
  }

  return false;
};

// 打开API Activity编辑器
const openApiActivityEditor = async (element: any) => {
  const apiActivityId = getApiActivityId(element);

  // 打开对话框或新窗口
  window.open(`/api-activity-editor?id=${apiActivityId}`, '_blank');
};

// 获取API Activity ID
const getApiActivityId = (element: any) => {
  const businessObject = element.businessObject;
  if (businessObject && businessObject.extensionElements) {
    const doc = businessObject.extensionElements.values.find((ext: any) =>
      ext.$type === 'bpmn:Documentation' && ext.text?.startsWith('apiActivityId:')
    );
    if (doc) {
      return doc.text.replace('apiActivityId:', '').trim();
    }
  }
  return null;
};
```

## 五、使用流程

### 5.1 创建API Activity

1. 在BPMN设计器中拖拽一个服务任务
2. 设置任务名称为"HTTP请求"或"API调用"
3. 按住Ctrl键点击任务，打开API Activity编辑器
4. 配置请求参数
5. 保存后，系统自动生成分享链接

### 5.2 使用Hoppscotch链接

```typescript
// 生成的链接格式：
https://hoppscotch.io/r/u2Fk1QnynNoqd

// 链接数据结构（Base64解码后）：
{
  "v": 1,
  "t": "req",
  "d": {
    "name": "用户信息API",
    "request": {
      "method": "GET",
      "url": "https://api.example.com/users/1",
      "headers": [
        { "key": "Authorization", "value": "Bearer xxx", "enabled": true }
      ]
    }
  }
}
```

### 5.3 导出Curl命令

```bash
# 自动生成的curl命令示例：
curl -X GET 'https://api.example.com/users/1' \
  -H 'Authorization: Bearer xxx' \
  -H 'Content-Type: application/json'
```

## 六、部署方案

### 6.1 本地部署Hoppscotch

```bash
# 克隆Hoppscotch仓库
git clone https://github.com/hoppscotch/hoppscotch.git
cd hoppscotch

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 生产构建
pnpm build

# 使用Docker部署
docker run -d -p 3000:3000 hoppscotch/hoppscotch:latest
```

### 6.2 配置NOP-CHAOS集成

```javascript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  define: {
    'window.HOPPSCOTCH_BASE_URL': JSON.stringify('https://localhost:3000')
  }
})
```

## 七、总结

这个方案提供了：

1. **完整的数据模型** - 支持HTTP请求的所有配置
2. **分享链接生成** - 兼容Hoppscotch的链接格式
3. **Curl导出** - 自动生成可执行的curl命令
4. **BPMN深度集成** - 在流程节点中直接编辑API配置
5. **测试功能** - 内置请求测试能力
6. **可扩展性** - 支持GraphQL、gRPC等多种协议

你可以根据实际需求调整这个方案，如添加数据库持久化、用户权限管理等功能。



