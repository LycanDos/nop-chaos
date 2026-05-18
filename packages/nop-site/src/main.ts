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
// 在开发环境引入 ant-design-vue 的 less 文件
if (import.meta.env.DEV) {
  import('ant-design-vue/dist/antd.less');
}
function reportProgress(pct: number) {
  const fn = (window as any).__setLoadProgress__;
  if (fn) fn(pct);
}

async function bootstrap() {
  // 创建应用实例
  const app = createApp(App);
  reportProgress(5);

  // 同步配置（必须优先执行）
  setupStore(app);
  initAppConfigStore();
  registerPackages(app);
  registerGlobComp(app);
  setupRouter(app);
  setupRouterGuard(router);
  setupGlobDirectives(app);
  setupErrorHandle(app);
  reportProgress(20);

  // 并行执行独立异步操作: i18n加载、SSO登录、Nop平台初始化
  await Promise.all([
    setupI18n(app),
    useSso().ssoLogin(),
    initNopApp(app),
  ]);
  reportProgress(70);

  // 注册第三方组件
  await registerThirdComp(app);
  reportProgress(85);

  // 当路由准备好时再执行挂载( https://next.router.vuejs.org/api/#isready)
  await router.isReady();
  reportProgress(95);

  app.use(ElementPlus);

  // 过渡：loading 淡出 + Vue 淡入，消除割裂感
  reportProgress(100);
  const loadingEl = document.querySelector('.app-loading-next');
  if (loadingEl) {
    (loadingEl as HTMLElement).style.transition = 'opacity 0.25s ease';
    (loadingEl as HTMLElement).style.opacity = '0';
    // 短暂等待让淡出启动，不等完成就挂载，形成交叉过渡
    await new Promise(r => setTimeout(r, 80));
  }

  // 挂载应用
  app.mount('#app', true);

  // Vue 内容淡入
  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.style.setProperty('animation', 'app-fade-in 0.4s ease');
    // 确保关键帧存在
    if (!document.getElementById('app-fade-style')) {
      const style = document.createElement('style');
      style.id = 'app-fade-style';
      style.textContent = `@keyframes app-fade-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }`;
      document.head.appendChild(style);
    }
  }
}

bootstrap();
