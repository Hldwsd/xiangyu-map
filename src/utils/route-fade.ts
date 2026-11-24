import { loadGsap, prefersReducedMotion } from './motion'

/** 路由切换前的一层墨色淡入，用来做地图 ⇄ 详情页的转场。 */
export function runInkFade(done: () => void): void {
  if (prefersReducedMotion()) {
    done()
    return
  }

  const overlay = document.createElement('div')
  overlay.className = 'route-fade'
  overlay.setAttribute('aria-hidden', 'true')
  document.body.append(overlay)

  void loadGsap()
    .then((gsap) => {
      gsap.fromTo(
        overlay,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.32,
          ease: 'power2.in',
          onComplete: done,
        },
      )
    })
    .catch(() => {
      overlay.remove()
      done()
    })
}
