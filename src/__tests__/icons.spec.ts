import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import { CATEGORY_ICON_PATHS, categoryMapSymbol } from '@/components/icons/category-paths'
import { UI_ICON_PATHS, type UiIconName } from '@/components/icons/ui-icon-paths'
import { SITE_CATEGORIES } from '@/types/site'

describe('地标图标', () => {
  it('六个分类各有一个路径，且互不相同', () => {
    const paths = SITE_CATEGORIES.map((category) => CATEGORY_ICON_PATHS[category])

    expect(paths).toHaveLength(6)
    for (const path of paths) {
      expect(path.startsWith('M')).toBe(true)
      expect(path.length).toBeGreaterThan(30)
    }
    expect(new Set(paths).size).toBe(6)
  })

  it('地图 symbol 用 path:// 前缀，与 ECharts 约定一致', () => {
    expect(categoryMapSymbol('古镇')).toBe(`path://${CATEGORY_ICON_PATHS['古镇']}`)
    expect(categoryMapSymbol('乡村').startsWith('path://M')).toBe(true)
  })

  it('渲染成实心 svg，并带 aria-hidden（读屏通过文字标签理解分类）', () => {
    const wrapper = mount(CategoryIcon, { props: { category: '自然', size: 18 } })
    const svg = wrapper.get('svg')

    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
    expect(svg.attributes('fill')).toBe('currentColor')
    expect(svg.attributes('width')).toBe('18')
    expect(svg.attributes('aria-hidden')).toBe('true')
    // 用 currentColor 才能跟随父级反色，避免「黑底 chip 上出现黑色图标」
    expect(svg.attributes('style')).toBeUndefined()
    expect(svg.get('path').attributes('d')).toBe(CATEGORY_ICON_PATHS['自然'])
  })
})

describe('界面图标', () => {
  const names = Object.keys(UI_ICON_PATHS) as UiIconName[]

  it('覆盖菜单、筛选、操作与实用信息', () => {
    for (const name of [
      'map',
      'filter',
      'search',
      'pin',
      'close',
      'reset',
      'back',
      'prev',
      'next',
    ]) {
      expect(names).toContain(name)
    }
    for (const name of ['external', 'calendar', 'route']) {
      expect(names).toContain(name)
    }
  })

  it('每个图标都有至少一条合法路径', () => {
    for (const name of names) {
      const paths = UI_ICON_PATHS[name]
      expect(paths.length).toBeGreaterThan(0)
      for (const path of paths) expect(path.startsWith('M')).toBe(true)
    }
  })

  it('线性渲染：stroke=currentColor、fill=none、可调线宽', () => {
    const wrapper = mount(AppIcon, { props: { name: 'search', size: 20, strokeWidth: 2 } })
    const svg = wrapper.get('svg')

    expect(svg.attributes('fill')).toBe('none')
    expect(svg.attributes('stroke')).toBe('currentColor')
    expect(svg.attributes('stroke-width')).toBe('2')
    expect(svg.attributes('width')).toBe('20')
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(wrapper.findAll('path')).toHaveLength(UI_ICON_PATHS.search.length)
  })
})
