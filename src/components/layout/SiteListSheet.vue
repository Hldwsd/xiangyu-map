<script setup lang="ts">
import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import type { Site } from '@/types/site'

defineProps<{ sites: Site[]; selectedId: string | null }>()
const emit = defineEmits<{ select: [id: string]; close: [] }>()
</script>

<template>
  <section class="sheet" role="dialog" aria-label="项目列表">
    <header class="sheet__header">
      <h2 class="sheet__title">
        <AppIcon name="all" :size="12" />
        当前 {{ sites.length }} 个项目
      </h2>
      <button type="button" class="sheet__close" aria-label="关闭列表" @click="emit('close')">
        <AppIcon name="close" :size="15" />
      </button>
    </header>

    <ul class="sheet__list">
      <li v-for="site in sites" :key="site.id">
        <button
          type="button"
          class="sheet__item"
          :class="{ 'sheet__item--on': site.id === selectedId }"
          @click="emit('select', site.id)"
        >
          <span class="sheet__icon"><CategoryIcon :category="site.category" :size="14" /></span>
          <span class="sheet__name">{{ site.name }}</span>
          <span class="sheet__meta">{{ site.category }} · {{ site.city }}</span>
        </button>
      </li>
    </ul>

    <p v-if="sites.length === 0" class="sheet__empty">没有匹配的项目，换一个关键词或清空筛选。</p>
  </section>
</template>

<style scoped>
.sheet {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: rgb(var(--surface-rgb) / 98%);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
}

.sheet__header {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--line);
}

.sheet__title {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  margin: 0;
  font-size: var(--text-2xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  color: var(--ink-soft);
}

.sheet__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  color: var(--ink);
  cursor: pointer;
  background: var(--surface-muted);
  border: 0;
  border-radius: 50%;
}

.sheet__list {
  flex: 1 1 auto;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  list-style: none;
}

.sheet__item {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: 0.62rem var(--space-4);
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: background-color 0.15s ease;
}

.sheet__list li + li .sheet__item {
  border-top: 1px solid var(--line);
}

.sheet__item:hover {
  background: var(--surface-muted);
}

.sheet__item--on {
  background: var(--surface-muted);
}

.sheet__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
}

.sheet__name {
  font-size: var(--text-base);
  line-height: var(--leading-snug);
  color: var(--ink);
}

.sheet__meta {
  grid-column: 2;
  margin-top: 0.1rem;
  font-size: var(--text-2xs);
  letter-spacing: 0.03em;
  color: var(--ink-soft);
}

.sheet__empty {
  padding: var(--space-5) var(--space-4);
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink-soft);
}
</style>
