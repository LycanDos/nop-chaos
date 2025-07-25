<template>
  <ConfigProvider :locale="getAntdLocale">
    <AmisToast theme="cxd"/>
    <AppProvider>
      <RouterView />
    </AppProvider>
    <MethodDialog v-if="showMethodDialog" :visible="showMethodDialog" @update:model-value="showMethodDialog = false" />
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

  // 集成bpmn-process-designer的AmisEditDialog弹窗和mitt事件监听
  import { useEmitt } from '../../bpmn-process-designer/src/hooks/web/useEmitt';
  import { ref, reactive } from 'vue';
  import MethodDialog from './components/MethodDialog/MethodDialog.vue';

  console.log('nop-site App.vue setup executed');

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
</script>
