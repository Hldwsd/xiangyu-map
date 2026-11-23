/**
 * 风物：左边是七类目录，右边是一只图片抽屉。
 *
 * 七行文字太干，所以每一类配三张代表作，叠成一摞照片；
 * 悬停/聚焦哪一行，抽屉就换到那一类（淡出→换图→淡入 + 轻微倾斜）。
 * 窄屏没有抽屉空间，改为在每行里放一张小图。
 */
import { CATEGORY_GLYPHS } from '@/components/icons/category-paths'
import { assetUrl } from '@/utils/asset-url'

import { craftStats } from './data'
import { gsap, prefersReducedMotion, qs, qsa, ScrollTrigger } from './motion'

const pad = (value: number): string => String(value).padStart(2, '0')

export function initCrafts(): void {
  const list = qs<HTMLUListElement>('[data-crafts]')

  list.innerHTML = craftStats
    .map((craft, index) => {
      const glyph = CATEGORY_GLYPHS[craft.name].map((d) => `<path d="${d}"/>`).join('')
      const cover = craft.picks[0]?.cover ?? '/images/placeholder.svg'
      return `
        <li class="craft">
          <button
            type="button"
            class="craft__row"
            data-craft="${index}"
            aria-pressed="${index === 0}"
          >
            <span class="craft__index">${pad(index + 1)}</span>
            <svg class="craft__glyph" viewBox="0 0 48 48" aria-hidden="true">${glyph}</svg>
            <span class="craft__name">${craft.name}</span>
            <img class="craft__thumb" src="${assetUrl(cover)}" alt="" loading="lazy" />
            <span class="craft__desc">${craft.note}</span>
            <span class="craft__count">${craft.count}<span> 处</span></span>
          </button>
        </li>`
    })
    .join('')

  if (!prefersReducedMotion) {
    gsap.from(qsa<HTMLElement>('.craft', list), {
      y: 20,
      opacity: 0,
      duration: 0.85,
      stagger: 0.06,
      ease: 'power3.out',
      scrollTrigger: { trigger: list, start: 'top 85%', once: true },
    })
  }

  initDrawer(list)
}

function initDrawer(list: HTMLUListElement): void {
  const drawer = qs<HTMLElement>('[data-craft-drawer]')
  const stack = qs<HTMLElement>('[data-craft-stack]', drawer)
  const meta = qs<HTMLElement>('.craft-drawer__meta', drawer)
  const photos = qsa<HTMLImageElement>('[data-craft-photo]', drawer).sort(
    (a, b) => Number(a.dataset.craftPhoto ?? 0) - Number(b.dataset.craftPhoto ?? 0),
  )
  const kicker = qs<HTMLElement>('[data-craft-kicker]', drawer)
  const nameLabel = qs<HTMLElement>('[data-craft-name]', drawer)
  const desc = qs<HTMLElement>('[data-craft-desc]', drawer)
  const sitesLabel = qs<HTMLUListElement>('[data-craft-sites]', drawer)
  const countLabel = qs<HTMLElement>('[data-craft-count]', drawer)
  const rows = qsa<HTMLButtonElement>('.craft__row', list)

  const placeholder = assetUrl('/images/placeholder.svg')

  const apply = (index: number): void => {
    const craft = craftStats[index]
    if (craft === undefined) return
    const covers = craft.picks.map((site) => assetUrl(site.cover))
    photos.forEach((photo, photoIndex) => {
      photo.src = covers[photoIndex] ?? covers[0] ?? placeholder
    })
    kicker.textContent = `${pad(index + 1)} / SEVEN`
    nameLabel.textContent = craft.name
    desc.textContent = craft.note
    sitesLabel.innerHTML = craft.picks.map((site) => `<li>${site.name}</li>`).join('')
    countLabel.textContent = String(craft.count)
  }

  let activeIndex = 0
  let switchTimeline: gsap.core.Timeline | null = null

  const activate = (index: number, animate: boolean): void => {
    if (index === activeIndex && animate) return
    activeIndex = index
    rows.forEach((row, rowIndex) => {
      row.setAttribute('aria-pressed', String(rowIndex === index))
    })

    if (!animate || prefersReducedMotion) {
      apply(index)
      return
    }

    switchTimeline?.kill()
    switchTimeline = gsap
      .timeline()
      .to(stack, { y: 12, opacity: 0, duration: 0.24, ease: 'power2.in' })
      .to(meta, { y: 8, opacity: 0, duration: 0.2, ease: 'power2.in' }, 0)
      .add(() => apply(index))
      .to(stack, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' })
      .to(meta, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, '<0.06')
  }

  apply(0)

  rows.forEach((row, index) => {
    row.addEventListener('pointerenter', () => activate(index, true))
    row.addEventListener('focus', () => activate(index, true))
    row.addEventListener('click', () => activate(index, true))
  })

  if (prefersReducedMotion) return

  // 悬停能力 + 宽屏才有抽屉：进视口后再预热 21 张封面，避免换类时闪白
  const media = gsap.matchMedia()
  media.add('(hover: hover) and (pointer: fine) and (min-width: 901px)', () => {
    gsap.set(stack, { transformPerspective: 900 })

    ScrollTrigger.create({
      trigger: '.crafts',
      start: 'top 85%',
      once: true,
      onEnter: () => {
        for (const craft of craftStats) {
          for (const site of craft.picks) {
            const image = new Image()
            image.src = assetUrl(site.cover)
          }
        }
      },
    })

    const rotateX = gsap.quickTo(stack, 'rotationX', { duration: 0.9, ease: 'power3.out' })
    const rotateY = gsap.quickTo(stack, 'rotationY', { duration: 0.9, ease: 'power3.out' })
    const section = qs<HTMLElement>('.crafts')

    const onMove = (event: PointerEvent): void => {
      const rect = stack.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5
      rotateX(py * -9)
      rotateY(px * 11)
    }

    const onLeave = (): void => {
      rotateX(0)
      rotateY(0)
    }

    section.addEventListener('pointermove', onMove, { passive: true })
    section.addEventListener('pointerleave', onLeave)

    return () => {
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
    }
  })
}
