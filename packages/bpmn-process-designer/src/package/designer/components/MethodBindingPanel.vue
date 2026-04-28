<template>
  <div
    class="method-binding-panel"
    :class="{ 'method-binding-panel--collapsed': collapsed }"
    :style="{ width: collapsed ? '40px' : '360px' }"
  >
    <!-- 折叠状态：仅显示展开按钮 -->
    <div v-if="collapsed" class="method-binding-panel__toggle" @click="handleExpand">
      <el-tooltip content="展开方法绑定面板" placement="left">
        <el-icon :size="18"><DArrowLeft /></el-icon>
      </el-tooltip>
    </div>

    <!-- 展开状态：完整面板内容 -->
    <template v-else>
      <!-- 面板头部 -->
      <div class="method-binding-panel__header">
        <span class="method-binding-panel__title">方法绑定</span>
        <el-icon
          class="method-binding-panel__collapse-btn"
          :size="18"
          @click="handleCollapse"
        >
          <DArrowRight />
        </el-icon>
      </div>

      <!-- 节点信息区域 -->
      <div class="method-binding-panel__section">
        <div class="method-binding-panel__section-title">节点信息</div>
        <el-form label-width="80px" size="small">
          <el-form-item label="节点 ID">
            <span class="method-binding-panel__info-value">{{ nodeInfo.id }}</span>
          </el-form-item>
          <el-form-item label="节点名称">
            <span class="method-binding-panel__info-value">{{ nodeInfo.name || '(未命名)' }}</span>
          </el-form-item>
          <el-form-item label="节点类型">
            <el-tag size="small" type="info">{{ nodeInfo.type }}</el-tag>
          </el-form-item>
        </el-form>
      </div>

      <!-- 绑定配置区域 -->
      <div class="method-binding-panel__section">
        <div class="method-binding-panel__section-title">绑定配置</div>
        <el-form label-width="80px" size="small">
          <!-- 执行器选择器 -->
          <el-form-item label="执行器">
            <el-select
              v-model="selectedExecutorId"
              filterable
              remote
              reserve-keyword
              clearable
              placeholder="搜索并选择执行器"
              :remote-method="handleExecutorSearch"
              :loading="executorLoading"
              style="width: 100%"
              @change="handleExecutorChange"
              @clear="handleExecutorClear"
            >
              <el-option
                v-for="item in executorList"
                :key="item.executorDefId"
                :label="item.executorCode ? `${item.executorCode} | ${item.executorName || ''}${inferEntryType(item.language) ? ` [${inferEntryType(item.language)}]` : ''}` : item.executorName"
                :value="item.executorDefId"
              >
                <div class="method-binding-panel__executor-option">
                  <span class="method-binding-panel__executor-code">{{ item.executorCode }}</span>
                  <span class="method-binding-panel__executor-name">{{ item.executorName }}</span>
                  <el-tag
                    v-if="inferEntryType(item.language)"
                    size="small"
                    :type="entryTypeTagType(inferEntryType(item.language))"
                    class="method-binding-panel__entry-type-tag"
                  >
                    {{ inferEntryType(item.language) }}
                  </el-tag>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <!-- 方法选择器 -->
          <el-form-item label="方法">
            <el-select
              v-model="selectedMethodCode"
              filterable
              clearable
              :disabled="!selectedExecutorId"
              :placeholder="selectedExecutorId ? '搜索并选择方法' : '请先选择执行器'"
              :loading="methodLoading"
              style="width: 100%"
              @change="handleMethodChange"
              @clear="handleMethodClear"
            >
              <el-option
                v-for="item in methodList"
                :key="item.methodCode"
                :label="item.methodCode ? `${item.methodCode} | ${item.methodName || ''}${selectedExecutorEntryType ? ` [${selectedExecutorEntryType}]` : ''}` : item.methodName"
                :value="item.methodCode"
              >
                <div class="method-binding-panel__method-option">
                  <div class="method-binding-panel__method-main">
                    <span class="method-binding-panel__method-code">{{ item.methodCode }}</span>
                    <span class="method-binding-panel__method-name">{{ item.methodName }}</span>
                    <el-tag
                      v-if="selectedExecutorEntryType"
                      size="small"
                      :type="entryTypeTagType(selectedExecutorEntryType)"
                      class="method-binding-panel__entry-type-tag"
                    >
                      {{ selectedExecutorEntryType }}
                    </el-tag>
                  </div>
                  <div v-if="item.description" class="method-binding-panel__method-summary">
                    {{ item.description }}
                  </div>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <!-- 版本约束类型 -->
          <el-form-item label="版本约束">
            <el-select
              v-model="versionConstraintType"
              :disabled="!selectedMethodCode"
              :placeholder="selectedMethodCode ? '选择版本约束类型' : '请先选择方法'"
              style="width: 100%"
            >
              <el-option label="EXACT（精确版本）" value="EXACT" />
              <el-option label="RANGE（版本范围）" value="RANGE" />
              <el-option label="LATEST（最新版本）" value="LATEST" />
            </el-select>
          </el-form-item>

          <!-- 版本约束表达式（LATEST 模式下禁用） -->
          <el-form-item label="版本表达式">
            <el-input
              v-model="versionConstraintExpr"
              :disabled="!selectedMethodCode || versionConstraintType === 'LATEST'"
              :placeholder="versionConstraintType === 'LATEST' ? '最新版本无需填写' : '请输入版本约束表达式'"
              style="width: 100%"
            />
          </el-form-item>

          <!-- 超时时间 -->
          <el-form-item label="超时(ms)">
            <el-input-number
              v-model="timeoutMs"
              :min="0"
              :step="1000"
              :disabled="!selectedMethodCode"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <!-- 异步执行标志 -->
          <el-form-item label="异步执行">
            <el-switch
              v-model="asyncFlag"
              :disabled="!selectedMethodCode"
              active-text="是"
              inactive-text="否"
            />
          </el-form-item>
        </el-form>

        <!-- 操作按钮区域 -->
        <div class="method-binding-panel__actions">
          <el-button
            type="primary"
            size="small"
            :disabled="!selectedMethodCode"
            @click="saveBindingToElement"
          >
            保存绑定
          </el-button>
          <el-button
            type="danger"
            size="small"
            plain
            @click="clearBindingFromElement"
          >
            清除绑定
          </el-button>
        </div>
      </div>

      <!-- Delta 变量池区域 -->
      <div class="method-binding-panel__section">
        <template v-if="effectiveBindingId">
          <DeltaVariablePool
            :binding-id="effectiveBindingId"
            :process-instance-id="processInstanceId"
            :mode="mode"
          />
        </template>
        <div v-else class="method-binding-panel__placeholder">
          <span class="method-binding-panel__placeholder-text">请先绑定方法以查看变量规则</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '@/config/axios'
import DeltaVariablePool from './DeltaVariablePool.vue'

defineOptions({ name: 'MethodBindingPanel' })

/** 执行器定义类型 */
interface ExecutorDefItem {
  executorDefId: string
  executorCode: string
  executorName: string
  /** 执行器语言，用于推导 entryType */
  language?: string
  /** 执行器快照中的方法列表（选中后加载） */
  methods?: any[]
}

/** 执行器方法类型 */
interface ExecutorMethodItem {
  methodCode: string
  methodName: string
  description?: string
}

/**
 * 根据执行器的 language 字段推导 entryType 标签
 * 映射规则与后端 BizModel.inferEntryType 保持一致
 */
function inferEntryType(language?: string): string {
  if (!language) return ''
  const lang = language.toLowerCase()
  if (lang === 'java') return 'JAVA'
  if (lang === 'http') return 'HTTP'
  if (lang === 'script' || lang === 'javascript' || lang === 'groovy' || lang === 'python') return 'SCRIPT'
  // 其他语言直接大写展示
  return lang.toUpperCase()
}

const props = defineProps({
  /** 选中的 BPMN 元素 */
  element: {
    type: Object,
    required: true,
  },
  /** bpmn-js modeler 实例 */
  modeler: {
    type: Object,
    required: true,
  },
  /** 面板是否折叠 */
  collapsed: {
    type: Boolean,
    default: false,
  },
  /** 外部传入的 ActivityMethodBinding ID（可选） */
  bindingId: {
    type: String,
    default: '',
  },
  /** 运行时模式下的流程实例 ID（可选） */
  processInstanceId: {
    type: String,
    default: '',
  },
  /** 模式：设计模式或运行时模式 */
  mode: {
    type: String as () => 'design' | 'runtime',
    default: 'design',
  },
})

const emit = defineEmits<{
  (e: 'collapse'): void
  (e: 'expand'): void
  (e: 'executor-change', executorDefId: string, executor: ExecutorDefItem | null): void
  (e: 'method-change', methodCode: string, method: ExecutorMethodItem | null): void
}>()

/** 从选中元素中提取节点信息 */
const nodeInfo = computed(() => {
  const bo = props.element?.businessObject
  if (!bo) {
    return { id: '', name: '', type: '' }
  }
  return {
    id: bo.id || '',
    name: bo.name || '',
    type: bo.$type || '',
  }
})

/**
 * 有效的 bindingId：优先使用外部传入的 prop，
 * 否则从元素的 extensionElements 中读取 l:MethodBinding 的 bindingId 属性
 */
const effectiveBindingId = computed(() => {
  if (props.bindingId) return props.bindingId
  const bo = props.element?.businessObject
  if (!bo?.extensionElements?.values) return ''
  const binding = bo.extensionElements.values.find(
    (ext: any) => ext.$type === 'l:MethodBinding'
  )
  return binding?.bindingId || ''
})

// ==================== 执行器选择器 ====================

/** 当前选中的执行器 ID */
const selectedExecutorId = ref<string>('')

/** 执行器列表 */
const executorList = ref<ExecutorDefItem[]>([])

/** 执行器加载状态 */
const executorLoading = ref(false)

/** 当前选中执行器的 entryType（用于方法选择器中展示） */
const selectedExecutorEntryType = computed(() => {
  if (!selectedExecutorId.value) return ''
  const executor = executorList.value.find((e) => e.executorDefId === selectedExecutorId.value)
  return executor ? inferEntryType(executor.language) : ''
})

/**
 * 根据 entryType 返回 el-tag 的 type 属性
 * 用于不同类型的执行器展示不同颜色标签
 */
function entryTypeTagType(entryType: string): string {
  switch (entryType) {
    case 'JAVA': return ''        // 默认蓝色
    case 'HTTP': return 'success' // 绿色
    case 'SCRIPT': return 'warning' // 橙色
    default: return 'info'        // 灰色
  }
}

/**
 * 加载执行器列表
 * 通过 LProcessConsole__loadExecutorSnapshot API 获取执行器快照
 * @param query 搜索关键词（可选）
 */
async function loadExecutors(query?: string) {
  executorLoading.value = true
  try {
    const filter: any = {}
    if (query) {
      // 按执行器代码或名称模糊搜索
      filter.$type = 'or'
      filter.$body = [
        { $type: 'like', name: 'executorCode', value: `%${query}%` },
        { $type: 'like', name: 'executorName', value: `%${query}%` },
      ]
    }
    const res = await request.post({
      url: '/graphql',
      data: {
        query: `query {
          ExecutorDef__findList(limit: 50${query ? ', filter: $filter' : ''}) {
            executorDefId
            executorCode
            executorName
            language
          }
        }`,
        variables: query ? { filter } : undefined,
      },
    })
    // 兼容 GraphQL 响应格式
    const list = res?.ExecutorDef__findList || res || []
    executorList.value = Array.isArray(list) ? list : []
  } catch (err) {
    console.warn('[MethodBindingPanel] 加载执行器列表失败:', err)
    executorList.value = []
  } finally {
    executorLoading.value = false
  }
}

/** 远程搜索执行器 */
function handleExecutorSearch(query: string) {
  if (query) {
    loadExecutors(query)
  } else {
    loadExecutors()
  }
}

/** 执行器选择变更 */
function handleExecutorChange(executorDefId: string) {
  const executor = executorList.value.find((e) => e.executorDefId === executorDefId) || null
  // 切换执行器时清空方法选择和版本约束配置
  selectedMethodCode.value = ''
  methodList.value = []
  resetVersionConstraintDefaults()
  emit('method-change', '', null)
  // 加载新执行器下的方法列表
  if (executorDefId) {
    loadMethods(executorDefId)
  }
  // 通知父组件
  emit('executor-change', executorDefId, executor)
}

/** 清除执行器选择 */
function handleExecutorClear() {
  selectedExecutorId.value = ''
  // 同时清空方法选择和版本约束配置
  selectedMethodCode.value = ''
  methodList.value = []
  resetVersionConstraintDefaults()
  emit('method-change', '', null)
  emit('executor-change', '', null)
}

// ==================== 方法选择器 ====================

/** 当前选中的方法编码 */
const selectedMethodCode = ref<string>('')

/** 方法列表 */
const methodList = ref<ExecutorMethodItem[]>([])

/** 方法加载状态 */
const methodLoading = ref(false)

// ==================== 版本约束与执行配置 ====================

/** 版本约束类型：EXACT / RANGE / LATEST */
const versionConstraintType = ref<string>('LATEST')

/** 版本约束表达式 */
const versionConstraintExpr = ref<string>('')

/** 超时时间（毫秒），默认 30000 */
const timeoutMs = ref<number>(30000)

/** 异步执行标志 */
const asyncFlag = ref<boolean>(false)

/**
 * 加载指定执行器下的方法列表
 * 通过 ExecutorMethod__findList API 获取，按 executorRelease.executorDefId 筛选
 * @param executorDefId 执行器定义 ID
 */
async function loadMethods(executorDefId: string) {
  methodLoading.value = true
  try {
    const res = await request.post({
      url: '/graphql',
      data: {
        query: `query($filter: Map) {
          ExecutorMethod__findList(filter: $filter) {
            methodCode
            methodName
            description
          }
        }`,
        variables: {
          filter: {
            $type: 'eq',
            name: 'executorRelease.executorDefId',
            value: executorDefId,
          },
        },
      },
    })
    const list = res?.ExecutorMethod__findList || res || []
    // 按 methodCode 去重（同一执行器下可能有多个版本的同名方法）
    const seen = new Set<string>()
    const uniqueList: ExecutorMethodItem[] = []
    for (const item of (Array.isArray(list) ? list : [])) {
      if (item.methodCode && !seen.has(item.methodCode)) {
        seen.add(item.methodCode)
        uniqueList.push(item)
      }
    }
    methodList.value = uniqueList
  } catch (err) {
    console.warn('[MethodBindingPanel] 加载方法列表失败:', err)
    methodList.value = []
  } finally {
    methodLoading.value = false
  }
}

/** 方法选择变更 */
function handleMethodChange(methodCode: string) {
  const method = methodList.value.find((m) => m.methodCode === methodCode) || null
  emit('method-change', methodCode, method)
}

/** 清除方法选择 */
function handleMethodClear() {
  selectedMethodCode.value = ''
  // 重置版本约束和执行配置为默认值
  resetVersionConstraintDefaults()
  emit('method-change', '', null)
}

/** 将版本约束和执行配置重置为默认值 */
function resetVersionConstraintDefaults() {
  versionConstraintType.value = 'LATEST'
  versionConstraintExpr.value = ''
  timeoutMs.value = 30000
  asyncFlag.value = false
}

/**
 * 从当前选中元素的 extensionElements 中读取已有的绑定信息，
 * 回显执行器、方法选择状态以及版本约束和执行配置
 */
function readBindingFromElement() {
  const bo = props.element?.businessObject
  if (!bo?.extensionElements?.values) {
    selectedExecutorId.value = ''
    selectedMethodCode.value = ''
    methodList.value = []
    resetVersionConstraintDefaults()
    return
  }
  const binding = bo.extensionElements.values.find(
    (ext: any) => ext.$type === 'l:MethodBinding'
  )
  if (binding?.executorDefId) {
    selectedExecutorId.value = binding.executorDefId
    // 加载该执行器下的方法列表，以便回显方法选择
    loadMethods(binding.executorDefId)
  } else {
    selectedExecutorId.value = ''
  }
  if (binding?.methodCode) {
    selectedMethodCode.value = binding.methodCode
  } else {
    selectedMethodCode.value = ''
  }

  // 读取版本约束和执行配置
  if (binding) {
    versionConstraintType.value = binding.versionConstraintType || 'LATEST'
    versionConstraintExpr.value = binding.versionConstraintExpr || ''
    timeoutMs.value = binding.timeoutMs != null ? Number(binding.timeoutMs) : 30000
    asyncFlag.value = binding.asyncFlag === true || binding.asyncFlag === 'true'
  } else {
    resetVersionConstraintDefaults()
  }
}

/**
 * 将当前面板中的绑定配置保存到选中元素的 extensionElements 中。
 * 通过 moddle 创建 l:MethodBinding 元素，通过 modeling 服务写入。
 */
function saveBindingToElement() {
  const bo = props.element?.businessObject
  if (!bo) {
    ElMessage.warning('未选中有效的 BPMN 元素')
    return
  }
  if (!selectedMethodCode.value) {
    ElMessage.warning('请先选择要绑定的方法')
    return
  }

  try {
    const moddle = props.modeler.get('moddle')
    const modeling = props.modeler.get('modeling')

    // 创建 l:MethodBinding 扩展元素
    const bindingAttrs: Record<string, any> = {
      executorDefId: selectedExecutorId.value,
      methodCode: selectedMethodCode.value,
      versionConstraintType: versionConstraintType.value,
      versionConstraintExpr: versionConstraintExpr.value,
      timeoutMs: timeoutMs.value,
      asyncFlag: asyncFlag.value,
    }
    const methodBinding = moddle.create('l:MethodBinding', bindingAttrs)

    // 获取或创建 extensionElements
    let extensionElements = bo.extensionElements
    if (!extensionElements) {
      extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
    }

    // 移除已有的 l:MethodBinding（每个节点只保留一个绑定）
    const filteredValues = (extensionElements.values || []).filter(
      (ext: any) => ext.$type !== 'l:MethodBinding'
    )
    // 添加新的绑定元素
    filteredValues.push(methodBinding)
    extensionElements.values = filteredValues

    // 通过 modeling 服务写入 extensionElements
    modeling.updateProperties(props.element, { extensionElements })

    ElMessage.success('绑定信息已保存')
  } catch (err) {
    console.error('[MethodBindingPanel] 保存绑定信息失败:', err)
    ElMessage.error('保存绑定信息失败，请查看控制台日志')
  }
}

/**
 * 从选中元素的 extensionElements 中移除 l:MethodBinding 绑定信息，
 * 并重置面板中的选择状态。
 */
function clearBindingFromElement() {
  const bo = props.element?.businessObject
  if (!bo) {
    ElMessage.warning('未选中有效的 BPMN 元素')
    return
  }

  try {
    const modeling = props.modeler.get('modeling')
    const extensionElements = bo.extensionElements

    if (extensionElements?.values) {
      // 过滤掉 l:MethodBinding 元素
      extensionElements.values = extensionElements.values.filter(
        (ext: any) => ext.$type !== 'l:MethodBinding'
      )
      // 通过 modeling 服务更新 extensionElements
      modeling.updateProperties(props.element, { extensionElements })
    }

    // 重置面板状态
    selectedExecutorId.value = ''
    selectedMethodCode.value = ''
    methodList.value = []
    resetVersionConstraintDefaults()

    ElMessage.success('绑定信息已清除')
  } catch (err) {
    console.error('[MethodBindingPanel] 清除绑定信息失败:', err)
    ElMessage.error('清除绑定信息失败，请查看控制台日志')
  }
}

// 监听元素变化，回显已有绑定
watch(
  () => props.element,
  () => {
    readBindingFromElement()
  },
  { immediate: true }
)

// 组件挂载时加载初始执行器列表
onMounted(() => {
  loadExecutors()
})

const handleCollapse = () => {
  emit('collapse')
}

const handleExpand = () => {
  emit('expand')
}
</script>

<style lang="scss" scoped>
.method-binding-panel {
  position: relative;
  box-sizing: border-box;
  border-left: 1px solid #e4e7ed;
  background: #fff;
  overflow-y: auto;
  max-height: 100%;
  transition: width 0.25s ease;
  flex-shrink: 0;
}

.method-binding-panel--collapsed {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
  cursor: pointer;
}

.method-binding-panel__toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  color: #909399;
  &:hover {
    color: #409eff;
  }
}

.method-binding-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.method-binding-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.method-binding-panel__collapse-btn {
  cursor: pointer;
  color: #909399;
  &:hover {
    color: #409eff;
  }
}

.method-binding-panel__section {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.method-binding-panel__section-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.method-binding-panel__info-value {
  font-size: 13px;
  color: #303133;
  word-break: break-all;
}

.method-binding-panel__placeholder {
  padding: 8px 0;
}

/* Delta 变量池占位提示文字样式 */
.method-binding-panel__placeholder-text {
  font-size: 13px;
  color: #909399;
}

/* 执行器下拉选项样式 */
.method-binding-panel__executor-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.method-binding-panel__executor-code {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.method-binding-panel__executor-name {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

/* entryType 标签样式 */
.method-binding-panel__entry-type-tag {
  margin-left: 6px;
  flex-shrink: 0;
}

/* 方法下拉选项样式 */
.method-binding-panel__method-option {
  display: flex;
  flex-direction: column;
  padding: 2px 0;
}

.method-binding-panel__method-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.method-binding-panel__method-code {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.method-binding-panel__method-name {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.method-binding-panel__method-summary {
  font-size: 11px;
  color: #b0b3b8;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作按钮区域 */
.method-binding-panel__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
