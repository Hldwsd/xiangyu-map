/**
 * 点击盖章：在指针落点压一枚朱砂 logo，落印后淡出。
 * 只做视觉，不拦截事件；减弱动效时完全跳过。
 */
import { assetUrl } from '@/utils/asset-url'

import { gsap, prefersReducedMotion } from './motion'

export function initStamp(): void {
  if (prefersReducedMotion) return

  const source = assetUrl('/brand/logo-red.webp')

  const stamp = (event: PointerEvent): void => {
    if (event.button !== 0) return
    if (event.pointerType === 'mouse' && event.buttons !== 1) return

    const target = event.target as Element | null
    if (target?.closest('.scrollbar, .cursor')) return

    const image = document.createElement('img')
    image.className = 'stamp'
    image.src = source
    image.alt = ''
    image.draggable = false
    image.style.left = `${event.clientX}px`
    image.style.top = `${event.clientY}px`
    document.body.appendChild(image)

    gsap
      .timeline({ onComplete: () => image.remove() })
      .fromTo(
        image,
        { scale: 2.3, opacity: 0.25, rotate: -20 },
        { scale: 1, opacity: 1, rotate: -5, duration: 0.2, ease: 'power4.in' },
      )
      .to(image, { scale: 1.04, duration: 0.14, ease: 'power2.out' })
      .to(image, { opacity: 0, duration: 0.42, ease: 'power2.out' }, '+=0.16')
  }

  window.addEventListener('pointerdown', stamp, { passive: true })
}
