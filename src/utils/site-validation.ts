import { SITE_CATEGORIES, type Site, type SiteCategory } from '@/types/site'

/** summary 的字数上限，与 docs/PROJECT_PLAN.md 数据契约一致 */
export const SUMMARY_MAX_LENGTH = 60

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const URL_PATTERN = /^https?:\/\/\S+$/

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

  if (!isNonEmptyString(raw['province'])) problems.push(`${label}.province: 必须是非空字符串`)
  if (!isNonEmptyString(raw['city'])) problems.push(`${label}.city: 必须是非空字符串`)

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
  if (!isNonEmptyString(raw['cover'])) problems.push(`${label}.cover: 必须是非空字符串`)

  if (readStringArray(raw['gallery']) === null) problems.push(`${label}.gallery: 必须是字符串数组`)
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
  }

  for (const optional of ['bestSeason', 'transport', 'bookingUrl'] as const) {
    const value = raw[optional]
    if (value !== undefined && value !== null && typeof value !== 'string') {
      problems.push(`${label}.${optional}: 如果填写必须是字符串`)
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
