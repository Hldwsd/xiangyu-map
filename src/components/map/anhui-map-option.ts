import type { EChartsOption } from 'echarts'

import { categoryMarkerSymbol } from '@/components/icons/category-paths'
import type { MarkerGroup } from '@/components/map/cluster-sites'
import { ANHUI_MAP_NAME } from '@/services/anhui-map-loader'
import { DEFAULT_PALETTE, type ThemePalette } from '@/theme/theme'
import type { Site, SiteCategory } from '@/types/site'

/**
 * 分类配色。单色方向下六类同色（分类靠形状区分）；
 * 实际渲染时由组件从 CSS 变量读当前主题（见 services/theme 的 readThemePalette）。
 */
export const CATEGORY_COLORS: Record<SiteCategory, string> = DEFAULT_PALETTE.category

/**
 * 分类符号：纸白圆钉 + 墨色 S1 曲线图标（古镇 / 稻穗 / 折扇 / 飘旗 / 山脊 / 鼓）。
 * 线条定义在 category-paths.ts，与界面里的 CategoryIcon 共用。
 */
export const CATEGORY_SYMBOLS: Record<SiteCategory, string> = {
  古镇: categoryMarkerSymbol('古镇'),
  非遗: categoryMarkerSymbol('非遗'),
  红色: categoryMarkerSymbol('红色'),
  自然: categoryMarkerSymbol('自然'),
  演艺: categoryMarkerSymbol('演艺'),
  乡村: categoryMarkerSymbol('乡村'),
}

/** 与 tokens.css / 纸本样张一致：纸、墨、金 */
const PAPER = '#fbf6ea'
const INK = '#1c1a17'
const GOLD = '#b08a4a'
const MAP_FONT = "'Songti SC', 'STSong', 'SimSun', 'Noto Serif CJK SC', serif"

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
    formatter?: string
    position?: 'right'
    distance?: number
    color?: string
    fontSize?: number
    fontFamily?: string
    backgroundColor?: string
    borderColor?: string
    borderWidth?: number
    padding?: number[]
    borderRadius?: number
  }
}

/**
 * 聚合后的簇。屏幕距离太近的几个地标合成一颗带数字的点，点它放大到能分开为止。
 * 这里没有 `category`：一个簇里可能混着不同分类，硬塞一个颜色等于撒谎。
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

/** 河道线：一条河可能由很多段组成 */
export interface RiverLine {
  name: string
  width: number
  coords: [number, number][]
}

/** 逐要素样式：区县界只画线、水域填浅蓝、市域保持默认 */
export interface MapRegionStyle {
  name: string
  itemStyle: {
    areaColor: string
    borderColor: string
    borderWidth: number
  }
  emphasis?: {
    itemStyle?: { areaColor?: string; borderColor?: string; borderWidth?: number }
    disabled?: boolean
  }
  /** 该要素是否响应鼠标：低倍只让市域可选中，高倍只让区县可选中 */
  silent?: boolean
  label?: { show: boolean }
}

const SELECTED_SYMBOL_SIZE = 48
/**
 * 圆钉尺寸。34 在省域视野下既能辨认 S1 线条、命中区也够大；
 * 46 只给选中项，配金色虚线环，不靠颜色也能一眼找到。
 */
const DEFAULT_SYMBOL_SIZE = 36

/** 聚合点的基础直径与上限：数量靠标签表达，尺寸只给一个「这坨更大」的暗示 */
const CLUSTER_BASE_SIZE = 18
const CLUSTER_MAX_SIZE = 30

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
  /** 选中项如果被并进簇，先单独拿出来，最后再画，保证它一定看得见 */
  let selectedDatum: SiteScatterDatum | null = null

  for (const group of groups) {
    const ids = group.ids
    if (ids.length === 1) {
      const site = byId.get(ids[0] ?? '')
      if (site !== undefined) data.push(toSiteDatum(site, selectedId, palette))
      continue
    }

    const containsSelected = selectedId !== null && ids.includes(selectedId)
    const remainingIds = containsSelected ? ids.filter((id) => id !== selectedId) : ids
    if (containsSelected && selectedId !== null) {
      const site = byId.get(selectedId)
      if (site !== undefined) selectedDatum = toSiteDatum(site, selectedId, palette)
    }

    if (remainingIds.length === 1) {
      const site = byId.get(remainingIds[0] ?? '')
      if (site !== undefined) data.push(toSiteDatum(site, selectedId, palette))
      continue
    }
    if (remainingIds.length === 0) continue

    const members = remainingIds
      .map((id) => byId.get(id))
      .filter((site): site is Site => site !== undefined)
    if (members.length === 0) continue

    const count = members.length
    data.push({
      name: `${count} 个文旅项目`,
      value: [group.lng, group.lat],
      clusterIds: remainingIds,
      clusterNames: members.map((site) => site.name),
      count,
      symbol: 'circle',
      // 数字越大点越大，但按对数增长：20 个目标的簇不该吃掉半张地图
      symbolSize: Math.min(CLUSTER_MAX_SIZE, CLUSTER_BASE_SIZE + Math.log2(count) * 4),
      itemStyle: {
        // 聚合点比地标「轻」：纸色圆盘 + 墨圈，数字用墨色；
        // 早期用纯黑圆 + 白字，远看黑簇先跳出来，把地标压住了。
        color: PAPER,
        borderColor: INK,
        borderWidth: 1.2,
        shadowBlur: 6,
        shadowColor: 'rgba(28, 26, 23, 0.18)',
      },
      label: {
        show: true,
        formatter: String(count),
        color: INK,
        fontSize: 9.5,
        fontWeight: 'bold',
      },
    })
  }

  if (selectedDatum !== null) data.push(selectedDatum)

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
      // 圆钉自身已有纸底与细圈，不再加 canvas 阴影：阴影会溢出到河道上，把水系盖出灰边
      color,
      borderColor: 'transparent',
      borderWidth: 0,
      shadowBlur: 0,
      shadowColor: 'transparent',
    },
    // 选中项的名称做成纸色小签：不靠面板也能知道点到了哪里
    label: selected
      ? {
          show: true,
          formatter: site.name,
          position: 'right',
          distance: 8,
          color: INK,
          fontSize: 11,
          fontFamily: MAP_FONT,
          backgroundColor: PAPER,
          borderColor: GOLD,
          borderWidth: 1,
          padding: [4, 7],
          borderRadius: 0,
        }
      : { show: false },
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
 * 市级划分靠 geo 的默认行为：底图是合并后的 FeatureCollection（市域 + 水域 + 区县），
 * 每个要素自带边界与名称，所以「划线 + 标市名」不需要额外画图层；区县与水域靠 regions 逐要素改样式。
 */
export function buildAnhuiMapOption(
  sites: Site[],
  selectedId: string | null,
  groups?: MarkerGroup[],
  palette: ThemePalette = DEFAULT_PALETTE,
  regions: MapRegionStyle[] = [],
  rivers: RiverLine[] = [],
  mapName: string = ANHUI_MAP_NAME,
): EChartsOption {
  const data = toScatterData(sites, selectedId, groups, palette)

  return {
    backgroundColor: 'transparent',
    animationDuration: 420,
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: PAPER,
      borderColor: GOLD,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: INK, fontSize: 12, lineHeight: 18, fontFamily: MAP_FONT },
      // 让 tooltip 永远压在右侧详情卡下面（卡片 z-index 16），别盖住面板
      extraCssText: 'z-index: 12; box-shadow: 0 10px 24px -16px rgba(28,26,23,.45);',
      formatter: formatSiteTooltip,
    },
    geo: {
      map: mapName,
      // 拖动会让人误以为整张图可以随便拖走，而且省域在视野里本来就固定；
      // 缩放交给组件自己的滚轮/缩放条（带动画），所以这里既不开拖动也不开滚轮。
      // 拖动与滚轮/双指缩放都交给 ECharts 原生 roam：同一套变换、同一个渲染帧，
      // 不会出现「地图/河道/地标谁慢半拍」。缩放条与点簇仍是组件直接设置 zoom。
      // 拖动范围由组件在 georoam 里夹住，不能把省域拖出视野。
      roam: true,
      // geo 自己的形变动画会让「地图」比「地标」晚一截：散点位置按目标变换立即计算，
      // 而 polygons 还在 300–400ms 的补间里。平滑由组件的 rAF 补间负责，这里必须关掉。
      animation: false,
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
        fontSize: 10.5,
        fontFamily: MAP_FONT,
        // 纸色描边把市名从地标与河道上「抬」起来，16 个市名才读得清
        textBorderColor: PAPER,
        textBorderWidth: 2,
      },
      itemStyle: {
        areaColor: palette.mapArea,
        borderColor: palette.mapBorder,
        borderWidth: 0.8,
      },
      // 区县界与水域和市域合并成一张地图，用 regions 逐要素改样式
      regions,
      emphasis: {
        // 只加深描边、不铺灰底：灰底会把底下的河道盖住（用户实测到的问题）
        itemStyle: {
          areaColor: palette.mapArea,
          borderColor: palette.mapLabel,
          borderWidth: 1.2,
        },
        label: { show: true, color: palette.mapLabel, fontWeight: 'bold' },
      },
    },
    series: [
      {
        id: 'rivers',
        type: 'lines',
        coordinateSystem: 'geo',
        // 与 geo/散点同处 zlevel 0：分层画布在缩放时会出现「地标与地图不同步」
        zlevel: 0,
        z: 2,
        silent: true,
        // 和散点一样必须关掉补间：geo 的 zoom 是瞬时生效的，lines 若还按 420ms 补间，
        // 缩放时河道就会比地图与地标晚半拍（用户实测到的那一条）。
        animation: false,
        // polyline：把每条河的折线整体画出来，而不是首尾相连的「飞线」
        polyline: true,
        // 河道按「水面」画：与湖水同色、圆头、足够宽，缩到省域视野也看得出是水系
        lineStyle: { color: palette.riverLine, opacity: 1, cap: 'round', join: 'round' },
        data: rivers.map((river) => ({
          coords: river.coords,
          lineStyle: { width: river.width },
        })),
      },
      {
        id: 'sites',
        name: '文旅项目',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 0,
        z: 3,
        data,
        cursor: 'pointer',
        // 聚合/散开时数据项整体换位置，开动画会出现「两个合并点互换」的错觉
        animation: false,
        emphasis: {
          // 圆钉自带 1.6px 墨圈，hover 只轻微放大；白描边在纸白钉上不可见，已去掉
          scale: 1.12,
        },
      },
    ],
  }
}
