import type { Router, RouteRecordNormalized } from 'vue-router';
import type { AppRouteModule, AppRouteRecordRaw } from '/@/router/types';

import { cloneDeep, omit } from 'lodash-es';
import { createRouter, createWebHashHistory } from 'vue-router';
import { getParentLayout, LAYOUT } from '/@/router/constant';
import { URL_HASH_TAB } from '/@/utils';
import { getTenantId, getToken } from '/@/utils/auth';
import { warn } from '/@/utils/log';
import { packageViews } from '/@/utils/monorepo/dynamicRouter';

import {XuiPage} from '@nop-chaos/sdk'

export type LayoutMapKey = 'LAYOUT';
const IFRAME = () => import('/@/views/sys/iframe/FrameBlank.vue');
const LayoutContent = () => import('/@/layouts/default/content/index.vue');

const LayoutMap = new Map<string, any>();

LayoutMap.set('LAYOUT', LAYOUT);
LayoutMap.set('IFRAME', IFRAME);
//微前端qiankun
LayoutMap.set('LayoutsContent', LayoutContent);

const AMIS = XuiPage // () => import("/@/nop/amis/AmisPage.vue")
LayoutMap.set("AMIS", AMIS)

let dynamicViewsModules: Record<string, () => Promise<Recordable>>;

// Dynamic introduction
function asyncImportRoute(routes: AppRouteRecordRaw[] | undefined) {
  if (!dynamicViewsModules) {
    dynamicViewsModules = import.meta.glob('../../views/**/*.{vue,tsx}');
    // 跟模块views合并
    dynamicViewsModules = Object.assign({}, dynamicViewsModules, packageViews);
  }
  if (!routes) return;
  routes.forEach((item) => {

    //【jeecg-boot/issues/I5N2PN】左侧动态菜单怎么做国际化处理  2022-10-09
    //菜单支持国际化翻译
    //@canonical 取消动态执行国际化代码，国际化可以由后台直接转换，无需前台再执行js
    // if (item?.meta?.title) {
    //   const { t } = useI18n();
    //   if(item.meta.title.includes('t(\'') && t){
    //     item.meta.title = eval(item.meta.title);
    //     //console.log('译后: ',item.meta.title)
    //   }
    // }
   
    // update-begin--author:sunjianlei---date:20210918---for:适配旧版路由选项 --------
    // @ts-ignore 适配隐藏路由
    if (item?.hidden) {
      item.meta.hideMenu = true;
      //是否隐藏面包屑
      item.meta.hideBreadcrumb = true;
    }
    // @ts-ignore 添加忽略路由配置
    if (item?.route == 0) {
      item.meta.ignoreRoute = true;
    }
    // @ts-ignore 添加是否缓存路由配置
    item.meta.ignoreKeepAlive = !item?.meta.keepAlive;
    let token = getToken();
    let tenantId = getTenantId();
    // URL支持{{ window.xxx }}占位符变量
    //update-begin---author:wangshuai ---date:20220711  for：[VUEN-1638]菜单tenantId需要动态生成------------
    item.component = (item.component || '').replace(/{{([^}}]+)?}}/g, (s1, s2) => eval(s2)).replace('${token}', token).replace('${tenantId}', tenantId);
    //update-end---author:wangshuai ---date:20220711  for：[VUEN-1638]菜单tenantId需要动态生成------------
    // 适配 iframe
    if (/^\/?http(s)?/.test(item.component as string)) {
      item.component = item.component.substring(1, item.component.length);
    }
    if (/^http(s)?/.test(item.component as string)) {
      if (item.meta?.internalOrExternal) {
        // @ts-ignore 外部打开
        item.path = item.component;
        // update-begin--author:sunjianlei---date:20220408---for: 【VUEN-656】配置外部网址打不开，原因是带了#号，需要替换一下
        item.path = item.path.replace('#', URL_HASH_TAB);
        // update-end--author:sunjianlei---date:20220408---for: 【VUEN-656】配置外部网址打不开，原因是带了#号，需要替换一下
      } else {
        // @ts-ignore 内部打开
        item.meta.frameSrc = item.component;
      }
      delete item.component;
    }
    // update-end--author:sunjianlei---date:20210918---for:适配旧版路由选项 --------
    if (!item.component && item.meta?.frameSrc) {
      item.component = 'IFRAME';
    }

    // // update-begin--author:canonical---date:20221003---for:增加Amis适配
    if(item.component == 'AMIS'){
      item.props = {
        path: item.meta.url
      }
    }
    // update-end--author:canonical---date:20221003---for:增加Amis适配

    let { component, name } = item;
    const { children } = item;
    if (component) {
      const layoutFound = LayoutMap.get(component.toUpperCase());
      if (layoutFound) {
        item.component = layoutFound;
      } else {
        // update-end--author:zyf---date:20220307--for:VUEN-219兼容后台返回动态首页,目的适配跟v2版本配置一致 --------
        if (component.indexOf('dashboard/') > -1) {
          //当数据标sys_permission中component没有拼接index时前端需要拼接
          if (component.indexOf('/index') < 0) {
            component = component + '/index';
          }
        }
        // update-end--author:zyf---date:20220307---for:VUEN-219兼容后台返回动态首页,目的适配跟v2版本配置一致 --------
        item.component = dynamicImport(dynamicViewsModules, component as string);
      }
    } else if (name) {
      item.component = getParentLayout();
    }
    children && asyncImportRoute(children);
  });
}

function dynamicImport(dynamicViewsModules: Record<string, () => Promise<Recordable>>, component: string) {
  const keys = Object.keys(dynamicViewsModules);
  // 兼容component前面有无/的情况
  let comp = component.startsWith('/') ? component : '/' + component;
  // 先尝试全路径匹配
  let matchKeys = keys.filter((key) => key.endsWith(comp));
  if (matchKeys.length === 0) {
    // 再尝试去掉views/前缀匹配
    const comp2 = comp.replace(/^\/views\//, '/');
    matchKeys = keys.filter((key) => key.endsWith(comp2));
  }
  if (matchKeys.length === 1) {
    const matchKey = matchKeys[0];
    return dynamicViewsModules[matchKey];
  } else if (matchKeys.length > 1) {
    warn(
      'Please do not create `.vue` and `.TSX` files with the same file name in the same hierarchical directory under the views folder. This will cause dynamic introduction failure'
    );
    return;
  }
}

// Turn background objects into routing objects
export function transformObjToRoute<T = AppRouteModule>(routeList: AppRouteModule[]): T[] {
  routeList.forEach((route) => {
    const component = route.component as string;
    if (component) {
      if (component.toUpperCase() === 'LAYOUT') {
        route.component = LayoutMap.get(component.toUpperCase());
      } else {
        route.children = [cloneDeep(route)];
        route.component = LAYOUT;
        route.name = `${route.name}Parent`;
        route.path = '';
        const meta = route.meta || {};
        meta.single = true;
        meta.affix = false;
        route.meta = meta;
      }
    } else {
      warn('请正确配置路由：' + route?.name + '的component属性');
    }
    route.children && asyncImportRoute(route.children);
  });
  return routeList as unknown as T[];
}

/**
 *  将多级路由转换为二级
 */
export function flatMultiLevelRoutes(routeModules: AppRouteModule[]) {
  const modules: AppRouteModule[] = cloneDeep(routeModules);
  for (let index = 0; index < modules.length; index++) {
    const routeModule = modules[index];
    if (!isMultipleRoute(routeModule)) {
      continue;
    }
    promoteRouteLevel(routeModule);
  }
  return modules;
}

//提升路由级别
function promoteRouteLevel(routeModule: AppRouteModule) {
  // Use vue-router to splice menus
  let router: Router | null = createRouter({
    routes: [routeModule as unknown as RouteRecordNormalized],
    history: createWebHashHistory(),
  });

  const routes = router.getRoutes();
  addToChildren(routes, routeModule.children || [], routeModule);
  router = null;

  routeModule.children = routeModule.children?.map((item) => omit(item, 'children'));
}

// Add all sub-routes to the secondary route
function addToChildren(routes: RouteRecordNormalized[], children: AppRouteRecordRaw[], routeModule: AppRouteModule) {
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    const route = routes.find((item) => item.name === child.name);
    if (!route) {
      continue;
    }
    routeModule.children = routeModule.children || [];
    if (!routeModule.children.find((item) => item.name === route.name)) {
      routeModule.children?.push(route as unknown as AppRouteModule);
    }
    if (child.children?.length) {
      addToChildren(routes, child.children, routeModule);
    }
  }
}

// Determine whether the level exceeds 2 levels
function isMultipleRoute(routeModule: AppRouteModule) {
  if (!routeModule || !Reflect.has(routeModule, 'children') || !routeModule.children?.length) {
    return false;
  }

  const children = routeModule.children;

  let flag = false;
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (child.children?.length) {
      flag = true;
      break;
    }
  }
  return flag;
}
/**
 * 组件地址前加斜杠处理
 * @updateBy:lsq
 * @updateDate:2021-09-08
 */
export function addSlashToRouteComponent(routeList: AppRouteRecordRaw[]) {
  routeList.forEach((route) => {
    let component = route.component as string;
    if (component) {
      const layoutFound = LayoutMap.get(component);
      if (!layoutFound) {
        route.component = component.startsWith('/') ? component : `/${component}`;
      }
    }
    route.children && addSlashToRouteComponent(route.children);
  });
  return routeList as unknown as T[];
}
