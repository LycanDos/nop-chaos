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
        <a-select-option value="zhangsan">张三</a-select-option>
        <a-select-option value="lisi">李四</a-select-option>
        <a-select-option value="wangwu">王五</a-select-option>
        <a-select-option value="maoliu">毛六</a-select-option>
        <a-select-option value="qianqi">钱七</a-select-option>
      </a-select>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
