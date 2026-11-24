import { assetUrl } from '@/utils/asset-url'
import { loadGsap, prefersReducedMotion } from '@/utils/motion'

/** 地图 → 品牌页：点击处扩散墨色圆，动画结束再离开 SPA */
export function goToBrand(event: MouseEvent, href: string): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  if (prefersReducedMotion()) {
    window.location.assign(href)
    return
  }

  event.preventDefault()
  const x = ((event.clientX || window.innerWidth / 2) / window.innerWidth) * 100
  const y = ((event.clientY || window.innerHeight / 2) / window.innerHeight) * 100

  const overlay = document.createElement('div')
  overlay.className = 'brand-exit'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.innerHTML = `
    <div class="brand-exit__inner">
      <img class="brand-exit__seal" src="${assetUrl('/brand/logo-red.webp')}" alt="" width="192" height="214" />
      <p class="brand-exit__title">乡遇安徽</p>
      <span class="brand-exit__meta">品牌页 · 一纸山河</span>
    </div>
  `
  document.body.append(overlay)

  void loadGsap()
    .then((gsap) => {
      gsap.set(overlay, { clipPath: `circle(0% at ${x.toFixed(1)}% ${y.toFixed(1)}%)` })
      gsap
        .timeline({
          onComplete: () => {
            window.location.assign(href)
          },
        })
        .to(overlay, {
          clipPath: `circle(150% at ${x.toFixed(1)}% ${y.toFixed(1)}%)`,
          duration: 0.75,
          ease: 'power3.inOut',
        })
        .fromTo(
          '.brand-exit__inner',
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
          '-=0.45',
        )
        .to({}, { duration: 0.12 })
    })
    .catch(() => {
      overlay.remove()
      window.location.assign(href)
    })
}
