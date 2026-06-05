<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'

defineOptions({
  name: 'ExternalTask',
})
const topic = useCustomRef('topic')
</script>

<template>
  <a-collapse-panel key="arg1" header="外部工作">
    <a-form-item label="工作主题">
      <a-input v-model="topic" placeholder="请输入工作主题" />
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
