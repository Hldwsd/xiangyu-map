/**
 * 地图视野夹取：把中心点限制在省域外框内。
 *
 * 放大后要能把省域边缘拖到窗口正中心，所以夹取范围就是外框本身，
 * 不能再按「视口半幅」内缩（那会让边缘永远只能停在屏幕边上）。
 * 代价是缩得很小时可以把地图拖偏、露出部分空白；用户可以再拖回来。
 */

export type LngLat = [number, number]
export type BBox = [LngLat, LngLat]

export function clampViewCenter(center: LngLat, bbox: BBox): LngLat {
  const [[minLng, minLat], [maxLng, maxLat]] = bbox
  const clampAxis = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value))

  return [clampAxis(center[0], minLng, maxLng), clampAxis(center[1], minLat, maxLat)]
}
