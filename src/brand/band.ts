/**
 * 纸上所见：一条错落的图带，把「缘起」和「所见」之间的空白打散。
 *
 * 每张图从下往上揭开（clip-path），并在滚动时轻微上下错位；
 * 窄屏改成横向 snap 滚动，不做 pin，也不强制并排缩小。
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

    gsap.fromTo(
      image,
      { yPercent: -7 },
      {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )
  })
}
