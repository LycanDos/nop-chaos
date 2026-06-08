<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import type { ExecutionListener } from '@/types'
import { cloneDeep } from 'lodash-es'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'

const emits = defineEmits<{
  (e: 'confirm', listener: ExecutionListener): void
}>()
const formSize = useFormSize()
const drawerVisible = ref(false)
const { cloned, sync } = useCloned<ExecutionListener>({
  event: '',
  type: 'class',
  impl: '',
  fields: [],
})
const formRef = ref<FormInstance>()
const formRules = ref<FormRules>({
  event: [{ required: true, message: '请选择事件', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'blur' }],
  impl: [
    {
      trigger: 'blur',
      required: true,
      validator(_, value, callback) {
        if (!value) {
          return callback('请输入监听器')
        }
        if (['delegateExpression', 'expression'].includes(cloned.value.type)) {
          const reg = /^\$\{.*\}$/
          if (!reg.test(value)) {
            return callback('请输入正确的表达式，必须是 ${xx} 格式')
          }
        } else if (cloned.value.type === 'class') {
          const reg = /^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/
          if (!reg.test(value)) {
            return callback('请输入正确的java类路径，必须是 com.xx.xx 格式')
          }
        }
        callback()
      },
    },
  ],
})
const fieldNameRule = ref<FormItemRule>({
  trigger: 'blur',
  required: true,
  validator(_, value, callback) {
    if (!value) {
      return callback('字段名不能为空')
    }
    const count = cloned.value.fields?.filter((item) => item.name === value).length || 0
    if (count > 1) {
      ElMessage.warning('字段名不能重复')
      callback(new Error('字段名不能重复'))
    } else {
      callback()
    }
  },
})
const fieldValueRule = ref<FormItemRule>({
  trigger: 'blur',
  required: true,
  validator({ field }, value, callback) {
    if (!value) {
      return callback('字段值不能为空')
    }
    if (field) {
      const index = field.split('.')[1]
      const row = cloned.value.fields?.[parseInt(index)]
      if (row?.type === 'expression') {
        const reg = /^\$\{.*\}$/
        if (!reg.test(value)) {
          return callback('请输入正确的表达式，必须是 ${xx} 格式')
        }
      }
    }
    callback()
  },
})
const onClosed = () => {
  sync()
  formRef.value?.clearValidate()
}
const openDrawer = (listener?: ExecutionListener) => {
  if (listener) {
    cloned.value = cloneDeep(listener)
    cloned.value.element = listener.element
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
const addField = () => {
  cloned.value.fields?.push({
    name: '',
    type: 'string',
    value: '',
  })
}
const delField = (index: number) => {
  cloned.value.fields?.splice(index, 1)
}
defineExpose({
  openDrawer,
})
</script>

<template>
  <a-drawer
    v-model:visible="drawerVisible"
    width="520px"
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
      <a-form-item label="事件" prop="event">
        <a-radio-group v-model:value="cloned.event">
          <slot name="eventOptions"></slot>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="类型" prop="type">
        <a-radio-group v-model:value="cloned.type">
          <a-radio-button value="class">java类</a-radio-button>
          <a-radio-button value="expression">表达式</a-radio-button>
          <a-radio-button value="delegateExpression">委托表达式</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="监听器" prop="impl">
        <a-input v-model:value="cloned.impl" placeholder="请输入监听器"></a-input>
      </a-form-item>
      <a-form-item prop="fields">
        <template #label>
          注入字段
          <a-button type="link" size="small" @click="addField()"><PlusOutlined /> 创建字段 </a-button>
        </template>
        <a-table :data-source="cloned.fields" size="small" :pagination="false" :scroll="{ y: 270 }">
          <a-table-column data-index="name" title="字段名">
            <template #default="{ record, index }">
              <a-form-item :prop="`fields.${index}.name`" :rules="fieldNameRule">
                <a-input v-model:value="record.name" placeholder="字段名"></a-input>
              </a-form-item>
            </template>
          </a-table-column>
          <a-table-column data-index="type" width="120" title="字段类型">
            <template #default="{ record, index }">
              <a-form-item :prop="`fields.${index}.type`" :rules="{ required: true, message: '字段类型不能为空', trigger: 'change' }">
                <a-select v-model:value="record.type" placeholder="字段类型">
                  <a-select-option value="string">字符串</a-select-option>
                  <a-select-option value="expression">表达式</a-select-option>
                </a-select>
              </a-form-item>
            </template>
          </a-table-column>
          <a-table-column data-index="value" title="字段值">
            <template #default="{ record, index }">
              <a-form-item :prop="`fields.${index}.value`" :rules="fieldValueRule">
                <a-input v-model:value="record.value" placeholder="字段值"></a-input>
              </a-form-item>
            </template>
          </a-table-column>
          <a-table-column align="center" width="52" title="操作">
            <template #default="{ index }">
              <a-button danger shape="circle" size="small" @click="delField(index)">
                <DeleteOutlined />
              </a-button>
            </template>
          </a-table-column>
        </a-table>
      </a-form-item>
    </a-form>
    <template #footer>
      <a-button @click="drawerVisible = false">取 消</a-button>
      <a-button type="primary" @click="handleConfirm">确 定</a-button>
    </template>
  </a-drawer>
</template>

<style scoped lang="scss"></style>
