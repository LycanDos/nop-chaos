<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import { cloneDeep } from 'lodash-es'
import { nextId } from '@/designer/utils/ElementUtil.ts'
import type { MessageEvent } from '@/types'
import { ReloadOutlined } from '@ant-design/icons-vue'

const emits = defineEmits<{
  (e: 'confirm', data: MessageEvent): void
}>()
const formSize = useFormSize()
const { cloned, sync } = useCloned<MessageEvent>({
  id: '',
  name: '',
})
const formRules = ref<FormRules>({
  id: [{ required: true, message: '请输入id', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
})
const formRef = ref<FormInstance>()
const drawerVisible = ref(false)
const openDrawer = (message?: MessageEvent) => {
  if (message) {
    cloned.value = cloneDeep(message)
    cloned.value.element = message.element
  } else {
    cloned.value.id = nextId('Message_')
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
            <a-button @click="cloned.id = nextId('Message_')"><ReloadOutlined /></a-button>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="名称" prop="name">
        <a-input v-model="cloned.name" placeholder="请输入名称" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
