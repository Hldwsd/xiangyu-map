#!/usr/bin/env node
/**
 * 生成品牌页（/brand/）用的省界 SVG 路径与 16 市轮廓。
 *
 *   node scripts/build-brand-geo.mjs
 *   → src/brand/geo.generated.ts
 *
 * 底图与 app 共用 public/maps 下的 GeoJSON，避免品牌页单独维护一份几何；
 * 品牌页是静态 SVG，需要「一次投影 + 抽稀」的结果，所以在仓库里预生成。
 *
 * 投影是等距圆柱的简化版（x 乘 cos(中纬度)），与 ECharts geo 的视觉比例接近；
 * 抽稀用 Douglas–Peucker，1px 以内的小抖动在 640 宽的画布里看不出来，
 * 却能把路径体积压掉一半以上。文件是**生成物**：不要手改，改脚本再跑。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUTLINE_FILE = join(ROOT, 'public/maps/anhui-outline.json')
const MAP_FILE = join(ROOT, 'public/maps/anhui.json')
const WATER_FILE = join(ROOT, 'public/maps/anhui-water.json')
const RIVERS_FILE = join(ROOT, 'public/maps/anhui-rivers.json')
const OUTPUT_FILE = join(ROOT, 'src/brand/geo.generated.ts')

/** 画布：高度固定 800，宽度按安徽的经纬跨度算，四周留一点内边距 */
const HEIGHT = 800
const PADDING = 8
/** 抽稀容差（画布像素） */
const TOLERANCE = 0.6

const readGeo = (path) => JSON.parse(readFileSync(path, 'utf8'))

/** 收集一个 feature 的所有环 */
function collectRings(feature) {
  const { type, coordinates } = feature.geometry
  if (type === 'Polygon') return coordinates
  if (type === 'MultiPolygon') return coordinates.flat()
  throw new Error(`不支持的几何类型：${type}`)
}

const outline = readGeo(OUTLINE_FILE)
const map = readGeo(MAP_FILE)

const outlineRings = outline.features.flatMap(collectRings)
const allPoints = outlineRings.flat()

const minLng = Math.min(...allPoints.map((p) => p[0]))
const maxLng = Math.max(...allPoints.map((p) => p[0]))
const minLat = Math.min(...allPoints.map((p) => p[1]))
const maxLat = Math.max(...allPoints.map((p) => p[1]))

const midLat = (minLat + maxLat) / 2
const lonScale = Math.cos((midLat * Math.PI) / 180)
const spanX = (maxLng - minLng) * lonScale
const spanY = maxLat - minLat
const scale = (HEIGHT - PADDING * 2) / spanY
const width = Math.round(spanX * scale + PADDING * 2)

/**
 * 经纬度 → 画布坐标。品牌页的 70 个地标点也用这套参数在运行期投影，
 * 所以把参数原样导出，别在别处再算一遍。
 */
function project([lng, lat]) {
  return [PADDING + (lng - minLng) * lonScale * scale, PADDING + (maxLat - lat) * scale]
}

/** 点到线段的垂距，Douglas–Peucker 用 */
function perpendicularDistance(point, start, end) {
  const [x, y] = point
  const [x1, y1] = start
  const [x2, y2] = end
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1)
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
  const clamped = Math.max(0, Math.min(1, t))
  return Math.hypot(x - (x1 + clamped * dx), y - (y1 + clamped * dy))
}

function simplify(points, tolerance) {
  if (points.length < 3) return points
  const first = points[0]
  const last = points[points.length - 1]
  let index = -1
  let maxDistance = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], first, last)
    if (distance > maxDistance) {
      maxDistance = distance
      index = i
    }
  }
  if (maxDistance <= tolerance) return [first, last]
  const left = simplify(points.slice(0, index + 1), tolerance)
  const right = simplify(points.slice(index), tolerance)
  return left.slice(0, -1).concat(right)
}

const round = (value) => Math.round(value * 10) / 10

/** 闭合环：投影 → 抽稀 → 压到 1 位小数 */
function ringToPath(points) {
  const projected = points.map(project)
  const simplified = simplify(projected, TOLERANCE)
  const last = simplified[simplified.length - 1]
  const first = simplified[0]
  const closed = last[0] === first[0] && last[1] === first[1] ? simplified : [...simplified, first]
  return `M${closed.map(([x, y]) => `${round(x)},${round(y)}`).join('L')}Z`
}

/** 折线：不闭合，抽稀容差略大（河道只要气势，不要每个拐弯） */
function lineToPath(points) {
  const simplified = simplify(points.map(project), TOLERANCE * 1.8)
  return `M${simplified.map(([x, y]) => `${round(x)},${round(y)}`).join('L')}`
}

/** 湖泊水面与河道线：品牌页只做点缀，不追求与 app 完全一致的图层语义 */
function collectLineStrings(feature) {
  const { type, coordinates } = feature.geometry
  if (type === 'LineString') return [coordinates]
  if (type === 'MultiLineString') return coordinates
  return []
}

const provincePath = outlineRings.map(ringToPath).join('')

const cityShapes = map.features.map((feature) => {
  const rings = collectRings(feature)
  const [x, y] = project(feature.properties.center)
  return {
    name: feature.properties.name,
    d: rings.map(ringToPath).join(''),
    x: round(x),
    y: round(y),
  }
})

const water = readGeo(WATER_FILE)
const rivers = readGeo(RIVERS_FILE)

const waterPaths = water.features.flatMap((feature) =>
  collectRings(feature).map((ring) => ringToPath(ring)),
)
const riverPaths = rivers.features.flatMap((feature) =>
  collectLineStrings(feature).map((line) => lineToPath(line)),
)

const body = `/**
 * \`scripts/build-brand-geo.mjs\` 生成，**不要手改**。
 *
 * 来源：public/maps/anhui-outline.json（省界）与 public/maps/anhui.json（16 市），
 * 均为 DataV.GeoAtlas 的公开数据；坐标是 GCJ-02，投影参数见 GEO_PROJECTION。
 */
export interface GeoProjection {
  readonly width: number
  readonly height: number
  readonly minLng: number
  readonly maxLat: number
  readonly lonScale: number
  readonly scale: number
  readonly padding: number
}

export interface CityShape {
  readonly name: string
  readonly d: string
  /** 市行政中心在画布上的位置 */
  readonly x: number
  readonly y: number
}

export const GEO_PROJECTION: GeoProjection = {
  width: ${width},
  height: ${HEIGHT},
  minLng: ${minLng},
  maxLat: ${maxLat},
  lonScale: ${round(lonScale * 1e6) / 1e6},
  scale: ${round(scale * 1e6) / 1e6},
  padding: ${PADDING},
}

/** 经纬度 → 画布坐标（与生成脚本同一套投影） */
export function projectGeo(lng: number, lat: number): [number, number] {
  const { minLng: lng0, maxLat: lat0, lonScale: k, scale: s, padding } = GEO_PROJECTION
  return [Math.round((padding + (lng - lng0) * k * s) * 10) / 10, Math.round((padding + (lat0 - lat) * s) * 10) / 10]
}

export const PROVINCE_OUTLINE = '${provincePath}'

export const CITY_SHAPES: readonly CityShape[] = [
${cityShapes
  .map((city) => `  { name: '${city.name}', x: ${city.x}, y: ${city.y}, d: '${city.d}' },`)
  .join('\n')}
]

/** 9 片主要湖泊的水面（OSM，ODbL） */
export const WATER_PATHS: readonly string[] = [
${waterPaths.map((d) => `  '${d}',`).join('\n')}
]

/** 长江、淮河在省域内的河道（OSM，ODbL） */
export const RIVER_PATHS: readonly string[] = [
${riverPaths.map((d) => `  '${d}',`).join('\n')}
]
`

writeFileSync(OUTPUT_FILE, body, 'utf8')

console.log(
  `写出 ${OUTPUT_FILE.replace(`${ROOT}/`, '')}：${(Buffer.byteLength(body) / 1024).toFixed(1)} KB`,
)
console.log(
  `画布 ${width}×${HEIGHT}；省界 ${outlineRings.length} 环 / ${provincePath.length} 字符；16 市合计 ${cityShapes.reduce((n, c) => n + c.d.length, 0)} 字符`,
)
