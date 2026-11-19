import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_PALETTE, readThemePalette } from '@/theme/theme'

afterEach(() => {
  document.documentElement.removeAttribute('style')
})

describe('readThemePalette', () => {
  it('CSS 变量缺失时回落到默认值，且六个分类都有颜色', () => {
    const palette = readThemePalette()

    expect(palette.mapArea).toBe(DEFAULT_PALETTE.mapArea)
    expect(Object.keys(palette.category)).toHaveLength(6)
    for (const color of Object.values(palette.category)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('单色方向下六类同色——分类靠形状而不是颜色区分', () => {
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
