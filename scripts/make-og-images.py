"""Generate 1200x630 share images for the curated top sites.

This is a design asset generator, not part of the runtime build. It needs Pillow
and the Windows Chinese fonts used by the current design. Re-run after changing
a cover or the curated copy:

    python scripts/make-og-images.py
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

# 只给头部项目做独立分享图；其余项目继续用 public/og-cover.jpg
SITES = {
    'huangshan-scenic': {
        'line': '奇松 · 怪石 · 云海 · 温泉',
        'sub': '黄山市 · 世界文化与自然双遗产',
        'tag': '自然 · 5A · 世界双遗产',
    },
    'hongcun': {
        'line': '月沼 · 南湖 · 水圳 · 徽派民居',
        'sub': '黄山市 · 世界文化遗产',
        'tag': '乡村 · 5A · 世界遗产',
    },
    'xidi': {
        'line': '牌坊 · 祠堂 · 巷弄 · 徽派古村',
        'sub': '黄山市 · 世界文化遗产',
        'tag': '乡村 · 5A · 世界遗产',
    },
    'huizhou-ancient-city': {
        'line': '许国石坊 · 斗山街 · 渔梁坝',
        'sub': '黄山市 · 古徽州府治',
        'tag': '古镇 · 5A · 徽州文化',
    },
    'jiuhuashan': {
        'line': '地藏道场 · 肉身宝殿 · 百岁宫',
        'sub': '池州市 · 中国佛教四大名山',
        'tag': '自然 · 5A · 佛教名山',
    },
    'tianzhushan': {
        'line': '花岗岩峰柱 · 擎天一柱 · 封禅',
        'sub': '安庆市 · 世界地质公园',
        'tag': '自然 · 5A · 世界地质公园',
    },
    'tiantangzhai': {
        'line': '瀑布群 · 原始林 · 大别山主峰',
        'sub': '六安市 · 皖西避暑',
        'tag': '自然 · 5A · 大别山',
    },
    'longchuan': {
        'line': '胡氏宗祠 · 奕世尚书坊 · 龙川水街',
        'sub': '宣城市 · 全国文保',
        'tag': '乡村 · 5A · 徽州古村',
    },
    'chaji-village': {
        'line': '查姓古村 · 祠堂 · 溪流',
        'sub': '宣城市 · 皖南古村落',
        'tag': '乡村 · 徽派古村',
    },
    'caishiji': {
        'line': '长江矶头 · 太白楼 · 李白行迹',
        'sub': '马鞍山市 · 长江三矶',
        'tag': '自然 · 5A · 长江',
    },
    'sanhe-ancient-town': {
        'line': '丰乐河 · 杭埠河 · 青石板街',
        'sub': '合肥市 · 5A 水乡古镇',
        'tag': '古镇 · 5A · 水乡',
    },
    'shouxian-ancient-city': {
        'line': '宋代城垣 · 四门瓮城 · 楚都',
        'sub': '淮南市 · 国家历史文化名城',
        'tag': '古镇 · 4A · 楚都',
    },
}

PAPER = (247, 243, 234)
WHITE = (250, 247, 240)
MUTED = (220, 214, 202)
GOLD = (214, 178, 112)

# 品牌标识：深底/照片上用的实底版（纸白字、印外透明），由 design/logo/build-assets.py 生成
LOGO_PATH = Path('design/logo/derived/logo-red-solid.png')
LOGO_H = 52

# 封面里自带水印/海报文字的项目，先裁掉再压字；坐标基于 public/images/sites/<id>/cover.webp
CROPS = {
    'chaji-village': (0, 300, 1600, 1000),
    'xidi': (0, 80, 700, 379),
    'shouxian-ancient-city': (0, 0, 1448, 660),
}


def read_site_names() -> dict[str, str]:
    text = Path('src/data/sites.ts').read_text(encoding='utf-8')
    names = {}
    for site_id in SITES:
        block = text.split(f"id: '{site_id}'", 1)[1].split('  },', 1)[0]
        names[site_id] = re.search(r"name: '([^']+)'", block).group(1)
    return names


def shadow_text(draw: ImageDraw.ImageDraw, x: int, y: int, text: str, font, fill, offset=2):
    draw.text((x + offset, y + offset), text, font=font, fill=(0, 0, 0, 160))
    draw.text((x, y), text, font=font, fill=fill)


def make_one(site_id: str, name: str, cfg: dict[str, str]) -> Path:
    cover = Path(f'public/images/sites/{site_id}/cover.webp')
    source = Image.open(cover).convert('RGB')
    if site_id in CROPS:
        source = source.crop(CROPS[site_id])
    img = ImageOps.fit(source, (W, H), method=Image.Resampling.LANCZOS)

    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(H):
        t = max(0.0, (y - H * 0.42) / (H * 0.58))
        od.line([(0, y), (W, y)], fill=(12, 10, 8, int(215 * t * t)))
    img = Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(img)

    font_brand = ImageFont.truetype(str(SERIF), 34, index=0)
    font_title = ImageFont.truetype(str(SERIF), 96, index=0)
    font_line = ImageFont.truetype(str(SANS), 30, index=0)
    font_sub = ImageFont.truetype(str(SANS), 22, index=0)
    font_tag = ImageFont.truetype(str(SANS), 22, index=0)
    font_small = ImageFont.truetype(str(SANS), 20, index=0)

    logo = Image.open(LOGO_PATH).convert('RGBA')
    logo = logo.resize((round(LOGO_H * logo.width / logo.height), LOGO_H), Image.LANCZOS)
    img.paste(logo, (52, 36), logo)
    shadow_text(draw, 52 + logo.width + 14, 48, '乡遇安徽', font_brand, WHITE, 1)

    tag = cfg['tag']
    tb = draw.textbbox((0, 0), tag, font=font_tag)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    x = W - tw - 66
    draw.rounded_rectangle([x - 18, 50, x + tw + 18, 50 + th + 18], radius=20, fill=(12, 10, 8, 120))
    draw.text((x, 56), tag, font=font_tag, fill=WHITE)

    x0, title_y = 64, 352
    draw.line([(x0, title_y - 26), (x0 + 430, title_y - 26)], fill=GOLD, width=3)
    shadow_text(draw, x0, title_y, name, font_title, WHITE, 3)
    shadow_text(draw, x0 + 4, title_y + 118, cfg['line'], font_line, MUTED, 2)
    shadow_text(draw, x0 + 4, title_y + 164, cfg['sub'], font_sub, MUTED, 2)
    shadow_text(draw, W - 260, H - 54, 'xiangyu-map', font_small, (208, 198, 184), 1)

    draw.rectangle([0, 0, W - 1, H - 1], outline=PAPER, width=6)

    out_dir = Path('public/og/sites')
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f'{site_id}.jpg'
    img.save(out, quality=88, optimize=True)
    return out


def main() -> None:
    names = read_site_names()
    total = 0
    for site_id, cfg in SITES.items():
        out = make_one(site_id, names[site_id], cfg)
        total += out.stat().st_size
        print(f'{site_id}: {out.stat().st_size // 1024} KB')
    print(f'{len(SITES)} images, {total / 1024 / 1024:.2f} MB')


if __name__ == '__main__':
    main()
