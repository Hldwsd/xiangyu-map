import { describe, expect, it } from 'vitest'
import type { EChartsOption } from 'echarts'

import {
  CATEGORY_COLORS,
  CATEGORY_SYMBOLS,
  buildAnhuiMapOption,
  escapeHtml,
  formatSiteTooltip,
  toScatterData,
  type ClusterScatterDatum,
  type SiteScatterDatum,
} from '@/components/map/anhui-map-option'
import { sites } from '@/data/sites'

/** 不传分组时，每一项都是「单点」，类型上单独收窄一次，省得每处断言都写 cast */
function siteData(subset: typeof sites, selectedId: string | null): SiteScatterDatum[] {
  return toScatterData(subset, selectedId) as SiteScatterDatum[]
}

function scatterDataOf(option: EChartsOption): unknown[] {
  const series = Array.isArray(option.series) ? option.series : []
  // series 里现在还有河道线，按 id 找散点，不依赖顺序
  const sites = series.find((item) => (item as { id?: string }).id === 'sites') as
    { data?: unknown[] } | undefined
  return sites?.data ?? []
}

describe('toScatterData', () => {
  it('每个项目生成一个散点，坐标顺序是 [lng, lat]', () => {
    const data = siteData(sites, null)
    expect(data).toHaveLength(sites.length)

    const hongcun = data.find((datum) => datum.siteId === 'hongcun')
    expect(hongcun?.value).toEqual([117.988, 29.996])
    expect(hongcun?.name).toBe('宏村')
  })

  it('默认不显示名称标签，选中项放大并显示标签', () => {
    const data = siteData(sites, 'hongcun')
    const selected = data.find((datum) => datum.siteId === 'hongcun')
    const other = data.find((datum) => datum.siteId === 'huangshan-scenic')

    expect(selected?.symbolSize).toBeGreaterThan(other?.symbolSize ?? 0)
    expect(selected?.label.show).toBe(true)
    expect(other?.label.show).toBe(false)
  })

  it('地标颜色统一取自 token：单色方向下六类同色', () => {
    const data = siteData(sites, null)
    for (const datum of data) {
      expect(datum.itemStyle.color).toBe(CATEGORY_COLORS[datum.category])
    }
    // 黑白方向刻意放弃「用颜色区分分类」，改由形状承载；
    // 这里断言同色，是为了防止有人偷偷把颜色编码加回来却没更新这条说明。
    expect(new Set(Object.values(CATEGORY_COLORS)).size).toBe(1)
  })

  it('选中态换成另一张图：墨底白线，与未选中互不相同', () => {
    const data = siteData(sites, 'hongcun')
    const selected = data.find((datum) => datum.siteId === 'hongcun')
    const other = data.find((datum) => datum.siteId === 'huangshan-scenic')

    expect(selected?.symbol).not.toBe(other?.symbol)
    expect(selected?.symbol.startsWith('image://data:image/svg+xml')).toBe(true)
  })

  it('每个分类都有自己的形状，且六个形状互不相同', () => {
    const data = siteData(sites, null)
    for (const datum of data) {
      expect(datum.symbol).toBe(CATEGORY_SYMBOLS[datum.category])
    }
    expect(new Set(Object.values(CATEGORY_SYMBOLS)).size).toBe(Object.keys(CATEGORY_SYMBOLS).length)
  })

  it('基础尺寸不小于 28，圆钉里的线条才认得出、也够点', () => {
    const data = siteData(sites, null)
    for (const datum of data) {
      expect(datum.symbolSize).toBeGreaterThanOrEqual(28)
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

  it('拖动与缩放都交给 ECharts 原生 roam', () => {
    const geo = buildAnhuiMapOption(sites, null).geo as { roam?: boolean | string }

    // 'move'：只开平移，滚轮/双指/缩放条都走组件的缓动实现
    expect(geo.roam).toBe(true)
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
    const series = (option.series as Array<{ id?: string; cursor?: string }>).find(
      (item) => item.id === 'sites',
    )
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

describe('buildAnhuiMapOption 的聚合点', () => {
  const pair = sites.slice(0, 2)

  it('簇画成一颗带数量的点，标签就是数量', () => {
    const data = toScatterData(pair, null, [
      { ids: pair.map((site) => site.id), lng: 117, lat: 31 },
    ])

    expect(data).toHaveLength(1)
    const cluster = data[0] as unknown as ClusterScatterDatum
    expect(cluster.count).toBe(2)
    expect(cluster.label.show).toBe(true)
    expect(cluster.label.formatter).toBe('2')
    expect(cluster.clusterNames).toEqual(pair.map((site) => site.name))
  })

  it('只有一颗的簇仍然画成该项目的分类点', () => {
    const site = pair[0]
    const data = toScatterData(pair, null, [
      { ids: [site?.id ?? ''], lng: site?.location.lng ?? 0, lat: site?.location.lat ?? 0 },
    ])

    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({
      siteId: site?.id,
      symbol: CATEGORY_SYMBOLS[site?.category ?? '古镇'],
    })
  })

  it('选中项在簇里时单独拆出来，簇数量不含它，且选中项最后绘制', () => {
    const trio = sites.slice(0, 3)
    const first = trio[0]
    if (first === undefined) throw new Error('测试数据为空')

    const data = toScatterData(trio, first.id, [
      { ids: trio.map((site) => site.id), lng: 117, lat: 31 },
    ])

    expect(data).toHaveLength(2)
    const selected = data.find(
      (datum): datum is SiteScatterDatum => 'siteId' in datum && datum.siteId === first.id,
    )
    const cluster = data.find((datum): datum is ClusterScatterDatum => 'count' in datum)

    expect(selected?.label.show).toBe(true)
    expect(selected?.symbolSize).toBeGreaterThan(cluster?.symbolSize ?? 0)
    expect(cluster?.count).toBe(2)
    expect(cluster?.clusterIds).toEqual(trio.slice(1).map((site) => site.id))
    // 最后绘制，才不会被簇压住
    expect(data[data.length - 1]).toBe(selected)
  })

  it('簇的 tooltip 先说数量、再列名字', () => {
    const html = formatSiteTooltip({
      data: {
        count: 2,
        clusterNames: pair.map((site) => site.name),
      },
    })

    expect(html).toContain('2 个文旅项目')
    for (const site of pair) expect(html).toContain(site.name)
  })

  it('簇内名字同样转义', () => {
    const html = formatSiteTooltip({ data: { count: 1, clusterNames: ['<img>'] } })

    expect(html).toContain('&lt;img&gt;')
    expect(html).not.toContain('<img>')
  })

  it('数量越多点越大，但有上限', () => {
    const few = toScatterData(pair, null, [{ ids: pair.map((s) => s.id), lng: 117, lat: 31 }])
    const many = toScatterData(sites, null, [{ ids: sites.map((s) => s.id), lng: 117, lat: 31 }])

    const fewSize = (few[0] as unknown as ClusterScatterDatum).symbolSize
    const manySize = (many[0] as unknown as ClusterScatterDatum).symbolSize
    expect(manySize).toBeGreaterThan(fewSize)
    expect(manySize).toBeLessThanOrEqual(34)
  })
})
