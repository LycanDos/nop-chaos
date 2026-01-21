import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'NopHoppscotch',
      fileName: (format) => `index.${format === 'es' ? 'es' : 'umd'}.js`,
    },
    rollupOptions: {
      external: ['vue', 'element-plus', '@element-plus/icons-vue'],
      output: {
        globals: {
          vue: 'Vue',
          'element-plus': 'ElementPlus',
          '@element-plus/icons-vue': 'ElementPlusIconsVue',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // 开发服务器配置
  server: {
    port: 3001,
    host: true,
    open: true
  },
  // 开发模式下的入口
  root: process.env.NODE_ENV === 'development' ? resolve(__dirname, 'demo') : undefined,
  publicDir: 'public'
}) 