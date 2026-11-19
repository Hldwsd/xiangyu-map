<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import AnhuiMap from '@/components/map/AnhuiMap.vue'
import CategoryFilter from '@/components/site/CategoryFilter.vue'
import CityFilter from '@/components/site/CityFilter.vue'
import SitePanel from '@/components/site/SitePanel.vue'
import { useSitesStore } from '@/stores/sites'

const store = useSitesStore()
const { filteredSites, selectedSite, selectedId, categoryCounts, cityCounts, hasActiveFilter } =
  storeToRefs(store)

const total = computed(() => store.sites.length)
const empty = computed(() => filteredSites.value.length === 0)
</script>

<template>
  <div class="home">
    <section class="home__map-area">
      <!-- 筛选条占一行、不叠在地图上：叠放时它会盖住地图北侧（宿州/亳州一带）的地标，
           那些地标就在视觉上「看得见、点不着」，命中率也就不再等于 100%。 -->
      <div class="home__filters">
        <CategoryFilter
          :category="store.category"
          :query="store.query"
          :counts="categoryCounts"
          :total="total"
          @update:category="store.setCategory"
          @update:query="store.setQuery"
        >
          <!-- 城市选择放进搜索那一行的右侧：筛选卡从三行压到两行 -->
          <template #aside>
            <CityFilter :city="store.city" :counts="cityCounts" @update:city="store.setCity" />
          </template>
        </CategoryFilter>
      </div>

      <div class="home__stage">
        <AnhuiMap :sites="filteredSites" :selected-id="selectedId" @select="store.selectSite" />
      </div>

      <!-- 地图页脚：左侧说明这张图画的是什么，右侧是数量与清空动作。
           原来这段文字浮在地图右下角，既挡住地标，也说不清它是页脚还是浮层。 -->
      <div class="home__map-meta">
        <span class="home__scope">
          <AppIcon name="map" :size="13" />
          安徽省 · 16 个地级市
        </span>
        <p class="home__counter">
          地图上 {{ filteredSites.length }} / {{ total }} 个项目
          <button
            v-if="hasActiveFilter"
            type="button"
            class="home__reset"
            @click="store.resetFilters()"
          >
            <AppIcon name="reset" :size="13" />清空筛选
          </button>
        </p>
      </div>
    </section>

    <aside class="home__aside">
      <SitePanel v-if="selectedSite" :site="selectedSite" @close="store.selectSite(null)" />

      <div v-else-if="empty" class="home__empty">
        <span class="home__empty-icon"><AppIcon name="search" :size="20" /></span>
        <p class="home__empty-title">没有匹配的项目</p>
        <p class="home__empty-text">换一个关键词，或者清空筛选条件再试。</p>
        <button type="button" class="home__reset home__reset--solid" @click="store.resetFilters()">
          <AppIcon name="reset" :size="13" />清空筛选
        </button>
      </div>

      <div v-else class="home__list">
        <p class="home__list-title">
          <AppIcon name="filter" :size="12" />
          当前 {{ filteredSites.length }} 个项目
        </p>
        <ul>
          <li v-for="site in filteredSites" :key="site.id">
            <button type="button" class="home__item" @click="store.selectSite(site.id)">
              <span class="home__item-icon">
                <CategoryIcon :category="site.category" :size="14" />
              </span>
              <span class="home__item-name">{{ site.name }}</span>
              <span class="home__item-meta">{{ site.category }} · {{ site.city }}</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.home {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--space-4);
  width: 100%;
  max-width: 1440px;
  height: calc(100vh - 8.5rem);
  min-height: 520px;
  margin: 0 auto;
  padding: 0 var(--space-5) var(--space-5);
}

/* ---- 地图区 ---- */

.home__map-area {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
}

.home__filters {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: rgb(var(--surface-rgb) / 88%);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

/* 地图直接铺在灰色卡面上，不再套一层白卡片：卡里套卡会让四道边框互相打架 */
.home__stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.home__map-meta {
  display: flex;
  flex: 0 0 auto;
  gap: var(--space-3);
  align-items: baseline;
  justify-content: space-between;
  padding-top: var(--space-1);
}

.home__scope {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  font-size: var(--text-xs);
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}

.home__counter {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  margin: 0;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

/* ---- 按钮 ---- */

.home__reset {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  padding: 0.22rem 0.7rem;
  font: inherit;
  font-size: var(--text-2xs);
  color: var(--accent);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.home__reset:hover {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.home__reset--solid {
  color: var(--accent-ink);
  background: var(--accent);
  border-color: var(--accent);
}

.home__reset--solid:hover {
  background: var(--accent);
}

/* ---- 右侧列表 ---- */

.home__aside {
  min-height: 0;
  overflow-y: auto;
}

.home__list-title {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xs);
  letter-spacing: var(--tracking-label);
  color: var(--ink-soft);
}

.home__list ul {
  padding: 0;
  margin: 0;
  overflow: hidden;
  list-style: none;
  background: rgb(var(--surface-rgb) / 88%);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.home__item {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: 0.62rem 0.8rem;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: background-color 0.15s ease;
}

/* 行与行之间用细线，而不是每行一张卡片：一叠卡片读起来像清单，一张卡加细线才像版式 */
.home__list li + li .home__item {
  border-top: 1px solid var(--line);
}

.home__item:hover {
  background: var(--surface-muted);
}

.home__item-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  color: var(--ink);
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-xs);
}

.home__item-name {
  font-size: var(--text-base);
  line-height: var(--leading-snug);
  color: var(--ink);
}

.home__item-meta {
  grid-column: 2;
  margin-top: 0.1rem;
  font-size: var(--text-2xs);
  letter-spacing: 0.03em;
  color: var(--ink-soft);
}

/* ---- 空态 ---- */

.home__empty {
  padding: var(--space-5);
  text-align: left;
  background: rgb(var(--surface-rgb) / 88%);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.home__empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  margin-bottom: var(--space-3);
  color: var(--ink-soft);
  background: var(--surface-muted);
  border-radius: 50%;
}

.home__empty-title {
  margin: 0 0 0.35rem;
  font-size: var(--text-md);
  color: var(--ink);
}

.home__empty-text {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--ink-soft);
}

/* ---- 窄屏 ---- */

@media (width <= 900px) {
  .home {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    gap: var(--space-3);
    padding: 0 var(--space-3) var(--space-4);
  }

  .home__map-area {
    height: 66vh;
    min-height: 420px;
  }

  .home__aside {
    overflow: visible;
  }
}
</style>
