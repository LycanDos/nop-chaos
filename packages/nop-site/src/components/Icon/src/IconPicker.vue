<template>
  <a-input :disabled="disabled" :style="{ width }" readOnly :placeholder="t('component.icon.placeholder')" :class="prefixCls" v-model:value="currentSelect">
    <template #addonAfter>
      <a-popover placement="bottomLeft" trigger="click" v-model="visible" :overlayClassName="`${prefixCls}-popover`">
        <template #title>
          <div class="flex justify-between">
            <a-input :placeholder="t('component.icon.search')"  @change="debounceHandleSearchChange" allowClear />
          </div>
        </template>

        <template #content>
          <div v-if="getPaginationList.length">
            <ScrollContainer class="border border-solid border-t-0">
              <ul class="flex flex-wrap px-2">
                <li
                  v-for="icon in getPaginationList"
                  :key="icon"
                  :class="currentSelect === icon ? 'border border-primary' : ''"
                  class="p-2 w-1/8 cursor-pointer mr-1 mt-1 flex justify-center items-center border border-solid hover:border-primary"
                  @click="handleClick(icon)"
                  :title="icon"
                >
                  <!-- <Icon :icon="icon" :prefix="prefix" /> -->
                  <SvgIcon v-if="isSvgMode" :name="icon" />
                  <Icon :icon="icon" v-else />
                </li>
              </ul>
            </ScrollContainer>
            <div class="flex py-2 items-center justify-center" v-if="getTotal >= pageSize">
              <a-pagination showLessItems size="small" :pageSize="pageSize" :total="getTotal" @change="handlePageChange" />
            </div>
          </div>
          <template v-else
            ><div class="p-5"><a-empty /></div>
          </template>
        </template>

        <span class="cursor-pointer px-2 py-1 flex items-center" v-if="isSvgMode && currentSelect">
          <SvgIcon :name="currentSelect" />
        </span>
        <Icon :icon="currentSelect || 'ion:apps-outline'" class="cursor-pointer px-2 py-1" v-else />
      </a-popover>
    </template>
  </a-input>
</template>
<script lang="ts" setup name="icon-picker">
  import { ref, watchEffect, watch, unref } from 'vue';
  import { useDesign } from '/@/hooks/web/useDesign';
  import { ScrollContainer } from '/@/Container';
  import { Input, Popover, Pagination, Empty } from 'ant-design-vue';
  import Icon from './Icon.vue';
  import SvgIcon from './SvgIcon.vue';

  import iconsData from '../data/icons.data';
  import { propTypes } from '/@/utils/propTypes';
  import { usePagination } from '/@/hooks/web/usePagination';
  import { useDebounceFn } from '@vueuse/core';
  import { useI18n } from '/@/hooks/web/useI18n';
  import { useCopyToClipboard } from '/@/hooks/web/useCopyToClipboard';
  import { useMessage } from '/@/hooks/web/useMessage';
  import svgIcons from 'virtual:svg-icons-names';

  // 没有使用别名引入，是因为WebStorm当前版本还不能正确识别，会报unused警告
  const AInput = Input;
  const APopover = Popover;
  const APagination = Pagination;
  const AEmpty = Empty;

  function getIcons() {
    const data = iconsData as any;
    const prefix: string = data?.prefix ?? '';
    let result: string[] = [];
    if (prefix) {
      result = (data?.icons ?? []).map((item) => `${prefix}:${item}`);
    } else if (Array.isArray(iconsData)) {
      result = iconsData as string[];
    }
    return result;
  }

  function getSvgIcons() {
    return svgIcons.map((icon) => icon.replace('icon-', ''));
  }

  const props = defineProps({
    value: propTypes.string,
    width: propTypes.string.def('100%'),
    pageSize: propTypes.number.def(140),
    copy: propTypes.bool.def(false),
    mode: propTypes.oneOf<('svg' | 'iconify')[]>(['svg', 'iconify']).def('iconify'),
    disabled: propTypes.bool.def(true),
  });

  const emit = defineEmits(['change', 'update:value']);

  const isSvgMode = props.mode === 'svg';
  const icons = isSvgMode ? getSvgIcons() : getIcons();

  const currentSelect = ref('');
  const visible = ref(false);
  const currentList = ref(icons);

  const { t } = useI18n();
  const { prefixCls } = useDesign('icon-picker');

  const debounceHandleSearchChange = useDebounceFn(handleSearchChange, 100);
  const { clipboardRef, isSuccessRef } = useCopyToClipboard(props.value);
  const { createMessage } = useMessage();

  const { getPaginationList, getTotal, setCurrentPage } = usePagination(currentList, props.pageSize);

  watchEffect(() => {
    currentSelect.value = props.value;
  });

  watch(
    () => currentSelect.value,
    (v) => {
      emit('update:value', v);
      return emit('change', v);
    }
  );

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  function handleClick(icon: string) {
    currentSelect.value = icon;
    if (props.copy) {
      clipboardRef.value = icon;
      if (unref(isSuccessRef)) {
        createMessage.success(t('component.icon.copy'));
      }
    }
  }

  function handleSearchChange(e: ChangeEvent) {
    const value = e.target.value;
    if (!value) {
      setCurrentPage(1);
      currentList.value = icons;
      return;
    }
    currentList.value = icons.filter((item) => item.includes(value));
  }
</script>
<style lang="less">
  @prefix-cls: ~'@{namespace}-icon-picker';

  .@{prefix-cls} {
    .ant-input-group-addon {
      padding: 0;
    }

    &-popover {
      width: 300px;

      .ant-popover-inner-content {
        padding: 0;
      }

      .scrollbar {
        height: 220px;
      }
    }
  }
</style>
