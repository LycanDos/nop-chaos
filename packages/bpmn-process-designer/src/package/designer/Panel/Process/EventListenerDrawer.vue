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
  <a-drawer v-model:visible="drawerVisible" width="35%" append-to-body :lock-scroll="false" @closed="onClosed" :show-close="false" :closable="false">
    <a-form ref="formRef" label-position="top" :model="cloned" label-width="90px" :size="formSize">
      <a-form-item label="事件类型" prop="events" :rules="{ required: true, message: '请选择事件类型', trigger: 'change' }">
        <a-select
          v-model:value="cloned.events"
          multiple
          collapse-tags
          :max-collapse-tags="4"
          placeholder="请选择事件类型"
        >
          <a-select-option label="PROCESS_CREATED（流程实例已创建）" value="PROCESS_CREATED" />
          <a-select-option label="PROCESS_STARTED（流程实例已启动）" value="PROCESS_STARTED" />
          <a-select-option label="PROCESS_COMPLETED（流程实例完成）" value="PROCESS_COMPLETED" />
          <a-select-option label="PROCESS_CANCELLED（流程实例被取消）" value="PROCESS_CANCELLED" />
          <a-select-option
            label="PROCESS_COMPLETED_WITH_TERMINATE_END_EVENT（流程实例到达终止结束事件）"
            value="PROCESS_COMPLETED_WITH_TERMINATE_END_EVENT"
          />
          <a-select-option label="TASK_ASSIGNED（任务已分配人员）" value="TASK_ASSIGNED" />
          <a-select-option label="TASK_CREATED（任务已创建）" value="TASK_CREATED" />
          <a-select-option label="TASK_COMPLETED（任务已完成）" value="TASK_COMPLETED" />
          <a-select-option
            label="MULTI_INSTANCE_ACTIVITY_STARTED（多实例活动已启动）"
            value="MULTI_INSTANCE_ACTIVITY_STARTED"
          />
          <a-select-option
            label="MULTI_INSTANCE_ACTIVITY_COMPLETED（多实例活动已完成）"
            value="MULTI_INSTANCE_ACTIVITY_COMPLETED"
          />
          <a-select-option
            label="MULTI_INSTANCE_ACTIVITY_CANCELLED（多实例活动已取消）"
            value="MULTI_INSTANCE_ACTIVITY_CANCELLED"
          />
          <a-select-option label="VARIABLE_CREATED（变量已创建）" value="VARIABLE_CREATED" />
          <a-select-option label="VARIABLE_UPDATED（变量已更新）" value="VARIABLE_UPDATED" />
          <a-select-option label="VARIABLE_DELETED（变量已删除）" value="VARIABLE_DELETED" />
          <a-select-option label="ENTITY_CREATED（实体已创建）" value="ENTITY_CREATED" />
          <a-select-option label="ENGINE_CREATED（发动机创建）" value="ENGINE_CREATED" />
          <a-select-option label="ENGINE_CLOSED（发动机关闭）" value="ENGINE_CLOSED" />
          <a-select-option label="ENTITY_INITIALIZED（实体已初始化）" value="ENTITY_INITIALIZED" />
          <a-select-option label="ENTITY_UPDATED（实体已更新）" value="ENTITY_UPDATED" />
          <a-select-option label="ENTITY_DELETED（实体已删除）" value="ENTITY_DELETED" />
          <a-select-option label="ENTITY_SUSPENDED（实体被暂停）" value="ENTITY_SUSPENDED" />
          <a-select-option label="ENTITY_ACTIVATED（实体已激活）" value="ENTITY_ACTIVATED" />
          <a-select-option label="JOB_EXECUTION_SUCCESS（作业执行成功）" value="JOB_EXECUTION_SUCCESS" />
          <a-select-option label="JOB_EXECUTION_FAILURE（作业执行）" value="JOB_EXECUTION_FAILURE" />
          <a-select-option
            label="JOB_RETRIES_DECREMENTED（作业重试次数减少）"
            value="JOB_RETRIES_DECREMENTED"
          />
          <a-select-option label="JOB_CANCELED（作业已取消）" value="JOB_CANCELED" />
          <a-select-option label="TIMER_SCHEDULED（定时器已安排）" value="TIMER_SCHEDULED" />
          <a-select-option label="TIMER_FIRED（定时器启动）" value="TIMER_FIRED" />
          <a-select-option label="ACTIVITY_STARTED（活动已开始）" value="ACTIVITY_STARTED" />
          <a-select-option label="ACTIVITY_COMPLETED（活动已完成）" value="ACTIVITY_COMPLETED" />
          <a-select-option label="ACTIVITY_CANCELLED（活动已取消）" value="ACTIVITY_CANCELLED" />
          <a-select-option label="ACTIVITY_SIGNALED（活动信号）" value="ACTIVITY_SIGNALED" />
          <a-select-option
            label="ACTIVITY_MESSAGE_RECEIVED（收到活动消息）"
            value="ACTIVITY_MESSAGE_RECEIVED"
          />
          <a-select-option
            label="ACTIVITY_MESSAGE_WAITING（活动消息等待）"
            value="ACTIVITY_MESSAGE_WAITING"
          />
          <a-select-option
            label="ACTIVITY_MESSAGE_CANCELLED（活动消息已取消）"
            value="ACTIVITY_MESSAGE_CANCELLED"
          />
          <a-select-option
            label="ACTIVITY_ERROR_RECEIVED（收到活动错误）"
            value="ACTIVITY_ERROR_RECEIVED"
          />
          <a-select-option label="ACTIVITY_COMPENSATE（活动补偿）" value="ACTIVITY_COMPENSATE" />
          <a-select-option label="UNCAUGHT_BPMN_ERROR（未捕获的BPMN错误）" value="UNCAUGHT_BPMN_ERROR" />
          <a-select-option label="MEMBERSHIP_CREATED（已创建成员资格）" value="MEMBERSHIP_CREATED" />
          <a-select-option label="MEMBERSHIP_DELETED（成员身份已删除）" value="MEMBERSHIP_DELETED" />
          <a-select-option label="MEMBERSHIPS_DELETED（成员身份已删除）" value="MEMBERSHIPS_DELETED" />
        </a-select>
      </a-form-item>
      <a-form-item label="抛出事件" prop="rethrowEvent">
        <a-radio-group v-model="cloned.rethrowEvent" @change="changeRethrowEvent">
          <a-radio-button label="否" :value="false"></a-radio-button>
          <a-radio-button label="是" :value="true"></a-radio-button>
        </a-radio-group>
      </a-form-item>
      <div v-if="'throwEvent' in cloned">
        <a-form-item label="抛出事件类型" prop="type">
          <a-select
            v-model:value="cloned.throwEvent"
            placeholder="请选择抛出事件类型"
            @change="changeThrowEvent"
          >
            <a-select-option label="消息" value="message"></a-select-option>
            <a-select-option label="错误" value="error"></a-select-option>
            <a-select-option label="信号" value="signal"></a-select-option>
            <a-select-option label="全局信号" value="globalSignal"></a-select-option>
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
            </a-select-option>
          </a-select>
          <!--          <a-input v-model="cloned.value" placeholder="请输入抛出事件"></a-input>-->
        </a-form-item>
      </div>
      <div v-else>
        <a-form-item label="监听器类型" prop="type">
          <a-radio-group v-model="cloned.type">
            <a-radio-button label="Java类" value="class"></a-radio-button>
            <a-radio-button label="委托表达式" value="delegateExpression"></a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="监听器" prop="value" :rules="fieldValueRule">
          <a-input v-model="cloned.value" placeholder="请输入监听器"></a-input>
        </a-form-item>
        <a-form-item label="实体类型" prop="entityType">
          <a-input v-model="cloned.entityType" placeholder="请输入实体类型"></a-input>
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
