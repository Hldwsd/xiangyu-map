<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppIcon from '@/components/icons/AppIcon.vue'
import FilterPopover from '@/components/layout/FilterPopover.vue'
import MenuDrawer from '@/components/layout/MenuDrawer.vue'
import SiteListSheet from '@/components/layout/SiteListSheet.vue'
import TopBar from '@/components/layout/TopBar.vue'
import AnhuiMap from '@/components/map/AnhuiMap.vue'
import SitePanel from '@/components/site/SitePanel.vue'
import { ALL_CITIES, ALL_CATEGORIES, useSitesStore } from '@/stores/sites'

const store = useSitesStore()
const { filteredSites, selectedSite, selectedId, categoryCounts, cityCounts, hasActiveFilter } =
  storeToRefs(store)

const total = computed(() => store.sites.length)
const activeFilters = computed(
  () => (store.category === ALL_CATEGORIES ? 0 : 1) + (store.city === ALL_CITIES ? 0 : 1),
)

const menuOpen = ref(false)
const filterOpen = ref(false)
const listOpen = ref(false)

function closeOverlays(): void {
  menuOpen.value = false
  filterOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeOverlays()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// 打开菜单时收起筛选，避免两个浮层叠在一起
watch(menuOpen, (open) => {
  if (open) filterOpen.value = false
})

watch(filterOpen, (open) => {
  if (open) menuOpen.value = false
})

function selectFromList(id: string): void {
  store.selectSite(id)
  listOpen.value = false
}
</script>

<template>
  <div class="map-shell">
    <!-- 打开即全屏地图：地图铺满视口，其余内容都是浮在上面的 -->
    <div class="map-shell__map">
      <AnhuiMap :sites="filteredSites" :selected-id="selectedId" @select="store.selectSite" />
    </div>

    <TopBar
      :query="store.query"
      :active-filters="activeFilters"
      :filter-open="filterOpen"
      @update:query="store.setQuery"
      @menu="menuOpen = true"
      @filter="filterOpen = !filterOpen"
    />

    <!-- 筛选浮层挂在筛选按钮下方，右侧对齐 -->
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

    <!-- 筛到 0 条时地图是空的，需要一句话解释并给出口 -->
    <div v-if="filteredSites.length === 0" class="map-shell__void">
      <span class="map-shell__void-icon"><AppIcon name="search" :size="18" /></span>
      <p>没有匹配的项目</p>
      <button type="button" class="map-shell__void-reset" @click="store.resetFilters()">
        清空筛选
      </button>
    </div>

    <!-- 左下：这张图画的是什么 -->
    <div class="map-shell__meta">
      <span class="map-shell__scope">
        <AppIcon name="map" :size="13" />
        安徽省 · 16 个地级市
      </span>
    </div>

    <!-- 右下：动作区（列表 + 清空筛选）。空结果时由中间提示卡提供「清空筛选」 -->
    <div class="map-shell__actions">
      <button
        v-if="hasActiveFilter && filteredSites.length > 0"
        type="button"
        class="map-shell__reset"
        @click="store.resetFilters()"
      >
        <AppIcon name="reset" :size="13" />清空筛选
      </button>
      <button type="button" class="map-shell__list-toggle" @click="listOpen = true">
        <AppIcon name="all" :size="13" />
        列表
        <span class="map-shell__count">{{ filteredSites.length }}</span>
      </button>
    </div>

    <!-- 选中项目：桌面为右下角浮卡，窄屏为底部抽屉 -->
    <SitePanel
      v-if="selectedSite"
      class="map-shell__panel"
      :site="selectedSite"
      @close="store.selectSite(null)"
    />

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
  background: var(--surface-muted);
}

.map-shell__map {
  position: absolute;
  inset: 0;
}

.map-shell__filter {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 4.4rem);
  right: var(--space-3);
  left: var(--space-3);
  z-index: 25;
  max-width: 26rem;
  margin-left: auto;
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
  background: #fff;
  border-color: var(--line-strong);
}

.map-shell__count {
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

/* 右下动作区：列表按钮常驻，清空筛选在筛选生效时出现在它左边 */
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

/* 空结果提示：居中、不挡顶部栏与底部条 */
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

/* 选中卡片：桌面右下、窄屏贴底 */
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

/* 筛选浮层进出：轻微上浮 + 淡入，键盘/读屏不受影响 */
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

@media (width <= 900px) {
  .map-shell__filter,
  .map-shell__sheet {
    right: var(--space-2);
    left: var(--space-2);
  }

  .map-shell__panel {
    right: var(--space-2);
    left: var(--space-2);
    bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-2) + 2.6rem);
    width: auto;
    max-height: 62vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pop-enter-active,
  .pop-leave-active {
    transition: none;
  }
}
</style>
