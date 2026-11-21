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

/** 只有还带「示例数据」标签的条目才提示「内容为占位」；其余只说明封面待授权 */
const isSample = computed(() => site.value?.tags.includes('示例数据') === true)

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
          <CategoryIcon :category="site.category" :size="20" />{{ site.category }}
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
      <p v-if="isSample" class="detail__notice">
        当前为示例数据：文案、图片与来源均为占位，正式上线前会逐条替换为可核验的官方资料。
      </p>
      <p v-else class="detail__notice">
        封面图暂为占位；文案与来源已逐条核验，授权素材到位后替换。
      </p>
    </section>

    <nav class="detail__pager" aria-label="相邻项目">
      <RouterLink
        v-if="previous"
        class="detail__pager-item"
        :to="{ name: 'site-detail', params: { id: previous.id } }"
      >
        <span class="detail__pager-dir"><AppIcon name="prev" :size="12" />上一条</span>
        <span class="detail__pager-name">{{ previous.name }}</span>
      </RouterLink>
      <span v-else class="detail__pager-item detail__pager-item--empty">已是第一条</span>

      <RouterLink
        v-if="next"
        class="detail__pager-item detail__pager-item--next"
        :to="{ name: 'site-detail', params: { id: next.id } }"
      >
        <span class="detail__pager-dir">下一条<AppIcon name="next" :size="12" /></span>
        <span class="detail__pager-name">{{ next.name }}</span>
      </RouterLink>
      <span v-else class="detail__pager-item detail__pager-item--empty detail__pager-item--next"
        >已是最后一条</span
      >
    </nav>

    <RouterLink class="detail__back detail__back--bottom" :to="{ name: 'home' }">
      <AppIcon name="back" :size="14" />返回地图
    </RouterLink>
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
  /* 栏宽用 rem：html 基准随视口放大，这里跟着变宽，不再固定 820px */
  max-width: 56rem;
  margin: 0 auto;
  padding: 0 clamp(1.1rem, 3vw, 2.6rem) var(--space-7);
}

/* ---- 返回 ---- */

.detail__back {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  margin: var(--space-4) 0 var(--space-3);
  font-size: var(--text-sm);
  color: var(--ink-soft);
  text-decoration: none;
  transition: color 0.15s ease;
}

.detail__back:hover {
  color: var(--accent);
}

/* ---- 头部 ---- */

.detail__header {
  padding: clamp(1.1rem, 2.2vw, 1.7rem);
  margin-top: var(--space-3);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
}

.detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin: 0 0 var(--space-3);
  font-size: var(--text-xs);
  color: var(--ink-soft);
}

.detail__category {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  padding: 0.14rem 0.55rem;
  color: var(--ink);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
}

.detail__updated {
  margin-left: auto;
  font-size: var(--text-2xs);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.detail__title {
  margin: 0 0 var(--space-2);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 650;
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-display);
  color: var(--ink);
}

.detail__summary {
  max-width: 58ch;
  margin: 0;
  font-size: var(--text-md);
  line-height: var(--leading-relaxed);
  color: var(--ink-soft);
}

.detail__cover {
  display: block;
  width: 100%;
  /* 16:9 在宽栏下会很高，把「简介」推出首屏；用视口高度限高，宽屏大屏也稳 */
  max-height: min(46vh, 30rem);
  margin: var(--space-5) 0 0;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

/* ---- 小节：细线 + 大间距，形成阅读节奏 ---- */

.detail__section {
  padding: clamp(1.1rem, 2.2vw, 1.6rem);
  margin-top: var(--space-4);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.detail__section h2 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  color: var(--ink-soft);
}

.detail__section p {
  max-width: 62ch;
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--ink);
}

.detail__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: var(--space-2);
}

.detail__gallery img {
  width: 100%;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

/* ---- 实用信息：定义列表按行分栏，行间用细线 ---- */

.detail__facts {
  display: grid;
  grid-template-columns: 7rem 1fr;
  margin: 0;
  font-size: var(--text-sm);
}

.detail__facts dt,
.detail__facts dd {
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--line);
}

.detail__facts dt {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  color: var(--ink-soft);
}

.detail__facts dd {
  margin: 0;
  line-height: var(--leading-snug);
}

/* ---- 来源与提示 ---- */

.detail__sources {
  padding-left: 1.1rem;
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.detail__sources a {
  color: var(--accent);
  word-break: break-all;
}

.detail__notice {
  margin: var(--space-3) 0 0 !important;
  padding: 0.65rem 0.8rem;
  font-size: var(--text-xs) !important;
  line-height: 1.65 !important;
  color: var(--ink-soft) !important;
  background: var(--surface-muted);
  border-radius: var(--radius-sm);
}

/* ---- 上下一条 ---- */

.detail__pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding-top: var(--space-4);
  margin-top: var(--space-5);
  border-top: 1px solid var(--line);
}

.detail__pager-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.7rem 0.85rem;
  color: var(--ink);
  text-decoration: none;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.detail__pager-item:hover {
  background: var(--surface-muted);
  border-color: var(--line-strong);
}

.detail__pager-item--next {
  align-items: flex-end;
  text-align: right;
}

.detail__pager-item--empty {
  color: var(--ink-soft);
  background: transparent;
  border-style: dashed;
}

.detail__pager-dir {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
  color: var(--ink-soft);
}

.detail__pager-name {
  font-size: var(--text-base);
}

.detail__back--bottom {
  margin-top: var(--space-5);
}

.detail--missing {
  padding-top: var(--space-6);
}

@media (width <= 720px) {
  .detail__facts {
    grid-template-columns: 1fr;
  }

  .detail__facts dt {
    padding-bottom: 0.1rem;
    border-bottom: 0;
  }

  .detail__facts dd {
    padding-top: 0.1rem;
    padding-bottom: 0.7rem;
  }

  .detail__pager {
    grid-template-columns: 1fr;
  }

  .detail__pager-item--next {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
