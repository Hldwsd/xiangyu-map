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
 * - 「内容无关」（unrelated）：可达 200 但页面 title 里既没有项目名也没有城市名——
 *   2026-11-21 实测发现 caishiji.com / langyashan.com / ttz.com.cn 都是 200，
 *   实际已是「域名出售」或无关公司网站（停放/过期域名），状态码口径测不出来。
 *   默认警告，--strict-unrelated 下按失败处理；title 判断不了政府栏目页时允许误报，人工复核。
 */
import { sites } from '../src/data/sites.ts'

const PLACEHOLDER_HOSTS = new Set(['example.com', 'www.example.com'])
// 405 也是政府站 WAF 的常用反爬码（huangshan.gov.cn 实测在 412/405 间漂移）
const BLOCKED_STATUS = new Set([403, 405, 412, 429, 999])
const CONCURRENCY = 4
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const args = process.argv.slice(2)
const strict = args.includes('--strict')
const strictBlocked = args.includes('--strict-blocked')
const strictUnrelated = args.includes('--strict-unrelated')
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

/** 项目名与城市名（去「市」字）都可作为 title 的匹配线索 */
const nameById = new Map(
  sites.map((site) => [site.id, { name: site.name, city: site.city.replace('市', '') }]),
)

/**
 * 人工核验过内容正确、但 title 不含项目名/城市名的来源。
 * 例：县级文旅栏目页的 title 是「泾县文旅」而非具体项目名。
 * 加新来源若在这里豁免，请在 PR 里附上人工核验记录。
 */
const TITLE_EXEMPT = new Set([
  'https://www.ahjx.gov.cn/Jxwl', // 泾县文旅板块（查济 / 水墨汀溪 / 茂林）
  'https://www.fengyang.gov.cn/', // 凤阳县政府（小岗村、韭山洞，县属滁州市）
  'http://paper.people.com.cn/rmrbhwb/html/2017-03/16/content_1757786.htm', // 人民日报海外版（湖上升明月）
])

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]{1,200})/i)
  return match ? match[1].trim() : ''
}

/** 可达页面与引用它的项目是否「对得上」：title 含任一项目名（或其首 2 字）或城市名即可 */
function isRelatedToSomeOwner(title, ownerIds) {
  if (title === '') return true // 拿不到 title 时不做判断，交给状态码口径
  return ownerIds.some((id) => {
    const { name, city } = nameById.get(id) ?? {}
    if (name === undefined) return false
    // 「临涣古镇」的页面 title 往往只写「临涣镇」——首 2 字也是有效线索
    const shortName = name.slice(0, 2)
    return (
      title.includes(name) ||
      title.includes(shortName) ||
      (city !== undefined && title.includes(city))
    )
  })
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
    const base = classify(url, response.status)
    const title = extractTitle(await response.text())
    // 可达但内容与引用它的项目都对不上 → 停放/过期域名的典型特征；
    // 归为独立 kind，排序/图标/计数才会把它单独归组
    const exempt = TITLE_EXEMPT.has(url)
    const kind =
      base === 'ok' && !exempt && !isRelatedToSomeOwner(title, sourceMap.get(url) ?? [])
        ? 'unrelated'
        : base
    return { url, status: response.status, kind, title }
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

const order = { dead: 0, unrelated: 1, blocked: 2, placeholder: 3, ok: 4 }
const icons = { ok: '✓', unrelated: '⚠', blocked: '⚠', dead: '✗', placeholder: '·' }
const labels = {
  ok: '可达',
  unrelated: '内容无关',
  blocked: '反爬',
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
  if (result.unrelated) console.log(`${' '.repeat(14)}↳ title: ${result.title || '(空)'}`)
  if (result.kind !== 'ok') console.log(`${' '.repeat(14)}↳ ${owners}`)
}

const count = (kind) => results.filter((result) => result.kind === kind).length
console.log(
  `\n合计：可达 ${count('ok')} · 反爬 ${count('blocked')} · 不可达 ${count('dead')} · 占位 ${count('placeholder')} · 内容无关 ${count('unrelated')}\n`,
)

const reasons = []
if (strict && count('dead') > 0) {
  reasons.push('存在不可达的来源（--strict）')
}
if (strictBlocked && count('blocked') > 0) {
  reasons.push('存在反爬来源（--strict-blocked）')
}
if (strictUnrelated && count('unrelated') > 0) {
  reasons.push('存在内容无关来源（--strict-unrelated）')
}
if (reasons.length > 0) {
  console.error(reasons.join('；'))
  process.exit(1)
}
