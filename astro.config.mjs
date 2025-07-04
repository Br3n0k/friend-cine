// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 3000,
    host: true
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    }
  },
  integrations: [tailwind()]
});
