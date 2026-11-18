#!/usr/bin/env node
/**
 * 重新下载中国地图底图（省级行政区轮廓）。
 *
 * 用法：pnpm data:china-map
 *
 * 为什么要脚本而不是手工下载：底图属于「可复现的依赖」，
 * 来源、要素数量、体积与 sha256 都应该能在仓库里对得上。
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const SOURCE = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
const TARGET = join(import.meta.dirname, '..', 'public', 'maps', 'china.json')

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

console.log(`下载 ${SOURCE}`)
const response = await fetch(SOURCE)
if (!response.ok) fail(`下载失败：HTTP ${response.status}`)

const text = await response.text()
let parsed
try {
  parsed = JSON.parse(text)
} catch {
  fail('返回内容不是合法 JSON')
}

if (
  parsed?.type !== 'FeatureCollection' ||
  !Array.isArray(parsed.features) ||
  parsed.features.length === 0
) {
  fail('返回内容不是 FeatureCollection，或 features 为空')
}

const payload = JSON.stringify(parsed)
await mkdir(dirname(TARGET), { recursive: true })
await writeFile(TARGET, payload, 'utf8')

const bytes = Buffer.byteLength(payload)
const gzipped = gzipSync(Buffer.from(payload)).length
const sha256 = createHash('sha256').update(payload).digest('hex')

console.log(`✓ 已写入 ${TARGET}`)
console.log(`  要素数 ${parsed.features.length}`)
console.log(`  原始 ${(bytes / 1024).toFixed(1)} KB / gzip ${(gzipped / 1024).toFixed(1)} KB`)
console.log(`  sha256 ${sha256}`)

if (gzipped / 1024 > 250) {
  console.warn('⚠ gzip 后超过 250KB 预算，需要简化几何或改用更粗的边界数据')
}
