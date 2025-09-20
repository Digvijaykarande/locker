import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Secure Locker',
        short_name: 'Locker',
        description: 'Protect your files with offline PIN lock',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0d6efd',
        icons: [
          {
            src: '/locker/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/locker/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  base: '/locker/', // Ensure this matches your GitHub repository name
})
