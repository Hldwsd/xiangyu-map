import type { SiteCategory } from '@/types/site'

/**
 * S1 圆线：七类地标图标（48 网格，无外框、曲线、3–4 笔）。
 *
 * 这版取代早期的「方框 + 横平竖直」墨模：
 * - 古镇：弧顶 + 拱门 + 墙基，按视觉重心上移 4.5；
 * - 乡村：稻穗（茎 + 两叶 + 地线）；
 * - 非遗：折扇（扇面 + 三根扇骨）；
 * - 红色：飘旗（弯旗杆 + 波浪旗面）；
 * - 自然：双弧山脊 + 地线，按视觉重心上移 4；
 * - 演艺：鼓（鼓身 + 鼓面 + 两支鼓槌）；
 * - 场馆：柱廊立面（山墙 + 三柱 + 台基），博物馆 / 科技馆的通用立面。
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
  非遗: ['M24 38L8 22A24 24 0 0 1 40 22Z', 'M24 38V15.9', 'M24 38L14 18', 'M24 38L34 18'],
  红色: ['M16 9c0 10-1 20 0 30', 'M16 12c8-4 12 4 20 0-2 5-2 9 0 14-8 4-12-4-20 0'],
  自然: ['M6 31c6-12 11-16 17-6 4-8 10-8 16 2', 'M6 31h36'],
  演艺: [
    'M12 20a12 4 0 1 0 24 0 12 4 0 1 0-24 0',
    'M12 20v10a12 4 0 0 0 24 0V20',
    'M10 10l12 10',
    'M38 10l-12 10',
  ],
  场馆: ['M10 20L24 10L38 20', 'M14 20v16M24 20v16M34 20v16', 'M10 38h28'],
}

const INK = '#1c1a17'
const PAPER = '#fbf6ea'
const GOLD = '#b08a4a'

/** 48 单位画布上的圆钉与图形比例 */
const SIZE = 48
const RING_RADIUS = 21
const GLYPH_SCALE = 0.68
const GLYPH_OFFSET = (SIZE - 48 * GLYPH_SCALE) / 2
/**
 * 线宽与图形占比按原版 S1 样张（.tmp/ink-paper/final/s1-icons.png）来：
 * 0.68 缩放让图形占满圆钉内径的 ~2/3，3.3 × 0.68 ≈ 2.24 单位，
 * 在 34px 圆钉上约 1.6px。再粗就会把「鼓」「折扇」这类细节糊成一团。
 */
const GLYPH_STROKE = 3.3

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
 * 圆钉是纸白底 + 墨线图形；选中态反转为墨底纸线，并加金色虚线环；
 * 精选态保持纸白钉墨线，只在钉外加一圈金色虚线环——「重点但未选中」
 * 与「已选中」共享金色环语言，靠底色反转区分。
 * 用图片而不是 `path://`：图片能同时画「圆底 + 图形 + 虚线环」三层，
 * 且命中区是整个方框，比只覆盖描边的符号更稳。
 */
export function categoryMarkerSymbol(
  category: SiteCategory,
  selected = false,
  featured = false,
): string {
  const goldRing = `<circle cx="24" cy="24" r="23" fill="none" stroke="${GOLD}" stroke-width="1.3" stroke-dasharray="3 2.4"/>`
  // 精选环要自己带墨衬边：金色对纸白只有 2.9:1，直接画在纸钉外沿会「看不见」；
  // 先铺一圈墨环再叠金环，金线在任何底色上都有轮廓
  const featuredRing =
    `<circle cx="24" cy="24" r="22.6" fill="none" stroke="${INK}" stroke-width="2.8" stroke-dasharray="3.4 2.7"/>` +
    `<circle cx="24" cy="24" r="22.6" fill="none" stroke="${GOLD}" stroke-width="1.4" stroke-dasharray="3.4 2.7"/>`
  const body = selected
    ? `<circle cx="24" cy="24" r="${RING_RADIUS}" fill="${INK}"/>` + goldRing
    : `<circle cx="24" cy="24" r="${RING_RADIUS}" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>` +
      (featured ? featuredRing : '')
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
