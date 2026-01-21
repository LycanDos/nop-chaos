import type { AppRouteRecordRaw } from '/@/router/types'

const hoppscotch: AppRouteRecordRaw = {
  path: '/sys/hoppscotch',
  name: 'Hoppscotch',
  component: 'LAYOUT',
  redirect: '/sys/hoppscotch/index',
  meta: {
    title: 'API测试工具',
    icon: 'ant-design:api-outlined',
    orderNo: 10,
  },
  children: [
    {
      path: 'index',
      name: 'HoppscotchIndex',
      component: '/@/views/sys/hoppscotch/index.vue',
      meta: {
        title: 'Hoppscotch',
        icon: 'ant-design:api-outlined',
        hideMenu: false,
      },
    },
  ],
}

export default hoppscotch 