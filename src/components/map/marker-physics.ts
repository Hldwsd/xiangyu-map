/**
 * 地标的「小物理球」状态。
 *
 * 设计目标（按负责人要求）：
 * - 平时留一点点软碰撞：同一处挤了四五个项目时，球会互相推开到约一个碰撞半径，
 *   但**仍然是重叠**的，不是排成整齐圆环；
 * - 鼠标滑过时被「带一下」：给一颗球一个瞬时速度，它弹开一点，再被弹簧拉回原处；
 * - 点击的高亮球照常放大，其它球继续维持软碰撞的重叠状态。
 *
 * 这里只做纯计算（不碰 ECharts）：每帧调用 `stepBalls`，组件把结果写进 symbolOffset。
 */

export interface BallState {
  id: string
  /** 当前像素位置 */
  x: number
  y: number
  /** 当前速度（像素/帧） */
  vx: number
  vy: number
}

export interface BallPhysicsOptions {
  /** 回位弹簧系数：越大回得越快 */
  spring: number
  /** 阻尼：每帧速度乘以它 */
  damping: number
  /** 软碰撞半径：小于这个距离才互推；比地标直径（36）小一半，所以视觉上仍重叠 */
  collide: number
  /** 碰撞位置修正比例（0–1，越大越硬） */
  push: number
}

export const DEFAULT_BALL_OPTIONS: BallPhysicsOptions = {
  spring: 0.16,
  damping: 0.8,
  collide: 18,
  push: 0.35,
}

export type Point = readonly [number, number]

/** 每帧推进一次；返回最大速度，调用方据此决定是否继续动画 */
export function stepBalls(
  balls: BallState[],
  homes: ReadonlyMap<string, Point>,
  options: BallPhysicsOptions = DEFAULT_BALL_OPTIONS,
): number {
  const { spring, damping, collide, push } = options

  for (const ball of balls) {
    const home = homes.get(ball.id)
    if (home === undefined) continue
    ball.vx = (ball.vx + (home[0] - ball.x) * spring) * damping
    ball.vy = (ball.vy + (home[1] - ball.y) * spring) * damping
  }

  // 软碰撞：只做「位置修正」，不注入速度——注入速度会让密集区域越推越散、永不收敛。
  // 每次只挪 overlap 的一小部分，配合回位弹簧，最终停在一个「仍互相压住」的距离。
  for (let i = 0; i < balls.length; i += 1) {
    const a = balls[i]
    if (a === undefined) continue
    for (let j = i + 1; j < balls.length; j += 1) {
      const b = balls[j]
      if (b === undefined) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const distance = Math.hypot(dx, dy)
      if (distance >= collide) continue
      const nx = distance > 0.001 ? dx / distance : 1
      const ny = distance > 0.001 ? dy / distance : 0
      const shift = (collide - distance) * push
      a.x -= nx * shift
      a.y -= ny * shift
      b.x += nx * shift
      b.y += ny * shift
    }
  }

  let maxSpeed = 0
  for (const ball of balls) {
    ball.x += ball.vx
    ball.y += ball.vy
    const home = homes.get(ball.id)
    if (home !== undefined) {
      const offX = ball.x - home[0]
      const offY = ball.y - home[1]
      const offDistance = Math.hypot(offX, offY)
      if (offDistance > 48) {
        ball.x = home[0] + (offX / offDistance) * 48
        ball.y = home[1] + (offY / offDistance) * 48
      }
    }
    const speed = Math.hypot(ball.vx, ball.vy)
    if (speed > maxSpeed) maxSpeed = speed
  }

  return maxSpeed
}

/** 鼠标滑过时「带一下」：朝指针相反方向给一个瞬时速度 */
export function nudgeBall(ball: BallState, pointer: Point, strength = 2.4): void {
  const dx = ball.x - pointer[0]
  const dy = ball.y - pointer[1]
  const distance = Math.hypot(dx, dy)
  const nx = distance > 0.001 ? dx / distance : 1
  const ny = distance > 0.001 ? dy / distance : 0
  ball.vx += nx * strength
  ball.vy += ny * strength
}
