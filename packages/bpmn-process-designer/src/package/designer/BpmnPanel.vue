<script setup lang="ts">
/**
 * BpmnPanel - BPMN 属性面板
 * 根据选中元素类型显示对应的属性编辑面板
 */
import { computed, onMounted, shallowRef } from 'vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import type { Element } from 'bpmn-js/lib/model/Types'
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry'
import type EventBus from 'diagram-js/lib/core/EventBus'
import type Canvas from 'diagram-js/lib/core/Canvas'
import { debounce, find } from 'min-dash'
import type { RootLike } from 'diagram-js/lib/model/Types'
import type { Injector } from 'didi'
import { useBpmnContextService } from '../hooks/useService'
import { getBusinessObject, is } from 'bpmn-js/lib/util/ModelUtil'
import { isEventDefinition } from './utils/EventDefinitionUtil'
import { isConditionalSource } from './utils/ElementUtil'

// 面板子组件
import BaseActivity from './Panel/BaseActivity/index.vue'
import UserTask from './Panel/UserTask/index.vue'
import TaskListener from './Panel/UserTask/TaskListener.vue'
import Process from './Panel/Process/index.vue'
import ServiceTask from './Panel/ServiceTask/index.vue'
import CallActivity from './Panel/CallActivity/index.vue'
import HttpTask from './Panel/HttpTask/index.vue'
import ScriptTask from './Panel/ScriptTask/index.vue'
import BusinessRuleTask from './Panel/BusinessRuleTask/index.vue'
import SequenceFlow from './Panel/SequenceFlow/index.vue'
import StartEvent from './Panel/StartEvent/index.vue'
import EventListener from './Panel/Process/EventListener.vue'
import DataObjects from './Panel/Process/DataObjects.vue'
import CamelTask from './Panel/CamelTask/index.vue'
import ShellTask from './Panel/ShellTask/index.vue'
import EmailTask from './Panel/EmailTask/index.vue'
import MuleTask from './Panel/MuleTask/index.vue'
import JumpTask from './Panel/JumpTask/index.vue'
import CcTask from './Panel/CcTask/index.vue'
import ExternalTask from './Panel/ExternalTask/index.vue'
import DecisionTask from './Panel/DecisionTask/index.vue'
import Advanced from './Panel/BaseActivity/Advanced.vue'
import ExecutorTask from './Panel/ExecutorTask/index.vue'
import SkinConfig from './Panel/SkinConfig/index.vue'

defineOptions({ name: 'BpmnPanel' })

const props = defineProps<{ modeler: BpmnModeler }>()
const eventBus = props.modeler.get<EventBus>('eventBus')
const canvas = props.modeler.get<Canvas>('canvas')
const injector = props.modeler.get<Injector>('injector')
const elementRegistry = props.modeler.get<ElementRegistry>('elementRegistry')

const selectedElement = shallowRef<Element>()

// 计算当前元素的面板类型
const panelType = computed(() => {
  const el = selectedElement.value
  if (!el) return 'none'
  try {
    const bo = getBusinessObject(el)
    if (!bo) return 'base'

    if (is(el, 'bpmn:UserTask')) return 'userTask'
    if (is(el, 'bpmn:ServiceTask')) {
      // 根据 businessObject.type 区分连接器子类型
      const t = bo.type
      if (t === 'http') return 'httpTask'
      if (t === 'camel') return 'camelTask'
      if (t === 'shell') return 'shellTask'
      if (t === 'email') return 'emailTask'
      if (t === 'external-worker') return 'externalTask'
      if (t === 'dmn') return 'decisionTask'
      if (t === 'mule') return 'muleTask'
      if (t === 'jump') return 'jumpTask'
      if (t === 'cc') return 'ccTask'
      if (t === 'executor') return 'executorTask'
      return 'serviceTask'
    }
    if (is(el, 'bpmn:ScriptTask')) return 'scriptTask'
    if (is(el, 'bpmn:CallActivity')) return 'callActivity'
    if (is(el, 'bpmn:BusinessRuleTask')) return 'businessRuleTask'
    if (is(el, 'bpmn:StartEvent')) return 'startEvent'
    if (is(el, 'bpmn:Process')) return 'process'
    if (is(el, 'bpmn:SequenceFlow') && isConditionalSource(bo.sourceRef)) return 'sequenceFlow'
  } catch (e) {
    console.warn('[BpmnPanel] panelType error:', e)
  }
  return 'base'
})

// === 事件监听 ===
eventBus.on('selection.changed', (e: { newSelection: Element[] }) => {
  const { newSelection = [] } = e
  const newElement = newSelection[0]
  const rootElement = canvas.getRootElement()
  if (isImplicitRoot(rootElement)) return
  _update(newElement || rootElement)
})
eventBus.on('elements.changed', (e: any) => {
  if (selectedElement.value) {
    const updatedElement = find(e.elements, (el: Element) => el === selectedElement.value)
    if (updatedElement && elementRegistry.get(updatedElement.id)) {
      useBpmnContextService({ selectedElement: updatedElement, injector })
    }
  }
})
eventBus.on('root.added', (e: any) => {
  let element = e.element || canvas.getRootElement()
  if (!isImplicitRoot(element)) _update(element)
})
eventBus.on('replace.end', (e: any) => {
  if (e.element && e.newElement) _update(e.newElement)
})

const _update = debounce((element: Element) => {
  if (!element) return
  let el = element
  if (el.type === 'label') el = el.labelTarget || element
  if (!el) return
  selectedElement.value = el
  useBpmnContextService({ selectedElement: el, injector })
}, 100)

const isImplicitRoot = (element: RootLike) => element && element.isImplicit

onMounted(() => {
  const selection = props.modeler.get<any>('selection')
  const selected = selection?.get?.()?.[0]
  const rootElement = canvas.getRootElement()
  if (selected) {
    _update(selected)
  } else if (!isImplicitRoot(rootElement)) {
    _update(rootElement as Element)
  }
})
</script>

<template>
  <div class="panel-container" v-if="panelType !== 'none'">
    <el-form v-bind="$attrs" label-width="110px">
      <!-- 流程级别面板 -->
      <BaseActivity v-if="panelType === 'process'">
        <template #basic>
          <Process />
        </template>
        <template #other>
          <EventListener />
          <DataObjects />
        </template>
      </BaseActivity>

      <!-- 用户任务面板 -->
      <BaseActivity v-else-if="panelType === 'userTask'">
        <template #basic>
          <UserTask />
          <Advanced />
        </template>
        <template #other>
          <SkinConfig />
          <TaskListener />
        </template>
      </BaseActivity>

      <!-- 服务任务面板 -->
      <BaseActivity v-else-if="panelType === 'serviceTask'">
        <template #basic>
          <ServiceTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- HTTP 任务面板 -->
      <BaseActivity v-else-if="panelType === 'httpTask'">
        <template #basic>
          <HttpTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- Camel 任务面板 -->
      <BaseActivity v-else-if="panelType === 'camelTask'">
        <template #basic>
          <CamelTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- Shell 任务面板 -->
      <BaseActivity v-else-if="panelType === 'shellTask'">
        <template #basic>
          <ShellTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- Email 任务面板 -->
      <BaseActivity v-else-if="panelType === 'emailTask'">
        <template #basic>
          <EmailTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 外部任务面板 -->
      <BaseActivity v-else-if="panelType === 'externalTask'">
        <template #basic>
          <ExternalTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 决策任务面板 -->
      <BaseActivity v-else-if="panelType === 'decisionTask'">
        <template #basic>
          <DecisionTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- Mule 任务面板 -->
      <BaseActivity v-else-if="panelType === 'muleTask'">
        <template #basic>
          <MuleTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 跳转任务面板 -->
      <BaseActivity v-else-if="panelType === 'jumpTask'">
        <template #basic>
          <JumpTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 抄送任务面板 -->
      <BaseActivity v-else-if="panelType === 'ccTask'">
        <template #basic>
          <CcTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 执行器任务面板 -->
      <BaseActivity v-else-if="panelType === 'executorTask'">
        <template #basic>
          <ExecutorTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 脚本任务面板 -->
      <BaseActivity v-else-if="panelType === 'scriptTask'">
        <template #basic>
          <ScriptTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 调用活动面板 -->
      <BaseActivity v-else-if="panelType === 'callActivity'">
        <template #basic>
          <CallActivity />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 业务规则任务面板 -->
      <BaseActivity v-else-if="panelType === 'businessRuleTask'">
        <template #basic>
          <BusinessRuleTask />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 开始事件面板 -->
      <BaseActivity v-else-if="panelType === 'startEvent'">
        <template #general>
          <StartEvent />
        </template>
        <template #basic>
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 序列流面板 -->
      <BaseActivity v-else-if="panelType === 'sequenceFlow'">
        <template #basic>
          <SequenceFlow />
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>

      <!-- 默认面板（其他元素类型） -->
      <BaseActivity v-else>
        <template #basic>
          <Advanced />
          <SkinConfig />
        </template>
      </BaseActivity>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
.panel-container {
  height: 100%;
  overflow-y: auto;
}
:deep {
  .el-form, .el-tabs, .el-tab-pane { height: 100%; }
  .el-collapse { height: calc(100% - 2px); }
  .el-tabs__header { margin: 0; }
}
</style>
