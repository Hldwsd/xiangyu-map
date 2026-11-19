import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ALL_CATEGORIES, ALL_CITIES, useSitesStore } from '@/stores/sites'

describe('useSitesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('启动时加载全部数据', () => {
    const store = useSitesStore()
    expect(store.sites).toHaveLength(22)
    expect(store.filteredSites).toHaveLength(22)
    expect(store.category).toBe(ALL_CATEGORIES)
    expect(store.city).toBe(ALL_CITIES)
  })

  it('按分类筛选', () => {
    const store = useSitesStore()
    store.setCategory('自然')

    expect(store.filteredSites.map((site) => site.id).sort()).toEqual(
      [
        'huangshan-scenic',
        'jiuhuashan',
        'tianzhushan',
        'longzihu',
        'caishiji',
        'balihe',
        'huangcangyu',
        'langyashan',
        'tiantangzhai',
        'bagongshan',
      ].sort(),
    )
  })

  it('按关键词搜索名称、省市与标签', () => {
    const store = useSitesStore()
    store.setQuery('池州市')
    expect(store.filteredSites.map((site) => site.id).sort()).toEqual(
      ['jiuhuashan', 'xinghuacun'].sort(),
    )

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
    expect(store.categoryCounts['古镇']).toBe(5)
  })

  it('getSiteById 找不到时返回 null', () => {
    const store = useSitesStore()
    expect(store.getSiteById('hongcun')?.name).toBe('宏村')
    expect(store.getSiteById('not-exist')).toBeNull()
  })

  it('resetFilters 清空筛选，但保留选中项', () => {
    const store = useSitesStore()
    store.setCategory('非遗')
    store.setCity('亳州市')
    store.selectSite('huaxilou')
    store.resetFilters()

    expect(store.category).toBe(ALL_CATEGORIES)
    expect(store.city).toBe(ALL_CITIES)
    expect(store.query).toBe('')
    expect(store.hasActiveFilter).toBe(false)
    expect(store.selectedId).toBe('huaxilou')
  })

  it('按城市筛选', () => {
    const store = useSitesStore()
    store.setCity('黄山市')

    expect(store.filteredSites).toHaveLength(3)
    expect(store.filteredSites.every((site) => site.city === '黄山市')).toBe(true)
  })

  it('分类与城市同时生效', () => {
    const store = useSitesStore()
    store.setCategory('自然')
    store.setCity('黄山市')

    expect(store.filteredSites.map((site) => site.id)).toEqual(['huangshan-scenic'])
  })

  it('关键词与城市同时生效', () => {
    const store = useSitesStore()
    store.setCity('黄山市')
    store.setQuery('宏村')

    expect(store.filteredSites.map((site) => site.id)).toEqual(['hongcun'])
  })

  it('城市与分类组合没有结果时筛出空列表，不回退到全量', () => {
    const store = useSitesStore()
    // 16 个市现在都至少有 1 条数据，所以「空结果」要靠组合条件造出来：
    // 亳州市只有花戏楼（非遗），没有自然类项目
    store.setCity('亳州市')
    store.setCategory('自然')

    expect(store.filteredSites).toHaveLength(0)
  })

  it('城市计数覆盖 16 个市且之和等于项目总数', () => {
    const store = useSitesStore()
    const counts = Object.values(store.cityCounts)

    expect(counts).toHaveLength(16)
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(store.sites.length)
    expect(store.cityCounts['黄山市']).toBe(3)
    expect(store.cityCounts['铜陵市']).toBe(1)
  })

  it('城市筛选把当前选中项排除后，选中状态被清空', () => {
    const store = useSitesStore()
    store.selectSite('hongcun')
    store.setCity('池州市')

    expect(store.selectedId).toBeNull()
    expect(store.selectedSite).toBeNull()
  })

  it('城市也计入 hasActiveFilter', () => {
    const store = useSitesStore()
    expect(store.hasActiveFilter).toBe(false)

    store.setCity('合肥市')
    expect(store.hasActiveFilter).toBe(true)
  })

  it('多个关键词必须同时命中', () => {
    const store = useSitesStore()
    store.setQuery('黄山 云海')

    // 「黄山」能命中黄山风景区的名称，也能命中另两条的所在城市；
    // 但「云海」只在黄山风景区的标签里
    expect(store.filteredSites.map((site) => site.id)).toEqual(['huangshan-scenic'])
  })

  it('名称命中排在城市命中之前', () => {
    const store = useSitesStore()
    store.setQuery('黄山')

    // 黄山风景区命中名称（权重 4）；徽州古城与宏村只命中所在城市（权重 2），保持原始顺序
    expect(store.filteredSites.map((site) => site.id)).toEqual([
      'huangshan-scenic',
      'huizhou-ancient-city',
      'hongcun',
    ])
  })

  it('没有关键词时保持数据文件顺序', () => {
    const store = useSitesStore()

    expect(store.filteredSites.map((site) => site.id)).toEqual(store.sites.map((site) => site.id))
    expect(store.sites[0]?.id).toBe('sanhe-ancient-town')
  })
})
