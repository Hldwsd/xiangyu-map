import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import FilterPopover from '@/components/layout/FilterPopover.vue'
import SiteListSheet from '@/components/layout/SiteListSheet.vue'
import TopBar from '@/components/layout/TopBar.vue'
import { sites } from '@/data/sites'
import type { CategoryFilter as CategoryValue, CityFilter as CityValue } from '@/stores/sites'
import type { AnhuiCity, Site, SiteCategory } from '@/types/site'

const twoSites: Site[] = sites.slice(0, 2)

const counts: Record<SiteCategory, number> = {
  古镇: 6,
  非遗: 3,
  红色: 4,
  自然: 14,
  演艺: 1,
  乡村: 8,
}

const cityCounts = { 合肥市: 1, 黄山市: 7 } as unknown as Record<AnhuiCity, number>

describe('SiteListSheet', () => {
  function mountSheet(overrides: Partial<{ sites: Site[]; selectedId: string | null }> = {}) {
    return mount(SiteListSheet, {
      props: { sites: twoSites, selectedId: null, ...overrides },
    })
  }

  it('标题显示项目数，列表逐条给出名称与分类城市', () => {
    const wrapper = mountSheet()

    expect(wrapper.get('.sheet__title').text()).toContain('当前 2 个项目')
    const items = wrapper.findAll('.sheet__item')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain(twoSites[0]?.name)
    expect(items[0]?.text()).toContain(twoSites[0]?.city)
  })

  it('选中项带高亮类', () => {
    const wrapper = mountSheet({ selectedId: twoSites[1]?.id ?? null })

    const items = wrapper.findAll('.sheet__item')
    expect(items[0]?.classes()).not.toContain('sheet__item--on')
    expect(items[1]?.classes()).toContain('sheet__item--on')
  })

  it('点条目抛 select，点关闭抛 close', async () => {
    const wrapper = mountSheet()

    await wrapper.findAll('.sheet__item')[0]?.trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([twoSites[0]?.id])

    await wrapper.get('.sheet__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('空结果时给出可操作的空态文案', () => {
    const wrapper = mountSheet({ sites: [] })

    expect(wrapper.get('.sheet__empty').text()).toContain('换一个关键词')
  })
})

describe('FilterPopover', () => {
  function mountPopover(
    overrides: Partial<{ category: CategoryValue; city: CityValue; matched: number }> = {},
  ) {
    return mount(FilterPopover, {
      props: {
        category: '全部',
        city: '全部',
        counts,
        cityCounts,
        total: 36,
        matched: 36,
        ...overrides,
      },
    })
  }

  it('显示符合条件的数量', () => {
    const wrapper = mountPopover({ matched: 7 })

    expect(wrapper.get('.popover__result').text()).toContain('7 / 36')
  })

  it('没有筛选时不显示「清空」，有筛选时显示并可抛 reset', async () => {
    expect(mountPopover().find('.popover__reset').exists()).toBe(false)

    const wrapper = mountPopover({ category: '非遗' })
    await wrapper.get('.popover__reset').trigger('click')
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('分类与城市的变化都向上转发', async () => {
    const wrapper = mountPopover()

    await wrapper.findAll('.filter__chip')[1]?.trigger('click')
    expect(wrapper.emitted('update:category')?.[0]).toEqual(['古镇'])

    await wrapper.get('select').setValue('黄山市')
    expect(wrapper.emitted('update:city')?.[0]).toEqual(['黄山市'])
  })
})

describe('TopBar', () => {
  function mountBar(
    overrides: Partial<{ query: string; activeFilters: number; filterOpen: boolean }> = {},
  ) {
    return mount(TopBar, {
      props: { query: '', activeFilters: 0, filterOpen: false, ...overrides },
    })
  }

  it('输入时向上抛 update:query', async () => {
    const wrapper = mountBar()

    await wrapper.get('input').setValue('古城')
    expect(wrapper.emitted('update:query')?.[0]).toEqual(['古城'])
  })

  it('搜索框有内容时才出现清除按钮，点击清成空串', async () => {
    expect(mountBar().find('.topbar__clear').exists()).toBe(false)

    const wrapper = mountBar({ query: '古城' })
    await wrapper.get('.topbar__clear').trigger('click')
    expect(wrapper.emitted('update:query')?.[0]).toEqual([''])
  })

  it('筛选项数量以角标显示在筛选按钮上', () => {
    expect(mountBar().find('.topbar__badge').exists()).toBe(false)

    const wrapper = mountBar({ activeFilters: 2, filterOpen: true })
    expect(wrapper.get('.topbar__badge').text()).toBe('2')
    expect(wrapper.get('[aria-label="筛选"]').attributes('aria-expanded')).toBe('true')
  })

  it('菜单与筛选按钮各自抛事件', async () => {
    const wrapper = mountBar()

    await wrapper.get('[aria-label="打开菜单"]').trigger('click')
    await wrapper.get('[aria-label="筛选"]').trigger('click')

    expect(wrapper.emitted('menu')).toHaveLength(1)
    expect(wrapper.emitted('filter')).toHaveLength(1)
  })
})
