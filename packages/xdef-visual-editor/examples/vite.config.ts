import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  root: resolve(__dirname),
  publicDir: 'public',
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@components': resolve(__dirname, '../src/components'),
      '@engines': resolve(__dirname, '../src/engines'),
      '@parsers': resolve(__dirname, '../src/parsers'),
      '@loaders': resolve(__dirname, '../src/loaders'),
      '@generators': resolve(__dirname, '../src/generators'),
      '@types': resolve(__dirname, '../src/types')
    }
  }
})