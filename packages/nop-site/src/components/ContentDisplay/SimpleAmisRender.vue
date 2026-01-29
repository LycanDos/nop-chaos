<template>
  <div ref="containerRef" class="simple-amis-render"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { render as renderAmis } from 'amis'
import { createRoot } from 'react-dom/client'
import { toast as amisToast } from 'amis'

const props = defineProps({
  schema: {
    type: Object,
    required: true
  }
})

const containerRef = ref(null)
let reactRoot = null

const renderSchema = () => {
  if (!containerRef.value || !props.schema) return

  const env = {
    session: 'global',
    fetcher: () => Promise.resolve({ data: {} }),
    isCancel: () => false,
    notify: (type, msg, conf) => {
      // 使用amis的弹窗或toast
      console.log('[SimpleAmisRender] notify调用:', { type, msg, conf });

      // 从conf或args中获取实际的配置参数
      const toastConf = conf?.args || conf;

      // 检查是否需要显示弹窗而不是toast
      if (conf?.showDialog || conf?.dialog || type === 'dialog' || (conf?.actionType && conf?.actionType === 'dialog')) {
        // 使用amis的dialog API来显示弹窗
        console.log('[SimpleAmisRender] 检测到dialog配置，尝试显示弹窗');

        // 尝试从window获取amis的dialog功能
        const dialog = window.amisRequire?.('amis/lib/components/Dialog') ||
                       window.amisRequire?.('amis/lib/components/Modal') ||
                       window.amis?.dialog;

        if (dialog) {
          // 使用amis dialog API
          const dialogConfig = conf?.dialog || conf;
          dialog.alert({
            title: dialogConfig?.title || conf?.title || '提示',
            body: dialogConfig?.body || msg,
            ...dialogConfig
          });
          console.log('[SimpleAmisRender] amis dialog调用成功');
        } else {
          // 如果amis dialog不可用，创建自定义弹窗
          console.warn('[SimpleAmisRender] amis dialog不可用，创建自定义弹窗');
          const dialogConfig = conf?.dialog || conf;
          createCustomDialog(dialogConfig?.body || msg, dialogConfig?.title || conf?.title || '提示', type);
        }
      } else {
        // 使用amis的toast - 原有逻辑
        console.log('[SimpleAmisRender] 使用toast显示消息');

        // 暂时使用alert来验证功能 - 我们需要移除这个，让toast正常工作
        // window.alert(`${type.toUpperCase()}: ${msg}`);
        console.log('[SimpleAmisRender] 尝试使用amis toast显示消息');

        // 创建自定义toast，确保它显示在正确的位置
        try {
          // 从window对象获取amis的toast功能
          const toast = window.amisRequire?.('amis/lib/components/ToastComponent') ||
                        window.amis?.toast ||
                        window.amisToast;

          if (toast && toast[type]) {
            // 使用amis的toast API，确保容器设置正确
            const toastResult = toast[type](msg, toastConf?.title || '提示', {
              position: toastConf?.position || 'top-right',
              timeout: toastConf?.timeout || 5000,
              closeButton: toastConf?.closeButton !== false,
              showIcon: toastConf?.showIcon !== false,
              container: () => document.body, // 使用函数返回body，确保动态查找
              ...toastConf
            });
            console.log('[SimpleAmisRender] amis toast调用成功:', toastResult);
          } else {
            // 如果amis toast不可用，使用自定义的toast显示
            console.warn('[SimpleAmisRender] amis toast不可用，尝试创建自定义toast:', toast);

            // 创建一个简单的自定义toast
            createCustomToast(type, msg, toastConf?.title || '提示');
          }
        } catch (error) {
          console.error('[SimpleAmisRender] amis toast调用失败:', error);

          // 如果amis toast失败，使用自定义的toast显示
          console.warn('[SimpleAmisRender] 使用自定义toast:', error);
          createCustomToast(type, msg, toastConf?.title || '提示');
        }
      }
    },
    alert: (msg) => {
      window.alert(msg)
    },
    confirm: (msg) => {
      return Promise.resolve(window.confirm(msg))
    },
    updateLocation: () => {},
    isCurrentUrl: () => false,
    jumpTo: (to, action) => {
      console.log('[SimpleAmisRender] jumpTo调用:', { to, action });

      // 检查是否是内部路由（以/开头但不是完整URL）
      if (to.startsWith('/') && !to.startsWith('//')) {
        console.log('[SimpleAmisRender] 检测到内部路由:', to);

        // 尝试从window获取router实例
        const router = window.__APP_ROUTER__;
        if (router) {
          // 解析URL和query参数
          const url = new URL(to, window.location.origin);
          const path = url.pathname;
          const query = {};
          url.searchParams.forEach((value, key) => {
            query[key] = value;
          });

          console.log('[SimpleAmisRender] 使用router跳转:', { path, query });

          // 使用router进行跳转
          router.push({ path, query }).catch(err => {
            console.error('[SimpleAmisRender] 路由跳转失败:', err);
            window.alert(`路由跳转失败: ${err.message}`);
          });
        } else {
          console.warn('[SimpleAmisRender] router未找到，使用location跳转');
          window.location.href = to;
        }
        return;
      }

      // 如果URL不是完整的，尝试补全
      let url = to;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // 如果看起来像域名，添加https://
        if (url.includes('.')) {
          url = 'https://' + url;
          console.log('[SimpleAmisRender] 补全URL:', url);
        } else {
          console.warn('[SimpleAmisRender] 无效的URL:', url);
          window.alert(`无效的URL: ${url}`);
          return;
        }
      }

      console.log('[SimpleAmisRender] 打开外部URL:', url);
      window.open(url, action?.actionType === 'url' ? '_blank' : '_self');
    },
    copy: (content) => {
      navigator.clipboard?.writeText(content)
    },
    theme: 'cxd',
    // 配置弹出层容器，让它渲染到body而不是foreignObject内
    getModalContainer: () => document.body,
    // 配置toast容器
    toastContainer: document.body
  }

  // 创建自定义toast函数
  function createCustomDialog(message, title = '提示', type = 'info') {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    // 创建弹窗容器
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 300px;
      max-width: 500px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;

    // 添加内容
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #fafafa;
    `;

    const titleElement = document.createElement('h3');
    titleElement.style.cssText = `
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    `;
    titleElement.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.textContent = '×';
    closeBtn.onclick = () => {
      document.body.removeChild(overlay);
    };

    header.appendChild(titleElement);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.style.cssText = `
      padding: 16px;
      flex: 1;
      overflow-y: auto;
    `;
    body.textContent = message;

    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 16px;
      border-top: 1px solid #f0f0f0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    `;

    const okBtn = document.createElement('button');
    okBtn.style.cssText = `
      padding: 6px 16px;
      background-color: #1890ff;
      color: white;
      border: 1px solid #1890ff;
      border-radius: 4px;
      cursor: pointer;
    `;
    okBtn.textContent = '确定';
    okBtn.onclick = () => {
      document.body.removeChild(overlay);
    };

    footer.appendChild(okBtn);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);

    document.body.appendChild(overlay);
  }

  function createCustomToast(type, message, title = '提示') {
    // 创建toast容器（如果不存在）
    let toastContainer = document.getElementById('amis-custom-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'amis-custom-toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        min-width: 250px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }

    // 创建toast元素
    const toastElement = document.createElement('div');
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    toastElement.id = toastId;

    // 根据类型设置样式
    const typeStyles = {
      info: { bg: '#91d5ff', border: '#1890ff', text: '#1890ff' },
      success: { bg: '#f6ffed', border: '#52c41a', text: '#52c41a' },
      error: { bg: '#fff2f0', border: '#ff4d4f', text: '#ff4d4f' },
      warning: { bg: '#fffbe6', border: '#faad14', text: '#faad14' },
      default: { bg: '#f0f0f0', border: '#ccc', text: '#666' }
    };

    const style = typeStyles[type] || typeStyles.default;

    toastElement.style.cssText = `
      background-color: ${style.bg};
      border: 1px solid ${style.border};
      color: ${style.text};
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 3px 6px -4px rgba(0,0,0,0.12), 0 6px 16px 0 rgba(0,0,0,0.08), 0 9px 28px 8px rgba(0,0,0,0.05);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 10px;
      pointer-events: auto;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      display: flex;
      align-items: flex-start;
    `;

    // 添加图标
    const iconElement = document.createElement('div');
    iconElement.style.cssText = `
      margin-right: 8px;
      font-weight: bold;
      font-size: 16px;
    `;

    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };

    iconElement.textContent = icons[type] || icons.default;

    // 添加内容
    const contentElement = document.createElement('div');
    contentElement.style.cssText = `
      flex: 1;
    `;

    const titleElement = document.createElement('div');
    titleElement.style.cssText = `
      font-weight: 600;
      margin-bottom: 4px;
    `;
    titleElement.textContent = title;

    const messageElement = document.createElement('div');
    messageElement.textContent = message;

    contentElement.appendChild(titleElement);
    contentElement.appendChild(messageElement);

    toastElement.appendChild(iconElement);
    toastElement.appendChild(contentElement);

    // 添加到容器
    toastContainer.appendChild(toastElement);

    // 触发显示动画
    setTimeout(() => {
      toastElement.style.opacity = '1';
      toastElement.style.transform = 'translateX(0)';
    }, 10);

    // 自动移除
    setTimeout(() => {
      toastElement.style.opacity = '0';
      toastElement.style.transform = 'translateX(100%)';
      toastElement.style.transition = 'all 0.3s ease';

      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 300);
    }, 5000); // 5秒后自动消失
  }

  const amisElement = renderAmis(props.schema, {}, env)

  if (!reactRoot) {
    reactRoot = createRoot(containerRef.value)
  }
  reactRoot.render(amisElement)
}

watch(() => props.schema, renderSchema, { deep: true })

onMounted(() => {
  renderSchema()
})

onBeforeUnmount(() => {
  if (reactRoot) {
    reactRoot.unmount()
    reactRoot = null
  }
})
</script>

<style scoped>
.simple-amis-render {
  width: 100%;
  height: 100%;
}
</style>
