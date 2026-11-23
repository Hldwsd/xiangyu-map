/**
 * 品牌页的数据视图：全部从 app 的同一份数据派生，页面里不写死数字。
 *
 * 为什么不在品牌页单独维护一份：16 个市、70 个项目、7 个分类都是会变的，
 * 两处各写一份，迟早出现「官网说 70、地图上 68」这种最难解释的错。
 */
import { sites } from '@/data/sites'
import { ANHUI_CITIES, SITE_CATEGORIES } from '@/types/site'
import type { Site, SiteCategory } from '@/types/site'

export const TOTAL_SITES = sites.length
export const TOTAL_CITIES = ANHUI_CITIES.length

/** 首屏下方横向画廊的六处：只挑视觉辨识度最高的几个，不承担「精选推荐」的语义 */
export const FEATURED_IDS = [
  'huangshan-scenic',
  'hongcun',
  'huizhou-ancient-city',
  'huaxilou',
  'wangmantian-village',
  'chaohu',
] as const

export const featuredSites: Site[] = FEATURED_IDS.map((id) =>
  sites.find((site) => site.id === id),
).filter((site): site is Site => site !== undefined)

export interface CityStat {
  /** 数据里的完整市名，如「合肥市」 */
  name: string
  /** 展示用的短名，如「合肥」 */
  short: string
  count: number
  /** 该市第一个项目的封面，用来做悬停预览 */
  cover: string
  preview: string
}

export const cityStats: CityStat[] = ANHUI_CITIES.map((name) => {
  const list = sites.filter((site) => site.city === name)
  const cover = list[0]?.cover ?? '/images/placeholder.svg'
  return {
    name,
    short: name.replace(/市$/, ''),
    count: list.length,
    cover,
    preview: list[0]?.name ?? '',
  }
})

/** 七类风物各一句话：只描述「怎么玩」，不评价好坏 */
const CRAFT_NOTES: Record<SiteCategory, string> = {
  古镇: '青石板、马头墙，巷子没走完就不算到过。',
  非遗: '宣纸、徽墨、鱼灯、傩面——手上传下来的东西。',
  红色: '大别山与皖南的旧址里，留着一代人的名字。',
  自然: '云海、山脊、湖面，以及不必赶路的一天。',
  演艺: '黄梅戏的腔，台上台下都是一辈子。',
  乡村: '晒秋的屋檐、稻场，和村口那棵树。',
  场馆: '博物院里的楚大鼎，和一座城的记忆。',
}

export interface CraftStat {
  name: SiteCategory
  count: number
  note: string
}

export const craftStats: CraftStat[] = SITE_CATEGORIES.map((name) => ({
  name,
  count: sites.filter((site) => site.category === name).length,
  note: CRAFT_NOTES[name],
}))

/** 英雄区图例里那句「70 处」，以数据为准 */
export const HERO_META = `${TOTAL_CITIES} 城 · ${TOTAL_SITES} 处 · ${SITE_CATEGORIES.length} 类`
