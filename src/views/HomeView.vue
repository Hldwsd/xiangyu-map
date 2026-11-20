<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppIcon from '@/components/icons/AppIcon.vue'
import CityIndex from '@/components/home/CityIndex.vue'
import HomeRail from '@/components/home/HomeRail.vue'
import FilterPopover from '@/components/layout/FilterPopover.vue'
import MenuDrawer from '@/components/layout/MenuDrawer.vue'
import SiteListSheet from '@/components/layout/SiteListSheet.vue'
import TopBar from '@/components/layout/TopBar.vue'
import AnhuiMap from '@/components/map/AnhuiMap.vue'
import SitePanel from '@/components/site/SitePanel.vue'
import { ALL_CITIES, ALL_CATEGORIES, useSitesStore } from '@/stores/sites'

const store = useSitesStore()
const { filteredSites, selectedSite, selectedId, categoryCounts, cityCounts } = storeToRefs(store)

const total = computed(() => store.sites.length)
const activeFilters = computed(
  () => (store.category === ALL_CATEGORIES ? 0 : 1) + (store.city === ALL_CITIES ? 0 : 1),
)

const menuOpen = ref(false)
const filterOpen = ref(false)
const listOpen = ref(false)

/** 桌面首屏给一个「已经选中」的样子；窄屏不自动弹卡，避免挡地图 */
onMounted(() => {
  if (window.matchMedia('(min-width: 1200px)').matches && store.selectedId === null) {
    store.selectSite('huizhou-ancient-city')
  }
})

function closeOverlays(): void {
  menuOpen.value = false
  filterOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeOverlays()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

watch(menuOpen, (open) => {
  if (open) filterOpen.value = false
})

watch(filterOpen, (open) => {
  if (open) menuOpen.value = false
})

/** 精选是「跳到一个具体项目」，先把筛选清掉，避免点进去却不在当前结果里 */
function selectFeatured(id: string): void {
  store.resetFilters()
  store.selectSite(id)
}

function selectFromList(id: string): void {
  store.selectSite(id)
  listOpen.value = false
}
</script>

<template>
  <div class="map-shell">
    <div class="map-shell__map">
      <AnhuiMap :sites="filteredSites" :selected-id="selectedId" @select="store.selectSite" />
    </div>

    <HomeRail @menu="menuOpen = true" @select="selectFeatured" />

    <div class="home-actions">
      <button
        type="button"
        class="home-action"
        :aria-expanded="listOpen"
        @click="listOpen = !listOpen"
      >
        <AppIcon name="all" :size="13" />列表
        <span class="home-action__n">{{ filteredSites.length }}</span>
      </button>
      <button
        type="button"
        class="home-action"
        :class="{ 'home-action--on': filterOpen }"
        :aria-expanded="filterOpen"
        @click="filterOpen = !filterOpen"
      >
        <AppIcon name="filter" :size="13" />筛选
      </button>
    </div>

    <!-- 窄屏/平板沿用顶部搜索栏；桌面版头已接管搜索与筛选 -->
    <div class="home-topbar">
      <TopBar
        :query="store.query"
        :active-filters="activeFilters"
        :filter-open="filterOpen"
        @update:query="store.setQuery"
        @menu="menuOpen = true"
        @filter="filterOpen = !filterOpen"
      />
    </div>

    <Transition name="pop">
      <div v-if="filterOpen" class="map-shell__filter">
        <FilterPopover
          :category="store.category"
          :city="store.city"
          :counts="categoryCounts"
          :city-counts="cityCounts"
          :total="total"
          :matched="filteredSites.length"
          @update:category="store.setCategory"
          @update:city="store.setCity"
          @reset="store.resetFilters()"
        />
      </div>
    </Transition>

    <div v-if="filteredSites.length === 0" class="map-shell__void">
      <span class="map-shell__void-icon"><AppIcon name="search" :size="18" /></span>
      <p>没有匹配的项目</p>
      <button type="button" class="map-shell__void-reset" @click="store.resetFilters()">
        清空筛选
      </button>
    </div>

    <!-- 桌面右侧：选中卡片 / 城市索引（两张独立的卡） -->
    <div class="home-side">
      <SitePanel v-if="selectedSite" :site="selectedSite" @close="store.selectSite(null)" />
      <CityIndex />
    </div>

    <!-- 窄屏：底部/右侧浮卡与原来的动作区 -->
    <SitePanel
      v-if="selectedSite"
      class="map-shell__panel"
      :site="selectedSite"
      @close="store.selectSite(null)"
    />

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
      <button
        type="button"
        class="map-shell__list-toggle"
        :aria-expanded="listOpen"
        @click="listOpen = !listOpen"
      >
        <AppIcon name="all" :size="13" />列表
        <span class="map-shell__count">{{ filteredSites.length }}</span>
      </button>
    </div>

    <div class="home-status">
      <span class="home-status__scope">安徽省 · 16 个地级市 · {{ total }} 处项目</span>
      <span>拖动探索 · 滚轮缩放</span>
    </div>

    <SiteListSheet
      v-if="listOpen"
      class="map-shell__sheet"
      :sites="filteredSites"
      :selected-id="selectedId"
      @select="selectFromList"
      @close="listOpen = false"
    />

    <MenuDrawer
      :open="menuOpen"
      :site-count="total"
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
  background: var(--paper);
}

.map-shell__map {
  position: absolute;
  inset: 0;
}

/* ---- 桌面：右上动作 / 右侧栏 / 底部状态 ---- */

.home-actions {
  position: absolute;
  top: 40px;
  right: 28px;
  z-index: 15;
  display: flex;
  gap: 8px;
}

.home-action {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  font: inherit;
  font-size: 8.5px;
  color: var(--ink);
  letter-spacing: 0.1em;
  cursor: pointer;
  background: rgb(var(--surface-rgb) / 86%);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-xs);
}

.home-action:hover,
.home-action--on {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.home-action__n {
  font-family: var(--font-display);
  font-size: 8px;
  opacity: 0.7;
}

/*
 * 右侧栏：选中卡与城市索引是两张独立的卡（各自有底色/描边/间距），
 * 不是一张长卡片被切开；同时隐藏滚动条 —— 超高时仍可滚，但不出现那条灰杠。
 */
.home-side {
  position: absolute;
  top: 100px;
  right: 32px;
  bottom: 56px;
  z-index: 14;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 320px;
  overflow-y: auto;
  scrollbar-width: none;
}

.home-side::-webkit-scrollbar {
  display: none;
}

.home-side :deep(.city-index) {
  flex: none;
  padding: 12px 14px 14px;
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
  gap: 6px;
  padding: 12px;
}

.home-side :deep(.panel__summary) {
  line-height: 1.6;
}

.home-side :deep(.panel__facts) {
  padding-top: 8px;
  font-size: 10.5px;
}

.home-side :deep(.panel__link) {
  padding: 8px 14px;
  margin-top: 10px;
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
  right: 28px;
  bottom: 18px;
  left: 300px;
  z-index: 15;
  display: flex;
  justify-content: space-between;
  padding-top: 8px;
  font-size: 9.5px;
  color: var(--ink-soft);
  letter-spacing: 0.14em;
  border-top: 1px solid var(--line);
}

/* ---- 顶部浮层（窄屏） ---- */

.home-topbar {
  position: absolute;
  inset: 0 0 auto;
  z-index: 20;
}

/* ---- 筛选浮层 ---- */

.map-shell__filter {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 4.4rem);
  right: 340px;
  z-index: 25;
  width: min(22rem, calc(100vw - 2 * var(--space-3)));
}

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
  background: rgb(var(--surface-rgb) / 92%);
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
  background: rgb(var(--surface-rgb) / 92%);
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
  .home-topbar,
  .map-shell__meta,
  .map-shell__actions,
  .map-shell__panel {
    display: none;
  }

  /* 地图自带的缩放条挪到右侧栏左边，避免被卡片压住 */
  /* 缩条放在右侧栏左边留出的空隙里：32（外边距）+ 320（栏宽）+ 16（间距） */
  .map-shell__map :deep(.anhui-map__zoom) {
    right: 372px;
  }

  /* 版头底部已经有「安徽省 · 16 个地级市」，底栏只留交互提示，并靠右 */
  .home-status__scope {
    display: none;
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

@media (width <= 1199px) {
  .home-actions,
  .home-side,
  .home-status {
    display: none;
  }

  .map-shell__filter {
    right: var(--space-2);
    left: var(--space-2);
    width: auto;
    max-width: none;
  }
}

/* 筛选浮层进出：轻微上浮 + 淡入 */
.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .pop-enter-active,
  .pop-leave-active {
    transition: none;
  }
}
</style>
