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
      // 使用amis的toast
      console.log('[SimpleAmisRender] notify调用:', { type, msg, conf });

      // 暂时使用alert来验证功能
      window.alert(`${type.toUpperCase()}: ${msg}`);
      console.log('[SimpleAmisRender] 使用alert显示消息');

      // amis的toast API: toast[level](content, title, options)
      // level可以是: info, success, error, warning
      try {
        if (amisToast && amisToast[type]) {
          const result = amisToast[type](msg, conf?.title || '提示', {
            position: conf?.position || 'top-right',
            timeout: conf?.timeout || 5000,
            closeButton: conf?.closeButton !== false,
            showIcon: conf?.showIcon !== false,
            ...conf
          });
          console.log('[SimpleAmisRender] amis toast调用成功:', result);
        } else {
          console.warn('[SimpleAmisRender] amis toast不可用');
        }
      } catch (error) {
        console.error('[SimpleAmisRender] toast调用失败:', error);
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
