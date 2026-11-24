<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryLegend from '@/components/home/CategoryLegend.vue'
import CityIndex from '@/components/home/CityIndex.vue'
import HomeRail from '@/components/home/HomeRail.vue'
import EdgeDrawer from '@/components/layout/EdgeDrawer.vue'
import MenuDrawer from '@/components/layout/MenuDrawer.vue'
import SiteListSheet from '@/components/layout/SiteListSheet.vue'
import TopBar from '@/components/layout/TopBar.vue'
import AnhuiMap from '@/components/map/AnhuiMap.vue'
import SitePanel from '@/components/site/SitePanel.vue'
import { useSitesStore } from '@/stores/sites'
import type { AnhuiCity } from '@/types/site'
import { shouldMergeMarkers } from '@/utils/map-defaults'
import { loadGsap, prefersReducedMotion } from '@/utils/motion'

const store = useSitesStore()
const { filteredSites, selectedSite, selectedId } = storeToRefs(store)

const total = computed(() => store.sites.length)
const menuOpen = ref(false)
const listOpen = ref(false)
/** 窄屏侧边抽屉：左「分类」、右「城市索引」 */
const legendOpen = ref(false)
const cityOpen = ref(false)
/** 城市索引 hover 时高亮的地级市；离开/失焦清空 */
const hoverCity = ref<AnhuiCity | null>(null)
/** 鼠标划过地标时，反向高亮城市索引里的对应行 */
const siteCity = ref<string | null>(null)
const mapShell = ref<HTMLElement | null>(null)

/*
 * 区县界默认开启：官方标准图（皖S(2025)71号）只画 16 个地级市，没有县区界；
 * 区县层只作为找项目时的定位细节，菜单里可以关掉，选择记在本地。
 */
const showDistricts = ref(localStorage.getItem('xy-show-districts') !== '0')
/** 没有用户偏好时，窄屏默认合并重叠地标；桌面默认不合并 */
const mergeMarkers = ref(
  shouldMergeMarkers(localStorage.getItem('xy-merge-markers'), window.innerWidth),
)
watch(showDistricts, (value) => localStorage.setItem('xy-show-districts', value ? '1' : '0'))
watch(mergeMarkers, (value) => localStorage.setItem('xy-merge-markers', value ? '1' : '0'))

/** 桌面首屏给一个「已经选中」的样子；窄屏不自动弹卡，避免挡地图 */

/** 切换城市筛选时地图淡入一下，提示「内容换了」 */
function animateMapSwap(): void {
  const map = mapShell.value
  if (map === null || prefersReducedMotion()) return
  void loadGsap()
    .then((gsap) => {
      gsap.fromTo(
        map,
        { opacity: 0.3, scale: 0.995 },
        { opacity: 1, scale: 1, duration: 0.34, ease: 'power2.out', clearProps: 'transform' },
      )
    })
    .catch(() => {})
}

watch(
  () => store.city,
  () => {
    animateMapSwap()
  },
)

function closeOverlays(): void {
  menuOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeOverlays()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/** 精选是「跳到一个具体项目」，先把筛选清掉，避免点进去却不在当前结果里 */
function selectFeatured(id: string): void {
  store.resetFilters()
  store.selectSite(id)
}

function selectFromList(id: string): void {
  store.selectSite(id)
  listOpen.value = false
}

/** 选中卡片：淡入 + 轻微上浮；封面从 1.05 收回来 */
function panelEnter(el: Element, done: () => void): void {
  if (prefersReducedMotion()) {
    done()
    return
  }
  void loadGsap()
    .then((gsap) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 26, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.38,
          ease: 'power3.out',
          clearProps: 'transform',
          onComplete: done,
        },
      )
      const cover = (el as HTMLElement).querySelector('.panel__cover')
      if (cover !== null) {
        gsap.fromTo(
          cover,
          { scale: 1.05 },
          { scale: 1, duration: 0.55, ease: 'power2.out', clearProps: 'transform' },
        )
      }
    })
    .catch(() => done())
}

function panelLeave(el: Element, done: () => void): void {
  if (prefersReducedMotion()) {
    done()
    return
  }
  void loadGsap()
    .then((gsap) => {
      gsap.to(el, {
        opacity: 0,
        y: 18,
        scale: 0.985,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: done,
      })
    })
    .catch(() => done())
}

/** 列表抽屉：从下往上滑入 */
function sheetEnter(el: Element, done: () => void): void {
  if (prefersReducedMotion()) {
    done()
    return
  }
  void loadGsap()
    .then((gsap) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: 'power3.out',
          clearProps: 'transform',
          onComplete: done,
        },
      )
    })
    .catch(() => done())
}

function fadeEnter(el: Element, done: () => void): void {
  if (prefersReducedMotion()) {
    done()
    return
  }
  void loadGsap()
    .then((gsap) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.24,
          ease: 'power2.out',
          clearProps: 'transform',
          onComplete: done,
        },
      )
    })
    .catch(() => done())
}

function fadeLeave(el: Element, done: () => void): void {
  if (prefersReducedMotion()) {
    done()
    return
  }
  void loadGsap()
    .then((gsap) => {
      gsap.to(el, { opacity: 0, y: 6, duration: 0.16, ease: 'power2.in', onComplete: done })
    })
    .catch(() => done())
}

function sheetLeave(el: Element, done: () => void): void {
  if (prefersReducedMotion()) {
    done()
    return
  }
  void loadGsap()
    .then((gsap) => {
      gsap.to(el, { opacity: 0, y: 18, duration: 0.18, ease: 'power2.in', onComplete: done })
    })
    .catch(() => done())
}

/** 抽屉/列表打开后，内部条目按顺序轻微上浮进入（GSAP stagger）。 */
function staggerIn(selector: string, max = 24): void {
  if (prefersReducedMotion()) return
  void loadGsap()
    .then((gsap) => {
      const nodes = [...document.querySelectorAll<HTMLElement>(selector)].slice(0, max)
      if (nodes.length === 0) return
      gsap.fromTo(
        nodes,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.035,
          ease: 'power2.out',
          clearProps: 'opacity,transform',
        },
      )
    })
    .catch(() => {})
}

watch(menuOpen, async (open) => {
  if (!open) return
  await nextTick()
  staggerIn('.drawer__item', 12)
})

watch([legendOpen, cityOpen], async ([legend, city]) => {
  if (!legend && !city) return
  await nextTick()
  staggerIn('.edge__body button', 30)
})

watch(listOpen, async (open) => {
  if (!open) return
  await nextTick()
  staggerIn('.sheet__item', 24)
})
</script>

<template>
  <div class="map-shell">
    <!--
      顶栏放在 DOM 最前：视觉上仍是浮在地图顶部，但 Tab 的第一站是菜单/搜索/列表，
      而不是地图的缩放条和分类图例。绝对定位不受文档顺序影响。
    -->
    <div class="home-topbar">
      <TopBar
        :query="store.query"
        :list-count="filteredSites.length"
        :list-open="listOpen"
        @update:query="store.setQuery"
        @menu="menuOpen = true"
        @list="listOpen = !listOpen"
      />
    </div>

    <div ref="mapShell" class="map-shell__map">
      <AnhuiMap
        :sites="filteredSites"
        :selected-id="selectedId"
        :show-districts="showDistricts"
        :cluster="mergeMarkers"
        :highlight-city="hoverCity"
        @marker-hover="siteCity = $event"
        @select="store.selectSite"
      />
    </div>

    <!-- 筛选到 0 条时给一个明确出路：地图本身不会解释「为什么空了」 -->
    <Transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
      <div v-if="filteredSites.length === 0" class="map-shell__void" role="status">
        <span class="map-shell__void-icon" aria-hidden="true">
          <AppIcon name="search" :size="16" />
        </span>
        <p>没有匹配的项目</p>
        <button type="button" class="map-shell__void-reset" @click="store.resetFilters()">
          清空筛选
        </button>
      </div>
    </Transition>

    <HomeRail @menu="menuOpen = true" @select="selectFeatured" />

    <!-- 桌面右侧：选中卡片 + 城市索引（两张独立的卡） -->
    <div class="home-side" data-parallax>
      <Transition :css="false" mode="out-in" @enter="panelEnter" @leave="panelLeave">
        <SitePanel
          v-if="selectedSite"
          :key="selectedSite.id"
          :site="selectedSite"
          @close="store.selectSite(null)"
        />
      </Transition>
      <CityIndex :active-city="siteCity" @hover="hoverCity = $event" />
    </div>

    <!-- 窄屏：右侧浮卡（宽屏由 .home-side 里的卡片接管） -->
    <Transition :css="false" mode="out-in" @enter="panelEnter" @leave="panelLeave">
      <SitePanel
        v-if="selectedSite"
        :key="selectedSite.id"
        data-parallax
        class="map-shell__panel"
        :site="selectedSite"
        @close="store.selectSite(null)"
      />
    </Transition>

    <div class="map-shell__meta">
      <span class="map-shell__scope">
        <AppIcon name="map" :size="13" />
        安徽省 · 16 个地级市
      </span>
    </div>

    <div class="map-shell__actions">
      <button
        v-if="store.hasActiveFilter && filteredSites.length > 0"
        type="button"
        class="map-shell__reset"
        @click="store.resetFilters()"
      >
        <AppIcon name="reset" :size="13" />清空筛选
      </button>
    </div>

    <Transition :css="false" @enter="sheetEnter" @leave="sheetLeave">
      <SiteListSheet
        data-parallax
        v-if="listOpen"
        class="map-shell__sheet"
        :sites="filteredSites"
        :selected-id="selectedId"
        @select="selectFromList"
        @close="listOpen = false"
      />
    </Transition>

    <!-- 窄屏：左右两侧抽拉「分类」「城市索引」 -->
    <div class="edge-tabs">
      <button type="button" class="edge-tab edge-tab--left" @click="legendOpen = true">
        <AppIcon name="all" :size="14" />分类
      </button>
      <button type="button" class="edge-tab edge-tab--right" @click="cityOpen = true">
        城市<AppIcon name="map" :size="14" />
      </button>
    </div>

    <EdgeDrawer :open="legendOpen" side="left" title="分类筛选" @close="legendOpen = false">
      <CategoryLegend />
    </EdgeDrawer>

    <EdgeDrawer :open="cityOpen" side="right" title="城市索引" @close="cityOpen = false">
      <CityIndex />
    </EdgeDrawer>

    <MenuDrawer
      :open="menuOpen"
      :site-count="total"
      :show-districts="showDistricts"
      @update:show-districts="showDistricts = $event"
      :merge-markers="mergeMarkers"
      @update:merge-markers="mergeMarkers = $event"
      @close="menuOpen = false"
      @open-list="
        () => {
          menuOpen = false
          listOpen = true
        }
      "
    />
  </div>
</template>

<style scoped>
.map-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  color: var(--ink);
  /* 透明：让 body 上的书法背景透上来，地图与画框之外才能看到字 */
  background: transparent;
}

/*
 * 地图内缩一圈：四周露出背景（宣纸 + 书法），再用一圈渐隐描边把地图与背景分开。
 */
.map-shell__map {
  position: absolute;
  inset: 0;
}

/* ---- 桌面：右上动作 / 右侧栏 / 底部状态 ---- */

/*
 * 右侧栏：选中卡与城市索引是两张独立的卡（各自有底色/描边/间距），
 * 不是一张长卡片被切开；同时隐藏滚动条 —— 超高时仍可滚，但不出现那条灰杠。
 */
.home-side {
  position: absolute;
  top: 5.4rem;
  right: 4rem;
  bottom: 2rem;
  z-index: 14;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 20rem;
  overflow-y: auto;
  scrollbar-width: none;
}

.home-side::-webkit-scrollbar {
  display: none;
}

.home-side :deep(.city-index) {
  flex: none;
  /* 城市索引钉在右下角：上面留自动外边距，面板变矮也不会把它顶上来 */
  margin-top: auto;
  padding: 0.6rem 0.75rem 0.7rem;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-panel);
}

.home-side :deep(.panel) {
  flex: none;
  width: 100%;
  box-shadow: var(--shadow-panel);
}

/* 桌面卡片压缩一点，给下面的城市索引留出首屏空间 */
.home-side :deep(.panel__cover) {
  aspect-ratio: 16 / 6.6;
}

.home-side :deep(.panel__body) {
  gap: 0.4rem;
  padding: 0.85rem;
}

.home-side :deep(.panel__summary) {
  line-height: 1.6;
}

.home-side :deep(.panel__facts) {
  padding-top: 0.5rem;
  font-size: 0.66rem;
}

.home-side :deep(.panel__link) {
  padding: 0.5rem 0.9rem;
  margin-top: 0.6rem;
}

.home-about {
  padding-top: 10px;
  margin-top: auto;
  font-size: 8px;
  line-height: 1.9;
  color: var(--ink-soft);
  letter-spacing: 0.03em;
  border-top: 1px solid var(--line);
}

.home-about b {
  display: block;
  margin-bottom: 3px;
  font-family: var(--font-serif);
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.16em;
}

.home-status {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 0.9rem);
  left: 50%;
  z-index: 15;
  display: flex;
  gap: 1.4rem;
  justify-content: center;
  padding: 0.34rem 0.95rem;
  font-size: 0.58rem;
  color: var(--ink-soft);
  letter-spacing: 0.12em;
  /* 提示条也是纸片：不让半透明文字直接压在地图上 */
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-card);
  transform: translateX(-50%);
}

/* ---- 顶部浮层（窄屏） ---- */

.home-topbar {
  position: absolute;
  inset: 0 0 auto;
  z-index: 20;
}

/* ---- 筛选浮层 ---- */

.map-shell__meta {
  position: absolute;
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-3));
  left: var(--space-3);
  z-index: 15;
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
}

.map-shell__scope,
.map-shell__list-toggle {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  height: 2rem;
  padding: 0 var(--space-3);
  font: inherit;
  font-size: var(--text-2xs);
  letter-spacing: 0.03em;
  color: var(--ink-soft);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-soft);
}

.map-shell__list-toggle {
  color: var(--ink);
  cursor: pointer;
}

.map-shell__list-toggle:hover {
  background: var(--surface);
  border-color: var(--line-strong);
}

.map-shell__count {
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

.map-shell__actions {
  position: absolute;
  right: var(--space-3);
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-3));
  z-index: 15;
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.map-shell__reset {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  height: 2rem;
  padding: 0 var(--space-3);
  font: inherit;
  font-size: var(--text-2xs);
  color: var(--accent-ink);
  cursor: pointer;
  background: var(--accent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-card);
}

.map-shell__void {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 14;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-4) var(--space-5);
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  transform: translate(-50%, -50%);
}

.map-shell__void-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  color: var(--ink-soft);
  background: var(--surface-muted);
  border-radius: 50%;
}

.map-shell__void p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ink);
}

.map-shell__void-reset {
  padding: 0.25rem 0.8rem;
  font: inherit;
  font-size: var(--text-2xs);
  color: var(--accent-ink);
  cursor: pointer;
  background: var(--accent);
  border: 0;
  border-radius: var(--radius-pill);
}

.map-shell__panel {
  position: absolute;
  right: var(--space-3);
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-3) + 3rem);
  z-index: 16;
  width: min(22rem, calc(100vw - 2 * var(--space-3)));
  max-height: min(70vh, 34rem);
  overflow-y: auto;
}

.map-shell__sheet {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 4.4rem);
  right: var(--space-3);
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-3) + 2.6rem);
  left: var(--space-3);
  z-index: 22;
  max-width: 26rem;
  margin-left: auto;
}

/* ---- 桌面 / 窄屏切换 ---- */

@media (min-width: 1200px) {
  /* 顶栏（菜单 / 搜索 / 筛选）在宽屏也保留；只藏窄屏专用的底部动作区与浮卡 */
  .map-shell__meta,
  .map-shell__actions,
  .map-shell__panel {
    display: none;
  }

  /* 地图自带的缩放条挪到右侧栏左边，避免被卡片压住 */
  /* 缩放条钉在最右侧：右侧栏整体左移，给它让出位置 */
  .map-shell__map :deep(.anhui-map__zoom) {
    right: 16px;
  }

  /* 版头底部已经有「安徽省 · 16 个地级市」，底栏只留交互提示，并靠右 */
  .home-status__scope {
    display: none;
  }

  /* 矮屏：城市索引排四列、封面压扁、底边收紧，避免挤到需要滚动 */
  @media (max-height: 760px) {
    .home-side {
      bottom: 1.2rem;
    }

    .home-side :deep(.city-index__grid) {
      grid-template-columns: repeat(4, 1fr);
    }

    .home-side :deep(.panel__cover) {
      aspect-ratio: 16 / 5.4;
    }
  }

  .home-status {
    justify-content: flex-end;
  }

  /* 版头图例已承担分类筛选，桌面把右上「筛选」降为细线按钮，减少两个入口的视觉重量 */
  .home-actions .home-action:nth-child(2) {
    color: var(--ink-soft);
    background: transparent;
    border-color: transparent;
  }

  .home-actions .home-action:nth-child(2):hover {
    color: var(--ink);
    border-color: var(--line);
  }
}

/* ---- 窄屏侧边抽拉 ---- */

.edge-tabs {
  display: none;
}

.edge-tab {
  position: absolute;
  /* 避开地图右侧的缩放条（竖排、居中） */
  top: 32%;
  z-index: 16;
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0.55rem 0.4rem;
  font: inherit;
  font-size: 0.62rem;
  color: var(--ink);
  letter-spacing: 0.08em;
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-card);
  writing-mode: vertical-rl;
  transform: translateY(-50%);
}

.edge-tab--left {
  left: 0;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.edge-tab--right {
  right: 0;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.edge-tab:hover {
  background: var(--surface-muted);
}

@media (width <= 1199px) {
  .home-actions,
  .home-side,
  .home-status {
    display: none;
  }

  .edge-tabs {
    display: block;
  }
}

/* 筛选浮层进出：轻微上浮 + 淡入 */

@media (prefers-reduced-motion: reduce) {
}
</style>
