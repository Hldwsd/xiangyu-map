import { describe, expect, it } from 'vitest'

import {
  clusterGapForWidth,
  DEFAULT_CLUSTER_GAP,
  groupOverlappingMarkers,
  NARROW_CLUSTER_GAP,
  type PixelPoint,
} from '@/components/map/cluster-sites'
import { sites } from '@/data/sites'

/** 每个项目按数据顺序排成一行，间距可调 */
function rowProjection(gap: number) {
  return (site: { id: string }): PixelPoint => {
    const index = sites.findIndex((item) => item.id === site.id)
    return [index * gap, 0]
  }
}

describe('groupOverlappingMarkers', () => {
  it('像素距离大于阈值时不合并', () => {
    const groups = groupOverlappingMarkers(sites, rowProjection(100), 15)

    expect(groups).toHaveLength(sites.length)
    expect(groups.every((group) => group.ids.length === 1)).toBe(true)
  })

  it('落在阈值内的地标并进同一组', () => {
    const groups = groupOverlappingMarkers(sites, () => [40, 40], 15)

    expect(groups).toHaveLength(1)
    expect(groups[0]?.ids).toHaveLength(sites.length)
  })

  it('阈值是「到簇质心」的距离，不是相邻两点的距离', () => {
    // 每颗之间 14px，但 3 颗的质心离两端 14px、离中间 0——串会继续并下去，
    // 直到某一颗离质心超过阈值才另起一簇。这里只断言「不会每颗都独立」。
    const groups = groupOverlappingMarkers(sites.slice(0, 3), rowProjection(14), 15)

    expect(groups.length).toBeLessThan(3)
  })

  it('锚点用成员经纬度的均值', () => {
    const pair = sites.slice(0, 2)
    const groups = groupOverlappingMarkers(pair, () => [40, 40], 15)

    expect(groups).toHaveLength(1)
    const expected = ((pair[0]?.location.lng ?? 0) + (pair[1]?.location.lng ?? 0)) / 2
    expect(groups[0]?.lng).toBeCloseTo(expected, 6)
  })

  it('不在视野内的点（投影返回 null）被跳过，不污染分组', () => {
    const groups = groupOverlappingMarkers(
      sites,
      (site) => (site.id === 'hongcun' ? null : [0, 0]),
      15,
    )

    const ids = groups.flatMap((group) => group.ids)
    expect(ids).not.toContain('hongcun')
    expect(ids).toHaveLength(sites.length - 1)
  })

  it('同样的输入永远得到同样的分组（顺序稳定，不会闪烁）', () => {
    const first = groupOverlappingMarkers(sites, rowProjection(10), 15)
    const second = groupOverlappingMarkers(sites, rowProjection(10), 15)

    expect(second).toEqual(first)
  })

  it('空输入返回空数组', () => {
    expect(groupOverlappingMarkers([], () => [0, 0], 15)).toEqual([])
  })
})

describe('窄屏聚合半径', () => {
  it('窄屏用更大的聚合半径，桌面保持 36px', () => {
    expect(clusterGapForWidth(360)).toBe(NARROW_CLUSTER_GAP)
    expect(clusterGapForWidth(430)).toBe(NARROW_CLUSTER_GAP)
    expect(clusterGapForWidth(1024)).toBe(DEFAULT_CLUSTER_GAP)
    expect(clusterGapForWidth(0)).toBe(DEFAULT_CLUSTER_GAP)
  })
})
