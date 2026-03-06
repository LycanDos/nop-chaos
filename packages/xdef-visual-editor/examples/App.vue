<template>
  <div class="app">
    <XdefEditor 
      ref="editorRef"
      @export="handleExport"
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import XdefEditor from '../src/components/XdefEditor.vue'

const editorRef = ref<InstanceType<typeof XdefEditor>>()

const handleExport = (xml: string) => {
  console.log('Exported XML:', xml)
}

const handleChange = (data: any) => {
  console.log('Form data changed:', data)
}

// 暴露方法供外部调用
defineExpose({
  loadExample: () => editorRef.value?.loadExample(),
  clearAll: () => editorRef.value?.clearAll(),
  exportXml: () => editorRef.value?.exportXml(),
  exportJson: () => editorRef.value?.exportJson(),
  getFormData: () => editorRef.value?.getFormData(),
  getGeneratedXml: () => editorRef.value?.getGeneratedXml()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100%;
}

/* 全局修复：所有下拉框使用 fixed 定位 */
.el-select-dropdown,
.el-popper,
.el-select__popper,
.el-tooltip__popper,
.el-autocomplete-suggestion,
.el-cascader__dropdown,
.el-picker__popper,
.el-transfer-panel,
.el-transfer__buttons {
  position: fixed !important;
  z-index: 99999 !important;
}

/* 确保下拉框有正确的背景色 */
.el-select-dropdown,
.el-select__popper,
.el-autocomplete-suggestion {
  background-color: #fff !important;
  border: 1px solid #e4e7ed !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1) !important;
}

/* 修复 Popper 定位问题 */
.el-popper {
  transform: translate3d(0, 0, 0) !important;
}
</style>