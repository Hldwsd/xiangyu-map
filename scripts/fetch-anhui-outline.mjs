#!/usr/bin/env node
/**
 * 抓安徽省「省界轮廓」（DataV 的 340000.json，不带 _full 时只有一条省界要素）。
 *
 * 用途：给地图轮廓画一圈向外渐隐的边框（越往外越浅），把省域从纸面上「托」起来。
 * 用法：pnpm data:anhui-outline
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const URL = 'https://geo.datav.aliyun.com/areas_v3/bound/340000.json'
const TARGET = join(import.meta.dirname, '..', 'public', 'maps', 'anhui-outline.json')

const response = await fetch(URL, { headers: { 'user-agent': 'xiangyu-map/0.1 (development)' } })
if (!response.ok) {
  console.error(`✗ 下载失败：HTTP ${response.status}`)
  process.exit(1)
}

const data = await response.json()
const features = (data.features ?? []).filter((feature) => feature.geometry?.coordinates?.length)
if (features.length === 0) {
  console.error('✗ 没有拿到省界几何（可能被换成了不带几何的接口）')
  process.exit(1)
}

const collection = {
  type: 'FeatureCollection',
  features: features.map((feature) => ({
    type: 'Feature',
    properties: { name: '安徽省', level: 'province' },
    geometry: feature.geometry,
  })),
}

const payload = JSON.stringify(collection)
await mkdir(dirname(TARGET), { recursive: true })
await writeFile(TARGET, payload, 'utf8')

const sha256 = createHash('sha256').update(payload).digest('hex')
console.log(`✓ 已写入 ${TARGET}`)
console.log(
  `  要素 ${collection.features.length} / 原始 ${(Buffer.byteLength(payload) / 1024).toFixed(1)} KB / gzip ${(gzipSync(Buffer.from(payload)).length / 1024).toFixed(1)} KB`,
)
console.log(`  sha256 ${sha256}`)
