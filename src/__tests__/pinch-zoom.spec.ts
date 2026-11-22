import { describe, expect, it } from 'vitest'

import { pinchZoom } from '@/components/map/pinch-zoom'

const LIMITS = { min: 0.9, max: 8 }

describe('pinchZoom', () => {
  it('阻尼后比线性更不敏感：两指拉远 20% 只放大 ~10%', () => {
    const zoom = pinchZoom(2, 1.2, LIMITS)
    expect(zoom).toBeGreaterThan(2)
    expect(zoom).toBeLessThan(2.4)
    expect(zoom).toBeCloseTo(2 * 1.2 ** 0.55, 5)
  })

  it('两指收近时同样只缩小一部分', () => {
    const zoom = pinchZoom(4, 0.8, LIMITS)
    expect(zoom).toBeLessThan(4)
    expect(zoom).toBeGreaterThan(3.2)
  })

  it('距离不变（ratio=1）时缩放不变', () => {
    expect(pinchZoom(2.5, 1, LIMITS)).toBe(2.5)
  })

  it('夹在缩放上下限内', () => {
    expect(pinchZoom(6, 10, LIMITS)).toBe(8)
    expect(pinchZoom(1, 0.01, LIMITS)).toBe(0.9)
  })

  it('异常输入不产生 NaN', () => {
    expect(pinchZoom(3, Number.NaN, LIMITS)).toBe(3)
    expect(pinchZoom(3, 0, LIMITS)).toBe(3)
  })
})
