import { describe, expect, it } from 'vitest'

import {
  DEFAULT_BALL_OPTIONS,
  nudgeBall,
  stepBalls,
  type BallState,
} from '@/components/map/marker-physics'

function ball(id: string, x: number, y: number): BallState {
  return { id, x, y, vx: 0, vy: 0 }
}

function settle(balls: BallState[], homes: Map<string, readonly [number, number]>, frames = 400) {
  let last = 0
  for (let i = 0; i < frames; i += 1) last = stepBalls(balls, homes)
  return last
}

describe('stepBalls', () => {
  it('被推开的球会被弹簧拉回原位并静止', () => {
    const b = ball('a', 100, 100)
    const homes = new Map([['a', [100, 100] as const]])
    b.x = 140
    const speed = settle([b], homes)
    expect(speed).toBeLessThan(0.2)
    expect(Math.abs(b.x - 100)).toBeLessThan(4)
    expect(Math.abs(b.y - 100)).toBeLessThan(4)
  })

  it('同一位置的两颗球会互相推开，但停在地标直径以内（保持重叠）', () => {
    const a = ball('a', 50, 50)
    const b = ball('b', 50, 50)
    const homes = new Map([
      ['a', [50, 50] as const],
      ['b', [50, 50] as const],
    ])
    settle([a, b], homes)

    const distance = Math.hypot(a.x - b.x, a.y - b.y)
    // 软碰撞半径 12：停在它附近，而不是完全分开（直径 36）
    expect(distance).toBeGreaterThan(6)
    expect(distance).toBeLessThan(DEFAULT_BALL_OPTIONS.collide + 1)
  })

  it('五颗同点球也不会发散或出现 NaN', () => {
    const balls = ['a', 'b', 'c', 'd', 'e'].map((id) => ball(id, 200, 200))
    const homes = new Map(balls.map((b) => [b.id, [200, 200] as const]))
    settle(balls, homes, 600)

    for (const item of balls) {
      expect(Number.isFinite(item.x)).toBe(true)
      expect(Number.isFinite(item.y)).toBe(true)
      expect(Math.hypot(item.x - 200, item.y - 200)).toBeLessThan(40)
    }
  })

  it('nudgeBall 把球朝指针反方向推一下，之后能回去', () => {
    const b = ball('a', 100, 100)
    const homes = new Map([['a', [100, 100] as const]])
    nudgeBall(b, [100, 100], 6)
    expect(Math.hypot(b.vx, b.vy)).toBeGreaterThan(0)

    stepBalls([b], homes)
    const moved = Math.hypot(b.x - 100, b.y - 100)
    expect(moved).toBeGreaterThan(0.5)

    settle([b], homes)
    expect(Math.hypot(b.x - 100, b.y - 100)).toBeLessThan(4)
  })
})
