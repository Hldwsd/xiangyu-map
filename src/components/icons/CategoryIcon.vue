<script setup lang="ts">
import { computed } from 'vue'

import { CATEGORY_ICON_PATHS } from '@/components/icons/category-paths'
import type { SiteCategory } from '@/types/site'

const props = withDefaults(defineProps<{ category: SiteCategory; size?: number }>(), { size: 14 })

const path = computed(() => CATEGORY_ICON_PATHS[props.category])
</script>

<template>
  <!--
    用 currentColor 填充：放在白底 chip 上是墨色，放在反色（黑底）chip 上自动变白，
    不需要额外传 tone，也不会出现「图标和文字差一个颜色」这种低级问题。
  -->
  <svg
    class="category-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" fill-rule="evenodd" />
  </svg>
</template>

<style scoped>
.category-icon {
  flex: none;
  vertical-align: -0.15em;
}
</style>
