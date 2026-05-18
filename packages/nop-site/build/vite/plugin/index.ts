import { PluginOption } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

import purgeIcons from 'vite-plugin-purge-icons';
import UnoCSS from 'unocss/vite';
import { presetTypography, presetUno } from 'unocss';
import VitePluginCertificate from 'vite-plugin-mkcert';
import { configHtmlPlugin } from './html';

//import { configMockPlugin } from './mock';
import { configCompressPlugin } from './compress';
import { configStyleImportPlugin } from './styleImport';
import { configVisualizerConfig } from './visualizer';
import { configThemePlugin } from './theme';
import { configSvgIconsPlugin } from './svgSprite';
import { configPwaPlugin } from './pwa';

import veauryVitePlugins from 'veaury/vite'

export function createVitePlugins(viteEnv: ViteEnv, isBuild: boolean, extraPrePlugins?: PluginOption[]) {
  const { VITE_USE_IMAGEMIN, VITE_USE_MOCK, VITE_LEGACY, VITE_BUILD_COMPRESS, VITE_BUILD_COMPRESS_DELETE_ORIGIN_FILE } = viteEnv;

  const vitePlugins: (PluginOption | PluginOption[])[] = [
    // have to
    //vue(),
    // have to
    //vueJsx(),
    UnoCSS({
      presets: [presetUno(), presetTypography()] ,
      theme: {
        // ...
        breakpoints: {
          sm: '576px',
          md: '768px',
          lg: '992px',
          xl: '1200px',
          '2xl': '1600px',
        },
      }
    }),
    // bpmn-designer aliases must come BEFORE veaury (@vitejs/plugin-vue uses enforce: 'pre')
    ...(extraPrePlugins || []),
    veauryVitePlugins({
      type: 'vue',
      // Configuration of @vitejs/plugin-vue
      // vueOptions: {...},
      // Configuration of @vitejs/plugin-react
      // reactOptions: {...},
      // Configuration of @vitejs/plugin-vue-jsx
      vueJsxOptions: {}
    }),
  ];

  // vite-plugin-html
  vitePlugins.push(configHtmlPlugin(viteEnv, isBuild));

  // vite-plugin-svg-icons
  vitePlugins.push(configSvgIconsPlugin(isBuild));

  // vite-plugin-mock
 // VITE_USE_MOCK && vitePlugins.push(configMockPlugin(isBuild));

  // vite-plugin-purge-icons
  vitePlugins.push(purgeIcons());

  // vite-plugin-style-import
  vitePlugins.push(configStyleImportPlugin(isBuild));

  // rollup-plugin-visualizer
  vitePlugins.push(configVisualizerConfig());

  // vite-plugin-theme
  vitePlugins.push(configThemePlugin(isBuild));

  // The following plugins only work in the production environment
  if (isBuild) {

    // rollup-plugin-gzip
    vitePlugins.push(configCompressPlugin(VITE_BUILD_COMPRESS, VITE_BUILD_COMPRESS_DELETE_ORIGIN_FILE));

    // vite-plugin-pwa (Service Worker缓存)
    vitePlugins.push(configPwaPlugin(viteEnv, isBuild));

  }

  return vitePlugins;
}
