/**
 * 纸上所见：一条错落的图带，把「缘起」和「所见」之间的空白打散。
 *
 * 三重叠动：整列上下错位（宽屏）、图片在大框里反向平移、进入视口时从下往上揭开。
 * 窄屏改成两列网格：五张都完整看得见，不靠横向滑动藏内容。
 */
import { gsap, prefersReducedMotion, qs, qsa } from './motion'

export function initBand(): void {
  const strip = qs<HTMLElement>('[data-band]')
  const items = qsa<HTMLElement>('.band__item', strip)

  if (prefersReducedMotion) return

  items.forEach((item, index) => {
    const frame = qs<HTMLElement>('.band__frame', item)
    const image = qs<HTMLImageElement>('img', frame)

    gsap.fromTo(
      frame,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1.15,
        delay: (index % 3) * 0.08,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: item, start: 'top 94%', once: true },
      },
    )

    // 图片本身比画框高一截，滚动时反向走，视差才明显
    gsap.set(image, { scale: 1.34 })
    gsap.fromTo(
      image,
      { yPercent: -11 },
      {
        yPercent: 11,
        ease: 'none',
        scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )
  })

  // 整列错位只在宽屏做：窄屏是两列网格，上下位移会造成行与行互相压住
  const media = gsap.matchMedia()
  media.add('(min-width: 901px)', () => {
    items.forEach((item, index) => {
      const direction = index % 2 === 0 ? 1 : -1
      gsap.fromTo(
        item,
        { y: 30 * direction },
        {
          y: -34 * direction,
          ease: 'none',
          scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    })
  })
}
