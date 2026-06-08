<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'
import { customRef } from 'vue'
import {
  addExtensionElements,
  getExtensionElement,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'
import { useBpmnContextService } from '@/hooks/useService.ts'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'

defineOptions({
  name: 'Process',
})
const { selectedElement, updateProperties } = useBpmnContextService()
const candidateStarterGroups = useCustomRef<string[]>('candidateStarterGroups')
const candidateStarterUsers = useCustomRef<string[]>('candidateStarterUsers')
const historyLevel = customRef((track, trigger) => {
  return {
    get() {
      track()
      const historyLevel = getExtensionElement(selectedElement, 'flowable:HistoryLevel')
      return historyLevel?.get('body')
    },
    set(newValue: string) {
      let historyLevel = getExtensionElement(selectedElement, 'flowable:HistoryLevel')
      if (newValue) {
        if (historyLevel) {
          updateProperties({ body: newValue }, historyLevel)
        } else {
          const businessObject = getBusinessObject(selectedElement)
          historyLevel = businessObject.$model.create('flowable:HistoryLevel', {
            body: newValue,
          })
          historyLevel && addExtensionElements(selectedElement, historyLevel)
        }
      } else {
        historyLevel && removeExtensionElements(selectedElement, historyLevel)
      }
      trigger()
    },
  }
})
</script>

<template>
  <a-collapse-panel key="arg1" header="流程">
    <a-form-item label="流程启动人">
      <a-select v-model:value="candidateStarterGroups" multiple placeholder="请选择启动人">
        <a-select-option value="zhangsan">张三</a-select-option>
        <a-select-option value="lisi">李四</a-select-option>
        <a-select-option value="wangwu">王五</a-select-option>
        <a-select-option value="maoliu">毛六</a-select-option>
        <a-select-option value="qianqi">钱七</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item label="流程启动角色">
      <a-select v-model:value="candidateStarterUsers" multiple placeholder="请选择启动角色">
        <a-select-option value="zhangsan">项目经理</a-select-option>
        <a-select-option value="lisi">产品经理</a-select-option>
        <a-select-option value="wangwu">技术总监</a-select-option>
        <a-select-option value="maoliu">架构师</a-select-option>
        <a-select-option value="qianqi">开发主管</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item label="历史级别">
      <a-select v-model:value="historyLevel" allowClear placeholder="请选择历史级别">
        <a-select-option value="none">不记录（性能最佳）</a-select-option>
        <a-select-option value="instance">仅流程实例（记录启动/结束）</a-select-option>
        <a-select-option value="task">任务级别（记录处理人、任务状态）</a-select-option>
        <a-select-option value="activity">节点活动（记录每一步执行）</a-select-option>
        <a-select-option value="audit">审计跟踪（流程+任务+节点+变量）</a-select-option>
        <a-select-option value="full">全部细节（最完整记录）</a-select-option>
      </a-select>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
