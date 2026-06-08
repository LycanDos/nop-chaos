<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { ExecutionListener } from '@/types'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory'
import {
  addExtensionElements,
  getExtensionElementsList,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'
import ListenerDrawer from '@/designer/Panel/BaseActivity/ListenerDrawer.vue'
import type { Element } from 'bpmn-js/lib/model/Types.ts'

const listeners = ref<ExecutionListener[]>([])
const listenerDrawerRef = ref<InstanceType<typeof ListenerDrawer>>()
const { getService, updateProperties, selectedElement } = useBpmnContextService()
const bpmnFactory = getService<BpmnFactory>('bpmnFactory')
const editListener = (listener?: ExecutionListener) => {
  if (listener) {
    const { element } = listener
    if (element) {
      const values: Element[] = element.get('fields')
      listener.fields = values.map((e) => {
        return {
          name: e.name,
          type: e['expression'] ? 'expression' : 'string',
          value: e['expression'] || e['string'],
          element: e,
        }
      })
    }
  }
  listenerDrawerRef.value?.openDrawer(listener)
}
const confirmListener = (listener: ExecutionListener) => {
  const { element, type, impl, event, fields } = listener
  const fieldElements =
    fields?.map((field) => {
      return bpmnFactory?.create('flowable:Field', {
        name: field.name,
        [field.type]: field.value,
      })
    }) || []
  if (element) {
    const listenerProps: Record<string, any> = {
      event: event,
      class: undefined,
      expression: undefined,
      delegateExpression: undefined,
      fields: fieldElements,
    }
    listenerProps[type] = impl
    updateProperties(listenerProps, element)
  } else {
    const listenerElement = bpmnFactory?.create('flowable:ExecutionListener', {
      event: event,
      [type]: impl,
      fields: fieldElements,
    })
    addExtensionElements(selectedElement, listenerElement)
  }
  loadExecutionListeners()
}

const removeListener = (listener: ExecutionListener) => {
  const { element } = listener
  if (bpmnFactory && selectedElement && element) {
    removeExtensionElements(selectedElement, element)
    loadExecutionListeners()
  }
}
const loadExecutionListeners = () => {
  if (selectedElement) {
    const listenerElements = getExtensionElementsList(selectedElement, 'flowable:ExecutionListener')
    listeners.value = listenerElements.map((e) => {
      return {
        event: e.event,
        type: e.class ? 'class' : e.expression ? 'expression' : 'delegateExpression',
        impl: e.class || e.expression || e.delegateExpression,
        element: e,
      }
    })
  }
}
onMounted(() => {
  loadExecutionListeners()
})
</script>

<template>
  <div class="listener-container">
    <div class="listener-header">
      <span>执行监听器</span>
      <a-button type="link" size="small" @click="editListener()"><PlusOutlined />添加</a-button>
    </div>
    <a-table :data-source="listeners" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="impl">
      <a-table-column data-index="event" title="事件" />
      <a-table-column data-index="type" title="类型" :ellipsis="true" />
      <a-table-column data-index="impl" title="监听" :ellipsis="true" />
      <a-table-column title="操作" width="72" align="center">
        <template #default="{ record }">
          <a-space>
            <a-button type="link" size="small" @click="editListener(record)"><EditOutlined /></a-button>
            <a-popconfirm title="您确定要删除该事件吗？" @confirm="removeListener(record)">
              <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table-column>
    </a-table>
    <ListenerDrawer ref="listenerDrawerRef" title="执行监听器" @confirm="confirmListener">
      <template #eventOptions>
        <a-radio-button value="start">开始</a-radio-button>
        <a-radio-button value="enable">启用</a-radio-button>
        <a-radio-button value="end">结束</a-radio-button>
      </template>
    </ListenerDrawer>
  </div>
</template>

<style scoped lang="scss">
.listener-container {
  .listener-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 8px;
    color: var(--bpd-text-color, #262626);
    font-weight: 600;
  }
}
</style>
