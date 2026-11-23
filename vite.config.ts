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
    rollupOptions: {
      // 两个入口：地图应用（/）与品牌页（/brand/）。
      // 品牌页自己的 GSAP 进独立 chunk，不占应用的「首屏 JS」预算
      // （scripts/check-bundle-size.mjs 只统计 dist/index.html 引用的资源）。
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        brand: fileURLToPath(new URL('./brand/index.html', import.meta.url)),
      },
    },
  },
})
