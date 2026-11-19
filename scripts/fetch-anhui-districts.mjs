#!/usr/bin/env node
/**
 * 下载安徽省的区县级边界（16 个市各自的下辖区县），合并成一个 FeatureCollection。
 *
 * 用法：pnpm data:anhui-districts
 *
 * 为什么要它：地图上只有 16 条市界时，整块省域是一张白纸，看不出地理结构。
 * 区县界是同一份公开数据（DataV 按市查询会返回该市的下辖区县），
 * 它们不参与交互、不带标签，只作为「底图纹理」。
 *
 * 数据来源与市级底图相同（阿里云 DataV.GeoAtlas 公开接口），合规注意事项见
 * public/maps/README.md——正式上线仍需确认审图号。
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BASE = 'https://geo.datav.aliyun.com/areas_v3/bound'
const CITY_MAP = join(import.meta.dirname, '..', 'public', 'maps', 'anhui.json')
const TARGET = join(import.meta.dirname, '..', 'public', 'maps', 'anhui-districts.json')
const MIN_FEATURES = 90

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

const cityMap = JSON.parse(await readFile(CITY_MAP, 'utf8'))
const cities = cityMap.features.map((feature) => ({
  adcode: String(feature.properties.adcode),
  name: feature.properties.name,
}))
if (cities.length !== 16) fail(`市级底图里是 ${cities.length} 个市，期望 16 个`)

const features = []
const perCity = []

for (const city of cities) {
  const url = `${BASE}/${city.adcode}_full.json`
  const response = await fetch(url)
  if (!response.ok) fail(`${city.name} 下载失败：HTTP ${response.status}`)

  const parsed = await response.json()
  if (parsed?.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
    fail(`${city.name} 返回内容不是 FeatureCollection`)
  }

  const districts = parsed.features.filter((feature) => feature?.properties?.level === 'district')
  if (districts.length === 0) fail(`${city.name} 没有区县级要素（确认抓的是 _full.json）`)

  for (const district of districts) {
    features.push({
      type: 'Feature',
      properties: {
        name: district.properties.name,
        adcode: district.properties.adcode,
        city: city.name,
        level: 'district',
      },
      geometry: district.geometry,
    })
  }
  perCity.push(`${city.name} ${districts.length}`)
}

if (features.length < MIN_FEATURES) {
  fail(`只合并到 ${features.length} 个区县，少于 ${MIN_FEATURES}；数据可能不完整`)
}

/**
 * Douglas–Peucker 抽稀：区县界只是底图纹理，保留 400 米以内的形状差别就够。
 * 不抽稀的话 104 个区县原始 800KB、gzip 230KB，为了几条装饰线不划算。
 */
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

function simplifyRing(points, tolerance) {
  if (points.length <= 4) return points
  const closed = points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]
  const ring = closed ? points.slice(0, -1) : points

  const keep = new Set([0, ring.length - 1])
  const stack = [[0, ring.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()
    let maxDistance = 0
    let index = -1
    for (let i = first + 1; i < last; i += 1) {
      const distance = perpendicularDistance(ring[i], ring[first], ring[last])
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

  const simplified = [...keep].sort((a, b) => a - b).map((i) => ring[i])
  if (simplified.length < 4) return points
  return closed ? [...simplified, simplified[0]] : simplified
}

function simplifyGeometry(geometry, tolerance) {
  const { type, coordinates } = geometry
  if (type === 'Polygon') {
    return { type, coordinates: coordinates.map((ring) => simplifyRing(ring, tolerance)) }
  }
  if (type === 'MultiPolygon') {
    return {
      type,
      coordinates: coordinates.map((polygon) =>
        polygon.map((ring) => simplifyRing(ring, tolerance)),
      ),
    }
  }
  return geometry
}

const TOLERANCE = 0.004
for (const feature of features) {
  feature.geometry = simplifyGeometry(feature.geometry, TOLERANCE)
}

const collection = { type: 'FeatureCollection', features }
const payload = JSON.stringify(collection)
await mkdir(dirname(TARGET), { recursive: true })
await writeFile(TARGET, payload, 'utf8')

const bytes = Buffer.byteLength(payload)
const gzipped = gzipSync(Buffer.from(payload)).length
const sha256 = createHash('sha256').update(payload).digest('hex')

console.log(`✓ 已写入 ${TARGET}`)
console.log(`  区县要素 ${features.length}：${perCity.join(' / ')}`)
console.log(`  原始 ${(bytes / 1024).toFixed(1)} KB / gzip ${(gzipped / 1024).toFixed(1)} KB`)
console.log(`  sha256 ${sha256}`)

if (gzipped / 1024 > 200) {
  console.warn('⚠ gzip 后超过 200KB 预算，需要抽稀坐标（每 N 个点取一个）')
}
