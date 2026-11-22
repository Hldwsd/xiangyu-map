import {
  ANHUI_CITIES,
  ANHUI_PROVINCE,
  SITE_CATEGORIES,
  type Site,
  type SiteCategory,
} from '@/types/site'
import { ANHUI_BBOX, isAnhuiCity } from '@/utils/region'

/** summary 的字数上限，与 docs/PROJECT_PLAN.md 数据契约一致 */
export const SUMMARY_MAX_LENGTH = 60

/** practical 每个字段的字数上限：它是定义列表里的短文本，不是第二段正文 */
export const PRACTICAL_MAX_LENGTH = 80

const PRACTICAL_KEYS = new Set(['duration', 'hours', 'ticket', 'audience'])

/** 示例数据的统一占位封面；正式图必须落在 public/images/sites/<id>/ 下 */
export const PLACEHOLDER_COVER = '/images/placeholder.svg'

// 外包框的取值与理由见 src/utils/region.ts 的 ANHUI_BBOX：
// 只用来拦住「坐标落到外省」「经纬度写反」，不判断点位是否真的在岸上。

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const URL_PATTERN = /^https?:\/\/\S+$/
const IMAGE_PATH_PATTERN = /^\/images\/sites\/([a-z0-9-]+)\/[a-z0-9][a-z0-9._-]*\.webp$/

const CATEGORY_SET: ReadonlySet<string> = new Set(SITE_CATEGORIES)

/** 数据校验失败。消息里带条目序号与字段名，方便直接定位到 src/data/sites.ts。 */
export class SiteDataError extends Error {
  constructor(public readonly problems: string[]) {
    super(`项目数据校验失败：\n- ${problems.join('\n- ')}`)
    this.name = 'SiteDataError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** 校验 YYYY-MM-DD 是不是真实存在的日期：2026-13-01、2026-02-30 这类值能过正则但不是日期 */
function isRealDate(value: string): boolean {
  const parts = value.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

/** 图片路径必须是 /images/sites/<id>/xxx.webp；返回其中的目录名，格式不对返回 null */
function imageDirOf(path: string): string | null {
  const matched = IMAGE_PATH_PATTERN.exec(path)
  return matched ? (matched[1] ?? null) : null
}

/** 字符串数组；空数组允许，但每个元素必须非空 */
function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const out: string[] = []
  for (const item of value) {
    if (!isNonEmptyString(item)) return null
    out.push(item.trim())
  }
  return out
}

/**
 * 校验单条数据，返回问题列表（空数组表示通过）。
 * 校验的是「运行时数据」而不是类型：JSON 导入的数据没有编译期保护。
 */
export function collectSiteProblems(raw: unknown, label: string): string[] {
  const problems: string[] = []

  if (!isRecord(raw)) {
    return [`${label}: 不是一个对象`]
  }

  const id = raw['id']
  if (!isNonEmptyString(id)) problems.push(`${label}.id: 必须是非空字符串`)
  else if (!ID_PATTERN.test(id))
    problems.push(`${label}.id: "${id}" 需为 kebab-case（小写字母/数字/-）`)

  if (!isNonEmptyString(raw['name'])) problems.push(`${label}.name: 必须是非空字符串`)

  const category = raw['category']
  if (typeof category !== 'string' || !CATEGORY_SET.has(category)) {
    problems.push(`${label}.category: 必须是 ${SITE_CATEGORIES.join(' / ')} 之一`)
  }

  const province = raw['province']
  if (!isNonEmptyString(province)) {
    problems.push(`${label}.province: 必须是非空字符串`)
  } else if (province !== ANHUI_PROVINCE) {
    // 当前范围只有安徽。别的省能过「非空」，但会让省份文案前后矛盾
    problems.push(`${label}.province: 当前只收录「${ANHUI_PROVINCE}」，收到 "${province}"`)
  }

  const city = raw['city']
  if (!isNonEmptyString(city)) {
    problems.push(`${label}.city: 必须是非空字符串`)
  } else if (!isAnhuiCity(city)) {
    // 简称或错字（「黄山」而非「黄山市」）能骗过非空校验，但会让市级筛选与分组静默落空
    problems.push(
      `${label}.city: "${city}" 不在 ${ANHUI_CITIES.length} 个地级市内（如「黄山市」，见 src/types/site.ts）`,
    )
  }

  const location = raw['location']
  if (!isRecord(location)) {
    problems.push(`${label}.location: 必须包含 lng 与 lat`)
  } else {
    const lng = location['lng']
    const lat = location['lat']
    if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      problems.push(`${label}.location.lng: 必须是 -180~180 之间的数字`)
    }
    if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
      problems.push(`${label}.location.lat: 必须是 -90~90 之间的数字`)
    }
    // 全球范围合法但落在境外，通常是抄错一位或经纬度写反
    if (
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      Number.isFinite(lng) &&
      Number.isFinite(lat) &&
      (lng < ANHUI_BBOX.minLng ||
        lng > ANHUI_BBOX.maxLng ||
        lat < ANHUI_BBOX.minLat ||
        lat > ANHUI_BBOX.maxLat)
    ) {
      problems.push(`${label}.location: (${lng}, ${lat}) 不在安徽省范围内，检查是否把经纬度写反`)
    }
  }

  const summary = raw['summary']
  if (!isNonEmptyString(summary)) {
    problems.push(`${label}.summary: 必须是非空字符串`)
  } else if (summary.trim().length > SUMMARY_MAX_LENGTH) {
    problems.push(
      `${label}.summary: 超过 ${SUMMARY_MAX_LENGTH} 字（当前 ${summary.trim().length} 字）`,
    )
  }

  if (!isNonEmptyString(raw['description'])) problems.push(`${label}.description: 必须是非空字符串`)
  const cover = raw['cover']
  if (!isNonEmptyString(cover)) {
    problems.push(`${label}.cover: 必须是非空字符串`)
  } else if (cover !== PLACEHOLDER_COVER) {
    // 正式图按 id 建目录，路径与 id 对不上时页面只会显示裂图，不会报错
    const dir = imageDirOf(cover)
    if (dir === null) {
      problems.push(`${label}.cover: 必须是 ${PLACEHOLDER_COVER} 或 /images/sites/<id>/xxx.webp`)
    } else if (isNonEmptyString(id) && dir !== id) {
      problems.push(`${label}.cover: 目录名 "${dir}" 与 id "${id}" 不一致`)
    }
  }

  const gallery = readStringArray(raw['gallery'])
  if (gallery === null) {
    problems.push(`${label}.gallery: 必须是字符串数组`)
  } else {
    gallery.forEach((image, index) => {
      const dir = imageDirOf(image)
      if (dir === null) {
        problems.push(`${label}.gallery[${index}]: 必须是 /images/sites/<id>/xxx.webp`)
      } else if (isNonEmptyString(id) && dir !== id) {
        problems.push(`${label}.gallery[${index}]: 目录名 "${dir}" 与 id "${id}" 不一致`)
      }
    })
  }

  if (readStringArray(raw['tags']) === null) problems.push(`${label}.tags: 必须是字符串数组`)

  const sources = readStringArray(raw['sources'])
  if (sources === null) {
    problems.push(`${label}.sources: 必须是字符串数组`)
  } else if (sources.length === 0) {
    problems.push(`${label}.sources: 至少需要一条来源`)
  } else if (sources.some((url) => !URL_PATTERN.test(url))) {
    problems.push(`${label}.sources: 每一项都必须是 http(s) 链接`)
  }

  const updatedAt = raw['updatedAt']
  if (typeof updatedAt !== 'string' || !DATE_PATTERN.test(updatedAt)) {
    problems.push(`${label}.updatedAt: 必须是 YYYY-MM-DD 格式`)
  } else if (!isRealDate(updatedAt)) {
    problems.push(`${label}.updatedAt: "${updatedAt}" 不是真实日期`)
  }

  for (const optional of ['bestSeason', 'transport', 'bookingUrl'] as const) {
    const value = raw[optional]
    if (value !== undefined && value !== null && typeof value !== 'string') {
      problems.push(`${label}.${optional}: 如果填写必须是字符串`)
    }
  }

  const practical = raw['practical']
  if (practical !== undefined && practical !== null) {
    if (!isRecord(practical)) {
      problems.push(`${label}.practical: 如果填写必须是对象`)
    } else {
      for (const [key, value] of Object.entries(practical)) {
        if (!PRACTICAL_KEYS.has(key)) {
          problems.push(`${label}.practical.${key}: 不支持的字段`)
        } else if (!isNonEmptyString(value)) {
          problems.push(`${label}.practical.${key}: 必须是非空字符串`)
        } else if (value.trim().length > PRACTICAL_MAX_LENGTH) {
          problems.push(
            `${label}.practical.${key}: 超过 ${PRACTICAL_MAX_LENGTH} 字（当前 ${value.trim().length} 字）`,
          )
        }
      }
    }
  }

  if (
    typeof raw['bookingUrl'] === 'string' &&
    raw['bookingUrl'] !== '' &&
    !URL_PATTERN.test(raw['bookingUrl'])
  ) {
    problems.push(`${label}.bookingUrl: 必须是 http(s) 链接`)
  }

  return problems
}

/**
 * 校验整份数据并返回强类型结果；有任何问题就抛出 SiteDataError。
 *
 * 为什么抛错而不是过滤：静默丢弃一条项目会让「数据有问题」这件事永远不被发现。
 */
export function validateSites(raw: unknown): Site[] {
  if (!Array.isArray(raw)) {
    throw new SiteDataError(['顶层数据必须是数组'])
  }

  const problems: string[] = []
  const seenIds = new Map<string, number>()

  raw.forEach((item: unknown, index: number) => {
    const label = `第 ${index + 1} 条`
    problems.push(...collectSiteProblems(item, label))

    if (isRecord(item) && isNonEmptyString(item['id'])) {
      const id = item['id']
      const firstIndex = seenIds.get(id)
      if (firstIndex === undefined) {
        seenIds.set(id, index)
      } else {
        problems.push(`${label}.id: "${id}" 与第 ${firstIndex + 1} 条重复`)
      }
    }
  })

  if (problems.length > 0) {
    throw new SiteDataError(problems)
  }

  return raw as Site[]
}

/** 类型收窄：判断字符串是否是受支持的分类 */
export function isSiteCategory(value: string): value is SiteCategory {
  return CATEGORY_SET.has(value)
}
