import { describe, expect, it } from 'vitest'

import { clampViewCenter, type BBox } from '@/components/map/view-clamp'

/** 安徽省外框（与 public/maps/anhui.json 的 bbox 一致） */
const ANHUI: BBox = [
  [114.883371, 29.395253],
  [119.649144, 34.650809],
]

describe('clampViewCenter', () => {
  it('放大后能把省域边缘拖到窗口中心：中心纬度可以到北界', () => {
    const north = clampViewCenter([117.3, 35.2], ANHUI)

    // 北界 34.6508 → 中心允许等于它，边缘正好落在窗口中心
    expect(north[1]).toBeCloseTo(34.650809, 5)
    expect(north[1]).toBeGreaterThan(34.294)
  })

  it('南、西、东三边同样能到窗口中心', () => {
    expect(clampViewCenter([117.3, 28.8], ANHUI)[1]).toBeCloseTo(29.395253, 5)
    expect(clampViewCenter([114.2, 31.8], ANHUI)[0]).toBeCloseTo(114.883371, 5)
    expect(clampViewCenter([120.3, 31.8], ANHUI)[0]).toBeCloseTo(119.649144, 5)
  })

  it('外框内的中心原样保留，拖动不会被反复改写', () => {
    expect(clampViewCenter([117.3, 31.8], ANHUI)).toEqual([117.3, 31.8])
  })

  it('缩到最小也不会把地图拖出外框（中心仍被夹在外框内）', () => {
    const extreme = clampViewCenter([113.0, 36.0], ANHUI)
    expect(extreme[0]).toBeGreaterThanOrEqual(ANHUI[0][0])
    expect(extreme[0]).toBeLessThanOrEqual(ANHUI[1][0])
    expect(extreme[1]).toBeGreaterThanOrEqual(ANHUI[0][1])
    expect(extreme[1]).toBeLessThanOrEqual(ANHUI[1][1])
  })
})
