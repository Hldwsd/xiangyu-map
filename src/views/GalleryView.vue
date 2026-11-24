<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { Site } from '@/types/site'
import { sites } from '@/data/sites'
import { createGalleryScene, type GallerySite } from '@/gallery/webgl-gallery'
import { assetUrl } from '@/utils/asset-url'

type ShareSite = Site & { shareImage: string }

const FEATURED_IDS = [
  'huangshan-scenic',
  'hongcun',
  'huizhou-ancient-city',
  'huaxilou',
  'wangmantian-village',
  'chaohu',
  'jiuhuashan',
  'tianzhushan',
  'longchuan',
  'sanhe-ancient-town',
]

const shareSites = sites.filter((site): site is ShareSite => Boolean(site.shareImage))
const byId = new Map(shareSites.map((site) => [site.id, site]))
const helixSites: ShareSite[] = []
for (const id of FEATURED_IDS) {
  const site = byId.get(id)
  if (site !== undefined) helixSites.push(site)
}
for (const site of shareSites) {
  if (helixSites.length >= 10) break
  if (!helixSites.some((item) => item.id === site.id)) helixSites.push(site)
}
const orderedSites: ShareSite[] = [
  ...helixSites,
  ...shareSites.filter((site) => !helixSites.some((item) => item.id === site.id)),
]

const staticMode = ref(
  typeof window !== 'undefined' &&
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 900),
)
const activeIndex = ref(0)
const hudHidden = ref(false)
const mapShown = ref(false)
const current = computed<ShareSite | undefined>(
  () => helixSites[activeIndex.value] ?? helixSites[0],
)
const staticFeaturedId = computed(() => helixSites[0]?.id ?? null)

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

let cleanup: (() => void) | null = null

function sitePath(site: ShareSite): string {
  return `/site/${site.id}`
}

onMounted(async () => {
  if (staticMode.value) return
  const canvasEl = canvas.value
  const stageEl = stage.value
  if (!canvasEl || !stageEl) return

  const sceneSites: GallerySite[] = orderedSites.map((site) => ({
    id: site.id,
    name: site.name,
    city: site.city,
    category: site.category,
    shareImage: assetUrl(site.shareImage),
  }))

  const created = createGalleryScene(canvasEl, sceneSites, {
    onActive: (index) => {
      activeIndex.value = index
    },
  })
  if (created === null) {
    staticMode.value = true
    return
  }

  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  const state = { spin: 0, map: 0 }
  const context = gsap.context(() => {
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: stageEl,
        start: 'top top',
        end: '+=320%',
        pin: true,
        scrub: 0.8,
      },
      onUpdate: () => {
        created.setState(state)
        hudHidden.value = state.map > 0.5
        mapShown.value = state.map > 0.78
      },
    })
    timeline
      .to(state, { spin: 324, duration: 0.5, ease: 'none' }, 0)
      .to(state, { map: 1, duration: 0.35, ease: 'power2.inOut' }, 0.55)
    created.setState(state)
  }, root.value ?? undefined)

  const refresh = (): void => ScrollTrigger.refresh()
  window.addEventListener('load', refresh)
  ScrollTrigger.refresh()

  cleanup = () => {
    window.removeEventListener('load', refresh)
    context.revert()
    created.destroy()
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div ref="root" class="gallery">
    <header class="gallery__intro">
      <p class="gallery__eyebrow">分享图集 · {{ shareSites.length }} 张</p>
      <h1 class="gallery__title">把安徽，<br />收进七十张卡片。</h1>
      <p v-if="!staticMode" class="gallery__lede">
        十张精选沿着一道竖螺旋往上转；再往下，{{ shareSites.length }} 张照片拼成安徽。
      </p>
      <p v-else class="gallery__lede">
        全部 {{ shareSites.length }} 张分享图排成一面墙；点开任意一张，回到它的项目页。
      </p>
      <div class="gallery__meta">
        <span>向下滚动</span>
        <span v-if="!staticMode">10 张精选 / {{ shareSites.length }} 张全图</span>
        <span v-else>{{ shareSites.length }} 张全图</span>
      </div>
    </header>

    <section
      ref="stage"
      class="gallery__stage"
      :class="{ 'is-static': staticMode, 'is-map': mapShown }"
    >
      <canvas v-if="!staticMode" ref="canvas" class="stage__canvas" aria-hidden="true"></canvas>

      <div v-if="!staticMode" class="stage__hud" :class="{ 'is-hidden': hudHidden }">
        <span class="stage__count">
          {{ String(activeIndex + 1).padStart(2, '0') }} /
          {{ String(helixSites.length).padStart(2, '0') }}
        </span>
        <h2 v-if="current" class="stage__name">{{ current.name }}</h2>
        <p v-if="current" class="stage__meta">{{ current.city }} · {{ current.category }}</p>
      </div>

      <div v-if="!staticMode" class="stage__map-caption" :class="{ 'is-visible': mapShown }">
        <p class="stage__map-title">{{ shareSites.length }} 张分享图 · 拼成安徽</p>
        <p v-if="current" class="stage__map-note">精选 · {{ current.name }} 已落位</p>
      </div>

      <div v-if="staticMode" class="matrix">
        <div class="matrix__head">
          <p class="matrix__eyebrow">全部 {{ shareSites.length }} 张分享图</p>
          <p class="matrix__note">点开任意一张，回到它的项目页。</p>
        </div>
        <div class="matrix__grid">
          <RouterLink
            v-for="site in shareSites"
            :key="site.id"
            class="matrix__cell"
            :class="{ 'is-featured': site.id === staticFeaturedId }"
            :to="sitePath(site)"
            :title="`${site.name} · ${site.city}`"
          >
            <img
              :src="assetUrl(site.shareImage)"
              :alt="`${site.name}分享图`"
              loading="lazy"
              decoding="async"
            />
            <span v-if="site.id === staticFeaturedId" class="matrix__label">
              <strong>{{ site.name }}</strong>
              <span>{{ site.city }} · {{ site.category }}</span>
            </span>
          </RouterLink>
          <div
            v-for="n in 8"
            :key="`filler-${n}`"
            class="matrix__cell matrix__cell--filler"
            aria-hidden="true"
          >
            <span>乡遇安徽</span>
          </div>
        </div>
      </div>
    </section>

    <ul class="sr-only">
      <li v-for="site in shareSites" :key="`a11y-${site.id}`">
        <RouterLink :to="sitePath(site)">{{ site.name }} · {{ site.city }}分享图</RouterLink>
      </li>
    </ul>

    <footer class="gallery__outro">
      <p class="gallery__eyebrow">图集之外</p>
      <h2 class="gallery__outro-title">每一张，都指向一个地方。</h2>
      <p class="gallery__outro-lede">
        点开任意一张分享图，回到它在安徽地图上的位置；{{ shareSites.length }} 处项目都可以单独看。
      </p>
      <div class="gallery__links">
        <RouterLink class="gallery__link" :to="{ name: 'home' }">回到地图</RouterLink>
        <a class="gallery__link gallery__link--ghost" :href="assetUrl('/brand/')"
          >品牌页 · 一纸山河</a
        >
      </div>
    </footer>
  </div>
</template>

<style scoped>
.gallery {
  --stage-ink: #12100d;
  --stage-gold: #c9a15c;
  min-height: 100vh;
  overflow-x: clip;
  color: var(--ink);
  background: var(--paper);
}

.gallery__intro {
  width: min(1160px, calc(100% - 2.5rem));
  padding: clamp(4rem, 10vw, 8.5rem) 0 clamp(3.5rem, 8vw, 6rem);
  margin: 0 auto;
}

.gallery__eyebrow {
  font-family: var(--font-sans);
  font-size: 0.68rem;
  letter-spacing: 0.26em;
  color: var(--seal-ink);
  text-transform: uppercase;
}

.gallery__title {
  max-width: 11em;
  margin-top: 1.1rem;
  font-family: var(--font-display);
  font-size: clamp(2.7rem, 7.2vw, 6.2rem);
  font-weight: 500;
  line-height: 1.18;
  letter-spacing: 0.01em;
}

.gallery__lede {
  max-width: 36rem;
  margin-top: 1.6rem;
  font-size: clamp(0.9rem, 1.2vw, 1rem);
  line-height: 2;
  color: var(--ink-soft);
}

.gallery__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  align-items: center;
  justify-content: space-between;
  margin-top: clamp(2.6rem, 6vw, 4rem);
  padding-top: 0.9rem;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  color: var(--ink-soft);
  border-top: 1px solid var(--line);
}

.gallery__stage {
  position: relative;
  height: 100vh;
  min-height: 620px;
  overflow: hidden;
  color: var(--paper);
  background:
    radial-gradient(90% 70% at 50% 38%, rgb(201 161 92 / 9%) 0%, transparent 62%), var(--stage-ink);
  border-top: 1px solid rgb(201 161 92 / 45%);
  border-bottom: 1px solid rgb(201 161 92 / 35%);
}

.gallery__stage::before {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background-image:
    linear-gradient(rgb(244 238 226 / 4%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(244 238 226 / 4%) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(70% 70% at 50% 50%, #000 0%, transparent 100%);
}

.stage__canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
}

.stage__hud {
  position: absolute;
  bottom: clamp(2rem, 5vh, 3.6rem);
  left: clamp(1.4rem, 4vw, 3.5rem);
  z-index: 3;
  transition: opacity 0.45s ease;
}

.stage__hud.is-hidden {
  opacity: 0;
}

.stage__count {
  font-family: var(--font-sans);
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  color: var(--stage-gold);
}

.stage__name {
  margin-top: 0.4rem;
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 2.6vw, 2.2rem);
  font-weight: 500;
  letter-spacing: 0.03em;
}

.stage__meta {
  margin-top: 0.25rem;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: rgb(244 238 226 / 55%);
}

.stage__map-caption {
  position: absolute;
  top: clamp(2rem, 5vh, 3.4rem);
  left: clamp(1.4rem, 4vw, 3.5rem);
  z-index: 3;
  text-align: left;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.stage__map-caption.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.stage__map-title {
  font-family: var(--font-display);
  font-size: clamp(0.95rem, 1.8vw, 1.3rem);
  letter-spacing: 0.08em;
}

.stage__map-note {
  margin-top: 0.35rem;
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  color: var(--stage-gold);
}

/* ---- 静态降级：4 列全量矩阵 ---- */

.gallery__stage.is-static {
  height: auto;
  min-height: 0;
}

.is-static .matrix {
  pointer-events: auto;
  opacity: 1;
  transform: none;
}

.matrix {
  display: flex;
  flex-direction: column;
  gap: clamp(0.9rem, 2vh, 1.5rem);
  align-items: center;
  padding: clamp(2rem, 5vh, 3.4rem) 1rem;
}

.matrix__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.4rem;
  align-items: baseline;
  justify-content: space-between;
  width: min(1260px, calc(100% - 2rem));
}

.matrix__eyebrow {
  font-size: 0.64rem;
  letter-spacing: 0.24em;
  color: var(--stage-gold);
  text-transform: uppercase;
}

.matrix__note {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: rgb(244 238 226 / 50%);
}

.matrix__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  width: calc(100% - 2rem);
  margin: 0 auto;
}

.matrix__cell {
  position: relative;
  display: block;
  overflow: hidden;
  aspect-ratio: 1200 / 630;
  background: #1d1914;
  border: 1px solid rgb(244 238 226 / 8%);
  opacity: 0.85;
}

.matrix__cell img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.matrix__cell.is-featured {
  z-index: 2;
  grid-column: 2 / span 2;
  grid-row: 8 / span 2;
  opacity: 1;
  border-color: rgb(201 161 92 / 90%);
  box-shadow:
    0 0 0 1px rgb(201 161 92 / 45%),
    0 24px 70px rgb(0 0 0 / 55%);
}

.matrix__label {
  position: absolute;
  right: 0.7rem;
  bottom: 0.65rem;
  left: 0.7rem;
  display: grid;
  gap: 0.15rem;
  padding: 0.45rem 0.55rem;
  color: var(--paper);
  background: rgb(18 16 13 / 72%);
  border: 1px solid rgb(244 238 226 / 16%);
  backdrop-filter: blur(4px);
}

.matrix__label strong {
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.matrix__label span {
  font-size: 0.57rem;
  letter-spacing: 0.08em;
  color: rgb(244 238 226 / 62%);
}

.matrix__cell--filler {
  display: grid;
  place-items: center;
  opacity: 0.5;
  background: linear-gradient(135deg, rgb(201 161 92 / 10%), transparent 58%), #1d1914;
  border-style: dashed;
}

.matrix__cell--filler span {
  font-family: var(--font-display);
  font-size: 0.58rem;
  letter-spacing: 0.28em;
  color: rgb(244 238 226 / 40%);
  writing-mode: vertical-rl;
}

.gallery__outro {
  width: min(1160px, calc(100% - 2.5rem));
  padding: clamp(5rem, 12vw, 9rem) 0 clamp(4rem, 9vw, 7rem);
  margin: 0 auto;
}

.gallery__outro-title {
  max-width: 14em;
  margin-top: 0.9rem;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4.4vw, 3.6rem);
  font-weight: 500;
  line-height: 1.3;
}

.gallery__outro-lede {
  max-width: 36rem;
  margin-top: 1.2rem;
  font-size: 0.92rem;
  line-height: 2;
  color: var(--ink-soft);
}

.gallery__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 2rem;
}

.gallery__link {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.1rem;
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  color: var(--paper);
  text-decoration: none;
  background: var(--ink);
  border: 1px solid var(--ink);
}

.gallery__link--ghost {
  color: var(--ink);
  background: transparent;
  border-color: var(--ink);
}

.gallery__link:hover {
  color: var(--paper);
  background: var(--seal-ink);
  border-color: var(--seal-ink);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (width <= 900px) {
  .gallery__intro {
    padding-top: 2.6rem;
  }

  .gallery__title {
    font-size: clamp(2.4rem, 11vw, 3.6rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage__hud,
  .stage__map-caption {
    transition: none;
  }
}
</style>
