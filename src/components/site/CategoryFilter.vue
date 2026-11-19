<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import { ALL_CATEGORIES, type CategoryFilter } from '@/stores/sites'
import { SITE_CATEGORIES } from '@/types/site'
import type { SiteCategory } from '@/types/site'

const category = defineModel<CategoryFilter>('category', { required: true })
const query = defineModel<string>('query', { required: true })

defineProps<{
  counts: Record<SiteCategory, number>
  total: number
}>()
</script>

<template>
  <div class="filter">
    <div class="filter__chips" role="group" aria-label="按分类筛选">
      <button
        type="button"
        class="filter__chip"
        :class="{ 'filter__chip--active': category === ALL_CATEGORIES }"
        @click="category = ALL_CATEGORIES"
      >
        <AppIcon name="all" :size="13" />
        <span>全部</span>
        <span class="filter__count">{{ total }}</span>
      </button>

      <button
        v-for="item in SITE_CATEGORIES"
        :key="item"
        type="button"
        class="filter__chip"
        :class="{ 'filter__chip--active': category === item }"
        @click="category = item"
      >
        <!-- 每个分类配象形图标：黑白界面里文字 + 形状是唯一的分类线索 -->
        <CategoryIcon :category="item" :size="13" />
        <span>{{ item }}</span>
        <span class="filter__count">{{ counts[item] }}</span>
      </button>
    </div>

    <!-- 搜索与右侧控件同处一行：筛选卡少一行，地图就能多一行高度 -->
    <div class="filter__row">
      <label class="filter__search">
        <span class="filter__search-label">搜索</span>
        <span class="filter__input-wrap">
          <AppIcon class="filter__search-icon" name="search" :size="14" />
          <input
            v-model="query"
            type="search"
            class="filter__input"
            placeholder="地名、城市或标签，如「古城」"
            autocomplete="off"
          />
        </span>
      </label>
      <div class="filter__aside">
        <slot name="aside" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.filter__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.filter__chip {
  display: inline-flex;
  gap: 0.32rem;
  align-items: center;
  padding: 0.34rem 0.72rem;
  font: inherit;
  font-size: 0.82rem;
  color: var(--ink);
  cursor: pointer;
  background: rgb(var(--surface-rgb) / 86%);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.filter__chip:hover {
  background: var(--surface-muted);
}

.filter__chip--active {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.filter__chip--active:hover {
  background: var(--accent);
}

.filter__count {
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.72;
}

.filter__row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
}

.filter__aside {
  display: flex;
  flex: none;
  align-items: center;
}

.filter__search {
  display: flex;
  flex: 1 1 16rem;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.filter__search-label {
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.filter__input-wrap {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.filter__search-icon {
  position: absolute;
  left: 0.62rem;
  color: var(--ink-soft);
  pointer-events: none;
}

.filter__input {
  flex: 1;
  min-width: 0;
  padding: 0.42rem 0.7rem 0.42rem 2rem;
  font: inherit;
  font-size: 0.85rem;
  color: inherit;
  background: rgb(var(--surface-rgb) / 92%);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
}

.filter__input:focus-visible {
  border-color: var(--accent);
  outline: 2px solid transparent;
}
</style>
