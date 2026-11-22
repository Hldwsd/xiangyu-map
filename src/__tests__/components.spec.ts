import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import MenuDrawer from '@/components/layout/MenuDrawer.vue'
import SiteListSheet from '@/components/layout/SiteListSheet.vue'
import TopBar from '@/components/layout/TopBar.vue'
import CategoryFilter from '@/components/site/CategoryFilter.vue'
import SitePanel from '@/components/site/SitePanel.vue'
import CityIndex from '@/components/home/CityIndex.vue'
import HomeRail from '@/components/home/HomeRail.vue'
import { sites } from '@/data/sites'
import { useSitesStore } from '@/stores/sites'
import type { Site } from '@/types/site'
import type { SiteCategory } from '@/types/site'
import SiteDetailView from '@/views/SiteDetailView.vue'

const routerLinkStub = { props: ['to'], template: '<a class="link-stub"><slot /></a>' }

const counts: Record<SiteCategory, number> = {
  古镇: 6,
  非遗: 2,
  红色: 3,
  自然: 12,
  演艺: 1,
  乡村: 6,
  场馆: 0,
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
    expect(wrapper.text()).toContain('月沼南湖')
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
  it('渲染「全部」加 7 个分类，并显示数量', () => {
    const wrapper = mount(CategoryFilter, {
      props: { category: '全部', counts, total: 30 },
    })

    const chips = wrapper.findAll('.filter__chip')
    expect(chips).toHaveLength(8)
    expect(chips[0]?.text()).toContain('全部')
    expect(chips[0]?.text()).toContain('30')
  })

  it('点击分类时更新 v-model', async () => {
    const wrapper = mount(CategoryFilter, {
      props: { category: '全部', counts, total: 30 },
    })

    const chips = wrapper.findAll('.filter__chip')
    await chips[1]?.trigger('click')

    expect(wrapper.emitted('update:category')?.[0]).toEqual(['古镇'])
  })
})

describe('MenuDrawer', () => {
  const mountDrawer = (overrides: { mergeMarkers?: boolean } = {}) =>
    mount(MenuDrawer, {
      props: {
        open: true,
        siteCount: sites.length,
        showDistricts: false,
        mergeMarkers: true,
        ...overrides,
      },
      global: { stubs: { RouterLink: routerLinkStub } },
    })

  it('两个图层开关：区县界 + 合并重叠标签', () => {
    const wrapper = mountDrawer()

    expect(wrapper.findAll('.drawer__toggle input')).toHaveLength(2)
    expect(wrapper.text()).toContain('合并重叠标签')
  })

  it('关掉合并时开关呈未选中，切换时抛 update:merge-markers', async () => {
    const wrapper = mountDrawer({ mergeMarkers: false })
    const toggles = wrapper.findAll('.drawer__toggle input')
    const merge = toggles[1]
    if (merge === undefined) throw new Error('找不到合并开关')
    expect((merge.element as HTMLInputElement).checked).toBe(false)

    await merge.setValue(true)
    expect(wrapper.emitted('update:merge-markers')?.[0]).toEqual([true])
  })
})

describe('TopBar', () => {
  it('搜索栏输入时抛出 update:query，点清除按钮清空', async () => {
    const wrapper = mount(TopBar, {
      props: { query: '', listCount: 30, listOpen: false },
    })

    await wrapper.get('input').setValue('宏村')
    expect(wrapper.emitted('update:query')?.[0]).toEqual(['宏村'])

    await wrapper.setProps({ query: '宏村' })
    await wrapper.get('.topbar__clear').trigger('click')
    expect(wrapper.emitted('update:query')?.[1]).toEqual([''])
  })

  it('菜单与列表按钮各自抛事件；筛选入口已并入图例/城市索引', async () => {
    const wrapper = mount(TopBar, {
      props: { query: '', listCount: 30, listOpen: false },
    })

    // 右上角的筛选按钮已删除，避免与左侧图例、右侧城市索引重复
    expect(wrapper.find('[aria-label="筛选"]').exists()).toBe(false)

    await wrapper.get('[aria-label="打开菜单"]').trigger('click')
    await wrapper.get('[aria-label="项目列表"]').trigger('click')
    expect(wrapper.emitted('menu')).toHaveLength(1)
    expect(wrapper.emitted('list')).toHaveLength(1)
  })
})

describe('SiteListSheet', () => {
  const first = sites[0]
  if (first === undefined) throw new Error('测试数据为空')

  it('渲染全部条目、标题带数量，选中项高亮', () => {
    const wrapper = mount(SiteListSheet, {
      props: { sites, selectedId: first.id },
    })

    expect(wrapper.findAll('.sheet__item')).toHaveLength(sites.length)
    expect(wrapper.get('.sheet__title').text()).toContain(String(sites.length))
    expect(wrapper.get('.sheet__item--on').text()).toContain(first.name)
    expect(wrapper.get('.sheet').attributes('aria-modal')).toBe('true')
  })

  it('点条目抛 select、点关闭抛 close', async () => {
    const wrapper = mount(SiteListSheet, {
      props: { sites, selectedId: null },
    })

    const second = sites[1]
    if (second === undefined) throw new Error('测试数据不足两条')
    await wrapper.findAll('.sheet__item')[1]?.trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([second.id])

    await wrapper.get('.sheet__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('筛选为空时给空状态提示', () => {
    const wrapper = mount(SiteListSheet, {
      props: { sites: [], selectedId: null },
    })

    expect(wrapper.findAll('.sheet__item')).toHaveLength(0)
    expect(wrapper.get('.sheet__empty').text()).toContain('没有匹配的项目')
  })
})

describe('HomeRail', () => {
  it('渲染「全部」加 7 个分类，点击分类写入 store', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(HomeRail, { global: { plugins: [pinia] } })

    const rows = wrapper.findAll('.lrow')
    expect(rows).toHaveLength(8)
    expect(rows[0]?.text()).toContain('全部')

    await rows[1]?.trigger('click')
    expect(useSitesStore().category).toBe('古镇')
  })

  it('图例按钮把当前筛选暴露为 aria-pressed，读屏能听出选中态', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(HomeRail, { global: { plugins: [pinia] } })

    const rows = wrapper.findAll('.lrow')
    expect(rows[0]?.attributes('aria-pressed')).toBe('true')
    expect(rows[1]?.attributes('aria-pressed')).toBe('false')

    await rows[1]?.trigger('click')

    const afterClick = wrapper.findAll('.lrow')
    expect(afterClick[0]?.attributes('aria-pressed')).toBe('false')
    expect(afterClick[1]?.attributes('aria-pressed')).toBe('true')
  })
})

describe('CityIndex', () => {
  it('16 个市全部列出，点击有项目的城市写入 store', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(CityIndex, { global: { plugins: [pinia] } })

    expect(wrapper.findAll('.city')).toHaveLength(16)
    const hefei = wrapper.findAll('.city').find((button) => button.text().includes('合肥'))
    await hefei?.trigger('click')
    expect(useSitesStore().city).toBe('合肥市')
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

  it('挂载后把焦点交给标题（读屏能播报当前项目），且不插进 Tab 序列', async () => {
    const wrapper = mount(SiteDetailView, {
      props: { id: 'hongcun' },
      attachTo: document.body,
      global: { plugins: [createPinia()], stubs: { RouterLink: routerLinkStub } },
    })

    await nextTick()

    const heading = wrapper.get('.detail__title')
    expect(heading.attributes('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(heading.element)

    wrapper.unmount()
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

describe('HomeRail 品牌区（ADR 0008）', () => {
  it('竖排题字 + 落款朱砂印的结构存在，副题取代旧横排 tag', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(HomeRail, { global: { plugins: [pinia] } })

    // 主标题与落款印同列（传统题字位置），副题竖排
    expect(wrapper.find('.rail__brand h1').exists()).toBe(true)
    expect(wrapper.find('.rail__seal').text()).toBe('徽')
    expect(wrapper.find('.rail__sub').text()).toContain('在地图上，遇见一个文旅项目')
    // 左列引言：填满标题左侧留白（ADR 0008 修订）
    expect(wrapper.find('.rail__quote').text()).toContain('无梦到徽州')
    // 旧横排 tag 不应再出现
    expect(wrapper.find('.rail__tag').exists()).toBe(false)
  })
})
