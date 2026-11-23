/**
 * 风物：左边是七类目录，右边是一只图片抽屉。
 *
 * 七行文字太干，所以每一类配代表作，叠成一摞相纸；
 * 悬停/聚焦哪一行，抽屉就换到那一类（淡出→换图→淡入 + 轻微倾斜）。
 * 点某一类里的任意一张照片，那张会被抽到最上面（FLIP，不换类）。
 * 窄屏没有抽屉空间，改为在每行里放一张小图。
 */
import { CATEGORY_GLYPHS } from '@/components/icons/category-paths'
import { assetUrl } from '@/utils/asset-url'

import { craftStats } from './data'
import { gsap, prefersReducedMotion, qs, qsa, ScrollTrigger } from './motion'

const pad = (value: number): string => String(value).padStart(2, '0')
const SLOTS = ['front', 'mid', 'back'] as const

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
      scrollTrigger: {
        trigger: list,
        start: 'top 85%',
        toggleActions: 'play none none reset',
      },
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
  const figures = photos.map((photo) => photo.parentElement)
  const kicker = qs<HTMLElement>('[data-craft-kicker]', drawer)
  const nameLabel = qs<HTMLElement>('[data-craft-name]', drawer)
  const desc = qs<HTMLElement>('[data-craft-desc]', drawer)
  const sitesLabel = qs<HTMLUListElement>('[data-craft-sites]', drawer)
  const countLabel = qs<HTMLElement>('[data-craft-count]', drawer)
  const rows = qsa<HTMLButtonElement>('.craft__row', list)

  let visibleCount = 3
  /** 照片的堆叠顺序：order[0] 在最上面。元素是 photos 的下标。 */
  let order = [0, 1, 2]

  const applySlots = (): void => {
    photos.forEach((photo, index) => {
      const figure = figures[index]
      if (figure === null || figure === undefined) return
      for (const slot of SLOTS) figure.classList.remove(`craft-drawer__photo--${slot}`)
      const slotIndex = order.indexOf(index)
      if (slotIndex < 0 || index >= visibleCount) return
      const slot = SLOTS[slotIndex]
      if (slot !== undefined) figure.classList.add(`craft-drawer__photo--${slot}`)
    })
  }

  const apply = (index: number): void => {
    const craft = craftStats[index]
    if (craft === undefined) return

    // 有几处就画几张：不要拿同一张图重复堆，演艺类只有一处就是一张。
    // 属性名不能用 data-count：那是全站数字滚动的选择器，会把照片摞的节点整个换成数字。
    visibleCount = craft.picks.length
    stack.dataset.photoCount = String(visibleCount)
    order = Array.from({ length: visibleCount }, (_, photoIndex) => photoIndex)

    photos.forEach((photo, photoIndex) => {
      const pick = craft.picks[photoIndex]
      const figure = figures[photoIndex]
      if (figure !== null && figure !== undefined) {
        figure.hidden = pick === undefined
        figure.setAttribute('aria-label', pick === undefined ? '' : `把${pick.name}放到最前`)
        gsap.set(figure, { clearProps: 'transform' })
      }
      if (pick !== undefined) photo.src = assetUrl(pick.cover)
    })
    applySlots()

    kicker.textContent = `${pad(index + 1)} / SEVEN`
    nameLabel.textContent = craft.name
    desc.textContent = craft.note
    sitesLabel.innerHTML = craft.picks.map((site) => `<li>${site.name}</li>`).join('')
    countLabel.textContent = String(craft.count)
  }

  /** 把某一张抽到最上面：先记旧位置，换完 slot 再从旧位置补间回来（FLIP） */
  const bringToFront = (index: number): void => {
    if (index >= visibleCount || order[0] === index) return

    const before = photos.map((photo) => photo.getBoundingClientRect())
    order = [index, ...order.filter((item) => item !== index)]
    applySlots()

    photos.forEach((photo, photoIndex) => {
      const figure = figures[photoIndex]
      const old = before[photoIndex]
      if (figure === null || figure === undefined || old === undefined) return
      if (photoIndex >= visibleCount) return

      const current = figure.getBoundingClientRect()
      if (current.width === 0 || current.height === 0) return

      gsap.fromTo(
        figure,
        {
          x: old.left - current.left,
          y: old.top - current.top,
          scaleX: old.width / current.width,
          scaleY: old.height / current.height,
        },
        {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.55,
          ease: 'power3.out',
          // 动画结束后交还给 CSS 的 rotate：否则下一次换类时旧的内联 transform 会压住新角度
          onComplete: () => {
            gsap.set(figure, { clearProps: 'transform' })
          },
        },
      )
    })
  }

  photos.forEach((photo, index) => {
    const figure = figures[index]
    if (figure === null || figure === undefined) return
    figure.setAttribute('role', 'button')
    figure.setAttribute('tabindex', '0')
    figure.addEventListener('click', () => bringToFront(index))
    figure.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      bringToFront(index)
    })
  })

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
