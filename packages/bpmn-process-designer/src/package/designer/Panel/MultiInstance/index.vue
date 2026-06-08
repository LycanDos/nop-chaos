<script setup lang="ts">
import { customRef, onMounted, ref, toRaw } from 'vue'
import { useBpmnContextService } from '@/hooks/useService.ts'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue'
import VariableAggregationDrawer from './VariableAggregationDrawer.vue'
import { getLoopCharacteristics } from '@/designer/utils/ElementUtil.ts'
import type { VariableAggregation } from '@/types'
import { isDelegateExpression } from '@/designer/utils'
import {
  addExtensionElements,
  getExtensionElement,
  getExtensionElementsList,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory'
import type { Element } from 'bpmn-js/lib/model/Types.ts'
import type EventBus from 'diagram-js/lib/core/EventBus'
import juelSupport from '@/components/CodemirrorEditor/language/juel'
import Codemirror from '@/components/CodemirrorEditor/index.vue'
import { isExpressionValid } from '@/designer/utils/ValidationUtil.ts'

defineOptions({
  name: 'MultiInstance',
})
const form = { labelPosition: 'right', size: 'small' }
const { updateProperties, getService, selectedElement } = useBpmnContextService()
const bpmnFactory = getService<BpmnFactory>('bpmnFactory')
const eventBus = getService<EventBus>('eventBus')
const useCustomRef = (key: string, expression?: boolean) => {
  return customRef<string>((track, trigger) => {
    return {
      get() {
        track()
        const loopCharacteristics = getLoopCharacteristics(selectedElement)
        if (expression) {
          return loopCharacteristics?.get(key)?.body
        }
        return loopCharacteristics?.get(key)
      },
      set(newValue: string) {
        if (expression && newValue) {
          newValue = bpmnFactory?.create('bpmn:FormalExpression', {
            body: newValue.toString(),
          })
        }
        const loopCharacteristics = getLoopCharacteristics(selectedElement)
        updateProperties({ [key]: newValue ? newValue : undefined }, loopCharacteristics)
        trigger()
      },
    }
  })
}
const loopCharacteristicsType = customRef<string>((track, trigger) => {
  return {
    get() {
      track()
      const loopCharacteristics = getLoopCharacteristics(selectedElement)
      if (loopCharacteristics) {
        return loopCharacteristics.isSequential ? 'Sequential' : 'Parallel'
      }
      return ''
    },
    set(newValue: string) {
      if (newValue) {
        const multiLoopInstance = bpmnFactory?.create('bpmn:MultiInstanceLoopCharacteristics', {
          isSequential: newValue === 'Sequential',
          collection: '',
          elementVariable: '',
        })
        updateProperties({ loopCharacteristics: multiLoopInstance })
      } else {
        updateProperties({ loopCharacteristics: undefined })
      }
      trigger()
    },
  }
})
const noWaitStatesAsyncLeave = useCustomRef('noWaitStatesAsyncLeave')
const loopCardinality = useCustomRef('loopCardinality', true)
const completionCondition = useCustomRef('completionCondition', true)
const collection = useCustomRef('collection')
const elementVariable = useCustomRef('elementVariable')
const elementIndexVariable = useCustomRef('elementIndexVariable')
const variableAggregationDrawerRef = ref<InstanceType<typeof VariableAggregationDrawer>>()
const variableAggregations = ref<VariableAggregation[]>([])
const collectionHandler = customRef<string>((track, trigger) => {
  return {
    get() {
      track()
      const loopCharacteristics = getLoopCharacteristics(selectedElement)
      const collectionElement = getExtensionElement(loopCharacteristics, 'flowable:Collection')
      if (collectionElement) {
        return collectionElement.get('class') || collectionElement.get('delegateExpression')
      }
    },
    set(newValue: string) {
      const loopCharacteristics = getLoopCharacteristics(selectedElement)
      let collectionElement = getExtensionElement(loopCharacteristics, 'flowable:Collection')
      if (!collectionElement) {
        collectionElement = bpmnFactory?.create('flowable:Collection', {
          class: undefined,
          delegateExpression: undefined,
        })
        if (collectionElement) {
          addExtensionElements(loopCharacteristics, collectionElement)
        }
      }
      const properties: Record<string, any> = {
        class: undefined,
        delegateExpression: undefined,
      }
      if (isExpressionValid(newValue)) {
        properties.delegateExpression = newValue
      } else {
        properties.class = newValue
      }
      updateProperties(properties, collectionElement)
      trigger()
    },
  }
})
const juelExtension = juelSupport({
  completions: [
    {
      label: 'nrOfInstances',
      type: 'variable',
      detail: '多实例：总数',
    },
    {
      label: 'nrOfCompletedInstances',
      type: 'variable',
      detail: '多实例：已完成数',
    },
    {
      label: 'nrOfActiveInstances',
      type: 'variable',
      detail: '多实例：进行中数',
    },
    {
      label: 'loopCounter',
      type: 'variable',
      detail: '多实例：索引',
    },
  ],
})
const addVariableAggregation = (row?: VariableAggregation) => {
  variableAggregationDrawerRef.value?.openDrawer(row)
}
const removeVariableAggregation = (row: VariableAggregation) => {
  const { element } = row
  if (element) {
    removeExtensionElements(selectedElement, toRaw(element))
  }
  loadVariableAggregations()
}
const confirmVariableAggregation = (variableAggregation: VariableAggregation) => {
  const loopCharacteristics = getLoopCharacteristics(selectedElement)
  const { target, expression, variableType, variables } = variableAggregation
  const properties: Record<string, any> = {
    target: undefined,
    targetExpression: undefined,
    createOverviewVariable: undefined,
    storeAsTransientVariable: undefined,
    class: undefined,
    delegateExpression: undefined,
    values: undefined,
  }
  properties[variableType] = true
  if (isDelegateExpression(target)) {
    properties.targetExpression = target
  } else {
    properties.target = target
  }
  if (isDelegateExpression(expression)) {
    properties.delegateExpression = expression
  } else {
    properties.class = expression
  }
  properties.values = variables.map((variable) => {
    const { source, target } = variable
    const properties: Record<string, any> = {
      source: undefined,
      sourceExpression: undefined,
      target: undefined,
      targetExpression: undefined,
    }
    if (isDelegateExpression(source)) {
      properties.sourceExpression = source
    } else {
      properties.source = source
    }
    if (isDelegateExpression(target)) {
      properties.targetExpression = target
    } else {
      properties.target = target
    }
    return bpmnFactory?.create('flowable:Variable', properties)
  })
  const { element } = variableAggregation
  if (element) {
    updateProperties(properties, element)
  } else {
    const aggregation = bpmnFactory?.create('flowable:VariableAggregation', properties)
    aggregation && addExtensionElements(loopCharacteristics, aggregation)
  }
  loadVariableAggregations()
}
const loadVariableAggregations = () => {
  const loopCharacteristics = getLoopCharacteristics(selectedElement)
  if (loopCharacteristics) {
    const values = getExtensionElementsList(loopCharacteristics, 'flowable:VariableAggregation')
    variableAggregations.value = values.map((aggregation) => {
      return {
        target: aggregation.target || aggregation.targetExpression,
        expression: aggregation.class || aggregation.delegateExpression,
        variableType: aggregation.createOverviewVariable
          ? 'createOverviewVariable'
          : 'storeAsTransientVariable',
        variables: aggregation.values.map((variable: Element) => {
          return {
            source: variable.source || variable.sourceExpression,
            target: variable.target || variable.targetExpression,
          }
        }),
        element: aggregation,
      }
    })
  }
}
const changeElementVariable = (val: string) => {
  if (val) {
    eventBus?.fire('elementVariableChanged', {
      element: selectedElement,
      elementVariable: val,
    })
  }
}
onMounted(() => {
  loadVariableAggregations()
})
</script>

<template>
  <div>
      <a-form-item label="实例类型">
        <a-radio-group v-model:value="loopCharacteristicsType">
        <a-radio-button value="">无</a-radio-button>
        <a-radio-button value="Parallel">并行</a-radio-button>
        <a-radio-button value="Sequential">串行</a-radio-button>
      </a-radio-group>
    </a-form-item>
    <div v-if="loopCharacteristicsType">
      <a-form-item label="基数">
        <a-input v-model:value="loopCardinality" placeholder="请输入基数" />
      </a-form-item>
      <a-row :gutter="10">
        <a-col :span="form?.labelPosition === 'top' ? 12 : 24">
          <a-form-item label="集合变量">
            <a-input v-model:value="collection" placeholder="请输入集合变量" />
          </a-form-item>
        </a-col>
        <a-col :span="form?.labelPosition === 'top' ? 12 : 24">
          <a-form-item label="元素变量">
            <a-input
              v-model:value="elementVariable"
              @change="changeElementVariable"
              placeholder="请输入元素变量"
            />
          </a-form-item>
        </a-col>
        <a-col :span="form?.labelPosition === 'top' ? 12 : 24" v-show="false">
          <a-form-item label="索引变量">
            <a-input v-model:value="elementIndexVariable" placeholder="请输入索引变量" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="无等待离开" v-show="loopCharacteristicsType === 'Parallel' && false">
        <a-switch
          v-model:checked="noWaitStatesAsyncLeave"
          :active-value="true"
          :inactive-value="undefined"
        />
      </a-form-item>
      <a-form-item label="集合处理器" v-show="false">
        <a-input v-model:value="collectionHandler" placeholder="请输入集合处理器" />
      </a-form-item>
      <a-form-item label="完成条件">
        <Codemirror
          autosize
          :max-rows="5"
          no-wrap
          placeholder="请输入完成条件"
          :extensions="[juelExtension]"
          v-model="completionCondition"
        />
        <!--        <a-input v-model:value="completionCondition" placeholder="请输入完成条件" />-->
      </a-form-item>
      <a-form-item>
        <template #label>
          变量聚合
          <a-button type="link" size="small" @click="addVariableAggregation()"><PlusOutlined /> 添加聚合 </a-button>
        </template>
        <a-table :data-source="variableAggregations" size="small" :pagination="false" :scroll="{ y: 150 }" row-key="target">
          <a-table-column data-index="target" title="聚合变量" />
          <a-table-column data-index="variableType" title="变量类型">
            <template #default="{ record }">
              {{ record.variableType === 'createOverviewVariable' ? '普通变量' : '瞬态变量' }}
            </template>
          </a-table-column>
          <a-table-column align="center" width="72" title="操作">
            <template #default="{ record }">
              <a-space>
                <a-button type="link" size="small" @click="addVariableAggregation(record)"><EditOutlined /></a-button>
                <a-popconfirm
                  title="您确定要删除该字段吗？"
                  @confirm="removeVariableAggregation(record)"
                >
                  <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </a-table>
        <VariableAggregationDrawer
          ref="variableAggregationDrawerRef"
          @confirm="confirmVariableAggregation"
        />
      </a-form-item>
    </div>
  </div>
</template>

<style scoped lang="scss"></style>
