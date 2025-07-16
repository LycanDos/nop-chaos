<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/store/modules/app'
// import { Backtop } from '@/components/Backtop'
// import { Setting } from '@/layout/components/Setting'
// import { useRenderLayout } from './components/useRenderLayout'
import { useDesign } from '@/hooks/web/useDesign'

const { getPrefixCls } = useDesign()
const prefixCls = getPrefixCls('layout')
const appStore = useAppStore()
const mobile = computed(() => appStore.getMobile)
const collapse = computed(() => appStore.getCollapse)
const layout = computed(() => appStore.getLayout)
const handleClickOutside = () => {
  appStore.setCollapse(true)
}
// 注释 renderLayout 相关调用，保留静态结构
const renderLayout = () => {
  switch (layout.value) {
    case 'classic':
      // const { renderClassic } = useRenderLayout()
      // return renderClassic()
      return null
    case 'topLeft':
      // const { renderTopLeft } = useRenderLayout()
      // return renderTopLeft()
      return null
    case 'top':
      // const { renderTop } = useRenderLayout()
      // return renderTop()
      return null
    case 'cutMenu':
      // const { renderCutMenu } = useRenderLayout()
      // return renderCutMenu()
      return null
    default:
      return null
  }
}
</script>

<template>
  <section :class="[prefixCls, `${prefixCls}__${layout}`, 'w-[100%] h-[100%] relative']">
    <div
      v-if="mobile && !collapse"
      class="absolute left-0 top-0 z-99 h-full w-full bg-[var(--el-color-black)] opacity-30"
      @click="handleClickOutside"
    ></div>
    <component :is="renderLayout()" />
    <!-- <Backtop /> -->
    <!-- <Setting /> -->
  </section>
</template>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;
$prefix-cls: #{$namespace}-layout;

.#{$prefix-cls} {
  background-color: var(--app-content-bg-color);
}
</style>
