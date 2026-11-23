/**
 * 尾声：标题分行入场、落款印章「盖」下去、CTA 带一点磁吸。
 *
 * 磁吸只在精确指针设备上做，且位移很小（约 12px）：
 * 位移一大会让人点不准，那就是为了炫技牺牲可用性。
 */
import { gsap, prefersReducedMotion, qs, qsa } from './motion'

export function initClosing(): void {
  if (prefersReducedMotion) return

  const titleLines = qsa<HTMLElement>('.closing__title .mask > span')
  gsap.from(titleLines, {
    yPercent: 115,
    duration: 1.3,
    stagger: 0.12,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.closing__title', start: 'top 86%', once: true },
  })

  gsap.from('.seal', {
    scale: 1.7,
    opacity: 0,
    rotate: -16,
    duration: 0.9,
    ease: 'power4.out',
    scrollTrigger: { trigger: '.closing', start: 'top 55%', once: true },
  })

  const cta = qs<HTMLElement>('[data-magnetic]')
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const xTo = gsap.quickTo(cta, 'x', { duration: 0.5, ease: 'power3.out' })
  const yTo = gsap.quickTo(cta, 'y', { duration: 0.5, ease: 'power3.out' })

  cta.addEventListener('pointermove', (event) => {
    const rect = cta.getBoundingClientRect()
    xTo((event.clientX - rect.left - rect.width / 2) * 0.22)
    yTo((event.clientY - rect.top - rect.height / 2) * 0.3)
  })

  cta.addEventListener('pointerleave', () => {
    xTo(0)
    yTo(0)
  })
}
