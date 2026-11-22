#!/usr/bin/env node
/**
 * 首屏体积闸门。
 *
 * 规划里的预算是「首屏 JS（gzip）≤ 300 KB，GeoJSON ≤ 250 KB」。但 "首屏" 不是 dist 里所有 JS 之和：
 * 详情页是懒加载的，地图 GeoJSON 走 public/ 单独请求。所以这里只统计 **index.html 真正引用的**
 * 脚本与样式，避免把懒加载块算进首屏预算、造成 "预算超了但其实没事" 的假警报。
 *
 * 用法：
 *   node scripts/check-bundle-size.mjs                 # 默认 300 KB / 60 KB
 *   node scripts/check-bundle-size.mjs --budget-js=300 --budget-css=60
 *   node scripts/check-bundle-size.mjs --dist=dist --json
 *
 * 退出码 1 表示超出预算。CI 想接的话，放在 `pnpm build` 之后跑。
 */
import { readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`))
  return hit === undefined ? fallback : Number(hit.split('=')[1])
}

const distDir = resolve(args.find((arg) => arg.startsWith('--dist='))?.split('=')[1] ?? 'dist')
const budgetJsKb = readArg('budget-js', 300)
const budgetCssKb = readArg('budget-css', 60)
const asJson = args.includes('--json')

/** dist/index.html 里 <script src> 与 <link rel="stylesheet" href> 指向的首屏资源 */
function entryAssets(dist) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
  const styles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1],
  )
  const normalize = (p) => p.replace(/^\/+/, '').replace(/\?.*$/, '')
  return {
    scripts: scripts.map(normalize),
    styles: styles.map(normalize),
  }
}

function sizeOf(relativePath) {
  const absolute = join(distDir, relativePath)
  const raw = readFileSync(absolute)
  const gzip = gzipSync(raw, { level: 9 })
  return { file: relativePath, rawBytes: statSync(absolute).size, gzipBytes: gzip.length }
}

const kb = (bytes) => bytes / 1024
const assets = entryAssets(distDir)
if (assets.scripts.length === 0) {
  console.error(`没有在 ${join(distDir, 'index.html')} 里找到 <script src>，先跑 pnpm build。`)
  process.exit(2)
}

const scriptSizes = assets.scripts.map(sizeOf)
const styleSizes = assets.styles.map(sizeOf)
const sum = (list) => list.reduce((total, item) => total + item.gzipBytes, 0)

const jsKb = kb(sum(scriptSizes))
const cssKb = kb(sum(styleSizes))
const overJs = jsKb > budgetJsKb
const overCss = cssKb > budgetCssKb

if (asJson) {
  console.log(
    JSON.stringify(
      {
        js: { kb: Number(jsKb.toFixed(2)), budgetKb: budgetJsKb, over: overJs, files: scriptSizes },
        css: {
          kb: Number(cssKb.toFixed(2)),
          budgetKb: budgetCssKb,
          over: overCss,
          files: styleSizes,
        },
      },
      null,
      2,
    ),
  )
} else {
  console.log(`\n首屏体积（gzip）· 来源：${join(distDir, 'index.html')}\n`)
  for (const item of [...scriptSizes, ...styleSizes]) {
    console.log(`  ${kb(item.gzipBytes).toFixed(2).padStart(7)} KB  ${item.file}`)
  }

  const line = (label, value, budget, over) =>
    `${over ? '✗' : '✓'} ${label}: ${value.toFixed(2)} / ${budget} KB（${((value / budget) * 100).toFixed(0)}%）`
  console.log('')
  console.log(line('首屏 JS ', jsKb, budgetJsKb, overJs))
  console.log(line('首屏 CSS', cssKb, budgetCssKb, overCss))
  console.log('')
}

if (overJs || overCss) {
  console.error(
    '超出首屏预算。先看 ECharts 是否按需引入、有无整包 chunk，再决定拆包或申请预算调整。',
  )
  process.exit(1)
}
