import { VitePWA } from 'vite-plugin-pwa';

export function configPwaPlugin(env: ViteEnv, isBuild: boolean) {
  if (!isBuild) return [];

  return VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['resource/**/*'],
    workbox: {
      globPatterns: ['**/*.{js,css,woff2,woff,ttf,svg,png,jpg,gif,ico}'],
      maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
      runtimeCaching: [
        {
          urlPattern: /^https?:\/\/.*\/api\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24,
            },
          },
        },
      ],
    },
    manifest: false,
  });
}
