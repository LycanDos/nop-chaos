<template>
  <ConfigProvider :locale="getAntdLocale">
    <AmisToast theme="antd"/>
    <AppProvider>
      <RouterView />
    </AppProvider>
    <MethodDialog v-if="showMethodDialog" v-model:visible="showMethodDialog" />
    <AmisEditDialog 
      v-if="showAmisDialog" 
      :visible="showAmisDialog" 
      :getPageSource="amisDialogOptions.getPageSource"
      :savePageSource="amisDialogOptions.savePageSource"
      :rollbackPageSource="amisDialogOptions.rollbackPageSource"
      @close="showAmisDialog = false"
    />
    <!-- DIY样式编辑器弹窗 -->
    <DiyStyleDialog
      v-if="showDiyStyleDialog"
      :visible="showDiyStyleDialog"
      :element="diyStyleElement"
      @update:visible="showDiyStyleDialog = false"
      @save="handleDiyStyleSave"
    />
    <!-- AI Copilot 全局浮窗 -->
    <AiCopilot v-if="copilotEnabled" ref="aiCopilotRef" />
  </ConfigProvider>
</template>

<script lang="ts" setup>
  import { ConfigProvider } from 'ant-design-vue';
  import { AppProvider } from '/@/components/Application';
  import { useTitle } from '/@/hooks/web/useTitle';
  import { useLocale } from '/@/locales/useLocale';
  import {AmisToast} from '@nop-chaos/sdk'

  // 解决日期时间国际化问题
  import 'dayjs/locale/zh-cn';
  // support Multi-language
  const { getAntdLocale } = useLocale();

  useTitle();

  // 事件总线 hook（本地实现）
  import { useEmitt } from '/@/hooks/web/useEmitt';
  import { ref, reactive, defineAsyncComponent } from 'vue';
  const MethodDialog = defineAsyncComponent(() => import('./components/MethodDialog/MethodDialog.vue'));
  const AmisEditDialog = defineAsyncComponent(() => import('./components/AmisEditDialog.vue'));
  const DiyStyleDialog = defineAsyncComponent(() => import('./components/DiyStyleDialog.vue'));
  const AiCopilot = defineAsyncComponent(() => import('./components/AiCopilot/AiCopilot.vue'));

  console.log('nop-site App.vue setup executed');

  // AI Copilot 开关（可通过 localStorage 或远程配置控制）
  const copilotEnabled = ref(true);
  const aiCopilotRef = ref();

  const showAmisDialog = ref(false);
  const amisDialogOptions = reactive({
    getPageSource: async () => ({}),
    savePageSource: async () => true,
    rollbackPageSource: async () => true
  });

  useEmitt({
    name: 'open-amis-dialog',
    callback: (opts: any) => {
      console.log('on open-amis-dialog', opts);
      amisDialogOptions.getPageSource = opts.getPageSource || (async () => ({}));
      amisDialogOptions.savePageSource = opts.savePageSource || (async () => true);
      amisDialogOptions.rollbackPageSource = opts.rollbackPageSource || (async () => true);
      showAmisDialog.value = true;
      console.log('showAmisDialog.value set to true');
    }
  });

  const showMethodDialog = ref(false);

  useEmitt({
    name: 'open-method-dialog',
    callback: (opts) => {
      showMethodDialog.value = true;
    }
  });

  // DIY样式编辑器相关状态
  const showDiyStyleDialog = ref(false);
  const diyStyleElement = ref(null);

  // 监听DIY样式编辑器事件
  useEmitt({
    name: 'open-diy-style-dialog',
    callback: (opts: any) => {
      console.log('on open-diy-style-dialog', opts);
      diyStyleElement.value = opts.element;
      showDiyStyleDialog.value = true;
    }
  });

  // 处理DIY样式保存
  const handleDiyStyleSave = (styleData: any) => {
    console.log('DIY样式保存:', styleData);
    // 可以在这里添加额外的保存逻辑
  };
</script>

<style lang="less">
.AMISCSSWrapper {
  .cxd-Switch:not(.is-checked):not(.is-on) .cxd-Switch-option,
  .cxd-CBInputSwitch:not(.is-checked):not(.is-on) .cxd-Switch-option {
    color: @primary-color !important;
  }
}
</style>
