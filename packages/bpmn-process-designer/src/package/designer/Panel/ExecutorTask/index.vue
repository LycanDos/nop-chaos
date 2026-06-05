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
import { EditOutlined, InfoCircleFilled } from '@ant-design/icons-vue'
import { useExecutorApi } from '@/hooks/useExecutorApi.ts'
import InputMappingDrawer from './InputMappingDrawer.vue'
import InputClarDrawer from './InputClarDrawer.vue'
import OutputDeltaDrawer from './OutputDeltaDrawer.vue'
import ExecutorConfigDrawer from './ExecutorConfigDrawer.vue'

defineOptions({ name: 'ExecutorTask', inheritAttrs: false })

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
  executorConfigJson: '',
})

const inputMappingDrawerRef = ref<InstanceType<typeof InputMappingDrawer>>()
const inputClarDrawerRef = ref<InstanceType<typeof InputClarDrawer>>()
const outputDeltaDrawerRef = ref<InstanceType<typeof OutputDeltaDrawer>>()
const executorConfigDrawerRef = ref<InstanceType<typeof ExecutorConfigDrawer>>()
const executorConfigDrawerVisible = ref(false)
const actives = ref<string[]>([
  'executor-method-editor',
  'executor-binding',
  'executor-input-clar',
  'executor-input',
  'executor-output',
  'executor-config',
])

// 当前选中方法的自定义编辑器字段（如 Hoppscotch）
const methodEditorField = computed<MethodSchemaFieldItem | undefined>(() => {
  // 1. 优先使用后端返回的 editorUrl（schema 中有该字段且配置了 editorUrl）
  const withEditor = selectedMethodInputs.value.find(f => f.editorUrl)
  if (withEditor) return withEditor

  // 2. 回退：executorConfigJson 参数默认使用 Hoppscotch 编辑器
  const configParam = selectedMethodInputs.value.find(
    f => f.fieldPath === 'executorConfigJson',
  )
  if (configParam) {
    return {
      ...configParam,
      editorUrl: '/plugins/lycan.hoppscotch/editor/index.html',
    } as MethodSchemaFieldItem
  }

  // 3. 最终回退：如果方法已选但后端无 schema 数据，
  //    根据 executor/method 特征推断是否需要编辑器
  if (bindingForm.methodId) {
    const executorCode = (bindingForm.executorCode || '').toLowerCase()
    const methodCode = (bindingForm.methodCode || '').toLowerCase()
    const name = (bindingForm.methodName || '').toLowerCase()
    // 已知需要 Hoppscotch 编辑器的模式
    const needsEditor = executorCode.includes('hoppscotch')
      || methodCode === 'executerequest'
      || name.includes('execute')
    if (needsEditor) {
      return {
        fieldId: 'executorConfigJson',
        methodId: bindingForm.methodId,
        schemaRole: 'INPUT' as const,
        fieldPath: 'executorConfigJson',
        fieldName: '请求配置',
        dataType: 'object',
        editorUrl: '/plugins/lycan.hoppscotch/editor/index.html',
      } as MethodSchemaFieldItem
    }
  }

  return undefined
})

// 使用新的入参 Clar (可通过配置切换)
const useInputClar = ref(true)

/** 当前选中的执行器是否为内置（Path B/embedded）执行器 */
const isEmbeddedExecutor = computed(() => {
  if (!bindingForm.executorDefId) return false
  const executor = executorList.value.find(e => e.executorDefId === bindingForm.executorDefId)
  if (!executor?.versionRuleJson) return false
  try {
    const meta = JSON.parse(executor.versionRuleJson)
    return meta.sourceMode === 'embedded'
  } catch {
    return false
  }
})

/** 内置执行器只允许 LATEST 策略（无版本概念） */
const availableVersionStrategies = computed(() => {
  if (isEmbeddedExecutor.value) {
    return [{ label: 'LATEST（内置执行器）', value: 'LATEST' }]
  }
  return versionStrategyOptions
})

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

// ========== 数据加载（通过注入的 API 适配器） ==========
async function loadExecutors() {
  loading.value = true
  try {
    executorList.value = await api.fetchExecutorList()
    // 如果当前已绑定内置执行器，强制 LATEST 策略并跳过版本加载
    if (isEmbeddedExecutor.value) {
      bindingForm.versionStrategy = 'LATEST'
      releaseList.value = []
    }
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

// 从配置中提取详细摘要信息
const configSummary = computed<{
  method: string
  url: string
  headersCount: number
  authType: string
  hasBody: boolean
  queryParamsCount: number
} | null>(() => {
  const cfg = parsedConfig.value
  if (!cfg || !cfg.url) return null
  return {
    method: cfg.method || 'GET',
    url: cfg.url,
    headersCount: cfg.headers?.length || 0,
    authType: cfg.auth?.type || 'none',
    hasBody: !!cfg.body,
    queryParamsCount: cfg.params?.length || 0,
  }
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

// ========== 事件处理 ==========
/** 判断下拉选项是否为内置执行器 */
function isOptionEmbedded(item: ExecutorDefItem): boolean {
  if (!item.versionRuleJson) return false
  try {
    const meta = JSON.parse(item.versionRuleJson)
    return meta.sourceMode === 'embedded'
  } catch {
    return false
  }
}

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

  // 内置执行器无版本概念，跳过版本加载
  if (isEmbeddedExecutor.value) {
    bindingForm.versionStrategy = 'LATEST'
    releaseList.value = []
  } else {
    loadReleases(executorDefId)
  }
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

// ========== 参数编辑器（Hoppscotch 等自定义编辑器） ==========
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
    if (!bindingForm.executorDefId) return

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
      // 执行器配置 JSON
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

    // 读取执行器配置 JSON
    bindingForm.executorConfigJson = binding.get('executorConfigJson') || ''

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
    executorConfigJson: '',
  })
  releaseList.value = []
  methodList.value = []
  selectedMethodInputs.value = []
  selectedMethodOutputs.value = []
}

watch(selectedElementRef, readBindingFromElement, { immediate: true })
onMounted(() => {
  loadExecutors()
})

</script>

<template>
  <a-collapse v-model:activeKey="actives">
    <!-- 参数配置面板（Hoppscotch 请求编辑器） -->
    <a-collapse-panel
      v-if="methodEditorField"
      key="executor-method-editor" header="参数配置"
    >
    <a-form-item>
      <template #label>
        请求信息
        <a-button v-if="methodEditorField.editorUrl" type="primary" link @click="openExecutorConfigDrawer" ><EditOutlined /> 编辑请求 </a-button>
      </template>

      <!-- 摘要显示：method + URL + 详情 -->
      <div v-if="configSummary" class="config-summary">
        <div class="summary-row">
          <a-tag :type="methodTagType" size="small">
            {{ configSummary.method }}
          </a-tag>
          <span class="config-url">{{ configSummary.url }}</span>
        </div>
        <div class="summary-details">
          <a-tag v-if="configSummary.queryParamsCount" size="small" color="processing">
            参数: {{ configSummary.queryParamsCount }}
          </a-tag>
          <a-tag v-if="configSummary.headersCount" size="small" color="processing">
            Headers: {{ configSummary.headersCount }}
          </a-tag>
          <a-tag v-if="configSummary.authType !== 'none'" size="small" color="warning">
            Auth: {{ { bearer: 'Bearer', basic: 'Basic', apikey: 'API Key' }[configSummary.authType] || configSummary.authType }}
          </a-tag>
          <a-tag v-if="configSummary.hasBody" size="small" color="success">
            Body
          </a-tag>
        </div>
      </div>
      <div v-else class="config-empty">
        <InfoCircleFilled />
        <span>点击"编辑请求"打开 Hoppscotch 配置 HTTP 请求</span>
      </div>
    </a-form-item>
    </a-collapse-panel>

    <!-- 执行器绑定（DB 执行器） -->
    <a-collapse-panel key="executor-binding" header="执行器绑定">
    <a-form-item label="执行器">
      <a-select
        v-model:value="bindingForm.executorDefId"
        showSearch
        allowClear
        placeholder="选择执行器"
        style="width: 100%"
        :loading="loading"
        @change="handleExecutorChange"
      >
        <a-select-option
          v-for="item in executorList"
          :key="item.executorDefId"
          :label="`${item.executorName} (${item.executorCode})`"
          :value="item.executorDefId"
        >
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ item.executorName }}</span>
            <span style="display: flex; gap: 4px">
              <a-tag v-if="isOptionEmbedded(item)" size="small" color="success">内置</a-tag>
              <a-tag size="small" color="processing">{{ item.executorCode }}</a-tag>
            </span>
          </div>
        </a-select-option>
      </a-select>
    </a-form-item>

    <!-- 版本策略 -->
    <a-form-item label="版本策略">
      <a-select
        v-model:value="bindingForm.versionStrategy"
        style="width: 100%"
        :disabled="isEmbeddedExecutor"
        @change="handleVersionStrategyChange"
      >
        <a-select-option
          v-for="opt in availableVersionStrategies"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </a-select>
    </a-form-item>

    <!-- 精确版本选择 -->
    <a-form-item v-if="bindingForm.versionStrategy === 'EXACT'" label="版本">
      <a-select
        v-model:value="bindingForm.executorReleaseId"
        showSearch
        allowClear
        :disabled="!bindingForm.executorDefId"
        placeholder="选择版本"
        style="width: 100%"
        @change="handleReleaseChange"
      >
        <a-select-option
          v-for="item in releaseList"
          :key="item.executorReleaseId"
          :label="item.releaseVersion"
          :value="item.executorReleaseId"
        >
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ item.releaseVersion }}</span>
            <a-tag v-if="item.compatLevel" size="small" :type="item.compatLevel === 'FULL' ? 'success' : 'warning'">
              {{ item.compatLevel }}
            </a-tag>
          </div>
        </a-select-option>
      </a-select>
    </a-form-item>

    <!-- 版本规则表达式 -->
    <a-form-item v-if="showVersionExpr && bindingForm.versionStrategy !== 'EXACT'" label="版本规则">
      <a-input
        v-model="bindingForm.versionExpr"
        :placeholder="versionExprPlaceholder"
        @change="saveBindingToElement"
      >
        <template #suffix>
          <a-tooltip :title="versionExprPlaceholder" placement="top">
            <InfoCircleFilled />
          </a-tooltip>
        </template>
      </a-input>
    </a-form-item>

    <!-- LATEST 策略下选择版本预览（用于加载方法列表） -->
    <a-form-item v-if="bindingForm.versionStrategy === 'LATEST'" label="当前版本">
      <a-select
        v-model:value="bindingForm.executorReleaseId"
        showSearch
        allowClear
        :disabled="!bindingForm.executorDefId"
        placeholder="自动使用最新版本（可预览）"
        style="width: 100%"
        @change="handleReleaseChange"
      >
        <a-select-option
          v-for="item in releaseList"
          :key="item.executorReleaseId"
          :label="`${item.releaseVersion} (预览)`"
          :value="item.executorReleaseId"
        />
      </a-select>
    </a-form-item>

    <!-- 方法选择 -->
    <a-form-item label="执行方法">
      <a-select
        v-model:value="bindingForm.methodId"
        showSearch
        allowClear
        :disabled="!bindingForm.executorReleaseId"
        placeholder="选择执行方法"
        style="width: 100%"
        @change="handleMethodChange"
      >
        <a-select-option
          v-for="item in methodList"
          :key="item.methodId"
          :label="`${item.methodName} (${item.methodCode})`"
          :value="item.methodId"
        >
          <div style="display: flex; justify-content: space-between; align-items: center">
            <span>{{ item.methodName }}</span>
            <a-tag size="small" color="processing">{{ item.methodCode }}</a-tag>
          </div>
        </a-select-option>
      </a-select>
    </a-form-item>

    <!-- 方法描述 -->
    <a-form-item v-if="bindingForm.methodId" label="方法描述">
      <span class="method-desc">
        {{ methodList.find(m => m.methodId === bindingForm.methodId)?.description || '(无描述)' }}
      </span>
    </a-form-item>
    </a-collapse-panel>

    <!-- 入参 Clar -->
    <a-collapse-panel v-if="useInputClar" key="executor-input-clar" header="入参 Clar">
    <div class="panel-action-row">
      <span class="panel-action-row__title">入参 Clar</span>
      <a-button type="primary" size="small" :disabled="!bindingForm.methodId" @click="openInputClarDrawer">
        <EditOutlined /> 编辑 Clar
      </a-button>
    </div>
      
      <!-- Clar 概览 -->
      <div v-if="bindingForm.inputPolicyDocument" class="clar-overview">
        <div class="clar-meta">
          <span class="clar-name">{{ bindingForm.inputPolicyDocument.name }}</span>
          <a-tag size="small">Layers: {{ bindingForm.inputPolicyDocument.layers?.length || 0 }}</a-tag>
        </div>
        
        <div class="clar-layers">
          <div 
            v-for="layer in bindingForm.inputPolicyDocument.layers" 
            :key="layer.id"
            class="layer-item"
          >
            <span class="layer-name">{{ layer.name }}</span>
            <a-tag size="small" color="processing">{{ layer.layerType }}</a-tag>
            <a-tag size="small">Rules: {{ layer.rules?.length || 0 }}</a-tag>
          </div>
        </div>
      </div>
      
      <div v-else class="clar-empty">
        <InfoCircleFilled />
        <span>点击"编辑 Clar"配置入参校验规则和默认值</span>
      </div>
    <InputClarDrawer ref="inputClarDrawerRef" @confirm="handleInputClarConfirm" />
    </a-collapse-panel>

    <!-- 入参映射 (旧版,保留向后兼容) -->
    <a-collapse-panel v-else key="executor-input" header="入参映射">
    <div class="panel-action-row">
      <span class="panel-action-row__title">
        入参映射 
        <a-tag size="small" color="warning">旧版</a-tag>
      </span>
      <a-button type="primary" size="small" :disabled="!bindingForm.methodId" @click="openInputMappingDrawer">
        <EditOutlined /> 编辑映射
      </a-button>
    </div>
      <a-table :data-source="bindingForm.inputMappings" :pagination="false" size="small" class="executor-mini-table">
        <a-table-column data-index="source" title="来源" :ellipsis="true" />
        <a-table-column data-index="target" title="目标参数" :ellipsis="true" />
        <a-table-column data-index="sourceType" title="类型" width="80">
          <template #default="{ record }">
            <a-tag size="small" :color="record.sourceType === 'variable' ? 'processing' : 'warning'">
              {{ record.sourceType === 'variable' ? '变量' : record.sourceType === 'literal' ? '字面量' : '表达式' }}
            </a-tag>
          </template>
        </a-table-column>
      </a-table>
      <div v-if="selectedMethodInputs.length && !bindingForm.inputMappings.length" class="mapping-hint">
        <InfoCircleFilled />
        <span>该方法有 {{ selectedMethodInputs.length }} 个入参，点击"编辑映射"配置</span>
      </div>
    <InputMappingDrawer ref="inputMappingDrawerRef" @confirm="handleInputMappingConfirm" />
    </a-collapse-panel>

    <!-- 出参 Delta -->
    <a-collapse-panel key="executor-output" header="出参 Delta">
    <div class="panel-action-row">
      <span class="panel-action-row__title">出参 Delta</span>
      <a-button type="primary" size="small" :disabled="!bindingForm.methodId" @click="openOutputDeltaDrawer">
        <EditOutlined /> 编辑 Delta
      </a-button>
    </div>
      <a-table :data-source="bindingForm.outputDeltas" :pagination="false" size="small" class="executor-mini-table">
        <a-table-column data-index="source" title="出参字段" :ellipsis="true" />
        <a-table-column data-index="target" title="流程变量" :ellipsis="true" />
        <a-table-column data-index="mergeStrategy" title="策略" width="80">
          <template #default="{ record }">
            <a-tag size="small" :color="record.mergeStrategy === 'overwrite' ? 'default' : 'success'">
              {{ record.mergeStrategy === 'overwrite' ? '覆盖' : record.mergeStrategy === 'merge' ? '合并' : '追加' }}
            </a-tag>
          </template>
        </a-table-column>
      </a-table>
      <div v-if="selectedMethodOutputs.length && !bindingForm.outputDeltas.length" class="mapping-hint">
        <InfoCircleFilled />
        <span>该方法有 {{ selectedMethodOutputs.length }} 个出参，点击"编辑 Delta"配置</span>
      </div>
    <OutputDeltaDrawer ref="outputDeltaDrawerRef" @confirm="handleOutputDeltaConfirm" />
    </a-collapse-panel>

    <!-- 执行配置 -->
    <a-collapse-panel key="executor-config" header="执行配置">
    <a-form-item label="超时(ms)">
      <a-input-number
        v-model="bindingForm.timeoutMs"
        :min="0"
        :step="1000"
        controls
        style="width: 100%"
        @change="saveBindingToElement"
      />
    </a-form-item>
    <a-form-item label="重试次数">
      <a-input-number
        v-model="bindingForm.retryCount"
        :min="0"
        :max="10"
        controls
        style="width: 100%"
        @change="saveBindingToElement"
      />
    </a-form-item>
    <a-form-item v-if="bindingForm.retryCount> 0" label="重试间隔(ms)">
      <a-input-number
        v-model="bindingForm.retryIntervalMs"
        :min="100"
        :step="1000"
        controls
        style="width: 100%"
        @change="saveBindingToElement"
      />
    </a-form-item>
    <a-form-item label="异步执行">
      <a-switch v-model:checked="bindingForm.asyncFlag" @change="saveBindingToElement" />
    </a-form-item>
    <a-form-item label="失败策略">
      <a-select
        v-model:value="bindingForm.failureStrategy"
        style="width: 100%"
        @change="saveBindingToElement"
      >
        <a-select-option
          v-for="opt in failureStrategyOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </a-select>
    </a-form-item>
    </a-collapse-panel>
  </a-collapse>

  <!-- 执行器配置 Drawer（微前端编辑器） -->
  <ExecutorConfigDrawer
    ref="executorConfigDrawerRef"
    v-model:visible="executorConfigDrawerVisible"
    :editor-url="methodEditorField?.editorUrl || ''"
    :plugin-name="methodEditorField?.fieldName || '请求配置'"
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

.panel-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.panel-action-row__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 500;
}

.executor-mini-table {
  width: 100%;
}

.executor-mini-table :deep(.ant-table) {
  font-size: 12px;
}

.executor-mini-table :deep(.ant-table-cell) {
  padding: 6px 8px !important;
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

.config-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
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
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  width: 100%;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-details {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.config-url {
  font-family: monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
  word-break: break-all;
  flex: 1;
}
</style>
