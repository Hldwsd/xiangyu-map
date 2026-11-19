import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_PALETTE, applyThemeFromQuery, readThemePalette } from '@/theme/theme'

afterEach(() => {
  delete document.documentElement.dataset.theme
  document.documentElement.removeAttribute('style')
})

describe('applyThemeFromQuery', () => {
  it('把 ?theme=b 写到 <html data-theme>', () => {
    expect(applyThemeFromQuery('?theme=b')).toBe('b')
    expect(document.documentElement.dataset.theme).toBe('b')
  })

  it('没有参数时不动 DOM', () => {
    expect(applyThemeFromQuery('')).toBeNull()
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('非法值被忽略，回落到默认方向', () => {
    expect(applyThemeFromQuery('?theme=neon')).toBeNull()
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('只有 a/b/c 三个方向', () => {
    for (const id of ['a', 'b', 'c'] as const) {
      expect(applyThemeFromQuery(`?theme=${id}`)).toBe(id)
    }
  })
})

describe('readThemePalette', () => {
  it('CSS 变量缺失时回落到默认方向，且六个分类都有颜色', () => {
    const palette = readThemePalette()

    expect(palette.mapArea).toBe(DEFAULT_PALETTE.mapArea)
    expect(Object.keys(palette.category)).toHaveLength(6)
    for (const color of Object.values(palette.category)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('读的是 CSS 变量，换主题就换色（组件不需要改代码）', () => {
    document.documentElement.style.setProperty('--map-area', '#123456')
    document.documentElement.style.setProperty('--cat-nature', '#abcdef')

    const palette = readThemePalette()

    expect(palette.mapArea).toBe('#123456')
    expect(palette.category['自然']).toBe('#abcdef')
    // 没覆盖的仍然回落到默认
    expect(palette.mapBorder).toBe(DEFAULT_PALETTE.mapBorder)
  })

  it('聚合点是单独的颜色，不借用任何分类色', () => {
    document.documentElement.style.setProperty('--cluster', '#0f0f0f')

    expect(readThemePalette().cluster).toBe('#0f0f0f')
  })
})
