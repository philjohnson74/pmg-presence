import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PMG Presence — Staff',
        short_name: 'PMG Staff',
        description: 'Peacocks Medical Group employee check-in and fire marshal roll-call',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0b2551',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/localhost:4000\/api\/onsite/,
            handler: 'NetworkFirst',
            options: { cacheName: 'onsite-cache' },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5175,
    proxy: {
      '/api': 'http://localhost:4000',
      '/stream': 'http://localhost:4000',
    },
  },
});
