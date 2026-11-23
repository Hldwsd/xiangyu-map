import { describe, expect, it } from 'vitest'

import { shouldMergeMarkers } from '@/utils/map-defaults'

describe('窄屏默认合并策略', () => {
  it('没有用户偏好时，窄屏默认合并，桌面默认不合并', () => {
    expect(shouldMergeMarkers(null, 390)).toBe(true)
    expect(shouldMergeMarkers(null, 360)).toBe(true)
    expect(shouldMergeMarkers(null, 1024)).toBe(false)
  })

  it('用户显式选择优先于默认值', () => {
    expect(shouldMergeMarkers('0', 390)).toBe(false)
    expect(shouldMergeMarkers('1', 1024)).toBe(true)
  })

  it('宽度未知（0）时按桌面处理，避免 SSR/量尺寸前误开合并', () => {
    expect(shouldMergeMarkers(null, 0)).toBe(false)
  })
})
