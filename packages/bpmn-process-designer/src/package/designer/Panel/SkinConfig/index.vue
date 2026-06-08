<script setup lang="ts">
/**
 * SkinConfig — 皮肤配置面板（只读阶段）
 * 在属性面板中展示当前节点绑定的皮肤信息
 */
import { ref, watch } from 'vue'
import { selectedElementRef } from '@/hooks/useService'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'

const props = withDefaults(defineProps<{
  panel?: boolean
  header?: string
}>(), {
  panel: true,
  header: '皮肤配置',
})

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
  <a-collapse-panel v-if="props.panel" key="skin-config" :header="props.header">
    <a-form-item v-if="hasSkin" label="皮肤">
      <a-tag color="processing" style="margin:0">
        {{ skinCode }}
      </a-tag>
      <span type="info" size="small" style="margin-left:8px">(皮肤已绑定)</span>
    </a-form-item>
    <div v-else class="skin-config-empty">未绑定皮肤</div>
  </a-collapse-panel>
  <section v-else class="skin-config-section">
    <div class="skin-config-section__header">{{ props.header }}</div>
    <a-form-item v-if="hasSkin" label="皮肤">
      <a-tag color="processing" style="margin:0">
        {{ skinCode }}
      </a-tag>
      <span type="info" size="small" style="margin-left:8px">(皮肤已绑定)</span>
    </a-form-item>
    <div v-else class="skin-config-empty">未绑定皮肤</div>
  </section>
</template>

<style scoped lang="scss">
.skin-config-empty {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.skin-config-section {
  padding: 10px 12px;
  border: 1px solid var(--bpd-border-color-split, #f0f0f0);
  border-radius: var(--bpd-radius, 6px);
  background: var(--bpd-container-bg, #fff);
}

.skin-config-section__header {
  margin-bottom: 10px;
  color: var(--bpd-text-color, #262626);
  font-size: 13px;
  font-weight: 600;
}
</style>
