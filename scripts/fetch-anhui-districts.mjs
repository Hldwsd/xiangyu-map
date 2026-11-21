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
      city: city.name,
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
 * 几何处理：**保留 DataV 的原始拓扑，只做每顶点四舍五入到 3 位小数（约 111 米）**。
 *
 * 之前为了省体积做过「按多边形抽稀」，相邻区县共享的边界会各简一次、落点不一致，
 * 画出来既有缝隙又有压线——这就是用户说的「几何切割感」。
 * 逐顶点四舍五入是确定性的：共享顶点在两边得到完全相同的值，边界依然严丝合缝。
 *
 * 3 位小数在省域默认视野下约 0.2px、放到最大 8 倍约 1.8px：
 * 区县界只是 0.7px 的底图纹理，这个量化步长看不出来；4 位小数则要多 60KB 传输。
 *
 * 属性只留 name 与 level（adcode、city 在渲染里用不到）。
 */
const PRECISION = 3
const SCALE = 10 ** PRECISION

function roundCoord(value) {
  return Math.round(value * SCALE) / SCALE
}

function roundCoords(coords) {
  if (typeof coords[0] === 'number') return [roundCoord(coords[0]), roundCoord(coords[1])]
  return coords.map(roundCoords)
}

function stripFeature(feature) {
  const geometry = feature.geometry
    ? { type: feature.geometry.type, coordinates: roundCoords(feature.geometry.coordinates) }
    : null
  return {
    type: 'Feature',
    properties: { name: feature.properties?.name, level: 'district' },
    geometry,
  }
}

const tagged = features.map((feature) => stripFeature(feature))

const collection = { type: 'FeatureCollection', features: tagged }
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

if (gzipped / 1024 > 300) {
  console.warn('⚠ gzip 后超过 300KB，考虑改为 TopoJSON 或按缩放级别懒加载')
}
