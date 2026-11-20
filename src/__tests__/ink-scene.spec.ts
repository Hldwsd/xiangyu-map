import { describe, expect, it } from 'vitest'

import { LOOP_MS, SPLASH_WINDOWS, splashPhase } from '@/components/scene/ink-hongcun-scene'

describe('水墨背景的循环约束', () => {
  it('循环时长是正的，并且能整除常见的帧间隔', () => {
    expect(LOOP_MS).toBeGreaterThan(1000)
    expect(LOOP_MS % 16).toBe(0)
  })

  it('每个滴溅的可见区间都落在 [0,1) 内，循环首尾不会断', () => {
    expect(SPLASH_WINDOWS.length).toBeGreaterThan(0)
    for (const window of SPLASH_WINDOWS) {
      expect(window.offset).toBeGreaterThanOrEqual(0)
      expect(window.end).toBeLessThanOrEqual(1)
    }
  })

  it('相位在起点是 0、中点 0.5、区间外是 null', () => {
    for (const window of SPLASH_WINDOWS) {
      const life = window.end - window.offset
      expect(splashPhase(window.offset, window.offset)).toBeCloseTo(0, 6)
      expect(splashPhase(window.offset + life / 2, window.offset)).toBeCloseTo(0.5, 6)
      expect(splashPhase(window.offset - 0.001, window.offset)).toBeNull()
      expect(splashPhase(window.end, window.offset)).toBeNull()
      expect(splashPhase(window.end + 0.001, window.offset)).toBeNull()
    }
  })

  it('t 落在 [0,1) 内，任何可见滴溅的相位都在 [0,1)', () => {
    const phases: number[] = []
    for (const t of [0, 0.1, 0.35, 0.62, 0.9, 0.999]) {
      for (const window of SPLASH_WINDOWS) {
        const phase = splashPhase(t, window.offset)
        if (phase !== null) phases.push(phase)
      }
    }

    expect(phases.length).toBeGreaterThan(0)
    for (const phase of phases) {
      expect(phase).toBeGreaterThanOrEqual(0)
      expect(phase).toBeLessThan(1)
    }
  })
})
