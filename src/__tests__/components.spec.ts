import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CategoryFilter from '@/components/site/CategoryFilter.vue'
import SitePanel from '@/components/site/SitePanel.vue'
import { sites } from '@/data/sites'
import type { Site } from '@/types/site'
import type { SiteCategory } from '@/types/site'

const counts: Record<SiteCategory, number> = {
  古镇: 4,
  非遗: 2,
  红色: 1,
  自然: 1,
  演艺: 1,
  乡村: 1,
}

function findSite(id: string): Site {
  const site = sites.find((item) => item.id === id)
  if (site === undefined) throw new Error(`测试数据里缺少 ${id}`)
  return site
}

describe('SitePanel', () => {
  it('展示名称、分类与省市', () => {
    const wrapper = mount(SitePanel, {
      props: { site: findSite('wuzhen') },
      global: { stubs: { RouterLink: { template: '<a class="link-stub"><slot /></a>' } } },
    })

    expect(wrapper.text()).toContain('乌镇')
    expect(wrapper.text()).toContain('浙江省')
    expect(wrapper.text()).toContain('水网穿镇而过')
  })

  it('点击关闭按钮时抛出 close 事件', async () => {
    const wrapper = mount(SitePanel, {
      props: { site: findSite('wuzhen') },
      global: { stubs: { RouterLink: { template: '<a class="link-stub"><slot /></a>' } } },
    })

    await wrapper.get('.panel__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('CategoryFilter', () => {
  it('渲染「全部」加 6 个分类，并显示数量', () => {
    const wrapper = mount(CategoryFilter, {
      props: { category: '全部', query: '', counts, total: 10 },
    })

    const chips = wrapper.findAll('.filter__chip')
    expect(chips).toHaveLength(7)
    expect(chips[0]?.text()).toContain('全部')
    expect(chips[0]?.text()).toContain('10')
  })

  it('点击分类时更新 v-model', async () => {
    const wrapper = mount(CategoryFilter, {
      props: { category: '全部', query: '', counts, total: 10 },
    })

    const chips = wrapper.findAll('.filter__chip')
    await chips[1]?.trigger('click')

    expect(wrapper.emitted('update:category')?.[0]).toEqual(['古镇'])
  })

  it('输入关键词时更新 query', async () => {
    const wrapper = mount(CategoryFilter, {
      props: { category: '全部', query: '', counts, total: 10 },
    })

    await wrapper.get('input').setValue('平遥')
    expect(wrapper.emitted('update:query')?.[0]).toEqual(['平遥'])
  })
})
