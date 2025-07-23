import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import type { ConfigEnv, UserConfig } from 'vite'
import { createVitePlugins } from './buildConf/vite'
import { exclude, include } from './buildConf/vite/optimize'
import { fileURLToPath, URL } from 'node:url'

const root = process.cwd()
function pathResolve(dir: string) {
  return resolve(root, '.', dir)
}

export default defineConfig(({ command, mode }: ConfigEnv): UserConfig => {
  let env = {} as any
  const isBuild = command === 'build'
  if (!isBuild) {
    env = loadEnv((process.argv[3] === '--mode' ? process.argv[4] : process.argv[3]), root)
  } else {
    env = loadEnv(mode, root)
  }
  return {
    base: env.VITE_BASE_PATH,
    root: root,
    server: {
      port: env.VITE_PORT,
      host: '0.0.0.0',
      open: env.VITE_OPEN === 'true',
      // proxy: { ... } // 如需代理可解开
    },
    plugins: [ ...createVitePlugins()],
    // plugins: [vue(), ...createVitePlugins()],
    css: {
      preprocessorOptions: {
        scss: {
          // additionalData: '@use "@/styles/variables.scss" as *;',
          javascriptEnabled: true,
          silenceDeprecations: ["legacy-js-api"],
        }
      }
    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss', '.css'],
      alias: [
        {
          find: 'vue-i18n',
          replacement: 'vue-i18n/dist/vue-i18n.cjs.js'
        },
        {
          find: /\@\//,
          replacement: `${pathResolve('src')}/`
        },
        {
          find: '@',
          replacement: resolve(__dirname, 'src')
        }
      ]
    },
    build: {
      minify: 'terser',
      outDir: env.VITE_OUT_DIR || 'dist',
      sourcemap: env.VITE_SOURCEMAP === 'true' ? 'inline' : false,
      emptyOutDir: true,
      terserOptions: {
        compress: {
          drop_debugger: env.VITE_DROP_DEBUGGER === 'true',
          drop_console: env.VITE_DROP_CONSOLE === 'true'
        },
        mangle: false
      },
      lib: {
        entry: resolve(__dirname, 'src/package/index.ts'),
        name: 'BpmnProcessDesigner',
        fileName: (format) => `index.${format}.js`,
        formats: ['es', 'umd']
      },
      rollupOptions: {
        input: resolve(__dirname, 'src/package/index.ts'),
        external: (id) => {
          if (id === 'vue' || id === 'element-plus') return true;
          if (/App\.vue$/.test(id) || /main\.ts$/.test(id)) return true;
          return false;
        },
        output: {
          globals: {
            vue: 'Vue',
            'element-plus': 'ElementPlus',
          },
        },
      },
    },
    optimizeDeps: { include, exclude }
  }
})
