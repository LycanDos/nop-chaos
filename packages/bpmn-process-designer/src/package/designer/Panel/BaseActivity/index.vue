<script setup lang="ts">
import { message } from 'ant-design-vue'
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'
import ExecuteListener from './ExecuteListener.vue'
import ExtendedAttribute from './ExtendedProperties.vue'
import { computed, ref } from 'vue'
import { supportsExecutionListener } from '@/designer/utils/EventDefinitionUtil.ts'
import { isIdValid } from '@/designer/utils/ValidationUtil.ts'
import { useBpmnContextService, bpmnContext, selectedElementRef } from '@/hooks/useService.ts'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'

defineOptions({
  name: 'BaseActivity',
})
const { selectedElement } = useBpmnContextService()
const activeTabName = ref('basic')
const actives = ref<string[]>(['general', 'arg1', 'arg2', 'arg3', 'arg4', 'executor-binding', 'executor-input-clar', 'executor-input', 'executor-output', 'executor-config', 'skin-config'])
const id = useCustomRef('id')
const isExecutable = useCustomRef('isExecutable')
const name = useCustomRef('name')
const text = useCustomRef('text')
const propertiesByName = computed(() => {
  const el = selectedElementRef.value
  if (!el) return {}
  const businessObject = getBusinessObject(el)
  return businessObject?.$descriptor?.propertiesByName || {}
})
const updateId = (val: string) => {
  const el = selectedElementRef.value
  if (!el) return
  const msg = isIdValid(el, val)
  if (msg) {
    return message.warning(msg)
  }
  id.value = val
}
</script>

<template>
  <a-tabs v-model:activeKey="activeTabName" stretch>
    <a-tab-pane tab="基础配置" key="basic">
      <div style="overflow:auto">
        <a-collapse v-model:activeKey="actives">
          <a-collapse-panel key="general" header="常规">
            <a-form-item label="id">
              <a-input
                :model-value="id"
                @update:model-value="updateId"
                placeholder="请输入节点id"
              />
            </a-form-item>
            <a-form-item label="名称" v-if="propertiesByName['name']">
              <a-input v-model="name" placeholder="请输入节点名称" />
            </a-form-item>
            <a-form-item label="名称" v-else-if="propertiesByName['text']">
              <a-input v-model="text" placeholder="请输入节点名称" />
            </a-form-item>
            <a-form-item label="可执行" v-if="propertiesByName['isExecutable']">
              <a-switch v-model:checked="isExecutable" />
            </a-form-item>
            <slot name="general"></slot>
          </a-collapse-panel>
          <slot name="basic"></slot>
        </a-collapse>
        <slot name="basicExtra"></slot>
      </div>
    </a-tab-pane>
    <slot></slot>
    <a-tab-pane tab="其他配置" key="other">
      <div style="overflow:auto">
        <div class="other-configurations">
          <ExecuteListener v-if="supportsExecutionListener()" />
          <slot name="other"></slot>
          <ExtendedAttribute />
        </div>
      </div>
    </a-tab-pane>
  </a-tabs>
</template>

<style scoped lang="scss">
.other-configurations {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

:deep(.ant-collapse-header) {
  display: flex;
  align-items: center;
  padding: 10px 12px 10px 16px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #262626 !important;
  position: relative;
  background: #fafafa;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 6px;
    width: 3px;
    height: 14px;
    background-color: #1677ff;
    border-radius: 2px;
  }
}

:deep(.ant-collapse-content-box) {
  padding: 12px !important;
}
</style>
