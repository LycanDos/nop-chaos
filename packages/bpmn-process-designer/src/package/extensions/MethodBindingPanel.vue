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
    <div v-if="collapsed" class="method-binding-panel__toggle" @click="$emit('expand')" title="展开方法绑定面板">
      ◀
    </div>

    <!-- 展开状态 -->
    <template v-else>
      <div class="method-binding-panel__header">
        <span class="method-binding-panel__title">方法绑定</span>
        <span class="method-binding-panel__collapse-btn" @click="$emit('collapse')">▶</span>
      </div>

      <!-- 节点信息 -->
      <div class="method-binding-panel__section">
        <div class="method-binding-panel__section-title">节点信息</div>
        <a-form size="small" layout="vertical">
          <a-form-item label="节点 ID">
            <span>{{ nodeInfo.id }}</span>
          </a-form-item>
          <a-form-item label="节点名称">
            <span>{{ nodeInfo.name || '(未命名)' }}</span>
          </a-form-item>
          <a-form-item label="节点类型">
            <a-tag size="small" color="blue">{{ nodeInfo.type }}</a-tag>
          </a-form-item>
        </a-form>
      </div>

      <!-- 绑定配置 -->
      <div class="method-binding-panel__section">
        <div class="method-binding-panel__section-title">绑定配置</div>
        <a-form size="small" layout="vertical">
          <a-form-item label="执行器">
            <a-select
              v-model:value="bindingForm.executorDefId"
              showSearch
              allowClear
              placeholder="选择执行器"
              style="width: 100%"
              option-label-prop="label"
              @change="handleExecutorChange"
            >
              <a-select-option
                v-for="item in executorList"
                :key="item.id"
                :label="item.label"
                :value="item.id"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="方法">
            <a-select
              v-model:value="bindingForm.methodCode"
              showSearch
              allowClear
              :disabled="!bindingForm.executorDefId"
              placeholder="选择方法"
              style="width: 100%"
              option-label-prop="label"
            >
              <a-select-option
                v-for="item in methodList"
                :key="item.code"
                :label="item.label"
                :value="item.code"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="版本约束">
            <a-select v-model:value="bindingForm.versionConstraintType" style="width: 100%">
              <a-select-option value="LATEST">LATEST（最新版本）</a-select-option>
              <a-select-option value="EXACT">EXACT（精确版本）</a-select-option>
              <a-select-option value="RANGE">RANGE（版本范围）</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item v-if="bindingForm.versionConstraintType !== 'LATEST'" label="版本表达式">
            <a-input v-model:value="bindingForm.versionConstraintExpr" placeholder="版本表达式" />
          </a-form-item>

          <a-form-item label="超时(ms)">
            <a-input-number
              v-model:value="bindingForm.timeoutMs"
              :min="0"
              :step="1000"
              
              style="width: 100%"
            />
          </a-form-item>

          <a-form-item label="异步执行">
            <a-switch v-model:checked="bindingForm.asyncFlag" />
          </a-form-item>
        </a-form>

        <div class="method-binding-panel__actions">
          <a-button type="primary" size="small" :disabled="!bindingForm.methodCode" @click="saveBinding">
            保存绑定
          </a-button>
          <a-button danger size="small" ghost @click="clearBinding">
            清除绑定
          </a-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
// (Element Plus 已移除 — 图标替换为 Unicode 字符，消息使用 console.warn/error)
function notify(msg: string, type?: string) { console.log(`[MethodBinding] ${msg}`) }
function warn(msg: string) { console.warn(`[MethodBinding] ${msg}`) }
function error(msg: string) { console.error(`[MethodBinding] ${msg}`) }
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
    warn('请先选择方法')
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
    notify('绑定已保存')
    emit('binding-saved', { ...bindingForm })
  } catch (err) {
    console.error('[MethodBindingPanel] 保存失败:', err)
    error('保存失败')
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
    notify('绑定已清除')
    emit('binding-cleared')
  } catch (err) {
    console.error('[MethodBindingPanel] 清除失败:', err)
    error('清除失败')
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
  border-left: 1px solid var(--bpd-border-color-split, #f0f0f0);
  background: var(--bpd-container-bg, #fff);
  overflow-y: auto;
  max-height: 100%;
  transition: width 0.25s ease;
  flex-shrink: 0;
  box-shadow: -6px 0 16px -16px rgba(0, 0, 0, 0.3);
}
.method-binding-panel--collapsed {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
  cursor: pointer;
  box-shadow: var(--bpd-shadow, -4px 0 12px rgba(0, 0, 0, 0.08));
}
.method-binding-panel__toggle {
  color: var(--bpd-text-color-tertiary, #8c8c8c);
  &:hover { color: var(--bpd-primary-color, #1890ff); }
}
.method-binding-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--bpd-border-color-split, #f0f0f0);
}
.method-binding-panel__title {
  font-size: 15px;
  font-weight: 600;
}
.method-binding-panel__collapse-btn {
  cursor: pointer;
  color: var(--bpd-text-color-tertiary, #8c8c8c);
  &:hover { color: var(--bpd-primary-color, #1890ff); }
}
.method-binding-panel__section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--bpd-border-color-split, #f0f0f0);
}
.method-binding-panel__section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--bpd-text-color-secondary, #595959);
  margin-bottom: 8px;
}
.method-binding-panel__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--bpd-border-color-split, #f0f0f0);
}
</style>
