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
  <a-drawer v-model:visible="drawerVisible" append-to-body :lock-scroll="false" @closed="onClosed" :show-close="false" :closable="false">
    <a-form
      ref="formRef"
      label-position="top"
      :model="cloned"
      :rules="formRules"
      label-width="90px"
      :size="formSize"
    >
      <a-form-item label="id" prop="id">
        <a-input v-model="cloned.id" placeholder="请输入id">
          <template #append>
            <a-button @click="cloned.id = nextId('DataObject_')"><ReloadOutlined /></a-button>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="名称" prop="name">
        <a-input v-model="cloned.name" placeholder="请输入名称" />
      </a-form-item>
      <a-form-item label="类型" prop="type">
        <a-select
          v-model:value="cloned.type"
          placeholder="请选择类型"
          @change="cloned.value = undefined"
        >
          <a-select-option label="字符串" value="xsd:string" />
          <a-select-option label="整数" value="xsd:int" />
          <a-select-option label="长整数" value="xsd:long" />
          <a-select-option label="布尔" value="xsd:boolean" />
          <a-select-option label="浮点数" value="xsd:double" />
          <a-select-option label="时间" value="xsd:datetime" />
        </a-select>
      </a-form-item>
      <a-form-item label="默认值" prop="value">
        <a-input
          type="textarea"
          :rows="4"
          :autosize="{ minRows: 4, maxRows: 10 }"
          v-model="cloned.value"
          placeholder="请输入默认值"
          v-if="cloned.type === 'xsd:string'"
        />
        <a-input-number
          v-model="cloned.value"
          placeholder="请输入默认值"
          :min="-2147483648"
          :max="2147483647"
          v-else-if="cloned.type === 'xsd:int'"
          class="w-full"
        />
        <a-input-number
          v-model="cloned.value"
          placeholder="请输入默认值"
          v-else-if="cloned.type === 'xsd:long'"
          class="w-full"
        />
        <a-switch v-model:checked="cloned.value" v-else-if="cloned.type === 'xsd:boolean'" />
        <a-input-number
          v-model="cloned.value"
          placeholder="请输入默认值"
          :min="4.9e-324"
          :max="1.7976931348623157e308"
          v-else-if="cloned.type === 'xsd:double'"
          class="w-full"
        />
        <a-date-picker
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          v-model="cloned.value"
          placeholder="请选择时间"
          v-else-if="cloned.type === 'xsd:datetime'"
          class="w-full"
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
