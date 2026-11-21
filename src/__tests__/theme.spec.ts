import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_PALETTE, readThemePalette } from '@/theme/theme'

afterEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('readThemePalette', () => {
  it('CSS 变量缺失时回落到默认值，且七个分类都有颜色', () => {
    const palette = readThemePalette()

    expect(palette.mapArea).toBe(DEFAULT_PALETTE.mapArea)
    expect(Object.keys(palette.category)).toHaveLength(7)
    for (const color of Object.values(palette.category)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('单色方向下七类同色——分类靠形状而不是颜色区分', () => {
    const colors = new Set(Object.values(DEFAULT_PALETTE.category))

    expect(colors.size).toBe(1)
  })

  it('读的是 CSS 变量，改 tokens.css 就改配色（组件不用动）', () => {
    document.documentElement.style.setProperty('--map-area', '#123456')
    document.documentElement.style.setProperty('--cat-nature', '#abcdef')

    const palette = readThemePalette()

    expect(palette.mapArea).toBe('#123456')
    expect(palette.category['自然']).toBe('#abcdef')
    // 没覆盖的仍然回落到默认
    expect(palette.mapBorder).toBe(DEFAULT_PALETTE.mapBorder)
  })

  it('聚合点单独取色：与地标默认同色，但可以单独调整', () => {
    expect(readThemePalette().cluster).toBe(DEFAULT_PALETTE.cluster)

    document.documentElement.style.setProperty('--cluster', '#0f0f0f')
    expect(readThemePalette().cluster).toBe('#0f0f0f')
  })
})

describe('choropleth 档位色', () => {
  it('默认回落：无 CSS 变量时用 DEFAULT_PALETTE 的纸色加深档', () => {
    const palette = readThemePalette()

    expect(palette.mapTier1).toBe(DEFAULT_PALETTE.mapTier1)
    expect(palette.mapTier2).toBe(DEFAULT_PALETTE.mapTier2)
  })

  it('读的是 CSS 变量，改 tokens.css 就改档位色', () => {
    document.documentElement.style.setProperty('--map-tier-1', '#111111')
    document.documentElement.style.setProperty('--map-tier-2', '#222222')

    const palette = readThemePalette()

    expect(palette.mapTier1).toBe('#111111')
    expect(palette.mapTier2).toBe('#222222')
  })
})
