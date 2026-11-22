import { describe, expect, it } from 'vitest'

import { spreadOffsets } from '@/components/map/marker-spread'

describe('spreadOffsets', () => {
  it('单个地标不偏移', () => {
    expect(spreadOffsets([]).size).toBe(0)
    expect(spreadOffsets(['huizhou-ancient-city']).size).toBe(0)
  })

  it('两个重叠地标分到相对的两侧，间距不小于针宽', () => {
    const offsets = spreadOffsets(['a', 'b'])
    const a = offsets.get('a')
    const b = offsets.get('b')
    expect(a).toBeDefined()
    expect(b).toBeDefined()

    const distance = Math.hypot(a![0] - b![0], a![1] - b![1])
    expect(distance).toBeGreaterThanOrEqual(36)
  })

  it('三个及以上均匀分布在同一圆环上，角度稳定可复现', () => {
    const ids = ['c', 'a', 'b']
    const first = spreadOffsets(ids)
    const second = spreadOffsets(ids)

    expect([...first.entries()]).toEqual([...second.entries()])
    for (const [dx, dy] of first.values()) {
      // 圆心到每颗的距离一致（±1px 取整误差）
      expect(Math.abs(Math.hypot(dx, dy) - 26)).toBeLessThanOrEqual(1)
    }
  })

  it('半径有上限：9 个重叠时不至于把圆环铺到隔壁乡镇', () => {
    const offsets = spreadOffsets(Array.from({ length: 9 }, (_, index) => `id-${index}`))
    for (const [dx, dy] of offsets.values()) {
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(55)
    }
  })
})
