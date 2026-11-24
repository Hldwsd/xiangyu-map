"""Generate 1200x630 share cards for the remaining sites.

The curated cards in scripts/make-og-images.py keep their hand-written copy;
this script only fills sites that have no public/og/sites/<id>.jpg yet. Run:

    python scripts/make-og-images-all.py
"""

from __future__ import annotations

import os
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

W, H = 1200, 630
FONT_DIR = Path(os.environ.get('OG_FONT_DIR', 'C:/Windows/Fonts'))
SERIF = FONT_DIR / 'simsun.ttc'
SANS = FONT_DIR / 'msyh.ttc'

CURATED = {
    'huangshan-scenic',
    'hongcun',
    'xidi',
    'huizhou-ancient-city',
    'jiuhuashan',
    'tianzhushan',
    'tiantangzhai',
    'longchuan',
    'caishiji',
    'sanhe-ancient-town',
    'shouxian-ancient-city',
}

# 70/70 已全覆盖，留空；以后若要保留一张默认图样本，把 id 加到这里。
DEFAULT_ONLY: set[str] = set()

PAPER = (247, 243, 234)
WHITE = (250, 247, 240)
MUTED = (220, 214, 202)
GOLD = (214, 178, 112)

# 品牌标识：深底/照片上用的实底版（纸白字、印外透明），由 design/logo/build-assets.py 生成
LOGO_PATH = Path('design/logo/derived/logo-red-solid.png')
LOGO_H = 52


def read_sites() -> list[dict[str, str]]:
    text = Path('src/data/sites.ts').read_text(encoding='utf-8')
    sites: list[dict[str, str]] = []
    for chunk in text.split('\n  {\n')[1:]:
        block = chunk.split('\n  },', 1)[0]
        if "id: '" not in block:
            continue
        def field(name: str) -> str:
            matched = re.search(rf"    {name}: '([^']+)',", block)
            return matched.group(1) if matched else ''
        site_id = field('id')
        if site_id == '':
            continue
        sites.append(
            {
                'id': site_id,
                'name': field('name'),
                'category': field('category'),
                'city': field('city'),
                'summary': field('summary'),
                'cover': field('cover'),
            }
        )
    return sites


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ''
    for char in text:
        candidate = current + char
        if draw.textlength(candidate, font=font) <= max_width or current == '':
            current = candidate
        else:
            lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def ellipsize(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> str:
    if draw.textlength(text, font=font) <= max_width:
        return text
    suffix = '…'
    current = text
    while current and draw.textlength(current + suffix, font=font) > max_width:
        current = current[:-1]
    return current + suffix


def shadow_text(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, font, fill, offset=2):
    draw.text((x + offset, y + offset), text, font=font, fill=(0, 0, 0, 160))
    draw.text((x, y), text, font=font, fill=fill)


def fit_title(draw: ImageDraw.ImageDraw, name: str, max_width: int) -> tuple[ImageFont.FreeTypeFont, list[str]]:
    for size in (78, 70, 62, 54, 46):
        font = ImageFont.truetype(str(SERIF), size, index=0)
        lines = wrap_text(draw, name, font, max_width)
        if len(lines) <= 2:
            return font, lines
    font = ImageFont.truetype(str(SERIF), 42, index=0)
    return font, wrap_text(draw, name, font, max_width)[:2]


def make_one(site: dict[str, str]) -> Path:
    cover = Path('public') / site['cover'].lstrip('/')
    source = Image.open(cover).convert('RGB')
    img = ImageOps.fit(source, (W, H), method=Image.Resampling.LANCZOS)

    # 底图明暗不可控：先压一层从 22% 开始的渐变，再给文字区加半透明底，
    # 保证白字在浅色博物馆/雪景封面上也能读。
    # 底部渐变与左侧压暗分成两层再叠加：
    # 直接往同一张 overlay 上逐列画会把左 920px 的底部渐变覆盖掉，
    # 在 x=920 处留下一条硬边，看起来像右侧盖了黑蒙版。
    bottom = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bottom)
    for y in range(H):
        t = max(0.0, (y - H * 0.22) / (H * 0.78))
        bd.line([(0, y), (W, y)], fill=(12, 10, 8, int(245 * t * t)))
    left = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(left)
    for x in range(920):
        ld.line([(x, 0), (x, H)], fill=(12, 10, 8, int(100 * (1 - x / 920))))
    overlay = Image.alpha_composite(bottom, left)
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    font_brand = ImageFont.truetype(str(SERIF), 34, index=0)
    font_summary = ImageFont.truetype(str(SANS), 27, index=0)
    font_sub = ImageFont.truetype(str(SANS), 22, index=0)
    font_small = ImageFont.truetype(str(SANS), 20, index=0)

    logo = Image.open(LOGO_PATH).convert('RGBA')
    logo = logo.resize((round(LOGO_H * logo.width / logo.height), LOGO_H), Image.LANCZOS)
    img.paste(logo, (52, 36), logo)
    shadow_text(draw, 52 + logo.width + 14, 48, '乡遇安徽', font_brand, WHITE, 1)

    max_text_width = 1040
    title_font, title_lines = fit_title(draw, site['name'], max_text_width)
    line_height = title_font.size + 12
    title_y = 286
    draw.line([(64, title_y - 24), (64 + 430, title_y - 24)], fill=GOLD, width=3)
    for index, line in enumerate(title_lines):
        shadow_text(draw, 64, title_y + index * line_height, line, title_font, WHITE, 3)

    summary = ellipsize(draw, site['summary'], font_summary, 980)
    summary_y = title_y + len(title_lines) * line_height + 18
    shadow_text(draw, 68, summary_y, summary, font_summary, MUTED, 2)

    sub = f"{site['city']} · 安徽省"
    shadow_text(draw, 68, H - 50, sub, font_sub, MUTED, 2)
    shadow_text(draw, W - 230, H - 46, 'xiangyu-map', font_small, (208, 198, 184), 1)

    draw.rectangle([0, 0, W - 1, H - 1], outline=PAPER, width=6)

    out_dir = Path('public/og/sites')
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{site['id']}.jpg"
    img.save(out, quality=82, optimize=True)
    return out


def main() -> None:
    sites = read_sites()
    generated = skipped = 0
    total = 0
    for site in sites:
        if site['id'] in CURATED or site['id'] in DEFAULT_ONLY:
            skipped += 1
            continue
        out = Path(f"public/og/sites/{site['id']}.jpg")
        if out.exists():
            skipped += 1
            continue
        out = make_one(site)
        generated += 1
        total += out.stat().st_size
        print(f"{site['id']}: {out.stat().st_size // 1024} KB")
    print(f'generated={generated} skipped={skipped} total={total / 1024 / 1024:.2f} MB')


if __name__ == '__main__':
    main()




