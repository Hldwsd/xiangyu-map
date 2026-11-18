import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // 首屏 JS 预算：gzip 后 ≤300KB（约等于原始 900KB）。
    // 这里按未压缩体积设阈值，超了会在构建日志里明确告警。
    chunkSizeWarningLimit: 900,
  },
})
