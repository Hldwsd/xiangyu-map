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
  /** 接触刚度：重叠越深，推力越大（力模型，不是硬性分离） */
  contact: number
}

export const DEFAULT_BALL_OPTIONS: BallPhysicsOptions = {
  spring: 0.06,
  damping: 0.72,
  collide: 18,
  contact: 0.12,
}

export type Point = readonly [number, number]

/** 每帧推进一次；返回最大速度，调用方据此决定是否继续动画 */
export function stepBalls(
  balls: BallState[],
  homes: ReadonlyMap<string, Point>,
  options: BallPhysicsOptions = DEFAULT_BALL_OPTIONS,
): number {
  const { spring, damping, collide, contact } = options

  // 清空上一帧的加速度
  const ax = new Float64Array(balls.length)
  const ay = new Float64Array(balls.length)

  // 回位弹簧
  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i]
    if (ball === undefined) continue
    const home = homes.get(ball.id)
    if (home === undefined) continue
    ax[i] = (ax[i] ?? 0) + (home[0] - ball.x) * spring
    ay[i] = (ay[i] ?? 0) + (home[1] - ball.y) * spring
  }

  // 软接触力：重叠越深推力越大。力模型在 equilibrium 处速度归零，
  // 不会像「直接挪位置」那样每帧注入能量、永远停不下来。
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
      const push = (collide - distance) * contact
      ax[i] = (ax[i] ?? 0) - nx * push
      ay[i] = (ay[i] ?? 0) - ny * push
      ax[j] = (ax[j] ?? 0) + nx * push
      ay[j] = (ay[j] ?? 0) + ny * push
    }
  }

  let maxSpeed = 0
  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i]
    if (ball === undefined) continue
    ball.vx = (ball.vx + (ax[i] ?? 0)) * damping
    ball.vy = (ball.vy + (ay[i] ?? 0)) * damping
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
