<script setup lang="ts">
import { useFieldRef } from '@/designer/utils/ElementUtil.ts'

defineOptions({
  name: 'CcTask',
})
const assignee = useFieldRef('assignee')
</script>

<template>
  <a-collapse-panel key="arg1" header="抄送">
    <a-form-item label="抄送人">
      <a-select
        v-model:value="assignee"
        multiple
        showSearch
        allow-create
        allowClear
        placeholder="请选择抄送人"
      >
        <a-select-option label="张三" value="zhangsan" />
        <a-select-option label="李四" value="lisi" />
        <a-select-option label="王五" value="wangwu" />
        <a-select-option label="毛六" value="maoliu" />
        <a-select-option label="钱七" value="qianqi" />
      </a-select>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
