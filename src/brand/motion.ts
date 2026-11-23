/**
 * 品牌页共用的动效底层。
 *
 * 所有分节共用同一份 gsap / ScrollTrigger 实例与「减弱动效」判断，
 * 免得各模块各注册一次插件、或在同一个页面上出现两套缓动。
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

export const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 找不到元素就直接报错：品牌页的动效强依赖这些节点，静默跳过只会让页面半死不活 */
export function qs<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector)
  if (element === null) throw new Error(`品牌页缺少元素：${selector}`)
  return element
}

export function qsa<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector))
}

/**
 * 把一段中文拆成单字 span，用来做逐字显现。
 *
 * 容器保留整句的 aria-label、单字标 aria-hidden：
 * 屏幕阅读器读整句，不读「乡、遇、安、徽」。
 */
const TRAILING_PUNCTUATION = new Set([
  '，',
  '。',
  '、',
  '；',
  '：',
  '！',
  '？',
  '」',
  '』',
  '）',
  '…',
])
export function splitChars(element: HTMLElement): HTMLElement[] {
  const text = element.textContent ?? ''
  const label = text.replace(/\s+/g, ' ').trim()
  const chars: HTMLElement[] = []
  const fragment = document.createDocumentFragment()

  for (const char of Array.from(text)) {
    if (char === '\n') {
      fragment.appendChild(document.createElement('br'))
      continue
    }
    if (char === ' ' || char === '\u3000') continue

    // 标点粘在前一个字上：单字是 inline-block（拆开才能单独做透明度），
    // 浏览器就不会再把「，。」留到下一行行首，断行观感才像正常中文。
    const previous = chars[chars.length - 1]
    if (previous !== undefined && TRAILING_PUNCTUATION.has(char)) {
      previous.textContent = `${previous.textContent ?? ''}${char}`
      continue
    }

    const span = document.createElement('span')
    span.className = 'split-char'
    span.textContent = char
    span.setAttribute('aria-hidden', 'true')
    fragment.appendChild(span)
    chars.push(span)
  }

  element.replaceChildren(fragment)
  element.setAttribute('aria-label', label)
  return chars
}

/** 元素进入视口时上浮显形；一次性的，不跟着滚动来回抖 */
export function revealOnScroll(
  elements: Element[],
  options: { y?: number; stagger?: number } = {},
): void {
  if (prefersReducedMotion) return
  const groups = new Map<Element, Element[]>()
  for (const element of elements) {
    const parent = element.parentElement ?? element
    const group = groups.get(parent) ?? []
    group.push(element)
    groups.set(parent, group)
  }
  for (const group of groups.values()) {
    gsap.from(group, {
      y: options.y ?? 26,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: options.stagger ?? 0.08,
      scrollTrigger: { trigger: group[0] ?? group, start: 'top 88%', once: true },
    })
  }
}

/** 数字从 0 数到 data-count */
export function countUp(
  element: Element,
  options: { duration?: number; delay?: number } = {},
): void {
  const target = Number((element as HTMLElement).dataset.count ?? '0')
  if (!Number.isFinite(target)) return
  if (prefersReducedMotion) {
    element.textContent = String(target)
    return
  }
  const state = { value: 0 }
  gsap.to(state, {
    value: target,
    duration: options.duration ?? 1.4,
    delay: options.delay ?? 0,
    ease: 'power2.out',
    onUpdate: () => {
      element.textContent = String(Math.round(state.value))
    },
  })
}

/** 进入视口时数一次；首屏那几个由 hero 的入场时间线自己接管 */
export function countUpOnScroll(elements: Element[]): void {
  for (const element of elements) {
    const target = Number((element as HTMLElement).dataset.count ?? '0')
    if (!Number.isFinite(target)) continue
    if (prefersReducedMotion) {
      element.textContent = String(target)
      continue
    }
    ScrollTrigger.create({
      trigger: element,
      start: 'top 92%',
      once: true,
      onEnter: () => countUp(element),
    })
  }
}
