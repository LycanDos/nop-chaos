<script setup lang="ts">
import {
  findRootElementById,
  findRootElementsByType,
} from '@/designer/utils/ElementUtil.ts'
import { customRef, onMounted, ref } from 'vue'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type { MessageEvent } from '@/types'
import {
  createOrUpdateEventDefinition,
  getMessageEventDefinition,
} from '@/designer/utils/EventDefinitionUtil.ts'
import MessageEventDrawer from '../Process/MessageEventDrawer.vue'
import { PlusOutlined } from '@ant-design/icons-vue'

defineOptions({
  name: 'MessageEvent',
})

const { selectedElement, updateProperties } = useBpmnContextService()
const messageRef = customRef<string>((track, trigger) => {
  return {
    get() {
      track()
      const messageEventDefinition = getMessageEventDefinition(selectedElement)
      return messageEventDefinition.messageRef?.id
    },
    set(newValue: string) {
      const messageEventDefinition = getMessageEventDefinition(selectedElement)
      const messageRef = findRootElementById(messageEventDefinition, 'bpmn:Message', newValue)
      if (messageRef) {
        updateProperties(
          {
            messageRef: messageRef,
          },
          messageEventDefinition,
        )
      }
      trigger()
    },
  }
})

const messageEventDrawerRef = ref<InstanceType<typeof MessageEventDrawer>>()
const messages = ref<MessageEvent[]>([])
const addMessageEvent = () => {
  messageEventDrawerRef.value?.openDrawer()
}
const confirmMessageEvent = (properties: MessageEvent) => {
  createOrUpdateEventDefinition(properties, 'bpmn:Message')
  loadEvents()
}
const loadEvents = () => {
  const businessObject = getBusinessObject(selectedElement)
  const messageElements = findRootElementsByType(businessObject, 'bpmn:Message')
  messages.value = messageElements.map((item) => {
    return {
      id: item.id,
      name: item.name,
    }
  })
}
onMounted(() => {
  loadEvents()
})
</script>

<template>
  <a-collapse-panel key="arg1" header="消息事件">
    <a-form-item prop="messageRef" label="消息引用">
      <a-select v-model:value="messageRef" placeholder="请选择消息引用">
        <a-select-option
          v-for="item in messages"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        ></a-select-option>
        <template #footer>
          <a-button
            text
            bg
            size="small"
            style="width: 100%"
            :icon="PlusOutlined"
            @click="addMessageEvent()"
            >新增消息定义</a-button
          >
        </template>
      </a-select>
    </a-form-item>
    <MessageEventDrawer ref="messageEventDrawerRef" @confirm="confirmMessageEvent" />
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
