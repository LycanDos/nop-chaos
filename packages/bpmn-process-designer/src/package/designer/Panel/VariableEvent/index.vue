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
  <a-collapse-panel key="arg1">
    <template #header>
      <span class="panel-section-title">参数监听</span>
    </template>
    <a-form-item label="参数事件">
      <a-radio-group v-model:value="variableChangeType">
        <a-radio-button value="all">全部</a-radio-button>
        <a-radio-button value="create">创建</a-radio-button>
        <a-radio-button value="update">更新</a-radio-button>
        <a-radio-button value="createupdate">创建或更新</a-radio-button>
      </a-radio-group>
    </a-form-item>
    <a-form-item label="参数名称">
      <a-input v-model:value="variableName" placeholder="请输入参数名"></a-input>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss">
.panel-section-title {
  font-weight: 600;
  color: var(--bpd-text-color, #262626);
}
</style>
