/**
 * 把数据里的站点根路径（以 `/` 开头，例如 `/images/sites/hongcun/cover.webp`）
 * 转成当前部署基地址下的可访问路径。
 *
 * 为什么需要：数据文件里写的是「站点根路径」，与部署位置无关；但项目部署在
 * `https://<user>.github.io/<repo>/`（或 `/<repo>/pr-<n>/`）这样的子路径下，
 * 直接用 `/images/...` 会解析到域名根，图片全 404。渲染时统一套一层 `BASE_URL` 即可，
 * 数据不用为部署位置改一次。
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}${path.replace(/^\/+/, '')}`
}
