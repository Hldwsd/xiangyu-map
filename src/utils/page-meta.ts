/** 站点级默认文案：预渲染脚本与 SPA 路由共用同一套口径 */
export const SITE_TITLE = '乡遇安徽 · 在地图上，遇见安徽'

function upsertMeta(selector: string, attrs: Record<string, string>, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (el === null) {
    el = document.createElement('meta')
    document.head.append(el)
  }
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  el.setAttribute('content', content)
}

/**
 * 只负责浏览器内的 title/description；静态 HTML 的 OG/JSON-LD 由 prerender 脚本生成。
 * 同时更新 description 与 OG/Twitter title，保证 SPA 内跳转后分享扩展也读到当前项目。
 */
export function applyPageMeta(title: string, description: string): void {
  document.title = title

  upsertMeta('meta[name="description"]', { name: 'description' }, description)
  upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title)
  upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description)
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title)
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description)
}
