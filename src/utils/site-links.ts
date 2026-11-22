import type { Site } from '@/types/site'

/**
 * 高德地图 marker URI。
 *
 * 项目坐标统一是 GCJ-02，正好是高德使用的坐标系，不需要再做 WGS-84 转换；
 * 把 name 带进去，打开后能看到该项目的标注，而不是一个裸坐标。
 * `callnative=0` 先打开网页版：桌面端不会弹「打开 App」，手机端网页会再引导。
 */
export function amapMarkerUrl(site: Pick<Site, 'name' | 'location'>): string {
  const { lng, lat } = site.location
  // 不用 URLSearchParams：它会把 position 里的逗号编码成 %2C，部分客户端解析不稳
  const params = [
    `position=${lng},${lat}`,
    `name=${encodeURIComponent(site.name)}`,
    'coordinate=gaode',
    'callnative=0',
    'src=xiangyu-map',
  ].join('&')
  return `https://uri.amap.com/marker?${params}`
}

/** 常见来源站点的中文名；不在表里的显示域名，至少比一长串 URL 好读 */
const SOURCE_LABELS: Readonly<Record<string, string>> = {
  'baike.baidu.com': '百度百科',
  'zh.wikipedia.org': '维基百科',
  'whc.unesco.org': 'UNESCO 世界遗产中心',
}

/**
 * 把来源 URL 缩成可读的站点名。
 *
 * 解析失败时原样返回，不吞掉信息——数据校验允许任意 http(s) 链接，
 * 这里只负责显示，不负责判断它是不是好来源。
 */
export function sourceLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return SOURCE_LABELS[host] ?? host
  } catch {
    return url
  }
}
