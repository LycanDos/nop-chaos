import path from 'path';

export default defineConfig({
  server: {
    fs: {
      allow: [
        path.resolve(__dirname, './'),
        path.resolve(__dirname, 'packages'),
        path.resolve(__dirname, '../'), // monorepo 根目录
      ],
    },
  },
}); 