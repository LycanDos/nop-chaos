<!--
  执行器任务面板 - 绑定 LProcessConsole 中的执行器
  支持：选择执行器 → 选择版本 → 选择方法 → 配置入参 Clar / 出参 Delta

  数据加载通过 useExecutorApi() 获取注入的 API 适配器，
  使用方（如 nop-site）通过 ProcessDesigner 的 executorApi prop 传入实际请求实现。
  未注入时使用默认的 Nop GraphQL 适配器（直接 fetch /graphql）。
-->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useBpmnContextService, selectedElementRef } from '@/hooks/useService.ts'
import {
  addExtensionElements,
  getExtensionElementsList,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'
import { createElement } from '@/designer/utils/ElementUtil.ts'
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory'
import type {
  ExecutorDefItem,
  ExecutorReleaseItem,
  ExecutorMethodItem,
  MethodSchemaFieldItem,
  InputMappingItem,
  OutputDeltaItem,
  VersionStrategy,
  FailureStrategy,
  InputPolicyDocument,
} from '@/types/executor.ts'
import { EditPen, InfoFilled, Delete } from '@element-plus/icons-vue'
import { useExecutorApi } from '@/hooks/useExecutorApi.ts'
import InputMappingDrawer from './InputMappingDrawer.vue'
import InputClarDrawer from './InputClarDrawer.vue'
import OutputDeltaDrawer from './OutputDeltaDrawer.vue'
import ExecutorConfigDrawer from './ExecutorConfigDrawer.vue'
import SchemaConfigRenderer from './SchemaConfigRenderer.vue'
import { executorTypeRegistry } from '@/registry/ExecutorTypePluginRegistry.ts'
import type { ExecutorTypePlugin } from '@/types/executor.ts'

defineOptions({ name: 'ExecutorTask' })

const { selectedElement, updateProperties, getService } = useBpmnContextService()
const bpmnFactory = getService<BpmnFactory>('bpmnFactory')
const api = useExecutorApi()

// ========== 数据源 ==========
const executorList = ref<ExecutorDefItem[]>([])
const releaseList = ref<ExecutorReleaseItem[]>([])
const methodList = ref<ExecutorMethodItem[]>([])
const selectedMethodInputs = ref<MethodSchemaFieldItem[]>([])
const selectedMethodOutputs = ref<MethodSchemaFieldItem[]>([])
const loading = ref(false)

// ========== 绑定表单 ==========
const bindingForm = reactive({
  executorDefId: '',
  executorCode: '',
  executorName: '',
  executorReleaseId: '',
  releaseVersion: '',
  versionStrategy: 'LATEST' as VersionStrategy,
  versionExpr: '',
  methodId: '',
  methodCode: '',
  methodName: '',
  timeoutMs: 30000,
  retryCount: 0,
  retryIntervalMs: 5000,
  asyncFlag: false,
  failureStrategy: 'FAIL' as FailureStrategy,
  inputMappings: [] as InputMappingItem[],
  inputPolicyDocument: null as InputPolicyDocument | null,
  outputDeltas: [] as OutputDeltaItem[],
  // 执行器插件相关
  executorType: '',
  executorConfigJson: '',
})

const inputMappingDrawerRef = ref<InstanceType<typeof InputMappingDrawer>>()
const inputClarDrawerRef = ref<InstanceType<typeof InputClarDrawer>>()
const outputDeltaDrawerRef = ref<InstanceType<typeof OutputDeltaDrawer>>()
const executorConfigDrawerRef = ref<InstanceType<typeof ExecutorConfigDrawer>>()
const executorConfigDrawerVisible = ref(false)

// 当前选中的执行器插件
const currentPlugin = computed<ExecutorTypePlugin | undefined>(() => {
  if (!bindingForm.executorType) return undefined
  return executorTypeRegistry.get(bindingForm.executorType)
})

// 执行器类型下拉选项
const executorTypeOptions = computed(() => {
  const options = executorTypeRegistry.getSelectOptions()
  return [
    { label: '无（使用执行器绑定）', value: '', icon: '' },
    ...options,
  ]
})

// 是否有插件配置需要显示
const hasPluginConfig = computed(() => {
  return !!bindingForm.executorType && !!currentPlugin.value
})

// 使用新的入参 Clar (可通过配置切换)
const useInputClar = ref(true)

// ========== 选项 ==========
const versionStrategyOptions = [
  { label: 'LATEST（最新版本）', value: 'LATEST' },
  { label: 'EXACT（精确版本）', value: 'EXACT' },
  { label: 'RANGE（版本区间）', value: 'RANGE' },
  { label: 'SEMVER（语义化规则）', value: 'SEMVER' },
]

const failureStrategyOptions = [
  { label: '失败终止', value: 'FAIL' },
  { label: '跳过继续', value: 'SKIP' },
  { label: '重试', value: 'RETRY' },
  { label: '降级回退', value: 'FALLBACK' },
]

const versionExprPlaceholder = computed(() => {
  switch (bindingForm.versionStrategy) {
    case 'EXACT': return '例如: 1.2.3'
    case 'RANGE': return '例如: [1.0.0, 2.0.0) 或 >=1.0.0,<2.0.0'
    case 'SEMVER': return '例如: ^1.2.0 或 ~1.2.0 或 >=1.0.0'
    default: return ''
  }
})

const showVersionExpr = computed(() => bindingForm.versionStrategy !== 'LATEST')

// 同步画布图标：当 executorType 变化时更新 flowable:connectorIcon
function syncConnectorIcon(executorType: string) {
  if (!selectedElement || !updateProperties) return
  const plugin = executorType ? executorTypeRegistry.get(executorType) : undefined
  const icon = plugin?.icon || '#icon-executor-service'
  updateProperties({ 'flowable:connectorIcon': icon })
}

// ========== 数据加载（通过注入的 API 适配器） ==========
async function loadExecutors() {
  loading.value = true
  try {
    executorList.value = await api.fetchExecutorList()
  } catch (e) {
    console.warn('[ExecutorTask] 加载执行器列表失败:', e)
    executorList.value = []
  } finally {
    loading.value = false
  }
}

async function loadReleases(executorDefId: string) {
  if (!executorDefId) { releaseList.value = []; return }
  try {
    releaseList.value = await api.fetchReleaseList(executorDefId)
  } catch (e) {
    console.warn('[ExecutorTask] 加载版本列表失败:', e)
    releaseList.value = []
  }
}

async function loadMethods(executorReleaseId: string) {
  if (!executorReleaseId) { methodList.value = []; return }
  try {
    methodList.value = await api.fetchMethodList(executorReleaseId)
  } catch (e) {
    console.warn('[ExecutorTask] 加载方法列表失败:', e)
    methodList.value = []
  }
}

async function loadMethodSchema(methodId: string) {
  if (!methodId) {
    selectedMethodInputs.value = []
    selectedMethodOutputs.value = []
    return
  }
  try {
    const fields = await api.fetchMethodSchema(methodId)
    selectedMethodInputs.value = fields.filter(f => f.schemaRole === 'INPUT')
    selectedMethodOutputs.value = fields.filter(f => f.schemaRole === 'OUTPUT')
  } catch (e) {
    console.warn('[ExecutorTask] 加载方法 Schema 失败:', e)
    selectedMethodInputs.value = []
    selectedMethodOutputs.value = []
  }
}

// 解析当前 executorConfigJson 为对象
const parsedConfig = computed(() => {
  if (!bindingForm.executorConfigJson) return {}
  try {
    return JSON.parse(bindingForm.executorConfigJson)
  } catch {
    return {}
  }
})

// 从配置中提取摘要信息（method + URL）
const configSummary = computed<{ method: string; url: string } | null>(() => {
  const cfg = parsedConfig.value
  if (!cfg || !cfg.url) return null
  return { method: cfg.method || 'GET', url: cfg.url }
})

// method 对应的 tag 类型
const methodTagType = computed(() => {
  const method = configSummary.value?.method || ''
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return 'success'
  if (['POST', 'PATCH'].includes(method)) return 'warning'
  if (['PUT'].includes(method)) return 'primary'
  if (['DELETE'].includes(method)) return 'danger'
  return 'info'
})

// SchemaConfigRenderer 变更回调
function onSchemaConfigChange(val: Record<string, any>) {
  bindingForm.executorConfigJson = JSON.stringify(val)
  saveBindingToElement()
}

// ========== 事件处理 ==========
function handleExecutorChange(executorDefId: string) {
  const executor = executorList.value.find(e => e.executorDefId === executorDefId)
  bindingForm.executorCode = executor?.executorCode || ''
  bindingForm.executorName = executor?.executorName || ''
  bindingForm.executorReleaseId = ''
  bindingForm.releaseVersion = ''
  bindingForm.methodId = ''
  bindingForm.methodCode = ''
  bindingForm.methodName = ''
  bindingForm.inputMappings = []
  bindingForm.outputDeltas = []
  methodList.value = []
  selectedMethodInputs.value = []
  selectedMethodOutputs.value = []
  loadReleases(executorDefId)
  saveBindingToElement()
}

function handleReleaseChange(executorReleaseId: string) {
  const release = releaseList.value.find(r => r.executorReleaseId === executorReleaseId)
  bindingForm.releaseVersion = release?.releaseVersion || ''
  bindingForm.methodId = ''
  bindingForm.methodCode = ''
  bindingForm.methodName = ''
  bindingForm.inputMappings = []
  bindingForm.outputDeltas = []
  selectedMethodInputs.value = []
  selectedMethodOutputs.value = []
  loadMethods(executorReleaseId)
  saveBindingToElement()
}

function handleMethodChange(methodId: string) {
  const method = methodList.value.find(m => m.methodId === methodId)
  bindingForm.methodCode = method?.methodCode || ''
  bindingForm.methodName = method?.methodName || ''
  bindingForm.inputMappings = []
  bindingForm.inputPolicyDocument = null
  bindingForm.outputDeltas = []
  loadMethodSchema(methodId)
  saveBindingToElement()
}

function handleVersionStrategyChange() {
  if (bindingForm.versionStrategy === 'LATEST') {
    bindingForm.versionExpr = ''
  }
  saveBindingToElement()
}

// ========== 执行器类型（插件） ==========
function handleExecutorTypeChange(executorType: string) {
  bindingForm.executorType = executorType
  if (!executorType) {
    bindingForm.executorConfigJson = ''
  } else {
    const plugin = executorTypeRegistry.get(executorType)
    if (plugin?.configSchema) {
      // 初始化默认配置
      bindingForm.executorConfigJson = JSON.stringify(
        initConfigFromSchema(plugin.configSchema),
      )
    }
  }
  syncConnectorIcon(executorType)
  saveBindingToElement()
}

function initConfigFromSchema(schema: Record<string, any>): Record<string, any> {
  const config: Record<string, any> = {}
  if (!schema.properties) return config
  for (const [key, prop] of Object.entries(schema.properties)) {
    const propSchema = prop as Record<string, any>
    if (propSchema.default !== undefined) {
      config[key] = propSchema.default
    } else if (propSchema.type === 'object') {
      config[key] = initConfigFromSchema(propSchema)
    } else if (propSchema.type === 'array') {
      config[key] = []
    } else if (propSchema.type === 'string') {
      config[key] = ''
    }
  }
  return config
}

function handleExecutorConfigChange(configJson: string) {
  bindingForm.executorConfigJson = configJson
  saveBindingToElement()
}

function openExecutorConfigDrawer() {
  executorConfigDrawerVisible.value = true
}

// ========== 入参映射 (旧版,保留向后兼容) ==========
function openInputMappingDrawer() {
  inputMappingDrawerRef.value?.openDrawer(
    [...bindingForm.inputMappings],
    selectedMethodInputs.value,
  )
}

function handleInputMappingConfirm(mappings: InputMappingItem[]) {
  bindingForm.inputMappings = mappings
  saveBindingToElement()
}

// ========== 入参 Clar (新版) ==========
function openInputClarDrawer() {
  if (!bindingForm.methodId) return
  
  // 获取当前节点的 ID
  const nodeId = selectedElementRef.value?.id || ''
  const canvas = getService<any>('canvas')
  const rootElement = canvas?.getRootElement?.() || selectedElementRef.value
  const processDefId = rootElement?.businessObject?.id || rootElement?.id || ''

  console.log('[ClarDebug][ExecutorTask] openInputClarDrawer', {
    methodId: bindingForm.methodId,
    methodCode: bindingForm.methodCode,
    methodName: bindingForm.methodName,
    nodeId,
    processDefId,
    selectedMethodInputsCount: selectedMethodInputs.value.length,
    selectedMethodInputs: selectedMethodInputs.value.map((field) => ({
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      fieldPath: field.fieldPath,
      schemaRole: field.schemaRole,
      dataType: field.dataType,
    })),
    hasInputPolicyDocument: !!bindingForm.inputPolicyDocument,
  })
  
  inputClarDrawerRef.value?.openDrawer(
    bindingForm.methodId,
    nodeId,
    processDefId,
    bindingForm.inputPolicyDocument || undefined,
    selectedMethodInputs.value
  )
}

function handleInputClarConfirm(document: InputPolicyDocument) {
  bindingForm.inputPolicyDocument = document
  saveBindingToElement()
}

// ========== 出参 Delta ==========
function openOutputDeltaDrawer() {
  if (!bindingForm.methodId || !selectedElementRef.value) return

  const canvas = getService<any>('canvas')
  const rootElement = canvas?.getRootElement?.() || selectedElementRef.value

  outputDeltaDrawerRef.value?.openDrawer({
    currentDeltas: [...bindingForm.outputDeltas],
    fields: selectedMethodOutputs.value,
    currentElement: selectedElementRef.value,
    rootElement,
    fetchMethodSchema: api.fetchMethodSchema,
    fetchDesignVariablePool: api.fetchDesignVariablePool,
    fetchDesignNodeResult: api.fetchDesignNodeResult,
  })
}

function handleOutputDeltaConfirm(deltas: OutputDeltaItem[]) {
  bindingForm.outputDeltas = deltas
  saveBindingToElement()
}

// ========== 保存绑定到 BPMN 元素 ==========
function saveBindingToElement() {
  if (!selectedElement || !bpmnFactory) return
  try {
    const oldBindings = getExtensionElementsList(selectedElement, 'l:ExecutorBinding')
    if (oldBindings.length) {
      removeExtensionElements(selectedElement, oldBindings)
    }
    if (!bindingForm.executorDefId && !bindingForm.executorType) return

    const bindingProps: Record<string, any> = {
      executorDefId: bindingForm.executorDefId,
      executorCode: bindingForm.executorCode,
      executorName: bindingForm.executorName,
      executorReleaseId: bindingForm.executorReleaseId || undefined,
      releaseVersion: bindingForm.releaseVersion || undefined,
      versionStrategy: bindingForm.versionStrategy,
      versionExpr: bindingForm.versionExpr || undefined,
      methodId: bindingForm.methodId || undefined,
      methodCode: bindingForm.methodCode || undefined,
      methodName: bindingForm.methodName || undefined,
      timeoutMs: bindingForm.timeoutMs,
      retryCount: bindingForm.retryCount,
      retryIntervalMs: bindingForm.retryIntervalMs,
      asyncFlag: bindingForm.asyncFlag,
      failureStrategy: bindingForm.failureStrategy,
      // 执行器插件
      executorType: bindingForm.executorType || undefined,
      executorConfigJson: bindingForm.executorConfigJson || undefined,
      // 保留旧版入参映射 (向后兼容)
      inputMappingJson: bindingForm.inputMappings.length
        ? JSON.stringify(bindingForm.inputMappings)
        : undefined,
      // 新版入参 Clar
      inputPolicyDocumentJson: bindingForm.inputPolicyDocument
        ? JSON.stringify(bindingForm.inputPolicyDocument)
        : undefined,
      outputDeltaJson: bindingForm.outputDeltas.length
        ? JSON.stringify(bindingForm.outputDeltas)
        : undefined,
    }

    const executorBinding = createElement('l:ExecutorBinding', bpmnFactory, bindingProps)
    addExtensionElements(selectedElement, executorBinding)
  } catch (err) {
    console.error('[ExecutorTask] 保存绑定失败:', err)
  }
}

// ========== 从 BPMN 元素读取绑定 ==========
function readBindingFromElement() {
  const el = selectedElementRef.value
  if (!el) return

  const bindings = getExtensionElementsList(el, 'l:ExecutorBinding')
  const binding = bindings[0]

  if (binding) {
    bindingForm.executorDefId = binding.get('executorDefId') || ''
    bindingForm.executorCode = binding.get('executorCode') || ''
    bindingForm.executorName = binding.get('executorName') || ''
    bindingForm.executorReleaseId = binding.get('executorReleaseId') || ''
    bindingForm.releaseVersion = binding.get('releaseVersion') || ''
    bindingForm.versionStrategy = binding.get('versionStrategy') || 'LATEST'
    bindingForm.versionExpr = binding.get('versionExpr') || ''
    bindingForm.methodId = binding.get('methodId') || ''
    bindingForm.methodCode = binding.get('methodCode') || ''
    bindingForm.methodName = binding.get('methodName') || ''
    bindingForm.timeoutMs = Number(binding.get('timeoutMs')) || 30000
    bindingForm.retryCount = Number(binding.get('retryCount')) || 0
    bindingForm.retryIntervalMs = Number(binding.get('retryIntervalMs')) || 5000
    bindingForm.asyncFlag = binding.get('asyncFlag') === true || binding.get('asyncFlag') === 'true'
    bindingForm.failureStrategy = binding.get('failureStrategy') || 'FAIL'

    try {
      const inputJson = binding.get('inputMappingJson')
      bindingForm.inputMappings = inputJson ? JSON.parse(inputJson) : []
    } catch { bindingForm.inputMappings = [] }

    // 读取新版入参 Clar
    try {
      const policyJson = binding.get('inputPolicyDocumentJson')
      bindingForm.inputPolicyDocument = policyJson ? JSON.parse(policyJson) : null
    } catch { bindingForm.inputPolicyDocument = null }

    try {
      const outputJson = binding.get('outputDeltaJson')
      bindingForm.outputDeltas = outputJson ? JSON.parse(outputJson) : []
    } catch { bindingForm.outputDeltas = [] }

    // 读取执行器插件字段
    bindingForm.executorType = binding.get('executorType') || ''
    bindingForm.executorConfigJson = binding.get('executorConfigJson') || ''

    // 同步画布图标
    if (bindingForm.executorType) {
      syncConnectorIcon(bindingForm.executorType)
    }

    // 级联加载数据
    if (bindingForm.executorDefId) loadReleases(bindingForm.executorDefId)
    if (bindingForm.executorReleaseId) loadMethods(bindingForm.executorReleaseId)
    if (bindingForm.methodId) loadMethodSchema(bindingForm.methodId)
  } else {
    resetForm()
  }
}

function resetForm() {
  Object.assign(bindingForm, {
    executorDefId: '', executorCode: '', executorName: '',
    executorReleaseId: '', releaseVersion: '',
    versionStrategy: 'LATEST', versionExpr: '',
    methodId: '', methodCode: '', methodName: '',
    timeoutMs: 30000, retryCount: 0, retryIntervalMs: 5000,
    asyncFlag: false, failureStrategy: 'FAIL',
    inputMappings: [], inputPolicyDocument: null, outputDeltas: [],
    executorType: '', executorConfigJson: '',
  })
  releaseList.value = []
  methodList.value = []
  selectedMethodInputs.value = []
  selectedMethodOutputs.value = []
}

watch(selectedElementRef, readBindingFromElement, { immediate: true })
onMounted(() => {
  loadExecutors()
  registerBuiltinPlugins()
})

// ========== 内建插件注册 ==========
function registerBuiltinPlugins() {
  executorTypeRegistry.register({
    id: 'lycan.hoppscotch',
    name: 'API 调用',
    icon: '#icon-executor-hoppscotch',
    configSchema: {
      type: 'object',
      required: ['method', 'url'],
      properties: {
        method: {
          type: 'string',
          title: '请求方法',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
          default: 'GET',
        },
        url: {
          type: 'string',
          title: '请求 URL',
          description: 'HTTP 请求地址，支持 Delta 变量注入，如 $jmes(vars.apiBaseUrl)/users',
        },
        headers: {
          type: 'array',
          title: '请求头',
          'ui:widget': 'kv-table',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', title: 'Key' },
              value: { type: 'string', title: 'Value' },
              enabled: { type: 'boolean', title: '启用', default: true },
            },
          },
        },
        body: {
          type: 'object',
          title: '请求体',
          properties: {
            type: {
              type: 'string',
              title: 'Body 类型',
              enum: ['none', 'raw', 'form-data', 'x-www-form-urlencoded'],
              default: 'none',
            },
            contentType: { type: 'string', title: 'Content-Type' },
            rawData: { type: 'string', title: '原始数据', 'ui:widget': 'textarea' },
          },
        },
        auth: {
          type: 'object',
          title: '认证',
          properties: {
            type: {
              type: 'string',
              title: '认证类型',
              enum: ['none', 'basic', 'bearer', 'api-key'],
              default: 'none',
            },
            bearer: {
              type: 'object',
              title: 'Bearer Token',
              properties: {
                token: { type: 'string', title: 'Token' },
              },
            },
            basic: {
              type: 'object',
              title: 'Basic 认证',
              properties: {
                username: { type: 'string', title: '用户名' },
                password: { type: 'string', title: '密码' },
              },
            },
          },
        },
      },
    },
  })
}
</script>

<template>
  <!-- 执行器类型（插件） -->
  <el-collapse-item name="executor-plugin-type" title="执行器类型">
    <el-form-item label="类型">
      <el-select
        v-model="bindingForm.executorType"
        filterable
        clearable
        placeholder="选择执行器类型"
        style="width: 100%"
        @change="handleExecutorTypeChange"
      >
        <el-option
          v-for="opt in executorTypeOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        >
          <span v-if="opt.icon" :style="{ marginRight: '6px' }">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <use :href="opt.icon" />
            </svg>
          </span>
          {{ opt.label }}
        </el-option>
      </el-select>
    </el-form-item>
    <el-form-item v-if="currentPlugin" label="插件 ID">
      <el-tag type="info">{{ currentPlugin.id }}</el-tag>
    </el-form-item>
  </el-collapse-item>

  <!-- 执行器配置（插件专属） -->
  <el-collapse-item
    v-if="hasPluginConfig"
    name="executor-plugin-config"
    title="执行器配置"
  >
    <el-form-item label-position="top">
      <template #label>
        配置内容
        <el-button
          v-if="currentPlugin?.editorUrl"
          type="primary"
          class="el-icon--right"
          :icon="EditPen"
          link
          @click="openExecutorConfigDrawer"
        >
          在编辑器中编辑
        </el-button>
      </template>

      <!-- 摘要显示：method + URL -->
      <div v-if="configSummary" class="config-summary">
        <el-tag :type="methodTagType" size="small">
          {{ configSummary.method }}
        </el-tag>
        <span class="config-url">{{ configSummary.url }}</span>
      </div>

      <!-- Schema 自动表单（无 editorUrl 时） -->
      <SchemaConfigRenderer
        v-if="currentPlugin?.configSchema && !currentPlugin?.editorUrl"
        :schema="currentPlugin.configSchema"
        :model-value="parsedConfig"
        @update:model-value="onSchemaConfigChange"
      />
    </el-form-item>
  </el-collapse-item>

  <!-- 执行器绑定（DB 执行器） -->
  <el-collapse-item name="executor-binding" title="执行器绑定">
    <el-form-item label="执行器">
      <el-select
        v-model="bindingForm.executorDefId"
        filterable
        clearable
        placeholder="选择执行器"
        style="width: 100%"
        :loading="loading"
        @change="handleExecutorChange"
      >
        <el-option
          v-for="item in executorList"
          :key="item.executorDefId"
          :label="`${item.executorName} (${item.executorCode})`"
          :value="item.executorDefId"
        >
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ item.executorName }}</span>
            <el-tag size="small" type="info">{{ item.executorCode }}</el-tag>
          </div>
        </el-option>
      </el-select>
    </el-form-item>

    <!-- 版本策略 -->
    <el-form-item label="版本策略">
      <el-select
        v-model="bindingForm.versionStrategy"
        style="width: 100%"
        @change="handleVersionStrategyChange"
      >
        <el-option
          v-for="opt in versionStrategyOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </el-form-item>

    <!-- 精确版本选择 -->
    <el-form-item v-if="bindingForm.versionStrategy === 'EXACT'" label="版本">
      <el-select
        v-model="bindingForm.executorReleaseId"
        filterable
        clearable
        :disabled="!bindingForm.executorDefId"
        placeholder="选择版本"
        style="width: 100%"
        @change="handleReleaseChange"
      >
        <el-option
          v-for="item in releaseList"
          :key="item.executorReleaseId"
          :label="item.releaseVersion"
          :value="item.executorReleaseId"
        >
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ item.releaseVersion }}</span>
            <el-tag v-if="item.compatLevel" size="small" :type="item.compatLevel === 'FULL' ? 'success' : 'warning'">
              {{ item.compatLevel }}
            </el-tag>
          </div>
        </el-option>
      </el-select>
    </el-form-item>

    <!-- 版本规则表达式 -->
    <el-form-item v-if="showVersionExpr && bindingForm.versionStrategy !== 'EXACT'" label="版本规则">
      <el-input
        v-model="bindingForm.versionExpr"
        :placeholder="versionExprPlaceholder"
        @change="saveBindingToElement"
      >
        <template #suffix>
          <el-tooltip :content="versionExprPlaceholder" placement="top">
            <el-icon><InfoFilled /></el-icon>
          </el-tooltip>
        </template>
      </el-input>
    </el-form-item>

    <!-- LATEST 策略下选择版本预览（用于加载方法列表） -->
    <el-form-item v-if="bindingForm.versionStrategy === 'LATEST'" label="当前版本">
      <el-select
        v-model="bindingForm.executorReleaseId"
        filterable
        clearable
        :disabled="!bindingForm.executorDefId"
        placeholder="自动使用最新版本（可预览）"
        style="width: 100%"
        @change="handleReleaseChange"
      >
        <el-option
          v-for="item in releaseList"
          :key="item.executorReleaseId"
          :label="`${item.releaseVersion} (预览)`"
          :value="item.executorReleaseId"
        />
      </el-select>
    </el-form-item>

    <!-- 方法选择 -->
    <el-form-item label="执行方法">
      <el-select
        v-model="bindingForm.methodId"
        filterable
        clearable
        :disabled="!bindingForm.executorReleaseId"
        placeholder="选择执行方法"
        style="width: 100%"
        @change="handleMethodChange"
      >
        <el-option
          v-for="item in methodList"
          :key="item.methodId"
          :label="`${item.methodName} (${item.methodCode})`"
          :value="item.methodId"
        >
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ item.methodName }}</span>
            <el-tag size="small" type="info">{{ item.methodCode }}</el-tag>
          </div>
        </el-option>
      </el-select>
    </el-form-item>

    <!-- 方法描述 -->
    <el-form-item v-if="bindingForm.methodId" label="方法描述">
      <span class="method-desc">
        {{ methodList.find(m => m.methodId === bindingForm.methodId)?.description || '(无描述)' }}
      </span>
    </el-form-item>
  </el-collapse-item>

  <!-- 入参 Clar -->
  <el-collapse-item v-if="useInputClar" name="executor-input-clar" title="入参 Clar">
    <el-form-item label-position="top">
      <template #label>
        入参 Clar
        <el-button
          type="primary"
          class="el-icon--right"
          :icon="EditPen"
          link
          :disabled="!bindingForm.methodId"
          @click="openInputClarDrawer"
        >
          编辑 Clar
        </el-button>
      </template>
      
      <!-- Clar 概览 -->
      <div v-if="bindingForm.inputPolicyDocument" class="clar-overview">
        <div class="clar-meta">
          <span class="clar-name">{{ bindingForm.inputPolicyDocument.name }}</span>
          <el-tag size="small">Layers: {{ bindingForm.inputPolicyDocument.layers?.length || 0 }}</el-tag>
        </div>
        
        <div class="clar-layers">
          <div 
            v-for="layer in bindingForm.inputPolicyDocument.layers" 
            :key="layer.id"
            class="layer-item"
          >
            <span class="layer-name">{{ layer.name }}</span>
            <el-tag size="small" type="info">{{ layer.layerType }}</el-tag>
            <el-tag size="small">Rules: {{ layer.rules?.length || 0 }}</el-tag>
          </div>
        </div>
      </div>
      
      <div v-else class="clar-empty">
        <el-icon><InfoFilled /></el-icon>
        <span>点击"编辑 Clar"配置入参校验规则和默认值</span>
      </div>
    </el-form-item>
    <InputClarDrawer ref="inputClarDrawerRef" @confirm="handleInputClarConfirm" />
  </el-collapse-item>

  <!-- 入参映射 (旧版,保留向后兼容) -->
  <el-collapse-item v-else name="executor-input" title="入参映射">
    <el-form-item label-position="top">
      <template #label>
        入参映射
        <el-tag size="small" type="warning" class="el-icon--right">旧版</el-tag>
        <el-button
          type="primary"
          class="el-icon--right"
          :icon="EditPen"
          link
          :disabled="!bindingForm.methodId"
          @click="openInputMappingDrawer"
        >
          编辑映射
        </el-button>
      </template>
      <el-table :data="bindingForm.inputMappings" height="180px" size="small">
        <el-table-column prop="source" show-overflow-tooltip label="来源" />
        <el-table-column prop="target" show-overflow-tooltip label="目标参数" />
        <el-table-column prop="sourceType" show-overflow-tooltip label="类型" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.sourceType === 'variable' ? '' : 'warning'">
              {{ row.sourceType === 'variable' ? '变量' : row.sourceType === 'literal' ? '字面量' : '表达式' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="selectedMethodInputs.length && !bindingForm.inputMappings.length" class="mapping-hint">
        <el-icon><InfoFilled /></el-icon>
        <span>该方法有 {{ selectedMethodInputs.length }} 个入参，点击"编辑映射"配置</span>
      </div>
    </el-form-item>
    <InputMappingDrawer ref="inputMappingDrawerRef" @confirm="handleInputMappingConfirm" />
  </el-collapse-item>

  <!-- 出参 Delta -->
  <el-collapse-item name="executor-output" title="出参 Delta">
    <el-form-item label-position="top">
      <template #label>
        出参 Delta
        <el-button
          type="primary"
          class="el-icon--right"
          :icon="EditPen"
          link
          :disabled="!bindingForm.methodId"
          @click="openOutputDeltaDrawer"
        >
          编辑 Delta
        </el-button>
      </template>
      <el-table :data="bindingForm.outputDeltas" height="180px" size="small">
        <el-table-column prop="source" show-overflow-tooltip label="出参字段" />
        <el-table-column prop="target" show-overflow-tooltip label="流程变量" />
        <el-table-column prop="mergeStrategy" show-overflow-tooltip label="策略" width="80">
          <template #default="{ row }">
            <el-tag size="small" :type="row.mergeStrategy === 'overwrite' ? '' : 'success'">
              {{ row.mergeStrategy === 'overwrite' ? '覆盖' : row.mergeStrategy === 'merge' ? '合并' : '追加' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="selectedMethodOutputs.length && !bindingForm.outputDeltas.length" class="mapping-hint">
        <el-icon><InfoFilled /></el-icon>
        <span>该方法有 {{ selectedMethodOutputs.length }} 个出参，点击"编辑 Delta"配置</span>
      </div>
    </el-form-item>
    <OutputDeltaDrawer ref="outputDeltaDrawerRef" @confirm="handleOutputDeltaConfirm" />
  </el-collapse-item>

  <!-- 执行配置 -->
  <el-collapse-item name="executor-config" title="执行配置">
    <el-form-item label="超时(ms)">
      <el-input-number
        v-model="bindingForm.timeoutMs"
        :min="0"
        :step="1000"
        controls-position="right"
        style="width: 100%"
        @change="saveBindingToElement"
      />
    </el-form-item>
    <el-form-item label="重试次数">
      <el-input-number
        v-model="bindingForm.retryCount"
        :min="0"
        :max="10"
        controls-position="right"
        style="width: 100%"
        @change="saveBindingToElement"
      />
    </el-form-item>
    <el-form-item v-if="bindingForm.retryCount > 0" label="重试间隔(ms)">
      <el-input-number
        v-model="bindingForm.retryIntervalMs"
        :min="100"
        :step="1000"
        controls-position="right"
        style="width: 100%"
        @change="saveBindingToElement"
      />
    </el-form-item>
    <el-form-item label="异步执行">
      <el-switch v-model="bindingForm.asyncFlag" @change="saveBindingToElement" />
    </el-form-item>
    <el-form-item label="失败策略">
      <el-select
        v-model="bindingForm.failureStrategy"
        style="width: 100%"
        @change="saveBindingToElement"
      >
        <el-option
          v-for="opt in failureStrategyOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </el-form-item>
  </el-collapse-item>

  <!-- 执行器配置 Drawer（微前端编辑器） -->
  <ExecutorConfigDrawer
    ref="executorConfigDrawerRef"
    v-model:visible="executorConfigDrawerVisible"
    :editor-url="currentPlugin?.editorUrl || ''"
    :plugin-name="currentPlugin?.name || ''"
    :config-json="bindingForm.executorConfigJson"
    @save="handleExecutorConfigChange"
  />
</template>


<style scoped lang="scss">
.method-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
.mapping-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 8px;
}

// Clar 相关样式
.clar-overview {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
}

.clar-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.clar-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.clar-layers {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-blank);
  border-radius: 4px;
}

.layer-name {
  font-size: 13px;
  color: var(--el-text-color-regular);
  flex: 1;
}

.clar-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

// 执行器配置摘要
.config-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  width: 100%;
}

.config-url {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
  word-break: break-all;
}
</style>
