import { describe, expect, it } from 'vitest'
import type { EChartsOption } from 'echarts'

import {
  CATEGORY_COLORS,
  CATEGORY_SYMBOLS,
  buildAnhuiMapOption,
  escapeHtml,
  formatSiteTooltip,
  toScatterData,
} from '@/components/map/anhui-map-option'
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

    const hongcun = data.find((datum) => datum.siteId === 'hongcun')
    expect(hongcun?.value).toEqual([117.988, 29.996])
    expect(hongcun?.name).toBe('宏村')
  })

  it('默认不显示名称标签，选中项放大并显示标签', () => {
    const data = toScatterData(sites, 'hongcun')
    const selected = data.find((datum) => datum.siteId === 'hongcun')
    const other = data.find((datum) => datum.siteId === 'huangshan-scenic')

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

  it('每个分类都有自己的形状，且六个形状互不相同', () => {
    const data = toScatterData(sites, null)
    for (const datum of data) {
      expect(datum.symbol).toBe(CATEGORY_SYMBOLS[datum.category])
    }
    expect(new Set(Object.values(CATEGORY_SYMBOLS)).size).toBe(Object.keys(CATEGORY_SYMBOLS).length)
  })

  it('基础尺寸不小于 13，命中区才够点', () => {
    const data = toScatterData(sites, null)
    for (const datum of data) {
      expect(datum.symbolSize).toBeGreaterThanOrEqual(13)
    }
  })
})

describe('escapeHtml', () => {
  it('转义会破坏结构的字符', () => {
    expect(escapeHtml('<b>"宏村" & \'古村\'</b>')).toBe(
      '&lt;b&gt;&quot;宏村&quot; &amp; &#39;古村&#39;&lt;/b&gt;',
    )
  })

  it('普通文本保持不变', () => {
    expect(escapeHtml('徽州古城')).toBe('徽州古城')
  })
})

describe('formatSiteTooltip', () => {
  it('输出项目名与「分类 · 简介」', () => {
    const html = formatSiteTooltip({
      data: { name: '宏村', category: '乡村', summary: '月沼与南湖' },
    })
    expect(html).toContain('<strong>宏村</strong>')
    expect(html).toContain('乡村 · 月沼与南湖')
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

describe('buildAnhuiMapOption', () => {
  it('使用已注册的 anhui 地图与 scatter 系列', () => {
    const option = buildAnhuiMapOption(sites, null)

    expect(option.geo).toMatchObject({ map: 'anhui', roam: true })
    expect(scatterDataOf(option)).toHaveLength(sites.length)
  })

  it('打开 geo 标签，市级划分才看得见', () => {
    const option = buildAnhuiMapOption(sites, null)
    const geo = option.geo as { label?: { show?: boolean }; emphasis?: { label?: unknown } }

    expect(geo.label?.show).toBe(true)
    expect(geo.emphasis?.label).toBeDefined()
  })

  it('不写死 center/zoom，视野跟着底图自适应', () => {
    const geo = buildAnhuiMapOption(sites, null).geo as Record<string, unknown>

    expect(geo['center']).toBeUndefined()
    expect(geo['zoom']).toBeUndefined()
  })

  it('省界内缩 8%，贴边地标不被画布裁掉', () => {
    const geo = buildAnhuiMapOption(sites, null).geo as {
      layoutCenter?: unknown
      layoutSize?: unknown
    }

    expect(geo.layoutCenter).toEqual(['50%', '50%'])
    expect(geo.layoutSize).toBe('92%')
  })

  it('地标可点击（cursor pointer）且缩放有上下限', () => {
    const option = buildAnhuiMapOption(sites, null)
    const series = (option.series as Array<{ cursor?: string }>)[0]
    const geo = option.geo as { scaleLimit?: { min?: number; max?: number } }

    expect(series?.cursor).toBe('pointer')
    expect(geo.scaleLimit?.min).toBeGreaterThan(0)
    expect(geo.scaleLimit?.max).toBeGreaterThan(geo.scaleLimit?.min ?? 0)
  })

  it('筛选后只保留传入的项目', () => {
    const subset = sites.filter((site) => site.category === '古镇')
    const option = buildAnhuiMapOption(subset, null)

    expect(scatterDataOf(option)).toHaveLength(subset.length)
  })
})
