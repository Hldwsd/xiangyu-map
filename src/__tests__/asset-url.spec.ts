import { describe, expect, it, vi } from 'vitest'

import { assetUrl } from '@/utils/asset-url'

const originalBase = import.meta.env.BASE_URL

function withBase(base: string, run: () => void) {
  vi.stubEnv('BASE_URL', base)
  try {
    run()
  } finally {
    vi.unstubAllEnvs()
  }
}

describe('assetUrl', () => {
  it('站点根路径在默认基地址下保持不变', () => {
    expect(import.meta.env.BASE_URL).toBe(originalBase)
    expect(assetUrl('/images/placeholder.svg')).toBe('/images/placeholder.svg')
  })

  it('部署在子路径时补上基地址', () => {
    withBase('/xiangyu-map/', () => {
      expect(assetUrl('/images/sites/hongcun/cover.webp')).toBe(
        '/xiangyu-map/images/sites/hongcun/cover.webp',
      )
    })
  })

  it('基地址缺少结尾斜杠时自动补上', () => {
    withBase('/xiangyu-map', () => {
      expect(assetUrl('/images/placeholder.svg')).toBe('/xiangyu-map/images/placeholder.svg')
    })
  })

  it('允许传入相对路径（不会出现双斜杠）', () => {
    withBase('/xiangyu-map/pr-12/', () => {
      expect(assetUrl('images/placeholder.svg')).toBe('/xiangyu-map/pr-12/images/placeholder.svg')
      expect(assetUrl('///images/placeholder.svg')).toBe(
        '/xiangyu-map/pr-12/images/placeholder.svg',
      )
    })
  })
})
