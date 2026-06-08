<script setup lang="ts">
import type { FormProperty } from '@/types'
import { createElement, useCustomRef } from '@/designer/utils/ElementUtil.ts'
import { useBpmnContextService } from '@/hooks/useService.ts'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory'
import type { Element } from 'bpmn-js/lib/model/Types'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormPropertyDialog from './FormPropertyDialog.vue'
import {
  addExtensionElements,
  getExtensionElementsList,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'

const { selectedElement, getService, updateProperties } = useBpmnContextService()
const bpmnFactory = getService<BpmnFactory>('bpmnFactory')
const formKey = useCustomRef('formKey')
const formPropertyData = ref<FormProperty[]>([])
const formPropertyDialogRef = ref<InstanceType<typeof FormPropertyDialog>>()
interface OperationItem {
  label: string
  value: string
  enable: boolean
  element?: Element
}

const operationData = ref<OperationItem[]>([
  {
    label: '驳回',
    value: 'reject',
    enable: false,
  },
  {
    label: '撤回',
    value: 'revoke',
    enable: false,
  },
  {
    label: '转办',
    value: 'transfer',
    enable: false,
  },
  {
    label: '委托',
    value: 'delegate',
    enable: false,
  },
  {
    label: '加签',
    value: 'sign',
    enable: false,
  },
])

const isUserTask = computed(() => is(selectedElement, 'bpmn:UserTask'))
const fallbackText = '-'
const toDisplayText = (value?: string | boolean) => {
  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }
  if (typeof value === 'string') {
    return value.trim() || fallbackText
  }
  return fallbackText
}
const toSwitchLabel = (value: boolean) => {
  return value ? '是' : '否'
}
const parseBoolean = (value: unknown, defaultValue = false) => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }
  return defaultValue
}

const loadFormPropertyList = () => {
  const formPropertyList = getExtensionElementsList(selectedElement, 'flowable:FormProperty')
  formPropertyData.value = formPropertyList.map((e) => {
    return {
      element: e,
      default: e.default,
      expression: e.expression,
      id: e.id,
      name: e.name,
      required: parseBoolean(e.required),
      readable: parseBoolean(e.readable, true),
      type: e.type,
      variable: e.variable,
      writable: parseBoolean(e.writable, true),
    }
  })
}

const loadOperationList = () => {
  const operationList = getExtensionElementsList(selectedElement, 'flowable:Button')
  const buttonCodeMap = new Map<string, Element>()
  operationList.forEach((button) => {
    const code = button.get('code')
    if (typeof code === 'string' && code) {
      buttonCodeMap.set(code, button)
    }
  })

  operationData.value = operationData.value.map((operation) => {
    const button = buttonCodeMap.get(operation.value)
    if (!button) {
      return {
        ...operation,
        element: undefined,
        enable: false,
      }
    }
    return {
      ...operation,
      element: button,
      enable: !parseBoolean(button.get('isHide')),
    }
  })
}

const addFormProperty = () => {
  formPropertyDialogRef.value?.openDrawer()
}

const editFormProperty = (formProperty: FormProperty) => {
  formPropertyDialogRef.value?.openDrawer(formProperty)
}

const confirmFormProperty = (formProperty: FormProperty) => {
  const formPropertyProps: FormProperty = {
    id: formProperty.id,
    name: formProperty.name,
    type: formProperty.type,
    required: formProperty.required,
    readable: formProperty.readable,
    writable: formProperty.writable,
    expression: formProperty.expression || undefined,
    variable: formProperty.variable || undefined,
    default: formProperty.default || undefined,
  }

  if (formProperty.element) {
    // 必须走命令栈更新扩展属性，避免直接赋值导致撤销重做与 XML 不一致。
    updateProperties(formPropertyProps, formProperty.element)
  } else if (bpmnFactory) {
    const formPropertyElement = createElement(
      'flowable:FormProperty',
      bpmnFactory,
      formPropertyProps,
    )
    addExtensionElements(selectedElement, formPropertyElement)
  }

  loadFormPropertyList()
}

const delFormProperty = (index: number) => {
  const formPropertyList = getExtensionElementsList(selectedElement, 'flowable:FormProperty')
  const target = formPropertyList[index]
  if (!target) {
    return
  }
  removeExtensionElements(selectedElement, target)
  loadFormPropertyList()
}

const handleOperationChange = (operation: OperationItem) => {
  if (operation.element) {
    updateProperties(
      {
        isHide: operation.enable ? 'false' : 'true',
        name: operation.label,
        code: operation.value,
      },
      operation.element,
    )
    return
  }
  if (!bpmnFactory) {
    return
  }
  const operationElement = createElement('flowable:Button', bpmnFactory, {
    name: operation.label,
    code: operation.value,
    isHide: operation.enable ? 'false' : 'true',
  })
  addExtensionElements(selectedElement, operationElement)
  operation.element = operationElement
}

onMounted(() => {
  loadFormPropertyList()
  loadOperationList()
})

watch(
  () => selectedElement?.id,
  () => {
    loadFormPropertyList()
    loadOperationList()
  },
)
</script>

<template>
  <a-tab-pane tab="表单权限" key="form">
    <div style="overflow:auto">
      <div class="form-permissions">
        <a-form-item label="表单标识">
          <a-input v-model:value="formKey" allow-clear placeholder="请输入表单标识"></a-input>
        </a-form-item>
        <a-form-item label="表单属性">
          <template #label>
            表单属性
            <a-button type="link" size="small" @click="addFormProperty"><PlusOutlined />添加</a-button>
          </template>
          <a-table :data-source="formPropertyData" size="small" :pagination="false" :scroll="{ y: 250 }" row-key="id">
            <template #expandedRowRender="{ record }">
              <a-descriptions :column="2" size="small" class="p20px">
                <a-descriptions-item label="变量名">
                  {{ toDisplayText(record.variable) }}
                </a-descriptions-item>
                <a-descriptions-item label="表达式">
                  {{ toDisplayText(record.expression) }}
                </a-descriptions-item>
                <a-descriptions-item label="默认值">
                  {{ toDisplayText(record.default) }}
                </a-descriptions-item>
                <a-descriptions-item label="必填">
                  {{ toSwitchLabel(record.required) }}
                </a-descriptions-item>
                <a-descriptions-item label="可读">
                  {{ toSwitchLabel(record.readable) }}
                </a-descriptions-item>
                <a-descriptions-item label="可写">
                  {{ toSwitchLabel(record.writable) }}
                </a-descriptions-item>
              </a-descriptions>
            </template>
            <a-table-column data-index="id" title="id" :ellipsis="true" />
            <a-table-column data-index="name" title="名称" :ellipsis="true" />
            <a-table-column data-index="type" align="center" width="76" title="类型" />
            <a-table-column title="操作" width="72" align="center">
              <template #default="{ record, index }">
                <a-button type="link" size="small" @click="editFormProperty(record)"><EditOutlined /></a-button>
                <a-popconfirm title="您确定要删除该属性吗？" @confirm="delFormProperty(index)">
                  <a-button danger type="link" size="small"><DeleteOutlined /></a-button>
                </a-popconfirm>
              </template>
            </a-table-column>
          </a-table>
        </a-form-item>

        <FormPropertyDialog ref="formPropertyDialogRef" @confirm="confirmFormProperty" />

        <a-form-item label="操作权限" v-if="isUserTask">
          <a-table :data-source="operationData" size="small" :pagination="false" :scroll="{ y: 200 }" row-key="value">
            <a-table-column data-index="label" title="按钮" />
            <a-table-column data-index="value" title="属性" />
            <a-table-column title="是否启用" align="center" data-index="enable" width="92">
              <template #default="{ record }">
                <a-switch v-model:checked="record.enable" @change="handleOperationChange(record)" />
              </template>
            </a-table-column>
          </a-table>
        </a-form-item>
      </div>
    </div>
  </a-tab-pane>
</template>

<style scoped lang="scss">
.form-permissions {
  padding: 8px 0;
}
.p20px {
  padding: 4px 8px;
}
</style>
