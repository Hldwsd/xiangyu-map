/**
 * 十六城：一张可悬停的城市索引，指针停在城名上先看一眼该市的封面。
 *
 * 这里不写 16 行数据，全从 cityStats 生成；数字和城市名跟 app 完全同源。
 */
import { assetUrl } from '@/utils/asset-url'

import { cityStats } from './data'
import { gsap, prefersReducedMotion, qs, qsa } from './motion'

export function initCities(): void {
  const grid = qs<HTMLUListElement>('[data-cities]')

  grid.innerHTML = cityStats
    .map(
      (city, index) => `
        <li class="city">
          <div class="city__row" data-cover="${assetUrl(city.cover)}" data-preview="${city.preview}">
            <span class="city__index">${String(index + 1).padStart(2, '0')}</span>
            <span class="city__name">${city.short}</span>
            <span class="city__count">${city.count}<span> 处</span></span>
          </div>
        </li>`,
    )
    .join('')

  const marquee = qs<HTMLElement>('[data-marquee]')
  marquee.innerHTML += marquee.innerHTML

  if (!prefersReducedMotion) {
    gsap.to(marquee, { xPercent: -50, duration: 56, ease: 'none', repeat: -1 })

    gsap.from(qsa<HTMLElement>('.city', grid), {
      y: 24,
      opacity: 0,
      duration: 0.9,
      stagger: 0.035,
      ease: 'power3.out',
      scrollTrigger: { trigger: grid, start: 'top 85%', once: true },
    })
  }

  const preview = qs<HTMLElement>('[data-city-preview]')
  const image = qs<HTMLImageElement>('[data-city-image]', preview)
  const caption = qs<HTMLElement>('[data-city-caption]', preview)

  if (prefersReducedMotion) return
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const xTo = gsap.quickTo(preview, 'x', { duration: 0.7, ease: 'power3.out' })
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.7, ease: 'power3.out' })

  const move = (event: PointerEvent): void => {
    xTo(event.clientX + 26)
    yTo(event.clientY - 110)
  }

  grid.addEventListener('pointermove', move, { passive: true })

  grid.addEventListener('pointerover', (event) => {
    const row = (event.target as Element | null)?.closest<HTMLElement>('.city__row')
    if (row === null || row === undefined) return
    const cover = row.dataset.cover
    if (cover !== undefined) image.src = cover
    caption.textContent = row.dataset.preview ?? ''
    gsap.to(preview, { opacity: 1, duration: 0.28, ease: 'power2.out' })
  })

  grid.addEventListener('pointerout', (event) => {
    const row = (event.target as Element | null)?.closest<HTMLElement>('.city__row')
    if (row === null || row === undefined) return
    gsap.to(preview, { opacity: 0, duration: 0.22, ease: 'power2.out' })
  })
}
