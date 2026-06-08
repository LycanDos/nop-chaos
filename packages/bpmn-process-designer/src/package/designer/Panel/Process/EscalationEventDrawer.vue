<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import { cloneDeep } from 'lodash-es'
import { nextId } from '@/designer/utils/ElementUtil.ts'
import type { EscalationEvent } from '@/types'
import { ReloadOutlined } from '@ant-design/icons-vue'

const emits = defineEmits<{
  (e: 'confirm', data: EscalationEvent): void
}>()
const formSize = useFormSize()
const { cloned, sync } = useCloned<EscalationEvent>({
  id: '',
  name: '',
  escalationCode: '',
})
const formRules = ref<FormRules>({
  id: [{ required: true, message: '请输入id', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  escalationCode: [{ required: true, message: '请输入升级码', trigger: 'blur' }],
})
const formRef = ref<FormInstance>()
const drawerVisible = ref(false)
const openDrawer = (escalation?: EscalationEvent) => {
  if (escalation) {
    cloned.value = cloneDeep(escalation)
    cloned.value.element = escalation.element
  } else {
    cloned.value.id = nextId('Escalation_')
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
  <a-drawer v-model:visible="drawerVisible" width="420px" :closable="false" @close="onClosed">
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
            <a-button @click="cloned.id = nextId('Escalation_')"><ReloadOutlined /></a-button>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="名称" prop="name">
        <a-input v-model:value="cloned.name" placeholder="请输入名称" />
      </a-form-item>
      <a-form-item label="升级码" prop="escalationCode">
        <a-input v-model:value="cloned.escalationCode" placeholder="请输入升级码" />
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
