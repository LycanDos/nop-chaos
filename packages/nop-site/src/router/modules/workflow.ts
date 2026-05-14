import type { AppRouteRecordRaw } from '/@/router/types'

const workflow: AppRouteRecordRaw = {
  path: '/wf',
  name: 'WorkflowRoot',
  component: 'LAYOUT',
  redirect: '/wf/runtime-viewer',
  meta: {
    title: '工作流',
    icon: 'icon-park-outline:workflow',
    orderNo: 8,
  },
  children: [
    {
      path: 'runtime-viewer',
      name: 'WfRuntimeViewer',
      component: '/@/views/wf/RuntimeViewerPage.vue',
      meta: {
        title: '工作流运行时View',
        icon: 'ant-design:eye-outlined',
        hideMenu: false,
      },
    },
  ],
}

export default workflow
