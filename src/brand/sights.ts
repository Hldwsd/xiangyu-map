/**
 * 所见：钉住视口，把六处项目横向推过去。
 *
 * 横滚只在 ≥901px 且未要求减弱动效时启用；窄屏直接退回竖向卡片，
 * 不在手机上强行做 pin——那是最容易把人卡住的做法。
 */
import type { Site } from '@/types/site'
import { assetUrl } from '@/utils/asset-url'

import { featuredSites } from './data'
import { gsap, prefersReducedMotion, qs, qsa } from './motion'

const ARROW = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`

function createPanel(site: Site, index: number): HTMLElement {
  const article = document.createElement('article')
  article.className = 'panel'

  const link = document.createElement('a')
  link.className = 'panel__link'
  link.href = assetUrl(`/site/${site.id}`)
  link.setAttribute('aria-label', `${site.name}，查看项目详情`)

  const figure = document.createElement('figure')
  figure.className = 'panel__figure'

  const media = document.createElement('div')
  media.className = 'panel__media'

  const image = document.createElement('img')
  image.className = 'panel__image'
  image.src = assetUrl(site.cover)
  image.alt = `${site.name}的封面`
  image.loading = 'lazy'
  image.decoding = 'async'
  image.width = 1200
  image.height = 750

  media.appendChild(image)

  const num = document.createElement('span')
  num.className = 'panel__num'
  num.textContent = String(index + 1).padStart(2, '0')

  const category = document.createElement('span')
  category.className = 'panel__cat'
  category.textContent = site.category

  figure.append(media, category)

  const meta = document.createElement('div')
  meta.className = 'panel__meta'

  const name = document.createElement('h3')
  name.className = 'panel__name'
  name.textContent = site.name

  const summary = document.createElement('p')
  summary.className = 'panel__summary'
  summary.textContent = site.summary

  const more = document.createElement('span')
  more.className = 'panel__more'
  more.innerHTML = `看详情 ${ARROW}`

  meta.append(num, name, summary, more)
  link.append(figure, meta)
  article.appendChild(link)

  return article
}

export function initSights(): void {
  const track = qs<HTMLElement>('[data-track]')
  const panels = featuredSites.map(createPanel)
  track.replaceChildren(...panels)

  const bar = qs<HTMLElement>('[data-gallery-progress]')
  const indexLabel = qs<HTMLElement>('[data-gallery-index]')
  const total = featuredSites.length

  const setProgress = (progress: number): void => {
    gsap.set(bar, { scaleX: Math.max(progress, 0.015) })
    const index = Math.min(total, Math.max(1, Math.round(progress * (total - 1)) + 1))
    indexLabel.textContent = String(index).padStart(2, '0')
  }
  setProgress(0)

  if (prefersReducedMotion) return

  const media = gsap.matchMedia()
  media.add('(min-width: 901px)', () => {
    const panels = qsa<HTMLElement>('.panel', track)
    const distance = (): number => Math.max(0, track.scrollWidth - window.innerWidth)

    /** 每块画板的左缘落在起点时的进度；末尾补 1，让最后一屏也吸附得住 */
    const snapPoints = (): number[] => {
      const max = distance()
      if (max <= 0) return [0]
      const padLeft = Number.parseFloat(getComputedStyle(track).paddingLeft) || 0
      const points = panels
        .map((panel) => (panel.offsetLeft - padLeft) / max)
        .filter((point) => point > 0.03 && point < 0.93)
      return [0, ...points, 1]
    }

    const snapTo = (value: number): number => {
      const points = snapPoints()
      return points.reduce(
        (closest, point) => (Math.abs(point - value) < Math.abs(closest - value) ? point : closest),
        points[0] ?? 0,
      )
    }

    const scrollTween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.sights__viewport',
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        // 跟得紧一点：进 pin 时横向立刻接上竖向下滑的力，不会先愣一下
        scrub: 0.4,
        invalidateOnRefresh: true,
        // 吸附：一次手势停在某块画板上，不会在最后一段「咔」一下突然到底
        snap: {
          snapTo,
          duration: { min: 0.2, max: 0.6 },
          delay: 0.2,
          ease: 'power1.inOut',
        },
        onUpdate: (self) => setProgress(self.progress),
      },
    })

    // 图片在自己的画框里反向小幅位移，横移才有纵深
    for (const figure of qsa<HTMLElement>('.panel__figure', track)) {
      const inner = qs<HTMLElement>('.panel__media', figure)
      gsap.fromTo(
        inner,
        { xPercent: -4 },
        {
          xPercent: 4,
          ease: 'none',
          scrollTrigger: {
            trigger: figure,
            containerAnimation: scrollTween,
            start: 'left right',
            end: 'right left',
            scrub: true,
          },
        },
      )
    }
  })
}
