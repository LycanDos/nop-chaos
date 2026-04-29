import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'path'
import type { ConfigEnv, UserConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

const root = process.cwd()

export default defineConfig(({ command, mode }: ConfigEnv): UserConfig => {
  let env = {} as any
  const isBuild = command === 'build'
  if (!isBuild) {
    env = loadEnv(process.argv[3] === '--mode' ? process.argv[4] : process.argv[3], root)
  } else {
    env = loadEnv(mode, root)
  }

  return {
    base: env.VITE_BASE_PATH || '/',
    root: root,
    server: {
      port: Number(env.VITE_PORT) || 3200,
      host: '0.0.0.0',
      open: env.VITE_OPEN === 'true',
    },
    plugins: [
      vue(),
      vueJsx(),
      AutoImport({
        imports: ['vue', 'vue-router'],
        dts: false,
      }),
      createSvgIconsPlugin({
        iconDirs: [resolve(__dirname, 'src/package/assets/icons')],
        symbolId: 'icon-[name]',
      }),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          javascriptEnabled: true,
          silenceDeprecations: ['legacy-js-api'],
        },
      },
    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss', '.css'],
      alias: {
        '@': resolve(__dirname, 'src/package'),
      },
    },
    build: {
      minify: 'terser',
      outDir: 'dist',
      sourcemap: false,
      emptyOutDir: true,
      lib: {
        entry: resolve(__dirname, 'src/package/index.ts'),
        name: 'BpmnProcessDesigner',
        fileName: (format) => `index.${format}.js`,
        formats: ['es', 'umd'],
      },
      rollupOptions: {
        external: (id) => {
          if (id === 'vue' || id === 'element-plus' || id === 'pinia') return true
          if (/^@element-plus\/icons-vue/.test(id)) return true
          if (/App\.vue$/.test(id) || /main\.ts$/.test(id)) return true
          return false
        },
        output: {
          globals: {
            vue: 'Vue',
            'element-plus': 'ElementPlus',
            pinia: 'Pinia',
          },
        },
      },
    },
  }
})
