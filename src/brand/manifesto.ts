/**
 * 缘起：整段文字随滚动逐字「显墨」。
 *
 * 用滚动进度驱动透明度，而不是播一次动画：读者停在哪一句，
 * 哪一句就刚好显到那里——文字像从纸里慢慢浮出来。
 */
import { gsap, prefersReducedMotion, qs, qsa, splitChars } from './motion'

export function initManifesto(): void {
  const statement = qs<HTMLElement>('[data-scrub-text]')

  // 分行是设计的一部分：按 .manifesto__line 逐行拆字，断句由 HTML 决定，
  // 不交给 text-wrap 的自动折行（那样会把「怎么走」拆到两行）。
  const chars: HTMLElement[] = []
  for (const line of qsa<HTMLElement>('.manifesto__line', statement)) {
    chars.push(...splitChars(line))
  }

  // 去掉行与行之间的空白文本节点：窄屏把两行改回 inline 时不会多出一个空格
  for (const node of Array.from(statement.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() === '') node.remove()
  }

  if (prefersReducedMotion) return

  gsap.set(chars, { opacity: 0.12 })
  gsap.to(chars, {
    opacity: 1,
    ease: 'none',
    stagger: 0.45,
    scrollTrigger: {
      trigger: statement,
      start: 'top 82%',
      end: 'bottom 58%',
      scrub: 0.7,
    },
  })
}
