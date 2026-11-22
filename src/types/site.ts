/**
 * 文旅项目（Site）数据契约。
 *
 * 这是全站唯一的字段定义来源：数据结构变更属于「契约变更」，
 * 按 docs/COLLABORATION.md 的规定必须先 @ 对方并同步更新
 * docs/PROJECT_PLAN.md「数据契约」一节。
 *
 * 当前范围是**只做安徽省**（见 docs/adr/0002-scope-anhui.md），
 * 所以省份是字面量、城市是 16 个地级市的联合类型：
 * 写错一个字的城市名会在编译期就被拦下，而不是等到筛选时静默落空。
 */

/**
 * 分类枚举。新增分类需同步 CATEGORY_COLORS（映射颜色）与筛选组件。
 * 「场馆」是 2026-11-21 应所有者要求新增的第七类（博物馆 / 科技馆等室内展馆），
 * 契约变更记录见 docs/adr/0010-venue-category.md。
 */
export const SITE_CATEGORIES = ['古镇', '非遗', '红色', '自然', '演艺', '乡村', '场馆'] as const

export type SiteCategory = (typeof SITE_CATEGORIES)[number]

/** 当前唯一覆盖的省级行政区。扩展到第二个省时，这里连同 Site.province 一起改。 */
export const ANHUI_PROVINCE = '安徽省' as const

/** 安徽省的 16 个地级市，顺序与底图（public/maps/anhui.json）一致，便于人工核对。 */
export const ANHUI_CITIES = [
  '合肥市',
  '芜湖市',
  '蚌埠市',
  '淮南市',
  '马鞍山市',
  '淮北市',
  '铜陵市',
  '安庆市',
  '黄山市',
  '滁州市',
  '阜阳市',
  '宿州市',
  '六安市',
  '亳州市',
  '池州市',
  '宣城市',
] as const

export type AnhuiCity = (typeof ANHUI_CITIES)[number]

/** 经纬度。全站统一使用 GCJ-02（国测局坐标），与底图保持一致。 */
export interface LngLat {
  lng: number
  lat: number
}

/**
 * 详情页“实用信息”的补充决策字段。
 *
 * 全部可选：没有可靠来源时宁可不填，也不用“约”“仅供参考”这种模糊文案凑数。
 * 字段都是短文本，适合放在定义列表里，不承载长段落。
 */
export interface SitePractical {
  /** 建议停留，如 `3–4 小时` / `1–2 天` */
  duration?: string
  /** 开放时间，如 `8:00–17:00`；复杂规则放 description 或 sources */
  hours?: string
  /** 门票/预约提示，如 `门票 104 元`；价格会变，必须能追溯到来源 */
  ticket?: string
  /** 适合人群/玩法，如 `古村、摄影、亲子` */
  audience?: string
}

/**
 * 一个文旅项目 = 地图上的一个地标 + 一页详情。
 *
 * 约定：新增项目只改 src/data/sites.ts，不改组件代码。
 */
export interface Site {
  /** URL 片段标识，kebab-case 且全站唯一，如 `hongcun` */
  id: string
  /** 展示名称 */
  name: string
  category: SiteCategory
  /** 省级行政区。当前范围只有安徽，所以是字面量而不是 string */
  province: typeof ANHUI_PROVINCE
  /** 地级市，必须是 ANHUI_CITIES 之一；地图按市分区、按市筛选都依赖它 */
  city: AnhuiCity
  location: LngLat
  /** 列表与地标卡片上的一句话简介，不超过 60 字 */
  summary: string
  /** 详情页正文，支持纯文本换行 */
  description: string
  /** 封面图路径，放 public/images/sites/<id>/ 下，WebP 且 ≤300KB */
  cover: string
  /** 分享卡片图路径，放 public/og/sites/<id>.jpg；缺省用 public/og-cover.jpg */
  shareImage?: string
  /** 详情页图集，可为空数组 */
  gallery: string[]
  /** 标签，用于检索与展示 */
  tags: string[]
  /** 最佳到访季节，如 `4-5 月` */
  bestSeason?: string
  /** 交通提示 */
  transport?: string
  /** 建议停留、开放时间、门票、适合人群等决策信息 */
  practical?: SitePractical
  /** 预约/购票地址 */
  bookingUrl?: string
  /** 资料来源，必须可核验；示例数据为占位地址 */
  sources: string[]
  /** 最后更新日期，YYYY-MM-DD */
  updatedAt: string
}
