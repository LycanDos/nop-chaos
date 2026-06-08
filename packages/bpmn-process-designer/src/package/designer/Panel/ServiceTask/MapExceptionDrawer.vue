<script setup lang="ts">
import { ref } from 'vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import type { ErrorEvent, MapException } from '@/types'
import { useCloned } from '@vueuse/core'
import { isClassValid } from '@/designer/utils/ValidationUtil.ts'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import { findRootElementsByType } from '@/designer/utils/ElementUtil.ts'
import { useBpmnContextService } from '@/hooks/useService.ts'
import ErrorEventDrawer from '@/designer/Panel/Process/ErrorEventDrawer.vue'
import { createOrUpdateEventDefinition } from '@/designer/utils/EventDefinitionUtil.ts'

const emits = defineEmits<{
  (e: 'confirm', exceptions: MapException[]): void
}>()
const { selectedElement } = useBpmnContextService()
const formSize = useFormSize()
const formRef = ref<FormInstance>()
const drawerVisible = ref(false)
const { cloned, sync } = useCloned<{ exceptions: MapException[] }>({
  exceptions: [],
})
const errorEvents = ref<ErrorEvent[]>([])
const errorCodeFormRule = ref<FormItemRule>({
  required: true,
  trigger: 'blur',
  validator(_, value, callback) {
    if (!value) {
      return callback(new Error('请输入错误码'))
    }
    callback()
  },
})
const exceptionClassFormRule = ref<FormItemRule>({
  required: true,
  trigger: 'blur',
  validator(_, value, callback) {
    if (!value) {
      return callback(new Error('请输入异常类'))
    }
    if (!isClassValid(value)) {
      callback(new Error('请输入正确的java类路径，必须是 com.xx.xx 格式'))
    }
    callback()
  },
})
const errorEventDrawerRef = ref<InstanceType<typeof ErrorEventDrawer>>()
const openDrawer = (mapException?: MapException[]) => {
  if (mapException) {
    cloned.value.exceptions = mapException
  }
  loadErrorEvents()
  drawerVisible.value = true
}
const addException = () => {
  cloned.value.exceptions.push({
    errorCode: undefined,
    exceptionClass: undefined,
    includeChildExceptions: false,
  })
}
const handleConfirm = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      emits('confirm', cloned.value.exceptions)
      drawerVisible.value = false
    }
  })
}
const onClosed = () => {
  sync()
  formRef.value?.clearValidate()
}
const loadErrorEvents = () => {
  const businessObject = getBusinessObject(selectedElement)
  const errorElements = findRootElementsByType(businessObject, 'bpmn:Error')
  errorEvents.value = errorElements.map((item) => {
    return {
      id: item.id,
      name: item.name,
      errorCode: item.errorCode,
    }
  })
}
const addErrorEvent = () => {
  errorEventDrawerRef.value?.openDrawer()
}
const confirmErrorEvent = (properties: ErrorEvent) => {
  createOrUpdateEventDefinition(properties, 'bpmn:Error')
  loadErrorEvents()
}
defineExpose({
  openDrawer,
})
</script>

<template>
  <a-drawer v-model:visible="drawerVisible" width="620px" :closable="false" @close="onClosed">
    <a-form ref="formRef" layout="vertical" :model="cloned" :size="formSize">
      <a-form-item>
        <template #label>
          <a-button type="link" size="small" @click="addException"><PlusOutlined /> 添加映射 </a-button>
        </template>
        <a-table :data-source="cloned.exceptions" size="small" :pagination="false" :scroll="{ y: 400 }">
          <a-table-column data-index="errorCode" title="错误码">
            <template #default="{ record, index }">
              <a-form-item :prop="`exceptions.${index}.errorCode`" :rules="errorCodeFormRule">
                <a-select v-model:value="record.errorCode" placeholder="请选择错误码">
                  <a-select-option
                    v-for="item in errorEvents.filter(
                      (e) =>
                        !cloned.exceptions.some(
                          (item) =>
                            item.errorCode === e.errorCode && item.errorCode !== record.errorCode,
                        ),
                    )"
                    :key="item.errorCode"
                    :label="item.name"
                    :value="item.errorCode"
                  >
                    {{ item.name }}
                  </a-select-option>
                  <template #footer>
                    <a-button type="link" size="small" block @click="addErrorEvent()">
                      <PlusOutlined /> 新增错误定义
                    </a-button>
                  </template>
                </a-select>
              </a-form-item>
            </template>
          </a-table-column>
          <a-table-column data-index="exceptionClass" width="180" title="异常类">
            <template #default="{ record, index }">
              <a-form-item :prop="`exceptions.${index}.exceptionClass`" :rules="exceptionClassFormRule">
                <a-input v-model:value="record.exceptionClass" placeholder="java异常类路径" />
              </a-form-item>
            </template>
          </a-table-column>
          <a-table-column
            align="center"
            data-index="includeChildExceptions"
            width="96"
            title="包含子异常"
          >
            <template #default="{ record }">
              <a-switch v-model:checked="record.includeChildExceptions" />
            </template>
          </a-table-column>
          <a-table-column align="center" width="52" title="操作">
            <template #default="{ index }">
              <a-button danger shape="circle" size="small" @click="cloned.exceptions.splice(index, 1)">
                <DeleteOutlined />
              </a-button>
            </template>
          </a-table-column>
        </a-table>
      </a-form-item>
    </a-form>
    <ErrorEventDrawer ref="errorEventDrawerRef" @confirm="confirmErrorEvent" />
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
