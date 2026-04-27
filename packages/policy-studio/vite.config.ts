import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ command }) => {
  const isServe = command === 'serve'
  const stableLodashEs = resolve(
    __dirname,
    '../../node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es'
  )

  return {
    root: isServe ? resolve(__dirname, 'examples') : __dirname,
    plugins: [
      vue(),
      dts({
        insertTypesEntry: true
      })
    ],
    resolve: {
      alias: [
        { find: '@', replacement: resolve(__dirname, 'src') },
        { find: /^lodash-es$/, replacement: stableLodashEs },
        { find: /^lodash-es\/(.+)$/, replacement: `${stableLodashEs}/$1` }
      ]
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'PolicyStudio',
        fileName: (format) => `index.${format === 'es' ? 'esm' : 'umd'}.js`
      },
      rollupOptions: {
        external: ['vue', 'element-plus', '@nop-chaos/nop-amis-vue'],
        output: {
          globals: {
            vue: 'Vue',
            'element-plus': 'ElementPlus'
          }
        }
      }
    },
    test: {
      root: resolve(__dirname),
      include: ['src/**/*.{test,spec}.{ts,tsx}']
    }
  }
})
