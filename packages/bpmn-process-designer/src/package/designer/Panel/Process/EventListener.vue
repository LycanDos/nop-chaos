<script setup lang="ts">
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { onMounted, ref } from 'vue'
import type { AnyEventListener } from '@/types'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory'
import {
  addExtensionElements,
  getExtensionElementsList,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'
import EventListenerDrawer from '@/designer/Panel/Process/EventListenerDrawer.vue'

const { getService, updateProperties, selectedElement } = useBpmnContextService()
const bpmnFactory = getService<BpmnFactory>('bpmnFactory')
const events = ref<AnyEventListener[]>([])
const eventListenerDrawerRef = ref<InstanceType<typeof EventListenerDrawer>>()
const editEventListener = (eventListener?: AnyEventListener) => {
  eventListenerDrawerRef.value?.openDrawer(eventListener)
}
const removeEventListener = (eventListener: AnyEventListener) => {
  const { element } = eventListener
  if (element) {
    removeExtensionElements(selectedElement, element)
  }
  loadEventListeners()
}
const confirmEventListener = (eventListener: AnyEventListener) => {
  const { element, events } = eventListener
  const properties: Record<string, any> = {
    events: events,
    entityType: undefined,
    class: undefined,
    delegateExpression: undefined,
    messageName: undefined,
    errorCode: undefined,
    signalName: undefined,
    throwEvent: undefined,
  }
  if ('throwEvent' in eventListener) {
    properties.throwEvent = eventListener.throwEvent
    properties[eventListener.type] = eventListener.value
  } else {
    properties.entityType = eventListener.entityType
    properties[eventListener.type] = eventListener.value
  }
  if (element) {
    updateProperties(properties, element)
  } else {
    const eventListenerElement = bpmnFactory?.create('flowable:EventListener', properties)
    addExtensionElements(selectedElement, eventListenerElement)
  }
  loadEventListeners()
}
const loadEventListeners = () => {
  const listenerElements = getExtensionElementsList(selectedElement, 'flowable:EventListener')
  events.value = listenerElements.map((e) => {
    const throwEvent = e.get('throwEvent')
    if (throwEvent) {
      const type = e.get('messageName')
        ? 'messageName'
        : e.get('errorCode')
          ? 'errorCode'
          : 'signalName'
      return {
        events: e.get('events'),
        rethrowEvent: true,
        element: e,
        throwEvent: throwEvent,
        type: type,
        value: e.get(type),
      }
    } else {
      const type = e.get('class') ? 'class' : 'delegateExpression'
      return {
        events: e.get('events'),
        rethrowEvent: false,
        element: e,
        type: type,
        value: e.get(type),
        entityType: e.get('entityType'),
      }
    }
  })
}
onMounted(() => {
  loadEventListeners()
})
</script>

<template>
  <div class="event-container">
    <div class="event-header">
      <span>事件监听器</span>
      <a-button type="link" size="small" @click="editEventListener()"><PlusOutlined />添加</a-button>
    </div>
    <a-table :data-source="events" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="value">
      <a-table-column data-index="events" title="事件" :ellipsis="true" />
      <a-table-column data-index="type" title="类型" :ellipsis="true" />
      <a-table-column data-index="value" title="监听" :ellipsis="true" />
      <a-table-column title="操作" width="72" align="center">
        <template #default="{ record }">
          <a-space>
            <a-button type="link" size="small" @click="editEventListener(record)"><EditOutlined /></a-button>
            <a-popconfirm title="您确定要删除该事件吗？" @confirm="removeEventListener(record)">
              <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table-column>
    </a-table>
    <EventListenerDrawer ref="eventListenerDrawerRef" @confirm="confirmEventListener" />
  </div>
</template>

<style scoped lang="scss">
.event-container {
  .event-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 8px;
    color: var(--bpd-text-color, #262626);
    font-weight: 600;
  }
}
</style>
