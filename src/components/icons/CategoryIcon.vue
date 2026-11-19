<script setup lang="ts">
import { computed } from 'vue'

import { CATEGORY_GLYPHS } from '@/components/icons/category-paths'
import type { SiteCategory } from '@/types/site'

const props = withDefaults(
  defineProps<{ category: SiteCategory; size?: number; strokeWidth?: number }>(),
  { size: 14, strokeWidth: 1.7 },
)

const paths = computed(() => CATEGORY_GLYPHS[props.category])
</script>

<template>
  <!--
    与地图上的圆钉用同一套线条（category-paths.ts），只是这里不带圆底。
    stroke 走 currentColor：放在白底 chip 上是墨色，放进反色按钮里自动变白。
  -->
  <svg
    class="category-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
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
