/**
 * 页面外壳：自绘滚动条 + 跟随光标的小环。
 *
 * 滚动条不用原生那条灰杠：这里是一条金线 + 可拖拽的墨点，
 * 深色分节上也看得见；原生滚动条在 base.css 里已经隐藏。
 */
import type Lenis from 'lenis'

import { gsap, prefersReducedMotion, qs, ScrollTrigger } from './motion'

export function initChrome(lenis: Lenis | null): void {
  initScrollbar(lenis)
  initCursor()
}

function initScrollbar(lenis: Lenis | null): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const track = qs<HTMLElement>('[data-scroll-track]')
  const thumb = qs<HTMLElement>('[data-scroll-thumb]')
  const label = qs<HTMLElement>('[data-scroll-label]')

  const measure = (): { max: number; thumbHeight: number; progress: number } => {
    const documentHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight)
    const max = Math.max(1, documentHeight - window.innerHeight)
    const trackHeight = track.clientHeight
    const ratio = window.innerHeight / documentHeight
    const thumbHeight = Math.min(trackHeight, Math.max(44, trackHeight * ratio))
    const progress = Math.min(1, Math.max(0, window.scrollY / max))
    return { max, thumbHeight, progress }
  }

  const render = (): void => {
    const { thumbHeight, progress } = measure()
    const travel = Math.max(0, track.clientHeight - thumbHeight)
    thumb.style.height = `${Math.round(thumbHeight)}px`
    thumb.style.transform = `translateY(${Math.round(progress * travel)}px)`
    label.textContent = String(Math.round(progress * 100)).padStart(2, '0')
  }

  const scrollToPointer = (clientY: number, grab: number): void => {
    const rect = track.getBoundingClientRect()
    const { max, thumbHeight } = measure()
    const usable = Math.max(1, rect.height - thumbHeight)
    const offset = Math.min(Math.max(clientY - rect.top - grab, 0), usable)
    const target = Math.round((offset / usable) * max)
    if (lenis !== null) lenis.scrollTo(target, { immediate: true, force: true })
    else window.scrollTo(0, target)
  }

  let dragging = false
  let grabOffset = 0

  const endDrag = (): void => {
    dragging = false
    thumb.classList.remove('scrollbar__thumb--active')
    document.body.style.userSelect = ''
  }

  thumb.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    dragging = true
    grabOffset = event.clientY - thumb.getBoundingClientRect().top
    thumb.setPointerCapture(event.pointerId)
    thumb.classList.add('scrollbar__thumb--active')
    document.body.style.userSelect = 'none'
  })

  thumb.addEventListener('pointermove', (event) => {
    if (dragging) scrollToPointer(event.clientY, grabOffset)
  })

  thumb.addEventListener('pointerup', endDrag)
  thumb.addEventListener('pointercancel', endDrag)

  track.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    const { thumbHeight } = measure()
    scrollToPointer(event.clientY, thumbHeight / 2)
  })

  window.addEventListener('scroll', render, { passive: true })
  window.addEventListener('resize', render)
  ScrollTrigger.addEventListener('refresh', render)
  render()
}

function initCursor(): void {
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

  const interactiveSelector =
    'a, button, .city__row, .craft__row, .map__dot, .map__city-dot, .scrollbar__thumb'

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
