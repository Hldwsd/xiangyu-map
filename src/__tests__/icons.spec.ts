import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import { CATEGORY_GLYPHS, categoryMarkerSymbol } from '@/components/icons/category-paths'
import { UI_ICON_PATHS, type UiIconName } from '@/components/icons/ui-icon-paths'
import { SITE_CATEGORIES } from '@/types/site'

describe('地标圆钉', () => {
  it('七类各有自己的线条图标，且互不相同', () => {
    const glyphs = SITE_CATEGORIES.map((category) => CATEGORY_GLYPHS[category].join('|'))

    expect(glyphs).toHaveLength(7)
    expect(new Set(glyphs).size).toBe(7)
    for (const paths of SITE_CATEGORIES.map((c) => CATEGORY_GLYPHS[c])) {
      expect(paths.length).toBeGreaterThan(0)
      for (const path of paths) expect(path.startsWith('M')).toBe(true)
    }
  })

  it('生成 data URI 形式的图片符号，选中态与未选中态不是同一张', () => {
    const normal = categoryMarkerSymbol('古镇')
    const selected = categoryMarkerSymbol('古镇', true)

    expect(normal.startsWith('image://data:image/svg+xml')).toBe(true)
    expect(selected.startsWith('image://data:image/svg+xml')).toBe(true)
    expect(normal).not.toBe(selected)
    // 未选中是纸白圆钉 + 墨线，选中是墨底纸线 + 金环
    expect(decodeURIComponent(normal).toLowerCase()).toContain('fill="#fbf6ea"')
    expect(decodeURIComponent(selected).toLowerCase()).toContain('fill="#1c1a17"')
  })

  it('七个分类的符号互不相同', () => {
    const symbols = SITE_CATEGORIES.map((category) => categoryMarkerSymbol(category))

    expect(new Set(symbols).size).toBe(7)
  })

  it('界面图标与地图圆钉共用同一套线条', () => {
    const wrapper = mount(CategoryIcon, { props: { category: '自然', size: 16 } })
    const paths = wrapper.findAll('path').map((node) => node.attributes('d'))

    expect(paths).toEqual([...CATEGORY_GLYPHS['自然']])
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('svg').attributes('stroke')).toBe('currentColor')
    expect(wrapper.get('svg').attributes('fill')).toBe('none')
  })
})

describe('界面图标', () => {
  const names = Object.keys(UI_ICON_PATHS) as UiIconName[]

  it('覆盖菜单、筛选、操作与实用信息', () => {
    for (const name of [
      'menu',
      'map',
      'filter',
      'all',
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
    for (const name of ['external', 'calendar', 'route', 'clock', 'ticket', 'users', 'share']) {
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

describe('精选地标圆钉', () => {
  it('精选态保持纸白钉墨线，只在钉外加金色虚线环', () => {
    const normal = categoryMarkerSymbol('古镇')
    const featured = categoryMarkerSymbol('古镇', false, true)

    expect(featured.startsWith('image://data:image/svg+xml')).toBe(true)
    expect(featured).not.toBe(normal)
    const svg = decodeURIComponent(featured).toLowerCase()
    // 仍是纸白底 + 墨线图形，金环只出现在钉外
    expect(svg).toContain('fill="#fbf6ea"')
    expect(svg).toContain('stroke="#b08a4a"')
    // 与选中态不同：选中是墨底反转
    expect(featured).not.toBe(categoryMarkerSymbol('古镇', true))
  })

  it('选中优先于精选：两个标记同时命中时用选中态', () => {
    expect(categoryMarkerSymbol('古镇', true, true)).toBe(categoryMarkerSymbol('古镇', true))
  })
})
