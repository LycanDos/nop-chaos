<template>
  <el-dialog
    v-model="visibleLocal"
    :destroy-on-close="true"
    class="page-full-screen"
    :mask-closable="false"
    :append-to-body="true"
    width="100%"
    height="100%"
    :align-center="true"
    :fullscreen="true"
    :footer="null"
    :closable="false"
    :keyboard="false"
    @close="handleClose"
  >
    <XuiPageEditorDialog
      v-if="visibleLocal"
      :model-value="visibleLocal"
      :get-page-source="props.getPageSource"
      :save-page-source="props.savePageSource"
      :rollback-page-source="props.rollbackPageSource"
      @update:model-value="handleClose"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch } from 'vue';
import XuiPageEditorDialog from '../../../../../../nop-amis-vue/src/XuiPageEditorDialog.vue';

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  getPageSource: {
    type: Function,
    required: true
  },
  savePageSource: {
    type: Function,
    required: true
  },
  rollbackPageSource: Function
});

const emit = defineEmits(['close', 'update:visible']);

const visibleLocal = ref(props.visible);
console.log('[AmisEditDialog] props:', props);
watch(() => props.visible, (val) => {
  console.log('[AmisEditDialog] props.visible changed:', val);
  visibleLocal.value = val;
});

function handleClose() {
  console.log('[AmisEditDialog] handleClose called');
  visibleLocal.value = false;
  emit('update:visible', false);
  emit('close');
}
</script>

<style scoped>
.page-full-screen .el-dialog__body {
  height: 100%;
  margin: 0;
  padding: 0;
}
.page-full-screen .el-dialog__header {
  display: none;
}
</style> 