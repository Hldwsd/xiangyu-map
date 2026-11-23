/**
 * 界面动效的统一入口。
 *
 * 主应用只在「打开/关闭选中卡片、空状态、列表抽屉」这类交互上使用 GSAP；
 * 为了不把 gsap 塞进首屏预算，这里用**动态 import**：第一次真正需要动画时才加载，
 * 加载失败或用户开了「减少动态效果」都直接走 done()，界面行为不变。
 */

import type { gsap as GsapValue } from 'gsap'

type Gsap = typeof GsapValue

let pending: Promise<Gsap> | null = null

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 按需加载 gsap；同一个会话内只加载一次 */
export function loadGsap(): Promise<Gsap> {
  if (pending === null) {
    pending = import('gsap').then((module) => module.gsap)
  }
  return pending
}
