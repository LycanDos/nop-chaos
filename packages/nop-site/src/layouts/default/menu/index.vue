<script lang="tsx">
  import type { PropType, CSSProperties } from 'vue';

  import { computed, defineComponent, unref, toRef } from 'vue';
  import { BasicMenu } from '/@/components/Menu';
  import { SimpleMenu } from '/@/components/SimpleMenu';
  import { AppLogo } from '/@/components/Application';
  import { AppstoreOutlined } from '@ant-design/icons-vue';
  import Icon from '/@/components/Icon';

  import { MenuModeEnum, MenuSplitTyeEnum } from '/@/enums/menuEnum';

  import { useMenuSetting } from '/@/hooks/setting/useMenuSetting';
  import { ScrollContainer } from '/@/components/Container';

  import { useGo } from '/@/hooks/web/usePage';
  import { useSplitMenu } from './useLayoutMenu';
  import { openWindow } from '/@/utils';
  import { propTypes } from '/@/utils/propTypes';
  import { isUrl } from '/@/utils/is';
  import { useRootSetting } from '/@/hooks/setting/useRootSetting';
  import { useAppInject } from '/@/hooks/web/useAppInject';
  import { useDesign } from '/@/hooks/web/useDesign';
  import { useLocaleStore } from '/@/store/modules/locale';

  import { ref, onMounted } from 'vue'
  import { getMenus } from '/@/router/menus'
  const showAllFunctions = ref(false)
  const search = ref('')
  const groups = ref([])
  const menuRef = ref<HTMLElement | null>(null);
  const drawerStyle = computed(() => {
    const menuWidth = menuRef.value?.offsetWidth || 200;
    return {
      position: 'fixed',
      left: `${menuWidth}px`,
      top: 0,
      height: '100%',
      width: `calc(100vw - ${menuWidth}px)` ,
      zIndex: 30000, // 提升层级
      background: 'rgba(255,255,255,0.7)', // 半透明白色
      boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      padding: '24px',
      overflow: 'auto',
      transition: 'left 0.2s,width 0.2s',
      backdropFilter: 'blur(16px)', // 毛玻璃
      WebkitBackdropFilter: 'blur(16px)', // 兼容Safari
      borderRadius: '12px 0 0 12px',
      border: '1px solid rgba(255,255,255,0.18)',
    } as React.CSSProperties;
  });

  onMounted(async () => {
    const menus = await getMenus()
    groups.value = menus.map(group => ({
      name: group.meta.title,
      items: (group.children || []).flatMap(flattenMenu)
    }))
  })
  function flattenMenu(menu) {
    if (!menu.children || !menu.children.length) return [menu]
    return menu.children.flatMap(flattenMenu)
  }
  const filteredGroups = computed(() =>
    groups.value.map(g => ({
      ...g,
      items: g.items.filter(i => i.meta.title.includes(search.value))
    })).filter(g => g.items.length)
  )

  export default defineComponent({
    name: 'LayoutMenu',
    props: {
      theme: propTypes.oneOf(['light', 'dark']),

      splitType: {
        type: Number as PropType<MenuSplitTyeEnum>,
        default: MenuSplitTyeEnum.NONE,
      },

      isHorizontal: propTypes.bool,
      // menu Mode
      menuMode: {
        type: [String] as PropType<Nullable<MenuModeEnum>>,
        default: '',
      },
    },
    setup(props) {
      const go = useGo();

      const {
        getMenuMode,
        getMenuType,
        getMenuTheme,
        getCollapsed,
        getCollapsedShowTitle,
        getAccordion,
        getIsHorizontal,
        getIsSidebarType,
        getSplit,
      } = useMenuSetting();
      const { getShowLogo } = useRootSetting();

      const { prefixCls } = useDesign('layout-menu');

      const { menusRef } = useSplitMenu(toRef(props, 'splitType'));

      const { getIsMobile } = useAppInject();

      const getComputedMenuMode = computed(() => (unref(getIsMobile) ? MenuModeEnum.INLINE : props.menuMode || unref(getMenuMode)));

      const getComputedMenuTheme = computed(() => props.theme || unref(getMenuTheme));

      const getIsShowLogo = computed(() => unref(getShowLogo) && unref(getIsSidebarType));

      const getUseScroll = computed(() => {
        return (
          !unref(getIsHorizontal) &&
          (unref(getIsSidebarType) || props.splitType === MenuSplitTyeEnum.LEFT || props.splitType === MenuSplitTyeEnum.NONE)
        );
      });

      const getWrapperStyle = computed((): CSSProperties => {
        return {
          height: `calc(100% - ${unref(getIsShowLogo) ? '48px' : '0px'})`,
        };
      });

      const getLogoClass = computed(() => {
        return [
          `${prefixCls}-logo`,
          unref(getComputedMenuTheme),
          {
            [`${prefixCls}--mobile`]: unref(getIsMobile),
          },
        ];
      });

      const getCommonProps = computed(() => {
        const menus = unref(menusRef);
        return {
          menus,
          beforeClickFn: beforeMenuClickFn,
          items: menus,
          theme: unref(getComputedMenuTheme),
          accordion: unref(getAccordion),
          collapse: unref(getCollapsed),
          collapsedShowTitle: unref(getCollapsedShowTitle),
          onMenuClick: handleMenuClick,
        };
      });
      /**
       * click menu
       * @param menu
       */
      //update-begin-author:taoyan date:2022-6-1 for: VUEN-1144 online 配置成菜单后，打开菜单，显示名称未展示为菜单名称
      const localeStore = useLocaleStore();
      function handleMenuClick(path: string, item) {
        if (item) {
          localeStore.setPathTitle(path, item.title || '');
        }
        go(path);
      }
      //update-end-author:taoyan date:2022-6-1 for: VUEN-1144 online 配置成菜单后，打开菜单，显示名称未展示为菜单名称

      /**
       * before click menu
       * @param menu
       */
      async function beforeMenuClickFn(path: string) {
        if (!isUrl(path)) {
          return true;
        }
        openWindow(path);
        return false;
      }

      const popupHover = ref(false);
      function handleMouseEnter() {
        popupHover.value = true;
      }
      function handleMouseLeave() {
        popupHover.value = false;
        setTimeout(() => {
          if (!popupHover.value) showAllFunctions.value = false;
        }, 120);
      }

      function renderHeader() {
        if (!unref(getIsShowLogo) && !unref(getIsMobile)) return null;
        return (
          <div style="display: flex; align-items: center;">
            <AppLogo showTitle={!unref(getCollapsed)} class={unref(getLogoClass)} theme={unref(getComputedMenuTheme)} />
            <div style="margin-left: 8px; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;" title="全部功能" onClick={() => showAllFunctions.value = true}>
              <AppstoreOutlined style="font-size: 20px; color: #fff;" />
            </div>
            {showAllFunctions.value && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 29999,
                    background: 'transparent',
                  }}
                  onClick={() => (showAllFunctions.value = false)}
                />
                <div
                  style={drawerStyle.value}
                  onMouseLeave={() => (showAllFunctions.value = false)}
                >
                  <div>
                    <a-input v-model:value={search.value} placeholder="搜索功能名称" style={{ marginBottom: '16px' }} />
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '32px',
                        alignItems: 'flex-start',
                      }}
                    >
                      {unref(menusRef).map(group => (
                        <div key={group.path}>
                          <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', fontSize: '16px' }}>
                            {group.icon && <span style={{ marginRight: '6px' }}><Icon icon={group.icon} size={18} /></span>}
                            {group.name}
                          </div>
                          <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                            {(group.children || []).filter(item => item.meta?.title?.includes(search.value)).map(item => (
                              <li
                                key={item.path}
                                style={{ padding: '2px 0', fontSize: '15px', cursor: 'pointer', textAlign: 'left' }}
                                onClick={() => handleMenuClick(item.path, item)}
                              >
                                {item.meta?.title || item.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      }

      function renderMenu() {
        const { menus, ...menuProps } = unref(getCommonProps);
        // console.log(menus);
        if (!menus || !menus.length) return null;
        return !props.isHorizontal ? (
          <SimpleMenu {...menuProps} isSplitMenu={unref(getSplit)} items={menus} />
        ) : (
          <BasicMenu
            {...(menuProps as any)}
            isHorizontal={props.isHorizontal}
            type={unref(getMenuType)}
            showLogo={unref(getIsShowLogo)}
            mode={unref(getComputedMenuMode as any)}
            items={menus}
          />
        );
      }

      return () => {
        return (
          <>
            <div ref={menuRef} style="display: contents;">
              {renderHeader()}
              {unref(getUseScroll) ? <ScrollContainer style={unref(getWrapperStyle)}>{() => renderMenu()}</ScrollContainer> : renderMenu()}
            </div>
          </>
        );
      };
    },
  });
</script>
<style lang="less">
  @prefix-cls: ~'@{namespace}-layout-menu';
  @logo-prefix-cls: ~'@{namespace}-app-logo';

  .@{prefix-cls} {
    &-logo {
      height: @header-height;
      padding: 10px 4px 10px 10px;

      img {
        width: @logo-width;
        height: @logo-width;
      }
    }

    &--mobile {
      .@{logo-prefix-cls} {
        &__title {
          opacity: 1;
        }
      }
    }
  }
</style>
