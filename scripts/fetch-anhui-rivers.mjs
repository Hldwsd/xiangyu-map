#!/usr/bin/env node
/**
 * 下载长江与淮河在安徽段的河道线（OpenStreetMap，Overpass API）。
 *
 * 用法：pnpm data:anhui-rivers
 *
 * 为什么是「线」而不是「面」：大江大河在 OSM 里是一条中心线（waterway=river），
 * 河道面要拼几百个 way，成本高、收益低；地图上画一条细线足够表达「水系骨架」。
 *
 * 许可证：OSM 数据是 ODbL，发布时需要署名 OpenStreetMap contributors（见 public/maps/README.md）。
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const TARGET = join(import.meta.dirname, '..', 'public', 'maps', 'anhui-rivers.json')
const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const BBOX = '29.2,114.6,35.0,119.9'
const RIVERS = { 长江: 2.6, 淮河: 2.2 }
const CITY_MAP = join(import.meta.dirname, '..', 'public', 'maps', 'anhui.json')

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const nameRegex = `^(${Object.keys(RIVERS).join('|')})$`
const query = `[out:json][timeout:120];
(
  way["waterway"="river"]["name"~"${nameRegex}"](${BBOX});
  relation["waterway"="river"]["name"~"${nameRegex}"](${BBOX});
);
out geom;`

console.log(`查询 Overpass：${Object.keys(RIVERS).join('、')}`)
let response
for (let attempt = 1; attempt <= 3; attempt += 1) {
  response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'xiangyu-map/0.1 (development; contact: repo owner)',
    },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (response.ok) break
  console.warn(`  第 ${attempt} 次请求失败：HTTP ${response.status}，退避重试`)
  await new Promise((resolve) => setTimeout(resolve, attempt * 3000))
}
if (response === undefined || !response.ok) {
  fail(`Overpass 连续失败：HTTP ${response?.status ?? '无响应'}`)
}

const data = await response.json()
const elements = Array.isArray(data.elements) ? data.elements : []
if (elements.length === 0) fail('Overpass 没有返回任何河道')

/** Douglas–Peucker：河道线保留 200 米内的形状差别即可 */
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
  if (points.length <= 2) return points
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
  return [...keep].sort((a, b) => a - b).map((i) => points[i])
}

/**
 * 只保留落在安徽省内的河段。
 *
 * 长江、淮河在 OSM 里是横贯数省的长线，直接画会把湖北、江西、江苏的河道一起画进来。
 * 这里用「点在 16 个市域多边形内」的射线法逐顶点判断，保留连续的内点段；
 * 跨省界的段会被切成若干小段，视觉上停在省界上。
 */
const cityMap = JSON.parse(await readFile(CITY_MAP, 'utf8'))

function ringsOf(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

const cityRings = cityMap.features.flatMap((feature) =>
  ringsOf(feature.geometry).map((ring) => ring.map(([lng, lat]) => [lng, lat])),
)

function pointInRing(point, ring) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function insideAnhui(point) {
  return cityRings.some((ring) => pointInRing(point, ring))
}

function clipToAnhui(coordinates) {
  const runs = []
  let current = []
  for (const point of coordinates) {
    if (insideAnhui(point)) {
      current.push(point)
      continue
    }
    if (current.length >= 2) runs.push(current)
    current = []
  }
  if (current.length >= 2) runs.push(current)
  return runs
}

const TOLERANCE = 0.002
const features = []
let segmentCount = 0

for (const element of elements) {
  const name = element.tags?.name
  if (typeof name !== 'string') continue

  const lines = []
  if (element.type === 'way' && Array.isArray(element.geometry)) {
    lines.push(element.geometry)
  } else if (element.type === 'relation' && Array.isArray(element.members)) {
    for (const member of element.members) {
      if (member.type === 'way' && Array.isArray(member.geometry)) lines.push(member.geometry)
    }
  }

  for (const line of lines) {
    if (line.length < 2) continue
    const coordinates = simplify(
      line.map((point) => [Number(point.lon.toFixed(4)), Number(point.lat.toFixed(4))]),
      TOLERANCE,
    )
    if (coordinates.length < 2) continue

    for (const run of clipToAnhui(coordinates)) {
      segmentCount += 1
      features.push({
        type: 'Feature',
        properties: { name, width: RIVERS[name], source: 'OpenStreetMap' },
        geometry: { type: 'LineString', coordinates: run },
      })
    }
  }
}

if (features.length === 0) fail('没有可用的河道线段')

const collection = { type: 'FeatureCollection', features }
const payload = JSON.stringify(collection)
await mkdir(dirname(TARGET), { recursive: true })
await writeFile(TARGET, payload, 'utf8')

const gzipped = gzipSync(Buffer.from(payload)).length
const sha256 = createHash('sha256').update(payload).digest('hex')

console.log(`✓ 已写入 ${TARGET}`)
console.log(`  河道线段 ${segmentCount}（${Object.keys(RIVERS).join(' / ')}）`)
console.log(
  `  原始 ${(Buffer.byteLength(payload) / 1024).toFixed(1)} KB / gzip ${(gzipped / 1024).toFixed(1)} KB`,
)
console.log(`  sha256 ${sha256}`)
