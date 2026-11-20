<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import { ALL_CATEGORIES, useSitesStore } from '@/stores/sites'
import { SITE_CATEGORIES, type Site, type SiteCategory } from '@/types/site'

const emit = defineEmits<{ menu: []; select: [id: string] }>()

const store = useSitesStore()

const categories = computed(() =>
  SITE_CATEGORIES.map((name) => ({ name, count: store.categoryCounts[name] })),
)

/** 本期精选：数据里真实存在的三个项目，点名字直接选中 */
const picks = computed(() =>
  ['huizhou-ancient-city', 'huangshan-scenic', 'hongcun']
    .map((id) => store.getSiteById(id))
    .filter((site): site is Site => site !== null),
)

function onQuery(event: Event): void {
  store.setQuery((event.target as HTMLInputElement).value)
}

function choose(category: SiteCategory): void {
  store.setCategory(store.category === category ? ALL_CATEGORIES : category)
}

function chooseAll(): void {
  store.setCategory(ALL_CATEGORIES)
}
</script>

<template>
  <aside class="rail" aria-label="地图版头">
    <div class="rail__brand">
      <h1>乡遇安徽</h1>
      <span class="rail__seal" aria-hidden="true">徽</span>
    </div>
    <p class="rail__tag">在地图上，遇见一个文旅项目<br />十六市 · 三十处</p>

    <label class="rail__search">
      <AppIcon name="search" :size="14" />
      <input
        :value="store.query"
        type="search"
        placeholder="搜地名、城市或标签"
        aria-label="搜索文旅项目"
        autocomplete="off"
        @input="onQuery"
      />
    </label>

    <p class="rail__label">分类 · 图例</p>
    <div class="rail__legend">
      <button
        type="button"
        class="lrow"
        :class="{ 'lrow--on': store.category === ALL_CATEGORIES }"
        :aria-pressed="store.category === ALL_CATEGORIES"
        @click="chooseAll"
      >
        <span class="lrow__all" aria-hidden="true"> <i /><i /><i /><i /> </span>
        <span class="lrow__name">全部</span>
        <span class="lrow__num">{{ store.sites.length }}</span>
      </button>
      <button
        v-for="item in categories"
        :key="item.name"
        type="button"
        class="lrow"
        :class="{ 'lrow--on': store.category === item.name }"
        :aria-pressed="store.category === item.name"
        @click="choose(item.name)"
      >
        <CategoryIcon :category="item.name" :size="22" />
        <span class="lrow__name">{{ item.name }}</span>
        <span class="lrow__num">{{ item.count }}</span>
      </button>
    </div>

    <p class="rail__label rail__label--gap">本期精选</p>
    <div class="rail__picks">
      <button
        v-for="site in picks"
        :key="site.id"
        type="button"
        class="pick"
        @click="emit('select', site.id)"
      >
        <span class="pick__dot" aria-hidden="true" />
        <b>{{ site.name }}</b>
        <span class="pick__city">{{ site.city.replace('市', '') }}</span>
      </button>
    </div>

    <div class="rail__meta">
      <b>安徽省 · 16 个地级市</b>
      <span>底图：DataV.GeoAtlas · 示例数据</span>
      <button type="button" class="rail__menu" @click="emit('menu')">
        <AppIcon name="menu" :size="13" />菜单 / 关于
      </button>
    </div>
  </aside>
</template>

<style scoped>
/*
 * 版头是一张独立的纸片：不透明底色 + 描边 + 投影。
 * 之前直接浮在地图上，文字和地图线重叠，读起来很费劲。
 */
.rail {
  position: absolute;
  top: 1.4rem;
  bottom: 1.4rem;
  left: 1.4rem;
  z-index: 12;
  display: flex;
  flex-direction: column;
  width: 19rem;
  padding: 1.2rem 1.1rem;
  overflow-y: auto;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-panel);
  scrollbar-width: none;
}

.rail::-webkit-scrollbar {
  display: none;
}

.rail__brand {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.rail__brand h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.8rem;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: var(--tracking-brand);
}

.rail__seal {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  margin-top: 1px;
  font-family: var(--font-serif);
  font-size: 1.15rem;
  color: var(--seal);
  background: var(--ink);
  border: 1px solid var(--seal);
}

.rail__tag {
  margin: 0.6rem 0 0;
  font-size: 0.68rem;
  line-height: 1.8;
  color: var(--ink-soft);
  letter-spacing: 0.14em;
}

.rail__search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 2.5rem;
  padding: 0 0.75rem;
  margin-top: 1.2rem;
  color: var(--ink-soft);
  background: var(--surface);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-xs);
}

.rail__search input {
  flex: 1;
  min-width: 0;
  padding: 0;
  font: inherit;
  font-size: 0.75rem;
  color: var(--ink);
  background: transparent;
  border: 0;
  outline: none;
}

.rail__search input::placeholder {
  color: var(--ink-soft);
}

.rail__search:focus-within {
  border-color: var(--ink);
}

.rail__search input::-webkit-search-cancel-button {
  appearance: none;
}

.rail__label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 1.5rem 0 0.6rem;
  font-size: 0.64rem;
  font-weight: 500;
  color: var(--ink-soft);
  letter-spacing: 0.26em;
}

.rail__label--gap {
  margin-top: 18px;
}

.rail__badge {
  font-size: 0.55rem;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}

.rail__legend,
.rail__picks {
  border-top: 1px solid var(--rule);
}

.lrow {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  height: 31px;
  padding: 0 4px;
  font: inherit;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
}

.lrow:focus-visible,
.pick:focus-visible,
.rail__menu:focus-visible,
.city:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

.lrow:hover {
  background: var(--surface-muted);
}

.lrow--on {
  color: var(--ink);
  background: var(--surface);
  box-shadow: inset 2px 0 0 var(--ink);
}

.lrow__all {
  display: grid;
  flex: none;
  grid-template-columns: repeat(2, 6px);
  gap: 3px;
  width: 22px;
  height: 22px;
  align-content: center;
  justify-content: center;
}

.lrow__all i {
  width: 6px;
  height: 6px;
  border: 1px solid currentcolor;
}

.lrow__name {
  font-family: var(--font-serif);
  font-size: 11px;
  letter-spacing: 0.1em;
}

.lrow__num {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: 0.66rem;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.pick {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  height: 28px;
  padding: 0 4px;
  font: inherit;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
}

.pick:hover {
  color: var(--ink);
  background: var(--surface-muted);
}

.pick__dot {
  flex: none;
  width: 4px;
  height: 4px;
  background: var(--seal);
}

.pick b {
  overflow: hidden;
  font-family: var(--font-serif);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick__city {
  margin-left: auto;
  font-size: 0.64rem;
  letter-spacing: 0.06em;
}

.rail__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 9px;
  margin-top: auto;
  font-size: 0.58rem;
  line-height: 1.9;
  color: var(--ink-soft);
  letter-spacing: 0.08em;
  border-top: 1px solid var(--rule);
}

.rail__meta b {
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.16em;
}

.rail__menu {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  align-self: flex-start;
  padding: 4px 0 0;
  margin-top: 4px;
  font: inherit;
  font-size: 8px;
  color: var(--ink-soft);
  letter-spacing: 0.1em;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.rail__menu:hover {
  color: var(--ink);
}

@media (width <= 1199px) {
  .rail {
    display: none;
  }
}
</style>
