import type { Site } from '@/types/site'

/** 一簇地标：屏幕上有重叠、单独画会互相盖住的那几个 */
export interface MarkerGroup {
  /** 簇内地标的 id，顺序与传入的 sites 一致 */
  ids: string[]
  /** 簇的锚点坐标（成员经纬度的均值，画在地图上的就是这个点） */
  lng: number
  lat: number
}

/** 像素坐标，[x, y] */
export type PixelPoint = readonly [number, number]

/** 默认聚合半径（桌面） */
export const DEFAULT_CLUSTER_GAP = 36
/** 窄屏聚合半径：屏幕小，36px 仍会留下挤在一起的小球 */
export const NARROW_CLUSTER_GAP = 48
const NARROW_MAP_WIDTH = 520

/** 按容器宽度选聚合半径；0 表示还没量到尺寸，按桌面处理 */
export function clusterGapForWidth(width: number): number {
  return width > 0 && width < NARROW_MAP_WIDTH ? NARROW_CLUSTER_GAP : DEFAULT_CLUSTER_GAP
}

/** 地标簇的稳定 key：成员 id 排序后拼接，用来在合并/拆分前后认出「同一簇」 */
export function markerClusterKey(ids: readonly string[]): string {
  return [...ids].sort().join('|')
}

/**
 * 合并/拆分的起点计算。
 *
 * - 拆分：新簇成员都来自同一个旧簇，从旧位置出发；
 * - 合并：旧簇的成员并进一个新簇，从旧位置的平均值出发；
 * - 首次出现（没有旧位置）直接落到 home。
 */
export function clusterStartPosition(
  ids: readonly string[],
  previous: ReadonlyMap<string, PixelPoint>,
  fallback: PixelPoint,
): PixelPoint {
  let sumX = 0
  let sumY = 0
  let count = 0
  for (const id of ids) {
    const point = previous.get(id)
    if (point === undefined) continue
    sumX += point[0]
    sumY += point[1]
    count += 1
  }
  return count === 0 ? fallback : [sumX / count, sumY / count]
}

/**
 * 按**屏幕像素**距离把地标合并成簇。
 *
 * 为什么在像素空间而不是经纬度空间做：地标之间会不会互相盖住，取决于当前缩放级别。
 * 同一对地标在省级视野下重叠成一颗，放大到市级就该各自独立——经纬度距离是固定的，
 * 算不出这个差别，所以用 `convertToPixel` 之后的屏幕距离。
 *
 * 合并规则是贪心：按传入顺序逐个处理，落进已有簇的质心 `minGap` 像素以内就并入，
 * 否则新开一簇。不做「全局最优聚类」是刻意的——贪心的结果对人眼足够好，
 * 而且**顺序稳定**：同样的输入永远得到同样的分组，不需要为闪烁写额外测试。
 *
 * `toPixel` 返回 null 表示这个地标当前不在视野内（被裁掉了），直接跳过：
 * 看不见的点本来也点不中，留着只会污染聚类结果。
 */
export function groupOverlappingMarkers(
  sites: Site[],
  toPixel: (site: Site) => PixelPoint | null,
  minGap: number,
): MarkerGroup[] {
  const clusters: Array<{
    sumX: number
    sumY: number
    sumLng: number
    sumLat: number
    ids: string[]
  }> = []

  for (const site of sites) {
    const point = toPixel(site)
    if (point === null) continue

    const [x, y] = point
    const hit = clusters.find((cluster) => {
      const cx = cluster.sumX / cluster.ids.length
      const cy = cluster.sumY / cluster.ids.length
      return Math.hypot(cx - x, cy - y) <= minGap
    })

    if (hit === undefined) {
      clusters.push({
        sumX: x,
        sumY: y,
        sumLng: site.location.lng,
        sumLat: site.location.lat,
        ids: [site.id],
      })
      continue
    }

    hit.sumX += x
    hit.sumY += y
    hit.sumLng += site.location.lng
    hit.sumLat += site.location.lat
    hit.ids.push(site.id)
  }

  return clusters.map((cluster) => ({
    ids: cluster.ids,
    lng: cluster.sumLng / cluster.ids.length,
    lat: cluster.sumLat / cluster.ids.length,
  }))
}
