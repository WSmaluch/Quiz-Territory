import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  publicDir: fileURLToPath(new URL('../../assets', import.meta.url)),
  resolve: {
    alias: {
      shared: fileURLToPath(new URL('../../packages/shared/src/browser.ts', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss()
  ],
})
