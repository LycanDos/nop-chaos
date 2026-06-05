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
          <a-input v-model="formKey" clearable placeholder="请输入表单标识"></a-input>
        </a-form-item>
        <a-form-item label="表单属性">
          <template #label>
            表单属性
            <a-button type="primary" link @click="addFormProperty"><PlusOutlined />添加</a-button>
          </template>
          <a-table :dataSource="formPropertyData" height="250px">
            <a-table-column type="expand" width="48">
              <template #default="{ row }">
                <a-descriptions :column="2" label-width="50" size="small" class="p20px">
                  <a-descriptions-item label="变量名：">
                    {{ toDisplayText(row.variable) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="表达式：">
                    {{ toDisplayText(row.expression) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="默认值：">
                    {{ toDisplayText(row.default) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="必填：">
                    {{ toSwitchLabel(row.required) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="可读：">
                    {{ toSwitchLabel(row.readable) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="可写：">
                    {{ toSwitchLabel(row.writable) }}
                  </a-descriptions-item>
                </a-descriptions>
              </template>
            </a-table-column>
            <a-table-column prop="id" label="id" show-overflow-tooltip></a-table-column>
            <a-table-column prop="name" label="名称" show-overflow-tooltip></a-table-column>
            <a-table-column
              prop="type"
              align="center"
              min-width="65"
              label="类型"
            ></a-table-column>
            <a-table-column label="操作" min-width="75" align="center">
              <template #default="{ row, $index }">
                <a-button link type="primary" @click="editFormProperty(row)" ><EditOutlined /></a-button>
                <a-popconfirm title="您确定要删除该属性吗？" @confirm="delFormProperty($index)">
                  <template #reference>
                    <a-button danger link><DeleteOutlined /></a-button>
                  </template>
                </a-popconfirm>
              </template>
            </a-table-column>
          </a-table>
        </a-form-item>

        <FormPropertyDialog ref="formPropertyDialogRef" @confirm="confirmFormProperty" />

        <a-form-item label="操作权限" v-if="isUserTask">
          <a-table :dataSource="operationData" height="200px">
            <a-table-column label="按钮" prop="label"></a-table-column>
            <a-table-column label="属性" prop="value"></a-table-column>
            <a-table-column label="是否启用" align="center" prop="enable">
              <template #default="{ row }">
                <a-switch v-model:checked="row.enable" @change="handleOperationChange(row)" />
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
  padding: 10px;
}
.p20px {
  padding: 0 15px;
}
</style>
