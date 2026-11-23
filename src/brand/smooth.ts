/**
 * 平滑滚动：让长页的滚动本身成为动效的一部分（惯性、减速）。
 *
 * 只做 CSS `scroll-behavior` 做不到 scrub 级的细腻；Lenis 接管滚轮后
 * 把每一帧交给 GSAP 的 ticker，ScrollTrigger 才不会和原生滚动打架。
 */
import Lenis from 'lenis'

import { ScrollTrigger, gsap, prefersReducedMotion } from './motion'

export function initSmoothScroll(): Lenis | null {
  if (prefersReducedMotion) return null

  const lenis = new Lenis({
    duration: 1.15,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
  })

  lenis.on('scroll', () => ScrollTrigger.update())

  const tick = (time: number): void => {
    lenis.raf(time * 1000)
  }
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  // 页内锚点交给 Lenis，带一点缓动；顶栏高度从视觉上补回来
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    anchor.addEventListener('click', (event) => {
      const id = anchor.getAttribute('href')?.slice(1)
      if (id === undefined || id === '') return
      const target = document.getElementById(id)
      if (target === null) return
      event.preventDefault()
      lenis.scrollTo(target, { offset: -72, duration: 1.5 })
    })
  }

  return lenis
}
