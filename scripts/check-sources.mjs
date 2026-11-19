#!/usr/bin/env node
/**
 * 来源可访问性检查。
 *
 * 数据规则要求 sources 是「可访问的 http(s) 链接」，但两个人分头加数据时没人会逐条点开。
 * 这个脚本把这件事变成一条命令：并发请求每个唯一来源，按「可达 / 反爬 / 不可达 / 占位」
 * 分类，失败时打印引用了它的项目 id。
 *
 * 用法：
 *   node scripts/check-sources.mjs                 # 只报告，退出码恒为 0
 *   node scripts/check-sources.mjs --strict        # 存在不可达地址时退出码 1
 *   node scripts/check-sources.mjs --strict-blocked  # 把「反爬」也算失败
 *   node scripts/check-sources.mjs --timeout=20000
 *
 * 判定口径：
 * - 403 / 412 / 429 记为「反爬」而不是失效——政府站点常对脚本请求返回这些码，浏览器里能打开；
 *   是否算失败由 --strict-blocked 决定，默认只警告。
 * - example.com 单独计为「占位」：示例数据还没替换来源时它会一直出现，不该淹没真实问题。
 */
import { sites } from '../src/data/sites.ts'

const PLACEHOLDER_HOSTS = new Set(['example.com', 'www.example.com'])
const BLOCKED_STATUS = new Set([403, 412, 429, 999])
const CONCURRENCY = 4
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const args = process.argv.slice(2)
const strict = args.includes('--strict')
const strictBlocked = args.includes('--strict-blocked')
const timeoutArg = args.find((arg) => arg.startsWith('--timeout='))
const timeoutMs = timeoutArg ? Number(timeoutArg.split('=')[1]) : 15000

/** 每个唯一来源被哪些项目引用，失败时可以直接定位回 data 文件 */
const sourceMap = new Map()
for (const site of sites) {
  for (const source of site.sources) {
    const referencedBy = sourceMap.get(source) ?? []
    referencedBy.push(site.id)
    sourceMap.set(source, referencedBy)
  }
}

function classify(url, status) {
  if (PLACEHOLDER_HOSTS.has(new URL(url).host)) return 'placeholder'
  if (status >= 200 && status < 400) return 'ok'
  if (BLOCKED_STATUS.has(status)) return 'blocked'
  return 'dead'
}

async function probe(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,*/*' },
      signal: controller.signal,
    })
    return { url, status: response.status, kind: classify(url, response.status) }
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? '超时' : '连接失败'
    return { url, status: 0, kind: 'dead', reason }
  } finally {
    clearTimeout(timer)
  }
}

const urls = [...sourceMap.keys()]
const results = []
let cursor = 0

async function worker() {
  while (cursor < urls.length) {
    const url = urls[cursor]
    cursor += 1
    results.push(await probe(url))
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, worker))

const order = { dead: 0, blocked: 1, placeholder: 2, ok: 3 }
const icons = { ok: '✓', blocked: '⚠', dead: '✗', placeholder: '·' }
const labels = { ok: '可达', blocked: '反爬', dead: '不可达', placeholder: '占位' }

results.sort((a, b) => order[a.kind] - order[b.kind] || a.url.localeCompare(b.url))

console.log(
  `\n来源检查：${sites.length} 条数据，${urls.length} 个唯一地址（超时 ${timeoutMs}ms）\n`,
)
for (const result of results) {
  const status = result.status === 0 ? result.reason : String(result.status)
  const owners = sourceMap.get(result.url).join(', ')
  console.log(`${icons[result.kind]} ${labels[result.kind]}  ${status.padEnd(8)} ${result.url}`)
  if (result.kind !== 'ok') console.log(`${' '.repeat(14)}↳ ${owners}`)
}

const count = (kind) => results.filter((result) => result.kind === kind).length
console.log(
  `\n合计：可达 ${count('ok')} · 反爬 ${count('blocked')} · 不可达 ${count('dead')} · 占位 ${count('placeholder')}\n`,
)

const failed = count('dead') > 0 || (strictBlocked && count('blocked') > 0)
if (strict && failed) {
  console.error('存在不可达/被拒绝的来源，--strict 下按失败处理。')
  process.exit(1)
}
