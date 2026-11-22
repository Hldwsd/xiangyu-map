import { describe, expect, it } from 'vitest'

import { clampViewCenter, type BBox } from '@/components/map/view-clamp'

/** 安徽省外框（与 public/maps/anhui.json 的 bbox 一致） */
const ANHUI: BBox = [
  [114.883371, 29.395253],
  [119.649144, 34.650809],
]

/** 1264×805 视口、1 倍缩放的像素密度；放大后按 zoom 线性缩放（实测 8 倍为 845.11 / 1126.82） */
const PX_AT_1 = { lng: 845.11 / 8, lat: 1126.82 / 8 }

function clamp(center: [number, number], zoom: number) {
  return clampViewCenter({
    center,
    zoom,
    currentZoom: zoom,
    bbox: ANHUI,
    viewport: { width: 1264, height: 805 },
    pxPerLng: PX_AT_1.lng * zoom,
    pxPerLat: PX_AT_1.lat * zoom,
  })
}

describe('clampViewCenter', () => {
  it('放大到 8 倍时，南北两端都能拖到：以前的固定框会卡在 33.9 / 30.2', () => {
    const north = clamp([117.3, 34.8], 8)
    const south = clamp([117.3, 29.2], 8)

    // 省域北界 34.65，可见半幅约 0.357° → 中心最多到 ~34.29
    expect(north[1]).toBeCloseTo(34.294, 2)
    expect(north[1]).toBeGreaterThan(33.9)
    // 南界 29.395 + 半幅 → ~29.752
    expect(south[1]).toBeCloseTo(29.752, 2)
    expect(south[1]).toBeLessThan(30.2)
  })

  it('放大到 8 倍时，东西两端也能拖到（不再止步于 115.4 / 119.1）', () => {
    const west = clamp([114.5, 31.8], 8)
    const east = clamp([120.0, 31.8], 8)

    expect(west[0]).toBeCloseTo(115.631, 2)
    expect(east[0]).toBeCloseTo(118.901, 2)
  })

  it('缩到视野比省域还大时，固定在省域中心，不出现大片空白', () => {
    const result = clamp([114.5, 29.2], 1)
    expect(result[0]).toBeCloseTo((ANHUI[0][0] + ANHUI[1][0]) / 2, 4)
    expect(result[1]).toBeCloseTo((ANHUI[0][1] + ANHUI[1][1]) / 2, 4)
  })

  it('在可移动范围内不动，避免每次 roam 都抖动', () => {
    const center: [number, number] = [117.3, 31.8]
    expect(clamp(center, 3)).toEqual(center)
  })

  it('像素密度异常时原样返回，不产生 NaN', () => {
    const result = clampViewCenter({
      center: [117, 31],
      zoom: 2,
      currentZoom: 2,
      bbox: ANHUI,
      viewport: { width: 1264, height: 805 },
      pxPerLng: 0,
      pxPerLat: 0,
    })
    expect(result).toEqual([117, 31])
  })
})
