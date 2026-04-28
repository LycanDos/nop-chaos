<template>
  <div class="content-wrap" :style="bodyStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ContentWrap' })
defineProps<{
  bodyStyle?: Record<string, string>
}>()
</script>

<style scoped>
.content-wrap {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}
</style>
