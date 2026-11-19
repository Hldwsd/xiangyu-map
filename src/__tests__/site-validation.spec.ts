import { describe, expect, it } from 'vitest'

import { sites } from '@/data/sites'
import {
  SiteDataError,
  SUMMARY_MAX_LENGTH,
  isSiteCategory,
  validateSites,
} from '@/utils/site-validation'

/** 一条通过校验的最小数据，测试里按需破坏某个字段 */
function validSite(): Record<string, unknown> {
  return {
    id: 'demo-site',
    name: '演示项目',
    category: '古镇',
    province: '安徽省',
    city: '合肥市',
    location: { lng: 117.25, lat: 31.86 },
    summary: '一句话简介',
    description: '正文',
    cover: '/images/placeholder.svg',
    gallery: [],
    tags: ['示例数据'],
    sources: ['https://example.com/sites/demo-site'],
    updatedAt: '2026-11-19',
  }
}

function expectProblems(raw: unknown): string[] {
  try {
    validateSites(raw)
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(SiteDataError)
    return (error as SiteDataError).problems
  }
  throw new Error('validateSites 应当抛错但通过了')
}

describe('validateSites', () => {
  it('接受仓库里的全部示例数据', () => {
    const validated = validateSites(sites)
    expect(validated).toHaveLength(10)
    expect(validated.map((site) => site.id)).toContain('hongcun')
    expect(validated.every((site) => site.province === '安徽省')).toBe(true)
  })

  it('接受一条最小合法数据', () => {
    expect(validateSites([validSite()])).toHaveLength(1)
  })

  it('顶层不是数组时直接失败', () => {
    expect(expectProblems({ sites: [] })).toContain('顶层数据必须是数组')
  })

  it('id 重复时报出两处位置', () => {
    const problems = expectProblems([validSite(), validSite()])
    expect(problems.some((problem) => problem.includes('重复'))).toBe(true)
  })

  it('id 非 kebab-case 时报错', () => {
    const broken = validSite()
    broken['id'] = 'Demo_Site'
    expect(expectProblems([broken]).some((problem) => problem.includes('kebab-case'))).toBe(true)
  })

  it('分类不在枚举内时报错', () => {
    const broken = validSite()
    broken['category'] = '主题乐园'
    expect(expectProblems([broken]).some((problem) => problem.includes('category'))).toBe(true)
  })

  it('summary 超长时报错，并给出实际字数', () => {
    const broken = validSite()
    broken['summary'] = '乡'.repeat(SUMMARY_MAX_LENGTH + 1)
    const problems = expectProblems([broken])
    expect(problems.some((problem) => problem.includes(`超过 ${SUMMARY_MAX_LENGTH} 字`))).toBe(true)
  })

  it('sources 为空数组时报错', () => {
    const broken = validSite()
    broken['sources'] = []
    expect(expectProblems([broken]).some((problem) => problem.includes('至少需要一条来源'))).toBe(
      true,
    )
  })

  it('sources 不是 http 链接时报错', () => {
    const broken = validSite()
    broken['sources'] = ['example.com/x']
    expect(expectProblems([broken]).some((problem) => problem.includes('http(s) 链接'))).toBe(true)
  })

  it('坐标越界时报错', () => {
    const broken = validSite()
    broken['location'] = { lng: 200, lat: 37 }
    expect(expectProblems([broken]).some((problem) => problem.includes('location.lng'))).toBe(true)
  })

  it('可选字段类型错误时报错', () => {
    const broken = validSite()
    broken['bestSeason'] = 4
    expect(expectProblems([broken]).some((problem) => problem.includes('bestSeason'))).toBe(true)
  })

  it('updatedAt 格式错误时报错', () => {
    const broken = validSite()
    broken['updatedAt'] = '2026/11/18'
    expect(expectProblems([broken]).some((problem) => problem.includes('YYYY-MM-DD'))).toBe(true)
  })

  it('province 不是安徽省时报错', () => {
    const broken = validSite()
    broken['province'] = '山西省'
    expect(expectProblems([broken]).some((problem) => problem.includes('当前只收录'))).toBe(true)
  })

  it('city 不在 16 个地级市内时报错', () => {
    const broken = validSite()
    broken['city'] = '黄山区'
    expect(expectProblems([broken]).some((problem) => problem.includes('地级市'))).toBe(true)
  })

  it('city 用简称时报错', () => {
    const broken = validSite()
    broken['city'] = '黄山'
    expect(expectProblems([broken]).some((problem) => problem.includes('地级市'))).toBe(true)
  })

  it('坐标落在安徽省外时报错', () => {
    const broken = validSite()
    // 杭州：全球范围合法、也在中国境内，但不在安徽外包框内，对应「抄错一位 / 经纬度写反」
    broken['location'] = { lng: 120.15, lat: 30.27 }
    expect(expectProblems([broken]).some((problem) => problem.includes('不在安徽省范围内'))).toBe(
      true,
    )
  })

  it('updatedAt 是非法日期时报错', () => {
    for (const value of ['2026-13-01', '2026-02-30']) {
      const broken = validSite()
      broken['updatedAt'] = value
      expect(expectProblems([broken]).some((problem) => problem.includes('不是真实日期'))).toBe(
        true,
      )
    }
  })

  it('cover 允许占位图，也允许与 id 一致的正式图', () => {
    expect(validateSites([validSite()])).toHaveLength(1)

    const withRealCover = validSite()
    withRealCover['cover'] = '/images/sites/demo-site/cover.webp'
    expect(validateSites([withRealCover])).toHaveLength(1)
  })

  it('cover 目录与 id 不一致时报错', () => {
    const broken = validSite()
    broken['cover'] = '/images/sites/other-site/cover.webp'
    expect(expectProblems([broken]).some((problem) => problem.includes('不一致'))).toBe(true)
  })

  it('gallery 图片目录与 id 不一致时报错', () => {
    const broken = validSite()
    broken['gallery'] = ['/images/sites/other-site/01.webp']
    expect(expectProblems([broken]).some((problem) => problem.includes('gallery[0]'))).toBe(true)
  })

  it('gallery 非 webp 时报错', () => {
    const broken = validSite()
    broken['gallery'] = ['/images/sites/demo-site/01.jpg']
    expect(expectProblems([broken]).some((problem) => problem.includes('.webp'))).toBe(true)
  })
})

describe('isSiteCategory', () => {
  it('识别受支持的分类', () => {
    expect(isSiteCategory('非遗')).toBe(true)
  })

  it('拒绝未知分类', () => {
    expect(isSiteCategory('美食')).toBe(false)
  })
})
