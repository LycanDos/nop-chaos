<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import { cloneDeep } from 'lodash-es'

export interface Params {
  source: string
  target: string
  element?: any
}

const emits = defineEmits<{
  (e: 'confirm', data: Params): void
}>()
const formSize = useFormSize()
const { cloned, sync } = useCloned<Params>({
  source: '',
  target: '',
})
const formRules = ref<FormRules>({
  source: [{ required: true, message: '请输入来源', trigger: 'blur' }],
  target: [{ required: true, message: '请输入目标', trigger: 'blur' }],
})
const formRef = ref<FormInstance>()
const drawerVisible = ref(false)
const openDrawer = (field?: Params) => {
  if (field) {
    cloned.value = cloneDeep(field)
    cloned.value.element = field.element
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
  <a-drawer v-model:visible="drawerVisible" append-to-body :lock-scroll="false" @closed="onClosed" :show-close="false" :closable="false" v-bind="$attrs">
    <a-form
      ref="formRef"
      label-position="top"
      :model="cloned"
      :rules="formRules"
      label-width="90px"
      :size="formSize"
    >
      <a-form-item label="来源" prop="source">
        <a-input v-model:value="cloned.source" placeholder="请输入来源" />
      </a-form-item>
      <a-form-item label="目标" prop="target">
        <a-input v-model:value="cloned.target" placeholder="请输入目标" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
