import { describe, expect, it } from 'vitest'

import { amapMarkerUrl, sourceLabel } from '@/utils/site-links'

describe('amapMarkerUrl', () => {
  it('把 GCJ-02 坐标与项目名带进高德 marker URI', () => {
    const url = amapMarkerUrl({
      name: '徽州古城',
      location: { lng: 118.436, lat: 29.867 },
    })

    expect(url.startsWith('https://uri.amap.com/marker?')).toBe(true)
    expect(url).toContain('position=118.436,29.867')
    expect(url).toContain(`name=${encodeURIComponent('徽州古城')}`)
    expect(url).toContain('coordinate=gaode')
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
