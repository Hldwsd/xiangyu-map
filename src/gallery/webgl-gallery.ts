/**
 * 分享图集 WebGL 场景。
 *
 * 所有照片都是带曲面弯曲的纹理平面：顶点着色器把平面沿 x 轴弯成弧，
 * 矩阵阶段再压平。上半段是竖螺旋，滚动时旋转并把当前卡送到画面中心；
 * 下半段 70 张照片飞进一个 5×14 的网格，再用安徽省轮廓纹理裁成地图。
 *
 * 不用 Three.js：只有一种平面、一个着色器、70 次 draw call，
 * 自己写投影矩阵就够，省一个 150 KB+ 的引擎。
 */
import { PROVINCE_OUTLINE } from '@/brand/geo.generated'

export interface GallerySite {
  id: string
  name: string
  city: string
  category: string
  shareImage: string
}

export interface GalleryState {
  /** 螺旋旋转角，0–324° */
  spin: number
  /** 0 = 螺旋，1 = 地图 */
  map: number
}

export interface GalleryScene {
  setState(state: GalleryState): void
  destroy(): void
}

interface GalleryOptions {
  onActive?: (index: number) => void
}

interface Card {
  site: GallerySite
  texture: WebGLTexture | null
  target: { x: number; y: number; w: number; h: number; row: number; col: number }
}

const HELIX_COUNT = 10
const CARD_ASPECT = 1200 / 630
const HELIX_STEP = 36
const HELIX_RADIUS = 1.8
const HELIX_Y = 0.8
const HELIX_W = 1.45

const COLS = 5
const ROWS = 14
const MAP_H = 3.5
const CELL_H = MAP_H / ROWS
const CELL_W = CELL_H * CARD_ASPECT
const MAP_W = COLS * CELL_W
const MAP_MIN: [number, number] = [-MAP_W / 2, -MAP_H / 2]
const MAP_SIZE: [number, number] = [MAP_W, MAP_H]

const VERTEX = `
attribute vec2 aPos;
attribute vec2 aUv;
uniform mat4 uProj;
uniform mat4 uView;
uniform mat4 uModel;
uniform float uCurve;
uniform vec2 uMapMin;
uniform vec2 uMapSize;
varying vec2 vUv;
varying vec2 vMapUv;
varying float vShade;
void main() {
  vec3 p = vec3(aPos.x, aPos.y, uCurve * (0.25 - aPos.x * aPos.x));
  vec4 world = uModel * vec4(p, 1.0);
  vMapUv = vec2((world.x - uMapMin.x) / uMapSize.x, 1.0 - (world.y - uMapMin.y) / uMapSize.y);
  vec3 n = normalize(vec3(2.0 * uCurve * aPos.x, 0.0, 1.0));
  vShade = 0.84 + 0.16 * max(dot(n, normalize(vec3(-0.35, 0.55, 1.0))), 0.0);
  vUv = aUv;
  gl_Position = uProj * uView * world;
}
`

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTexture;
uniform sampler2D uMask;
uniform float uActive;
uniform float uOpacity;
uniform float uMapProgress;
uniform vec2 uMaskTexel;
varying vec2 vUv;
varying vec2 vMapUv;
varying float vShade;
void main() {
  vec4 tex = texture2D(uTexture, vUv);
  vec3 color = tex.rgb * vShade;
  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  float border = smoothstep(0.0, 0.007, edge);
  vec3 gold = vec3(0.79, 0.63, 0.36);
  vec3 paper = vec3(0.93, 0.89, 0.82);
  color = mix(mix(paper, gold, uActive), color, border);
  float alpha = uOpacity;
  if (uMapProgress > 0.001) {
    float m = texture2D(uMask, vMapUv).a;
    float mx = texture2D(uMask, vMapUv + vec2(uMaskTexel.x, 0.0)).a;
    float mX = texture2D(uMask, vMapUv - vec2(uMaskTexel.x, 0.0)).a;
    float my = texture2D(uMask, vMapUv + vec2(0.0, uMaskTexel.y)).a;
    float mY = texture2D(uMask, vMapUv - vec2(0.0, uMaskTexel.y)).a;
    float outline = m * (1.0 - min(min(mx, mX), min(my, mY)));
    float maskFade = smoothstep(0.2, 0.9, uMapProgress);
    alpha *= mix(1.0, m, maskFade);
    color = mix(color, gold, outline * maskFade * 0.85);
  }
  color += uActive * 0.035;
  gl_FragColor = vec4(color, alpha);
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (shader === null) throw new Error('createShader failed')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`shader compile failed: ${log ?? ''}`)
  }
  return shader
}

function program(gl: WebGLRenderingContext): WebGLProgram {
  const p = gl.createProgram()
  if (p === null) throw new Error('createProgram failed')
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p)
    gl.deleteProgram(p)
    throw new Error(`program link failed: ${log ?? ''}`)
  }
  return p
}

function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan((fov * Math.PI) / 360)
  const range = 1 / (near - far)
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (near + far) * range,
    -1,
    0,
    0,
    2 * near * far * range,
    0,
  ])
}

function viewMatrix(cameraZ: number): Float32Array {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -cameraZ, 1])
}

function modelMatrix(
  x: number,
  y: number,
  z: number,
  rotation: number,
  width: number,
  height: number,
): Float32Array {
  const c = Math.cos(rotation)
  const s = Math.sin(rotation)
  return new Float32Array([c * width, 0, -s * width, 0, 0, height, 0, 0, s, 0, c, 0, x, y, z, 1])
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

const GEOM_SEGMENTS_X = 18
const GEOM_SEGMENTS_Y = 11

function createGeometry(): { positions: Float32Array; uvs: Float32Array; indices: Uint16Array } {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  for (let y = 0; y <= GEOM_SEGMENTS_Y; y += 1) {
    const v = y / GEOM_SEGMENTS_Y
    for (let x = 0; x <= GEOM_SEGMENTS_X; x += 1) {
      const u = x / GEOM_SEGMENTS_X
      positions.push(u - 0.5, v - 0.5)
      uvs.push(u, 1 - v)
    }
  }
  const stride = GEOM_SEGMENTS_X + 1
  for (let y = 0; y < GEOM_SEGMENTS_Y; y += 1) {
    for (let x = 0; x < GEOM_SEGMENTS_X; x += 1) {
      const a = y * stride + x
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  }
}

function createMask(gl: WebGLRenderingContext): { texture: WebGLTexture; texel: [number, number] } {
  const width = 480
  const height = 707
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx === null) throw new Error('mask canvas unavailable')
  ctx.clearRect(0, 0, width, height)
  ctx.setTransform(width / 619, 0, 0, height / 800, 0, 0)
  ctx.fillStyle = '#fff'
  ctx.fill(new Path2D(PROVINCE_OUTLINE))
  const texture = gl.createTexture()
  if (texture === null) throw new Error('mask texture failed')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return { texture, texel: [1 / width, 1 / height] }
}

function createPlaceholder(gl: WebGLRenderingContext): WebGLTexture {
  const texture = gl.createTexture()
  if (texture === null) throw new Error('placeholder texture failed')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([38, 33, 27, 255]),
  )
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return texture
}

async function loadTexture(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture | null> {
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    let source: TexImageSource
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(image, {
        resizeWidth: 512,
        resizeHeight: 269,
        resizeQuality: 'medium',
      })
      source = bitmap
    } else {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 269
      const ctx = canvas.getContext('2d')
      if (ctx === null) return null
      ctx.drawImage(image, 0, 0, 512, 269)
      source = canvas
    }
    const texture = gl.createTexture()
    if (texture === null) return null
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    if ('close' in source && typeof source.close === 'function') source.close()
    return texture
  } catch {
    return null
  }
}

export function createGalleryScene(
  canvas: HTMLCanvasElement,
  sites: GallerySite[],
  options: GalleryOptions = {},
): GalleryScene | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  })
  if (gl === null) return null

  let prog: WebGLProgram
  try {
    prog = program(gl)
  } catch {
    return null
  }

  const geometry = createGeometry()
  const positionBuffer = gl.createBuffer()
  const uvBuffer = gl.createBuffer()
  const indexBuffer = gl.createBuffer()
  if (positionBuffer === null || uvBuffer === null || indexBuffer === null) return null

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW)

  const aPos = gl.getAttribLocation(prog, 'aPos')
  const aUv = gl.getAttribLocation(prog, 'aUv')
  const uniforms = {
    proj: gl.getUniformLocation(prog, 'uProj'),
    view: gl.getUniformLocation(prog, 'uView'),
    model: gl.getUniformLocation(prog, 'uModel'),
    curve: gl.getUniformLocation(prog, 'uCurve'),
    mapMin: gl.getUniformLocation(prog, 'uMapMin'),
    mapSize: gl.getUniformLocation(prog, 'uMapSize'),
    texture: gl.getUniformLocation(prog, 'uTexture'),
    mask: gl.getUniformLocation(prog, 'uMask'),
    active: gl.getUniformLocation(prog, 'uActive'),
    opacity: gl.getUniformLocation(prog, 'uOpacity'),
    mapProgress: gl.getUniformLocation(prog, 'uMapProgress'),
    maskTexel: gl.getUniformLocation(prog, 'uMaskTexel'),
  }

  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
  gl.enableVertexAttribArray(aUv)
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.disable(gl.DEPTH_TEST)
  gl.clearColor(0, 0, 0, 0)

  const placeholder = createPlaceholder(gl)
  let mask: { texture: WebGLTexture; texel: [number, number] } | null = null
  try {
    mask = createMask(gl)
  } catch {
    mask = null
  }

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, mask?.texture ?? placeholder)
  gl.uniform1i(uniforms.mask, 1)
  gl.uniform2f(uniforms.maskTexel, mask?.texel[0] ?? 1 / 480, mask?.texel[1] ?? 1 / 707)
  gl.uniform2f(uniforms.mapMin, MAP_MIN[0], MAP_MIN[1])
  gl.uniform2f(uniforms.mapSize, MAP_SIZE[0], MAP_SIZE[1])

  const targets = Array.from({ length: COLS * ROWS }, (_, index) => {
    const col = index % COLS
    const row = Math.floor(index / COLS)
    const w = CELL_W * 1.03
    const h = w / CARD_ASPECT
    return {
      x: (col - (COLS - 1) / 2) * CELL_W,
      y: ((ROWS - 1) / 2 - row) * CELL_H,
      w,
      h,
      row,
      col,
    }
  })

  // 十张螺旋图在矩阵里等距落位，不要把示例全挤在左上角；其余图补空位。
  const assignment: number[] = []
  const used = new Set<number>()
  const spread = (targets.length - 1) / (HELIX_COUNT - 1)
  for (let i = 0; i < HELIX_COUNT; i += 1) {
    const targetIndex = Math.round(i * spread)
    used.add(targetIndex)
    assignment.push(targetIndex)
  }
  let freeCell = 0
  for (let i = HELIX_COUNT; i < targets.length; i += 1) {
    while (used.has(freeCell)) freeCell += 1
    used.add(freeCell)
    assignment.push(freeCell)
    freeCell += 1
  }

  const cards: Card[] = sites.slice(0, COLS * ROWS).map((site, index) => {
    const target = targets[assignment[index] ?? index]
    if (target === undefined) throw new Error('gallery target missing')
    return { site, texture: null, target }
  })

  let destroyed = false
  let frame = 0
  let active = 0
  let lastActive = -1
  let state: GalleryState = { spin: 0, map: 0 }
  let mapActive = -1
  const canvasSize = { width: 0, height: 0, dpr: 1 }

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (width === canvasSize.width && height === canvasSize.height) return
    canvas.width = width
    canvas.height = height
    canvasSize.width = width
    canvasSize.height = height
    canvasSize.dpr = dpr
    gl.viewport(0, 0, width, height)
  }

  const textureFor = (card: Card): WebGLTexture => card.texture ?? placeholder

  const draw = (): void => {
    if (destroyed) return
    resize()
    gl.clear(gl.COLOR_BUFFER_BIT)

    const aspect = canvasSize.width / Math.max(1, canvasSize.height)
    const cameraZ = 5.4 - 0.9 * smoothstep(0.2, 1, state.map)
    const proj = perspective(45, aspect, 0.1, 50)
    const view = viewMatrix(cameraZ)
    gl.uniformMatrix4fv(uniforms.proj, false, proj)
    gl.uniformMatrix4fv(uniforms.view, false, view)

    const mapProgress = smoothstep(0.15, 0.9, state.map)

    if (state.map > 0.001 && mapActive < 0) {
      mapActive = Math.round(state.spin / HELIX_STEP) % HELIX_COUNT
      const centerIndex = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2)
      const activeCard = cards[mapActive]
      const centerCard = cards.find(
        (card) => card.target.row * COLS + card.target.col === centerIndex,
      )
      if (activeCard !== undefined && centerCard !== undefined && centerCard !== activeCard) {
        const swap = activeCard.target
        activeCard.target = centerCard.target
        centerCard.target = swap
      }
    }

    const activeNow =
      state.map > 0.001 ? mapActive : Math.round(state.spin / HELIX_STEP) % HELIX_COUNT
    active = activeNow

    if (state.map < 0.5 && active !== lastActive) {
      lastActive = active
      options.onActive?.(active)
    }

    const spin = (state.spin * Math.PI) / 180
    const front = state.spin / HELIX_STEP
    const offsetY = -(front - (HELIX_COUNT - 1) / 2) * HELIX_Y

    const draws: {
      card: Card
      z: number
      model: Float32Array
      opacity: number
      active: number
      curve: number
      mask: number
    }[] = []

    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index]
      if (card === undefined) continue
      const isHelix = index < HELIX_COUNT
      const target = card.target
      const delay = isHelix ? 0 : 0.02 + 0.12 * (((target.row + target.col) % 6) / 6)
      const t = easeInOutCubic(clamp01((state.map - delay) / Math.max(0.001, 1 - delay)))

      if (state.map <= 0.0001) {
        if (!isHelix) continue
        const angle = -(index * Math.PI * 2) / HELIX_COUNT + spin
        const cos = Math.cos(angle)
        if (cos < -0.02) continue
        const x = Math.sin(angle) * HELIX_RADIUS
        const z = Math.cos(angle) * HELIX_RADIUS
        const y = (index - (HELIX_COUNT - 1) / 2) * HELIX_Y + offsetY
        const isActive = index === activeNow
        const width = HELIX_W * (isActive ? 1.07 : 1)
        const height = width / CARD_ASPECT
        draws.push({
          card,
          z,
          model: modelMatrix(x, y, z, angle, width, height),
          opacity: isActive ? 1 : 0.42 + 0.45 * clamp01(cos),
          active: isActive ? 1 : 0,
          curve: 1.05,
          mask: 0,
        })
        continue
      }

      if (isHelix) {
        const angle = -(index * Math.PI * 2) / HELIX_COUNT + spin
        const fromX = Math.sin(angle) * HELIX_RADIUS
        const fromZ = Math.cos(angle) * HELIX_RADIUS
        const fromY = (index - (HELIX_COUNT - 1) / 2) * HELIX_Y + offsetY
        const isActive = index === activeNow
        const fromW = HELIX_W * (isActive ? 1.07 : 1)
        const x = lerp(fromX, target.x, t)
        const y = lerp(fromY, target.y, t)
        const z = lerp(fromZ, 0, t)
        const rotation = lerp(angle % (Math.PI * 2), 0, t)
        const width = lerp(fromW, target.w, t)
        const height = width / CARD_ASPECT
        draws.push({
          card,
          z,
          model: modelMatrix(x, y, z, rotation, width, height),
          opacity: lerp(1, 1, t),
          active: isActive && state.map < 0.95 ? 1 : 0,
          curve: lerp(1.05, 0.08, t),
          mask: mapProgress * t,
        })
      } else {
        const fromZ = -0.5
        const fromW = target.w * 0.9
        const x = target.x
        const y = target.y
        const z = lerp(fromZ, 0, t)
        const width = lerp(fromW, target.w, t)
        const height = width / CARD_ASPECT
        draws.push({
          card,
          z,
          model: modelMatrix(x, y, z, 0, width, height),
          opacity: Math.min(1, state.map * 8),
          active: index === activeNow && state.map < 0.95 ? 1 : 0,
          curve: lerp(0.35, 0.08, t),
          mask: 1,
        })
      }
    }

    draws.sort((a, b) => a.z - b.z)

    gl.activeTexture(gl.TEXTURE0)
    for (const item of draws) {
      gl.bindTexture(gl.TEXTURE_2D, textureFor(item.card))
      gl.uniformMatrix4fv(uniforms.model, false, item.model)
      gl.uniform1f(uniforms.curve, item.curve)
      gl.uniform1f(uniforms.active, item.active)
      gl.uniform1f(uniforms.opacity, item.opacity)
      gl.uniform1f(uniforms.mapProgress, item.mask)
      gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0)
    }

    frame = requestAnimationFrame(draw)
  }

  frame = requestAnimationFrame(draw)

  // 纹理按 8 路并发加载；前 10 张精选先加载。
  let cursor = 0
  const loadNext = async (): Promise<void> => {
    while (!destroyed && cursor < cards.length) {
      const index = cursor
      cursor += 1
      const card = cards[index]
      if (card === undefined) continue
      const texture = await loadTexture(gl, card.site.shareImage)
      if (texture !== null && !destroyed) card.texture = texture
    }
  }
  for (let i = 0; i < 8; i += 1) void loadNext()

  return {
    setState(next: GalleryState) {
      state = next
    },
    destroy() {
      destroyed = true
      cancelAnimationFrame(frame)
      gl.deleteBuffer(positionBuffer)
      gl.deleteBuffer(uvBuffer)
      gl.deleteBuffer(indexBuffer)
      for (const card of cards) {
        if (card.texture !== null) gl.deleteTexture(card.texture)
      }
      gl.deleteTexture(placeholder)
      if (mask !== null) gl.deleteTexture(mask.texture)
      gl.deleteProgram(prog)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
