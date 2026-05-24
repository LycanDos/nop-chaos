<template>
  <div :class="prefixCls" class="login-page h-screen">
    <!-- 浮动光晕背景 -->
    <div class="login-ambient" ref="ambientRef">
      <div class="login-orb-wrap" data-parallax="1">
        <div class="login-orb login-orb-1"></div>
      </div>
      <div class="login-orb-wrap" data-parallax="1.5">
        <div class="login-orb login-orb-2"></div>
      </div>
      <div class="login-orb-wrap" data-parallax="2">
        <div class="login-orb login-orb-3"></div>
      </div>
      <div class="login-orb-wrap" data-parallax="2.5">
        <div class="login-orb login-orb-4"></div>
      </div>
    </div>
    <!-- 网格纹理 -->
    <div class="login-grid"></div>

    <AppLocalePicker
      class="absolute text-white top-4 right-4 enter-x xl:text-gray-600"
      :showText="false"
      v-if="!sessionTimeout && showLocale"
    />
    <AppDarkModeToggle class="absolute top-3 right-16 enter-x" v-if="!sessionTimeout" />

    <div class="container relative h-full py-2 mx-auto sm:px-10">
      <div class="flex flex-col xl:flex-row items-center justify-center h-full">
        <!-- 左侧面板：品牌标识 + 轮播文字 -->
        <div class="flex flex-col items-center justify-center w-full xl:w-6/12 login-left">
          <div class="login-brand -enter-x">
            <!-- 和加载页一致的 SVG Logo -->
            <svg class="login-svg-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="login-sparkle-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <circle cx="75" cy="28" r="8" stroke="#1890ff" stroke-width="1.5" fill="none" opacity="0.3"/>
              <circle cx="75" cy="28" r="16" stroke="#1890ff" stroke-width="1" fill="none" opacity="0.15"/>
              <circle cx="75" cy="28" r="26" stroke="#1890ff" stroke-width="0.8" fill="none" opacity="0.08"/>
              <path d="M 6 97.5 C 6 40, 94 40, 94 97.5" stroke="#1890ff" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.25"/>
              <path class="login-star" d="M 21 61 C 21 63, 24 64.5, 28 62 C 24 63.5, 21 65, 21 67 C 21 65, 18 63.5, 14 62 C 18 64.5, 21 63, 21 61 Z" fill="#fbbf24" filter="url(#login-sparkle-glow)" style="--sd:0s"/>
              <path class="login-star" d="M 36 48 C 36 49.5, 38 51, 41 49 C 38 50, 36 51.5, 36 53 C 36 51.5, 34 50, 31 49 C 34 51, 36 49.5, 36 48 Z" fill="#f472b6" filter="url(#login-sparkle-glow)" style="--sd:0.7s"/>
              <path class="login-star" d="M 54 45 C 54 47, 56.5 48.5, 59 46 C 56.5 47.5, 54 49, 54 51 C 54 49, 51.5 47.5, 49 46 C 51.5 48.5, 54 47, 54 45 Z" fill="#34d399" filter="url(#login-sparkle-glow)" style="--sd:1.4s"/>
              <path class="login-star" d="M 72 49 C 72 50.5, 74 52, 77 50 C 74 51, 72 52.5, 72 54 C 72 52.5, 70 51, 67 50 C 70 52, 72 50.5, 72 49 Z" fill="#c084fc" filter="url(#login-sparkle-glow)" style="--sd:0.3s"/>
              <path class="login-star" d="M 83 61 C 83 63, 85.5 64.5, 89 62 C 85.5 63.5, 83 65, 83 67 C 83 65, 80.5 63.5, 77 62 C 80.5 64.5, 83 63, 83 61 Z" fill="#60a5fa" filter="url(#login-sparkle-glow)" style="--sd:1.1s"/>
              <line x1="26" y1="72" x2="75" y2="28" stroke="#1890ff" stroke-width="6" stroke-linecap="round"/>
              <circle cx="75" cy="28" r="5" fill="#fbbf24" class="login-tip"/>
            </svg>
            <div class="login-brand-name">趋山海-乐趋</div>
          </div>
          <div class="login-carousel">
            <Transition name="carousel-cross" mode="out-in">
              <div class="carousel-item" :key="currentCarouselIdx">
                <span class="carousel-icon">{{ currentCarousel.icon }}</span>
                <span class="carousel-text" v-html="currentCarousel.text"></span>
              </div>
            </Transition>
            <div class="carousel-dots" v-if="carouselItems.length > 1">
              <span
                v-for="(_item, idx) in carouselItems"
                :key="idx"
                class="carousel-dot"
                :class="{ active: idx === currentCarouselIdx }"
                @click="switchCarousel(idx)"
              ></span>
            </div>
          </div>
        </div>

        <!-- 右侧面板：登录表单 -->
        <div class="flex w-full h-full py-5 xl:flex-col xl:justify-center xl:h-full xl:py-0 xl:w-6/12">
          <div
            :class="`${prefixCls}-form`"
            class="relative w-full px-5 py-8 mx-auto my-auto rounded-md shadow-md xl:ml-16 xl:bg-transparent sm:px-8 xl:p-4 xl:shadow-none sm:w-3/4 lg:w-2/4 xl:w-auto enter-x"
          >
            <LoginForm />
            <ForgetPasswordForm />
            <RegisterForm />
            <MobileForm />
            <QrCodeForm />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
  import { ref, onMounted, onUnmounted } from 'vue';
  import { AppLocalePicker, AppDarkModeToggle } from '/@/components/Application';
  import LoginForm from './LoginForm.vue';
  import ForgetPasswordForm from './ForgetPasswordForm.vue';
  import RegisterForm from './RegisterForm.vue';
  import MobileForm from './MobileForm.vue';
  import QrCodeForm from './QrCodeForm.vue';
  import { useDesign } from '/@/hooks/web/useDesign';
  import { useLocaleStore } from '/@/store/modules/locale';
  import { useLoginState, LoginStateEnum } from './useLogin';
  import { useLoginCarousel } from './useLoginCarousel';

  defineProps({
    sessionTimeout: {
      type: Boolean,
    },
  });

  const { prefixCls } = useDesign('login');
  const localeStore = useLocaleStore();
  const showLocale = localeStore.getShowPicker;

  const { handleBackLogin } = useLoginState();
  handleBackLogin();

  // 轮播文字
  const { items: carouselItems, currentIdx: currentCarouselIdx, currentItem: currentCarousel, switchTo: switchCarousel } = useLoginCarousel();

  // 鼠标视差效果
  const ambientRef = ref<HTMLElement | null>(null);
  let rafId = 0;
  let mx = 0, my = 0;
  let targetX = 0, targetY = 0;
  let glow = 0.7, targetGlow = 0.7;
  let idleTimer: ReturnType<typeof setTimeout>;

  function onMouseMove(e: MouseEvent) {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    targetGlow = 1.3;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      targetGlow = 0.7;
    }, 2000);
  }

  function animate() {
    mx += (targetX - mx) * 0.1;
    my += (targetY - my) * 0.1;
    glow += (targetGlow - glow) * 0.04;

    const wraps = document.querySelectorAll('.login-orb-wrap');
    wraps.forEach((wrap) => {
      const factor = parseFloat((wrap as HTMLElement).getAttribute('data-parallax') || '1');
      const range = 30 + factor * 25;
      (wrap as HTMLElement).style.transform = `translate(${mx * range}px, ${my * range}px)`;
      (wrap as HTMLElement).style.filter = `brightness(${glow})`;
    });

    rafId = requestAnimationFrame(animate);
  }

  onMounted(() => {
    document.addEventListener('mousemove', onMouseMove);
    setTimeout(() => { targetGlow = 0.7; }, 2000);
    rafId = requestAnimationFrame(animate);
  });

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove);
    if (rafId) cancelAnimationFrame(rafId);
    clearTimeout(idleTimer);
  });
</script>
<style lang="less">
  @prefix-cls: ~'@{namespace}-login';
  @logo-prefix-cls: ~'@{namespace}-app-logo';
  @countdown-prefix-cls: ~'@{namespace}-countdown-input';

  /* ============================================
     主题变量
     ============================================ */
  .@{prefix-cls} {
    --login-bg: #f4f7fa;
    --login-orb-1: rgba(24, 144, 255, 0.18);
    --login-orb-2: rgba(0, 150, 136, 0.14);
    --login-orb-3: rgba(114, 46, 209, 0.12);
    --login-orb-4: rgba(255, 184, 0, 0.12);
    --login-grid-color: rgba(0, 0, 0, 0.03);
    --login-brand-color: #1a1a2e;
    --login-text-color: #2c3e50;
    --login-text-dim: #94a3b8;
  }

  html[data-theme='dark'] .@{prefix-cls} {
    --login-bg: #141824;
    --login-orb-1: rgba(24, 144, 255, 0.22);
    --login-orb-2: rgba(0, 150, 136, 0.16);
    --login-orb-3: rgba(114, 46, 209, 0.14);
    --login-orb-4: rgba(255, 184, 0, 0.12);
    --login-grid-color: rgba(255, 255, 255, 0.02);
    --login-brand-color: rgba(255, 255, 255, 0.9);
    --login-text-color: rgba(255, 255, 255, 0.85);
    --login-text-dim: rgba(255, 255, 255, 0.35);
  }

  /* ============================================
     页面容器
     ============================================ */
  .@{prefix-cls} {
    min-height: 100%;
    overflow: hidden;
    background: var(--login-bg);
    position: relative;

    /* ---- 浮动光晕 ---- */
    .login-ambient {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .login-orb-wrap {
      position: absolute;
      inset: 0;
      will-change: transform;
    }
    .login-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      will-change: transform;
    }
    .login-orb-1 {
      width: 600px; height: 600px;
      top: -15%; left: -10%;
      background: var(--login-orb-1);
      animation: login-drift-1 25s ease-in-out infinite;
    }
    .login-orb-2 {
      width: 500px; height: 500px;
      bottom: -10%; right: -5%;
      background: var(--login-orb-2);
      animation: login-drift-2 20s ease-in-out infinite;
    }
    .login-orb-3 {
      width: 400px; height: 400px;
      top: 40%; right: 15%;
      background: var(--login-orb-3);
      animation: login-drift-3 30s ease-in-out infinite;
    }
    .login-orb-4 {
      width: 300px; height: 300px;
      bottom: 25%; left: 10%;
      background: var(--login-orb-4);
      animation: login-drift-4 22s ease-in-out infinite;
    }

    @keyframes login-drift-1 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(120px, 80px) scale(1.1); }
      66% { transform: translate(-60px, 160px) scale(0.95); }
    }
    @keyframes login-drift-2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(-100px, -60px) scale(1.15); }
      66% { transform: translate(60px, -120px) scale(0.9); }
    }
    @keyframes login-drift-3 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(80px, -100px) scale(1.2); }
    }
    @keyframes login-drift-4 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(-80px, 60px) scale(1.1); }
    }

    /* ---- 网格纹理 ---- */
    .login-grid {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      background-image:
        linear-gradient(var(--login-grid-color) 1px, transparent 1px),
        linear-gradient(90deg, var(--login-grid-color) 1px, transparent 1px);
      background-size: 64px 64px;
      mask-image: radial-gradient(ellipse 60% 50% at center, black 20%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse 60% 50% at center, black 20%, transparent 70%);
    }

    /* ---- 左侧品牌区 ---- */
    .login-left {
      position: relative;
      z-index: 1;
    }
    .login-brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      margin-bottom: 48px;
    }
    .login-svg-logo {
      width: 80px;
      height: 80px;
      animation: login-float 3s ease-in-out infinite;
    }
    .login-star {
      animation: login-twinkle 2s ease-in-out infinite;
      animation-delay: var(--sd, 0s);
      transform-origin: center;
    }
    .login-tip {
      animation: login-tip-color 4s ease-in-out infinite;
    }
    .login-brand-name {
      font-size: 24px;
      font-weight: 500;
      letter-spacing: 6px;
      background: linear-gradient(135deg, #1890ff 0%, #53d187 50%, #c084fc 100%);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 12px rgba(24, 144, 255, 0.2));
      animation: login-shimmer 4s ease-in-out infinite;
    }

    @keyframes login-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    @keyframes login-shimmer {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    @keyframes login-twinkle {
      0%, 100% { opacity: 0.3; transform: scale(0.7); }
      50% { opacity: 1; transform: scale(1.15); }
    }
    @keyframes login-tip-color {
      0% { fill: #fbbf24; }
      25% { fill: #34d399; }
      50% { fill: #60a5fa; }
      75% { fill: #c084fc; }
      100% { fill: #fbbf24; }
    }

    /* ---- 轮播文字 ---- */
    .login-carousel {
      text-align: center;
    }
    .carousel-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      min-height: 80px;
    }
    .carousel-icon {
      font-size: 16px;
      color: #1890ff;
      opacity: 0.6;
      flex-shrink: 0;
    }
    .carousel-text {
      font-size: 26px;
      font-weight: 300;
      letter-spacing: 2px;
      line-height: 1.6;
      color: var(--login-text-color);
    }

    /* 交叉淡入淡出 */
    .carousel-cross-enter-active,
    .carousel-cross-leave-active {
      transition: opacity 0.45s ease, transform 0.45s ease;
    }
    .carousel-cross-enter-from {
      opacity: 0;
      transform: translateY(12px);
    }
    .carousel-cross-leave-to {
      opacity: 0;
      transform: translateY(-12px);
    }

    /* 轮播指示点 */
    .carousel-dots {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-top: 24px;
    }
    .carousel-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--login-text-dim);
      opacity: 0.35;
      cursor: pointer;
      transition: all 0.3s ease;

      &.active {
        opacity: 1;
        background: #1890ff;
        box-shadow: 0 0 8px rgba(24, 144, 255, 0.4);
      }
      &:hover {
        opacity: 0.7;
      }
    }

    /* ============================================
       保留原有表单相关样式
       ============================================ */

    .container {
      .@{logo-prefix-cls} {
        display: flex;
        width: 60%;
        height: 80px;

        &__title {
          font-size: 24px;
          color: #fff;
        }

        img {
          width: 48px;
        }
      }
    }

    &-sign-in-way {
      .anticon {
        font-size: 22px;
        color: #888;
        cursor: pointer;

        &:hover {
          color: @primary-color;
        }
      }
    }

    input:not([type='checkbox']) {
      min-width: 360px;

      @media (max-width: @screen-xl) {
        min-width: 320px;
      }

      @media (max-width: @screen-lg) {
        min-width: 260px;
      }

      @media (max-width: @screen-md) {
        min-width: 240px;
      }

      @media (max-width: @screen-sm) {
        min-width: 160px;
      }
    }

    .@{countdown-prefix-cls} input {
      min-width: unset;
    }

    .ant-divider-inner-text {
      font-size: 12px;
      color: @text-color-secondary;
    }
  }

  /* ============================================
     暗色模式补充
     ============================================ */
  html[data-theme='dark'] {
    .@{prefix-cls} {
      .ant-input,
      .ant-input-password {
        background-color: #232a3b;
      }

      .ant-btn:not(.ant-btn-link):not(.ant-btn-primary) {
        border: 1px solid #4a5569;
      }

      &-form {
        background: transparent !important;
      }

      .app-iconify {
        color: #fff;
      }

      .carousel-icon {
        color: rgba(24, 144, 255, 0.8);
      }
    }

    input.fix-auto-fill,
    .fix-auto-fill input {
      -webkit-text-fill-color: #c9d1d9 !important;
      box-shadow: inherit !important;
    }
  }
</style>
