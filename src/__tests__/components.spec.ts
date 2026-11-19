import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import TopBar from '@/components/layout/TopBar.vue'
import CategoryFilter from '@/components/site/CategoryFilter.vue'
import SitePanel from '@/components/site/SitePanel.vue'
import { sites } from '@/data/sites'
import { useSitesStore } from '@/stores/sites'
import type { Site } from '@/types/site'
import type { SiteCategory } from '@/types/site'
import SiteDetailView from '@/views/SiteDetailView.vue'

const routerLinkStub = { props: ['to'], template: '<a class="link-stub"><slot /></a>' }

const counts: Record<SiteCategory, number> = {
  古镇: 6,
  非遗: 2,
  红色: 2,
  自然: 11,
  演艺: 1,
  乡村: 4,
}

function findSite(id: string): Site {
  const site = sites.find((item) => item.id === id)
  if (site === undefined) throw new Error(`测试数据里缺少 ${id}`)
  return site
}

describe('SitePanel', () => {
  it('展示名称、分类与省市', () => {
    const wrapper = mount(SitePanel, {
      props: { site: findSite('hongcun') },
      global: { stubs: { RouterLink: { template: '<a class="link-stub"><slot /></a>' } } },
    })

    expect(wrapper.text()).toContain('宏村')
    expect(wrapper.text()).toContain('安徽省')
    expect(wrapper.text()).toContain('黄山市')
    expect(wrapper.text()).toContain('月沼与南湖')
  })

  it('点击关闭按钮时抛出 close 事件', async () => {
    const wrapper = mount(SitePanel, {
      props: { site: findSite('hongcun') },
      global: { stubs: { RouterLink: { template: '<a class="link-stub"><slot /></a>' } } },
    })

    await wrapper.get('.panel__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('CategoryFilter', () => {
  it('渲染「全部」加 6 个分类，并显示数量', () => {
    const wrapper = mount(CategoryFilter, {
      props: { category: '全部', counts, total: 26 },
    })

    const chips = wrapper.findAll('.filter__chip')
    expect(chips).toHaveLength(7)
    expect(chips[0]?.text()).toContain('全部')
    expect(chips[0]?.text()).toContain('26')
  })

  it('点击分类时更新 v-model', async () => {
    const wrapper = mount(CategoryFilter, {
      props: { category: '全部', counts, total: 26 },
    })

    const chips = wrapper.findAll('.filter__chip')
    await chips[1]?.trigger('click')

    expect(wrapper.emitted('update:category')?.[0]).toEqual(['古镇'])
  })
})

describe('TopBar', () => {
  it('搜索栏输入时抛出 update:query，点清除按钮清空', async () => {
    const wrapper = mount(TopBar, {
      props: { query: '', activeFilters: 0, filterOpen: false },
    })

    await wrapper.get('input').setValue('宏村')
    expect(wrapper.emitted('update:query')?.[0]).toEqual(['宏村'])

    await wrapper.setProps({ query: '宏村' })
    await wrapper.get('.topbar__clear').trigger('click')
    expect(wrapper.emitted('update:query')?.[1]).toEqual([''])
  })

  it('菜单与筛选按钮各自抛事件，筛选项多于 0 时显示角标', async () => {
    const wrapper = mount(TopBar, {
      props: { query: '', activeFilters: 0, filterOpen: false },
    })

    expect(wrapper.find('.topbar__badge').exists()).toBe(false)

    await wrapper.get('[aria-label="打开菜单"]').trigger('click')
    await wrapper.get('[aria-label="筛选"]').trigger('click')
    expect(wrapper.emitted('menu')).toHaveLength(1)
    expect(wrapper.emitted('filter')).toHaveLength(1)

    await wrapper.setProps({ activeFilters: 2 })
    expect(wrapper.get('.topbar__badge').text()).toBe('2')
  })
})

describe('SiteDetailView', () => {
  it('渲染标题与相邻导航，末条没有下一条', () => {
    // 末条随数据文件变化，所以从 store 里取最后一条，别把 id 写死
    const pinia = createPinia()
    setActivePinia(pinia)
    const sites = useSitesStore().sites
    const site = sites[sites.length - 1]
    if (site === undefined) throw new Error('测试数据为空')

    const wrapper = mount(SiteDetailView, {
      props: { id: site.id },
      global: { plugins: [pinia], stubs: { RouterLink: routerLinkStub } },
    })

    expect(wrapper.get('.detail__title').text()).toBe(site.name)
    expect(wrapper.get('.detail__pager').text()).toContain('上一条')
    expect(wrapper.get('.detail__pager').text()).toContain('已是最后一条')
  })

  it('首条没有上一条', () => {
    const wrapper = mount(SiteDetailView, {
      props: { id: 'sanhe-ancient-town' },
      global: { plugins: [createPinia()], stubs: { RouterLink: routerLinkStub } },
    })

    expect(wrapper.get('.detail__pager').text()).toContain('已是第一条')
  })

  it('封面加载失败时换成占位图，且不会无限重试', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const target = useSitesStore().sites.find((item) => item.id === 'hongcun')
    if (target === undefined) throw new Error('测试数据里缺少 hongcun')

    const originalCover = target.cover
    target.cover = '/images/sites/hongcun/cover.webp'

    try {
      const wrapper = mount(SiteDetailView, {
        props: { id: 'hongcun' },
        global: { plugins: [pinia], stubs: { RouterLink: routerLinkStub } },
      })

      expect(wrapper.get('.detail__cover').attributes('src')).toBe(
        '/images/sites/hongcun/cover.webp',
      )

      await wrapper.get('.detail__cover').trigger('error')
      expect(wrapper.get('.detail__cover').attributes('src')).toBe('/images/placeholder.svg')
    } finally {
      target.cover = originalCover
    }
  })
})
