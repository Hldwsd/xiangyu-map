/**
 * 水墨宏村 · 写实向渲染器（v3）
 *
 * 目标：不是「用线条拼一座村子」，而是让它像一张水墨画——
 * 用湿笔、晕染、层层积墨和纸纹去堆出体积与空气感。
 *
 * 手法：
 * - **软边**：所有形体都带轻微模糊（`ctx.filter`），远山更糊、近景更实，形成空气透视。
 * - **积墨**：山体由「一层渐变底 + 上百笔皴」叠出来，而不是一条轮廓线。
 * - **留白**：屋舍是纸白，靠黛瓦与窗洞的重墨反衬，不描边。
 * - **纸纹与湿痕**：静态层铺噪点纸纹；天空与水面撒「湿痕」墨晕。
 * - **无缝循环**：36 秒，周期项全为整数倍正弦；滴溅用半开区间相位。
 */

const INK = '28, 26, 23'
const PAPER = '#f7f1e4'

export const LOOP_MS = 36_000

const TAU = Math.PI * 2

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

function ridge(
  width: number,
  baseY: number,
  amplitude: number,
  seed: number,
  steps = 140,
): Array<[number, number]> {
  const random = mulberry32(seed)
  const waves = Array.from({ length: 5 }, (_, index) => ({
    freq: (index + 1) * (0.7 + random() * 0.9),
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

/** 一支「湿笔」：短、软、两头淡，叠多了就是山体的皴 */
function wetStroke(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  width: number,
  alpha: number,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const gradient = ctx.createLinearGradient(0, 0, length, 0)
  gradient.addColorStop(0, `rgba(${INK}, 0)`)
  gradient.addColorStop(0.35, `rgba(${INK}, ${alpha})`)
  gradient.addColorStop(1, `rgba(${INK}, 0)`)
  ctx.strokeStyle = gradient
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(length * 0.45, length * 0.06, length, 0)
  ctx.stroke()
  ctx.restore()
}

/** 墨晕：不规则的多瓣形 + 径向渐变，像一滴墨在湿纸上化开 */
function bloom(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  alpha: number,
  seed: number,
): void {
  const random = mulberry32(seed)
  const points = 16
  ctx.beginPath()
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * TAU
    const variation = 0.62 + random() * 0.72
    const x = cx + Math.cos(angle) * radius * variation
    const y = cy + Math.sin(angle) * radius * variation * 0.86
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius)
  gradient.addColorStop(0, `rgba(${INK}, ${alpha})`)
  gradient.addColorStop(0.55, `rgba(${INK}, ${alpha * 0.55})`)
  gradient.addColorStop(1, `rgba(${INK}, 0)`)
  ctx.fillStyle = gradient
  ctx.fill()
}

export class InkHongcunScene {
  private readonly ctx: CanvasRenderingContext2D
  private readonly canvas: HTMLCanvasElement
  private staticLayer: HTMLCanvasElement | null = null
  private bankLayer: HTMLCanvasElement | null = null
  private grainLayer: HTMLCanvasElement | null = null
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
    this.grainLayer = this.createGrain()
    this.buildStaticLayer()
  }

  render(timeMs: number): void {
    if (this.staticLayer === null) return
    const ctx = this.ctx
    const { width: w, height: h } = this
    const waterTop = h * 0.6
    const t = (((timeMs % LOOP_MS) + LOOP_MS) % LOOP_MS) / LOOP_MS

    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(this.staticLayer, 0, 0, w, h)

    this.drawReflection(ctx, t, waterTop)
    this.drawWater(ctx, t, waterTop)
    this.drawDrift(ctx, t)
    this.drawSplashes(ctx, t, waterTop)
    this.drawBirds(ctx, t)
    this.drawGrain(ctx)
    this.drawVignette(ctx)
  }

  dispose(): void {
    this.staticLayer = null
    this.bankLayer = null
    this.grainLayer = null
  }

  // ---------- 纸与噪点 ----------

  private createGrain(): HTMLCanvasElement {
    const tile = document.createElement('canvas')
    const size = 220
    tile.width = size
    tile.height = size
    const ctx = tile.getContext('2d')
    if (ctx === null) return tile
    const random = mulberry32(97531)
    for (let i = 0; i < 5200; i += 1) {
      const x = random() * size
      const y = random() * size
      ctx.fillStyle = `rgba(${INK}, ${0.02 + random() * 0.05})`
      ctx.fillRect(x, y, 1, 1)
    }
    for (let i = 0; i < 260; i += 1) {
      const x = random() * size
      const y = random() * size
      ctx.strokeStyle = `rgba(${INK}, 0.03)`
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (random() - 0.5) * 3, y + 8 + random() * 18)
      ctx.stroke()
    }
    return tile
  }

  private drawGrain(ctx: CanvasRenderingContext2D): void {
    if (this.grainLayer === null) return
    const { width: w, height: h } = this
    const pattern = ctx.createPattern(this.grainLayer, 'repeat')
    if (pattern === null) return
    ctx.save()
    ctx.globalAlpha = 0.55
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
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

    const waterTop = h * 0.6

    this.paintPaper(ctx, w, h)
    this.paintSky(ctx, w, h)
    this.paintMountains(ctx, w, h, waterTop)
    this.paintVillage(ctx, w, h)
    this.paintBridge(ctx, w, h)
    this.paintShore(ctx, w, waterTop)

    this.staticLayer = canvas
    this.captureBank(w, h, h * 0.42, waterTop)
  }

  private paintPaper(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#faf5ea')
    gradient.addColorStop(0.5, PAPER)
    gradient.addColorStop(1, '#efe8da')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }

  /** 天空：几团极淡的湿痕，让上半部不是死白 */
  private paintSky(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    for (const [i, spot] of [
      { x: 0.22, y: 0.16, r: 0.34, a: 0.05 },
      { x: 0.72, y: 0.1, r: 0.3, a: 0.04 },
      { x: 0.5, y: 0.28, r: 0.4, a: 0.03 },
    ].entries()) {
      bloom(ctx, w * spot.x, h * spot.y, Math.max(w, h) * spot.r, spot.a, 600 + i)
    }
  }

  /** 远山：三层积墨，越远越淡越糊 */
  private paintMountains(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    waterTop: number,
  ): void {
    const layers = [
      { baseY: h * 0.3, amp: h * 0.13, alpha: 0.1, blur: 8, seed: 11, strokes: 150 },
      { baseY: h * 0.4, amp: h * 0.15, alpha: 0.16, blur: 4, seed: 23, strokes: 190 },
      { baseY: h * 0.5, amp: h * 0.16, alpha: 0.24, blur: 1.5, seed: 37, strokes: 230 },
    ]

    for (const layer of layers) {
      const buffer = document.createElement('canvas')
      buffer.width = Math.round(w * this.dpr)
      buffer.height = Math.round(h * this.dpr)
      const bctx = buffer.getContext('2d')
      if (bctx === null) continue
      bctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

      const points = ridge(w, layer.baseY, layer.amp, layer.seed)

      // 山体：上浓下淡的渐变
      const gradient = bctx.createLinearGradient(0, layer.baseY - layer.amp, 0, waterTop)
      gradient.addColorStop(0, `rgba(${INK}, ${layer.alpha})`)
      gradient.addColorStop(0.55, `rgba(${INK}, ${layer.alpha * 0.7})`)
      gradient.addColorStop(1, `rgba(${INK}, ${layer.alpha * 0.35})`)
      bctx.beginPath()
      bctx.moveTo(0, waterTop)
      for (const [x, y] of points) bctx.lineTo(x, y)
      bctx.lineTo(w, waterTop)
      bctx.closePath()
      bctx.fillStyle = gradient
      bctx.fill()

      // 皴：沿着山体往下挂的湿笔
      const random = mulberry32(layer.seed * 13)
      for (let i = 0; i < layer.strokes; i += 1) {
        const index = Math.floor(random() * points.length)
        const [x, y] = points[index]!
        const length = 14 + random() * 46
        const offsetX = (random() - 0.5) * 24
        wetStroke(
          bctx,
          x + offsetX,
          y + random() * 26,
          length,
          Math.PI / 2 + (random() - 0.5) * 0.5,
          1 + random() * 3.2,
          layer.alpha * (0.25 + random() * 0.5),
        )
      }

      // 山脚补几团墨晕，压出层次
      for (let i = 0; i < 8; i += 1) {
        bloom(
          bctx,
          random() * w,
          layer.baseY + layer.amp * (0.3 + random() * 0.8),
          h * (0.05 + random() * 0.08),
          layer.alpha * 0.18,
          layer.seed * 31 + i,
        )
      }

      ctx.save()
      ctx.filter = `blur(${layer.blur}px)`
      ctx.drawImage(buffer, 0, 0, w, h)
      ctx.restore()

      // 层间雾：把山脚糊进下一层
      const mist = ctx.createLinearGradient(
        0,
        layer.baseY + layer.amp * 0.5,
        0,
        layer.baseY + layer.amp * 1.6,
      )
      mist.addColorStop(0, 'rgba(250, 246, 238, 0)')
      mist.addColorStop(0.5, 'rgba(250, 246, 238, 0.9)')
      mist.addColorStop(1, 'rgba(250, 246, 238, 0)')
      ctx.fillStyle = mist
      ctx.fillRect(0, layer.baseY + layer.amp * 0.4, w, layer.amp * 1.8)
    }
  }

  /** 村落：白墙留白，黛瓦积墨，马头墙一级级叠上去 */
  private paintVillage(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const band = document.createElement('canvas')
    band.width = Math.round(w * this.dpr)
    band.height = Math.round(h * 0.28 * this.dpr)
    const bctx = band.getContext('2d')
    if (bctx === null) return
    bctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    const bandTop = h * 0.42
    bctx.translate(0, -bandTop)

    const random = mulberry32(4242)
    const baseline = h * 0.612

    // 远景屋舍：更小、更淡
    for (let i = 0; i < 10; i += 1) {
      const width = w * (0.03 + random() * 0.03)
      const x = w * 0.08 + (i / 10) * w * 0.84 + (random() - 0.5) * 12
      const height = h * (0.035 + random() * 0.03)
      bctx.globalAlpha = 0.55
      this.house(bctx, x, h * 0.585 - height, width, height, random, 2)
    }
    bctx.globalAlpha = 1

    // 主排：错落，留出巷口
    for (let i = 0; i < 13; i += 1) {
      const gap = i % 4 === 2
      const width = w * (0.045 + random() * 0.05)
      const x = w * 0.04 + (i / 13) * w * 0.92 + (random() - 0.5) * 10
      const height = gap ? h * 0.05 : h * (0.08 + random() * 0.08)
      this.house(bctx, x, baseline - height, width, height, random, gap ? 2 : 3)
    }

    // 祠堂：屋脊更宽
    this.house(bctx, w * 0.545, baseline - h * 0.15, w * 0.09, h * 0.15, random, 3, true)

    // 树：湿笔点叶
    for (const x of [0.1, 0.34, 0.63, 0.87]) {
      this.tree(bctx, w * x, baseline - h * 0.03, h * (0.08 + random() * 0.06))
    }

    // 墙根的重墨：让一排屋子落地
    const shadow = bctx.createLinearGradient(0, baseline - h * 0.035, 0, baseline + h * 0.01)
    shadow.addColorStop(0, `rgba(${INK}, 0)`)
    shadow.addColorStop(0.7, `rgba(${INK}, 0.14)`)
    shadow.addColorStop(1, `rgba(${INK}, 0.02)`)
    bctx.fillStyle = shadow
    bctx.fillRect(0, baseline - h * 0.035, w, h * 0.05)

    ctx.save()
    ctx.filter = 'blur(0.7px)'
    ctx.drawImage(band, 0, bandTop, w, h * 0.28)
    ctx.restore()
  }

  private house(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    random: () => number,
    steps: number,
    hall = false,
  ): void {
    const wallTop = y + height * 0.22
    const wallHeight = height * 0.78

    // 白墙：纸白，只在下缘加一点灰，形成圆柱感
    const wall = ctx.createLinearGradient(x, wallTop, x + width, wallTop + wallHeight)
    wall.addColorStop(0, 'rgba(253, 250, 243, 0.98)')
    wall.addColorStop(0.7, 'rgba(249, 244, 234, 0.96)')
    wall.addColorStop(1, `rgba(${INK}, 0.06)`)
    ctx.fillStyle = wall
    ctx.fillRect(x, wallTop, width, wallHeight)

    // 瓦顶：厚厚一层积墨，边缘用湿笔带出去
    ctx.beginPath()
    ctx.moveTo(x - width * 0.14, wallTop + height * 0.03)
    ctx.quadraticCurveTo(
      x + width * 0.5,
      wallTop - height * (hall ? 0.1 : 0.07),
      x + width * 1.14,
      wallTop + height * 0.03,
    )
    ctx.lineTo(x + width * 1.04, wallTop + height * 0.19)
    ctx.quadraticCurveTo(
      x + width * 0.5,
      wallTop + height * 0.24,
      x - width * 0.04,
      wallTop + height * 0.19,
    )
    ctx.closePath()
    const roof = ctx.createLinearGradient(0, wallTop - height * 0.08, 0, wallTop + height * 0.2)
    roof.addColorStop(0, `rgba(${INK}, 0.62)`)
    roof.addColorStop(1, `rgba(${INK}, 0.34)`)
    ctx.fillStyle = roof
    ctx.fill()

    // 瓦垄：短促的湿笔
    const randomRoof = mulberry32(Math.round(x))
    for (let i = 0; i < 14; i += 1) {
      const u = i / 14
      wetStroke(
        ctx,
        x + width * u,
        wallTop + height * 0.04,
        height * 0.16,
        Math.PI / 2 + 0.02,
        0.8,
        0.1 + randomRoof() * 0.12,
      )
    }

    // 马头墙：一阶阶往上收的白色山墙，压顶黛瓦
    const stepH = height * 0.11
    const stepW = width * (hall ? 0.18 : 0.15)
    for (const side of [-1, 1] as const) {
      const edge = side < 0 ? x : x + width
      for (let i = 0; i < steps; i += 1) {
        const top = wallTop - stepH * (i + 1)
        const left = side < 0 ? edge - stepW - i * width * 0.05 : edge + i * width * 0.05
        ctx.fillStyle = 'rgba(252, 249, 242, 0.97)'
        ctx.fillRect(left, top, stepW, stepH + 1)
        ctx.fillStyle = `rgba(${INK}, 0.5)`
        ctx.fillRect(left - 3, top - 2.6, stepW + 6, 3.2)
        // 檐下阴影
        ctx.fillStyle = `rgba(${INK}, 0.08)`
        ctx.fillRect(left, top + stepH - 2, stepW, 2)
      }
    }

    // 门窗：窗洞的重墨 + 一点窗棂留白
    const windows = hall ? 3 : 1 + Math.floor(random() * 2)
    for (let i = 0; i < windows; i += 1) {
      const wx = x + width * (hall ? 0.13 + i * 0.27 : 0.2 + i * 0.37)
      const wy = wallTop + height * (hall ? 0.28 : 0.33)
      const ww = width * (hall ? 0.17 : 0.2)
      const wh = height * (hall ? 0.32 : 0.24)
      const winGradient = ctx.createLinearGradient(wx, wy, wx, wy + wh)
      winGradient.addColorStop(0, `rgba(${INK}, 0.42)`)
      winGradient.addColorStop(1, `rgba(${INK}, 0.24)`)
      ctx.fillStyle = winGradient
      ctx.fillRect(wx, wy, ww, wh)
      ctx.strokeStyle = 'rgba(252, 249, 242, 0.55)'
      ctx.lineWidth = 0.7
      ctx.beginPath()
      ctx.moveTo(wx + ww / 2, wy)
      ctx.lineTo(wx + ww / 2, wy + wh)
      ctx.moveTo(wx, wy + wh * 0.5)
      ctx.lineTo(wx + ww, wy + wh * 0.5)
      ctx.stroke()
    }

    // 门洞
    const doorW = width * 0.24
    const doorX = x + width * 0.5 - doorW / 2
    const doorY = wallTop + wallHeight - height * 0.34
    ctx.fillStyle = `rgba(${INK}, 0.34)`
    ctx.fillRect(doorX, doorY, doorW, height * 0.34)
  }

  private tree(ctx: CanvasRenderingContext2D, x: number, baseY: number, size: number): void {
    const random = mulberry32(Math.round(x * 7) + 3)
    // 树干
    wetStroke(ctx, x, baseY, size * 0.9, -Math.PI / 2, 2.4, 0.34)
    // 树冠：一团团湿笔点出来
    for (let i = 0; i < 26; i += 1) {
      const dx = (random() - 0.5) * size * 1.4
      const dy = -size * (0.55 + random() * 0.7)
      const radius = size * (0.08 + random() * 0.14)
      bloom(ctx, x + dx, baseY + dy, radius, 0.06 + random() * 0.1, 900 + i)
    }
  }

  private paintBridge(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const left = w * 0.11
    const right = w * 0.32
    const deckY = h * 0.598
    const span = right - left
    const rise = h * 0.055

    // 桥身：一条有厚度的墨带
    ctx.strokeStyle = `rgba(${INK}, 0.5)`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(left, deckY)
    ctx.quadraticCurveTo(left + span / 2, deckY - rise * 2, right, deckY)
    ctx.stroke()

    ctx.strokeStyle = `rgba(${INK}, 0.24)`
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(left - 6, deckY + 6)
    ctx.quadraticCurveTo(left + span / 2, deckY - rise * 2 + 6, right + 6, deckY + 6)
    ctx.stroke()

    // 栏杆：细湿笔
    for (let i = 0; i <= 12; i += 1) {
      const u = i / 12
      const x = left + span * u
      const y = deckY + 5 - Math.sin(u * Math.PI) * rise * 2
      wetStroke(ctx, x, y, 9, -Math.PI / 2, 1.1, 0.22)
    }

    // 桥洞阴影
    const shadow = ctx.createLinearGradient(0, deckY - rise, 0, deckY + 2)
    shadow.addColorStop(0, `rgba(${INK}, 0)`)
    shadow.addColorStop(1, `rgba(${INK}, 0.16)`)
    ctx.fillStyle = shadow
    ctx.beginPath()
    ctx.moveTo(left + span * 0.06, deckY)
    ctx.quadraticCurveTo(left + span / 2, deckY - rise * 3.4, right - span * 0.06, deckY)
    ctx.closePath()
    ctx.fill()
  }

  private paintShore(ctx: CanvasRenderingContext2D, w: number, waterTop: number): void {
    // 石岸：一条深浅不一的墨带
    const gradient = ctx.createLinearGradient(0, waterTop - 10, 0, waterTop + 2)
    gradient.addColorStop(0, `rgba(${INK}, 0.05)`)
    gradient.addColorStop(0.6, `rgba(${INK}, 0.3)`)
    gradient.addColorStop(1, `rgba(${INK}, 0.1)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, waterTop - 10, w, 12)

    const random = mulberry32(515)
    for (let i = 0; i < 120; i += 1) {
      const x = random() * w
      bloom(ctx, x, waterTop - random() * 6, 1.5 + random() * 5, 0.06 + random() * 0.12, 400 + i)
    }

    // 前景芦苇：极淡的湿笔
    for (let i = 0; i < 80; i += 1) {
      const x = random() * w
      const y = waterTop + 60 + random() * 80
      wetStroke(
        ctx,
        x,
        y,
        10 + random() * 26,
        -Math.PI / 2 + (random() - 0.5) * 0.5,
        1 + random() * 1.6,
        0.05 + random() * 0.1,
      )
    }
  }

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
    const slice = 2
    const rows = Math.ceil(bandHeight / slice)

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, waterTop, w, this.height - waterTop)
    ctx.clip()

    for (let i = 0; i < rows; i += 1) {
      const sourceY = i * slice
      if (sourceY >= bandHeight) break
      const destY = waterTop + i * slice * 0.92
      const progress = i / rows
      const wobble = Math.sin(t * TAU * 2 + i * 0.22) * (1 + progress * 8)
      ctx.globalAlpha = Math.max(0, 0.4 * (1 - progress * 1.05))
      ctx.drawImage(
        this.bankLayer,
        0,
        Math.round(sourceY * this.dpr),
        Math.round(w * this.dpr),
        Math.round(slice * this.dpr),
        wobble,
        destY,
        w,
        slice + 1,
      )
    }
    ctx.globalAlpha = 1
    ctx.restore()

    // 倒影上压一层水色，避免太实
    const tint = ctx.createLinearGradient(0, waterTop, 0, this.height)
    tint.addColorStop(0, 'rgba(244, 238, 226, 0.18)')
    tint.addColorStop(1, 'rgba(244, 238, 226, 0.55)')
    ctx.fillStyle = tint
    ctx.fillRect(0, waterTop, w, this.height - waterTop)
  }

  private drawWater(ctx: CanvasRenderingContext2D, t: number, waterTop: number): void {
    const { width: w, height: h } = this
    const gradient = ctx.createLinearGradient(0, waterTop, 0, h)
    gradient.addColorStop(0, `rgba(${INK}, 0.06)`)
    gradient.addColorStop(0.6, `rgba(${INK}, 0.03)`)
    gradient.addColorStop(1, `rgba(${INK}, 0.08)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, waterTop, w, h - waterTop)

    const random = mulberry32(9091)
    const lines = 26
    for (let i = 0; i < lines; i += 1) {
      const depth = i / lines
      const y = waterTop + depth * (h - waterTop) * 0.95
      const phase = t * TAU * (1 + (i % 3)) + i * 0.7
      const drift = Math.sin(phase) * (4 + depth * 22)
      const alpha = 0.05 + (1 - depth) * 0.06

      const dashes = 5 + Math.round(random() * 4)
      for (let d = 0; d < dashes; d += 1) {
        const x = ((d / dashes + random() * 0.1) * w + drift + w) % w
        wetStroke(ctx, x, y, (0.03 + random() * 0.07) * w, 0, 1 + (1 - depth) * 1.4, alpha)
      }
    }

    // 水面浮光：几团横向的亮斑
    for (let i = 0; i < 7; i += 1) {
      const y = waterTop + ((i + 0.5) / 7) * (h - waterTop) * 0.9
      const x = ((i / 7 + Math.sin(t * TAU + i) * 0.05) * w + w) % w
      const glow = ctx.createRadialGradient(x, y, 0, x, y, w * 0.18)
      glow.addColorStop(0, 'rgba(252, 249, 240, 0.18)')
      glow.addColorStop(1, 'rgba(252, 249, 240, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(x - w * 0.18, y - 12, w * 0.36, 24)
    }
  }

  private drawDrift(ctx: CanvasRenderingContext2D, t: number): void {
    const { width: w, height: h } = this
    const bands = [
      { y: 0.4, r: 0.5, alpha: 0.16, speed: 1 },
      { y: 0.52, r: 0.55, alpha: 0.2, speed: 2 },
      { y: 0.64, r: 0.45, alpha: 0.12, speed: 1 },
    ]
    for (const band of bands) {
      const shift = Math.sin(t * TAU * band.speed) * w * 0.08
      const gradient = ctx.createRadialGradient(
        w * 0.5 + shift,
        h * band.y,
        0,
        w * 0.5 + shift,
        h * band.y,
        w * band.r,
      )
      gradient.addColorStop(0, `rgba(251, 247, 239, ${band.alpha})`)
      gradient.addColorStop(1, 'rgba(251, 247, 239, 0)')
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, h * band.y - h * 0.09, w, h * 0.18)
      ctx.clip()
      ctx.fillStyle = gradient
      ctx.fillRect(0, h * band.y - h * 0.09, w, h * 0.18)
      ctx.restore()
    }
  }

  private drawSplashes(ctx: CanvasRenderingContext2D, t: number, waterTop: number): void {
    const { width: w, height: h } = this
    for (const [index, splash] of SPLASHES.entries()) {
      const k = splashPhase(t, splash.offset)
      if (k === null) continue
      const cx = splash.x * w
      const cy = splash.y * h
      const radius = splash.size * (0.35 + 0.9 * k)
      const alpha = (1 - k) ** 1.8 * 0.32

      // 墨在湿纸上化开：三层不同半径的晕
      bloom(ctx, cx, cy, radius, alpha, index * 97 + 11)
      bloom(
        ctx,
        cx + radius * 0.18,
        cy - radius * 0.12,
        radius * 0.62,
        alpha * 0.8,
        index * 97 + 29,
      )
      bloom(ctx, cx - radius * 0.2, cy + radius * 0.1, radius * 0.5, alpha * 0.6, index * 97 + 43)

      // 飞溅的小墨点
      const random = mulberry32(index * 31 + 7)
      for (let i = 0; i < 9; i += 1) {
        const angle = random() * TAU
        const distance = radius * (1.1 + random() * 1.1)
        bloom(
          ctx,
          cx + Math.cos(angle) * distance,
          cy + Math.sin(angle) * distance * 0.85,
          1.4 + random() * 3.2,
          alpha * (0.4 + random() * 0.5),
          index * 53 + i,
        )
      }

      // 落在水面：晕开的涟漪
      if (splash.y > 0.28) {
        const ringY = Math.max(waterTop + 12, cy + radius * 0.85)
        ctx.strokeStyle = `rgba(${INK}, ${alpha * 0.7})`
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.ellipse(cx, ringY, radius * (0.9 + k * 1.2), radius * 0.2 * (0.9 + k), 0, 0, TAU)
        ctx.stroke()
        ctx.strokeStyle = `rgba(${INK}, ${alpha * 0.35})`
        ctx.beginPath()
        ctx.ellipse(cx, ringY, radius * (0.5 + k * 0.8), radius * 0.12 * (0.5 + k), 0, 0, TAU)
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
      const x = local * (w + 140) - 70
      const y = h * (0.15 + i * 0.05) + Math.sin(local * TAU * 2 + i) * 7
      const size = 6 - i
      ctx.strokeStyle = `rgba(${INK}, ${alpha})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(x - size, y + size * 0.4)
      ctx.quadraticCurveTo(x - size * 0.45, y - size * 0.35, x, y + size * 0.05)
      ctx.quadraticCurveTo(x + size * 0.45, y - size * 0.35, x + size, y + size * 0.4)
      ctx.stroke()
    }
  }

  private drawVignette(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this
    const gradient = ctx.createRadialGradient(
      w * 0.5,
      h * 0.45,
      Math.min(w, h) * 0.35,
      w * 0.5,
      h * 0.45,
      Math.max(w, h) * 0.75,
    )
    gradient.addColorStop(0, 'rgba(244, 238, 226, 0)')
    gradient.addColorStop(1, 'rgba(238, 231, 216, 0.22)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }
}

interface SplashEvent {
  x: number
  y: number
  size: number
  offset: number
}

const SPLASHES: SplashEvent[] = [
  { x: 0.26, y: 0.22, size: 78, offset: 0.03 },
  { x: 0.64, y: 0.15, size: 52, offset: 0.22 },
  { x: 0.46, y: 0.3, size: 104, offset: 0.45 },
  { x: 0.82, y: 0.26, size: 44, offset: 0.68 },
]

const SPLASH_LIFE = 0.16

/**
 * 滴溅在循环里的相位：返回 0–1 表示正在扩散，null 表示这一刻没有滴溅。
 * 半开区间，正好落在结束点上视为已消失，避免浮点误差把最后一帧算进来。
 */
export function splashPhase(t: number, offset: number): number | null {
  const local = t - offset
  if (local < 0 || local >= SPLASH_LIFE) return null
  return local / SPLASH_LIFE
}

/** 每个滴溅在循环里的可见区间，必须落在 [0,1) 内，否则循环接缝会断 */
export const SPLASH_WINDOWS: ReadonlyArray<{ offset: number; end: number }> = SPLASHES.map(
  (splash) => ({ offset: splash.offset, end: splash.offset + SPLASH_LIFE }),
)
