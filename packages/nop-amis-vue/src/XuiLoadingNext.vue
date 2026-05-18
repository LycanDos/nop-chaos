<template>
    <div class="app-loading-next">
        <!-- 背景浮动光晕 -->
        <div class="loading-ambient">
            <div class="ambient-orb ambient-orb-1"></div>
            <div class="ambient-orb ambient-orb-2"></div>
            <div class="ambient-orb ambient-orb-3"></div>
            <div class="ambient-orb ambient-orb-4"></div>
        </div>

        <!-- 网格纹理叠加 -->
        <div class="loading-grid"></div>

        <!-- 中心内容 -->
        <div class="loading-center">
            <!-- Logo 区域 -->
            <div class="loading-brand">
                <div class="loading-logo-ring">
                    <img src="/resource/img/logo.png" class="loading-logo" alt="Logo" />
                </div>
                <div class="loading-brand-name">Nop Platform</div>
            </div>

            <!-- 文字轮播 -->
            <div class="loading-carousel">
                <div class="carousel-viewport">
                    <div class="carousel-track" :style="{ transform: `translateY(-${carouselIndex * 20}%)` }">
                        <div v-for="(item, idx) in taglines" :key="idx" class="carousel-item">
                            <span class="carousel-icon">{{ item.icon }}</span>
                            <span class="carousel-text">{{ item.text }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 加载进度条 -->
            <div class="loading-progress">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-label">Initializing</div>
            </div>
        </div>

        <!-- 底部版本信息 -->
        <div class="loading-footer">
            <span>© 2026 Nop Platform</span>
            <span class="footer-dot">·</span>
            <span>v2.0</span>
        </div>
    </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const taglines = [
    { icon: '✦', text: 'Nop is not Programming' },
    { icon: '◆', text: '重构软件生产力' },
    { icon: '◈', text: '声明式 · 差量式 · 可逆式' },
    { icon: '◇', text: 'Reimagining Productivity' },
    { icon: '▣', text: '面向模型 · 面向复用' },
]

export default {
    name: 'XuiLoadingNext',
    setup() {
        const carouselIndex = ref(0)
        let timer: ReturnType<typeof setInterval> | null = null

        onMounted(() => {
            timer = setInterval(() => {
                carouselIndex.value = (carouselIndex.value + 1) % taglines.length
            }, 3500)
        })

        onUnmounted(() => {
            if (timer) clearInterval(timer)
        })

        return { taglines, carouselIndex }
    }
}
</script>

<style scoped>
/* =========================================
   基础容器
   ========================================= */
.app-loading-next {
    width: 100%;
    height: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif;
    background: var(--loading-bg);
    user-select: none;
}

/* =========================================
   明暗主题变量
   ========================================= */
html:not([data-theme='dark']) .app-loading-next {
    --loading-bg: #f4f7fa;
    --loading-orb-1: rgba(24, 144, 255, 0.12);
    --loading-orb-2: rgba(0, 150, 136, 0.08);
    --loading-orb-3: rgba(114, 46, 209, 0.06);
    --loading-orb-4: rgba(255, 184, 0, 0.06);
    --loading-grid-color: rgba(0, 0, 0, 0.03);
    --loading-brand-name: #1a1a2e;
    --loading-text-color: #2c3e50;
    --loading-text-dim: #94a3b8;
    --loading-progress-bg: rgba(0, 0, 0, 0.06);
    --loading-progress-fill: #1890ff;
    --loading-footer-color: #94a3b8;
}

html[data-theme='dark'] .app-loading-next {
    --loading-bg: #141824;
    --loading-orb-1: rgba(24, 144, 255, 0.15);
    --loading-orb-2: rgba(0, 150, 136, 0.10);
    --loading-orb-3: rgba(114, 46, 209, 0.08);
    --loading-orb-4: rgba(255, 184, 0, 0.06);
    --loading-grid-color: rgba(255, 255, 255, 0.02);
    --loading-brand-name: rgba(255, 255, 255, 0.90);
    --loading-text-color: rgba(255, 255, 255, 0.85);
    --loading-text-dim: rgba(255, 255, 255, 0.35);
    --loading-progress-bg: rgba(255, 255, 255, 0.08);
    --loading-progress-fill: #1890ff;
    --loading-footer-color: rgba(255, 255, 255, 0.30);
}

/* =========================================
   背景浮动光晕
   ========================================= */
.loading-ambient {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
}

.ambient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    will-change: transform;
}

.ambient-orb-1 {
    width: 600px;
    height: 600px;
    top: -15%;
    left: -10%;
    background: var(--loading-orb-1);
    animation: orb-drift-1 25s ease-in-out infinite;
}

.ambient-orb-2 {
    width: 500px;
    height: 500px;
    bottom: -10%;
    right: -5%;
    background: var(--loading-orb-2);
    animation: orb-drift-2 20s ease-in-out infinite;
}

.ambient-orb-3 {
    width: 400px;
    height: 400px;
    top: 40%;
    right: 15%;
    background: var(--loading-orb-3);
    animation: orb-drift-3 30s ease-in-out infinite;
}

.ambient-orb-4 {
    width: 300px;
    height: 300px;
    bottom: 25%;
    left: 10%;
    background: var(--loading-orb-4);
    animation: orb-drift-4 22s ease-in-out infinite;
}

@keyframes orb-drift-1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(120px, 80px) scale(1.1); }
    66% { transform: translate(-60px, 160px) scale(0.95); }
}

@keyframes orb-drift-2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(-100px, -60px) scale(1.15); }
    66% { transform: translate(60px, -120px) scale(0.9); }
}

@keyframes orb-drift-3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(80px, -100px) scale(1.2); }
}

@keyframes orb-drift-4 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-80px, 60px) scale(1.1); }
}

/* =========================================
   网格纹理
   ========================================= */
.loading-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: linear-gradient(var(--loading-grid-color) 1px, transparent 1px),
        linear-gradient(90deg, var(--loading-grid-color) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: radial-gradient(ellipse 60% 50% at center, black 20%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse 60% 50% at center, black 20%, transparent 70%);
}

/* =========================================
   中心内容
   ========================================= */
.loading-center {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    z-index: 1;
}

/* =========================================
   Logo 区域
   ========================================= */
.loading-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.loading-logo-ring {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: logo-float 3s ease-in-out infinite;
    position: relative;
}

.loading-logo-ring::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1.5px solid var(--loading-progress-fill);
    opacity: 0.25;
    animation: ring-pulse 2.5s ease-in-out infinite;
}

.loading-logo {
    width: 52px;
    height: 52px;
    object-fit: contain;
    border-radius: 12px;
}

.loading-brand-name {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 2px;
    color: var(--loading-brand-name);
    opacity: 0;
    animation: fade-up 0.6s 0.2s ease forwards;
}

@keyframes logo-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}

@keyframes ring-pulse {
    0%, 100% { transform: scale(1); opacity: 0.25; }
    50% { transform: scale(1.12); opacity: 0.08; }
}

@keyframes fade-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* =========================================
   文字轮播
   ========================================= */
.loading-carousel {
    opacity: 0;
    animation: fade-up 0.6s 0.4s ease forwards;
}

.carousel-viewport {
    height: 48px;
    overflow: hidden;
    position: relative;
}

.carousel-track {
    display: flex;
    flex-direction: column;
    transition: transform 0.7s cubic-bezier(0.25, 0.1, 0.25, 1);
    will-change: transform;
}

.carousel-item {
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    white-space: nowrap;
}

.carousel-icon {
    font-size: 14px;
    color: var(--loading-progress-fill);
    opacity: 0.6;
}

.carousel-text {
    font-size: 28px;
    font-weight: 300;
    letter-spacing: 1px;
    color: var(--loading-text-color);
}

/* =========================================
   加载进度条
   ========================================= */
.loading-progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 200px;
    opacity: 0;
    animation: fade-up 0.6s 0.6s ease forwards;
}

.progress-bar {
    width: 100%;
    height: 2px;
    border-radius: 2px;
    background: var(--loading-progress-bg);
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    width: 30%;
    border-radius: 2px;
    background: linear-gradient(
        90deg,
        var(--loading-progress-fill),
        #53d187,
        var(--loading-progress-fill)
    );
    background-size: 200% 100%;
    animation: progress-sweep 1.8s ease-in-out infinite;
}

@keyframes progress-sweep {
    0% { width: 20%; transform: translateX(-100%); }
    50% { width: 50%; }
    100% { width: 20%; transform: translateX(500%); }
}

.progress-label {
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--loading-text-dim);
    animation: text-pulse 2s ease-in-out infinite;
}

@keyframes text-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

/* =========================================
   底部版本信息
   ========================================= */
.loading-footer {
    position: absolute;
    bottom: 32px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--loading-footer-color);
    letter-spacing: 0.5px;
    opacity: 0;
    animation: fade-up 0.8s 0.8s ease forwards;
}

.footer-dot {
    opacity: 0.4;
}
</style>
