<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { Site } from '@/types/site'
import { sites } from '@/data/sites'
import { assetUrl } from '@/utils/asset-url'

type ShareSite = Site & { shareImage: string }

/** 首屏螺旋里出现的十张：优先头部项目，不足十张时从全量补齐 */
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

const activeIndex = ref(0)
const current = computed<ShareSite | undefined>(
  () => helixSites[activeIndex.value] ?? helixSites[0],
)
const matrixFeaturedId = ref<string | null>(helixSites[0]?.id ?? null)
const matrixReady = ref(false)
const matrixShown = ref(false)
const staticMode = ref(false)

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const spiral = ref<HTMLElement | null>(null)
const helix = ref<HTMLElement | null>(null)
const spotlight = ref<HTMLElement | null>(null)
const matrix = ref<HTMLElement | null>(null)

const STEP = 36
const SPIN = 540
const RADIUS = 420

function cardStyle(index: number): Record<string, string> {
  const angle = index * STEP
  const y = (index - (helixSites.length - 1) / 2) * 68
  return {
    transform: `translate(-50%, -50%) translateY(${y}px) rotateY(${angle}deg) translateZ(${RADIUS}px)`,
  }
}

function shareSrc(site: ShareSite): string {
  return assetUrl(site.shareImage)
}

function sitePath(site: ShareSite): string {
  return `/site/${site.id}`
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

let cleanup: (() => void) | null = null

onMounted(async () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce || window.innerWidth < 900) {
    staticMode.value = true
    matrixReady.value = true
    matrixShown.value = true
    return
  }

  const { gsap } = await import('gsap')
  const { ScrollTrigger } = await import('gsap/ScrollTrigger')
  gsap.registerPlugin(ScrollTrigger)

  const stageEl = stage.value
  const spiralEl = spiral.value
  const helixEl = helix.value
  const spotlightEl = spotlight.value
  const matrixEl = matrix.value
  if (!stageEl || !spiralEl || !helixEl || !spotlightEl || !matrixEl) return

  const context = gsap.context(() => {
    const apply = (progress: number): void => {
      const helixProgress = Math.min(1, progress / 0.62)
      const spin = helixProgress * SPIN
      helixEl.style.transform = `translate(-50%, -50%) rotateX(-6deg) rotateY(${-spin}deg)`

      if (progress < 0.55) {
        activeIndex.value = Math.round(spin / STEP) % helixSites.length
        matrixFeaturedId.value = helixSites[activeIndex.value]?.id ?? null
      }

      const reveal = clamp01((progress - 0.55) / 0.22)
      matrixEl.style.opacity = String(reveal)
      matrixEl.style.transform = `scale(${0.9 + reveal * 0.1})`
      matrixEl.style.pointerEvents = reveal > 0.65 ? 'auto' : 'none'

      const spiralFade = 1 - clamp01((progress - 0.54) / 0.12)
      spiralEl.style.opacity = String(spiralFade)
      spotlightEl.style.opacity = String(spiralFade)
      spotlightEl.style.transform = `translate(-50%, -50%) scale(${0.55 + spiralFade * 0.45})`
      spotlightEl.style.pointerEvents = spiralFade > 0.5 ? 'auto' : 'none'

      matrixShown.value = reveal > 0.55
      if (progress > 0.01) matrixReady.value = true
    }

    ScrollTrigger.create({
      trigger: stageEl,
      start: 'top top',
      end: '+=320%',
      pin: true,
      pinSpacing: true,
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    })

    apply(0)
  }, root.value ?? undefined)

  const onLoad = (): void => ScrollTrigger.refresh()
  window.addEventListener('load', onLoad)
  ScrollTrigger.refresh()

  cleanup = () => {
    window.removeEventListener('load', onLoad)
    context.revert()
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div ref="root" class="gallery">
    <header class="gallery__intro">
      <p class="gallery__eyebrow">分享图集 · {{ shareSites.length }} 张</p>
      <h1 class="gallery__title">把安徽，<br />收进七十张卡片。</h1>
      <p class="gallery__lede">
        十张精选沿着一道竖螺旋往上转；再往下，它们落回全部 {{ shareSites.length }}
        张分享图排成的墙里。
      </p>
      <div class="gallery__meta">
        <span>向下滚动</span>
        <span>10 张精选 / {{ shareSites.length }} 张全图</span>
      </div>
    </header>

    <section ref="stage" class="gallery__stage" :class="{ 'is-static': staticMode }">
      <div class="stage__inner">
        <div class="stage__axis" aria-hidden="true"></div>

        <div ref="spiral" class="stage__spiral" aria-hidden="true">
          <div ref="helix" class="helix">
            <RouterLink
              v-for="(site, index) in helixSites"
              :key="site.id"
              class="helix-card"
              :class="{ 'is-active': index === activeIndex }"
              :style="cardStyle(index)"
              :to="sitePath(site)"
              tabindex="-1"
            >
              <span class="helix-card__frame">
                <img
                  class="helix-card__image"
                  :src="shareSrc(site)"
                  :alt="`${site.name}分享图`"
                  loading="eager"
                  decoding="async"
                />
              </span>
            </RouterLink>
          </div>
        </div>

        <div ref="spotlight" class="spotlight">
          <RouterLink v-if="current" class="spotlight__link" :to="sitePath(current)">
            <span class="spotlight__frame">
              <Transition name="spot" mode="default">
                <img
                  :key="current.id"
                  class="spotlight__image"
                  :src="shareSrc(current)"
                  :alt="`${current.name}分享图`"
                  decoding="async"
                />
              </Transition>
              <span class="spotlight__tag"
                >精选 {{ String(activeIndex + 1).padStart(2, '0') }}</span
              >
            </span>
          </RouterLink>
        </div>

        <div ref="matrix" class="matrix" :class="{ 'is-shown': matrixShown }">
          <div class="matrix__head">
            <p class="matrix__eyebrow">全部 {{ shareSites.length }} 张分享图</p>
            <p class="matrix__note">精选的那一张，落回它该在的位置。</p>
          </div>

          <div class="matrix__grid">
            <RouterLink
              v-for="site in shareSites"
              :key="site.id"
              class="matrix__cell"
              :class="{ 'is-featured': site.id === matrixFeaturedId }"
              :to="sitePath(site)"
              :title="`${site.name} · ${site.city}`"
            >
              <img
                v-if="matrixReady"
                :src="shareSrc(site)"
                :alt="`${site.name}分享图`"
                loading="lazy"
                decoding="async"
              />
              <span v-if="site.id === matrixFeaturedId" class="matrix__label">
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

        <div v-if="!staticMode" class="stage__hud" :class="{ 'is-dimmed': matrixShown }">
          <span class="stage__count">
            {{ String(activeIndex + 1).padStart(2, '0') }} /
            {{ String(helixSites.length).padStart(2, '0') }}
          </span>
          <h2 v-if="current" class="stage__name">{{ current.name }}</h2>
          <p v-if="current" class="stage__meta">{{ current.city }} · {{ current.category }}</p>
        </div>
      </div>
    </section>

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
  --stage-line: rgb(244 238 226 / 14%);
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
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  color: var(--ink-soft);
  border-top: 1px solid var(--line);
  padding-top: 0.9rem;
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

.stage__inner {
  position: relative;
  height: 100%;
  perspective: 1400px;
  transform-style: preserve-3d;
}

/* 竖轴：让螺旋有明确的旋转中心 */
.stage__axis {
  position: absolute;
  top: 14%;
  bottom: 14%;
  left: 50%;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgb(201 161 92 / 38%) 18%,
    rgb(201 161 92 / 38%) 82%,
    transparent 100%
  );
  transform: translateX(-50%);
  opacity: 0.7;
}

.stage__spiral {
  position: absolute;
  inset: 0;
  z-index: 1;
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  will-change: transform, opacity;
}

.helix {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform-origin: 0 0;
  will-change: transform;
}

.helix-card {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: clamp(165px, 17vw, 215px);
  aspect-ratio: 1200 / 630;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  text-decoration: none;
}

.helix-card__frame {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #211d17;
  border: 1px solid rgb(244 238 226 / 20%);
  box-shadow: 0 18px 40px rgb(0 0 0 / 35%);
  transition:
    transform 0.45s var(--ease-out),
    opacity 0.45s var(--ease-out),
    border-color 0.45s var(--ease-out);
}

.helix-card__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.helix-card.is-active .helix-card__frame {
  border-color: rgb(201 161 92 / 85%);
  box-shadow: 0 24px 60px rgb(0 0 0 / 45%);
}

.helix-card:not(.is-active) .helix-card__frame {
  opacity: 0.42;
  filter: brightness(0.62);
}

.spotlight {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 30;
  display: block;
  width: min(400px, 38vw);
  aspect-ratio: 1200 / 630;
  transform: translate(-50%, -50%);
  will-change: transform, opacity;
}

.spotlight__link {
  display: block;
  width: 100%;
  height: 100%;
  text-decoration: none;
}

.spotlight__frame {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #211d17;
  border: 1px solid rgb(244 238 226 / 28%);
  box-shadow:
    0 40px 90px rgb(0 0 0 / 55%),
    0 0 0 1px rgb(201 161 92 / 30%);
}

.spotlight__image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.spotlight__tag {
  position: absolute;
  bottom: 0.9rem;
  left: 1rem;
  padding: 0.28rem 0.6rem;
  font-size: 0.58rem;
  letter-spacing: 0.2em;
  color: var(--paper);
  background: rgb(18 16 13 / 72%);
  border: 1px solid rgb(244 238 226 / 22%);
  backdrop-filter: blur(4px);
}

.spot-enter-active,
.spot-leave-active {
  transition:
    opacity 0.4s ease,
    transform 0.6s var(--ease-out);
}

.spot-enter-from {
  opacity: 0;
  transform: scale(1.035);
}

.spot-leave-to {
  opacity: 0;
  transform: scale(0.985);
}

.stage__hud {
  position: absolute;
  bottom: clamp(2rem, 5vh, 3.6rem);
  left: clamp(1.4rem, 4vw, 3.5rem);
  z-index: 30;
  transition: opacity 0.4s ease;
}

.stage__hud.is-dimmed {
  opacity: 0;
}

.stage__count {
  font-family: var(--font-num, var(--font-sans));
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

.matrix {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: clamp(0.9rem, 2vh, 1.5rem);
  align-items: center;
  justify-content: center;
  padding: clamp(2rem, 5vh, 3.4rem) 2rem;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.9);
  transform-origin: 50% 50%;
  will-change: transform, opacity;
}

.matrix__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.4rem;
  align-items: baseline;
  justify-content: space-between;
  width: min(1260px, 92vw);
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
  grid-template-columns: repeat(9, minmax(0, 1fr));
  grid-template-rows: repeat(9, minmax(0, 1fr));
  grid-auto-flow: dense;
  gap: 6px;
  width: min(1260px, 92vw);
  height: min(72vh, 640px);
}

.matrix__cell {
  position: relative;
  display: block;
  overflow: hidden;
  min-height: 0;
  background: #1d1914;
  border: 1px solid rgb(244 238 226 / 8%);
  opacity: 0.62;
  transition:
    opacity 0.6s ease,
    border-color 0.6s ease,
    box-shadow 0.6s ease;
}

.matrix__cell img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.matrix__cell:hover {
  opacity: 0.9;
  border-color: rgb(244 238 226 / 28%);
}

.matrix__cell--filler {
  display: grid;
  place-items: center;
  opacity: 0.32;
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

.matrix__cell.is-featured {
  z-index: 2;
  grid-column: 4 / span 2;
  grid-row: 4 / span 2;
  opacity: 1;
  border-color: rgb(201 161 92 / 90%);
  box-shadow:
    0 0 0 1px rgb(201 161 92 / 45%),
    0 24px 70px rgb(0 0 0 / 55%);
}

.matrix.is-shown .matrix__cell.is-featured {
  animation: featured-in 0.9s var(--ease-out) both;
}

@keyframes featured-in {
  from {
    transform: scale(1.35);
    opacity: 0.5;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
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

/* 窄屏与减弱动效：不做 pin/3D，直接摊开全部七十张 */
.gallery__stage.is-static {
  height: auto;
  min-height: 0;
}

.is-static .stage__inner {
  display: block;
  padding: clamp(2.2rem, 6vw, 4rem) 0;
  perspective: none;
}

.is-static .stage__spiral {
  display: none;
}

.is-static .spotlight {
  display: none;
}

.is-static .matrix {
  position: static;
  pointer-events: auto;
  opacity: 1;
  transform: none;
}

.is-static .matrix__head {
  width: min(1260px, calc(100% - 2rem));
  padding: 0 1rem;
  margin: 0 auto clamp(1rem, 2vh, 1.5rem);
}

.is-static .matrix__grid {
  width: calc(100% - 2rem);
  height: auto;
  margin: 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: none;
  gap: 4px;
}

.is-static .matrix__cell {
  aspect-ratio: 1200 / 630;
  opacity: 0.85;
}

.is-static .matrix__cell.is-featured {
  grid-column: 2 / span 2;
  grid-row: 8 / span 2;
}

.is-static .matrix__cell--filler {
  opacity: 0.5;
}

@media (width <= 900px) {
  .gallery__intro {
    padding-top: 2.6rem;
  }

  .gallery__title {
    font-size: clamp(2.4rem, 11vw, 3.6rem);
  }

  .matrix__cell.is-featured {
    grid-column: 2 / span 2;
    grid-row: 8 / span 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spot-enter-active,
  .spot-leave-active {
    transition: none;
  }

  .matrix.is-shown .matrix__cell.is-featured {
    animation: none;
  }
}
</style>
