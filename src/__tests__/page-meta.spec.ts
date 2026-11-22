import { afterEach, describe, expect, it } from 'vitest'

import { applyPageMeta } from '@/utils/page-meta'

afterEach(() => {
  document.head.innerHTML = ''
  document.title = ''
})

describe('applyPageMeta', () => {
  it('更新 title、description 与 OG/Twitter 标题', () => {
    document.head.innerHTML =
      '<meta name="description" content="旧描述" /><meta property="og:title" content="旧标题" />'

    applyPageMeta('宏村 · 乡遇安徽', '世界文化遗产的牛形村落。')

    expect(document.title).toBe('宏村 · 乡遇安徽')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      '世界文化遗产的牛形村落。',
    )
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      '宏村 · 乡遇安徽',
    )
    expect(
      document.head.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    ).toBe('世界文化遗产的牛形村落。')
    expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(
      '宏村 · 乡遇安徽',
    )
  })
})
