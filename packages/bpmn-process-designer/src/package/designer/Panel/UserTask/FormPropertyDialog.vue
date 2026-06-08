<script setup lang="ts">
import { useCloned } from '@vueuse/core'
import { cloneDeep } from 'lodash-es'
import { nextId } from '@/designer/utils/ElementUtil.ts'
import type { FormProperty } from '@/types'

const emits = defineEmits<{
  (e: 'confirm', data: FormProperty): void
}>()

const formSize = useFormSize()
const drawerVisible = ref(false)
const formRef = ref<FormInstance>()
const { cloned, sync } = useCloned<FormProperty>({
  id: '',
  name: '',
  type: 'string',
  required: false,
  readable: true,
  writable: true,
  expression: '',
  variable: '',
  default: '',
})

const formRules = ref<FormRules>({
  id: [{ required: true, message: '请输入表单属性id', trigger: 'blur' }],
  name: [{ required: true, message: '请输入表单属性名称', trigger: 'blur' }],
  type: [{ required: true, message: '请输入表单属性类型', trigger: 'blur' }],
  expression: [
    {
      validator: (_, value: string) => {
        if (!value) {
          return true
        }
        // Flowable 在解析表达式时依赖 EL 包裹格式，提前阻断可避免保存后运行期报错。
        const expressionPattern = /^(\$\{[^{}]+\}|#\{[^{}]+\})$/
        if (!expressionPattern.test(value.trim())) {
          return new Error('表达式格式错误，请使用 ${...} 或 #{...}')
        }
        return true
      },
      trigger: 'blur',
    },
  ],
})
const typeOptions = [
  { label: '字符串 (string)', value: 'string' },
  { label: '长整型 (long)', value: 'long' },
  { label: '布尔 (boolean)', value: 'boolean' },
  { label: '日期 (date)', value: 'date' },
  { label: '枚举 (enum)', value: 'enum' },
]

const openDrawer = (formProperty?: FormProperty) => {
  if (formProperty) {
    cloned.value = cloneDeep(formProperty)
    cloned.value.element = formProperty.element
  } else {
    sync()
    cloned.value.id = nextId('FormProperty_')
    cloned.value.type = 'string'
    cloned.value.required = false
    cloned.value.readable = true
    cloned.value.writable = true
  }
  drawerVisible.value = true
}

const handleConfirm = () => {
  formRef.value?.validate((valid) => {
    if (!valid) {
      return
    }
    emits('confirm', cloned.value)
    drawerVisible.value = false
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
  <a-modal
    v-model:visible="drawerVisible"
    append-to-body
    class="form-property-dialog"
    width="min(92vw, 520px)"
    top="8vh"
    :lock-scroll="false"
    destroy-on-close
    @closed="onClosed"
    title="表单属性"
  >
    <a-form
      ref="formRef"
      class="form-property-form"
      layout="vertical"
      :model="cloned"
      :rules="formRules"
      :size="formSize || 'default'"
    >
      <a-row :gutter="10">
        <a-col :span="24">
          <a-form-item label="id" prop="id">
            <a-input v-model:value="cloned.id" placeholder="请输入表单属性id"></a-input>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="名称" prop="name">
            <a-input v-model:value="cloned.name" placeholder="请输入表单属性名称"></a-input>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="类型" prop="type">
            <a-select v-model:value="cloned.type" placeholder="请选择类型">
              <a-select-option
                v-for="item in typeOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                {{ item.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="表达式" prop="expression">
            <a-input v-model:value="cloned.expression" placeholder="可选"></a-input>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="变量名" prop="variable">
            <a-input v-model:value="cloned.variable" placeholder="可选"></a-input>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="默认值" prop="default">
            <a-input v-model:value="cloned.default" placeholder="可选"></a-input>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :prop="['required', 'readable', 'writable']" label="操作">
            <a-space>
              <a-checkbox v-model:checked="cloned.required">必填</a-checkbox>
              <a-checkbox v-model:checked="cloned.readable">可读</a-checkbox>
              <a-checkbox v-model:checked="cloned.writable">可写</a-checkbox>
            </a-space>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<style scoped lang="scss">
:deep(.form-property-dialog .ant-modal-content) {
  border-radius: var(--bpd-radius, 6px);
  overflow: hidden;
}

:deep(.form-property-dialog .ant-modal-header) {
  padding: 14px 16px;
  border-bottom: 1px solid var(--bpd-border-color-split, #f0f0f0);
}

:deep(.form-property-dialog .ant-modal-body) {
  max-height: 62vh;
  overflow: auto;
  padding: 16px 16px 4px;
}

:deep(.form-property-dialog .ant-modal-footer) {
  padding: 10px 16px;
  border-top: 1px solid var(--bpd-border-color-split, #f0f0f0);
}

.form-property-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

@media (max-width: 768px) {
  .form-property-form :deep(.ant-col) {
    max-width: 100%;
    flex: 0 0 100%;
  }
}
</style>
