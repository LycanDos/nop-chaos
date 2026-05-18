<script setup lang="ts">
/**
 * SkinConfig — 皮肤配置面板（只读阶段）
 * 在属性面板中展示当前节点绑定的皮肤信息
 */
import { computed, ref, watch } from 'vue'
import { selectedElementRef, useBpmnContextService } from '@/hooks/useService'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'

// 从 extensionElements 中查找 l:SkinDef
const skinCode = ref('')
const hasSkin = ref(false)

watch(selectedElementRef, (el) => {
  if (!el) {
    skinCode.value = ''
    hasSkin.value = false
    return
  }
  const bo = getBusinessObject(el)
  const extValues = bo?.extensionElements?.values || []
  const skinDef = extValues.find((v: any) => v.$type === 'l:SkinDef')
  if (skinDef) {
    skinCode.value = skinDef.skinCode || ''
    hasSkin.value = true
  } else {
    skinCode.value = ''
    hasSkin.value = false
  }
}, { immediate: true })
</script>

<template>
  <el-form-item v-if="hasSkin" label="皮肤">
    <el-tag type="info" style="margin:0">
      {{ skinCode }}
    </el-tag>
    <el-text type="info" size="small" style="margin-left:8px">(皮肤已绑定)</el-text>
  </el-form-item>
</template>
