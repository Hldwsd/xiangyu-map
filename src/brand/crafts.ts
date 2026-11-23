/**
 * 风物：七类各占一行，悬停时整行翻成墨底。
 *
 * 图标直接复用 app 的 S1 圆线形状（src/components/icons/category-paths.ts），
 * 品牌页不再画一套新的——两处不一致，看起来就像两个产品。
 */
import { CATEGORY_GLYPHS } from '@/components/icons/category-paths'

import { craftStats } from './data'
import { gsap, prefersReducedMotion, qs, qsa } from './motion'

export function initCrafts(): void {
  const list = qs<HTMLUListElement>('[data-crafts]')

  list.innerHTML = craftStats
    .map((craft, index) => {
      const glyph = CATEGORY_GLYPHS[craft.name].map((d) => `<path d="${d}"/>`).join('')
      return `
        <li class="craft">
          <div class="craft__row">
            <span class="craft__index">${String(index + 1).padStart(2, '0')}</span>
            <svg class="craft__glyph" viewBox="0 0 48 48" aria-hidden="true">${glyph}</svg>
            <span class="craft__name">${craft.name}</span>
            <span class="craft__desc">${craft.note}</span>
            <span class="craft__count">${craft.count}<span> 处</span></span>
          </div>
        </li>`
    })
    .join('')

  if (prefersReducedMotion) return

  gsap.from(qsa<HTMLElement>('.craft', list), {
    y: 20,
    opacity: 0,
    duration: 0.85,
    stagger: 0.06,
    ease: 'power3.out',
    scrollTrigger: { trigger: list, start: 'top 85%', once: true },
  })
}
