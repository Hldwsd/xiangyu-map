/**
 * 十六城：可悬停的城市索引 + 一张跟着指针走的「城封面」。
 *
 * 封面不是小缩略图：整张照片 + 墨色版权条，悬停时像从桌上抽出一张样片。
 * 离开目录、滚走、切到别的分节，封面必须收起来——不然它会一直飘在屏幕上。
 *
 * 行上的数字用 data-sites 而不是 data-count：全站的数字滚动逻辑认 data-count，
 * 会把整行的子节点当成计数目标替换掉（踩过一次，城名整行消失）。
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
          <div
            class="city__row"
            data-order="${String(index + 1).padStart(2, '0')}"
            data-cover="${assetUrl(city.cover)}"
            data-city="${city.short}"
            data-caption="${city.preview}"
            data-sites="${city.count}"
            tabindex="0"
          >
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

  initPreview(grid)
}

/** 悬停封面：只在精确指针设备上启用，并在离开/滚动时立刻收起 */
function initPreview(grid: HTMLUListElement): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const preview = qs<HTMLElement>('[data-city-preview]')
  const image = qs<HTMLImageElement>('[data-city-image]', preview)
  const indexLabel = qs<HTMLElement>('[data-city-index]', preview)
  const nameLabel = qs<HTMLElement>('[data-city-name]', preview)
  const caption = qs<HTMLElement>('[data-city-caption]', preview)
  const countLabel = qs<HTMLElement>('[data-city-count]', preview)

  const xTo = gsap.quickTo(preview, 'x', { duration: 0.35, ease: 'power3.out' })
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.35, ease: 'power3.out' })

  let visible = false
  let currentRow: HTMLElement | null = null
  /* 滚动后浏览器会重新计算 hover，可能补发 pointerover 把封面又弹出来：
     滚动的这段时间里先拒绝出现，停手后再接受 */
  let suppressedUntil = 0

  // 提前把 16 张城封面放进缓存：第一次悬停不用等图片下载，卡片才「跟手」
  let preloaded = false
  const preload = (): void => {
    if (preloaded) return
    preloaded = true
    for (const city of cityStats) {
      const image = new Image()
      image.src = assetUrl(city.cover)
    }
  }

  const section = grid.closest<HTMLElement>('.cities') ?? grid
  const preloadObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      preload()
      preloadObserver.disconnect()
    },
    { rootMargin: '900px 0px' },
  )
  preloadObserver.observe(section)

  /** 把封面限制在视口内：指针贴着屏幕边时，卡片不能有一半跑到屏幕外 */
  const place = (clientX: number, clientY: number): void => {
    const width = preview.offsetWidth || 248
    const height = preview.offsetHeight || 346
    const x = Math.min(Math.max(clientX + 24, 16), Math.max(16, window.innerWidth - width - 16))
    const y = Math.min(
      Math.max(clientY - height / 2, 84),
      Math.max(84, window.innerHeight - height - 16),
    )
    if (!visible) gsap.set(preview, { x, y })
    xTo(x)
    yTo(y)
  }

  const fill = (row: HTMLElement): void => {
    const cover = row.dataset.cover
    if (cover !== undefined) image.src = cover
    indexLabel.textContent = row.dataset.order ?? ''
    nameLabel.textContent = row.dataset.city ?? ''
    caption.textContent = row.dataset.caption ?? ''
    countLabel.textContent = `${row.dataset.sites ?? ''} 处`
    gsap.fromTo(image, { scale: 1.12 }, { scale: 1.02, duration: 1.1, ease: 'power3.out' })
  }

  const show = (row: HTMLElement, clientX: number, clientY: number): void => {
    if (performance.now() < suppressedUntil) return
    preload()
    if (currentRow !== row) fill(row)
    currentRow = row
    place(clientX, clientY)

    if (!visible) {
      visible = true
      gsap.to(preview, { opacity: 1, duration: 0.16, ease: 'power2.out' })
    }
  }

  const hide = (): void => {
    suppressedUntil = performance.now() + 260
    currentRow = null
    if (!visible) return
    visible = false
    gsap.to(preview, { opacity: 0, duration: 0.22, ease: 'power2.out' })
  }

  grid.addEventListener('pointerover', (event) => {
    const row = (event.target as Element | null)?.closest<HTMLElement>('.city__row')
    if (row === null || row === undefined) return
    show(row, event.clientX, event.clientY)
  })

  grid.addEventListener('pointermove', (event) => {
    if (!visible) return
    place(event.clientX, event.clientY)
  })

  grid.addEventListener('pointerleave', hide)

  // 键盘：Tab 到某个城名也能看到封面，位置落在行的右侧
  grid.addEventListener('focusin', (event) => {
    const row = (event.target as Element | null)?.closest<HTMLElement>('.city__row')
    if (row === null || row === undefined) return
    const rect = row.getBoundingClientRect()
    show(row, rect.right - 12, rect.top)
  })
  grid.addEventListener('focusout', hide)

  // 滚走就收起：这是上一版最容易出问题的地方——封面会跟着页面一直飘
  window.addEventListener('scroll', hide, { passive: true })
  document.addEventListener('pointerleave', hide)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide()
  })

  // 目录离开视口时也收起（滚动很快时 IntersectionObserver 更稳）
  const observer = new IntersectionObserver((entries) => {
    if (entries.every((entry) => !entry.isIntersecting)) hide()
  })
  observer.observe(grid)
}
