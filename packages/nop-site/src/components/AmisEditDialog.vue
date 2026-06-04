<template>
  <a-modal
    v-model:visible="visibleLocal"
    :destroyOnClose="true"
    wrap-class-name="page-full-screen"
    :maskClosable="false"
    width="100%"
    :footer="null"
    :closable="false"
    :keyboard="false"
    @cancel="handleClose"
  >
    <XuiPageEditorDialog
      v-if="visibleLocal"
      :model-value="visibleLocal"
      :get-page-source="props.getPageSource"
      :save-page-source="props.savePageSource"
      :rollback-page-source="props.rollbackPageSource"
      @update:model-value="handleClose"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch } from 'vue';
import XuiPageEditorDialog from '../../../nop-amis-vue/src/XuiPageEditorDialog.vue';

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
.page-full-screen .ant-modal-body {
  height: 100%;
  margin: 0;
  padding: 0;
}
.page-full-screen .ant-modal-header {
  display: none;
}
/* Full-screen modal: body fills the entire viewport */
.page-full-screen {
  top: 0;
  padding-bottom: 0;
}
.page-full-screen .ant-modal-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style> 
