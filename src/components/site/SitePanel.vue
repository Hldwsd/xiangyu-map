<script setup lang="ts">
import { RouterLink } from 'vue-router'

import type { Site } from '@/types/site'
import { assetUrl } from '@/utils/asset-url'

defineProps<{ site: Site }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <article class="panel">
    <button type="button" class="panel__close" aria-label="关闭" @click="emit('close')">×</button>

    <img
      class="panel__cover"
      :src="assetUrl(site.cover)"
      :alt="`${site.name} 封面`"
      loading="lazy"
    />

    <div class="panel__body">
      <p class="panel__meta">
        <span class="panel__category">{{ site.category }}</span>
        <span>{{ site.province }} · {{ site.city }}</span>
      </p>

      <h2 class="panel__title">{{ site.name }}</h2>
      <p class="panel__summary">{{ site.summary }}</p>

      <ul v-if="site.tags.length > 0" class="panel__tags">
        <li v-for="tag in site.tags" :key="tag">{{ tag }}</li>
      </ul>

      <dl class="panel__facts">
        <template v-if="site.bestSeason">
          <dt>最佳季节</dt>
          <dd>{{ site.bestSeason }}</dd>
        </template>
        <template v-if="site.transport">
          <dt>交通</dt>
          <dd>{{ site.transport }}</dd>
        </template>
      </dl>

      <RouterLink class="panel__link" :to="{ name: 'site-detail', params: { id: site.id } }">
        查看详情 →
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgb(255 253 248 / 96%);
  border: 1px solid var(--line, #ddd2bd);
  border-radius: 14px;
  box-shadow: 0 18px 40px -28px rgb(60 44 20 / 55%);
}

.panel__close {
  position: absolute;
  top: 0.5rem;
  right: 0.6rem;
  width: 1.9rem;
  height: 1.9rem;
  font-size: 1.1rem;
  line-height: 1;
  color: #fffdf8;
  cursor: pointer;
  background: rgb(28 26 22 / 45%);
  border: 0;
  border-radius: 999px;
}

.panel__close:hover {
  background: rgb(28 26 22 / 70%);
}

.panel__cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--paper-2, #efe7d8);
}

.panel__body {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.95rem 1.05rem 1.15rem;
}

.panel__meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-soft, #6b6154);
}

.panel__category {
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
  color: var(--accent, #b45309);
  border: 1px solid currentcolor;
  border-radius: 999px;
}

.panel__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink, #2a2620);
}

.panel__summary {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.65;
  color: var(--ink-soft, #6b6154);
}

.panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0;
  margin: 0.1rem 0 0;
  list-style: none;
}

.panel__tags li {
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
  color: var(--ink-soft, #6b6154);
  background: var(--paper-2, #efe7d8);
  border-radius: 4px;
}

.panel__facts {
  display: grid;
  grid-template-columns: auto;
  gap: 0.15rem;
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
}

.panel__facts dt {
  color: var(--ink-soft, #6b6154);
}

.panel__facts dd {
  margin: 0 0 0.35rem;
  line-height: 1.55;
  color: var(--ink, #2a2620);
}

.panel__link {
  align-self: flex-start;
  margin-top: 0.35rem;
  font-size: 0.85rem;
  color: var(--accent, #b45309);
  text-decoration: none;
  border-bottom: 1px solid currentcolor;
}

.panel__link:hover {
  color: var(--ink, #2a2620);
}
</style>
