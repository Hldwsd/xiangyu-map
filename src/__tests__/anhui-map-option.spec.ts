import { describe, expect, it } from 'vitest'
import type { EChartsOption } from 'echarts'

import {
  CATEGORY_COLORS,
  CATEGORY_SYMBOLS,
  buildAnhuiMapOption,
  buildCityAreaColors,
  cityAreaTier,
  escapeHtml,
  formatSiteTooltip,
  toScatterData,
  type ClusterScatterDatum,
  type SiteScatterDatum,
} from '@/components/map/anhui-map-option'
import { sites } from '@/data/sites'
import { categoryMarkerSymbol } from '@/components/icons/category-paths'
import { DEFAULT_PALETTE } from '@/theme/theme'

/** 不传分组时，每一项都是「单点」，类型上单独收窄一次，省得每处断言都写 cast */
function siteData(
  subset: typeof sites,
  selectedId: string | null,
  featuredIds?: ReadonlySet<string>,
): SiteScatterDatum[] {
  return toScatterData(subset, selectedId, undefined, undefined, featuredIds) as SiteScatterDatum[]
}

/** geo 现在是 [主图, 水域?]：断言都取第一层 */
function geoOf(option: EChartsOption): Record<string, unknown> {
  const geo = option.geo
  const first = Array.isArray(geo) ? geo[0] : geo
  return (first ?? {}) as Record<string, unknown>
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

  it('地标颜色统一取自 token：单色方向下七类同色', () => {
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

  it('精选项用大一号圆钉：比普通点大、比选中点小', () => {
    const featuredIds = new Set(['hongcun'])
    const data = siteData(sites, null, featuredIds)

    const featured = data.find((datum) => datum.siteId === 'hongcun')
    const normal = data.find((datum) => datum.siteId === 'huangshan-scenic')

    expect(featured?.symbolSize).toBe(42)
    expect(normal?.symbolSize).toBe(36)
    expect(featured!.symbolSize).toBeLessThan(48)
  })

  it('选中优先于精选：一个点同时命中两种状态时用选中态', () => {
    const featuredIds = new Set(['hongcun'])
    const data = siteData(sites, 'hongcun', featuredIds)

    const selected = data.find((datum) => datum.siteId === 'hongcun')
    expect(selected?.symbolSize).toBe(48)
    expect(selected?.symbol).toBe(categoryMarkerSymbol('乡村', true))
  })
})

describe('按市上墨（choropleth）', () => {
  it('hover 用不透明底色：透明会让悬停的城市变成洞、露出页面背景', () => {
    const geo = geoOf(buildAnhuiMapOption(sites, null)) as {
      emphasis?: { itemStyle?: { areaColor?: string } }
    }

    // 湖面已改成画在 geo 之上的 custom 系列，所以这里不需要靠透明来避让湖水；
    // 透明反而会让城市区域变成 alpha=0 的洞，露出页面背景图。
    expect(geo.emphasis?.itemStyle?.areaColor).not.toBe('transparent')
  })

  it('河道画在市域之上：同级 z 在生产构建里会被地图白底盖住', () => {
    const option = buildAnhuiMapOption(sites, null)
    const geo = geoOf(option) as { z?: number }
    const series = option.series as { id?: string; z?: number }[]
    const rivers = series.find((item) => item.id === 'rivers')
    const sitesSeries = series.find((item) => item.id === 'sites')

    // 实测：rivers 与 geo 同为 z=2 时，构建产物里的长江/淮河被市域盖掉一大半（2200 → 4895 px）
    expect(Number(rivers?.z)).toBeGreaterThan(Number(geo.z))
    expect(Number(rivers?.z)).toBeLessThan(Number(sitesSeries?.z))
  })

  it('省界光晕与河道都关掉补间：否则点簇放大时阴影/河线会比地图慢半拍', () => {
    const option = buildAnhuiMapOption(sites, null)
    const series = option.series as { id?: string; animation?: boolean }[]
    const animated = series.filter((item) => item.id === 'province-outline' || item.id === 'rivers')

    expect(animated).toHaveLength(2)
    for (const item of animated) expect(item.animation).toBe(false)
  })

  it('项目数分三档：0–1 原色、2–3 一档、≥4 两档', () => {
    expect(cityAreaTier(0)).toBe(0)
    expect(cityAreaTier(1)).toBe(0)
    expect(cityAreaTier(2)).toBe(1)
    expect(cityAreaTier(3)).toBe(1)
    expect(cityAreaTier(4)).toBe(2)
    expect(cityAreaTier(9)).toBe(2)
  })

  it('档位色取自 palette，0 档不返回（region 缺省即原色）', () => {
    // 依赖真实数据分布（63 条）：黄山 7、宣城 6、合肥/池州/安庆 5、蚌埠/马鞍山/滁州/六安/淮南 4（两档）；
    // 芜湖/淮北 2、亳州/铜陵/阜阳/宿州 2（一档）；没有 0–1 条的市
    const colors = buildCityAreaColors(sites, DEFAULT_PALETTE)

    expect(colors.get('黄山市')).toBe(DEFAULT_PALETTE.mapTier2)
    expect(colors.get('宣城市')).toBe(DEFAULT_PALETTE.mapTier2)
    expect(colors.get('池州市')).toBe(DEFAULT_PALETTE.mapTier2)
    expect(colors.get('安庆市')).toBe(DEFAULT_PALETTE.mapTier2)
    expect(colors.get('合肥市')).toBe(DEFAULT_PALETTE.mapTier2)
    expect(colors.get('蚌埠市')).toBe(DEFAULT_PALETTE.mapTier2)
    expect(colors.get('淮南市')).toBe(DEFAULT_PALETTE.mapTier2)
    expect(colors.get('六安市')).toBe(DEFAULT_PALETTE.mapTier2)
    expect(colors.get('芜湖市')).toBe(DEFAULT_PALETTE.mapTier1)
    expect(colors.get('铜陵市')).toBe(DEFAULT_PALETTE.mapTier1)
  })
})

describe('落墨入场动画', () => {
  it('默认关闭：筛选与聚合更新时不能出现「两点互换」的补间', () => {
    const option = buildAnhuiMapOption(sites, null)
    const series = (option.series as Array<{ id?: string; animation?: boolean }>).find(
      (item) => item.id === 'sites',
    )

    expect(series?.animation).toBe(false)
  })

  it('首帧开启并逐点错开，像墨点依次落纸', () => {
    const option = buildAnhuiMapOption(
      sites,
      null,
      undefined,
      DEFAULT_PALETTE,
      [],
      [],
      'anhui',
      [],
      new Set(),
      true,
    )
    const series = option.series as unknown as Array<{
      id?: string
      animation?: boolean
      animationDuration?: number
      animationDelay?: (idx: number) => number
    }>
    const sitesSeries = series.find((item) => item.id === 'sites')

    expect(sitesSeries?.animation).toBe(true)
    expect(sitesSeries?.animationDuration).toBeGreaterThan(0)
    // 错开延迟：第 0 个点立即开始，第 N 个点晚 N 拍
    expect(sitesSeries?.animationDelay?.(0)).toBe(0)
    expect(sitesSeries?.animationDelay?.(5)).toBeGreaterThan(0)
    // geo 与河道仍然不参与补间（缩放同步性的老约束）
    expect((geoOf(option) as { animation?: boolean }).animation).toBe(false)
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

    expect(geoOf(option)).toMatchObject({ map: 'anhui', roam: true })
    expect(scatterDataOf(option)).toHaveLength(sites.length)
  })

  it('拖动与缩放都交给 ECharts 原生 roam', () => {
    const geo = geoOf(buildAnhuiMapOption(sites, null)) as { roam?: boolean | string }

    // 'move'：只开平移，滚轮/双指/缩放条都走组件的缓动实现
    expect(geo.roam).toBe(true)
  })

  it('打开 geo 标签，市级划分才看得见', () => {
    const option = buildAnhuiMapOption(sites, null)
    const geo = geoOf(option) as {
      label?: { show?: boolean; color?: string }
      emphasis?: { label?: unknown }
    }

    expect(geo.label?.show).toBe(true)
    // hover 重绘会盖住湖面或挖洞，已整体关闭，交给 tooltip 做反馈
    expect((geo.emphasis as { disabled?: boolean } | undefined)?.disabled).toBe(true)
    // 市名升为墨色：地名是构图的一部分，不再是灰色注记
    expect(geo.label?.color).toBe('#1c1a17')
  })

  it('不写死 center/zoom，视野跟着底图自适应', () => {
    const geo = geoOf(buildAnhuiMapOption(sites, null))

    expect(geo['center']).toBeUndefined()
    expect(geo['zoom']).toBeUndefined()
  })

  it('省界内缩 8%，贴边地标不被画布裁掉', () => {
    const geo = geoOf(buildAnhuiMapOption(sites, null)) as {
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
    const geo = geoOf(option) as { scaleLimit?: { min?: number; max?: number } }

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

  it('精选项和别的点挤在一起时留在簇里，簇描金环提示「这里有精选」', () => {
    // 之前精选会被无条件拆出来单独画：黄山/宏村只差 28px、宏村/西递 15px，
    // 拆出来会互相压住，点谁都可能选错（Issue #16 的命中率复测里就是这样误点的）。
    const trio = sites.filter((site) => ['hongcun', 'xidi', 'tunxi-old-street'].includes(site.id))
    const data = toScatterData(
      trio,
      null,
      [{ ids: trio.map((site) => site.id), lng: 118, lat: 29.9 }],
      undefined,
      new Set(['hongcun']),
    )

    expect(data).toHaveLength(1)
    const cluster = data[0] as ClusterScatterDatum
    expect(cluster.count).toBe(3)
    expect(cluster.featured).toBe(true)
    expect(cluster.itemStyle.borderColor).toBe('#b08a4a')
  })

  it('精选独占一个点时仍然单独绘制，保留 42px 金环', () => {
    const solo = sites.filter((site) => site.id === 'hongcun')
    const data = toScatterData(
      solo,
      null,
      [{ ids: ['hongcun'], lng: 118, lat: 29.9 }],
      undefined,
      new Set(['hongcun']),
    )

    expect(data).toHaveLength(1)
    expect((data[0] as SiteScatterDatum).symbolSize).toBe(42)
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
