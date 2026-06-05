<script setup lang="ts">
import { useCustomRef } from '@/designer/utils/ElementUtil.ts'

const terminateAll = useCustomRef('terminateAll')
</script>

<template>
  <a-collapse-panel key="arg1" header="结束">
    <a-form-item label="终止所有">
      <a-switch v-model:checked="terminateAll"></a-switch>
    </a-form-item>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
