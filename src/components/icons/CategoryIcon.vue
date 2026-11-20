<script setup lang="ts">
import { computed } from 'vue'

import { CATEGORY_GLYPHS } from '@/components/icons/category-paths'
import type { SiteCategory } from '@/types/site'

const props = withDefaults(defineProps<{ category: SiteCategory; size?: number }>(), {
  size: 16,
})

const paths = computed(() => CATEGORY_GLYPHS[props.category])
/**
 * 48 网格里的线宽要按显示尺寸换算，才能在不同大小下保持约 2.2px 的视觉粗细。
 * 12px 时不换算会细到看不见；22px 时不换算又会糊成一团。
 */
const strokeWidth = computed(() => (48 / props.size) * 2.2)
</script>

<template>
  <!--
    与地图圆钉用同一套 S1 线条（category-paths.ts），这里只是不带圆底。
    stroke 走 currentColor：放在纸色 chip 上是墨色，放进反色按钮里自动变纸色。
  -->
  <svg
    class="category-icon"
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="path in paths" :key="path" :d="path" />
  </svg>
</template>

<style scoped>
.category-icon {
  flex: none;
  vertical-align: -0.15em;
}
</style>
