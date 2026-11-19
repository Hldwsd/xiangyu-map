#!/usr/bin/env node
/**
 * 下载安徽省主要湖泊的水面轮廓（OpenStreetMap，Overpass API）。
 *
 * 用法：pnpm data:anhui-water
 *
 * 为什么只收湖泊、不收河流：河流在 OSM 里是横贯省界的长线，抽稀与拼接成本高、
 * 视觉收益小；湖泊是面，能与区县界形成「陆地 / 水域」的层次。
 *
 * 许可证：OSM 数据是 ODbL，正式发布需要在页面上署名 OpenStreetMap contributors。
 * 这里的用途是开发期底图纹理，正式上线前与审图号一并确认（见 public/maps/README.md）。
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const TARGET = join(import.meta.dirname, '..', 'public', 'maps', 'anhui-water.json')
const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const BBOX = '29.2,114.6,35.0,119.9'
const LAKES = [
  '巢湖',
  '万佛湖',
  '太平湖',
  '花亭湖',
  '升金湖',
  '菜子湖',
  '焦岗湖',
  '女山湖',
  '龙子湖',
  '八里河',
]

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const nameRegex = `^(${LAKES.join('|')})$`
const query = `[out:json][timeout:120];
(
  relation["natural"="water"]["name"~"${nameRegex}"](${BBOX});
  way["natural"="water"]["name"~"${nameRegex}"](${BBOX});
);
out geom;`

console.log(`查询 Overpass：${LAKES.join('、')}`)
const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
    'user-agent': 'xiangyu-map/0.1 (development; contact: repo owner)',
  },
  body: `data=${encodeURIComponent(query)}`,
})
if (!response.ok) fail(`Overpass 返回 HTTP ${response.status}`)

const data = await response.json()
const elements = Array.isArray(data.elements) ? data.elements : []
if (elements.length === 0) fail('Overpass 没有返回任何要素')

/** 把 [lat, lon] 转成 GeoJSON 的 [lon, lat]，并被截断到 5 位小数 */
function toLonLat(points) {
  return points.map((point) => [Number(point.lon.toFixed(5)), Number(point.lat.toFixed(5))])
}

function samePoint(a, b) {
  return a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1]
}

/** 把若干段首尾相接的线拼成闭环；拼不上就丢掉（宁可少一条湖，也不要画错） */
function assembleRing(segments) {
  const remaining = segments.map((segment) => [...segment])
  const ring = []

  let current = remaining.shift()
  if (current === undefined) return null
  ring.push(...current)

  while (remaining.length > 0) {
    const tail = ring.at(-1)
    if (samePoint(tail, ring[0])) return ring

    const index = remaining.findIndex(
      (segment) => samePoint(segment[0], tail) || samePoint(segment.at(-1), tail),
    )
    if (index === -1) return null

    const [segment] = remaining.splice(index, 1)
    if (samePoint(segment[0], tail)) ring.push(...segment.slice(1))
    else ring.push(...[...segment].reverse().slice(1))
  }

  return samePoint(ring.at(-1), ring[0]) ? ring : null
}

/** Douglas–Peucker：湖面轮廓保留 100 米内的形状差别即可 */
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
  if (points.length <= 4) return points
  const keep = new Set([0, points.length - 1])
  const stack = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()
    let maxDistance = 0
    let index = -1
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicularDistance(points[i], points[first], points[last])
      if (distance > maxDistance) {
        maxDistance = distance
        index = i
      }
    }
    if (maxDistance > tolerance && index !== -1) {
      keep.add(index)
      stack.push([first, index], [index, last])
    }
  }
  const simplified = [...keep].sort((a, b) => a - b).map((i) => points[i])
  return simplified.length >= 4 ? simplified : points
}

const TOLERANCE = 0.001
const features = []
const collected = new Set()

for (const element of elements) {
  const name = element.tags?.name
  if (typeof name !== 'string' || collected.has(name)) continue

  let rings = []
  if (element.type === 'way' && Array.isArray(element.geometry)) {
    const ring = toLonLat(element.geometry)
    rings = samePoint(ring.at(-1), ring[0]) ? [ring] : []
  } else if (element.type === 'relation' && Array.isArray(element.members)) {
    const outers = element.members
      .filter((member) => member.type === 'way' && member.role !== 'inner' && member.geometry)
      .map((member) => toLonLat(member.geometry))
    const assembled = assembleRing(outers)
    rings = assembled === null ? [] : [assembled]
  }

  if (rings.length === 0) {
    console.warn(`  ⚠ ${name}：轮廓拼不成闭环，跳过`)
    continue
  }

  collected.add(name)
  features.push({
    type: 'Feature',
    properties: { name, source: 'OpenStreetMap' },
    geometry: {
      type: 'Polygon',
      coordinates: [simplify(rings[0], TOLERANCE)],
    },
  })
}

if (features.length === 0) fail('没有任何湖泊轮廓可用')

const collection = { type: 'FeatureCollection', features }
const payload = JSON.stringify(collection)
await mkdir(dirname(TARGET), { recursive: true })
await writeFile(TARGET, payload, 'utf8')

const gzipped = gzipSync(Buffer.from(payload)).length
const sha256 = createHash('sha256').update(payload).digest('hex')

console.log(`✓ 已写入 ${TARGET}`)
console.log(`  湖泊 ${features.length}：${features.map((f) => f.properties.name).join('、')}`)
console.log(
  `  原始 ${(Buffer.byteLength(payload) / 1024).toFixed(1)} KB / gzip ${(gzipped / 1024).toFixed(1)} KB`,
)
console.log(`  sha256 ${sha256}`)
