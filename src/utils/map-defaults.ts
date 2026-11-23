const NARROW_MAP_WIDTH = 520

/**
 * 窄屏默认合并重叠地标。
 *
 * 360–430dp 的屏幕上，同一片区域的地标球即使软碰撞也还是挤在一起，点击命中率低。
 * 没有用户偏好时在窄屏默认打开「合并重叠标签」；用户手动关掉（存了 '0'）就尊重选择。
 * 桌面默认仍是不合并，保留每个项目单独点击。
 */
export function shouldMergeMarkers(
  storedPreference: string | null,
  viewportWidth: number,
): boolean {
  if (storedPreference === '1') return true
  if (storedPreference === '0') return false
  return viewportWidth > 0 && viewportWidth < NARROW_MAP_WIDTH
}
