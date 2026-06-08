<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import type { Properties } from '@/types'
import { cloneDeep } from 'lodash-es'
import { nextId } from '@/designer/utils/ElementUtil.ts'
import { ReloadOutlined } from '@ant-design/icons-vue'

const emits = defineEmits<{
  (e: 'confirm', listener: Properties): void
}>()
const formSize = useFormSize()
const drawerVisible = ref(false)
const { cloned, sync } = useCloned<Properties>({
  id: '',
  name: '',
  value: '',
})
const formRef = ref<FormInstance>()
const formRules = ref<FormRules>({
  id: [{ required: true, message: '请输入id', trigger: 'blur' }],
  name: [{ required: true, message: '请输入属性名', trigger: 'blur' }],
  value: [{ required: true, message: '请输入属性值', trigger: 'blur' }],
})

const onClosed = () => {
  sync()
  formRef.value?.clearValidate()
}
const openDrawer = (properties?: Properties) => {
  if (properties) {
    cloned.value = cloneDeep(properties)
    cloned.value.element = properties.element
  } else {
    cloned.value.id = nextId('Property_')
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
defineExpose({
  openDrawer,
})
</script>

<template>
  <a-drawer
    v-model:visible="drawerVisible"
    width="420px"
    :closable="false"
    v-bind="$attrs"
    @close="onClosed"
  >
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
            <a-button @click="cloned.id = nextId('Property_')"><ReloadOutlined /></a-button>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item label="属性名" prop="name">
        <a-input v-model:value="cloned.name" placeholder="请输入属性名"></a-input>
      </a-form-item>
      <a-form-item label="属性值" prop="value">
        <a-input v-model:value="cloned.value" placeholder="请输入属性值"></a-input>
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
