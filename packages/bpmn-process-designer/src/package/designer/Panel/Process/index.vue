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
        <a-select-option label="张三" value="zhangsan" />
        <a-select-option label="李四" value="lisi" />
        <a-select-option label="王五" value="wangwu" />
        <a-select-option label="毛六" value="maoliu" />
        <a-select-option label="钱七" value="qianqi" />
      </a-select>
    </a-form-item>
    <a-form-item label="流程启动角色">
      <a-select v-model:value="candidateStarterUsers" multiple placeholder="请选择启动角色">
        <a-select-option label="项目经理" value="zhangsan" />
        <a-select-option label="产品经理" value="lisi" />
        <a-select-option label="技术总监" value="wangwu" />
        <a-select-option label="架构师" value="maoliu" />
        <a-select-option label="开发主管" value="qianqi" />
      </a-select>
    </a-form-item>
    <a-form-item label="历史级别">
      <a-select v-model:value="historyLevel" allowClear placeholder="请选择历史级别">
        <a-select-option label="🚫 不记录（性能最佳）" value="none"></a-select-option>
        <a-select-option label="🟢 仅流程实例（记录启动/结束）" value="instance"></a-select-option>
        <a-select-option label="📝 任务级别（记录处理人、任务状态）" value="task"></a-select-option>
        <a-select-option label="📌 节点活动（记录每一步执行）" value="activity"></a-select-option>
        <a-select-option label="🔍 审计跟踪（流程+任务+节点+变量）" value="audit"></a-select-option>
        <a-select-option label="📚 全部细节（最完整记录）" value="full"></a-select-option>
      </a-select>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
