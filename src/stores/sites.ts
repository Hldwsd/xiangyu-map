import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { sites as rawSites } from '@/data/sites'
import type { Site, SiteCategory } from '@/types/site'
import { validateSites } from '@/utils/site-validation'

/** 「全部」不是分类，是筛选器的空状态 */
export const ALL_CATEGORIES = '全部' as const

export type CategoryFilter = typeof ALL_CATEGORIES | SiteCategory

function matchesQuery(site: Site, query: string): boolean {
  if (query === '') return true
  const haystack = [site.name, site.province, site.city, site.summary, ...site.tags]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
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
  const selectedId = ref<string | null>(null)

  const normalizedQuery = computed(() => query.value.trim().toLowerCase())

  const filteredSites = computed<Site[]>(() =>
    sites.value.filter(
      (site) =>
        (category.value === ALL_CATEGORIES || site.category === category.value) &&
        matchesQuery(site, normalizedQuery.value),
    ),
  )

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

  const hasActiveFilter = computed(
    () => category.value !== ALL_CATEGORIES || normalizedQuery.value !== '',
  )

  function selectSite(id: string | null): void {
    selectedId.value = id
  }

  function setQuery(value: string): void {
    query.value = value
    // 筛选条件一变，选中项可能已经不在结果里了
    if (
      selectedId.value !== null &&
      !filteredSites.value.some((site) => site.id === selectedId.value)
    ) {
      selectedId.value = null
    }
  }

  function setCategory(value: CategoryFilter): void {
    category.value = value
    if (
      selectedId.value !== null &&
      !filteredSites.value.some((site) => site.id === selectedId.value)
    ) {
      selectedId.value = null
    }
  }

  function resetFilters(): void {
    query.value = ''
    category.value = ALL_CATEGORIES
  }

  function getSiteById(id: string): Site | null {
    return sites.value.find((site) => site.id === id) ?? null
  }

  return {
    sites,
    query,
    category,
    selectedId,
    normalizedQuery,
    filteredSites,
    selectedSite,
    categoryCounts,
    hasActiveFilter,
    selectSite,
    setQuery,
    setCategory,
    resetFilters,
    getSiteById,
  }
})
