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

export const BPMN_DESIGNER_EXAMPLE_ROUTE: AppRouteRecordRaw = {
  path: '/bpmn-designer',
  name: 'BpmnDesignerRoot',
  component: LAYOUT,
  meta: {
    title: 'BPMN设计器',
    icon: 'icon-park-outwork:workbench',
    orderNo: 9,
  },
  children: [
    {
      path: 'example',
      name: 'BpmnDesignerExample',
      component: () => import('/@/views/BpmnDesignerExample.vue'),
      meta: {
        title: '设计器示例',
        icon: 'ant-design:experiment-outlined',
        hideMenu: false,
      },
    },
  ],
};

export const SKIN_DESIGNER_ROUTE: AppRouteRecordRaw = {
  path: '/skin-designer',
  name: 'SkinDesignerRoot',
  component: LAYOUT,
  meta: {
    title: '皮肤设计器',
    hideMenu: true,
  },
  children: [
    {
      path: '',
      name: 'SkinDesigner',
      component: () => import('/@/views/skin/SkinDesigner.vue'),
      meta: {
        title: '皮肤设计器',
        hideMenu: true,
      },
    },
  ],
};

// 工作流运行时查看器 — 已整合到服务端菜单「流程中心 > 流程实例」中
// 路由保留供直接URL访问，不显示在侧边栏
export const WORKFLOW_RUNTIME_VIEWER_ROUTE: AppRouteRecordRaw = {
  path: '/wf',
  name: 'WorkflowRoot',
  component: LAYOUT,
  redirect: '/wf/runtime-viewer',
  meta: {
    title: '工作流',
    icon: 'icon-park-outline:workflow',
    orderNo: 8,
    hideMenu: true,
  },
  children: [
    {
      path: 'runtime-viewer',
      name: 'WfRuntimeViewer',
      component: () => import('/@/views/wf/RuntimeViewerPage.vue'),
      meta: {
        title: '工作流运行时View',
        icon: 'ant-design:eye-outlined',
        hideMenu: true,
      },
    },
    {
      path: 'runtime-viewer-example',
      name: 'WfRuntimeViewerExample',
      component: () => import('/@/views/wf/RuntimeViewerExample.vue'),
      meta: {
        title: '工作流运行时示例',
        icon: 'ant-design:experiment-outlined',
        hideMenu: true,
      },
    },
    {
      path: 'definition-designer',
      name: 'WfDefinitionDesigner',
      component: () => import('/@/views/wf/WfDefinitionDesigner.vue'),
      meta: {
        title: '流程定义设计器',
        icon: 'ant-design:edit-outlined',
        hideMenu: true,
        ignoreKeepAlive: true,
      },
    },
  ],
};

