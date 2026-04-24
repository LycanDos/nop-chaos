<script lang="tsx">
  import type { PropType, CSSProperties } from 'vue';

  import { computed, defineComponent, unref, toRef } from 'vue';
  import { BasicMenu } from '/@/components/Menu';
  import { SimpleMenu } from '/@/components/SimpleMenu';
  import { AppLogo } from '/@/components/Application';
  import { AppstoreOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons-vue';
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
  const searchInputRef = ref<HTMLElement | null>(null);

  // 弹出面板样式：毛玻璃 + 菜单右侧
  const panelStyle = computed(() => {
    const menuWidth = menuRef.value?.offsetWidth || 200;
    return {
      position: 'fixed',
      left: `${menuWidth}px`,
      top: 0,
      height: '100vh',
      width: '420px',
      maxWidth: `calc(100vw - ${menuWidth}px)`,
      zIndex: 30000,
      background: 'rgba(255, 255, 255, 0.82)',
      backdropFilter: 'blur(20px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
      boxShadow: '4px 0 32px rgba(0, 0, 0, 0.10)',
      borderLeft: '1px solid rgba(255,255,255,0.5)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      animation: 'nop-panel-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    } as CSSProperties;
  });

  // 搜索高亮：将匹配文本包裹在 <mark> 中
  function highlightMatch(text: string, keyword: string) {
    if (!keyword || !text) return text;
    const idx = text.indexOf(keyword);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#fde68a', color: '#92400e', borderRadius: '2px', padding: '0 1px' }}>
          {text.slice(idx, idx + keyword.length)}
        </mark>
        {text.slice(idx + keyword.length)}
      </>
    );
  }

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

      function renderHeader() {
        if (!unref(getIsShowLogo) && !unref(getIsMobile)) return null;
        const isOpen = showAllFunctions.value;
        const isCollapsed = unref(getCollapsed);
        return (
          <div style="display: flex; align-items: center; position: relative;">
            <AppLogo showTitle={!isCollapsed} class={unref(getLogoClass)} theme={unref(getComputedMenuTheme)} />

            {/* 按钮区域：点击切换图标 + 展开搜索框（平滑过渡） */}
            <div
              style={{
                marginLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                height: '32px',
                borderRadius: '16px',
                background: isOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
                flexShrink: 0,
                transition: 'background 0.35s ease, box-shadow 0.35s ease',
                boxShadow: isOpen ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
                title={isOpen ? '关闭' : '全部功能'}
                onClick={() => {
                  showAllFunctions.value = !showAllFunctions.value;
                  search.value = '';
                  if (!showAllFunctions.value) return;
                  setTimeout(() => searchInputRef.value?.focus?.(), 150);
                }}
              >
                {isOpen
                  ? <CloseOutlined style="font-size: 16px; color: #fff;" />
                  : <AppstoreOutlined style="font-size: 18px; color: #fff;" />
                }
              </div>
              {/* 内联搜索框 — 始终渲染，用 CSS 过渡宽度和透明度 */}
              {!isCollapsed && (
                <div
                  style={{
                    overflow: 'hidden',
                    transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
                    width: isOpen ? '88px' : '0px',
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <input
                    ref={searchInputRef}
                    value={search.value}
                    onInput={(e: any) => { search.value = e.target.value }}
                    placeholder="搜索..."
                    style={{
                      width: '88px',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: '#fff',
                      fontSize: '12px',
                      height: '28px',
                      padding: '0 8px 0 2px',
                    }}
                  />
                </div>
              )}
            </div>

            {/* 右侧弹出面板 */}
            {isOpen && (
              <>
                {/* 遮罩层 */}
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 29999,
                    background: 'rgba(0,0,0,0.08)',
                    animation: 'nop-overlay-fade-in 0.2s ease',
                  }}
                  onClick={() => { showAllFunctions.value = false; search.value = ''; }}
                />
                {/* 面板 */}
                <div style={panelStyle.value}>
                  {/* 面板头部搜索（窄菜单时用这个搜索） */}
                  {isCollapsed && (
                    <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
                      <input
                        ref={searchInputRef}
                        value={search.value}
                        onInput={(e: any) => { search.value = e.target.value }}
                        placeholder="搜索功能名称..."
                        style={{
                          width: '100%',
                          height: '36px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0 12px',
                          fontSize: '13px',
                          outline: 'none',
                          background: '#f9fafb',
                          color: '#111827',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e: any) => { e.target.style.borderColor = '#3b82f6'; }}
                        onBlur={(e: any) => { e.target.style.borderColor = '#e5e7eb'; }}
                      />
                    </div>
                  )}
                  {/* 面板内容 */}
                  <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                    {unref(menusRef).map(group => {
                      const children = (group.children || []).filter(
                        item => !search.value || item.meta?.title?.includes(search.value)
                      );
                      if (children.length === 0) return null;
                      return (
                        <div key={group.path} style={{ marginBottom: '20px' }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '13px',
                            color: '#6b7280',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}>
                            {group.icon && <Icon icon={group.icon} size={14} />}
                            {group.name}
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '4px',
                          }}>
                            {children.map(item => (
                              <div
                                key={item.path}
                                style={{
                                  padding: '8px 10px',
                                  fontSize: '13px',
                                  color: '#374151',
                                  cursor: 'pointer',
                                  borderRadius: '6px',
                                  transition: 'background 0.15s',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                onMouseenter={(e: any) => { e.currentTarget.style.background = '#f3f4f6'; }}
                                onMouseleave={(e: any) => { e.currentTarget.style.background = 'transparent'; }}
                                onClick={() => {
                                  handleMenuClick(item.path, item);
                                  showAllFunctions.value = false;
                                  search.value = '';
                                }}
                              >
                                {highlightMatch(item.meta?.title || item.name || '', search.value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {/* 无结果提示 */}
                    {search.value && unref(menusRef).every(g =>
                      !(g.children || []).some(item => item.meta?.title?.includes(search.value))
                    ) && (
                      <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: '13px' }}>
                        未找到匹配的功能
                      </div>
                    )}
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

  @keyframes nop-panel-slide-in {
    from {
      opacity: 0;
      transform: translateX(-12px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes nop-overlay-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

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
