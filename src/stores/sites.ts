import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { sites as rawSites } from '@/data/sites'
import { ANHUI_CITIES, type AnhuiCity, type Site, type SiteCategory } from '@/types/site'
import { validateSites } from '@/utils/site-validation'

/** 「全部」不是分类，是筛选器的空状态 */
export const ALL_CATEGORIES = '全部' as const

export type CategoryFilter = typeof ALL_CATEGORIES | SiteCategory

/** 城市维度的空状态。与 ALL_CATEGORIES 同值但类型不同，两者各自只和自己的字段比较 */
export const ALL_CITIES = '全部' as const

export type CityFilter = typeof ALL_CITIES | AnhuiCity

/**
 * 命中权重。名称命中比标签、省市、简介更像「用户正在找这个项目」，
 * 排序时按权重降序；同分保持数据文件里的原始顺序。
 */
const MATCH_WEIGHT = { name: 4, tag: 3, region: 2, summary: 1 } as const

/**
 * 计算一条数据的相关度。
 *
 * 多个关键词是 **AND** 关系：任一关键词没命中就返回 null，整条被排除。
 * 用 AND 而不是 OR，是因为「黄山 云海」这类输入里两个词都是用户的约束条件，
 * 取并集只会把结果摊大。
 */
function scoreSite(site: Site, tokens: readonly string[]): number | null {
  if (tokens.length === 0) return 0

  const name = site.name.toLowerCase()
  const tags = site.tags.join(' ').toLowerCase()
  const region = `${site.province} ${site.city}`.toLowerCase()
  const summary = site.summary.toLowerCase()

  let score = 0
  for (const token of tokens) {
    if (name.includes(token)) score += MATCH_WEIGHT.name
    else if (tags.includes(token)) score += MATCH_WEIGHT.tag
    else if (region.includes(token)) score += MATCH_WEIGHT.region
    else if (summary.includes(token)) score += MATCH_WEIGHT.summary
    else return null
  }
  return score
}

/**
 * 站点数据与筛选状态。
 *
 * 数据在 store 创建时校验一次：示例数据出错会立刻抛 SiteDataError，
 * 而不是等到界面上少了几个点才发现。
 */
export const useSitesStore = defineStore('sites', () => {
  const sites = shallowRef<Site[]>(validateSites(rawSites))

  const query = ref('')
  const category = ref<CategoryFilter>(ALL_CATEGORIES)
  const city = ref<CityFilter>(ALL_CITIES)
  const selectedId = ref<string | null>(null)

  const normalizedQuery = computed(() => query.value.trim().toLowerCase())

  const filteredSites = computed<Site[]>(() => {
    const tokens = normalizedQuery.value.split(/\s+/).filter(Boolean)

    const candidates = sites.value.filter(
      (site) =>
        (category.value === ALL_CATEGORIES || site.category === category.value) &&
        (city.value === ALL_CITIES || site.city === city.value),
    )

    const scored: Array<{ site: Site; score: number }> = []
    for (const site of candidates) {
      const score = scoreSite(site, tokens)
      if (score !== null) scored.push({ site, score })
    }

    // Array.prototype.sort 是稳定的，同分时保持上面的原始顺序
    scored.sort((a, b) => b.score - a.score)
    return scored.map((entry) => entry.site)
  })

  const selectedSite = computed<Site | null>(
    () => sites.value.find((site) => site.id === selectedId.value) ?? null,
  )

  const categoryCounts = computed<Record<SiteCategory, number>>(() => {
    const counts: Record<SiteCategory, number> = {
      古镇: 0,
      非遗: 0,
      红色: 0,
      自然: 0,
      演艺: 0,
      乡村: 0,
    }
    for (const site of sites.value) counts[site.category] += 1
    return counts
  })

  /** 每个市的项目数。按 16 市全量给键（含 0），界面据此把还没内容的城市置灰 */
  const cityCounts = computed<Record<AnhuiCity, number>>(() => {
    const counts = Object.fromEntries(ANHUI_CITIES.map((name) => [name, 0])) as Record<
      AnhuiCity,
      number
    >
    for (const site of sites.value) counts[site.city] += 1
    return counts
  })

  const hasActiveFilter = computed(
    () =>
      category.value !== ALL_CATEGORIES ||
      city.value !== ALL_CITIES ||
      normalizedQuery.value !== '',
  )

  function selectSite(id: string | null): void {
    selectedId.value = id
  }

  /** 筛选条件一变，选中项可能已经不在结果里了 */
  function clearSelectionIfFilteredOut(): void {
    if (
      selectedId.value !== null &&
      !filteredSites.value.some((site) => site.id === selectedId.value)
    ) {
      selectedId.value = null
    }
  }

  function setQuery(value: string): void {
    query.value = value
    clearSelectionIfFilteredOut()
  }

  function setCategory(value: CategoryFilter): void {
    category.value = value
    clearSelectionIfFilteredOut()
  }

  function setCity(value: CityFilter): void {
    city.value = value
    clearSelectionIfFilteredOut()
  }

  function resetFilters(): void {
    query.value = ''
    category.value = ALL_CATEGORIES
    city.value = ALL_CITIES
  }

  function getSiteById(id: string): Site | null {
    return sites.value.find((site) => site.id === id) ?? null
  }

  return {
    sites,
    query,
    category,
    city,
    selectedId,
    normalizedQuery,
    filteredSites,
    selectedSite,
    categoryCounts,
    cityCounts,
    hasActiveFilter,
    selectSite,
    setQuery,
    setCategory,
    setCity,
    resetFilters,
    getSiteById,
  }
})
