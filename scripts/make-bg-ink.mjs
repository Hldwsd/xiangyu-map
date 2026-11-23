// 生成首页背景 src/assets/bg-ink.svg：程序化水墨横幅（山脊 + 皴笔 + 松 + 雾 + 淡日）。
//
// 为什么用程序生成而不是找一张图：要的是「纸上的淡墨」，不是一张画 ——
// 墨色、层数、位置都要能跟着纸色与版式调；固定种子的伪随机保证每次生成同一张。
// 产物是静态 SVG（约 37KB / gzip 7.6KB），由 CSS 以 background 引用，运行时零计算。
//
// 改完重跑：pnpm data:bg-ink
import { writeFileSync } from 'node:fs'

const W = 1600
const H = 900
const rnd = (() => {
  let seed = 20261123
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
})()

/** Catmull-Rom → 三次贝塞尔，得到柔和的山脊线 */
function ridgePath(points) {
  const p = points
  let d = `M${p[0][0]},${p[0][1]}`
  for (let i = 0; i < p.length - 1; i += 1) {
    const p0 = p[i - 1] ?? p[i]
    const p1 = p[i]
    const p2 = p[i + 1]
    const p3 = p[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
  }
  return d
}

/** 山体：脊线 + 下缘到底 */
function massif(points) {
  return `${ridgePath(points)} L${W + 80},${H + 40} L-80,${H + 40} Z`
}

/** 在脊线下方补皴笔：短、淡、顺坡 */
function strokes(points, { count, depth, len, opacity }) {
  const out = []
  for (let i = 0; i < count; i += 1) {
    const t = rnd() * (points.length - 1)
    const a = points[Math.floor(t)]
    const b = points[Math.min(points.length - 1, Math.floor(t) + 1)]
    const k = t - Math.floor(t)
    const x = a[0] + (b[0] - a[0]) * k + (rnd() - 0.5) * 40
    const y0 = a[1] + (b[1] - a[1]) * k
    const y = y0 + rnd() * depth
    const angle = (Math.PI / 2) * (0.65 + rnd() * 0.7)
    const length = len * (0.6 + rnd() * 0.9)
    const dx = Math.cos(angle) * length
    const dy = Math.sin(angle) * length
    const curve = (rnd() - 0.5) * length * 0.5
    out.push(
      `<path d='M${x.toFixed(1)},${y.toFixed(1)} q${(dx / 2).toFixed(1)},${(dy / 2 + curve).toFixed(1)} ${dx.toFixed(1)},${dy.toFixed(1)}' stroke='#2e2c27' stroke-width='${(0.8 + rnd() * 1.4).toFixed(2)}' opacity='${(opacity * (0.4 + rnd() * 0.8)).toFixed(3)}' fill='none' stroke-linecap='round'/>`,
    )
  }
  return out.join('')
}

/** 一棵松：主干 + 四层横向松针 */
function pine(x, y, h, opacity) {
  const tiers = []
  for (let i = 0; i < 4; i += 1) {
    const ty = y - h * (0.35 + i * 0.17)
    const half = h * (0.1 + (3 - i) * 0.07)
    const needle = (sx, sy, dir, n) => {
      let d = ''
      for (let j = 0; j < n; j += 1) {
        const px = sx + dir * (j / n) * half
        const py = sy + (j / n) * 3.2
        d += `M${px.toFixed(1)},${py.toFixed(1)} l${(dir * -half * 0.42).toFixed(1)},${(-3.4 - rnd() * 2).toFixed(1)} `
      }
      return d
    }
    tiers.push(
      `<path d='M${x - half},${ty} L${x + half},${ty}' stroke='#2e2c27' stroke-width='1.3' fill='none'/>`,
      `<path d='${needle(x, ty, 1, 6)}${needle(x, ty, -1, 6)}' stroke='#2e2c27' stroke-width='0.9' fill='none' opacity='0.9'/>`,
    )
  }
  return `<g opacity='${opacity}'><path d='M${x},${y} L${x},${y - h}' stroke='#2e2c27' stroke-width='1.8' fill='none'/>${tiers.join('')}</g>`
}

const farLeft = [
  [-80, 660],
  [20, 640],
  [110, 568],
  [190, 592],
  [270, 540],
  [350, 590],
  [430, 566],
  [500, 620],
  [560, 640],
]
const farRight = [
  [1020, 650],
  [1090, 600],
  [1150, 548],
  [1210, 578],
  [1270, 500],
  [1330, 560],
  [1400, 520],
  [1470, 570],
  [1540, 545],
  [1620, 600],
]
const midLeft = [
  [-80, 780],
  [30, 770],
  [120, 726],
  [210, 750],
  [300, 700],
  [380, 748],
  [460, 730],
  [540, 770],
]
const midRight = [
  [1040, 790],
  [1120, 720],
  [1200, 686],
  [1280, 726],
  [1360, 668],
  [1440, 714],
  [1520, 690],
  [1620, 730],
]
const nearLeft = [
  [-80, 860],
  [60, 848],
  [160, 820],
  [260, 838],
  [360, 812],
  [460, 840],
  [540, 858],
]
const nearRight = [
  [1060, 866],
  [1140, 836],
  [1230, 820],
  [1320, 842],
  [1410, 808],
  [1500, 834],
  [1620, 850],
]

const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900' preserveAspectRatio='xMidYMid slice'>
  <defs>
    <filter id='rough' x='-10%' y='-10%' width='120%' height='120%'>
      <feTurbulence type='fractalNoise' baseFrequency='0.01 0.02' numOctaves='3' seed='23' result='t'/>
      <feDisplacementMap in='SourceGraphic' in2='t' scale='18' xChannelSelector='R' yChannelSelector='G'/>
    </filter>
    <filter id='far' x='-12%' y='-12%' width='124%' height='124%'><feGaussianBlur stdDeviation='8'/></filter>
    <filter id='mid' x='-12%' y='-12%' width='124%' height='124%'><feGaussianBlur stdDeviation='3.2'/></filter>
    <filter id='near' x='-12%' y='-12%' width='124%' height='124%'><feGaussianBlur stdDeviation='1.2'/></filter>
    <filter id='haze' x='-25%' y='-25%' width='150%' height='150%'><feGaussianBlur stdDeviation='24'/></filter>
    <linearGradient id='gFar' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='#5d5b52' stop-opacity='0.26'/>
      <stop offset='0.5' stop-color='#5d5b52' stop-opacity='0.09'/>
      <stop offset='1' stop-color='#5d5b52' stop-opacity='0'/>
    </linearGradient>
    <linearGradient id='gMid' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='#3d3b35' stop-opacity='0.42'/>
      <stop offset='0.45' stop-color='#3d3b35' stop-opacity='0.16'/>
      <stop offset='1' stop-color='#3d3b35' stop-opacity='0'/>
    </linearGradient>
    <linearGradient id='gNear' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='#2e2c27' stop-opacity='0.55'/>
      <stop offset='0.4' stop-color='#2e2c27' stop-opacity='0.2'/>
      <stop offset='1' stop-color='#2e2c27' stop-opacity='0'/>
    </linearGradient>
  </defs>

  <!-- 淡日 -->
  <circle cx='1196' cy='208' r='104' fill='#b08a4a' opacity='0.06'/>
  <circle cx='1196' cy='208' r='104' fill='none' stroke='#8a6a33' stroke-width='1.1' opacity='0.09'/>

  <!-- 归鸟 -->
  <g stroke='#3a3126' stroke-width='2.2' fill='none' stroke-linecap='round' opacity='0.18'>
    <path d='M972,262 C982,252 992,252 1002,261 M1002,261 C1012,252 1022,252 1032,260'/>
    <path d='M1032,226 C1040,218 1048,218 1056,225 M1056,225 C1064,218 1072,218 1080,224'/>
    <path d='M1098,286 C1104,280 1110,280 1116,285 M1116,285 C1122,280 1128,280 1134,284'/>
  </g>

  <!-- 远山 -->
  <g filter='url(#rough)' opacity='0.9'>
    <g filter='url(#far)'>
      <path fill='url(#gFar)' d='${massif(farLeft)}'/>
      <path fill='url(#gFar)' d='${massif(farRight)}'/>
    </g>
  </g>

  <!-- 中景 -->
  <g filter='url(#rough)' opacity='0.92'>
    <g filter='url(#mid)'>
      <path fill='url(#gMid)' d='${massif(midLeft)}'/>
      <path fill='url(#gMid)' d='${massif(midRight)}'/>
    </g>
  </g>
  ${strokes(midLeft, { count: 55, depth: 90, len: 16, opacity: 0.28 })}
  ${strokes(midRight, { count: 65, depth: 110, len: 18, opacity: 0.3 })}

  <!-- 山脚雾 -->
  <g filter='url(#haze)'>
    <ellipse cx='250' cy='790' rx='330' ry='42' fill='#f7f1e6' opacity='0.92'/>
    <ellipse cx='1240' cy='792' rx='360' ry='44' fill='#f7f1e6' opacity='0.92'/>
    <ellipse cx='760' cy='806' rx='380' ry='30' fill='#f7f1e6' opacity='0.8'/>
  </g>

  <!-- 近景 -->
  <g filter='url(#rough)' opacity='0.95'>
    <g filter='url(#near)'>
      <path fill='url(#gNear)' d='${massif(nearLeft)}'/>
      <path fill='url(#gNear)' d='${massif(nearRight)}'/>
    </g>
  </g>
  ${strokes(nearLeft, { count: 40, depth: 55, len: 13, opacity: 0.3 })}
  ${strokes(nearRight, { count: 40, depth: 55, len: 13, opacity: 0.3 })}

  <!-- 脊线：crisp 一条，压住模糊的填充 -->
  <g filter='url(#rough)' opacity='0.55'>
    <path d='${ridgePath(midLeft)}' fill='none' stroke='#2e2c27' stroke-width='1.2'/>
    <path d='${ridgePath(midRight)}' fill='none' stroke='#2e2c27' stroke-width='1.2'/>
    <path d='${ridgePath(nearLeft)}' fill='none' stroke='#2e2c27' stroke-width='1.7'/>
    <path d='${ridgePath(nearRight)}' fill='none' stroke='#2e2c27' stroke-width='1.7'/>
  </g>

  <!-- 松：只放两棵，做尺度参照 -->
  ${pine(392, 872, 58, 0.5)}
  ${pine(1462, 866, 52, 0.45)}

  <!-- 水面横纹 -->
  <g opacity='0.3' stroke='#6b6152' stroke-width='1' fill='none'>
    <path d='M60,884 C200,876 320,892 460,884'/>
    <path d='M560,898 C700,888 820,906 960,896'/>
    <path d='M1100,882 C1240,874 1360,890 1500,880'/>
  </g>
</svg>`

writeFileSync(new URL('../src/assets/bg-ink.svg', import.meta.url), svg)
console.log('svg bytes', Buffer.byteLength(svg))
