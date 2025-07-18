<template>
  <Header :class="getHeaderClass">
    <!-- left start -->
    <div :class="`${prefixCls}-left`">
      <!-- logo -->
      <AppLogo v-if="getShowHeaderLogo || getIsMobile" :class="`${prefixCls}-logo`" :theme="getHeaderTheme" :style="getLogoWidth" />
      <LayoutTrigger
        v-if="(getShowContent && getShowHeaderTrigger && !getSplit && !getIsMixSidebar) || getIsMobile"
        :theme="getHeaderTheme"
        :sider="false"
      />
      <LayoutBreadcrumb v-if="getShowContent && getShowBread" :theme="getHeaderTheme" />
      <!-- 欢迎语 -->
      <span v-if="getShowContent && getShowBreadTitle" :class="[prefixCls, `${prefixCls}--${getHeaderTheme}`,'headerIntroductionClass']"> 欢迎进入 {{ title }} </span>
    </div>
    <!-- left end -->

    <!-- menu start -->
    <div :class="`${prefixCls}-menu`" v-if="getShowTopMenu && !getIsMobile">
      <LayoutMenu :isHorizontal="true" :theme="getHeaderTheme" :splitType="getSplitType" :menuMode="getMenuMode" />
    </div>
    <!-- menu-end -->

    <!-- action  -->
    <div :class="`${prefixCls}-action`">
      <!-- <AppSearch :class="`${prefixCls}-action__item `" v-if="getShowSearch" /> -->

      <!-- <ErrorAction v-if="getUseErrorHandle" :class="`${prefixCls}-action__item error-action`" /> -->

      <!-- <Notify v-if="getShowNotice" :class="`${prefixCls}-action__item notify-item`" /> -->
      <a-switch v-if="supportDebug" :checked="debug" @update:checked="toggleDebug" title="Debug" />

      <FullScreen v-if="getShowFullScreen" :class="`${prefixCls}-action__item fullscreen-item`" />

      <LockScreen v-if="getUseLockPage" />

      <AppLocalePicker v-if="getShowLocalePicker" :reload="true" :showText="false" :class="`${prefixCls}-action__item`" />

      <UserDropDown :theme="getHeaderTheme" />

      <SettingDrawer v-if="getShowSetting" :class="`${prefixCls}-action__item`" />
    </div>
  </Header>
  <LoginSelect ref="loginSelectRef" @success="loginSelectOk"></LoginSelect>
  <div class="header-bar">
    <!-- 原有头部内容 -->
    <AppLogo />
    <!-- 全部功能按钮 -->
    <span class="all-functions-btn" @click="showAllFunctions = true" title="全部功能">
      <icon-appstore-outlined style="font-size: 20px; color: #409eff; margin-left: 16px;" />
    </span>
    <!-- 自定义全部功能弹窗 -->
    <div v-if="showAllFunctions" class="all-functions-modal" @click.self="showAllFunctions = false">
      <div class="all-functions-modal-inner">
        <a-input v-model="search" placeholder="搜索功能名称" style="margin-bottom: 16px; width: 300px;" />
        <div class="all-functions-grid">
          <div v-for="group in filteredGroups" :key="group.name" class="function-group">
            <div class="group-title">{{ group.name }}</div>
            <ul>
              <li v-for="item in group.items" :key="item.path" class="function-item" @click="go(item.path)">
                {{ item.meta.title }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
  import { defineComponent, unref, computed, ref, onMounted, toRaw } from 'vue';
  import { useGlobSetting } from '/@/hooks/setting';
  import { propTypes } from '/@/utils/propTypes';

  import { Layout } from 'ant-design-vue';
  import { AppLogo } from '/@/components/Application';
  import LayoutMenu from '../menu/index.vue';
  import LayoutTrigger from '../trigger/index.vue';

  // import { AppSearch } from '/@/components/Application';

  import { useHeaderSetting } from '/@/hooks/setting/useHeaderSetting';
  import { useMenuSetting } from '/@/hooks/setting/useMenuSetting';
  import { useRootSetting } from '/@/hooks/setting/useRootSetting';

  import { MenuModeEnum, MenuSplitTyeEnum } from '/@/enums/menuEnum';
  import { SettingButtonPositionEnum } from '/@/enums/appEnum';
  import { AppLocalePicker } from '/@/components/Application';

  import { UserDropDown, LayoutBreadcrumb, FullScreen, LockScreen } from './components';
  import { useAppInject } from '/@/hooks/web/useAppInject';
  import { useDesign } from '/@/hooks/web/useDesign';

  import { createAsyncComponent } from '/@/utils/factory/createAsyncComponent';
  import { useLocale } from '/@/locales/useLocale';

  import LoginSelect from '/@/views/sys/login/LoginSelect.vue';
  import { useUserStore } from '/@/store/modules/user';

  import {useDebug} from '@nop-chaos/sdk'

  import { getMenus } from '/@/router/menus'
  import { useRouter } from 'vue-router'
  const router = useRouter()
  function go(path) {
    if (path) router.push(path)
  }
  const showAllFunctions = ref(false)
  const search = ref('')
  interface MenuItem {
    path: string;
    meta: { title: string };
    [key: string]: any;
  }
  interface MenuGroup {
    name: string;
    items: MenuItem[];
  }
  const groups = ref<MenuGroup[]>([] as MenuGroup[])

  onMounted(async () => {
    const menus = await getMenus()
    groups.value = menus.map(group => ({
      name: group.meta?.title || '',
      items: (group.children || []).flatMap(flattenMenu)
    }))
  })
  function flattenMenu(menu) {
    if (!menu.children || !menu.children.length) return [menu]
    return menu.children.flatMap(flattenMenu)
  }
  const filteredGroups = computed<MenuGroup[]>(() =>
    groups.value.map(g => ({
      ...g,
      items: g.items.filter(i => i.meta?.title?.includes(search.value))
    })).filter(g => g.items.length)
  )
</script>
<style lang="less">
  @import './index.less';
  //update-begin---author:scott ---date:2022-09-30  for：默认隐藏顶部菜单面包屑-----------
  //顶部欢迎语展示样式
  @prefix-cls: ~'@{namespace}-layout-header';
  
  .@{prefix-cls} {
    display: flex;
    padding: 0 8px;
    align-items: center;
    
    .headerIntroductionClass {
      margin-right: 4px;
      margin-bottom: 2px;
      border-bottom: 0px;
      border-left: 0px;
    }
    
    &--light {
      .headerIntroductionClass {
        color: @breadcrumb-item-normal-color;
      }
    }

    &--dark {
      .headerIntroductionClass {
        color: rgba(255, 255, 255, 0.6);
      }
      .anticon {
        color: rgba(255, 255, 255, 0.8);
      }
    }
    //update-end---author:scott ---date::2022-09-30  for：默认隐藏顶部菜单面包屑--------------
  }
  .header-bar {
    display: flex;
    align-items: center;
    position: relative;
  }
  .all-functions-btn {
    margin-left: 8px;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .all-functions-modal {
    position: absolute;
    top: 60px; /* 根据header高度调整 */
    left: 0;
    right: 0;
    margin: 0 auto;
    z-index: 2000;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    pointer-events: auto;
  }
  .all-functions-modal-inner {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    padding: 32px;
    width: 90vw;
    max-width: 1400px;
    max-height: 80vh;
    overflow: auto;
  }
  .all-functions-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 32px;
  }
  .function-group {
    min-width: 200px;
  }
  .group-title {
    font-weight: bold;
    margin-bottom: 8px;
  }
  .function-item {
    cursor: pointer;
    padding: 4px 0;
    transition: color 0.2s;
  }
  .function-item:hover {
    color: #409eff;
    text-decoration: underline;
  }
</style>
