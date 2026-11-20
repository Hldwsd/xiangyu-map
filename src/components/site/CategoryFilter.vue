<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import { ALL_CATEGORIES, type CategoryFilter } from '@/stores/sites'
import { SITE_CATEGORIES } from '@/types/site'
import type { SiteCategory } from '@/types/site'

const category = defineModel<CategoryFilter>('category', { required: true })

defineProps<{
  counts: Record<SiteCategory, number>
  total: number
}>()
</script>

<template>
  <!--
    分类 chips：搜索框已经上移到顶部搜索栏，这里只负责分类。
    每个分类配象形图标——黑白界面里文字 + 形状是唯一的分类线索。
  -->
  <div class="filter" role="group" aria-label="按分类筛选">
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
      <CategoryIcon :category="item" :size="18" />
      <span>{{ item }}</span>
      <span class="filter__count">{{ counts[item] }}</span>
    </button>
  </div>
</template>

<style scoped>
.filter {
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
  font-size: var(--text-sm);
  color: var(--ink);
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.filter__chip:hover {
  background: var(--surface-muted);
  border-color: var(--line-strong);
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
  font-size: var(--text-2xs);
  font-variant-numeric: tabular-nums;
  opacity: 0.72;
}
</style>
