import type { SiteCategory } from '@/types/site'

/** 组件里用到的一套配色：分类色 + 地图配色（单色方向下分类同色，靠 S1 形状区分） */
export interface ThemePalette {
  category: Record<SiteCategory, string>
  mapArea: string
  /** 按市收录项目数分档的纸色加深：2–3 个用 tier1，≥4 个用 tier2（0–1 个用 mapArea 原色） */
  mapTier1: string
  mapTier2: string
  mapBorder: string
  mapLabel: string
  mapAreaHover: string
  /** 聚合点颜色：与地标同色，靠纸底与尺寸区分 */
  cluster: string
  /** 水域填充与描边 */
  waterFill: string
  waterBorder: string
  /** 区县界：只做纹理，比市界更浅 */
  districtLine: string
  /** 河道线：比湖泊描边略深，线才看得见 */
  riverLine: string
}

/**
 * 纸本墨线方向的兜底值，与 tokens.css 的默认值保持一致。
 * 组件在没有 DOM（单测）或变量缺失时用它，保证渲染结果可预期。
 */
export const DEFAULT_PALETTE: ThemePalette = {
  category: {
    古镇: '#1c1a17',
    非遗: '#1c1a17',
    红色: '#1c1a17',
    自然: '#1c1a17',
    演艺: '#1c1a17',
    乡村: '#1c1a17',
    场馆: '#1c1a17',
  },
  mapArea: '#fcf8ee',
  mapTier1: '#f5eddb',
  mapTier2: '#ecdfc4',
  mapBorder: '#b1a184',
  mapLabel: '#5e564b',
  mapAreaHover: '#f7f1e5',
  cluster: '#1c1a17',
  waterFill: '#dce4e1',
  waterBorder: '#c3d0cb',
  districtLine: '#a2957d',
  riverLine: '#8fa39d',
}

const CATEGORY_VARS: Record<SiteCategory, string> = {
  古镇: '--cat-ancient-town',
  非遗: '--cat-intangible',
  红色: '--cat-red',
  自然: '--cat-nature',
  演艺: '--cat-performance',
  乡村: '--cat-village',
  场馆: '--cat-venue',
}

/**
 * 从 CSS 变量读当前配色；拿不到（单测/无 DOM）时返回默认值。
 *
 * 为什么绕这一层：地图配色归 tokens.css 管，组件不该各自再存一份颜色，
 * 否则「改主色」要改两个地方，迟早不一致。
 */
export function readThemePalette(): ThemePalette {
  if (typeof window === 'undefined' || typeof document === 'undefined') return DEFAULT_PALETTE

  const styles = window.getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string): string => {
    const value = styles.getPropertyValue(name).trim()
    return value === '' ? fallback : value
  }

  const category = { ...DEFAULT_PALETTE.category }
  for (const [name, variable] of Object.entries(CATEGORY_VARS)) {
    const key = name as SiteCategory
    category[key] = read(variable, DEFAULT_PALETTE.category[key])
  }

  return {
    category,
    mapArea: read('--map-area', DEFAULT_PALETTE.mapArea),
    mapTier1: read('--map-tier-1', DEFAULT_PALETTE.mapTier1),
    mapTier2: read('--map-tier-2', DEFAULT_PALETTE.mapTier2),
    mapBorder: read('--map-border', DEFAULT_PALETTE.mapBorder),
    mapLabel: read('--map-label', DEFAULT_PALETTE.mapLabel),
    mapAreaHover: read('--map-area-hover', DEFAULT_PALETTE.mapAreaHover),
    cluster: read('--cluster', DEFAULT_PALETTE.cluster),
    waterFill: read('--water-fill', DEFAULT_PALETTE.waterFill),
    waterBorder: read('--water-border', DEFAULT_PALETTE.waterBorder),
    districtLine: read('--district-line', DEFAULT_PALETTE.districtLine),
    riverLine: read('--river-line', DEFAULT_PALETTE.riverLine),
  }
}
