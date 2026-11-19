import type { EChartsOption } from 'echarts'

import { ANHUI_MAP_NAME } from '@/services/anhui-map-loader'
import type { Site, SiteCategory } from '@/types/site'

/** 分类配色。与 assets/main.css 中的 --cat-* 变量保持一致 */
export const CATEGORY_COLORS: Record<SiteCategory, string> = {
  古镇: '#b45309',
  非遗: '#7c3aed',
  红色: '#c53030',
  自然: '#0f766e',
  演艺: '#be185d',
  乡村: '#4d7c0f',
}

/**
 * 分类形状。只用颜色区分分类时，色觉障碍用户与黑白打印场景会丢失信息，
 * 所以再用形状做一层冗余编码（都是 ECharts 内置 symbol，不增加依赖与体积）。
 */
export const CATEGORY_SYMBOLS: Record<SiteCategory, string> = {
  古镇: 'circle',
  非遗: 'diamond',
  红色: 'pin',
  自然: 'triangle',
  演艺: 'roundRect',
  乡村: 'rect',
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

const SELECTED_SYMBOL_SIZE = 20
/**
 * 地标基础尺寸。点击命中判定用的是 symbol 自身的尺寸，没有「视觉小、命中大」的开关，
 * 所以把基础尺寸定在 13：小于 13 时贴边与密集区经常点不中（M1 要求命中率 100%）。
 */
const DEFAULT_SYMBOL_SIZE = 13

/** 把项目列表转成散点数据；选中的点放大，方便在密集区域里认出来 */
export function toScatterData(sites: Site[], selectedId: string | null): SiteScatterDatum[] {
  return sites.map((site) => {
    const selected = site.id === selectedId
    const color = CATEGORY_COLORS[site.category]

    return {
      name: site.name,
      value: [site.location.lng, site.location.lat],
      siteId: site.id,
      category: site.category,
      summary: site.summary,
      symbol: CATEGORY_SYMBOLS[site.category],
      symbolSize: selected ? SELECTED_SYMBOL_SIZE : DEFAULT_SYMBOL_SIZE,
      itemStyle: {
        color,
        borderColor: '#fffdf8',
        borderWidth: selected ? 2.5 : 1.4,
        shadowBlur: selected ? 12 : 4,
        shadowColor: 'rgba(52, 40, 24, 0.35)',
      },
      label: { show: selected },
    }
  })
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
  const datum = (params as { data?: Partial<SiteScatterDatum> }).data
  if (datum?.name === undefined) return ''

  const meta = [datum.category, datum.summary]
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
export function buildAnhuiMapOption(sites: Site[], selectedId: string | null): EChartsOption {
  const data = toScatterData(sites, selectedId)

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
        color: '#8a7a63',
        fontSize: 10,
      },
      itemStyle: {
        areaColor: '#efe7d8',
        borderColor: '#cbbfa8',
        borderWidth: 0.9,
      },
      emphasis: {
        itemStyle: { areaColor: '#e3d8c2' },
        label: { show: true, color: '#2a2620', fontWeight: 'bold' },
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
