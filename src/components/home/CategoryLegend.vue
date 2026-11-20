<script setup lang="ts">
import { computed } from 'vue'

import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import { ALL_CATEGORIES, useSitesStore } from '@/stores/sites'
import { SITE_CATEGORIES, type SiteCategory } from '@/types/site'

/**
 * 分类图例（兼筛选）。
 *
 * 宽屏放在左侧版头里，窄屏放进左侧抽屉——两处共用这一份，避免两套筛选 UI。
 */
const store = useSitesStore()

const categories = computed(() =>
  SITE_CATEGORIES.map((name) => ({ name, count: store.categoryCounts[name] })),
)

function choose(category: SiteCategory): void {
  store.setCategory(store.category === category ? ALL_CATEGORIES : category)
}

function chooseAll(): void {
  store.setCategory(ALL_CATEGORIES)
}
</script>

<template>
  <div class="legend">
    <button
      type="button"
      class="lrow"
      :class="{ 'lrow--on': store.category === ALL_CATEGORIES }"
      :aria-pressed="store.category === ALL_CATEGORIES"
      @click="chooseAll"
    >
      <span class="lrow__all" aria-hidden="true"> <i /><i /><i /><i /> </span>
      <span class="lrow__name">全部</span>
      <span class="lrow__num">{{ store.sites.length }}</span>
    </button>
    <button
      v-for="item in categories"
      :key="item.name"
      type="button"
      class="lrow"
      :class="{ 'lrow--on': store.category === item.name }"
      :aria-pressed="store.category === item.name"
      @click="choose(item.name)"
    >
      <CategoryIcon :category="item.name" :size="22" />
      <span class="lrow__name">{{ item.name }}</span>
      <span class="lrow__num">{{ item.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--rule);
}

.lrow {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  width: 100%;
  padding: 0.42rem 0.1rem;
  font: inherit;
  font-size: 0.78rem;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
}

.lrow:hover {
  color: var(--ink);
  background: var(--paper);
}

.lrow--on {
  background: var(--paper);
  box-shadow: inset 2px 0 0 var(--ink);
}

.lrow:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.lrow__name {
  letter-spacing: 0.04em;
}

.lrow__num {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: 0.66rem;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

/* 「全部」的四格符号：四类形状的抽象 */
.lrow__all {
  display: grid;
  flex: none;
  grid-template-columns: repeat(2, 6px);
  gap: 2px;
  width: 22px;
  justify-content: center;
}

.lrow__all i {
  width: 6px;
  height: 6px;
  border: 1px solid currentcolor;
}

.lrow__all i:nth-child(2) {
  border-radius: 50%;
}

.lrow__all i:nth-child(3) {
  border-radius: 1px 1px 4px 4px;
}

.lrow__all i:nth-child(4) {
  border-radius: 50% 50% 0 0;
}
</style>
