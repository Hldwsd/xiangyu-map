<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryFilter from '@/components/site/CategoryFilter.vue'
import CityFilter from '@/components/site/CityFilter.vue'
import {
  ALL_CITIES,
  ALL_CATEGORIES,
  type CategoryFilter as CategoryValue,
  type CityFilter as CityValue,
} from '@/stores/sites'
import type { AnhuiCity, SiteCategory } from '@/types/site'

const props = defineProps<{
  category: CategoryValue
  city: CityValue
  counts: Record<SiteCategory, number>
  cityCounts: Record<AnhuiCity, number>
  total: number
  matched: number
}>()

const emit = defineEmits<{
  'update:category': [value: CategoryValue]
  'update:city': [value: CityValue]
  reset: []
}>()

const filtered = computed(() => props.category !== ALL_CATEGORIES || props.city !== ALL_CITIES)
</script>

<template>
  <section class="popover" role="dialog" aria-label="筛选">
    <header class="popover__header">
      <h2 class="popover__title">
        <AppIcon name="filter" :size="12" />
        筛选
      </h2>
      <button v-if="filtered" type="button" class="popover__reset" @click="emit('reset')">
        <AppIcon name="reset" :size="12" />清空
      </button>
    </header>

    <CategoryFilter
      :category="category"
      :counts="counts"
      :total="total"
      @update:category="emit('update:category', $event)"
    />

    <CityFilter :city="city" :counts="cityCounts" @update:city="emit('update:city', $event)" />

    <p class="popover__result">符合条件 {{ matched }} / {{ total }} 个项目</p>
  </section>
</template>

<style scoped>
.popover {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: rgb(var(--surface-rgb) / 98%);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
}

.popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.popover__title {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  margin: 0;
  font-size: var(--text-2xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  color: var(--ink-soft);
}

.popover__reset {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0.15rem 0.5rem;
  font: inherit;
  font-size: var(--text-2xs);
  color: var(--ink);
  cursor: pointer;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
}

.popover__reset:hover {
  border-color: var(--line-strong);
}

.popover__result {
  margin: 0;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}
</style>
