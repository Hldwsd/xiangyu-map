#!/usr/bin/env node
/**
 * 地标位置与底图一致性检查。
 *
 * `site.city` 只校验「是 16 个地级市之一」（src/types/site.ts 的契约），
 * `location` 只过安徽经纬度外框（src/utils/region.ts 的 ANHUI_BBOX）。
 * 两个校验都没有碰底图 GeoJSON，所以「站点落在声称的市里」没有自动化闸门。
 *
 * 这个脚本把它变成一条命令，以 `public/maps/anhui.json`（16 个市的轮廓）
 * 为准，逐个地标检查：
 *   1. 底图是否有它声称的城市要素；
 *   2. 点是否落在自身城市的轮廓内（Polygon / MultiPolygon）；
 *   3. 点落在别的城市轮廓里时同样报告（市名或坐标可能写偏）。
 *
 * 用法：
 *   node scripts/check-sites-map.mjs
 *   node scripts/check-sites-map.mjs --map=public/maps/anhui.json
 *
 * 退出码：有上述问题 1，全部一致 0。落在自己城市边界上的点也会进
 * `outside`（判点在多边形内时接近零的算边），人工确认过可选择在 PR 里说明。
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sites } from '../src/data/sites.ts'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const mapArg = process.argv.find((arg) => arg.startsWith('--map='))
const MAP_PATH = mapArg ? mapArg.slice('--map='.length) : join(ROOT, 'public', 'maps', 'anhui.json')

/** 射线法：点在闭合环内返回 true（边上按内处理） */
function pointInRing(point, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const [x, y] = point
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Polygon（rings 数组）或 MultiPolygon（polygons 数组的数组）统一处理 */
function pointInPolygons(point, polygons) {
  return polygons.some((polygon) => polygon.some((ring) => pointInRing(point, ring)))
}

/** 把底图的 FeatureCollection 按城市名归类，多边形都取出来 */
function buildCityPolygons(features) {
  const map = new Map()
  for (const feature of features ?? []) {
    const name = feature.properties?.name
    if (typeof name !== 'string') continue
    const geometry = feature.geometry
    if (geometry?.type !== 'Polygon' && geometry?.type !== 'MultiPolygon') continue
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : (geometry.coordinates ?? [])
    map.set(name, [...(map.get(name) ?? []), ...polys])
  }
  return map
}

const raw = await readFile(MAP_PATH, 'utf8')
const parsed = JSON.parse(raw)
const cityPolygons = buildCityPolygons(parsed.features)

/** 缺在底图里的城市、落到别的市里的点 */
const missingCity = []
const insideOthers = []
let outside = 0
let checked = 0

for (const site of sites) {
  const polygons = cityPolygons.get(site.city)
  if (polygons === undefined || polygons.length === 0) {
    missingCity.push(site)
    continue
  }
  checked += 1
  const point = [site.location.lng, site.location.lat]
  if (pointInPolygons(point, polygons)) continue

  const others = [...cityPolygons.entries()]
    .filter(([name, polys]) => name !== site.city && pointInPolygons(point, polys))
    .map(([name]) => name)
  if (others.length > 0) {
    insideOthers.push({ site, point, others })
  } else {
    outside += 1
    insideOthers.push({ site, point, others: [] })
  }
}

const outsideOnly = insideOthers.filter((entry) => entry.others.length === 0)
console.log(`地标位置与底图一致性检查：${sites.length} 条地标，底图 ${parsed.features?.length ?? 0} 要素\n`)

if (missingCity.length > 0) {
  console.log('✗ 底图缺少对应城市要素：')
  for (const site of missingCity) console.log(`  - ${site.id}（${site.city}，${site.location.lng}, ${site.location.lat}）`)
}
if (outsideOnly.length > 0) {
  console.log('✗ 坐标落在声称城市的轮廓之外：')
  for (const { site, point } of outsideOnly) {
    console.log(`  - ${site.id}（${site.city}）：${point[0].toFixed(3)}, ${point[1].toFixed(3)}`)
  }
}
if (insideOthers.length > 0) {
  console.log('⚠ 坐标落在其它城市轮廓内（市名或坐标可能写偏）：')
  for (const { site, point, others } of insideOthers) {
    console.log(`  - ${site.id}（声称 ${site.city}，${point[0].toFixed(3)}, ${point[1].toFixed(3)}）-> 实测在 ${others.join('、')}`)
  }
}

if (missingCity.length === 0 && outsideOnly.length === 0 && insideOthers.length === 0) {
  console.log(`✓ 全部 ${checked} 个点在声称的城市轮廓内`)
} else {
  process.exitCode = 1
}
