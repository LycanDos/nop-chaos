import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import path from 'path'
// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    vue(),

    AutoImport({
      imports: ['vue'],
      dts: 'src/types/auto-imports.d.ts',
    }),
    dts({ rollupTypes: true, outDir: "lib" })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `$elNamespace: 'el' !default;
        @use "element-plus/theme-chalk/src/mixins/config.scss" as *;
        @use "element-plus/theme-chalk/src/common/var.scss" as *;`
      }
    }
  },
  build: {
    lib: {
      name: '@nop-chaos/nop-amis-ext',
      formats: ['es'],
      entry: 'src/index.ts',
    },

    minify: false,

    rollupOptions: {
      output: {
         minifyInternalExports: false,
         dir: "lib"
      },
      // Do not bundle third-party dependencies,
      // since server packages can get them via npm install
      external: ['react', 'amis', 'amis-ui', 'amis-core','@nop-chaos/nop-core',
      '@nop-chaos/nop-react-core','@nop-chaos/nop-flow-builder','@nop-chaos/nop-graph-designer'],
    },
  },
})
