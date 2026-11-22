import { AMAP_SITE_URLS } from '@/data/amap-links'
import type { Site } from '@/types/site'

/**
 * 高德地点链接。
 *
 * 优先用手工核对过的精确 POI 短链；没有短链的项目退化为「名称 + 城市」搜索。
 * 两种情况都不拼经纬度：坐标是千米级精度，按坐标打开很容易落到隔壁点位，
 * 而名称搜索至少把选择权交给高德的搜索结果页。
 * `callnative=0` 先打开网页版：桌面端不会弹「打开 App」，手机端网页会再引导。
 */
export function amapSiteUrl(site: Pick<Site, 'id' | 'name' | 'city'>): string {
  const exact = AMAP_SITE_URLS[site.id]
  if (exact !== undefined && exact !== '') return exact

  const params = new URLSearchParams({
    keyword: site.name,
    city: site.city,
    coordinate: 'gaode',
    callnative: '0',
    src: 'xiangyu-map',
  })
  return `https://uri.amap.com/search?${params.toString()}`
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
