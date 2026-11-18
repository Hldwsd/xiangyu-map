<script setup lang="ts">
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
        全部<span class="filter__count">{{ total }}</span>
      </button>

      <button
        v-for="item in SITE_CATEGORIES"
        :key="item"
        type="button"
        class="filter__chip"
        :class="{ 'filter__chip--active': category === item }"
        @click="category = item"
      >
        {{ item }}<span class="filter__count">{{ counts[item] }}</span>
      </button>
    </div>

    <label class="filter__search">
      <span class="filter__search-label">搜索</span>
      <input
        v-model="query"
        type="search"
        class="filter__input"
        placeholder="地名、城市或标签，如「古城」"
        autocomplete="off"
      />
    </label>
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
  gap: 0.35rem;
  align-items: center;
  padding: 0.35rem 0.7rem;
  font: inherit;
  font-size: 0.82rem;
  color: var(--ink, #2a2620);
  cursor: pointer;
  background: rgba(255, 253, 248, 0.86);
  border: 1px solid var(--line, #ddd2bd);
  border-radius: 999px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.filter__chip:hover {
  border-color: var(--accent, #b45309);
}

.filter__chip--active {
  color: #fffdf8;
  background: var(--accent, #b45309);
  border-color: var(--accent, #b45309);
}

.filter__count {
  font-size: 0.72rem;
  opacity: 0.72;
}

.filter__search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter__search-label {
  font-size: 0.78rem;
  color: var(--ink-soft, #6b6154);
}

.filter__input {
  flex: 1;
  min-width: 0;
  padding: 0.42rem 0.7rem;
  font: inherit;
  font-size: 0.85rem;
  color: inherit;
  background: rgba(255, 253, 248, 0.92);
  border: 1px solid var(--line, #ddd2bd);
  border-radius: 8px;
}

.filter__input:focus-visible {
  border-color: var(--accent, #b45309);
  outline: 2px solid transparent;
}
</style>
