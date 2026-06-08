<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import { cloneDeep } from 'lodash-es'
import type { AnyEventListener, Event } from '@/types'
import { useBpmnContextService } from '@/hooks/useService.ts'
import {
  getErrorEvents,
  getMessageEvents,
  getSignalEvents,
} from '@/designer/utils/EventDefinitionUtil.ts'
import type { Element } from 'bpmn-js/lib/model/Types.ts'

const emits = defineEmits<{
  (e: 'confirm', data: AnyEventListener): void
}>()
const formSize = useFormSize()
const { selectedElement } = useBpmnContextService()
const { cloned, sync } = useCloned<AnyEventListener>({
  events: [],
  rethrowEvent: false,
  type: 'class',
  value: undefined,
  entityType: '',
})
const formRef = ref<FormInstance>()
const drawerVisible = ref(false)
const throwEvents = ref<Event[]>([])
const fieldValueRule = ref<FormItemRule>({
  trigger: 'blur',
  required: true,
  validator(_, value, callback) {
    if (!value) {
      return callback('请输入监听器')
    }
    if (cloned.value.type === 'delegateExpression') {
      const reg = /^\$\{.*\}$/
      if (!reg.test(value)) {
        return callback('请输入正确的监听器，必须是 ${xx} 格式')
      }
    } else if (cloned.value.type === 'class') {
      const reg = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/
      if (!reg.test(value)) {
        return callback('请输入正确的java类路径，必须是 com.xx.xx 格式')
      }
    }
    callback()
  },
})
const openDrawer = (eventListener?: AnyEventListener) => {
  if (eventListener) {
    cloned.value = cloneDeep(eventListener)
    cloned.value.element = eventListener.element
    if ('throwEvent' in cloned.value) {
      loadEventOptions(cloned.value.throwEvent)
    }
  }
  drawerVisible.value = true
}
const handleConfirm = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      emits('confirm', cloned.value)
      drawerVisible.value = false
    }
  })
}
const changeRethrowEvent = (rethrowEvent: boolean) => {
  if (rethrowEvent) {
    cloned.value = {
      events: cloned.value.events,
      element: cloned.value.element,
      rethrowEvent: rethrowEvent,
      throwEvent: 'message',
      type: 'messageName',
      value: undefined,
    }
    changeThrowEvent('message')
  } else {
    cloned.value = {
      events: cloned.value.events,
      element: cloned.value.element,
      rethrowEvent: rethrowEvent,
      type: 'class',
      value: undefined,
      entityType: '',
    }
  }
}
const changeThrowEvent = (val: string) => {
  cloned.value.value = undefined
  loadEventOptions(val)
}

const loadEventOptions = (val: string) => {
  if (val === 'message') {
    throwEvents.value = toOptions(getMessageEvents(selectedElement))
  } else if (val === 'error') {
    throwEvents.value = toOptions(getErrorEvents(selectedElement))
  } else if (val === 'signal') {
    const events = getSignalEvents(selectedElement)
    throwEvents.value = toOptions(
      events.filter((e) => e.get('flowable:scope') === 'processInstance'),
    )
  } else if (val === 'globalSignal') {
    const events = getSignalEvents(selectedElement)
    throwEvents.value = toOptions(events.filter((e) => e.get('flowable:scope') === 'global'))
  } else {
    throwEvents.value = []
  }
}

const toOptions = (elements: Element[]) => {
  return elements.map((item) => {
    return {
      id: item.id,
      name: item.name,
    }
  })
}

const onClosed = () => {
  sync()
  formRef.value?.clearValidate()
}
defineExpose({
  openDrawer,
})
</script>

<template>
  <a-drawer v-model:visible="drawerVisible" width="560px" :closable="false" @close="onClosed">
    <a-form ref="formRef" layout="vertical" :model="cloned" :size="formSize">
      <a-form-item label="事件类型" prop="events" :rules="{ required: true, message: '请选择事件类型', trigger: 'change' }">
        <a-select
          v-model:value="cloned.events"
          multiple
          collapse-tags
          :max-collapse-tags="4"
          placeholder="请选择事件类型"
        >
          <a-select-option value="PROCESS_CREATED">PROCESS_CREATED（流程实例已创建）</a-select-option>
          <a-select-option value="PROCESS_STARTED">PROCESS_STARTED（流程实例已启动）</a-select-option>
          <a-select-option value="PROCESS_COMPLETED">PROCESS_COMPLETED（流程实例完成）</a-select-option>
          <a-select-option value="PROCESS_CANCELLED">PROCESS_CANCELLED（流程实例被取消）</a-select-option>
          <a-select-option value="PROCESS_COMPLETED_WITH_TERMINATE_END_EVENT">PROCESS_COMPLETED_WITH_TERMINATE_END_EVENT（流程实例到达终止结束事件）</a-select-option>
          <a-select-option value="TASK_ASSIGNED">TASK_ASSIGNED（任务已分配人员）</a-select-option>
          <a-select-option value="TASK_CREATED">TASK_CREATED（任务已创建）</a-select-option>
          <a-select-option value="TASK_COMPLETED">TASK_COMPLETED（任务已完成）</a-select-option>
          <a-select-option value="MULTI_INSTANCE_ACTIVITY_STARTED">MULTI_INSTANCE_ACTIVITY_STARTED（多实例活动已启动）</a-select-option>
          <a-select-option value="MULTI_INSTANCE_ACTIVITY_COMPLETED">MULTI_INSTANCE_ACTIVITY_COMPLETED（多实例活动已完成）</a-select-option>
          <a-select-option value="MULTI_INSTANCE_ACTIVITY_CANCELLED">MULTI_INSTANCE_ACTIVITY_CANCELLED（多实例活动已取消）</a-select-option>
          <a-select-option value="VARIABLE_CREATED">VARIABLE_CREATED（变量已创建）</a-select-option>
          <a-select-option value="VARIABLE_UPDATED">VARIABLE_UPDATED（变量已更新）</a-select-option>
          <a-select-option value="VARIABLE_DELETED">VARIABLE_DELETED（变量已删除）</a-select-option>
          <a-select-option value="ENTITY_CREATED">ENTITY_CREATED（实体已创建）</a-select-option>
          <a-select-option value="ENGINE_CREATED">ENGINE_CREATED（发动机创建）</a-select-option>
          <a-select-option value="ENGINE_CLOSED">ENGINE_CLOSED（发动机关闭）</a-select-option>
          <a-select-option value="ENTITY_INITIALIZED">ENTITY_INITIALIZED（实体已初始化）</a-select-option>
          <a-select-option value="ENTITY_UPDATED">ENTITY_UPDATED（实体已更新）</a-select-option>
          <a-select-option value="ENTITY_DELETED">ENTITY_DELETED（实体已删除）</a-select-option>
          <a-select-option value="ENTITY_SUSPENDED">ENTITY_SUSPENDED（实体被暂停）</a-select-option>
          <a-select-option value="ENTITY_ACTIVATED">ENTITY_ACTIVATED（实体已激活）</a-select-option>
          <a-select-option value="JOB_EXECUTION_SUCCESS">JOB_EXECUTION_SUCCESS（作业执行成功）</a-select-option>
          <a-select-option value="JOB_EXECUTION_FAILURE">JOB_EXECUTION_FAILURE（作业执行）</a-select-option>
          <a-select-option value="JOB_RETRIES_DECREMENTED">JOB_RETRIES_DECREMENTED（作业重试次数减少）</a-select-option>
          <a-select-option value="JOB_CANCELED">JOB_CANCELED（作业已取消）</a-select-option>
          <a-select-option value="TIMER_SCHEDULED">TIMER_SCHEDULED（定时器已安排）</a-select-option>
          <a-select-option value="TIMER_FIRED">TIMER_FIRED（定时器启动）</a-select-option>
          <a-select-option value="ACTIVITY_STARTED">ACTIVITY_STARTED（活动已开始）</a-select-option>
          <a-select-option value="ACTIVITY_COMPLETED">ACTIVITY_COMPLETED（活动已完成）</a-select-option>
          <a-select-option value="ACTIVITY_CANCELLED">ACTIVITY_CANCELLED（活动已取消）</a-select-option>
          <a-select-option value="ACTIVITY_SIGNALED">ACTIVITY_SIGNALED（活动信号）</a-select-option>
          <a-select-option value="ACTIVITY_MESSAGE_RECEIVED">ACTIVITY_MESSAGE_RECEIVED（收到活动消息）</a-select-option>
          <a-select-option value="ACTIVITY_MESSAGE_WAITING">ACTIVITY_MESSAGE_WAITING（活动消息等待）</a-select-option>
          <a-select-option value="ACTIVITY_MESSAGE_CANCELLED">ACTIVITY_MESSAGE_CANCELLED（活动消息已取消）</a-select-option>
          <a-select-option value="ACTIVITY_ERROR_RECEIVED">ACTIVITY_ERROR_RECEIVED（收到活动错误）</a-select-option>
          <a-select-option value="ACTIVITY_COMPENSATE">ACTIVITY_COMPENSATE（活动补偿）</a-select-option>
          <a-select-option value="UNCAUGHT_BPMN_ERROR">UNCAUGHT_BPMN_ERROR（未捕获的BPMN错误）</a-select-option>
          <a-select-option value="MEMBERSHIP_CREATED">MEMBERSHIP_CREATED（已创建成员资格）</a-select-option>
          <a-select-option value="MEMBERSHIP_DELETED">MEMBERSHIP_DELETED（成员身份已删除）</a-select-option>
          <a-select-option value="MEMBERSHIPS_DELETED">MEMBERSHIPS_DELETED（成员身份已删除）</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="抛出事件" prop="rethrowEvent">
        <a-radio-group v-model:value="cloned.rethrowEvent" @change="changeRethrowEvent">
          <a-radio-button :value="false">否</a-radio-button>
          <a-radio-button :value="true">是</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <div v-if="'throwEvent' in cloned">
        <a-form-item label="抛出事件类型" prop="type">
          <a-select
            v-model:value="cloned.throwEvent"
            placeholder="请选择抛出事件类型"
            @change="changeThrowEvent"
          >
            <a-select-option value="message">消息</a-select-option>
            <a-select-option value="error">错误</a-select-option>
            <a-select-option value="signal">信号</a-select-option>
            <a-select-option value="globalSignal">全局信号</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="抛出事件" prop="value" :rules="{ required: true, message: '请输入抛出事件', trigger: 'blur' }">
          <a-select v-model:value="cloned.value" placeholder="请选择抛出事件">
            <a-select-option
              v-for="item in throwEvents"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            >
              {{ item.name }}
            </a-select-option>
          </a-select>
          <!--          <a-input v-model:value="cloned.value" placeholder="请输入抛出事件"></a-input>-->
        </a-form-item>
      </div>
      <div v-else>
        <a-form-item label="监听器类型" prop="type">
          <a-radio-group v-model:value="cloned.type">
            <a-radio-button value="class">Java类</a-radio-button>
            <a-radio-button value="delegateExpression">委托表达式</a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="监听器" prop="value" :rules="fieldValueRule">
          <a-input v-model:value="cloned.value" placeholder="请输入监听器"></a-input>
        </a-form-item>
        <a-form-item label="实体类型" prop="entityType">
          <a-input v-model:value="cloned.entityType" placeholder="请输入实体类型"></a-input>
        </a-form-item>
      </div>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
