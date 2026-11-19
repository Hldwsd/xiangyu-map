<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useSitesStore } from '@/stores/sites'
import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import { assetUrl } from '@/utils/asset-url'

const FALLBACK_COVER = '/images/placeholder.svg'

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

/** 相邻项目按数据文件顺序取，不循环：首尾各给一句明确的边界提示，比绕回更可预期 */
const index = computed(() => store.sites.findIndex((item) => item.id === props.id))
const previous = computed(() => (index.value > 0 ? (store.sites[index.value - 1] ?? null) : null))
const next = computed(() => {
  if (index.value < 0) return null
  return store.sites[index.value + 1] ?? null
})

/**
 * 图片失败占位。
 * 记下坏掉的地址再换占位图，而不是在原元素上改 src——占位图自己也可能 404，
 * 那样会变成无限的 error 循环。
 */
const brokenImages = ref<ReadonlySet<string>>(new Set())

function srcFor(url: string): string {
  return brokenImages.value.has(url) ? FALLBACK_COVER : url
}

function markBroken(url: string): void {
  brokenImages.value = new Set([...brokenImages.value, url])
}
</script>

<template>
  <article v-if="site" class="detail">
    <RouterLink class="detail__back" :to="{ name: 'home' }">
      <AppIcon name="back" :size="14" />返回地图
    </RouterLink>

    <header class="detail__header">
      <p class="detail__meta">
        <span class="detail__category">
          <CategoryIcon :category="site.category" :size="12" />{{ site.category }}
        </span>
        <span>{{ site.province }} · {{ site.city }}</span>
        <span class="detail__updated">更新于 {{ site.updatedAt }}</span>
      </p>
      <h1 class="detail__title">{{ site.name }}</h1>
      <p class="detail__summary">{{ site.summary }}</p>
    </header>

    <img
      class="detail__cover"
      :src="assetUrl(srcFor(site.cover))"
      :alt="`${site.name} 封面`"
      @error="markBroken(site.cover)"
    />

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
          :src="assetUrl(srcFor(image))"
          :alt="site.name"
          loading="lazy"
          @error="markBroken(image)"
        />
      </div>
    </section>

    <section class="detail__section">
      <h2>实用信息</h2>
      <dl class="detail__facts">
        <dt><AppIcon name="pin" :size="12" />坐标</dt>
        <dd>{{ site.location.lng }}, {{ site.location.lat }}（GCJ-02）</dd>
        <template v-if="site.bestSeason">
          <dt><AppIcon name="calendar" :size="12" />最佳季节</dt>
          <dd>{{ site.bestSeason }}</dd>
        </template>
        <template v-if="site.transport">
          <dt><AppIcon name="route" :size="12" />交通</dt>
          <dd>{{ site.transport }}</dd>
        </template>
        <template v-if="site.bookingUrl">
          <dt><AppIcon name="external" :size="12" />预约</dt>
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

    <nav class="detail__pager" aria-label="相邻项目">
      <RouterLink
        v-if="previous"
        class="detail__pager-item"
        :to="{ name: 'site-detail', params: { id: previous.id } }"
      >
        <span class="detail__pager-dir">← 上一条</span>
        <span class="detail__pager-name">{{ previous.name }}</span>
      </RouterLink>
      <span v-else class="detail__pager-item detail__pager-item--empty">已是第一条</span>

      <RouterLink
        v-if="next"
        class="detail__pager-item detail__pager-item--next"
        :to="{ name: 'site-detail', params: { id: next.id } }"
      >
        <span class="detail__pager-dir">下一条 →</span>
        <span class="detail__pager-name">{{ next.name }}</span>
      </RouterLink>
      <span v-else class="detail__pager-item detail__pager-item--empty detail__pager-item--next"
        >已是最后一条</span
      >
    </nav>

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
  color: var(--ink-soft);
  text-decoration: none;
}

.detail__back:hover {
  color: var(--accent);
}

.detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.detail__category {
  padding: 0.1rem 0.5rem;
  color: var(--accent);
  border: 1px solid currentcolor;
  border-radius: var(--radius-pill);
}

.detail__updated {
  margin-left: auto;
  font-size: 0.74rem;
}

.detail__title {
  margin: 0 0 0.5rem;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  line-height: 1.25;
  letter-spacing: var(--tracking-display);
  color: var(--ink);
}

.detail__summary {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.7;
  color: var(--ink-soft);
}

.detail__cover {
  display: block;
  width: 100%;
  margin: 1.4rem 0 0.5rem;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--surface-muted);
  border-radius: var(--radius-lg);
}

.detail__section {
  margin-top: 1.8rem;
}

.detail__section h2 {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--ink-soft);
}

.detail__section p {
  margin: 0 0 0.7rem;
  font-size: 0.92rem;
  line-height: 1.85;
  color: var(--ink);
}

.detail__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.6rem;
}

.detail__gallery img {
  width: 100%;
  border-radius: var(--radius-sm);
}

.detail__facts {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.35rem 0.75rem;
  margin: 0;
  font-size: 0.88rem;
}

.detail__facts dt {
  color: var(--ink-soft);
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
  color: var(--accent);
  word-break: break-all;
}

.detail__notice {
  margin-top: 0.7rem !important;
  padding: 0.6rem 0.75rem;
  font-size: 0.78rem !important;
  line-height: 1.6 !important;
  color: var(--ink-soft) !important;
  background: var(--surface-muted);
  border-radius: var(--radius-sm);
}

.detail__back--bottom {
  margin-top: 2rem;
}

.detail__pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  padding-top: 1.2rem;
  margin-top: 2rem;
  border-top: 1px solid var(--line);
}

.detail__pager-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.6rem 0.75rem;
  color: var(--ink);
  text-decoration: none;
  background: rgb(var(--surface-rgb) / 78%);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}

.detail__pager-item--next {
  text-align: right;
}

.detail__pager-item--empty {
  color: var(--ink-soft);
  background: transparent;
  border-style: dashed;
}

.detail__pager-dir {
  font-size: 0.72rem;
  color: var(--ink-soft);
}

.detail__pager-name {
  font-size: 0.9rem;
}

.detail--missing {
  padding-top: 3rem;
}
.detail__back,
.detail__category,
.detail__facts dt {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
}
</style>
