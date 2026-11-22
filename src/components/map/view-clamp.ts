/**
 * 地图视野夹取：把「中心点」限制在「当前缩放下的可平移范围」内。
 *
 * 为什么需要它：拖动（roam）本身可以把地图拖到只剩空白。夹取不能只用一个固定的经纬度框——
 * 放大后可见的经纬度跨度会变小，固定框会让省域四角永远到不了（例如 8 倍时看不到砀山）。
 * 所以这里按「视口像素 / 每度像素」算出可见半幅，再让中心在「省域外框内缩半幅」的区间里移动。
 */

export type LngLat = [number, number]
export type BBox = [LngLat, LngLat]

export interface ViewClampInput {
  /** 期望的中心点（拖动后的位置） */
  center: LngLat
  /** 目标缩放 */
  zoom: number
  /** 当前缩放（pxPerLng / pxPerLat 是对应当前缩放的像素密度） */
  currentZoom: number
  /** 省域外框：[[minLng, minLat], [maxLng, maxLat]] */
  bbox: BBox
  viewport: { width: number; height: number }
  /** 当前缩放下，经度每 1° 对应的像素 */
  pxPerLng: number
  /** 当前缩放下，纬度每 1° 对应的像素 */
  pxPerLat: number
}

function clampAxis(value: number, min: number, max: number, half: number): number {
  if (half * 2 >= max - min) return (min + max) / 2
  return Math.min(max - half, Math.max(min + half, value))
}

export function clampViewCenter(input: ViewClampInput): LngLat {
  const { center, zoom, currentZoom, bbox, viewport, pxPerLng, pxPerLat } = input
  if (pxPerLng <= 0 || pxPerLat <= 0 || currentZoom <= 0 || zoom <= 0) return center

  const [[minLng, minLat], [maxLng, maxLat]] = bbox
  // 同一视口，放大越多，能看到的经纬度跨度越小
  const zoomRatio = zoom / currentZoom
  const halfLng = viewport.width / (pxPerLng * zoomRatio) / 2
  const halfLat = viewport.height / (pxPerLat * zoomRatio) / 2

  return [
    clampAxis(center[0], minLng, maxLng, halfLng),
    clampAxis(center[1], minLat, maxLat, halfLat),
  ]
}
