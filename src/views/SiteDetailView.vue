<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { useSitesStore } from '@/stores/sites'

const props = defineProps<{ id: string }>()

const store = useSitesStore()
const site = computed(() => store.getSiteById(props.id))

const paragraphs = computed(() => {
  const current = site.value
  if (current === null) return []
  return current.description
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
})
</script>

<template>
  <article v-if="site" class="detail">
    <RouterLink class="detail__back" :to="{ name: 'home' }">← 返回地图</RouterLink>

    <header class="detail__header">
      <p class="detail__meta">
        <span class="detail__category">{{ site.category }}</span>
        <span>{{ site.province }} · {{ site.city }}</span>
        <span class="detail__updated">更新于 {{ site.updatedAt }}</span>
      </p>
      <h1 class="detail__title">{{ site.name }}</h1>
      <p class="detail__summary">{{ site.summary }}</p>
    </header>

    <img class="detail__cover" :src="site.cover" :alt="`${site.name} 封面`" />

    <section class="detail__section">
      <h2>简介</h2>
      <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
    </section>

    <section v-if="site.gallery.length > 0" class="detail__section">
      <h2>图集</h2>
      <div class="detail__gallery">
        <img
          v-for="image in site.gallery"
          :key="image"
          :src="image"
          :alt="site.name"
          loading="lazy"
        />
      </div>
    </section>

    <section class="detail__section">
      <h2>实用信息</h2>
      <dl class="detail__facts">
        <dt>坐标</dt>
        <dd>{{ site.location.lng }}, {{ site.location.lat }}（GCJ-02）</dd>
        <template v-if="site.bestSeason">
          <dt>最佳季节</dt>
          <dd>{{ site.bestSeason }}</dd>
        </template>
        <template v-if="site.transport">
          <dt>交通</dt>
          <dd>{{ site.transport }}</dd>
        </template>
        <template v-if="site.bookingUrl">
          <dt>预约</dt>
          <dd>
            <a :href="site.bookingUrl" target="_blank" rel="noopener noreferrer">{{
              site.bookingUrl
            }}</a>
          </dd>
        </template>
      </dl>
    </section>

    <section class="detail__section">
      <h2>来源</h2>
      <ul class="detail__sources">
        <li v-for="source in site.sources" :key="source">
          <a :href="source" target="_blank" rel="noopener noreferrer">{{ source }}</a>
        </li>
      </ul>
      <p class="detail__notice">
        当前为示例数据：文案、图片与来源均为占位，正式上线前会逐条替换为可核验的官方资料。
      </p>
    </section>

    <RouterLink class="detail__back detail__back--bottom" :to="{ name: 'home' }"
      >← 返回地图</RouterLink
    >
  </article>

  <div v-else class="detail detail--missing">
    <h1>没有找到这个项目</h1>
    <p>链接可能已经失效，或者该项目已从数据中移除。</p>
    <RouterLink class="detail__back" :to="{ name: 'home' }">← 返回地图</RouterLink>
  </div>
</template>

<style scoped>
.detail {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 1.25rem 3rem;
}

.detail__back {
  display: inline-block;
  margin: 1.25rem 0 1rem;
  font-size: 0.85rem;
  color: var(--ink-soft, #6b6154);
  text-decoration: none;
}

.detail__back:hover {
  color: var(--accent, #b45309);
}

.detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--ink-soft, #6b6154);
}

.detail__category {
  padding: 0.1rem 0.5rem;
  color: var(--accent, #b45309);
  border: 1px solid currentcolor;
  border-radius: 999px;
}

.detail__updated {
  margin-left: auto;
  font-size: 0.74rem;
}

.detail__title {
  margin: 0 0 0.5rem;
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  line-height: 1.25;
  color: var(--ink, #2a2620);
}

.detail__summary {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--ink-soft, #6b6154);
}

.detail__cover {
  display: block;
  width: 100%;
  margin: 1.4rem 0 0.5rem;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--paper-2, #efe7d8);
  border-radius: 14px;
}

.detail__section {
  margin-top: 1.8rem;
}

.detail__section h2 {
  margin: 0 0 0.6rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--ink, #2a2620);
}

.detail__section p {
  margin: 0 0 0.7rem;
  font-size: 0.92rem;
  line-height: 1.85;
  color: var(--ink, #2a2620);
}

.detail__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.6rem;
}

.detail__gallery img {
  width: 100%;
  border-radius: 8px;
}

.detail__facts {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.35rem 0.75rem;
  margin: 0;
  font-size: 0.88rem;
}

.detail__facts dt {
  color: var(--ink-soft, #6b6154);
}

.detail__facts dd {
  margin: 0;
  line-height: 1.6;
}

.detail__sources {
  padding-left: 1.1rem;
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.8;
}

.detail__sources a {
  color: var(--accent, #b45309);
  word-break: break-all;
}

.detail__notice {
  margin-top: 0.7rem !important;
  padding: 0.6rem 0.75rem;
  font-size: 0.78rem !important;
  line-height: 1.6 !important;
  color: var(--ink-soft, #6b6154) !important;
  background: var(--paper-2, #efe7d8);
  border-radius: 8px;
}

.detail__back--bottom {
  margin-top: 2rem;
}

.detail--missing {
  padding-top: 3rem;
}
</style>
