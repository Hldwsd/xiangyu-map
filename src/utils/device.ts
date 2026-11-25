/** 手机/平板判定：WebView 的 pointer/hover 媒体查询并不可靠，用 UA 兜底 */
export function isHandheldDevice(): boolean {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)').matches === true
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  return coarse || mobile
}

/** 给 <html> 打标记，CSS 不再依赖 pointer/hover 媒体查询 */
export function markHandheld(): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('is-handheld', isHandheldDevice())
}
