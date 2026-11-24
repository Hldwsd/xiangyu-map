import { loadGsap, prefersReducedMotion } from '@/utils/motion'

/** 悬浮卡片（预览卡容器、列表卡等）与背景层一起做轻微视差；地图与地标不参与。 */
const CARD_SELECTOR = '[data-parallax]'
const BACKDROP_SELECTOR = '.bg-ink'

function clampHalf(value: number): number {
  return Math.max(-0.5, Math.min(0.5, value))
}

export function startPeripheralParallax(): () => void {
  if (prefersReducedMotion()) return () => {}
  if (typeof window.matchMedia !== 'function') return () => {}
  if (!window.matchMedia('(pointer: fine)').matches) return () => {}

  let disposed = false
  let cleanup = (): void => {}

  void loadGsap()
    .then((gsap) => {
      if (disposed) return

      type Quick = (value: number) => void
      const cards = new Map<Element, { x: Quick; y: Quick }>()
      let backdropX: Quick | null = null
      let backdropY: Quick | null = null

      const register = (): void => {
        const backdrop = document.querySelector<HTMLElement>(BACKDROP_SELECTOR)
        if (backdrop !== null && backdropX === null) {
          backdropX = gsap.quickTo(backdrop, 'x', {
            duration: 0.6,
            ease: 'power2.out',
            force3D: true,
          })
          backdropY = gsap.quickTo(backdrop, 'y', {
            duration: 0.6,
            ease: 'power2.out',
            force3D: true,
          })
        }

        for (const el of document.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
          if (cards.has(el)) continue
          gsap.set(el, { z: 0.01 })
          cards.set(el, {
            x: gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power2.out', force3D: true }),
            y: gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power2.out', force3D: true }),
          })
        }
      }

      register()
      const observer = new MutationObserver(register)
      observer.observe(document.body, { childList: true, subtree: true })

      const apply = (nx: number, ny: number): void => {
        backdropX?.(nx * 34)
        backdropY?.(ny * 24)
        for (const quick of cards.values()) {
          quick.x(nx * -14)
          quick.y(ny * -10)
        }
      }

      const onMove = (event: PointerEvent): void => {
        apply(
          clampHalf(event.clientX / window.innerWidth - 0.5),
          clampHalf(event.clientY / window.innerHeight - 0.5),
        )
      }

      const reset = (): void => apply(0, 0)

      window.addEventListener('pointermove', onMove, { passive: true })
      document.addEventListener('pointerleave', reset)

      cleanup = (): void => {
        observer.disconnect()
        window.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerleave', reset)
        const targets: Element[] = [...cards.keys()]
        if (backdropX !== null) {
          const backdrop = document.querySelector(BACKDROP_SELECTOR)
          if (backdrop !== null) targets.push(backdrop)
        }
        if (targets.length > 0) gsap.killTweensOf(targets)
      }
    })
    .catch(() => {})

  return (): void => {
    disposed = true
    cleanup()
  }
}
