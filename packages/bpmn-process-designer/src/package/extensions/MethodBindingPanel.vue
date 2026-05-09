<!-- 
  方法绑定面板组件 - Nop 平台 lProcess 扩展
  用于在 BPMN 设计器中配置任务节点的执行器方法绑定
  
  注意：此组件依赖 Nop 平台的 GraphQL API，
  在独立使用时需要提供 request 适配器
-->
<template>
  <div
    class="method-binding-panel"
    :class="{ 'method-binding-panel--collapsed': collapsed }"
    :style="{ width: collapsed ? '40px' : '360px' }"
  >
    <!-- 折叠状态 -->
    <div v-if="collapsed" class="method-binding-panel__toggle" @click="$emit('expand')">
      <el-tooltip content="展开方法绑定面板" placement="left">
        <el-icon :size="18"><DArrowLeft /></el-icon>
      </el-tooltip>
    </div>

    <!-- 展开状态 -->
    <template v-else>
      <div class="method-binding-panel__header">
        <span class="method-binding-panel__title">方法绑定</span>
        <el-icon class="method-binding-panel__collapse-btn" :size="18" @click="$emit('collapse')">
          <DArrowRight />
        </el-icon>
      </div>

      <!-- 节点信息 -->
      <div class="method-binding-panel__section">
        <div class="method-binding-panel__section-title">节点信息</div>
        <el-form label-width="80px" size="small">
          <el-form-item label="节点 ID">
            <span>{{ nodeInfo.id }}</span>
          </el-form-item>
          <el-form-item label="节点名称">
            <span>{{ nodeInfo.name || '(未命名)' }}</span>
          </el-form-item>
          <el-form-item label="节点类型">
            <el-tag size="small" type="info">{{ nodeInfo.type }}</el-tag>
          </el-form-item>
        </el-form>
      </div>

      <!-- 绑定配置 -->
      <div class="method-binding-panel__section">
        <div class="method-binding-panel__section-title">绑定配置</div>
        <el-form label-width="80px" size="small">
          <el-form-item label="执行器">
            <el-select
              v-model="bindingForm.executorDefId"
              filterable
              clearable
              placeholder="选择执行器"
              style="width: 100%"
              @change="handleExecutorChange"
            >
              <el-option
                v-for="item in executorList"
                :key="item.id"
                :label="item.label"
                :value="item.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="方法">
            <el-select
              v-model="bindingForm.methodCode"
              filterable
              clearable
              :disabled="!bindingForm.executorDefId"
              placeholder="选择方法"
              style="width: 100%"
            >
              <el-option
                v-for="item in methodList"
                :key="item.code"
                :label="item.label"
                :value="item.code"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="版本约束">
            <el-select v-model="bindingForm.versionConstraintType" style="width: 100%">
              <el-option label="LATEST（最新版本）" value="LATEST" />
              <el-option label="EXACT（精确版本）" value="EXACT" />
              <el-option label="RANGE（版本范围）" value="RANGE" />
            </el-select>
          </el-form-item>

          <el-form-item v-if="bindingForm.versionConstraintType !== 'LATEST'" label="版本表达式">
            <el-input v-model="bindingForm.versionConstraintExpr" placeholder="版本表达式" />
          </el-form-item>

          <el-form-item label="超时(ms)">
            <el-input-number
              v-model="bindingForm.timeoutMs"
              :min="0"
              :step="1000"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="异步执行">
            <el-switch v-model="bindingForm.asyncFlag" />
          </el-form-item>
        </el-form>

        <div class="method-binding-panel__actions">
          <el-button type="primary" size="small" :disabled="!bindingForm.methodCode" @click="saveBinding">
            保存绑定
          </el-button>
          <el-button type="danger" size="small" plain @click="clearBinding">
            清除绑定
          </el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type BpmnModeler from 'bpmn-js/lib/Modeler'
import type { Element } from 'bpmn-js/lib/model/Types'

defineOptions({ name: 'MethodBindingPanel' })

const props = defineProps<{
  element: Element
  modeler: BpmnModeler
  collapsed?: boolean
  /** 自定义加载执行器列表的函数 */
  loadExecutors?: () => Promise<Array<{ id: string; label: string }>>
  /** 自定义加载方法列表的函数 */
  loadMethods?: (executorId: string) => Promise<Array<{ code: string; label: string }>>
}>()

const emit = defineEmits<{
  (e: 'collapse'): void
  (e: 'expand'): void
  (e: 'binding-saved', binding: any): void
  (e: 'binding-cleared'): void
}>()

const executorList = ref<Array<{ id: string; label: string }>>([])
const methodList = ref<Array<{ code: string; label: string }>>([])

const bindingForm = reactive({
  executorDefId: '',
  methodCode: '',
  versionConstraintType: 'LATEST',
  versionConstraintExpr: '',
  timeoutMs: 30000,
  asyncFlag: false,
})

const nodeInfo = computed(() => {
  const bo = (props.element as any)?.businessObject
  return {
    id: bo?.id || '',
    name: bo?.name || '',
    type: bo?.$type || '',
  }
})

async function handleExecutorChange(executorId: string) {
  bindingForm.methodCode = ''
  methodList.value = []
  if (executorId && props.loadMethods) {
    methodList.value = await props.loadMethods(executorId)
  }
}

function readBindingFromElement() {
  const bo = (props.element as any)?.businessObject
  const ext = bo?.extensionElements?.values?.find((e: any) => e.$type === 'l:MethodBinding')
  if (ext) {
    bindingForm.executorDefId = ext.executorDefId || ''
    bindingForm.methodCode = ext.methodCode || ''
    bindingForm.versionConstraintType = ext.versionConstraintType || 'LATEST'
    bindingForm.versionConstraintExpr = ext.versionConstraintExpr || ''
    bindingForm.timeoutMs = ext.timeoutMs != null ? Number(ext.timeoutMs) : 30000
    bindingForm.asyncFlag = ext.asyncFlag === true || ext.asyncFlag === 'true'
    // 加载方法列表
    if (bindingForm.executorDefId && props.loadMethods) {
      props.loadMethods(bindingForm.executorDefId).then((list) => {
        methodList.value = list
      })
    }
  } else {
    Object.assign(bindingForm, {
      executorDefId: '',
      methodCode: '',
      versionConstraintType: 'LATEST',
      versionConstraintExpr: '',
      timeoutMs: 30000,
      asyncFlag: false,
    })
  }
}

function saveBinding() {
  if (!bindingForm.methodCode) {
    ElMessage.warning('请先选择方法')
    return
  }
  try {
    const moddle = (props.modeler as any).get('moddle')
    const modeling = (props.modeler as any).get('modeling')
    const bo = (props.element as any).businessObject

    const methodBinding = moddle.create('l:MethodBinding', { ...bindingForm })
    let extensionElements = bo.extensionElements
    if (!extensionElements) {
      extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
    }
    extensionElements.values = (extensionElements.values || []).filter(
      (e: any) => e.$type !== 'l:MethodBinding'
    )
    extensionElements.values.push(methodBinding)
    modeling.updateProperties(props.element, { extensionElements })
    ElMessage.success('绑定已保存')
    emit('binding-saved', { ...bindingForm })
  } catch (err) {
    console.error('[MethodBindingPanel] 保存失败:', err)
    ElMessage.error('保存失败')
  }
}

function clearBinding() {
  try {
    const modeling = (props.modeler as any).get('modeling')
    const bo = (props.element as any).businessObject
    const ext = bo?.extensionElements
    if (ext?.values) {
      ext.values = ext.values.filter((e: any) => e.$type !== 'l:MethodBinding')
      modeling.updateProperties(props.element, { extensionElements: ext })
    }
    Object.assign(bindingForm, {
      executorDefId: '',
      methodCode: '',
      versionConstraintType: 'LATEST',
      versionConstraintExpr: '',
      timeoutMs: 30000,
      asyncFlag: false,
    })
    ElMessage.success('绑定已清除')
    emit('binding-cleared')
  } catch (err) {
    console.error('[MethodBindingPanel] 清除失败:', err)
    ElMessage.error('清除失败')
  }
}

watch(() => props.element, readBindingFromElement, { immediate: true })

onMounted(async () => {
  if (props.loadExecutors) {
    executorList.value = await props.loadExecutors()
  }
})
</script>

<style lang="scss" scoped>
.method-binding-panel {
  border-left: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  overflow-y: auto;
  max-height: 100%;
  transition: width 0.25s ease;
  flex-shrink: 0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
}
.method-binding-panel--collapsed {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
  cursor: pointer;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.08);
}
.method-binding-panel__toggle {
  color: var(--el-text-color-secondary);
  &:hover { color: var(--el-color-primary); }
}
.method-binding-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: var(--el-border);
}
.method-binding-panel__title {
  font-size: 15px;
  font-weight: 600;
}
.method-binding-panel__collapse-btn {
  cursor: pointer;
  color: var(--el-text-color-secondary);
  &:hover { color: var(--el-color-primary); }
}
.method-binding-panel__section {
  padding: 12px 16px;
  border-bottom: var(--el-border);
}
.method-binding-panel__section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}
.method-binding-panel__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: var(--el-border);
}
</style>
