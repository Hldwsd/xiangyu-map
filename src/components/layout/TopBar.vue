<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'

defineProps<{
  query: string
  /** 生效中的筛选项个数（分类 + 城市），用来在筛选按钮上挂角标 */
  activeFilters: number
  filterOpen: boolean
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  menu: []
  filter: []
}>()

function onInput(event: Event): void {
  emit('update:query', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="topbar">
    <button type="button" class="topbar__icon" aria-label="打开菜单" @click="emit('menu')">
      <AppIcon name="menu" :size="18" />
    </button>

    <!-- 全圆角搜索栏：整个站点只有这一个搜索入口，浮在地图顶部 -->
    <label class="topbar__search">
      <AppIcon class="topbar__search-icon" name="search" :size="16" />
      <input
        :value="query"
        type="search"
        class="topbar__input"
        placeholder="搜地名、城市或标签，如「古城」"
        autocomplete="off"
        aria-label="搜索文旅项目"
        @input="onInput"
      />
      <button
        v-if="query !== ''"
        type="button"
        class="topbar__clear"
        aria-label="清除搜索"
        @click="emit('update:query', '')"
      >
        <AppIcon name="close" :size="14" />
      </button>
    </label>

    <button
      type="button"
      class="topbar__icon"
      :class="{ 'topbar__icon--on': filterOpen }"
      :aria-expanded="filterOpen"
      aria-label="筛选"
      @click="emit('filter')"
    >
      <AppIcon name="filter" :size="18" />
      <span v-if="activeFilters > 0" class="topbar__badge">{{ activeFilters }}</span>
    </button>
  </div>
</template>

<style scoped>
.topbar {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 20;
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + var(--space-3)) var(--space-3) var(--space-3);
  /* 顶部压一层极淡的渐变，让浮在上面的控件与地图之间有过渡，而不是硬切 */
  background: linear-gradient(to bottom, rgb(255 255 255 / 92%), rgb(255 255 255 / 0%));
}

.topbar__icon {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  color: var(--ink);
  cursor: pointer;
  background: rgb(var(--surface-rgb) / 92%);
  border: 1px solid var(--line);
  border-radius: 50%;
  box-shadow: var(--shadow-card);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.topbar__icon:hover {
  background: #fff;
  border-color: var(--line-strong);
}

.topbar__icon--on {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.topbar__icon--on:hover {
  background: var(--accent);
}

.topbar__badge {
  position: absolute;
  top: -0.15rem;
  right: -0.15rem;
  display: inline-flex;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  line-height: 1.1rem;
  color: var(--accent-ink);
  text-align: center;
  background: var(--ink);
  border: 2px solid #fff;
  border-radius: var(--radius-pill);
}

/* ---- 全圆角搜索栏 ---- */

.topbar__search {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  height: 2.75rem;
  padding: 0 var(--space-2) 0 var(--space-4);
  background: rgb(var(--surface-rgb) / 96%);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-card);
}

.topbar__search:focus-within {
  border-color: var(--ink);
}

.topbar__search-icon {
  flex: none;
  color: var(--ink-soft);
}

.topbar__input {
  flex: 1;
  min-width: 0;
  padding: 0 var(--space-2);
  font: inherit;
  font-size: var(--text-sm);
  color: var(--ink);
  background: transparent;
  border: 0;
  outline: none;
}

.topbar__input::placeholder {
  color: var(--ink-soft);
}

/* 搜索框自带的清除叉各家浏览器样式不一致，统一关掉，用自己的按钮 */
.topbar__input::-webkit-search-cancel-button {
  appearance: none;
}

.topbar__clear {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  color: var(--ink-soft);
  cursor: pointer;
  background: var(--surface-muted);
  border: 0;
  border-radius: 50%;
}

.topbar__clear:hover {
  color: var(--ink);
}
</style>
