import '/@/design/index.less';

// 注册图标
import 'virtual:svg-icons-register';
import App from './App.vue';
import { createApp } from 'vue';
import { initAppConfigStore } from '/@/logics/initAppConfig';
import { setupErrorHandle } from '/@/logics/error-handle';
import { router, setupRouter } from '/@/router';
import { setupRouterGuard } from '/@/router/guard';
import { setupStore } from '/@/store';
import { setupGlobDirectives } from '/@/directives';
import { setupI18n } from '/@/locales/setupI18n';
import { registerGlobComp } from '/@/components/registerGlobComp';
import { registerThirdComp } from '/@/settings/registerThirdComp';
import { useSso } from '/@/hooks/web/useSso';
import { registerPackages } from '/@/utils/monorepo/registerPackages';
import ElementPlus from 'element-plus';


import {initNopApp} from './nop/initNopApp'

// 这个css必须放在amis引入的css后面，它的优先级才能覆盖amis的样式
import 'uno.css';
const style = document.createElement('style');
style.innerHTML = `
@font-face {
  font-family: 'bpmn';
  src: url('/bpmn-font/bpmn.woff2') format('woff2'),
       url('/bpmn-font/bpmn.woff') format('woff'),
       url('/bpmn-font/bpmn.ttf') format('truetype'),
       url('/bpmn-font/bpmn.svg#bpmn') format('svg');
  font-weight: normal;
  font-style: normal;
}
`;
document.head.appendChild(style);
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'

// 在本地开发中引入的,以提高浏览器响应速度
if (import.meta.env.DEV) {
  import('ant-design-vue/dist/antd.less');
}
async function bootstrap() {
  // 创建应用实例
  const app = createApp(App);

  // 多语言配置,异步情况:语言文件可以从服务器端获得
  await setupI18n(app);

  // 配置存储
  setupStore(app);

  // 初始化内部系统配置
  initAppConfigStore();

  // 注册外部模块路由
  registerPackages(app);

  // 注册全局组件
  registerGlobComp(app);

  //CAS单点登录
  await useSso().ssoLogin();

  // 配置路由
  setupRouter(app);

  // 路由保护
  setupRouterGuard(router);

  // 注册全局指令
  setupGlobDirectives(app);

  // 配置全局错误处理
  setupErrorHandle(app);

  await initNopApp(app)

  // 注册第三方组件
  await registerThirdComp(app);

  // 当路由准备好时再执行挂载( https://next.router.vuejs.org/api/#isready)
  await router.isReady();

  app.use(ElementPlus);
  // 挂载应用
  app.mount('#app', true);

  // 调试：打印所有注册的路由
  if (app.config.globalProperties?.$router) {
    const routes = app.config.globalProperties.$router.getRoutes();
    console.log('【调试】当前注册的路由:', routes.map(r => ({ path: r.path, name: r.name })));
    const bpmnRoute = routes.find(r => r.path === '/bpmn-designer');
    console.log('【调试】/bpmn-designer 路由详情:', bpmnRoute);
  } else if (router) {
    const routes = router.getRoutes();
    console.log('【调试】当前注册的路由:', routes.map(r => ({ path: r.path, name: r.name })));
    const bpmnRoute = routes.find(r => r.path === '/bpmn-designer');
    console.log('【调试】/bpmn-designer 路由详情:', bpmnRoute);
  }
}

bootstrap();
