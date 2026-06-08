<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'
import Codemirror from '@/components/CodemirrorEditor/index.vue'
import javascriptSupport from '@/components/CodemirrorEditor/language/javascript'
import { ref } from 'vue'
import juelSupport from '@/components/CodemirrorEditor/language/juel'
import groovySupport from '@/components/CodemirrorEditor/language/groovy'

defineOptions({
  name: 'ScriptTask',
})
const scriptFormat = useCustomRef('scriptFormat')
const script = useCustomRef<string | undefined>('script')
const resultVariable = useCustomRef<string | undefined>('resultVariable')
const autoStoreVariables = useCustomRef<boolean>('autoStoreVariables')
const extensions = ref<any[]>([javascriptSupport])
const changeScriptFormat = (val: string) => {
  if (val === 'javascript') {
    extensions.value = [javascriptSupport]
  } else if (val === 'juel') {
    extensions.value = [juelSupport()]
  } else if (val === 'groovy') {
    extensions.value = [groovySupport]
  } else {
    extensions.value = []
  }
  script.value = undefined
  resultVariable.value = undefined
  autoStoreVariables.value = false
}
</script>

<template>
  <a-collapse-panel key="arg1">
    <template #header><span class="bpd-panel-title">调用脚本</span></template>
    <a-form-item label="脚本格式">
      <a-radio-group v-model:value="scriptFormat" @update:value="changeScriptFormat">
        <a-radio-button value="javascript">JavaScript</a-radio-button>
        <a-radio-button value="groovy">Groovy</a-radio-button>
        <a-radio-button value="juel">Juel</a-radio-button>
      </a-radio-group>
    </a-form-item>
    <a-form-item label="脚本">
      <Codemirror
        :rows="4"
        :max-rows="10"
        autosize
        popup
        :placeholder="`请输入${scriptFormat}脚本`"
        :extensions="extensions"
        v-model="script"
      />
      <!--      <a-input v-model:value="script" type="textarea" :rows="4" placeholder="请输入脚本" />-->
    </a-form-item>
    <a-form-item prop="resultVariable" label="结果变量" v-if="scriptFormat === 'juel'">
      <a-input v-model:value="resultVariable" placeholder="请输入结果变量" />
    </a-form-item>
    <a-form-item prop="autoStoreVariables" label="自动存储变量" v-else>
      <a-switch v-model:checked="autoStoreVariables" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss">
.bpd-panel-title {
  color: var(--bpd-text-color, #262626);
  font-size: 13px;
  font-weight: 600;
}
</style>
