<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import AnhuiMap from '@/components/map/AnhuiMap.vue'
import { CATEGORY_COLORS } from '@/components/map/anhui-map-option'
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
        />

        <CityFilter :city="store.city" :counts="cityCounts" @update:city="store.setCity" />
      </div>

      <div class="home__stage">
        <AnhuiMap :sites="filteredSites" :selected-id="selectedId" @select="store.selectSite" />

        <p class="home__counter">
          地图上 {{ filteredSites.length }} / {{ total }} 个项目
          <button
            v-if="hasActiveFilter"
            type="button"
            class="home__reset"
            @click="store.resetFilters()"
          >
            清空筛选
          </button>
        </p>
      </div>
    </section>

    <aside class="home__aside">
      <SitePanel v-if="selectedSite" :site="selectedSite" @close="store.selectSite(null)" />

      <div v-else-if="empty" class="home__empty">
        <p class="home__empty-title">没有匹配的项目</p>
        <p class="home__empty-text">换一个关键词，或者清空筛选条件再试。</p>
        <button type="button" class="home__reset home__reset--solid" @click="store.resetFilters()">
          清空筛选
        </button>
      </div>

      <div v-else class="home__list">
        <p class="home__list-title">当前 {{ filteredSites.length }} 个项目</p>
        <ul>
          <li v-for="site in filteredSites" :key="site.id">
            <button type="button" class="home__item" @click="store.selectSite(site.id)">
              <span class="home__dot" :style="{ background: CATEGORY_COLORS[site.category] }" />
              <span class="home__item-name">{{ site.name }}</span>
              <span class="home__item-meta">{{ site.city }}</span>
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
  gap: 1.1rem;
  width: 100%;
  max-width: 1400px;
  height: calc(100vh - 8.5rem);
  min-height: 520px;
  margin: 0 auto;
  padding: 0 1.25rem 1.25rem;
}

.home__map-area {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.9rem;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 20%, rgb(255 255 255 / 70%), transparent 60%),
    var(--paper-2, #efe7d8);
  border: 1px solid var(--line, #ddd2bd);
  border-radius: 16px;
}

.home__filters {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  gap: 0.65rem;
  padding: 0.7rem 0.8rem;
  background: rgb(255 253 248 / 82%);
  border: 1px solid var(--line, #ddd2bd);
  border-radius: 12px;
  backdrop-filter: blur(6px);
}

.home__stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
}

.home__counter {
  position: absolute;
  right: 1rem;
  bottom: 0.85rem;
  display: flex;
  gap: 0.6rem;
  align-items: center;
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-soft, #6b6154);
}

.home__reset {
  padding: 0.2rem 0.6rem;
  font: inherit;
  font-size: 0.75rem;
  color: var(--accent, #b45309);
  cursor: pointer;
  background: transparent;
  border: 1px solid currentcolor;
  border-radius: 999px;
}

.home__reset--solid {
  color: #fffdf8;
  background: var(--accent, #b45309);
  border-color: var(--accent, #b45309);
}

.home__aside {
  min-height: 0;
  overflow-y: auto;
}

.home__list-title {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  color: var(--ink-soft, #6b6154);
}

.home__list ul {
  padding: 0;
  margin: 0;
  list-style: none;
}

.home__item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.1rem 0.5rem;
  width: 100%;
  padding: 0.6rem 0.7rem;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: rgb(255 253 248 / 78%);
  border: 1px solid var(--line, #ddd2bd);
  border-radius: 10px;
  transition: border-color 0.15s ease;
}

.home__list li + li {
  margin-top: 0.45rem;
}

.home__item:hover {
  border-color: var(--accent, #b45309);
}

.home__dot {
  width: 0.5rem;
  height: 0.5rem;
  margin-top: 0.4rem;
  border-radius: 999px;
}

.home__item-name {
  font-size: 0.92rem;
  color: var(--ink, #2a2620);
}

.home__item-meta {
  grid-column: 2;
  font-size: 0.75rem;
  color: var(--ink-soft, #6b6154);
}

.home__empty {
  padding: 1.4rem 1.1rem;
  background: rgb(255 253 248 / 78%);
  border: 1px dashed var(--line, #ddd2bd);
  border-radius: 12px;
}

.home__empty-title {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  color: var(--ink, #2a2620);
}

.home__empty-text {
  margin: 0 0 0.8rem;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--ink-soft, #6b6154);
}

@media (width <= 900px) {
  .home {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    padding-inline: 0.9rem;
  }

  .home__map-area {
    height: 68vh;
    min-height: 420px;
  }

  .home__aside {
    overflow: visible;
  }
}
</style>
