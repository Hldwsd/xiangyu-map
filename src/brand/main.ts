/**
 * 品牌页入口。
 *
 * 顺序很重要：先补好底纹、建好地图，再挂载各分节，最后才让载入层拉开——
 * 否则观众会看见「先露半张脸」再被纸盖住的过程。
 */
import './base.css'
import './sections.css'

import { assetUrl } from '@/utils/asset-url'

import { initBand } from './band'
import { initChrome } from './chrome'
import { initCities } from './cities'
import { initClosing } from './closing'
import { initCrafts } from './crafts'
import { initHeroScroll, playHeroIntro, prepareHero } from './hero'
import { runLoader } from './loader'
import { initManifesto } from './manifesto'
import {
  countUp,
  countUpOnScroll,
  prefersReducedMotion,
  qsa,
  revealOnScroll,
  ScrollTrigger,
} from './motion'
import { initSights } from './sights'
import { initSmoothScroll } from './smooth'

// 刷新一律从顶端开始读（history.scrollRestoration 在 index.html 里设成 manual），
// 这样重载后看到的是开场动画，而不是「半路被丢下」的页面。
// 书法底纹在 public/ 下，CSS 里没法套部署基地址，这里交给变量
document.documentElement.style.setProperty(
  '--bg-calligraphy',
  `url("${assetUrl('/images/bg-calligraphy.webp')}")`,
)

// 双保险：没有 section 锚点就从顶端开始（有 hash 时保留深链）
if (window.location.hash === '') window.scrollTo(0, 0)

const lenis = initSmoothScroll()
initChrome(lenis)

const hero = prepareHero()
initHeroScroll()
initManifesto()
initBand()
initSights()
initCities()
initCrafts()
initClosing()

revealOnScroll(qsa('[data-reveal]'))
countUpOnScroll(qsa('[data-count]').filter((element) => element.closest('.hero') === null))

/** 首屏那三个数字不跟着滚动触发，而是等标题入场后自己数上来 */
const heroCounts = qsa<HTMLElement>('.ledger [data-count]')

// 开发期把滚动实例与入场时间线挂到 window 上，方便在浏览器里
// 精确跳到某一节、或把动画拨到某一帧看排版（不影响生产构建）
const debugRef: Record<string, unknown> = { lenis, ScrollTrigger }
if (import.meta.env.DEV) {
  ;(window as Window & { __brand?: Record<string, unknown> }).__brand = debugRef
}

runLoader(() => {
  const timeline = playHeroIntro(hero)
  debugRef.intro = timeline

  if (prefersReducedMotion) return
  timeline.add(() => {
    heroCounts.forEach((element, index) => {
      countUp(element, { duration: 1.1, delay: index * 0.08 })
    })
  }, 1.3)
})

// 图片落位后重新量一次，避免 ScrollTrigger 按错误高度算 pin 的收尾点
window.addEventListener('load', () => ScrollTrigger.refresh())

let resizeTimer = 0
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 220)
})
