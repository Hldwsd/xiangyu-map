import type { EChartsOption } from 'echarts'

import { categoryMarkerSymbol } from '@/components/icons/category-paths'
import type { MarkerGroup } from '@/components/map/cluster-sites'
import { ANHUI_MAP_NAME } from '@/services/anhui-map-loader'
import { DEFAULT_PALETTE, type ThemePalette } from '@/theme/theme'
import type { Site, SiteCategory } from '@/types/site'

/**
 * 分类配色。默认值与 tokens.css 里方向 A 的 `--cat-*` 一致；
 * 实际渲染时由组件从 CSS 变量读当前主题（见 theme.ts 的 readThemePalette），
 * 这样「换主题」不用改组件代码。
 */
export const CATEGORY_COLORS: Record<SiteCategory, string> = DEFAULT_PALETTE.category

/**
 * 分类形状：白底圆钉 + 墨色线条图标（屋檐 / 印章 / 旗帜 / 山峰 / 音符 / 树冠）。
 *
 * 早先用的是实心黑剪影，远看是一堆黑点、像脏东西；现在改成「白圆钉 + 细圈 + 内部线条」，
 * 黑白语言不变，但在浅灰底图上有层次。选中态反转成墨底白线（见 toSiteDatum）。
 * 线条与界面里的 CategoryIcon 共用同一份定义（category-paths.ts），地图与列表不会走形。
 */
export const CATEGORY_SYMBOLS: Record<SiteCategory, string> = {
  古镇: categoryMarkerSymbol('古镇'),
  非遗: categoryMarkerSymbol('非遗'),
  红色: categoryMarkerSymbol('红色'),
  自然: categoryMarkerSymbol('自然'),
  演艺: categoryMarkerSymbol('演艺'),
  乡村: categoryMarkerSymbol('乡村'),
}

export interface SiteScatterDatum {
  name: string
  /** ECharts geo 坐标系顺序是 [lng, lat] */
  value: [number, number]
  siteId: string
  category: SiteCategory
  summary: string
  symbol: string
  symbolSize: number
  itemStyle: {
    color: string
    borderColor: string
    borderWidth: number
    shadowBlur: number
    shadowColor: string
  }
  label: {
    show: boolean
  }
}

/**
 * 聚合后的簇。屏幕距离太近的几个地标合成一颗带数字的点，点它放大到能分开为止。
 *
 * 这里没有 `category`：一个簇里可能混着不同分类，硬塞一个颜色等于撒谎。
 * 簇用中性色 + 数量，颜色只在单点时表达分类。
 */
export interface ClusterScatterDatum {
  name: string
  value: [number, number]
  clusterIds: string[]
  clusterNames: string[]
  count: number
  symbol: string
  symbolSize: number
  itemStyle: {
    color: string
    borderColor: string
    borderWidth: number
    shadowBlur: number
    shadowColor: string
  }
  label: {
    show: boolean
    formatter: string
    color: string
    fontSize: number
    fontWeight: 'bold'
  }
}

export type MapScatterDatum = SiteScatterDatum | ClusterScatterDatum

const SELECTED_SYMBOL_SIZE = 34
/**
 * 地标基础尺寸。点击命中判定用的是 symbol 自身的尺寸，没有「视觉小、命中大」的开关，
 * 圆钉内部是线条图标，28px 才认得出是屋檐还是山峰；图片符号的命中区就是整个方框，
 * 比早先的实心剪影更好点中（剪影只命中填充像素）。
 */
const DEFAULT_SYMBOL_SIZE = 28

/** 聚合点的基础直径与上限：数量靠标签表达，尺寸只给一个「这坨更大」的暗示 */
const CLUSTER_BASE_SIZE = 18
const CLUSTER_MAX_SIZE = 34

/** 把项目列表转成散点数据；选中的点放大，方便在密集区域里认出来 */
export function toScatterData(
  sites: Site[],
  selectedId: string | null,
  groups?: MarkerGroup[],
  palette: ThemePalette = DEFAULT_PALETTE,
): MapScatterDatum[] {
  // 没给分组时按「每个项目一颗」处理：默认视野下不聚合，
  // 聚合是组件拿到像素坐标之后的决定（见 refreshMarkers）。
  if (groups === undefined) {
    return sites.map((site) => toSiteDatum(site, selectedId, palette))
  }

  const byId = new Map(sites.map((site) => [site.id, site]))
  const data: MapScatterDatum[] = []

  for (const group of groups) {
    if (group.ids.length === 1) {
      const site = byId.get(group.ids[0] ?? '')
      if (site !== undefined) data.push(toSiteDatum(site, selectedId, palette))
      continue
    }

    const members = group.ids
      .map((id) => byId.get(id))
      .filter((site): site is Site => site !== undefined)
    if (members.length === 0) continue

    const count = members.length
    data.push({
      name: `${count} 个文旅项目`,
      value: [group.lng, group.lat],
      clusterIds: group.ids,
      clusterNames: members.map((site) => site.name),
      count,
      symbol: 'circle',
      // 数字越大点越大，但按对数增长：20 个目标的簇不该吃掉半张地图
      symbolSize: Math.min(CLUSTER_MAX_SIZE, CLUSTER_BASE_SIZE + Math.log2(count) * 4),
      itemStyle: {
        color: palette.cluster,
        borderColor: '#ffffff',
        borderWidth: 2,
        shadowBlur: 10,
        shadowColor: 'rgba(52, 40, 24, 0.4)',
      },
      label: {
        show: true,
        formatter: String(count),
        color: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
      },
    })
  }

  return data
}

function toSiteDatum(
  site: Site,
  selectedId: string | null,
  palette: ThemePalette,
): SiteScatterDatum {
  const selected = site.id === selectedId
  const color = palette.category[site.category]

  return {
    name: site.name,
    value: [site.location.lng, site.location.lat],
    siteId: site.id,
    category: site.category,
    summary: site.summary,
    // 选中态是另一张图（墨底白线），所以符号要按状态取，不能共用一张
    symbol: categoryMarkerSymbol(site.category, selected),
    symbolSize: selected ? SELECTED_SYMBOL_SIZE : DEFAULT_SYMBOL_SIZE,
    itemStyle: {
      // 圆钉本身已经带了白底与描边（SVG 里），这里只留一点投影做层次
      color,
      borderColor: 'transparent',
      borderWidth: 0,
      shadowBlur: selected ? 10 : 6,
      shadowColor: 'rgba(17, 17, 17, 0.18)',
    },
    label: { show: selected },
  }
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** tooltip 是 HTML 字符串，数据里的文字必须先转义，避免文案里的 < > 把结构弄坏 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char: string) => HTML_ESCAPES[char] ?? char)
}

/**
 * tooltip 内容。抽成独立函数是为了能被单测直接覆盖（不依赖 ECharts 渲染）。
 */
export function formatSiteTooltip(params: unknown): string {
  const datum = (params as { data?: Partial<MapScatterDatum> }).data
  if (datum === undefined) return ''

  // 簇：先说「几个」，再把名字列出来——用户关心的是「这里藏了什么」，
  // 光给一个 3 是查不到东西的。
  const cluster = datum as Partial<ClusterScatterDatum>
  if (cluster.clusterNames !== undefined && cluster.clusterNames.length > 0) {
    const names = cluster.clusterNames.map((name) => escapeHtml(name)).join('、')
    return `<strong>${cluster.count ?? cluster.clusterNames.length} 个文旅项目</strong><br/>${names}<br/><span style="opacity:.7">点击放大查看</span>`
  }

  if (datum.name === undefined) return ''
  const meta = [
    (datum as Partial<SiteScatterDatum>).category,
    (datum as Partial<SiteScatterDatum>).summary,
  ]
    .filter((part) => part !== undefined && part !== '')
    .join(' · ')
  return `<strong>${escapeHtml(datum.name)}</strong><br/>${escapeHtml(meta)}`
}

/**
 * 构建首页地图配置。
 *
 * 只用了 geo + scatter 两种能力，没有引入 map 系列 / 地图漫游以外的组件，
 * 是为了守住首屏 JS ≤300KB 的预算（echarts 按需引入）。
 *
 * 市级划分靠 geo 的默认行为：底图是 16 个地级市要素，每个要素自带边界与名称，
 * 所以「划线 + 标市名」不需要额外画图层；这里只调样式与层级。
 */
export function buildAnhuiMapOption(
  sites: Site[],
  selectedId: string | null,
  groups?: MarkerGroup[],
  palette: ThemePalette = DEFAULT_PALETTE,
): EChartsOption {
  const data = toScatterData(sites, selectedId, groups, palette)

  return {
    backgroundColor: 'transparent',
    animationDuration: 420,
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(28, 26, 22, 0.94)',
      borderWidth: 0,
      padding: [10, 12],
      textStyle: { color: '#f7f3ea', fontSize: 12, lineHeight: 18 },
      formatter: formatSiteTooltip,
    },
    geo: {
      map: ANHUI_MAP_NAME,
      roam: true,
      // 默认按底图完整范围自适应：16 个市必须全部在视野内，
      // 否则「某个市没有项目」会被误读成「那个市不存在」。
      scaleLimit: { min: 0.9, max: 8 },
      selectedMode: false,
      /**
       * 留 8% 内边距。省界正好贴住画布边缘时，边界上地标的圆点会被裁掉一半，
       * 视觉上像「半个点」，点击命中区也随之变小——这是 M1「贴边地标也要点得中」的直接前提。
       */
      layoutCenter: ['50%', '50%'],
      layoutSize: '92%',
      label: {
        show: true,
        color: palette.mapLabel,
        fontSize: 10,
      },
      itemStyle: {
        areaColor: palette.mapArea,
        borderColor: palette.mapBorder,
        borderWidth: 0.9,
      },
      emphasis: {
        itemStyle: { areaColor: palette.mapAreaHover },
        label: { show: true, color: palette.mapLabel, fontWeight: 'bold' },
      },
    },
    series: [
      {
        id: 'sites',
        name: '文旅项目',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 2,
        data,
        cursor: 'pointer',
        emphasis: {
          scale: 1.6,
          itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
        },
      },
    ],
  }
}
