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
      scrollTrigger: {
        trigger: grid,
        start: 'top 85%',
        toggleActions: 'play none none reset',
      },
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

  const xTo = gsap.quickTo(preview, 'x', { duration: 0.22, ease: 'power3.out' })
  const yTo = gsap.quickTo(preview, 'y', { duration: 0.22, ease: 'power3.out' })

  let visible = false
  let currentRow: HTMLElement | null = null
  let lastPointerX = Number.NaN
  let lastPointerY = Number.NaN

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
    preload()
    if (currentRow !== row) fill(row)
    currentRow = row
    place(clientX, clientY)

    if (!visible) {
      visible = true
      // 预取过的封面是一次本地绘制：直接亮出来，不做淡入，悬停即出现
      gsap.set(preview, { opacity: 1 })
    }
  }

  const hide = (): void => {
    currentRow = null
    if (!visible) return
    visible = false
    gsap.to(preview, { opacity: 0, duration: 0.18, ease: 'power2.out' })
  }

  /**
   * 只在指针「真的动了」时开始显示。
   * 浏览器在滚动后会重新计算指针下的元素并补发 hover 事件，坐标却不变；
   * 用位移判断可以把这类合成事件过滤掉——滚动本身不再打断预览。
   */
  const onPointerMove = (event: PointerEvent): void => {
    const moved =
      Number.isNaN(lastPointerX) ||
      Math.abs(event.clientX - lastPointerX) > 2 ||
      Math.abs(event.clientY - lastPointerY) > 2
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    if (!moved) return

    const row = (event.target as Element | null)?.closest<HTMLElement>('.city__row')
    if (row !== null && row !== undefined) {
      show(row, event.clientX, event.clientY)
      return
    }
    if (visible) place(event.clientX, event.clientY)
  }

  grid.addEventListener('pointermove', onPointerMove)

  // 键盘：Tab 到某个城名也能看到封面，位置落在行的右侧
  grid.addEventListener('focusin', (event) => {
    const row = (event.target as Element | null)?.closest<HTMLElement>('.city__row')
    if (row === null || row === undefined) return
    const rect = row.getBoundingClientRect()
    show(row, rect.right - 12, rect.top)
  })
  grid.addEventListener('focusout', hide)

  /**
   * 滚动期间继续显示：指针没动，但目录在指针下滚过去了。
   * 用固定坐标重新找一遍指针下的行，跟着换封面；离开城市段再由观察器收起。
   */
  const syncToPointer = (): void => {
    if (!visible || Number.isNaN(lastPointerX)) return
    const target = document.elementFromPoint(lastPointerX, lastPointerY)
    const row = target?.closest<HTMLElement>('.city__row')
    if (row === null || row === undefined) return
    if (row !== currentRow) fill(row)
    currentRow = row
    place(lastPointerX, lastPointerY)
  }
  window.addEventListener('scroll', syncToPointer, { passive: true })

  // 指针真的移到城市段之外才收起（滚动时不动指针，预览继续显示）
  document.addEventListener(
    'pointermove',
    (event) => {
      if (!visible) return
      const target = event.target as Element | null
      if (target?.closest('.cities') === null || target?.closest('.cities') === undefined) hide()
    },
    { passive: true },
  )

  document.addEventListener('pointerleave', hide)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide()
  })

  // 整个城市段离开视口才收起，段内滚动不打断预览
  const observer = new IntersectionObserver((entries) => {
    if (entries.every((entry) => !entry.isIntersecting)) hide()
  })
  observer.observe(section)
}
