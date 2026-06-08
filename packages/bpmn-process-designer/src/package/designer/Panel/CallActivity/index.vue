<script setup lang="ts">
import { createElement, useCustomRef } from '@/designer/utils/ElementUtil.ts'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue'
import ParamsDrawer, { type Params } from './ParamsDrawer.vue'
import { onMounted, ref, toRaw } from 'vue'
import { useBpmnContextService } from '@/hooks/useService.ts'
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory'
import {
  addExtensionElements,
  getExtensionElementsList,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'

defineOptions({
  name: 'CallActivity',
})
const form = { labelPosition: 'right', size: 'small' }
const { selectedElement, updateProperties, getService } = useBpmnContextService()
const bpmnFactory = getService<BpmnFactory>('bpmnFactory')
const inParamsDrawerRef = ref<InstanceType<typeof ParamsDrawer>>()
const outParamsDrawerRef = ref<InstanceType<typeof ParamsDrawer>>()
const calledElementType = useCustomRef('calledElementType')
const calledElement = useCustomRef('calledElement')
const inheritVariables = useCustomRef('inheritVariables')
const processInstanceName = useCustomRef('processInstanceName')
const idVariableName = useCustomRef('idVariableName')
const businessKey = useCustomRef('businessKey')
const inheritBusinessKey = useCustomRef('inheritBusinessKey')
const sameDeployment = useCustomRef('sameDeployment')
const useLocalScopeForOutParameters = useCustomRef('useLocalScopeForOutParameters')
const inData = ref<Params[]>([])
const outData = ref<Params[]>([])
const editInParams = (row?: Params) => {
  inParamsDrawerRef.value?.openDrawer(row)
}
const editOutParams = (row?: Params) => {
  outParamsDrawerRef.value?.openDrawer(row)
}
const removeParams = (row: Params) => {
  const { element } = row
  if (element) {
    removeExtensionElements(selectedElement, toRaw(element))
    loadParams()
  }
}
const confirmParams = (params: Params, type: 'In' | 'Out') => {
  if (bpmnFactory && selectedElement) {
    const { element } = params
    if (element) {
      updateProperties(
        {
          source: params.source,
          target: params.target,
        },
        toRaw(element),
      )
    } else {
      const inElement = createElement(`flowable:${type}`, bpmnFactory, {
        source: params.source,
        target: params.target,
      })
      addExtensionElements(selectedElement, inElement)
    }
  }
  loadParams()
}
const loadParams = () => {
  if (selectedElement) {
    const inElements = getExtensionElementsList(selectedElement, 'flowable:In')
    const outElements = getExtensionElementsList(selectedElement, 'flowable:Out')
    inData.value = inElements.map((e) => {
      return {
        source: e.source,
        target: e.target,
        element: e,
      }
    })
    outData.value = outElements.map((e) => {
      return {
        source: e.source,
        target: e.target,
        element: e,
      }
    })
  }
}
onMounted(() => {
  loadParams()
})
</script>

<template>
  <a-collapse-panel key="arg1" header="调用活动">
    <a-form-item prop="calledElementType" label="活动类型">
      <a-radio-group v-model:value="calledElementType">
        <a-radio-button value="key">流程定义Key</a-radio-button>
        <a-radio-button value="id">流程定义ID</a-radio-button>
      </a-radio-group>
    </a-form-item>
    <a-form-item prop="calledElement" label="调用活动">
      <a-input v-model:value="calledElement" :placeholder="`请输入流程定义${calledElementType}`" />
    </a-form-item>
    <a-form-item prop="processInstanceName" label="流程实例名称">
      <a-input v-model:value="processInstanceName" placeholder="请输入流程实例名称" />
    </a-form-item>
    <a-form-item prop="idVariableName" label="实例id变量名">
      <a-input v-model:value="idVariableName" placeholder="请输入实例id变量名" />
    </a-form-item>
    <a-form-item prop="businessKey" label="业务键">
      <a-input v-model:value="businessKey" placeholder="请输入业务键/表达式" />
    </a-form-item>
    <a-row :gutter="10">
      <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
        <a-form-item prop="inheritBusinessKey" label="继承业务键">
          <a-switch v-model:checked="inheritBusinessKey" :disabled="!!businessKey" />
        </a-form-item>
      </a-col>
      <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
        <a-form-item prop="inheritVariables" label="继承变量">
          <a-switch v-model:checked="inheritVariables" />
        </a-form-item>
      </a-col>
      <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
        <a-form-item prop="sameDeployment" label="相同部署">
          <a-switch v-model:checked="sameDeployment" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-form-item prop="in">
      <template #label>
        入参
        <a-button type="link" size="small" @click="editInParams()"><PlusOutlined /> 创建入参 </a-button>
      </template>
      <a-table :data-source="inData" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="target">
        <a-table-column data-index="source" title="来源" :ellipsis="true" />
        <a-table-column data-index="target" title="目标" :ellipsis="true" />
        <a-table-column align="center" width="72" title="操作">
          <template #default="{ record }">
            <a-space>
              <a-button type="link" size="small" @click="editInParams(record)"><EditOutlined /></a-button>
              <a-popconfirm title="您确定要删除该字段吗？" @confirm="removeParams(record)">
                <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-form-item>
    <a-form-item prop="out">
      <template #label>
        <div class="flex-space">
          <div>
            出参
            <a-button type="link" size="small" @click="editOutParams()"><PlusOutlined /> 创建出参 </a-button>
          </div>
          <a-switch
            v-model:checked="useLocalScopeForOutParameters"
            inline-prompt
            active-text="局部出参"
            inactive-text="全局出参"
          />
        </div>
      </template>
      <a-table :data-source="outData" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="target">
        <a-table-column data-index="source" title="来源" :ellipsis="true" />
        <a-table-column data-index="target" title="目标" :ellipsis="true" />
        <a-table-column align="center" width="72" title="操作">
          <template #default="{ record }">
            <a-space>
              <a-button type="link" size="small" @click="editOutParams(record)"><EditOutlined /></a-button>
              <a-popconfirm title="您确定要删除该字段吗？" @confirm="removeParams(record)">
                <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-form-item>
    <ParamsDrawer ref="inParamsDrawerRef" title="入参" @confirm="confirmParams($event, 'In')" />
    <ParamsDrawer ref="outParamsDrawerRef" title="出参" @confirm="confirmParams($event, 'Out')" />
  </a-collapse-panel>
</template>

<style scoped lang="scss">
:deep(.ant-form-item-label) {
  width: 100%;
}
</style>
