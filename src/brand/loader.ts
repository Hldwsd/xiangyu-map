/**
 * 开场：一枚红印先落下，然后一片纸从中间拉开，露出首屏。
 *
 * 载入层存在的意义不是「等资源」，而是给首屏地图的描边动画一个干净的起点：
 * 观众先看到印与字，再看到纸被拉开，最后才是地图一笔一笔画出来。
 */
import { gsap, prefersReducedMotion, qs, qsa } from './motion'

export function runLoader(onReveal: () => void, onDone?: () => void): void {
  const loader = qs<HTMLElement>('[data-loader]')
  const halves = qsa<HTMLElement>('.loader__half', loader)
  const chars = qsa<HTMLElement>('.loader__mark span', loader)
  const seal = qs<HTMLElement>('.loader__seal', loader)

  if (prefersReducedMotion) {
    loader.remove()
    onReveal()
    onDone?.()
    return
  }

  const timeline = gsap.timeline({
    onComplete: () => {
      loader.remove()
      onDone?.()
    },
  })

  timeline
    .fromTo(
      seal,
      { y: 14, opacity: 0, scale: 0.86 },
      { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' },
      0,
    )
    .fromTo(
      chars,
      { yPercent: 70, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.07, ease: 'power3.out' },
      0.18,
    )
    .to(seal, { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in' }, 1.02)
    .to(
      chars,
      { opacity: 0, yPercent: -28, duration: 0.45, stagger: 0.04, ease: 'power2.in' },
      1.02,
    )
    // 首屏提前开动：纸还没完全拉开时标题就该在往上走，
    // 否则中间会有一瞬「纸开了、页面还是空的」
    .add(onReveal, 1.1)
    .to(
      halves,
      {
        yPercent: (index: number) => (index === 0 ? -101 : 101),
        duration: 1.05,
        ease: 'expo.inOut',
      },
      1.3,
    )
}
