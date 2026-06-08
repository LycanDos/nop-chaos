<script setup lang="ts">
import { useFieldRef } from '@/designer/utils/ElementUtil.ts'
import Codemirror from '@/components/CodemirrorEditor/index.vue'
import { ref } from 'vue'
import juelSupport from '@/components/CodemirrorEditor/language/juel'
import groovySupport from '@/components/CodemirrorEditor/language/groovy'

defineOptions({
  name: 'MuleTask',
})

const endpointUrl = useFieldRef('endpointUrl')
const language = useFieldRef('language')
const payloadExpression = useFieldRef('payloadExpression')
const resultVariable = useFieldRef('resultVariable')
const extensions = ref<any[]>([juelSupport()])
const changeLanguage = (val: string) => {
  if (val === 'juel') {
    extensions.value = [juelSupport()]
  } else if (val === 'groovy') {
    extensions.value = [groovySupport]
  } else {
    extensions.value = []
  }
  payloadExpression.value = ''
}
</script>

<template>
  <a-collapse-panel key="arg1" header="骡子">
    <a-form-item label="终端url">
      <a-input v-model:value="endpointUrl" placeholder="请输入终端url" />
    </a-form-item>
    <a-form-item label="表达式语言">
      <a-select v-model:value="language" placeholder="请选择表达式语言" @change="changeLanguage">
        <a-select-option value="juel">juel</a-select-option>
        <a-select-option value="groovy">groovy</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item label="有效载荷表达式">
      <Codemirror
        :rows="4"
        :max-rows="10"
        autosize
        popup
        :placeholder="`请输入有效载荷${language}表达式`"
        :extensions="extensions"
        v-model="payloadExpression"
      />
      <!--      <a-input
              v-model:value="payloadExpression"
              type="textarea"
              :rows="3"
              placeholder="请输入有效载荷表达式"
            />-->
    </a-form-item>
    <a-form-item label="返回变量">
      <a-input v-model:value="resultVariable" placeholder="请输入返回变量" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
