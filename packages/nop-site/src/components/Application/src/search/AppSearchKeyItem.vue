<template>
  <span :class="$attrs.class">
    <Icon :icon="icon" />
  </span>
</template>
<script lang="ts" setup>
  import { Icon } from '/@/Icon';
  defineProps({
    icon: String,
  });
</script>
