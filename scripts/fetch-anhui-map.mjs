#!/usr/bin/env node
/**
 * 重新下载安徽省底图（16 个地级市轮廓）。
 *
 * 用法：pnpm data:anhui-map
 *
 * 为什么要脚本而不是手工下载：底图属于「可复现的依赖」，
 * 来源、要素数量、体积与 sha256 都应该能在仓库里对得上。
 *
 * 为什么校验要素数：省级 GeoJSON 有 `_full` 与不带 `_full` 两种，
 * 后者只有省界、没有市级轮廓；抓错了页面会「看着有图」，但分区全丢。
 */
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const SOURCE = 'https://geo.datav.aliyun.com/areas_v3/bound/340000_full.json'
const TARGET = join(import.meta.dirname, '..', 'public', 'maps', 'anhui.json')
const EXPECTED_FEATURES = 16

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

if (parsed.features.length !== EXPECTED_FEATURES) {
  fail(
    `要素数 ${parsed.features.length}，期望 ${EXPECTED_FEATURES}（16 个地级市）；` +
      '确认抓的是 340000_full.json，而不是只有省界的 340000.json',
  )
}

const cities = parsed.features.map((feature) => feature?.properties?.name ?? '（无名）')
const levels = new Set(parsed.features.map((feature) => feature?.properties?.level))
if (levels.size !== 1 || !levels.has('city')) {
  fail(`要素层级是 ${[...levels].join('/')}，期望全部为 city`)
}

const payload = JSON.stringify(parsed)
await mkdir(dirname(TARGET), { recursive: true })
await writeFile(TARGET, payload, 'utf8')

const bytes = Buffer.byteLength(payload)
const gzipped = gzipSync(Buffer.from(payload)).length
const sha256 = createHash('sha256').update(payload).digest('hex')

console.log(`✓ 已写入 ${TARGET}`)
console.log(`  市级要素 ${parsed.features.length}：${cities.join('、')}`)
console.log(`  原始 ${(bytes / 1024).toFixed(1)} KB / gzip ${(gzipped / 1024).toFixed(1)} KB`)
console.log(`  sha256 ${sha256}`)

if (gzipped / 1024 > 250) {
  console.warn('⚠ gzip 后超过 250KB 预算，需要简化几何或改用更粗的边界数据')
}
