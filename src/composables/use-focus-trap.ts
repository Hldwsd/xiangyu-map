import { onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 把焦点锁在浮层里。
 *
 * 为什么需要：菜单、列表这类浮层打开后，Tab 会一路走到地图的语义列表甚至浮层背后的控件，
 * 键盘用户会「跑出对话框」。这里做三件事：
 * 1. 打开时把焦点移进浮层（第一个可聚焦元素，没有就落到容器本身）；
 * 2. Tab / Shift+Tab 在浮层首尾之间循环；
 * 3. 关闭时把焦点还给打开前的元素，避免焦点掉到 body。
 *
 * 不做完整的 inert（浏览器支持已不错，但会把地图上的「地标按钮列表」一起禁掉，
 * 那是键盘用户唯一的替代入口），所以只做焦点收束。
 */
export function useFocusTrap(open: Ref<boolean>, container: Ref<HTMLElement | null>): void {
  let previouslyFocused: HTMLElement | null = null

  function focusables(): HTMLElement[] {
    const root = container.value
    if (root === null) return []
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return
    const list = focusables()
    if (list.length === 0) {
      event.preventDefault()
      container.value?.focus()
      return
    }

    const first = list[0]
    const last = list[list.length - 1]
    if (first === undefined || last === undefined) return

    const active = document.activeElement
    if (event.shiftKey && (active === first || active === container.value)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(open, (isOpen) => {
    if (isOpen) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      // 等 DOM 渲染完再找可聚焦元素
      requestAnimationFrame(() => {
        const list = focusables()
        ;(list[0] ?? container.value)?.focus()
      })
      window.addEventListener('keydown', onKeydown)
      return
    }

    window.removeEventListener('keydown', onKeydown)
    previouslyFocused?.focus()
    previouslyFocused = null
  })

  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
