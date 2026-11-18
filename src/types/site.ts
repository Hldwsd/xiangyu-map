/**
 * 文旅项目（Site）数据契约。
 *
 * 这是全站唯一的字段定义来源：数据结构变更属于「契约变更」，
 * 按 docs/COLLABORATION.md 的规定必须先 @ 对方并同步更新
 * docs/PROJECT_PLAN.md「数据契约」一节。
 */

/** 分类枚举。新增分类需同步 CATEGORY_META（映射颜色）与筛选组件。 */
export const SITE_CATEGORIES = ['古镇', '非遗', '红色', '自然', '演艺', '乡村'] as const

export type SiteCategory = (typeof SITE_CATEGORIES)[number]

/** 经纬度。全站统一使用 GCJ-02（国测局坐标），与底图保持一致。 */
export interface LngLat {
  lng: number
  lat: number
}

/**
 * 一个文旅项目 = 地图上的一个地标 + 一页详情。
 *
 * 约定：新增项目只改 src/data/sites.ts，不改组件代码。
 */
export interface Site {
  /** URL 片段标识，kebab-case 且全站唯一，如 `pingyao` */
  id: string
  /** 展示名称 */
  name: string
  category: SiteCategory
  /** 省级行政区，如 `山西省` */
  province: string
  /** 地级行政区，如 `晋中市` */
  city: string
  location: LngLat
  /** 列表与地标卡片上的一句话简介，不超过 60 字 */
  summary: string
  /** 详情页正文，支持纯文本换行 */
  description: string
  /** 封面图路径，放 public/images/sites/<id>/ 下，WebP 且 ≤300KB */
  cover: string
  /** 详情页图集，可为空数组 */
  gallery: string[]
  /** 标签，用于检索与展示 */
  tags: string[]
  /** 最佳到访季节，如 `4-5 月` */
  bestSeason?: string
  /** 交通提示 */
  transport?: string
  /** 预约/购票地址 */
  bookingUrl?: string
  /** 资料来源，必须可核验；示例数据为占位地址 */
  sources: string[]
  /** 最后更新日期，YYYY-MM-DD */
  updatedAt: string
}
