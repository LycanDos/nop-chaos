<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'

defineOptions({
  name: 'StartEvent',
})
const initiator = useCustomRef('initiator')
</script>

<template>
  <a-form-item label="发起人">
    <a-input v-model:value="initiator" placeholder="请输入发起人" />
  </a-form-item>
</template>

<style scoped lang="scss"></style>
