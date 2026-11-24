import type { EChartsOption } from 'echarts'

import { categoryMarkerSymbol } from '@/components/icons/category-paths'
import type { MarkerGroup } from '@/components/map/cluster-sites'
import { markerClusterKey } from '@/components/map/cluster-sites'
import { ANHUI_MAP_NAME } from '@/services/anhui-map-loader'
import { DEFAULT_PALETTE, type ThemePalette } from '@/theme/theme'
import type { Site, SiteCategory } from '@/types/site'

/**
 * 分类配色。单色方向下七类同色（分类靠形状区分）；
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
  场馆: categoryMarkerSymbol('场馆'),
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
  /** 重叠时沿小圆环散开的像素偏移（不合并模式用） */
  symbolOffset?: [number, number]
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
  /** 成员排序后的稳定键，供合并/拆分动画找回上一帧 */
  clusterKey?: string
  /** 物理偏移（像素）；合并/拆分/悬停时临时写入 */
  symbolOffset?: [number, number]
  /** 簇里是否含「本期精选」：含则描金环，避免折叠后推荐位完全看不出来 */
  featured: boolean
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

/** 省界光晕：同一圈轮廓按不同线宽/浓度画三遍，越外越浅 */
export interface OutlineRing {
  coords: [number, number][]
  width: number
  alpha: string
}

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
 * 圆钉尺寸。36 在省域视野下既能辨认 S1 线条、命中区也够大；
 * 精选项目（本期精选）用 42 并加金色虚线环，制造「重点」的视觉层级；
 * 48 只给选中项，配金色虚线环，不靠颜色也能一眼找到。
 */
const DEFAULT_SYMBOL_SIZE = 36
const FEATURED_SYMBOL_SIZE = 42

/**
 * 按市收录项目数分三档：0–1 个保持原色，2–3 个一档，≥4 个最深一档。
 * 纸本语言里「浓墨对淡墨」才成立——全市一个颜色时地图像没上墨的底稿，
 * 按数据深浅上墨后，「皖南最密」这一眼可读的空间信息不需要任何交互就能看到。
 */
export function cityAreaTier(count: number): 0 | 1 | 2 {
  if (count >= 4) return 2
  if (count >= 2) return 1
  return 0
}

/**
 * 16 个市的市名 → 底色。0 档（原色）不返回，region 缺省即原色，
 * 这样 hover/emphasis 的原色兜底逻辑不用关心档位。
 */
export function buildCityAreaColors(
  sites: Site[],
  palette: ThemePalette = DEFAULT_PALETTE,
): Map<string, string> {
  const counts = new Map<string, number>()
  for (const site of sites) counts.set(site.city, (counts.get(site.city) ?? 0) + 1)

  const colors = new Map<string, string>()
  for (const [city, count] of counts) {
    const tier = cityAreaTier(count)
    if (tier === 1) colors.set(city, palette.mapTier1)
    if (tier === 2) colors.set(city, palette.mapTier2)
  }
  return colors
}

/** 聚合点的基础直径与上限：数量靠标签表达，尺寸只给一个「这坨更大」的暗示 */
const CLUSTER_BASE_SIZE = 18
const CLUSTER_MAX_SIZE = 30

/** 把项目列表转成散点数据；选中项放大，精选项加金环，方便在密集区域里认出来 */
export function toScatterData(
  sites: Site[],
  selectedId: string | null,
  groups?: MarkerGroup[],
  palette: ThemePalette = DEFAULT_PALETTE,
  featuredIds: ReadonlySet<string> = new Set<string>(),
): MapScatterDatum[] {
  // 没给分组时按「每个项目一颗」处理：默认视野下不聚合，
  // 聚合是组件拿到像素坐标之后的决定（见 refreshMarkers）。
  if (groups === undefined) {
    return sites.map((site) => toSiteDatum(site, selectedId, palette, featuredIds))
  }

  const byId = new Map(sites.map((site) => [site.id, site]))
  const data: MapScatterDatum[] = []
  /** 选中项如果被并进簇，先单独拿出来，最后再画，保证它一定看得见 */
  let selectedDatum: SiteScatterDatum | null = null

  for (const group of groups) {
    const ids = group.ids
    if (ids.length === 1) {
      const site = byId.get(ids[0] ?? '')
      if (site !== undefined) data.push(toSiteDatum(site, selectedId, palette, featuredIds))
      continue
    }

    // 选中项一定要拆出来：它消失了会出现「卡片有、图上无」。
    // 精选只在「独占一个簇」时才单独画；如果它和别的点挤在 36px 内，硬拆出来会互相压住、
    // 点谁都可能选错（黄山/宏村 28px、宏村/西递 15px 就是实测到的误点来源），
    // 这种情况让它留在簇里，并用金环提示「这簇里有精选」。
    const pulledOut: string[] = []
    const remainingIds = ids.filter((id) => {
      if (id === selectedId) {
        pulledOut.push(id)
        return false
      }
      return true
    })
    if (selectedId !== null && pulledOut.includes(selectedId)) {
      const site = byId.get(selectedId)
      if (site !== undefined) {
        selectedDatum = toSiteDatum(site, selectedId, palette, featuredIds)
      }
    }
    for (const id of pulledOut) {
      if (id === selectedId) continue
      const site = byId.get(id)
      if (site !== undefined) data.push(toSiteDatum(site, selectedId, palette, featuredIds))
    }

    if (remainingIds.length === 1) {
      const site = byId.get(remainingIds[0] ?? '')
      if (site !== undefined) data.push(toSiteDatum(site, selectedId, palette, featuredIds))
      continue
    }
    if (remainingIds.length === 0) continue

    const members = remainingIds
      .map((id) => byId.get(id))
      .filter((site): site is Site => site !== undefined)
    if (members.length === 0) continue

    const count = members.length
    const hasFeatured = members.some((site) => featuredIds.has(site.id))
    data.push({
      name: `${count} 个文旅项目`,
      value: [group.lng, group.lat],
      clusterIds: remainingIds,
      clusterNames: members.map((site) => site.name),
      clusterKey: markerClusterKey(remainingIds),
      featured: hasFeatured,
      count,
      symbol: 'circle',
      // 数字越大点越大，但按对数增长：20 个目标的簇不该吃掉半张地图
      symbolSize: Math.min(CLUSTER_MAX_SIZE, CLUSTER_BASE_SIZE + Math.log2(count) * 4),
      itemStyle: {
        // 聚合点比地标「轻」：纸色圆盘 + 墨圈，数字用墨色；
        // 早期用纯黑圆 + 白字，远看黑簇先跳出来，把地标压住了。
        color: PAPER,
        // 含精选的簇描金环：折叠之后仍能看出「这簇里有推荐位」
        borderColor: hasFeatured ? GOLD : INK,
        borderWidth: hasFeatured ? 1.8 : 1.2,
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
  featuredIds: ReadonlySet<string> = new Set<string>(),
): SiteScatterDatum {
  const selected = site.id === selectedId
  // 选中优先于精选：一个点同时命中两种状态时，用选中态（更强调）
  const featured = !selected && featuredIds.has(site.id)
  const color = palette.category[site.category]

  return {
    name: site.name,
    value: [site.location.lng, site.location.lat],
    siteId: site.id,
    category: site.category,
    summary: site.summary,
    // 选中态是另一张图（墨底白线），所以符号要按状态取，不能共用一张
    symbol: categoryMarkerSymbol(site.category, selected, featured),
    symbolSize: selected
      ? SELECTED_SYMBOL_SIZE
      : featured
        ? FEATURED_SYMBOL_SIZE
        : DEFAULT_SYMBOL_SIZE,
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
  featuredIds: ReadonlySet<string> = new Set<string>(),
  animateIn = false,
): EChartsOption {
  const data = toScatterData(sites, selectedId, groups, palette, featuredIds)

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
      // 省界光晕是 lines 系列（z 1），geo 抬到 z 2 才能盖住描边向内的那一半
      z: 2,
      // geo 自己的形变动画会让「地图」比「地标」晚一截：散点位置按目标变换立即计算，
      // 而 polygons 还在 300–400ms 的补间里。平滑由组件的 rAF 补间负责，这里必须关掉。
      animation: false,
      // 默认按底图完整范围自适应：16 个市必须全部在视野内，
      // 否则「某个市没有项目」会被误读成「那个市不存在」。
      scaleLimit: { min: 0.9, max: 5 },
      selectedMode: false,
      /**
       * 留 8% 内边距。省界正好贴住画布边缘时，边界上地标的圆点会被裁掉一半，
       * 视觉上像「半个点」，点击命中区也随之变小——这是 M1「贴边地标也要点得中」的直接前提。
       */
      layoutCenter: ['50%', '50%'],
      layoutSize: '92%',
      label: {
        show: true,
        // 市名是地名本身的文化资产，升为墨色宋体加大：市名从「灰色注记」
        // 变成构图的一部分，纸色描边负责把它从河道与地标上抬起来
        color: INK,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: MAP_FONT,
        textBorderColor: PAPER,
        textBorderWidth: 2,
      },
      itemStyle: {
        areaColor: palette.mapArea,
        // 描边只由下面 regions 的逐要素样式负责：geo 层再画一遍会形成「双线/空心线」
        borderColor: 'transparent',
        borderWidth: 0,
      },
      // 区县界与水域和市域合并成一张地图，用 regions 逐要素改样式
      regions,
      /**
       * 关掉 hover 的区域重绘。
       *
       * ECharts 悬停时会把该区域重画在所有兄弟 region 之上：不透明会把湖面盖成纸色，
       * 填透明又会让城市变成露出页面背景的洞——湖面与河流只要还在这个 geo 里就躲不开。
       * 悬停反馈交给 tooltip（trigger: item），地图本身保持不动。
       */
      emphasis: { disabled: true },
    },
    series: [
      {
        id: 'rivers',
        type: 'lines',
        coordinateSystem: 'geo',
        // 与 geo/散点同处 zlevel 0：分层画布在缩放时会出现「地标与地图不同步」
        zlevel: 0,
        // 必须高于 geo（z=2）：同 z 时谁在上取决于组件注册顺序，生产构建里河道会被市域白底盖住
        z: 2.5,
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
        // 城市描边的柔光：宽、低透明度，只加在线的外层，不填市域，区县界线仍然透出来
        id: 'city-highlight-halo',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 0,
        z: 2.65,
        silent: true,
        animation: false,
        polyline: true,
        lineStyle: {
          color: 'rgba(140, 58, 50, 0.12)',
          width: 7,
          opacity: 1,
          cap: 'round',
          join: 'round',
        },
        data: [],
      },
      {
        // 市界单独画成线条：如果靠 geo region 的 border，区县要素会在它上面再画一遍，
        // 把市界冲成浅灰细线（放大后尤其明显）。独立线条后画，压住区县线、清晰不虚。
        id: 'city-borders',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 0,
        z: 2.4,
        silent: true,
        animation: false,
        polyline: true,
        lineStyle: {
          color: palette.mapBorder,
          width: 1.4,
          opacity: 1,
          cap: 'round',
          join: 'round',
        },
        data: [],
      },
      {
        // 选中/悬停城市的描边：独立 lines 叠加层，而不是改 geo region 的 fill/border。
        // region border 在相邻市界会画两遍、缩放时发虚，还会盖住区县界线；
        // 单独一条矢量线可以压在区县线之上、地标之下，缩放后仍跟着 geo 投影。
        id: 'city-highlight',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 0,
        z: 2.7,
        silent: true,
        animation: false,
        polyline: true,
        lineStyle: {
          color: '#8c3a32',
          width: 2.2,
          opacity: 1,
          cap: 'round',
          join: 'round',
        },
        data: [],
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
        /**
         * 首帧「落墨」入场：按数据下标逐点错开淡入，像墨点依次落纸。
         * 只在首次渲染开启（animateIn）；之后的更新（筛选/聚合/散开）必须关——
         * 数据项整体换位置，开动画会出现「两个合并点互换」的错觉。
         */
        animation: animateIn,
        animationDuration: 460,
        animationDelay: (idx: number): number => idx * 28,
        animationEasing: 'cubicOut',
        emphasis: {
          // 不放大：hover 放大后的球会盖住旁边的球，看起来像「碰撞消失了」
          scale: false,
        },
      },
    ],
  }
}
