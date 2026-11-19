import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ALL_CATEGORIES, useSitesStore } from '@/stores/sites'

describe('useSitesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('启动时加载全部示例数据', () => {
    const store = useSitesStore()
    expect(store.sites).toHaveLength(10)
    expect(store.filteredSites).toHaveLength(10)
    expect(store.category).toBe(ALL_CATEGORIES)
  })

  it('按分类筛选', () => {
    const store = useSitesStore()
    store.setCategory('自然')

    expect(store.filteredSites.map((site) => site.id).sort()).toEqual(
      ['huangshan-scenic', 'jiuhuashan', 'tianzhushan'].sort(),
    )
  })

  it('按关键词搜索名称、省市与标签', () => {
    const store = useSitesStore()
    store.setQuery('池州市')
    expect(store.filteredSites.map((site) => site.id)).toEqual(['jiuhuashan'])

    store.setQuery('古城')
    expect(store.filteredSites.map((site) => site.id).sort()).toEqual(
      ['huizhou-ancient-city', 'shouxian-ancient-city'].sort(),
    )
  })

  it('搜索忽略大小写与首尾空格', () => {
    const store = useSitesStore()
    store.setQuery('  HONG  ')
    expect(store.filteredSites).toHaveLength(0)

    store.setQuery('  宏村 ')
    expect(store.filteredSites).toHaveLength(1)
  })

  it('筛选把当前选中项排除后，选中状态被清空', () => {
    const store = useSitesStore()
    store.selectSite('hongcun')
    expect(store.selectedSite?.id).toBe('hongcun')

    store.setCategory('自然')
    expect(store.selectedId).toBeNull()
    expect(store.selectedSite).toBeNull()

    store.selectSite('huangshan-scenic')
    store.setQuery('宏村')
    expect(store.selectedId).toBeNull()
  })

  it('分类计数之和等于项目总数', () => {
    const store = useSitesStore()
    const sum = Object.values(store.categoryCounts).reduce((total, count) => total + count, 0)
    expect(sum).toBe(store.sites.length)
    expect(store.categoryCounts['古镇']).toBe(3)
  })

  it('getSiteById 找不到时返回 null', () => {
    const store = useSitesStore()
    expect(store.getSiteById('hongcun')?.name).toBe('宏村')
    expect(store.getSiteById('not-exist')).toBeNull()
  })

  it('resetFilters 清空筛选，但保留选中项', () => {
    const store = useSitesStore()
    store.setCategory('非遗')
    store.selectSite('huaxilou')
    store.resetFilters()

    expect(store.category).toBe(ALL_CATEGORIES)
    expect(store.query).toBe('')
    expect(store.hasActiveFilter).toBe(false)
    expect(store.selectedId).toBe('huaxilou')
  })
})
