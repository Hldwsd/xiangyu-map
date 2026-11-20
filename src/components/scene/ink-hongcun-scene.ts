/**
 * 水墨宏村：程序化的「南湖 + 马头墙 + 远山」场景。
 *
 * 设计要点：
 * - **无缝循环**：所有动画都是 loop t ∈ [0,1) 的函数，周期项用整数倍正弦；
 *   滴溅事件的起点 + 时长都落在循环内，不会跨帧断掉。
 * - **静态层缓存**：纸纹、远山、屋舍、石桥只画一次，存进离屏 canvas；
 *   每帧只叠水波、雾气、倒影、滴溅、飞鸟。
 * - **墨色克制**：远景最浅 6%，屋舍线 55%，水面 4–8%——背景不跟地图抢信息。
 */

const INK = '28, 26, 23'
const WALL = '#fcf8ef'

/** 一次完整的循环时长（毫秒）：36 秒 */
export const LOOP_MS = 36_000

const TAU = Math.PI * 2

/** 确定性随机：同一个 seed 每次都生成同一幅画，保证循环首尾一致 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 一条「山脊」：几组不同频率的正弦叠起来，再轻微随机，避免机械重复 */
function ridge(
  width: number,
  baseY: number,
  amplitude: number,
  seed: number,
  steps = 110,
): Array<[number, number]> {
  const random = mulberry32(seed)
  const waves = Array.from({ length: 4 }, (_, index) => ({
    freq: (index + 1) * (0.9 + random() * 0.8),
    phase: random() * TAU,
    weight: 1 / (index + 1),
  }))
  const points: Array<[number, number]> = []
  for (let i = 0; i <= steps; i += 1) {
    const x = (width * i) / steps
    const u = i / steps
    let y = 0
    for (const wave of waves) y += Math.sin(u * TAU * wave.freq + wave.phase) * wave.weight
    points.push([x, baseY - (y / 2 + 0.5) * amplitude])
  }
  return points
}

function fillPolygon(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  bottomY: number,
  fill: string,
): void {
  ctx.beginPath()
  ctx.moveTo(points[0]![0], bottomY)
  for (const [x, y] of points) ctx.lineTo(x, y)
  ctx.lineTo(points[points.length - 1]![0], bottomY)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

interface SplashEvent {
  x: number
  y: number
  size: number
  /** 在循环里的起始位置（0–1） */
  offset: number
}

/** 滴溅事件：起点 + 0.16 必须 < 1，才能保证循环首尾干净 */
const SPLASHES: SplashEvent[] = [
  { x: 0.3, y: 0.26, size: 72, offset: 0.03 },
  { x: 0.66, y: 0.17, size: 48, offset: 0.24 },
  { x: 0.48, y: 0.34, size: 96, offset: 0.47 },
  { x: 0.84, y: 0.29, size: 40, offset: 0.7 },
]

const SPLASH_LIFE = 0.16

/**
 * 滴溅在循环里的相位：返回 0–1 表示正在扩散，null 表示这一刻没有滴溅。
 * 抽成纯函数是为了能直接单测「首尾不出界」这条约束。
 */
export function splashPhase(t: number, offset: number): number | null {
  const local = t - offset
  // 半开区间：正好落在结束点上视为已消失，避免浮点误差把「最后一帧」算进来
  if (local < 0 || local >= SPLASH_LIFE) return null
  return local / SPLASH_LIFE
}

/** 每个滴溅在循环里的可见区间，必须落在 [0,1) 内，否则循环接缝会断 */
export const SPLASH_WINDOWS: ReadonlyArray<{ offset: number; end: number }> = SPLASHES.map(
  (splash) => ({ offset: splash.offset, end: splash.offset + SPLASH_LIFE }),
)

export class InkHongcunScene {
  private readonly ctx: CanvasRenderingContext2D
  private readonly canvas: HTMLCanvasElement
  private staticLayer: HTMLCanvasElement | null = null
  private bankLayer: HTMLCanvasElement | null = null
  private width = 0
  private height = 0
  private dpr = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (ctx === null) throw new Error('canvas 2d context 不可用')
    this.ctx = ctx
  }

  resize(width: number, height: number, dpr: number): void {
    if (width <= 0 || height <= 0) return
    if (width === this.width && height === this.height && dpr === this.dpr) return

    this.width = width
    this.height = height
    this.dpr = dpr
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.buildStaticLayer()
  }

  /** 画一帧；timeMs 会按 LOOP_MS 取模 */
  render(timeMs: number): void {
    if (this.staticLayer === null || this.width === 0) return
    const ctx = this.ctx
    const { width: w, height: h } = this
    const waterTop = h * 0.615
    const t = (((timeMs % LOOP_MS) + LOOP_MS) % LOOP_MS) / LOOP_MS

    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(this.staticLayer, 0, 0, w, h)

    this.drawReflection(ctx, t, waterTop)
    this.drawWater(ctx, t, waterTop)
    this.drawMist(ctx, t)
    this.drawSplashes(ctx, t, waterTop)
    this.drawBirds(ctx, t)
    this.drawVeil(ctx)
  }

  dispose(): void {
    this.staticLayer = null
    this.bankLayer = null
  }

  // ---------- 静态层 ----------

  private buildStaticLayer(): void {
    const w = this.width
    const h = this.height
    const dpr = this.dpr
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const waterTop = h * 0.615
    this.drawPaper(ctx, w, h)
    this.drawRidges(ctx, w, h, waterTop)
    this.drawVillage(ctx, w, h)
    this.drawBridge(ctx, w, h)
    this.drawBank(ctx, w, waterTop)
    this.drawReeds(ctx, w, h)

    this.staticLayer = canvas
    this.captureBank(w, h, h * 0.47, waterTop)
  }

  private drawPaper(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#f8f3e9')
    gradient.addColorStop(0.55, '#f4eee2')
    gradient.addColorStop(1, '#efe7d8')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    const random = mulberry32(20261120)
    const dots = Math.round((w * h) / 1600)
    for (let i = 0; i < dots; i += 1) {
      const x = random() * w
      const y = random() * h
      ctx.fillStyle = `rgba(${INK}, ${0.015 + random() * 0.025})`
      ctx.fillRect(x, y, 1, 1)
    }
    for (let i = 0; i < 80; i += 1) {
      const x = random() * w
      const y = random() * h
      ctx.strokeStyle = `rgba(${INK}, 0.02)`
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (random() - 0.5) * 2, y + 20 + random() * 40)
      ctx.stroke()
    }
  }

  private drawRidges(ctx: CanvasRenderingContext2D, w: number, h: number, waterTop: number): void {
    const layers = [
      { baseY: h * 0.34, amp: h * 0.14, alpha: 0.055, seed: 11 },
      { baseY: h * 0.42, amp: h * 0.15, alpha: 0.085, seed: 23 },
      { baseY: h * 0.5, amp: h * 0.16, alpha: 0.12, seed: 37 },
    ]

    for (const [index, layer] of layers.entries()) {
      const points = ridge(w, layer.baseY, layer.amp, layer.seed)
      fillPolygon(ctx, points, waterTop, `rgba(${INK}, ${layer.alpha})`)

      // 皴：沿山脊向下挂短线
      const random = mulberry32(layer.seed * 7)
      ctx.strokeStyle = `rgba(${INK}, ${layer.alpha * 1.1})`
      ctx.lineWidth = 1
      for (let i = 0; i < 40; i += 1) {
        const index2 = Math.floor(random() * points.length)
        const [x, y] = points[index2]!
        const length = 8 + random() * 22
        ctx.beginPath()
        ctx.moveTo(x, y + 1)
        ctx.quadraticCurveTo(
          x + (random() - 0.5) * 8,
          y + length * 0.6,
          x + (random() - 0.5) * 6,
          y + length,
        )
        ctx.stroke()
      }

      // 山脚的雾：把层与层之间的边界糊开
      if (index < layers.length - 1) {
        const mistY = layer.baseY + layer.amp * 0.45
        const mist = ctx.createLinearGradient(0, mistY - h * 0.05, 0, mistY + h * 0.06)
        mist.addColorStop(0, 'rgba(248, 243, 233, 0)')
        mist.addColorStop(0.5, 'rgba(248, 243, 233, 0.75)')
        mist.addColorStop(1, 'rgba(248, 243, 233, 0)')
        ctx.fillStyle = mist
        ctx.fillRect(0, mistY - h * 0.05, w, h * 0.11)
      }
    }
  }

  /** 岸上屋舍：宏村最有辨识度的一排马头墙 + 白墙黛瓦 */
  private drawVillage(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const random = mulberry32(4242)
    const baseline = h * 0.612
    const count = 15

    // 第二排：更小更淡，做纵深
    for (let i = 0; i < 11; i += 1) {
      const width = w * (0.028 + random() * 0.026)
      const x = w * 0.06 + (i / 11) * w * 0.88 + (random() - 0.5) * 10
      const height = h * (0.03 + random() * 0.03)
      ctx.globalAlpha = 0.5
      this.drawHouse(ctx, x, h * 0.585 - height, width, height, random, 2)
      ctx.globalAlpha = 1
    }

    // 第一排：大小错落，留出巷口与树
    for (let i = 0; i < count; i += 1) {
      const gap = i % 4 === 2
      const width = w * (0.04 + random() * 0.05)
      const x = w * 0.05 + (i / count) * w * 0.9 + (random() - 0.5) * 8
      const height = gap ? h * 0.045 : h * (0.07 + random() * 0.075)
      this.drawHouse(ctx, x, baseline - height, width, height, random, gap ? 2 : 3)
    }

    // 祠堂：靠中间，屋脊更宽、马头墙三级
    this.drawHouse(ctx, w * 0.545, baseline - h * 0.13, w * 0.085, h * 0.13, random, 3, true)

    // 树：白墙之间点几株，避免一整排硬边
    for (const x of [0.12, 0.36, 0.62, 0.86]) {
      this.drawTree(
        ctx,
        w * x,
        baseline - h * (0.02 + random() * 0.03),
        h * (0.06 + random() * 0.05),
      )
    }
  }

  private drawHouse(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    random: () => number,
    steps: number,
    hall = false,
  ): void {
    const wallTop = y + height * 0.24
    const wallHeight = height * 0.76

    // 墙：纸白 + 墨线
    ctx.fillStyle = WALL
    ctx.fillRect(x, wallTop, width, wallHeight)
    ctx.strokeStyle = `rgba(${INK}, 0.5)`
    ctx.lineWidth = 1
    ctx.strokeRect(x, wallTop, width, wallHeight)

    // 屋面：黛瓦，带一点起翘
    ctx.fillStyle = `rgba(${INK}, 0.42)`
    ctx.beginPath()
    ctx.moveTo(x - width * 0.1, wallTop + height * 0.02)
    ctx.quadraticCurveTo(
      x + width * 0.5,
      wallTop + height * (hall ? 0.005 : 0.03),
      x + width * 1.1,
      wallTop + height * 0.02,
    )
    ctx.lineTo(x + width * 1.02, wallTop + height * 0.17)
    ctx.quadraticCurveTo(
      x + width * 0.5,
      y + height * 0.2,
      x - width * 0.02,
      wallTop + height * 0.17,
    )
    ctx.closePath()
    ctx.fill()

    // 瓦垄
    ctx.strokeStyle = `rgba(252, 249, 242, 0.28)`
    ctx.lineWidth = 0.7
    for (let i = 1; i < 5; i += 1) {
      const u = i / 5
      ctx.beginPath()
      ctx.moveTo(x + width * u, wallTop + height * 0.03)
      ctx.lineTo(x + width * (u - 0.02), wallTop + height * 0.16)
      ctx.stroke()
    }

    // 马头墙：阶梯状山墙——每一级是一块独立的矮墙，越往上越往外收
    const stepHeight = height * 0.11
    const stepWidth = width * (hall ? 0.17 : 0.14)
    for (const side of [-1, 1] as const) {
      const edge = side < 0 ? x : x + width
      for (let i = 0; i < steps; i += 1) {
        const top = wallTop - stepHeight * (i + 1)
        const left = side < 0 ? edge - stepWidth - i * width * 0.06 : edge + i * width * 0.06
        const blockHeight = stepHeight + 1

        ctx.fillStyle = WALL
        ctx.fillRect(left, top, stepWidth, blockHeight)
        ctx.strokeStyle = `rgba(${INK}, 0.5)`
        ctx.lineWidth = 0.9
        ctx.strokeRect(left, top, stepWidth, blockHeight)

        // 压顶黛瓦：两端微微出头，是马头墙的「头」
        ctx.fillStyle = `rgba(${INK}, 0.6)`
        ctx.fillRect(left - 2.5, top - 3, stepWidth + 5, 3.2)
      }
    }

    // 门窗
    const windows = hall ? 3 : 1 + Math.floor(random() * 2)
    for (let i = 0; i < windows; i += 1) {
      const wx = x + width * (hall ? 0.14 + i * 0.26 : 0.2 + i * 0.36)
      const wy = wallTop + height * (hall ? 0.3 : 0.34)
      const ww = width * (hall ? 0.16 : 0.19)
      const wh = height * (hall ? 0.3 : 0.22)
      ctx.fillStyle = `rgba(${INK}, 0.42)`
      ctx.fillRect(wx, wy, ww, wh)
      ctx.strokeStyle = `rgba(252, 249, 242, 0.7)`
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(wx + ww / 2, wy)
      ctx.lineTo(wx + ww / 2, wy + wh)
      ctx.moveTo(wx, wy + wh / 2)
      ctx.lineTo(wx + ww, wy + wh / 2)
      ctx.stroke()
    }

    // 门
    const doorWidth = width * 0.22
    const doorX = x + width * 0.5 - doorWidth / 2
    const doorY = wallTop + wallHeight - height * 0.32
    ctx.fillStyle = `rgba(${INK}, 0.3)`
    ctx.fillRect(doorX, doorY, doorWidth, height * 0.32)
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number, size: number): void {
    const random = mulberry32(Math.round(x * 13) + 7)
    ctx.strokeStyle = `rgba(${INK}, 0.35)`
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(x, baseY)
    ctx.quadraticCurveTo(x - size * 0.1, baseY - size * 0.5, x, baseY - size * 0.85)
    ctx.stroke()

    for (let i = 0; i < 9; i += 1) {
      const spread = (random() - 0.5) * size * 1.1
      const startY = baseY - size * (0.5 + random() * 0.3)
      ctx.strokeStyle = `rgba(${INK}, ${0.12 + random() * 0.16})`
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.quadraticCurveTo(x + spread * 0.5, startY - size * 0.15, x + spread, startY + size * 0.12)
      ctx.stroke()
    }
  }

  private drawBridge(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const left = w * 0.115
    const right = w * 0.33
    const deckY = h * 0.6
    const span = right - left
    const rise = h * 0.052

    // 桥拱（重墨）
    ctx.strokeStyle = `rgba(${INK}, 0.5)`
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(left, deckY)
    ctx.quadraticCurveTo(left + span / 2, deckY - rise * 2, right, deckY)
    ctx.stroke()

    // 桥面
    ctx.strokeStyle = `rgba(${INK}, 0.3)`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(left - 4, deckY + 5)
    ctx.quadraticCurveTo(left + span / 2, deckY - rise * 2 + 5, right + 4, deckY + 5)
    ctx.stroke()

    // 栏杆
    ctx.strokeStyle = `rgba(${INK}, 0.32)`
    ctx.lineWidth = 1
    const posts = 11
    for (let i = 0; i <= posts; i += 1) {
      const u = i / posts
      const x = left + span * u
      const y = deckY + 5 - Math.sin(u * Math.PI) * rise * 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y - 9)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(left, deckY - 4)
    ctx.quadraticCurveTo(left + span / 2, deckY - rise * 2 - 4, right, deckY - 4)
    ctx.stroke()

    // 桥洞里的影
    ctx.fillStyle = `rgba(${INK}, 0.12)`
    ctx.beginPath()
    ctx.moveTo(left + span * 0.05, deckY)
    ctx.quadraticCurveTo(left + span / 2, deckY - rise * 3.2, right - span * 0.05, deckY)
    ctx.closePath()
    ctx.fill()
  }

  private drawBank(ctx: CanvasRenderingContext2D, w: number, waterTop: number): void {
    // 岸：一条墨色石栏，把墙根与水面分开
    ctx.fillStyle = `rgba(${INK}, 0.16)`
    ctx.fillRect(0, waterTop - 5, w, 5)
    ctx.strokeStyle = `rgba(${INK}, 0.38)`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(0, waterTop - 5)
    ctx.lineTo(w, waterTop - 5)
    ctx.stroke()

    // 水岸碎石
    const random = mulberry32(515)
    for (let i = 0; i < 90; i += 1) {
      const x = random() * w
      const y = waterTop - random() * 4
      ctx.fillStyle = `rgba(${INK}, ${0.06 + random() * 0.12})`
      ctx.fillRect(x, y, 1 + random() * 3, 1)
    }
  }

  private drawReeds(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const random = mulberry32(3131)
    for (let i = 0; i < 70; i += 1) {
      const x = random() * w
      const y = h * (0.93 + random() * 0.07)
      const height = h * (0.02 + random() * 0.05)
      ctx.strokeStyle = `rgba(${INK}, ${0.07 + random() * 0.11})`
      ctx.lineWidth = 0.8 + random()
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(
        x + 4 - random() * 8,
        y - height * 0.6,
        x + 6 - random() * 12,
        y - height,
      )
      ctx.stroke()
    }
  }

  /** 把「岸上屋舍」这段单独存一张图，倒影用它来翻折 */
  private captureBank(w: number, h: number, top: number, bottom: number): void {
    if (this.staticLayer === null) return
    const bandHeight = Math.max(1, Math.round((bottom - top) * this.dpr))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * this.dpr)
    canvas.height = bandHeight
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    ctx.drawImage(
      this.staticLayer,
      0,
      Math.round(top * this.dpr),
      Math.round(w * this.dpr),
      bandHeight,
      0,
      0,
      Math.round(w * this.dpr),
      bandHeight,
    )
    this.bankLayer = canvas
    void h
  }

  // ---------- 动态层 ----------

  private drawReflection(ctx: CanvasRenderingContext2D, t: number, waterTop: number): void {
    if (this.bankLayer === null) return
    const w = this.width
    const bandHeight = this.bankLayer.height / this.dpr
    const slice = 3
    const rows = Math.ceil(bandHeight / slice)

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, waterTop, w, this.height - waterTop)
    ctx.clip()

    for (let i = 0; i < rows; i += 1) {
      const sourceY = i * slice
      if (sourceY >= bandHeight) break
      const destY = waterTop + i * slice
      const progress = i / rows
      const wobble = Math.sin(t * TAU * 2 + i * 0.2) * (1 + progress * 6)
      ctx.globalAlpha = Math.max(0, 0.3 * (1 - progress * 1.05))
      ctx.drawImage(
        this.bankLayer,
        0,
        Math.round(sourceY * this.dpr),
        Math.round(w * this.dpr),
        Math.round(slice * this.dpr),
        wobble,
        destY,
        w,
        slice + 0.6,
      )
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private drawWater(ctx: CanvasRenderingContext2D, t: number, waterTop: number): void {
    const { width: w, height: h } = this
    const gradient = ctx.createLinearGradient(0, waterTop, 0, h)
    gradient.addColorStop(0, `rgba(${INK}, 0.05)`)
    gradient.addColorStop(1, `rgba(${INK}, 0.015)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, waterTop, w, h - waterTop)

    const random = mulberry32(9091)
    const lines = 36
    for (let i = 0; i < lines; i += 1) {
      const depth = i / lines
      const y = waterTop + depth * (h - waterTop) * 0.95
      const speed = 1 + (i % 3)
      const phase = t * TAU * speed + i * 0.7
      const drift = Math.sin(phase) * (3 + depth * 18)
      const alpha = 0.045 + (1 - depth) * 0.045
      ctx.strokeStyle = `rgba(${INK}, ${alpha})`
      ctx.lineWidth = 0.8 + (1 - depth) * 0.7

      const dashes = 6 + Math.round(random() * 4)
      for (let d = 0; d < dashes; d += 1) {
        const x = ((d / dashes + random() * 0.08) * w + drift + w) % w
        const length = (0.02 + random() * 0.05) * w
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + length, y)
        ctx.stroke()
      }
    }
  }

  private drawMist(ctx: CanvasRenderingContext2D, t: number): void {
    const { width: w, height: h } = this
    const bands = [
      { y: 0.42, height: 0.07, alpha: 0.14, speed: 1 },
      { y: 0.5, height: 0.06, alpha: 0.16, speed: 2 },
      { y: 0.58, height: 0.04, alpha: 0.1, speed: 1 },
    ]
    for (const band of bands) {
      const centerY = h * band.y
      const bandHeight = h * band.height
      const shift = Math.sin(t * TAU * band.speed) * w * 0.07
      const gradient = ctx.createRadialGradient(
        w * 0.5 + shift,
        centerY,
        0,
        w * 0.5 + shift,
        centerY,
        w * 0.6,
      )
      gradient.addColorStop(0, `rgba(250, 246, 238, ${band.alpha})`)
      gradient.addColorStop(1, 'rgba(250, 246, 238, 0)')
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, centerY - bandHeight, w, bandHeight * 2)
      ctx.clip()
      ctx.fillStyle = gradient
      ctx.fillRect(0, centerY - bandHeight, w, bandHeight * 2)
      ctx.restore()
    }
  }

  private drawSplashes(ctx: CanvasRenderingContext2D, t: number, waterTop: number): void {
    const { width: w, height: h } = this
    for (const splash of SPLASHES) {
      const k = splashPhase(t, splash.offset)
      if (k === null) continue
      const cx = splash.x * w
      const cy = splash.y * h
      const radius = splash.size * (0.3 + 0.8 * k)
      const alpha = (1 - k) ** 1.7 * 0.3

      const random = mulberry32(Math.round(splash.offset * 1000) + 17)
      ctx.beginPath()
      const points = 14
      for (let i = 0; i <= points; i += 1) {
        const angle = (i / points) * TAU
        const variation = 0.72 + random() * 0.55
        const x = cx + Math.cos(angle) * radius * variation
        const y = cy + Math.sin(angle) * radius * variation * 0.82
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius)
      gradient.addColorStop(0, `rgba(${INK}, ${alpha})`)
      gradient.addColorStop(1, `rgba(${INK}, ${alpha * 0.12})`)
      ctx.fillStyle = gradient
      ctx.fill()

      for (let i = 0; i < 8; i += 1) {
        const angle = random() * TAU
        const distance = radius * (1.1 + random() * 0.9)
        const dotRadius = (1.2 + random() * 2.4) * (1 - k * 0.6)
        ctx.beginPath()
        ctx.arc(
          cx + Math.cos(angle) * distance,
          cy + Math.sin(angle) * distance * 0.8,
          dotRadius,
          0,
          TAU,
        )
        ctx.fillStyle = `rgba(${INK}, ${alpha * (0.5 + random() * 0.6)})`
        ctx.fill()
      }

      if (splash.y > 0.3) {
        const ringY = Math.max(waterTop + 10, cy + radius * 0.8)
        ctx.strokeStyle = `rgba(${INK}, ${alpha * 0.8})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(cx, ringY, radius * (0.8 + k), radius * 0.22 * (0.8 + k), 0, 0, TAU)
        ctx.stroke()
      }
    }
  }

  private drawBirds(ctx: CanvasRenderingContext2D, t: number): void {
    const w = this.width
    const h = this.height
    for (let i = 0; i < 3; i += 1) {
      const local = (t + i / 3) % 1
      const alpha = Math.sin(local * Math.PI) * 0.4
      if (alpha <= 0.01) continue
      const x = local * (w + 120) - 60
      const y = h * (0.16 + i * 0.05) + Math.sin(local * TAU * 2 + i) * 6
      const size = 5 - i

      ctx.strokeStyle = `rgba(${INK}, ${alpha})`
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(x - size, y + size * 0.4)
      ctx.quadraticCurveTo(x - size * 0.4, y - size * 0.3, x, y + size * 0.1)
      ctx.quadraticCurveTo(x + size * 0.4, y - size * 0.3, x + size, y + size * 0.4)
      ctx.stroke()
    }
  }

  private drawVeil(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, 'rgba(248, 244, 236, 0.2)')
    gradient.addColorStop(0.45, 'rgba(248, 244, 236, 0.04)')
    gradient.addColorStop(1, 'rgba(244, 238, 226, 0.18)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }
}
