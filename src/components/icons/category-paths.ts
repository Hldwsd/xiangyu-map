import type { SiteCategory } from '@/types/site'

/**
 * S1 圆线：六类地标图标（48 网格，无外框、曲线、3–4 笔）。
 *
 * 这版取代早期的「方框 + 横平竖直」墨模：
 * - 古镇：弧顶 + 拱门 + 墙基，按视觉重心上移 4.5；
 * - 乡村：稻穗（茎 + 两叶 + 地线）；
 * - 非遗：折扇（扇面 + 三根扇骨）；
 * - 红色：飘旗（弯旗杆 + 波浪旗面）；
 * - 自然：双弧山脊 + 地线，按视觉重心上移 4；
 * - 演艺：鼓（鼓身 + 鼓面 + 两支鼓槌）。
 *
 * 地图钉与界面图标共用同一套线条；地图钉为纸白圆钉 + 墨线，
 * 选中态反转为墨底纸线，并加一圈金色虚线。
 */
export const CATEGORY_GLYPHS: Record<SiteCategory, string[]> = {
  古镇: ['M7 21.5c5-6 10-9 17-9s12 3 17 9', 'M11 21.5v11h26V21.5', 'M21 32.5v-5a3 3 0 0 1 6 0v5'],
  乡村: [
    'M24 38c-1-9-1-17 0-24',
    'M24 20c-5 0-8-3-9-8 5 0 8 3 9 8z',
    'M24 26c5 0 8-3 9-8-5 0-8 3-9 8z',
    'M16 38h16',
  ],
  非遗: ['M24 38L8 22A24 24 0 0 1 40 22Z', 'M24 38V12', 'M24 38L14 18', 'M24 38L34 18'],
  红色: ['M16 9c0 10-1 20 0 30', 'M16 12c8-4 12 4 20 0-2 5-2 9 0 14-8 4-12-4-20 0'],
  自然: ['M6 31c6-12 11-16 17-6 4-8 10-8 16 2', 'M6 31h36'],
  演艺: [
    'M12 20a12 4 0 1 0 24 0 12 4 0 1 0-24 0',
    'M12 20v10a12 4 0 0 0 24 0V20',
    'M10 10l12 10',
    'M38 10l-12 10',
  ],
}

const INK = '#1c1a17'
const PAPER = '#fbf6ea'
const GOLD = '#b08a4a'

/** 48 单位画布上的圆钉与图形比例 */
const SIZE = 48
const RING_RADIUS = 21
const GLYPH_SCALE = 0.6
const GLYPH_OFFSET = (SIZE - 48 * GLYPH_SCALE) / 2
/** 视觉线宽 2.2px：外面还会按 symbolSize 缩放，这里先留出余量 */
const GLYPH_STROKE = 5.2

function glyphMarkup(category: SiteCategory, stroke: string): string {
  const paths = CATEGORY_GLYPHS[category].map((path) => `<path d="${path}"/>`).join('')
  return (
    `<g transform="translate(${GLYPH_OFFSET} ${GLYPH_OFFSET}) scale(${GLYPH_SCALE})"` +
    ` fill="none" stroke="${stroke}" stroke-width="${GLYPH_STROKE}" stroke-linecap="round"` +
    ` stroke-linejoin="round">${paths}</g>`
  )
}

/**
 * 生成 ECharts 可用的图片符号：`image://data:image/svg+xml,...`
 *
 * 圆钉是纸白底 + 墨线图形；选中态反转为墨底纸线，并加金色虚线环。
 * 用图片而不是 `path://`：图片能同时画「圆底 + 图形 + 虚线环」三层，
 * 且命中区是整个方框，比只覆盖描边的符号更稳。
 */
export function categoryMarkerSymbol(category: SiteCategory, selected = false): string {
  const body = selected
    ? `<circle cx="24" cy="24" r="${RING_RADIUS}" fill="${INK}"/>` +
      `<circle cx="24" cy="24" r="23" fill="none" stroke="${GOLD}" stroke-width="1.3" stroke-dasharray="3 2.4"/>`
    : `<circle cx="24" cy="24" r="${RING_RADIUS}" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>`
  const glyph = glyphMarkup(category, selected ? PAPER : INK)
  // 极轻的投影：纸白圆钉压在接近纸白的陆地上时，只靠细圈会「粘」在底图上
  const shadow =
    '<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%">' +
    '<feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#1c1a17" flood-opacity="0.18"/>' +
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
