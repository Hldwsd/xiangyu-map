<script setup lang="ts">
import { computed } from 'vue'

import { UI_ICON_PATHS, type UiIconName } from '@/components/icons/ui-icon-paths'

const props = withDefaults(
  defineProps<{
    name: UiIconName
    /** 像素尺寸；默认与正文行高对齐 */
    size?: number
    /** 线宽：与文字并排时 1.6 够清楚，做大图标时可以调细 */
    strokeWidth?: number
  }>(),
  { size: 16, strokeWidth: 1.6 },
)

const paths = computed(() => UI_ICON_PATHS[props.name])
</script>

<template>
  <svg
    class="ui-icon"
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
.ui-icon {
  flex: none;
  /* 与文字基线对齐：图标比文字略下沉一点，视觉上才「坐」在同一行 */
  vertical-align: -0.15em;
}
</style>
