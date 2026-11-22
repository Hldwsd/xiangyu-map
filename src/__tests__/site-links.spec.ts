import { describe, expect, it } from 'vitest'

import { AMAP_SITE_URLS } from '@/data/amap-links'
import { sites } from '@/data/sites'
import { amapSiteUrl, sourceLabel } from '@/utils/site-links'

describe('amapSiteUrl', () => {
  it('有精确短链时直接用；没有时按名称+城市搜索，不拼经纬度', () => {
    expect(amapSiteUrl({ id: 'huizhou-ancient-city', name: '徽州古城', city: '黄山市' })).toBe(
      'https://surl.amap.com/8bM7orMB7A0',
    )

    const fallback = amapSiteUrl({ id: 'not-in-map', name: '宏村', city: '黄山市' })
    expect(fallback.startsWith('https://uri.amap.com/search?')).toBe(true)
    expect(fallback).toContain(`keyword=${encodeURIComponent('宏村')}`)
    expect(fallback).toContain(`city=${encodeURIComponent('黄山市')}`)
    expect(fallback).not.toContain('position=')
  })

  it('所有数据都有精确短链，且只引用真实 site id、必须是 https', () => {
    expect(Object.keys(AMAP_SITE_URLS)).toHaveLength(sites.length)
    const ids = new Set(sites.map((site) => site.id))
    for (const [id, url] of Object.entries(AMAP_SITE_URLS)) {
      expect(ids.has(id)).toBe(true)
      expect(url.startsWith('https://')).toBe(true)
    }
  })
})

describe('sourceLabel', () => {
  it('常见来源显示中文站点名，并去掉 www', () => {
    expect(sourceLabel('https://baike.baidu.com/item/徽州古城')).toBe('百度百科')
    expect(sourceLabel('https://www.huangshan.gov.cn/content/article/8297412')).toBe(
      'huangshan.gov.cn',
    )
    expect(sourceLabel('https://whc.unesco.org/zh/list/547')).toBe('UNESCO 世界遗产中心')
  })

  it('解析失败时原样返回，不吞掉数据', () => {
    expect(sourceLabel('not-a-url')).toBe('not-a-url')
  })
})
