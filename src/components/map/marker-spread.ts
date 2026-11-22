/**
 * 重叠地标的散开布局。
 *
 * 地图上同一个县可能有四五个项目，坐标只差几百米；36px 的针直接叠在一起，
 * 点谁都可能点错。这里把同一组地标排在一个小圆环上（按 id 排序保证角度稳定），
 * 圆环半径按「相邻两颗刚好不压住」估算：周长 2πr ≥ n × 针宽。
 */

export type MarkerOffset = [number, number]

/** 与默认地标直径一致；散开后的相邻距离不应小于它 */
const MARKER_GAP = 36
/** 圆环半径上限：再大就会盖到隔壁乡镇的项目 */
const MAX_RADIUS = 54
const MIN_RADIUS = 26

export function spreadOffsets(ids: readonly string[], gap = MARKER_GAP): Map<string, MarkerOffset> {
  const result = new Map<string, MarkerOffset>()
  const count = ids.length
  if (count < 2) return result

  const radius = Math.min(
    MAX_RADIUS,
    Math.max(MIN_RADIUS, Math.round((gap * count) / (2 * Math.PI))),
  )

  for (let index = 0; index < count; index += 1) {
    const id = ids[index]
    if (id === undefined) continue
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2
    result.set(id, [Math.round(radius * Math.cos(angle)), Math.round(radius * Math.sin(angle))])
  }

  return result
}
