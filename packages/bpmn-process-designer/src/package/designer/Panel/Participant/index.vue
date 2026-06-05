<script setup lang="ts">
import { useBpmnContextService } from '@/hooks/useService.ts'
import { isHorizontal } from 'bpmn-js/lib/util/DiUtil'
import type EventBus from 'diagram-js/lib/core/EventBus'

defineOptions({
  name: 'Participant',
})
const { selectedElement, getService } = useBpmnContextService()
const eventBus = getService<EventBus>('eventBus')
const horizontal = customRef((track, trigger) => {
  return {
    get() {
      track()
      return isHorizontal(selectedElement)
    },
    set(value) {
      selectedElement.di.isHorizontal = value
      eventBus?.fire('elements.changed', { elements: [selectedElement] })
      trigger()
    },
  }
})
</script>

<template>
  <a-collapse-panel key="arg1" header="泳道">
    <a-form-item label="方向">
      <a-switch v-model:checked="horizontal" inactive-text="垂直" active-text="水平"></a-switch>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
