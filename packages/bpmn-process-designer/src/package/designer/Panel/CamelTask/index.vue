<script setup lang="ts">
import { useFieldRef } from '@/designer/utils/ElementUtil.ts'

defineOptions({
  name: 'CamelTask',
})
const camelContext = useFieldRef('camelContext')
</script>

<template>
  <a-collapse-panel key="arg1" header="驼峰">
    <a-form-item label="驼峰内容">
      <a-input v-model:value="camelContext" placeholder="请输入驼峰内容" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
