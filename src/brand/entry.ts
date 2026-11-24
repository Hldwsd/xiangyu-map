import { gsap } from './motion'

/**
 * 品牌页 → 地图的切入动画。
 *
 * 点击「进入地图」后不再直接跳转：先在点击位置打一圈纸色（clip-path circle），
 * 印章与「进入地图」字样在圈内浮上来，页面主体退后，再导航到地图首页。
 * prefers-reduced-motion 时直接跳转。
 */

const reducedMotion =
  typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

function sealSrc(): string {
  const seal = document.querySelector<HTMLImageElement>('.hero__seal')
  if (seal?.src) return seal.src
  return new URL('logo-red.webp', window.location.href).href
}

function createOverlay(): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = 'map-entry'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.innerHTML = `
    <div class="map-entry__inner">
      <img class="map-entry__seal" src="${sealSrc()}" alt="" width="192" height="214" />
      <p class="map-entry__title">进入地图</p>
      <span class="map-entry__meta">一纸山河 · 十六座城 · 70 个项目</span>
    </div>
  `
  document.body.append(overlay)
  return overlay
}

function runEntry(link: HTMLAnchorElement, event: MouseEvent): void {
  const overlay = createOverlay()
  const x = ((event.clientX || window.innerWidth / 2) / window.innerWidth) * 100
  const y = ((event.clientY || window.innerHeight / 2) / window.innerHeight) * 100

  gsap.set(overlay, { clipPath: `circle(0% at ${x.toFixed(1)}% ${y.toFixed(1)}%)` })
  gsap.to(['.topbar', 'main', '.footer'], {
    opacity: 0.35,
    y: -10,
    duration: 0.45,
    ease: 'power1.in',
  })

  gsap
    .timeline({
      onComplete: () => {
        window.location.assign(link.href)
      },
    })
    .to(overlay, {
      clipPath: `circle(150% at ${x.toFixed(1)}% ${y.toFixed(1)}%)`,
      duration: 0.8,
      ease: 'power3.inOut',
    })
    .fromTo(
      '.map-entry__inner',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
      '-=0.4',
    )
    .to({}, { duration: 0.15 })
}

function isPlainClick(event: MouseEvent): boolean {
  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function initMapEntry(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-map-entry]')]
  if (links.length === 0) return

  let leaving = false
  for (const link of links) {
    link.addEventListener('click', (event) => {
      if (!isPlainClick(event)) return
      if (leaving) {
        event.preventDefault()
        return
      }
      if (reducedMotion) return

      leaving = true
      event.preventDefault()
      runEntry(link, event)
    })
  }
}
