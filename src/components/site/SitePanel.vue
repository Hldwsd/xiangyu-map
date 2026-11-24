<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import { prefersReducedMotion } from '@/utils/motion'

import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'

import type { Site } from '@/types/site'
import { assetUrl } from '@/utils/asset-url'

const props = defineProps<{ site: Site }>()
const router = useRouter()

const emit = defineEmits<{ close: [] }>()

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>
  }
}

/** 「查看详情」：卡片封面与详情大图做共享元素过渡（浏览器原生 View Transition） */
function openDetail(event: MouseEvent): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (prefersReducedMotion()) return

  const vtDoc = document as ViewTransitionDocument
  if (typeof vtDoc.startViewTransition !== 'function') return

  event.preventDefault()
  const link = event.currentTarget as HTMLElement | null
  const cover = link?.closest('.panel')?.querySelector<HTMLElement>('.panel__cover') ?? null
  if (cover) cover.style.viewTransitionName = 'site-cover'

  const transition = vtDoc.startViewTransition(() =>
    router.push({ name: 'site-detail', params: { id: props.site.id } }),
  )
  void transition.finished.finally(() => {
    if (cover) cover.style.viewTransitionName = ''
  })
}
</script>

<template>
  <article class="panel">
    <button type="button" class="panel__close" aria-label="关闭" @click="emit('close')">
      <AppIcon name="close" :size="15" />
    </button>

    <img
      class="panel__cover"
      :src="assetUrl(site.cover)"
      :alt="`${site.name} 封面`"
      loading="lazy"
    />

    <div class="panel__body">
      <p class="panel__meta">
        <span class="panel__category">
          <CategoryIcon :category="site.category" :size="20" />{{ site.category }}
        </span>
        <span>{{ site.province }} · {{ site.city }}</span>
      </p>

      <h2 class="panel__title">{{ site.name }}</h2>
      <p class="panel__summary">{{ site.summary }}</p>

      <ul v-if="site.tags.length > 0" class="panel__tags">
        <li v-for="tag in site.tags" :key="tag">{{ tag }}</li>
      </ul>

      <dl class="panel__facts">
        <template v-if="site.bestSeason">
          <dt><AppIcon name="calendar" :size="12" />最佳季节</dt>
          <dd>{{ site.bestSeason }}</dd>
        </template>
        <template v-if="site.transport">
          <dt><AppIcon name="route" :size="12" />交通</dt>
          <dd>{{ site.transport }}</dd>
        </template>
      </dl>

      <RouterLink
        class="panel__link"
        :to="{ name: 'site-detail', params: { id: site.id } }"
        @click="openDetail"
      >
        查看详情
        <AppIcon name="next" :size="13" />
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: rgb(var(--surface-rgb) / 96%);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
}

/* 关闭按钮压在封面上：白底 + 细线，任何封面下都看得见，也不会像深色圆点那样抢眼 */
.panel__close {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  color: var(--ink);
  cursor: pointer;
  background: rgb(var(--surface-rgb) / 92%);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  transition: background-color 0.15s ease;
}

.panel__close:hover {
  background: var(--surface-muted);
}

.panel {
  position: relative;
}

.panel__cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: var(--surface-muted);
  border-bottom: 1px solid var(--line);
}

.panel__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
}

.panel__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin: 0;
  font-size: var(--text-xs);
  color: var(--ink-soft);
}

.panel__category {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  padding: 0.1rem 0.5rem;
  font-size: var(--text-2xs);
  color: var(--ink);
  border: 1px solid var(--seal);
  border-radius: var(--radius-pill);
}

.panel__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 600;
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-display);
  color: var(--ink);
}

.panel__summary {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--ink-soft);
}

.panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.panel__tags li {
  padding: 0.1rem 0.45rem;
  font-size: var(--text-2xs);
  letter-spacing: 0.02em;
  color: var(--ink-soft);
  background: var(--surface-muted);
  border-radius: var(--radius-xs);
}

.panel__facts {
  display: grid;
  gap: 0.15rem;
  padding-top: var(--space-2);
  margin: 0;
  font-size: var(--text-sm);
  border-top: 1px solid var(--line);
}

.panel__facts dt {
  display: inline-flex;
  gap: 0.28rem;
  align-items: center;
  font-size: var(--text-2xs);
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}

.panel__facts dd {
  margin: 0 0 0.45rem;
  line-height: var(--leading-snug);
  color: var(--ink);
}

/* 主操作做成黑底按钮：面板里只有一个动作，让它明确是按钮而不是一行链接 */
.panel__link {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  align-self: flex-start;
  padding: 0.42rem 0.9rem;
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--accent-ink);
  text-decoration: none;
  background: var(--accent);
  border-radius: var(--radius-pill);
  transition: opacity 0.15s ease;
}

.panel__link:hover {
  opacity: 0.85;
}
</style>
