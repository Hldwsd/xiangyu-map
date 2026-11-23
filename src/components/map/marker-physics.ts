/**
 * 地标的「小物理球」状态与求解。
 *
 * 这一版把原来的手写力模型换成了 **matter-js**（Engine + 圆形刚体 + 回位约束）：
 * - 平时留一点点软接触：同一处挤了四五个项目时，球会互相推开到约一个碰撞半径，
 *   但**仍然是重叠**的，不是排成整齐圆环；
 * - 鼠标滑过时被「带一下」：给一颗球一个瞬时速度，它弹开一点，再被约束拉回原处；
 * - 点击的高亮球照常放大，其它球继续维持软接触的重叠状态。
 *
 * 对外接口保持不变：`BallState` / `stepBalls` / `nudgeBall`，组件仍然只负责
 * 「读位置 → 写 symbolOffset」，不直接碰引擎。引擎状态按 `balls` 数组缓存，
 * 数组被重建时自动换一套 world。
 */

import { Bodies, Body, Composite, Constraint, Engine, type Body as MatterBody } from 'matter-js'

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
  /** 回位弹簧系数：越大回得越快（映射到 matter constraint stiffness） */
  spring: number
  /** 阻尼：每帧速度乘以它（映射到 frictionAir = 1 - damping） */
  damping: number
  /** 软碰撞半径：小于这个距离才互推；比地标直径（36）小一半，所以视觉上仍重叠 */
  collide: number
  /** 接触刚度：重叠越深，推力越大（matter 里用碰撞半径与约束软度近似） */
  contact: number
}

export const DEFAULT_BALL_OPTIONS: BallPhysicsOptions = {
  spring: 0.06,
  damping: 0.72,
  collide: 18,
  contact: 0.12,
}

export type Point = readonly [number, number]

interface EngineState {
  engine: Engine
  bodies: Map<string, MatterBody>
  constraints: Map<string, Constraint>
}

/** 每个 balls 数组一套独立 world；数组换代就重建，旧引擎交给 GC */
const states = new WeakMap<BallState[], EngineState>()
/** 单个球 → 刚体，供 nudgeBall 在 stepBalls 之前也能生效 */
const bodyByBall = new WeakMap<BallState, MatterBody>()

/** 离 home 超过它的距离就硬夹回来，避免一次甩飞出屏 */
const MAX_OFFSET = 48

function createState(): EngineState {
  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } })
  return { engine, bodies: new Map(), constraints: new Map() }
}

function radiusFor(options: BallPhysicsOptions): number {
  // 碰撞直径 = collide；半径取一半，视觉上重叠到一个直径内就停
  return Math.max(4, options.collide / 2)
}

function syncConstraintPoint(constraint: Constraint, home: Point): void {
  constraint.pointA.x = home[0]
  constraint.pointA.y = home[1]
}

function ensureBody(
  state: EngineState,
  ball: BallState,
  home: Point,
  options: BallPhysicsOptions,
): MatterBody {
  const existing = state.bodies.get(ball.id)
  if (existing !== undefined) return existing

  const body = Bodies.circle(ball.x, ball.y, radiusFor(options), {
    restitution: 0,
    friction: 0,
    frictionAir: Math.min(0.6, 1 - options.damping),
    density: 0.001,
    label: ball.id,
  })
  if (ball.vx !== 0 || ball.vy !== 0) Body.setVelocity(body, { x: ball.vx, y: ball.vy })

  const constraint = Constraint.create({
    pointA: { x: home[0], y: home[1] },
    bodyB: body,
    pointB: { x: 0, y: 0 },
    length: 0,
    // 手写模型里 spring 是「每帧加速度系数」，matter 的 stiffness 是 0–1 的位置修正比例，
    // 用 0.5 倍近似手感，再配 damping 抑制来回摆
    stiffness: Math.min(0.3, Math.max(0.005, options.spring * 0.5)),
    damping: 0.08,
  })

  Composite.add(state.engine.world, [body, constraint])
  state.bodies.set(ball.id, body)
  state.constraints.set(ball.id, constraint)
  bodyByBall.set(ball, body)
  return body
}

/**
 * 每帧推进一步；返回最大速度，调用方据此决定是否继续动画。
 * 与旧实现的差异：引擎内部保持速度，外部直接改 x/y（缩放平移、补间）会被识别为
 * 「瞬移」并同步回刚体，避免世界里的球和 DOM 上的球各走各的。
 */
export function stepBalls(
  balls: BallState[],
  homes: ReadonlyMap<string, Point>,
  options: BallPhysicsOptions = DEFAULT_BALL_OPTIONS,
): number {
  if (balls.length === 0) return 0

  let state = states.get(balls)
  if (state === undefined) {
    state = createState()
    states.set(balls, state)
  }

  const activeIds = new Set<string>()
  for (const ball of balls) {
    const home = homes.get(ball.id)
    if (home === undefined) continue
    activeIds.add(ball.id)
    const body = ensureBody(state, ball, home, options)

    // 外部瞬移（缩放/平移/补间）：把刚体直接搬过去，速度清零，避免约束猛拉
    const drift = Math.hypot(body.position.x - ball.x, body.position.y - ball.y)
    if (drift > 1.5) {
      Body.setPosition(body, { x: ball.x, y: ball.y })
      Body.setVelocity(body, { x: 0, y: 0 })
    }
    // home 跟着视野走
    const constraint = state.constraints.get(ball.id)
    if (constraint !== undefined) syncConstraintPoint(constraint, home)
  }

  // 清掉已经不存在的球（簇合并/拆分后成员变化）
  for (const [id, body] of state.bodies) {
    if (activeIds.has(id)) continue
    const constraint = state.constraints.get(id)
    if (constraint !== undefined) Composite.remove(state.engine.world, constraint)
    Composite.remove(state.engine.world, body)
    state.bodies.delete(id)
    state.constraints.delete(id)
  }

  Engine.update(state.engine, 1000 / 60)

  let maxSpeed = 0
  for (const ball of balls) {
    const body = state.bodies.get(ball.id)
    if (body === undefined) continue
    ball.x = body.position.x
    ball.y = body.position.y
    ball.vx = body.velocity.x
    ball.vy = body.velocity.y

    const home = homes.get(ball.id)
    if (home !== undefined) {
      const offX = ball.x - home[0]
      const offY = ball.y - home[1]
      const offDistance = Math.hypot(offX, offY)
      if (offDistance > MAX_OFFSET) {
        ball.x = home[0] + (offX / offDistance) * MAX_OFFSET
        ball.y = home[1] + (offY / offDistance) * MAX_OFFSET
        Body.setPosition(body, { x: ball.x, y: ball.y })
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

  // 还没 step 过（没有刚体）就先记在速度里，首次建体时会带上
  ball.vx += nx * strength
  ball.vy += ny * strength

  const body = bodyByBall.get(ball)
  if (body !== undefined) {
    Body.setVelocity(body, {
      x: body.velocity.x + nx * strength,
      y: body.velocity.y + ny * strength,
    })
  }
}
