import type { Menu } from '/@/router/types';
import { ref, onBeforeMount, unref, Ref, nextTick } from 'vue';
import { getMenus } from '/@/router/menus';
import { cloneDeep } from 'lodash-es';
import { filter, forEach } from '/@/utils/helper/treeHelper';
import { useGo } from '/@/hooks/web/usePage';
import { useScrollTo } from '/@/hooks/event/useScrollTo';
import { onKeyStroke, useDebounceFn } from '@vueuse/core';
import { useI18n } from '/@/hooks/web/useI18n';

export interface SearchResult {
  name: string;
  path: string;
  icon?: string;
}

// Translate special characters
function transform(c: string) {
  const code: string[] = ['$', '(', ')', '*', '+', '.', '[', ']', '?', '\\', '^', '{', '}', '|'];
  return code.includes(c) ? `\\${c}` : c;
}

function createSearchReg(key: string) {
  const keys = [...key].map((item) => transform(item));
  const str = ['', ...keys, ''].join('.*');
  return new RegExp(str);
}

export function useMenuSearch(refs: Ref<HTMLElement[]>, scrollWrap: Ref<ElRef>, emit: EmitType) {
  const searchResult = ref<SearchResult[]>([]);
  const keyword = ref('');
  const activeIndex = ref(-1);

  let menuList: Menu[] = [];

  const { t } = useI18n();
  const go = useGo();
  const handleSearch = useDebounceFn(search, 200);

  onBeforeMount(async () => {
    const list = await getMenus();
    menuList = cloneDeep(list);
    forEach(menuList, (item) => {
      item.name = t(item.name);
    });
  });

  function search(e: ChangeEvent) {
    e?.stopPropagation();
    const key = e.target.value;
    keyword.value = key.trim();
    if (!key) {
      searchResult.value = [];
      return;
    }
    const reg = createSearchReg(unref(keyword));
    // 直接对所有菜单进行搜索，不预先过滤有子菜单的节点
    // handlerSearchResult 会递归处理所有层级
    searchResult.value = handlerSearchResult(menuList, reg);
    activeIndex.value = 0;
  }

  function handlerSearchResult(filterMenu: Menu[], reg: RegExp, parent?: Menu) {
    const ret: SearchResult[] = [];
    filterMenu.forEach((item) => {
      const { name, path, icon, children, hideMenu, meta } = item;
      
      // 当前节点匹配且不是隐藏菜单
      if (!hideMenu && reg.test(name)) {
        // 如果有子菜单且没有设置 hideChildrenInMenu，只展示路径但不作为可跳转项
        // 如果是叶子节点或设置了 hideChildrenInMenu，则可以跳转
        const isLeaf = !children?.length || meta?.hideChildrenInMenu;
        if (isLeaf && path) {
          ret.push({
            name: parent?.name ? `${parent.name} > ${name}` : name,
            path,
            icon,
          });
        } else if (!isLeaf && path) {
          // 非叶子节点但匹配了搜索词，也添加到结果中（可跳转到该菜单）
          ret.push({
            name: parent?.name ? `${parent.name} > ${name}` : name,
            path,
            icon,
          });
        }
      }
      
      // 递归处理子菜单
      if (!meta?.hideChildrenInMenu && Array.isArray(children) && children.length) {
        const mergedParent = {
          ...item,
          name: parent?.name ? `${parent.name} > ${item.name}` : item.name,
        };
        ret.push(...handlerSearchResult(children, reg, mergedParent));
      }
    });
    return ret;
  }

  // Activate when the mouse moves to a certain line
  function handleMouseenter(e: any) {
    const index = e.target.dataset.index;
    activeIndex.value = Number(index);
  }

  // Arrow key up
  function handleUp() {
    if (!searchResult.value.length) return;
    activeIndex.value--;
    if (activeIndex.value < 0) {
      activeIndex.value = searchResult.value.length - 1;
    }
    handleScroll();
  }

  // Arrow key down
  function handleDown() {
    if (!searchResult.value.length) return;
    activeIndex.value++;
    if (activeIndex.value > searchResult.value.length - 1) {
      activeIndex.value = 0;
    }
    handleScroll();
  }

  // When the keyboard up and down keys move to an invisible place
  // the scroll bar needs to scroll automatically
  function handleScroll() {
    const refList = unref(refs);
    if (!refList || !Array.isArray(refList) || refList.length === 0 || !unref(scrollWrap)) {
      return;
    }

    const index = unref(activeIndex);
    const currentRef = refList[index];
    if (!currentRef) {
      return;
    }
    const wrapEl = unref(scrollWrap);
    if (!wrapEl) {
      return;
    }
    const scrollHeight = currentRef.offsetTop + currentRef.offsetHeight;
    const wrapHeight = wrapEl.offsetHeight;
    const { start } = useScrollTo({
      el: wrapEl,
      duration: 100,
      to: scrollHeight - wrapHeight,
    });
    start();
  }

  // enter keyboard event
  async function handleEnter() {
    if (!searchResult.value.length) {
      return;
    }
    const result = unref(searchResult);
    const index = unref(activeIndex);
    if (result.length === 0 || index < 0) {
      return;
    }
    const to = result[index];
    handleClose();
    await nextTick();
    go(to.path);
  }

  // close search modal
  function handleClose() {
    searchResult.value = [];
    emit('close');
  }

  // enter search
  onKeyStroke('Enter', handleEnter);
  // Monitor keyboard arrow keys
  onKeyStroke('ArrowUp', handleUp);
  onKeyStroke('ArrowDown', handleDown);
  // esc close
  onKeyStroke('Escape', handleClose);

  return { handleSearch, searchResult, keyword, activeIndex, handleMouseenter, handleEnter };
}
