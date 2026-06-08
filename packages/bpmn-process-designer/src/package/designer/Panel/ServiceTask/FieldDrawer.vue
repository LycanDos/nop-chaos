<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import { cloneDeep } from 'lodash-es'
import type { Field } from '@/types'

const emits = defineEmits<{
  (e: 'confirm', data: Field): void
}>()
const formSize = useFormSize()
const { cloned, sync } = useCloned<Field>({
  name: '',
  type: 'string',
  value: '',
})
const formRules = ref<FormRules>({
  name: [{ required: true, message: '请输入字段名', trigger: 'blur' }],
  type: [{ required: true, message: '请输入字段类型', trigger: 'blur' }],
  value: [
    { required: true, message: '请输入字段值', trigger: 'blur' },
    {
      validator: (_, value) => {
        if (cloned.value.type === 'expression') {
          const reg = /^\$\{.*\}$/
          if (!reg.test(value)) {
            return new Error('请输入正确的表达式，必须是 ${xx} 格式')
          }
        }
        return true
      },
      trigger: 'blur',
    },
  ],
})
const formRef = ref<FormInstance>()
const drawerVisible = ref(false)
const openDrawer = (field?: Field) => {
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
  <a-drawer v-model:visible="drawerVisible" append-to-body :lock-scroll="false" @closed="onClosed" :show-close="false" :closable="false">
    <a-form
      ref="formRef"
      label-position="top"
      :model="cloned"
      :rules="formRules"
      label-width="90px"
      :size="formSize"
    >
      <a-form-item label="字段名" prop="name">
        <a-input v-model:value="cloned.name" placeholder="请输入字段名" />
      </a-form-item>
      <a-form-item label="字段类型" prop="type">
        <a-radio-group v-model:value="cloned.type">
          <a-radio-button value="string">字符串</a-radio-button>
          <a-radio-button value="expression">表达式</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="字段值" prop="value">
        <a-input v-model:value="cloned.value" placeholder="请输入字段值" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
