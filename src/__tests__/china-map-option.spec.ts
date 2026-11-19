import { describe, expect, it } from 'vitest'
import type { EChartsOption } from 'echarts'

import {
  CATEGORY_COLORS,
  buildChinaMapOption,
  escapeHtml,
  formatSiteTooltip,
  toScatterData,
} from '@/components/map/china-map-option'
import { sites } from '@/data/sites'

function scatterDataOf(option: EChartsOption): unknown[] {
  const series = Array.isArray(option.series) ? option.series : []
  const first = series[0] as { data?: unknown[] } | undefined
  return first?.data ?? []
}

describe('toScatterData', () => {
  it('每个项目生成一个散点，坐标顺序是 [lng, lat]', () => {
    const data = toScatterData(sites, null)
    expect(data).toHaveLength(sites.length)

    const wuzhen = data.find((datum) => datum.siteId === 'wuzhen')
    expect(wuzhen?.value).toEqual([120.49, 30.74])
    expect(wuzhen?.name).toBe('乌镇')
  })

  it('默认不显示名称标签，选中项放大并显示标签', () => {
    const data = toScatterData(sites, 'wuzhen')
    const selected = data.find((datum) => datum.siteId === 'wuzhen')
    const other = data.find((datum) => datum.siteId === 'pingyao')

    expect(selected?.symbolSize).toBeGreaterThan(other?.symbolSize ?? 0)
    expect(selected?.label.show).toBe(true)
    expect(other?.label.show).toBe(false)
  })

  it('每个分类都有自己的颜色', () => {
    const data = toScatterData(sites, null)
    for (const datum of data) {
      expect(datum.itemStyle.color).toBe(CATEGORY_COLORS[datum.category])
    }
    expect(new Set(Object.values(CATEGORY_COLORS)).size).toBe(Object.keys(CATEGORY_COLORS).length)
  })
})

describe('escapeHtml', () => {
  it('转义会破坏结构的字符', () => {
    expect(escapeHtml('<b>"平遥" & \'古城\'</b>')).toBe(
      '&lt;b&gt;&quot;平遥&quot; &amp; &#39;古城&#39;&lt;/b&gt;',
    )
  })

  it('普通文本保持不变', () => {
    expect(escapeHtml('平遥古城')).toBe('平遥古城')
  })
})

describe('formatSiteTooltip', () => {
  it('输出项目名与「分类 · 简介」', () => {
    const html = formatSiteTooltip({
      data: { name: '乌镇', category: '古镇', summary: '水网穿镇而过' },
    })
    expect(html).toContain('<strong>乌镇</strong>')
    expect(html).toContain('古镇 · 水网穿镇而过')
  })

  it('转义数据里的 HTML', () => {
    const html = formatSiteTooltip({ data: { name: '<img>', category: '古镇', summary: 'x' } })
    expect(html).toContain('&lt;img&gt;')
    expect(html).not.toContain('<img>')
  })

  it('没有数据时返回空字符串', () => {
    expect(formatSiteTooltip({})).toBe('')
    expect(formatSiteTooltip({ data: {} })).toBe('')
  })
})

describe('buildChinaMapOption', () => {
  it('使用已注册的 china 地图与 scatter 系列', () => {
    const option = buildChinaMapOption(sites, null)

    expect(option.geo).toMatchObject({ map: 'china', roam: true })
    expect(scatterDataOf(option)).toHaveLength(sites.length)
  })

  it('筛选后只保留传入的项目', () => {
    const subset = sites.filter((site) => site.category === '古镇')
    const option = buildChinaMapOption(subset, null)

    expect(scatterDataOf(option)).toHaveLength(subset.length)
  })
})
