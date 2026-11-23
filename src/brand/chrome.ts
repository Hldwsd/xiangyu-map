/**
 * 页面外壳的小交互：顶部阅读进度、跟随光标的小环。
 *
 * 小环只是「陪衬」：系统指针照常显示，环慢半拍跟上去，靠近可点元素时放大。
 * 触摸设备上整块关掉，不做无效渲染。
 */
import { ScrollTrigger, gsap, prefersReducedMotion, qs } from './motion'

export function initChrome(): void {
  const bar = qs<HTMLElement>('[data-progress]')
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      gsap.set(bar, { scaleX: self.progress })
    },
  })

  if (prefersReducedMotion) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const cursor = qs<HTMLElement>('[data-cursor]').parentElement
  if (cursor === null) return

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power2.out' })
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power2.out' })
  let visible = false

  const onMove = (event: PointerEvent): void => {
    xTo(event.clientX)
    yTo(event.clientY)
    if (!visible) {
      visible = true
      gsap.to(cursor, { opacity: 1, duration: 0.3 })
    }
  }

  const interactiveSelector = 'a, button, .city__row, .craft__row, .map__dot, .map__city-dot'

  const toggleHover = (event: PointerEvent, on: boolean): void => {
    const target = event.target as Element | null
    const hit = target?.closest(interactiveSelector) ?? null
    cursor.classList.toggle('cursor--hover', on && hit !== null)
  }

  window.addEventListener('pointermove', onMove, { passive: true })
  document.addEventListener('pointerover', (event) => toggleHover(event, true), { passive: true })
  document.addEventListener('pointerout', (event) => toggleHover(event, false), { passive: true })
  document.addEventListener('pointerleave', () => {
    gsap.to(cursor, { opacity: 0, duration: 0.3 })
    visible = false
  })
}
