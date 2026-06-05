<script setup lang="ts">
import { ref } from 'vue'
import { useCloned } from '@vueuse/core'
import type { VariableAggregation } from '@/types'
import { cloneDeep } from 'lodash-es'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'

const emits = defineEmits<{
  (e: 'confirm', variableAggregation: VariableAggregation): void
}>()
const formSize = useFormSize()
const drawerVisible = ref(false)
const { cloned, sync } = useCloned<VariableAggregation>({
  target: '',
  variableType: 'createOverviewVariable',
  expression: '',
  variables: [],
})
const formRef = ref<FormInstance>()
const expressionRule = ref<FormItemRule>({
  trigger: 'blur',
  validator: (_, value, callback) => {
    if (value) {
      const match = value.match(/^\$\{(.+)\}$/)
      value = match?.length ? match[1] : value
      if (!/^([a-z][\w-.]*:)?[a-z_][\w-.]*$/i.test(value)) {
        return callback(new Error('变量名只能包含字母、数字、下划线，且不能以数字开头'))
      }
    }
    callback()
  },
})
const formRules = ref<FormRules>({
  target: [expressionRule.value, { required: true, message: '请输入目标', trigger: 'blur' }],
  expression: [
    {
      validator: (_, value, callback) => {
        if (value) {
          if (!/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/.test(value) && !/^\$\{.*\}$/.test(value)) {
            return callback(new Error('请输入正确的java类路径/委托表达式'))
          }
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  variableType: [{ required: true, message: '请选择变量类型', trigger: 'change' }],
  variables: [{ required: true, message: '请选择添加变量', trigger: 'change', type: 'array' }],
})

const onClosed = () => {
  sync()
  formRef.value?.clearValidate()
}
const openDrawer = (variableAggregation?: VariableAggregation) => {
  if (variableAggregation) {
    cloned.value = cloneDeep(variableAggregation)
    cloned.value.element = variableAggregation.element
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
const addVariable = () => {
  cloned.value.variables.push({
    source: '',
    target: '',
  })
}
const delVariable = (index: number) => {
  cloned.value.variables?.splice(index, 1)
}
defineExpose({
  openDrawer,
})
</script>

<template>
  <a-drawer v-model:visible="drawerVisible" append-to-body :lock-scroll="false" width="35%" @closed="onClosed" :show-close="false" :closable="false" v-bind="$attrs">
    <a-form
      ref="formRef"
      label-position="top"
      :model="cloned"
      :rules="formRules"
      label-width="90px"
      :size="formSize"
    >
      <a-form-item label="聚合变量" prop="target">
        <a-input v-model="cloned.target" placeholder="请输入变量名/委托表达式"></a-input>
      </a-form-item>
      <a-form-item label="自定义实现" prop="expression">
        <a-input v-model="cloned.expression" placeholder="请输入java类/委托表达式"></a-input>
      </a-form-item>
      <a-form-item label="变量类型" prop="variableType">
        <a-radio-group v-model="cloned.variableType">
          <a-radio-button label="普通变量" value="createOverviewVariable" />
          <a-radio-button label="瞬态变量" value="storeAsTransientVariable" />
        </a-radio-group>
      </a-form-item>
      <a-form-item label="变量定义" prop="variables">
        <template #label>
          变量定义
          <a-button type="primary" link @click="addVariable"><PlusOutlined /> 添加变量</a-button>
        </template>
        <a-table :dataSource="cloned.variables" height="250px">
          <a-table-column prop="source" label="源变量">
            <template #default="{ row, $index }">
              <a-form-item :prop="`variables.${$index}.source`" required :rules="expressionRule">
                <a-input v-model="row.source" placeholder="源变量"></a-input>
              </a-form-item>
            </template>
          </a-table-column>
          <a-table-column prop="target" label="目标变量">
            <template #default="{ row, $index }">
              <a-form-item :prop="`variables.${$index}.target`" required :rules="expressionRule">
                <a-input v-model="row.target" placeholder="目标变量"></a-input>
              </a-form-item>
            </template>
          </a-table-column>
          <a-table-column align="center" min-width="45px" label="操作">
            <template #default="{ $index }">
              <a-button danger circle text bg @click="delVariable($index)" ><DeleteOutlined /></a-button>
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
