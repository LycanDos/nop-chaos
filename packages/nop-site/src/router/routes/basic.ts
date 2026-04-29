import type { AppRouteRecordRaw } from '/@/router/types';
import { t } from '/@/hooks/web/useI18n';
import { REDIRECT_NAME, LAYOUT, EXCEPTION_COMPONENT, PAGE_NOT_FOUND_NAME } from '/@/router/constant';

// 404 on a page
export const PAGE_NOT_FOUND_ROUTE: AppRouteRecordRaw = {
  path: '/:path(.*)*',
  name: PAGE_NOT_FOUND_NAME,
  component: LAYOUT,
  meta: {
    title: 'ErrorPage',
    hideBreadcrumb: true,
    hideMenu: true,
  },
  children: [
    {
      path: '/:path(.*)*',
      name: PAGE_NOT_FOUND_NAME + '_CHILD', // 避免和父级同名
      component: EXCEPTION_COMPONENT,
      meta: {
        title: 'ErrorPage',
        hideBreadcrumb: true,
        hideMenu: true,
      },
    },
  ],
};

export const REDIRECT_ROUTE: AppRouteRecordRaw = {
  path: '/redirect',
  component: LAYOUT,
  name: 'RedirectTo',
  meta: {
    title: REDIRECT_NAME,
    hideBreadcrumb: true,
    hideMenu: true,
  },
  children: [
    {
      path: '/redirect/:path(.*)',
      name: REDIRECT_NAME,
      component: () => import('/@/views/sys/redirect/index.vue'),
      meta: {
        title: REDIRECT_NAME,
        hideBreadcrumb: true,
      },
    },
  ],
};

export const ERROR_LOG_ROUTE: AppRouteRecordRaw = {
  path: '/error-log',
  name: 'ErrorLog',
  component: LAYOUT,
  redirect: '/error-log/list',
  meta: {
    title: 'ErrorLog',
    hideBreadcrumb: true,
    hideChildrenInMenu: true,
  },
  children: [
    {
      path: 'list',
      name: 'ErrorLogList',
      component: () => import('/@/views/sys/error-log/index.vue'),
      meta: {
        title: t('routes.basic.errorLogList'),
        hideBreadcrumb: true,
        currentActiveMenu: '/error-log',
      },
    },
  ],
};

export const DELTA_THREE_PANE_EDITOR_ROUTE: AppRouteRecordRaw = {
  path: '/delta-three-pane-editor',
  name: 'DeltaThreePaneEditorRoot',
  component: LAYOUT,
  meta: {
    title: 'Delta Lab',
    hideMenu: true,
  },
  children: [
    {
      path: '',
      name: 'DeltaThreePaneEditor',
      component: () => import('/@/views/delta-lab/DeltaThreePaneEditor.vue'),
      meta: {
        title: 'Delta Lab',
        hideMenu: true,
      },
    },
  ],
};

export const METHOD_BINDING_DESIGNER_ROUTE: AppRouteRecordRaw = {
  path: '/method-binding-designer',
  name: 'MethodBindingDesignerRoot',
  component: LAYOUT,
  meta: {
    title: '方法绑定设计器',
    hideMenu: true,
  },
  children: [
    {
      path: '',
      name: 'MethodBindingDesigner',
      component: () => import('/@/views/BpmnDesigner.vue'),
      meta: {
        title: '方法绑定设计器',
        hideMenu: true,
        ignoreKeepAlive: true,
      },
    },
  ],
};

export const FLOW_RUNTIME_VIEWER_ROUTE: AppRouteRecordRaw = {
  path: '/flow-runtime-viewer',
  name: 'FlowRuntimeViewerRoot',
  component: LAYOUT,
  meta: {
    title: '流程运行展示器',
    hideMenu: true,
  },
  children: [
    {
      path: '',
      name: 'FlowRuntimeViewer',
      component: () => import('/@/views/FlowRuntimeViewer.vue'),
      meta: {
        title: '流程运行展示器',
        hideMenu: true,
      },
    },
  ],
};
