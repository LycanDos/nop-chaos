<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type EventBus from 'diagram-js/lib/core/EventBus'
import { onMounted } from 'vue'

defineOptions({
  name: 'UserTaskPanel',
})
const { getService } = useBpmnContextService()
const eventBus = getService<EventBus>('eventBus')
const assignee = useCustomRef('assignee')
const candidateUsers = useCustomRef<string[]>('candidateUsers')
const candidateGroups = useCustomRef<string[]>('candidateGroups')
const dueDate = useCustomRef('dueDate')
const priority = useCustomRef<number>('priority')
onMounted(() => {
  eventBus?.on('elementVariableChanged', (event: any) => {
    assignee.value = `\${${event.elementVariable}}`
  })
})
</script>

<template>
  <a-collapse-panel key="arg1" header="处理人">
    <a-form-item prop="assignee" label="受让人">
      <a-select v-model:value="assignee" showSearch allow-create allowClear placeholder="请选择受让人">
        <a-select-option value="zhangsan">张三</a-select-option>
        <a-select-option value="lisi">李四</a-select-option>
        <a-select-option value="wangwu">王五</a-select-option>
        <a-select-option value="maoliu">毛六</a-select-option>
        <a-select-option value="qianqi">钱七</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item prop="candidateUsers" label="候选人">
      <a-select v-model:value="candidateUsers" multiple allowClear placeholder="请选择候选人">
        <a-select-option value="zhangsan">张三</a-select-option>
        <a-select-option value="lisi">李四</a-select-option>
        <a-select-option value="wangwu">王五</a-select-option>
        <a-select-option value="maoliu">毛六</a-select-option>
        <a-select-option value="qianqi">钱七</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item prop="candidateGroups" label="候选组">
      <a-select v-model:value="candidateGroups" multiple allowClear placeholder="请选择候选组">
        <a-select-option value="deptA">部门A</a-select-option>
        <a-select-option value="deptB">部门B</a-select-option>
        <a-select-option value="deptC">部门C</a-select-option>
        <a-select-option value="deptD">部门D</a-select-option>
        <a-select-option value="deptE">部门E</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item prop="priority" label="优先级">
      <a-input-number v-model:value="priority" placeholder="优先级" :min="0" :max="10" />
    </a-form-item>
    <a-form-item prop="dueDate" label="到期时间">
      <a-input v-model:value="dueDate" placeholder="请输入到期时间" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss">
:deep(.ant-collapse-header) {
  padding-left: 10px;
  box-sizing: border-box;
  position: relative;
  gap: 8px;

  &:before {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 0;
    width: 3px;
    height: 15px;
    background-color: var(--el-color-primary);
  }
}
</style>
