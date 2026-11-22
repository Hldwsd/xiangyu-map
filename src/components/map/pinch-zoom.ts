/**
 * 双指缩放的手感曲线。
 *
 * ECharts 原生 pinch 是 1:1 映射：两指距离变化 20%，地图就放大 20%。
 * 手机屏幕上这种「线性」很敏感，轻轻一捏就跳一大截。这里用指数阻尼：
 * 缩放比 = (两指距离比)^damping，damping < 1 时同样的手势只放大一部分。
 */

export interface PinchZoomOptions {
  min: number
  max: number
  /** 0–1：越小越不敏感；默认 0.75，20% 的手势 ≈ 15% 的缩放 */
  damping?: number
}

export function pinchZoom(
  startZoom: number,
  distanceRatio: number,
  options: PinchZoomOptions,
): number {
  const { min, max, damping = 0.75 } = options
  if (!Number.isFinite(startZoom) || startZoom <= 0) return startZoom
  if (!Number.isFinite(distanceRatio) || distanceRatio <= 0) return startZoom

  const zoom = startZoom * distanceRatio ** damping
  return Math.min(max, Math.max(min, zoom))
}
