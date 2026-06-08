<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue'
import MessageEventDrawer from './MessageEventDrawer.vue'
import ErrorEventDrawer from './ErrorEventDrawer.vue'
import SignalEventDrawer from './SignalEventDrawer.vue'
import EscalationEventDrawer from './EscalationEventDrawer.vue'
import {
  createOrUpdateRootElement,
  findRootElementsByType,
  removeRootElement,
} from '@/designer/utils/ElementUtil.ts'
import { useBpmnContextService } from '@/hooks/useService.ts'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import type { ErrorEvent, EscalationEvent, MessageEvent, SignalEvent } from '@/types'

const { selectedElement } = useBpmnContextService()
const messages = ref<MessageEvent[]>([])
const errors = ref<ErrorEvent[]>([])
const signals = ref<SignalEvent[]>([])
const escalations = ref<EscalationEvent[]>([])
const messageEventDrawerRef = ref<InstanceType<typeof MessageEventDrawer>>()
const errorEventDrawerRef = ref<InstanceType<typeof ErrorEventDrawer>>()
const signalEventDrawerRef = ref<InstanceType<typeof SignalEventDrawer>>()
const escalationEventDrawerRef = ref<InstanceType<typeof EscalationEventDrawer>>()
const addMessageEvent = (message?: MessageEvent) => {
  messageEventDrawerRef.value?.openDrawer(message)
}
const removeMessageEvent = (message: MessageEvent) => {
  if (message.element) {
    removeRootElement(message.element)
  }
  // removeEventDefinition(message.id, 'bpmn:Message')
  loadEvents()
}
const addErrorEvent = (error?: ErrorEvent) => {
  errorEventDrawerRef.value?.openDrawer(error)
}
const removeErrorEvent = (error: ErrorEvent) => {
  if (error.element) {
    removeRootElement(error.element)
  }
  // removeEventDefinition(error.id, 'bpmn:Error')
  loadEvents()
}
const addSignalEvent = (signal?: SignalEvent) => {
  signalEventDrawerRef.value?.openDrawer(signal)
}
const removeSignalEvent = (signal: SignalEvent) => {
  if (signal.element) {
    removeRootElement(signal.element)
  }
  // removeEventDefinition(signal.id, 'bpmn:Signal')
  loadEvents()
}
const addEscalationEvent = (escalation?: EscalationEvent) => {
  escalationEventDrawerRef.value?.openDrawer(escalation)
}
const removeEscalationEvent = (escalation: EscalationEvent) => {
  if (escalation.element) {
    removeRootElement(escalation.element)
  }
  // removeEventDefinition(escalation.id, 'bpmn:Escalation')
  loadEvents()
}
const confirmMessageEvent = (messageEvent: MessageEvent) => {
  const { element, ...properties } = messageEvent
  createOrUpdateRootElement(properties, element ? element : 'bpmn:Message')
  // createOrUpdateEventDefinition(properties, 'bpmn:Message')
  loadEvents()
}
const confirmErrorEvent = (errorEvent: ErrorEvent) => {
  const { element, ...properties } = errorEvent
  createOrUpdateRootElement(properties, element ? element : 'bpmn:Error')
  // createOrUpdateEventDefinition(properties, 'bpmn:Error')
  loadEvents()
}
const confirmEscalationEvent = (escalationEvent: EscalationEvent) => {
  const { element, ...properties } = escalationEvent
  createOrUpdateRootElement(properties, element ? element : 'bpmn:Escalation')
  // createOrUpdateEventDefinition(properties, 'bpmn:Escalation')
  loadEvents()
}
const confirmSignalEvent = (signalEvent: SignalEvent) => {
  const { element, ...properties } = signalEvent
  createOrUpdateRootElement(properties, element ? element : 'bpmn:Signal')
  // createOrUpdateEventDefinition(properties, 'bpmn:Signal')
  loadEvents()
}
const loadEvents = () => {
  const businessObject = getBusinessObject(selectedElement)
  const messageElements = findRootElementsByType(businessObject, 'bpmn:Message')
  messages.value = messageElements.map((item) => {
    return {
      id: item.id,
      name: item.name,
      element: item,
    }
  })
  const errorElements = findRootElementsByType(businessObject, 'bpmn:Error')
  errors.value = errorElements.map((item) => {
    return {
      id: item.id,
      name: item.name,
      errorCode: item.errorCode,
      element: item,
    }
  })
  const signalElements = findRootElementsByType(businessObject, 'bpmn:Signal')
  signals.value = signalElements.map((item) => {
    return {
      id: item.get('id'),
      name: item.get('name'),
      'flowable:scope': item.get('flowable:scope'),
      element: item,
    }
  })
  const escalationElements = findRootElementsByType(businessObject, 'bpmn:Escalation')
  escalations.value = escalationElements.map((item) => {
    return {
      id: item.id,
      name: item.name,
      escalationCode: item.escalationCode,
      element: item,
    }
  })
}
onMounted(() => {
  loadEvents()
})
</script>

<template>
  <a-tab-pane tab="全局事件" key="globalEvents">
    <div style="overflow:auto">
      <MessageEventDrawer ref="messageEventDrawerRef" @confirm="confirmMessageEvent" />
      <ErrorEventDrawer ref="errorEventDrawerRef" @confirm="confirmErrorEvent" />
      <SignalEventDrawer ref="signalEventDrawerRef" @confirm="confirmSignalEvent" />
      <EscalationEventDrawer ref="escalationEventDrawerRef" @confirm="confirmEscalationEvent" />
      <div class="events-list">
        <div class="events-container">
          <div class="events-header">
            <span>消息定义</span>
            <a-button type="link" size="small" @click="addMessageEvent()"><PlusOutlined />添加</a-button>
          </div>
          <a-table :data-source="messages" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="id">
            <a-table-column data-index="id" title="id" :ellipsis="true" />
            <a-table-column data-index="name" title="名称" :ellipsis="true" />
            <a-table-column title="操作" width="72" align="center">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click="addMessageEvent(record)"><EditOutlined /></a-button>
                  <a-popconfirm title="您确定要删除该事件吗？" @confirm="removeMessageEvent(record)">
                    <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </div>

        <div class="events-container">
          <div class="events-header">
            <span>错误定义</span>
            <a-button type="link" size="small" @click="addErrorEvent()"><PlusOutlined />添加</a-button>
          </div>
          <a-table :data-source="errors" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="id">
            <a-table-column data-index="id" title="id" :ellipsis="true" />
            <a-table-column data-index="name" title="名称" :ellipsis="true" />
            <a-table-column title="操作" width="72" align="center">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click="addErrorEvent(record)"><EditOutlined /></a-button>
                  <a-popconfirm title="您确定要删除该事件吗？" @confirm="removeErrorEvent(record)">
                    <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </div>

        <div class="events-container">
          <div class="events-header">
            <span>信号定义</span>
            <a-button type="link" size="small" @click="addSignalEvent()"><PlusOutlined />添加</a-button>
          </div>
          <a-table :data-source="signals" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="id">
            <a-table-column data-index="id" title="id" :ellipsis="true" />
            <a-table-column data-index="name" title="名称" :ellipsis="true" />
            <a-table-column title="操作" width="72" align="center">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click="addSignalEvent(record)"><EditOutlined /></a-button>
                  <a-popconfirm title="您确定要删除该事件吗？" @confirm="removeSignalEvent(record)">
                    <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </div>

        <div class="events-container">
          <div class="events-header">
            <span>升级定义</span>
            <a-button type="link" size="small" @click="addEscalationEvent()"><PlusOutlined />添加</a-button>
          </div>
          <a-table :data-source="escalations" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="id">
            <a-table-column data-index="id" title="id" :ellipsis="true" />
            <a-table-column data-index="name" title="名称" :ellipsis="true" />
            <a-table-column title="操作" width="72" align="center">
              <template #default="{ record }">
                <a-space>
                  <a-button type="link" size="small" @click="addEscalationEvent(record)"><EditOutlined /></a-button>
                  <a-popconfirm
                    title="您确定要删除该事件吗？"
                    @confirm="removeEscalationEvent(record)"
                  >
                    <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </div>
      </div>
    </div>
  </a-tab-pane>
</template>

<style scoped lang="scss">
.events-list {
  height: 100%;
  padding: 8px 0;

  .events-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 8px;
    color: var(--bpd-text-color, #262626);
    font-weight: 600;
  }

  .events-container {
    margin-bottom: 15px;
  }
}
</style>
