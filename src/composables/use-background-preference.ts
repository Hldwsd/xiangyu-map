import { ref, watch } from 'vue'

export type BackgroundMode = 'ink' | 'paper'

const STORAGE_KEY = 'xy-background-mode'

function readInitial(): BackgroundMode {
  const stored = localStorage.getItem(STORAGE_KEY)
  // 默认水墨动画；只有显式关掉才回到静态纸本
  return stored === 'paper' ? 'paper' : 'ink'
}

/**
 * 背景模式（全局一份）。
 *
 * `ink` = 动态水墨宏村（canvas 程序化渲染），`paper` = 静态纸本（书法背景图）。
 * 写 localStorage，刷新/下次进来沿用。
 */
const mode = ref<BackgroundMode>(readInitial())

watch(mode, (value) => {
  localStorage.setItem(STORAGE_KEY, value)
})

export function useBackgroundPreference() {
  return {
    mode,
    setMode(value: BackgroundMode): void {
      mode.value = value
    },
    toggle(): void {
      mode.value = mode.value === 'ink' ? 'paper' : 'ink'
    },
  }
}
