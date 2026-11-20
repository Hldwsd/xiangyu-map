<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { InkHongcunScene } from '@/components/scene/ink-hongcun-scene'

/**
 * 动态背景：水墨宏村。
 *
 * 全屏 fixed 画布，压在 body 背景之上、所有 UI 之下；`aria-hidden`，不参与信息层。
 * 只在浏览器标签可见时跑 rAF；`prefers-reduced-motion` 下只画一帧静态画面。
 */
const canvas = ref<HTMLCanvasElement | null>(null)

let scene: InkHongcunScene | null = null
let frame = 0
let observer: ResizeObserver | null = null
let started = 0

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function draw(timeMs: number): void {
  scene?.render(timeMs)
}

function loop(now: number): void {
  frame = window.requestAnimationFrame(loop)
  if (document.hidden) return
  draw(now - started)
}

function resize(): void {
  const element = canvas.value
  if (element === null || scene === null) return
  const width = window.innerWidth
  const height = window.innerHeight
  // 背景不需要 3x 精度，1.5x 足够，省一半以上像素填充
  scene.resize(width, height, Math.min(window.devicePixelRatio || 1, 1.5))
  if (reduceMotion) draw(0)
}

onMounted(() => {
  const element = canvas.value
  if (element === null) return

  scene = new InkHongcunScene(element)
  resize()

  if (reduceMotion) {
    draw(0)
    return
  }

  observer = new ResizeObserver(resize)
  observer.observe(document.documentElement)
  started = performance.now()
  frame = window.requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(frame)
  observer?.disconnect()
  observer = null
  scene?.dispose()
  scene = null
})
</script>

<template>
  <canvas ref="canvas" class="ink-scene" aria-hidden="true" />
</template>

<style scoped>
.ink-scene {
  position: fixed;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
