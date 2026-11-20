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
 * - 200 但页面是"域名出售 / 域名停放 / 正在跳转 / 阿里云虚机报错"这类占位页时，记为「可疑页」：
 *   域名过期后被域名商挂上待售页，状态码照样 200，只看状态码会把它们判成可达。
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

/**
 * 停放域名与占位页的痕迹。
 *
 * 200 不等于「这个来源有用」：域名过期后常被域名商挂成待售页或跳转页，
 * 状态码照样是 200。只看状态码会把「hcy.com.cn 域名出售」这种地址判成可达。
 */
const PARKED_SIGNS = [
  '域名出售',
  'domain for sale',
  '域名转让',
  '域名停放',
  '正在跳转',
  '阿里云万网虚机',
  'west.cn',
  'parking',
]

/** 判为可疑页时要读的正文上限：只取样，不把整站拉下来 */
const SNIFF_BYTES = 4096

async function sniffSuspicious(response) {
  const length = Number(response.headers.get('content-length') ?? 0)
  // 正常的政府/景区页面动辄几十上百 KB；这里只排除明显不是网页的响应
  if (length > 3_000_000) return null

  const text = await response.text()
  const head = text.slice(0, SNIFF_BYTES).toLowerCase()
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text)?.[1]?.trim() ?? ''

  const sign = PARKED_SIGNS.find((sign) => head.includes(sign.toLowerCase()))
  if (sign !== undefined) return `疑似停放页（含「${sign}」）`
  if (title === '') return '页面没有标题，可能是占位或跳转页'
  return null
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
    const base = { url, status: response.status, kind: classify(url, response.status) }

    if (base.kind === 'ok') {
      const suspicious = await sniffSuspicious(response)
      if (suspicious !== null) return { ...base, kind: 'suspicious', reason: suspicious }
    } else {
      // 反爬/不可达的响应体没有意义，但必须读掉，否则连接不会释放
      await response.arrayBuffer().catch(() => undefined)
    }

    return base
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

const order = { dead: 0, suspicious: 1, blocked: 2, placeholder: 3, ok: 4 }
const icons = { ok: '✓', blocked: '⚠', suspicious: '⚑', dead: '✗', placeholder: '·' }
const labels = {
  ok: '可达',
  blocked: '反爬',
  suspicious: '可疑页',
  dead: '不可达',
  placeholder: '占位',
}

results.sort((a, b) => order[a.kind] - order[b.kind] || a.url.localeCompare(b.url))

console.log(
  `\n来源检查：${sites.length} 条数据，${urls.length} 个唯一地址（超时 ${timeoutMs}ms）\n`,
)
for (const result of results) {
  const status = result.status === 0 ? result.reason : String(result.status)
  const owners = sourceMap.get(result.url).join(', ')
  console.log(`${icons[result.kind]} ${labels[result.kind]}  ${status.padEnd(8)} ${result.url}`)
  if (result.kind !== 'ok') {
    const detail = result.reason === undefined ? '' : ` — ${result.reason}`
    console.log(`${' '.repeat(14)}↳ ${owners}${detail}`)
  }
}

const count = (kind) => results.filter((result) => result.kind === kind).length
console.log(
  `\n合计：可达 ${count('ok')} · 反爬 ${count('blocked')} · 可疑页 ${count('suspicious')} · 不可达 ${count('dead')} · 占位 ${count('placeholder')}\n`,
)

const failed =
  count('dead') > 0 || count('suspicious') > 0 || (strictBlocked && count('blocked') > 0)
if (strict && failed) {
  console.error('存在不可达 / 可疑 / 被拒绝的来源，--strict 下按失败处理。')
  process.exit(1)
}
