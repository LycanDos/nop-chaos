<script setup lang="ts">
import { customRef } from 'vue'
import { useBpmnContextService } from '@/hooks/useService.ts'
import { getVariableEventDefinition } from '@/designer/utils/EventDefinitionUtil.ts'

defineOptions({
  name: 'VariableEvent',
})
const { selectedElement, updateProperties } = useBpmnContextService()
const useEventRef = <T = string,>(key: string) => {
  return customRef<T>((track, trigger) => {
    return {
      get() {
        track()
        const eventDefinition = getVariableEventDefinition(selectedElement)
        return eventDefinition?.get(key)
      },
      set(newValue: T) {
        const eventDefinition = getVariableEventDefinition(selectedElement)
        if (eventDefinition) {
          updateProperties(
            {
              [key]: newValue,
            },
            eventDefinition,
          )
        }
        trigger()
      },
    }
  })
}
const variableChangeType = useEventRef('variableChangeType')
const variableName = useEventRef('variableName')
</script>

<template>
  <a-collapse-panel key="arg1" header="参数监听">
    <a-form-item label="参数事件">
      <a-radio-group v-model="variableChangeType">
        <a-radio-button value="all" label="全部"></a-radio-button>
        <a-radio-button value="create" label="创建"></a-radio-button>
        <a-radio-button value="update" label="更新"></a-radio-button>
        <a-radio-button value="createupdate" label="创建或更新"></a-radio-button>
      </a-radio-group>
    </a-form-item>
    <a-form-item label="参数名称">
      <a-input v-model="variableName" placeholder="请输入参数名"></a-input>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
