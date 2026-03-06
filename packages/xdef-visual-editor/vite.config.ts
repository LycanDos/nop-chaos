import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'XdefVisualEditor',
      fileName: (format) => `index.${format === 'es' ? 'esm' : 'umd'}.js`
    },
    rollupOptions: {
      external: ['vue', 'element-plus', 'cheerio', 'yaml'],
      output: {
        globals: {
          vue: 'Vue',
          'element-plus': 'ElementPlus',
          cheerio: 'cheerio',
          yaml: 'yaml'
        }
      }
    }
  }
})