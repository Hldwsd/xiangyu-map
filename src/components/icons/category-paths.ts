import type { SiteCategory } from '@/types/site'

/**
 * 六类地标的线性图标：24×24、描边、不填充。
 *
 * 为什么从「实心黑块」改成「白底圆钉 + 黑线图标」：
 * 实心剪影在整张浅底地图上是一堆黑点，远看像脏东西；圆钉有白色底、墨色细圈和内部线条，
 * 既保留黑白语言，又在浅灰底图上分得出层次。选中态反转成墨底白线，仍然是同一套语言。
 */
export const CATEGORY_GLYPHS: Record<SiteCategory, string[]> = {
  // 古镇：坡屋顶 + 墙体 + 门
  古镇: ['M4 12 12 5 20 12', 'M6 11.5V20h12v-8.5', 'M10 20v-4.5h4V20'],
  // 非遗：印章（方形印面 + 印钮）
  非遗: ['M7 10h10v10H7Z', 'M10 10V6h4v4', 'M10.5 15h3'],
  // 红色：旗杆 + 旗面
  红色: ['M7 4v16', 'M7 5h10l-2.6 3.6L17 12H7'],
  // 自然：双峰山
  自然: ['M3 19 9 8l3.6 6L15.2 9 21 19Z'],
  // 演艺：音符（符头 + 符干 + 符尾）
  演艺: [
    'M10 17.5a2.4 2.4 0 1 0-2.4-2.4',
    'M10 17.5V6',
    'M10 6l8-2v9',
    'M18 13a2.4 2.4 0 1 0-2.4-2.4',
  ],
  // 乡村：树冠 + 树干
  乡村: ['M12 21v-6', 'M12 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z'],
}

/** 圆钉直径与内圈半径（48 单位画布） */
const SIZE = 48
const RING_RADIUS = 21

const INK = '#111111'
const PAPER = '#ffffff'

function glyphMarkup(category: SiteCategory, stroke: string): string {
  // 图标占圆钉直径的 ~63%：再小认不出是屋檐还是山峰，再大会顶到细圈
  const scale = 0.86
  const offset = (SIZE - 24 * scale) / 2
  const paths = CATEGORY_GLYPHS[category].map((path) => `<path d="${path}"/>`).join('')
  return (
    `<g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="${stroke}"` +
    ` stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`
  )
}

/**
 * 生成 ECharts 可用的图片符号：`image://data:image/svg+xml,...`
 *
 * 用图片而不是 `path://`：`path://` 只能填充一个轮廓，画不出「白底 + 细圈 + 内部线条」这三层；
 * 图片还能保留命中面积——图片符号的命中区就是整个方框，比只覆盖填充像素更稳。
 */
export function categoryMarkerSymbol(category: SiteCategory, selected = false): string {
  const body = selected
    ? `<circle cx="24" cy="24" r="${RING_RADIUS}" fill="${INK}"/>`
    : `<circle cx="24" cy="24" r="${RING_RADIUS}" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>`
  const glyph = glyphMarkup(category, selected ? PAPER : INK)
  // 极轻的投影：白钉压在白色省份上时，只靠 2px 细圈会「粘」在底图上
  const shadow =
    '<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%">' +
    '<feDropShadow dx="0" dy="1" stdDeviation="1.3" flood-color="#111111" flood-opacity="0.22"/>' +
    '</filter></defs>'
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">` +
    shadow +
    '<g filter="url(#s)">' +
    body +
    glyph +
    '</g>' +
    '</svg>'
  return `image://data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
