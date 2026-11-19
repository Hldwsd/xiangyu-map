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
 * 几何处理：只做「坐标量化」，不做逐多边形抽稀。
 *
 * 为什么不能 DP 抽稀：相邻区县各自简化，共享的那条边界会简成两条不同的折线——
 * 画出来就是「几何切割」感，还会互相压线。量化到 3 位小数（约 110 米）不改变拓扑，
 * 相邻区县共用顶点仍然完全一致，体积也能压下来。
 */
function quantizeGeometry(geometry) {
  const round = (point) => [Number(point[0].toFixed(3)), Number(point[1].toFixed(3))]
  const roundRing = (ring) => {
    const rounded = ring.map(round)
    // 量化后可能出现连续重复点，去掉重复但保留闭环
    const deduped = rounded.filter(
      (point, index) =>
        index === 0 || point[0] !== rounded[index - 1][0] || point[1] !== rounded[index - 1][1],
    )
    if (deduped.length > 0) {
      const first = deduped[0]
      const last = deduped[deduped.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) deduped.push([...first])
    }
    return deduped
  }

  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates.map(roundRing) }
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((polygon) => polygon.map(roundRing)),
    }
  }
  return geometry
}

for (const feature of features) {
  feature.geometry = quantizeGeometry(feature.geometry)
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
  console.warn('⚠ gzip 后超过 200KB 预算，考虑降低量化精度或改用 TopoJSON 共享边界')
}
