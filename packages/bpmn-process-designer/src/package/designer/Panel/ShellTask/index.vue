<script setup lang="ts">
import {
  getExtensionElementsList,
  removeExtensionElements,
} from '@/designer/utils/ExtensionElementsUtil.ts'
import { onMounted, ref } from 'vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { useFieldRef } from '@/designer/utils/ElementUtil.ts'
import { useBpmnContextService } from '@/hooks/useService.ts'
import Codemirror from '@/components/CodemirrorEditor/index.vue'
import shellSupport from '@/components/CodemirrorEditor/language/shell'

defineOptions({
  name: 'ShellTask',
})
const form = { labelPosition: 'right', size: 'small' }
const { selectedElement } = useBpmnContextService()
const command = useFieldRef('command')
const outputVariable = useFieldRef('outputVariable')
const wait = useFieldRef('wait')
const redirectError = useFieldRef('redirectError')
const cleanEnv = useFieldRef('cleanEnv')
const directory = useFieldRef('directory')
const errorCodeVariable = useFieldRef('errorCodeVariable')
const args = ref<string[]>([])
const updateModelValue = (val: string, index: number) => {
  args.value.splice(index, 1, val)
  const arg = useFieldRef(`arg${index}`)
  arg.value = val
  loadArgs()
}
const delArg = (index: number) => {
  args.value.splice(index, 1)
  const fields = getExtensionElementsList(selectedElement, 'flowable:Field')
  const arg = fields.find((field) => field.get('name') === `arg${index}`)
  if (arg) {
    removeExtensionElements(selectedElement, arg)
    loadArgs()
  }
}
const loadArgs = () => {
  const fields = getExtensionElementsList(selectedElement, 'flowable:Field')
  const argElements = fields.filter((field) => field.get('name').startsWith('arg'))
  args.value = argElements.map((arg) => arg.get('string'))
}
onMounted(() => {
  loadArgs()
})
</script>

<template>
  <a-collapse-panel key="arg1" header="命令">
    <a-form-item label="命令">
      <Codemirror
        :rows="4"
        :max-rows="10"
        autosize
        popup
        placeholder="请输入命令"
        :extensions="[shellSupport]"
        v-model="command"
      />
      <!--      <a-input v-model:value="command" type="textarea" :rows="3" placeholder="请输入命令" />-->
    </a-form-item>
    <a-form-item label="参数">
      <template #label>
        <div class="flex-center">
          参数
          <a-button type="primary" link @click="args.push('')" :disabled="args.length >= 4" ><PlusOutlined />添加 </a-button>
        </div>
      </template>
      <a-row :gutter="10" v-for="(_, index) in args" :key="index" class="w-full mb7px">
        <a-col :span="21">
          <a-input
            :model-value="args[index]"
            @update:model-value="updateModelValue($event, index)"
            allow-clear
            placeholder="请输入参数"
          ></a-input>
        </a-col>
        <a-col :span="3">
          <a-button danger text @click="delArg(index)" shape="circle"><DeleteOutlined /></a-button>
        </a-col>
      </a-row>
    </a-form-item>
    <a-form-item label="输出变量">
      <a-input v-model:value="outputVariable" placeholder="请输入输出变量" />
    </a-form-item>
    <a-row :gutter="10">
      <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
        <a-form-item label="等待">
          <a-switch v-model:checked="wait" active-value="true" inactive-value="false" />
        </a-form-item>
      </a-col>
      <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
        <a-form-item label="重定向错误">
          <a-switch v-model:checked="redirectError" active-value="true" inactive-value="false" />
        </a-form-item>
      </a-col>
      <a-col :span="form?.labelPosition === 'top' ? 8 : 24">
        <a-form-item label="清除环境变量">
          <a-switch v-model:checked="cleanEnv" active-value="true" inactive-value="false" />
        </a-form-item>
      </a-col>
    </a-row>
    <a-form-item label="执行目录">
      <a-input v-model:value="directory" placeholder="请输入执行目录，默认当前目录" />
    </a-form-item>
    <a-form-item label="错误代码变量">
      <a-input v-model:value="errorCodeVariable" placeholder="请输入错误代码存储变量" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
