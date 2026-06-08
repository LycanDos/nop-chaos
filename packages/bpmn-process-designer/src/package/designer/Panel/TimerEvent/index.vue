<script setup lang="ts">
import { customRef } from 'vue'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory'
import { getTimerEventDefinition } from '@/designer/utils/EventDefinitionUtil.ts'

defineOptions({
  name: 'TimerEvent',
})
const { getService, updateProperties, selectedElement } = useBpmnContextService()
const bpmnFactory = getService<BpmnFactory>('bpmnFactory')
const type = customRef<string>((track, trigger) => {
  return {
    get() {
      track()
      const timerEventDefinition = getTimerEventDefinition(selectedElement)
      return timerEventDefinition?.timeDuration !== undefined
        ? 'timeDuration'
        : timerEventDefinition?.timeCycle !== undefined
          ? 'timeCycle'
          : timerEventDefinition?.timeDate !== undefined
            ? 'timeDate'
            : ''
    },
    set(newValue: string) {
      const timerEventDefinition = getTimerEventDefinition(selectedElement)
      const properties: Record<string, any> = {
        timeDate: undefined,
        timeDuration: undefined,
        timeCycle: undefined,
      }
      const formalExpression = bpmnFactory?.create('bpmn:FormalExpression', {
        body: '',
      })
      formalExpression.$parent = timerEventDefinition
      if (newValue === 'timeDate') {
        properties.timeDate = formalExpression
      } else if (newValue === 'timeDuration') {
        properties.timeDuration = formalExpression
      } else if (newValue === 'timeCycle') {
        properties.timeCycle = formalExpression
      }
      updateProperties(properties, timerEventDefinition)
      trigger()
    },
  }
})
const time = customRef<string>((track, trigger) => {
  return {
    get() {
      track()
      const timerEventDefinition = getTimerEventDefinition(selectedElement)
      return timerEventDefinition.get(type.value)?.body
    },
    set(newValue: string) {
      const timerEventDefinition = getTimerEventDefinition(selectedElement)
      const formalExpression = timerEventDefinition.get(type.value)
      if (formalExpression) {
        formalExpression.body = newValue
        updateProperties(
          {
            [type.value]: formalExpression,
          },
          timerEventDefinition,
        )
        trigger()
      }
    },
  }
})
</script>

<template>
  <a-collapse-panel key="arg1">
    <template #header>
      <span class="panel-section-title">定时</span>
    </template>
    <a-form-item label="类型">
      <a-radio-group v-model:value="type" placeholder="请选择时间类型">
        <a-radio-button value="timeDate">时间</a-radio-button>
        <a-radio-button value="timeDuration">持续</a-radio-button>
        <a-radio-button value="timeCycle">循环</a-radio-button>
      </a-radio-group>
    </a-form-item>
    <a-form-item label="等待时间" v-if="type === 'timeDate'">
      <a-date-picker
        v-model:value="time"
        type="datetime"
        value-format="YYYY-MM-DDTHH:mm:ss"
        placeholder="请输入等待时间"
        class="w-full"
      />
    </a-form-item>
    <a-form-item label="持续时间" v-else-if="type === 'timeDuration'">
      <a-input v-model:value="time" placeholder="请输入持续时间" />
    </a-form-item>
    <a-form-item label="循环时间" v-else-if="type === 'timeCycle'">
      <a-input v-model:value="time" placeholder="请输入循环时间" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss">
.panel-section-title {
  font-weight: 600;
  color: var(--bpd-text-color, #262626);
}
</style>
