<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import { cloneDeep } from 'lodash-es'
import { nextId } from '@/designer/utils/ElementUtil.ts'
import type { DataObject } from '@/types'
import { ReloadOutlined } from '@ant-design/icons-vue'

const emits = defineEmits<{
  (e: 'confirm', data: DataObject): void
}>()
const formSize = useFormSize()
const { cloned, sync } = useCloned<DataObject>({
  id: '',
  name: '',
  type: 'xsd:string',
  value: '',
})
const formRules = ref<FormRules>({
  id: [{ required: true, message: '请输入id', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
})
const formRef = ref<FormInstance>()
const drawerVisible = ref(false)
const openDrawer = (dataObject?: DataObject) => {
  if (dataObject) {
    cloned.value = cloneDeep(dataObject)
    cloned.value.element = dataObject.element
  } else {
    cloned.value.id = nextId('DataObject_')
  }
  drawerVisible.value = true
}
const handleConfirm = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      emits('confirm', cloned.value)
      drawerVisible.value = false
    }
  })
}
const onClosed = () => {
  sync()
  formRef.value?.clearValidate()
}
defineExpose({
  openDrawer,
})
</script>

<template>
  <a-drawer v-model:visible="drawerVisible" width="460px" :closable="false" @close="onClosed">
    <a-form
      ref="formRef"
      layout="vertical"
      :model="cloned"
      :rules="formRules"
      :size="formSize"
    >
      <a-form-item label="id" prop="id">
        <a-input v-model:value="cloned.id" placeholder="请输入id">
          <template #append>
            <a-button @click="cloned.id = nextId('DataObject_')"><ReloadOutlined /></a-button>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="名称" prop="name">
        <a-input v-model:value="cloned.name" placeholder="请输入名称" />
      </a-form-item>
      <a-form-item label="类型" prop="type">
        <a-select
          v-model:value="cloned.type"
          placeholder="请选择类型"
          @change="cloned.value = undefined"
        >
          <a-select-option value="xsd:string">字符串</a-select-option>
          <a-select-option value="xsd:int">整数</a-select-option>
          <a-select-option value="xsd:long">长整数</a-select-option>
          <a-select-option value="xsd:boolean">布尔</a-select-option>
          <a-select-option value="xsd:double">浮点数</a-select-option>
          <a-select-option value="xsd:datetime">时间</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="默认值" prop="value">
        <a-input
          v-if="cloned.type === 'xsd:string'"
          v-model:value="cloned.value"
          :rows="4"
          :autosize="{ minRows: 4, maxRows: 10 }"
          placeholder="请输入默认值"
          type="textarea"
        />
        <a-input-number
          v-else-if="cloned.type === 'xsd:int'"
          v-model:value="cloned.value"
          :min="-2147483648"
          :max="2147483647"
          class="w-full"
          placeholder="请输入默认值"
        />
        <a-input-number
          v-else-if="cloned.type === 'xsd:long'"
          v-model:value="cloned.value"
          class="w-full"
          placeholder="请输入默认值"
        />
        <a-switch v-model:checked="cloned.value" v-else-if="cloned.type === 'xsd:boolean'" />
        <a-input-number
          v-else-if="cloned.type === 'xsd:double'"
          v-model:value="cloned.value"
          :min="4.9e-324"
          :max="1.7976931348623157e308"
          class="w-full"
          placeholder="请输入默认值"
        />
        <a-date-picker
          v-else-if="cloned.type === 'xsd:datetime'"
          v-model:value="cloned.value"
          class="w-full"
          placeholder="请选择时间"
          show-time
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
