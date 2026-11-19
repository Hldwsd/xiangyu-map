import type { SiteCategory } from '@/types/site'

export const THEME_IDS = ['a', 'b', 'c'] as const
export type ThemeId = (typeof THEME_IDS)[number]

/** 组件里用到的一套主题色：分类色 + 地图配色 */
export interface ThemePalette {
  category: Record<SiteCategory, string>
  mapArea: string
  mapBorder: string
  mapLabel: string
  mapAreaHover: string
  /** 聚合点颜色：中性强调色，不与任何分类色混用 */
  cluster: string
}

/**
 * 方向 A 的值，与 tokens.css 的默认值保持一致。
 * 组件在没有 DOM（单测）或变量缺失时用它兜底，保证渲染结果可预期。
 */
export const DEFAULT_PALETTE: ThemePalette = {
  category: {
    古镇: '#b45309',
    非遗: '#7c3aed',
    红色: '#c53030',
    自然: '#0f766e',
    演艺: '#be185d',
    乡村: '#4d7c0f',
  },
  mapArea: '#efe7d8',
  mapBorder: '#cbbfa8',
  mapLabel: '#8a7a63',
  mapAreaHover: '#e3d8c2',
  cluster: '#b45309',
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
 * 主题对比用入口：`?theme=b` 之类的查询参数会把方向写到 `<html data-theme>`，
 * 由 tokens.css 里对应的 `[data-theme='b']` 块覆盖变量。
 *
 * 只在能拿到 DOM 时执行；非法值静默忽略，回落到默认方向。
 */
export function applyThemeFromQuery(search: string = window.location.search): ThemeId | null {
  if (typeof document === 'undefined') return null

  const requested = new URLSearchParams(search).get('theme')
  if (requested === null) return null

  const theme = THEME_IDS.find((id) => id === requested)
  if (theme === undefined) return null

  document.documentElement.dataset.theme = theme
  return theme
}

/** 从 CSS 变量读当前主题的配色；拿不到（SSR/单测）时返回默认方向 */
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
