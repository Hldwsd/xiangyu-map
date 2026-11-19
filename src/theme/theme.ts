import type { SiteCategory } from '@/types/site'

/** 组件里用到的一套配色：分类色 + 地图配色（单色方向下分类同色，靠形状区分） */
export interface ThemePalette {
  category: Record<SiteCategory, string>
  mapArea: string
  mapBorder: string
  mapLabel: string
  mapAreaHover: string
  /** 聚合点颜色：与地标同色，靠白色数字与尺寸区分 */
  cluster: string
}

/**
 * 黑白 / 现代简约方向的兜底值，与 tokens.css 的默认值保持一致。
 * 组件在没有 DOM（单测）或变量缺失时用它，保证渲染结果可预期。
 */
export const DEFAULT_PALETTE: ThemePalette = {
  category: {
    古镇: '#111111',
    非遗: '#111111',
    红色: '#111111',
    自然: '#111111',
    演艺: '#111111',
    乡村: '#111111',
  },
  mapArea: '#f2f2f2',
  mapBorder: '#dedede',
  mapLabel: '#8c8c8c',
  mapAreaHover: '#e8e8e8',
  cluster: '#111111',
}

const CATEGORY_VARS: Record<SiteCategory, string> = {
  古镇: '--cat-ancient-town',
  非遗: '--cat-intangible',
  红色: '--cat-red',
  自然: '--cat-nature',
  演艺: '--cat-performance',
  乡村: '--cat-village',
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
    mapBorder: read('--map-border', DEFAULT_PALETTE.mapBorder),
    mapLabel: read('--map-label', DEFAULT_PALETTE.mapLabel),
    mapAreaHover: read('--map-area-hover', DEFAULT_PALETTE.mapAreaHover),
    cluster: read('--cluster', DEFAULT_PALETTE.cluster),
  }
}
