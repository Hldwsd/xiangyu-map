"""从设计源生成上站资产（红 / 黑两版 + 红版图标 + 深底实底版）。

用法（仓库根目录）：`python design/logo/build-assets.py`，需要 Pillow + numpy。

规则见同目录 README.md：抠纸底 -> RGB 统一为 token 色 -> 方形图标按 86% 居中。
产物落在 public/brand/、public/favicon.ico 与 design/logo/derived/；不要手改产物，改源图后重跑。
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "design" / "logo" / "source"
BRAND = ROOT / "public" / "brand"

INK = (28, 26, 23)  # --ink #1c1a17
SEAL = (158, 42, 34)  # --seal-red #9e2a22
PAPER = (244, 238, 226)  # --paper #f4eee2

# 印色亮度：用于把「纸 -> 印」的亮度差归一化成 alpha
LOW_LUM = {"red": 66, "black": 20}


def keyed(path: Path, color: tuple[int, int, int], low_lum: int) -> tuple[Image.Image, tuple]:
    """按亮度抠掉纸底：纸 ≈ 243，印 ≈ low_lum；低于 9% 的 alpha 归零去纸纹噪声。"""
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    alpha = np.clip((238 - lum) / (238 - low_lum), 0, 1)
    alpha[alpha < 0.09] = 0.0
    alpha = np.clip((alpha - 0.09) / 0.91, 0, 1)

    rgba = np.zeros((*lum.shape, 4), dtype=np.uint8)
    rgba[..., 0], rgba[..., 1], rgba[..., 2] = color
    rgba[..., 3] = (alpha * 255).round().astype(np.uint8)
    art = Image.fromarray(rgba, "RGBA")

    ys, xs = np.where(alpha > 0.5)
    return art, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)


def square_icon(art: Image.Image, box: tuple, size: int, ratio: float = 0.86) -> Image.Image:
    """方形纸底图标：印占 86%，四周纸底，缩到目标尺寸。"""
    w, h = box[2] - box[0], box[3] - box[1]
    side = int(size / ratio)
    glyph = art.crop(box).resize((round(side * w / h), side), Image.LANCZOS)
    canvas = Image.new("RGB", (side, side), PAPER)
    canvas.paste(glyph, ((side - glyph.width) // 2, 0), glyph)
    return canvas.resize((size, size), Image.LANCZOS)


def solid_logo(path: Path, out: Path, width: int = 256) -> None:
    """照片/深底上用的实底版：印面保留纸白字与内圈，印外透明。

    与 keyed() 的区别：keyed 把纸（包括字）全抠掉，只剩红墨，深底上字会消失。
    这里从四角泛洪标出「印外的纸」，只把那一部分变透明；被红框围住的纸（字、内圈）
    仍是纸白——分享图（scripts/make-og-images*.py）需要这个版本。
    """
    src = Image.open(path).convert("RGB")
    rgb = np.asarray(src).astype(np.float32)
    lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]

    paper = Image.fromarray(((lum > 195) * 255).astype(np.uint8), "L")
    # 小闭运算补纸纹气孔，避免泛洪从针孔漏进印内
    paper = paper.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))

    marked = paper.copy()
    for xy in ((0, 0), (src.width - 1, 0), (0, src.height - 1), (src.width - 1, src.height - 1)):
        if marked.getpixel(xy) == 255:
            ImageDraw.floodfill(marked, xy, 128, thresh=24)

    outside = np.asarray(marked) == 128
    alpha = np.where(outside, 0, 255).astype(np.uint8)
    art = Image.fromarray(np.dstack([np.asarray(src).astype(np.uint8), alpha]), "RGBA")
    art = art.crop(art.getbbox())
    art = art.resize((width, round(width * art.height / art.width)), Image.LANCZOS)
    out.parent.mkdir(parents=True, exist_ok=True)
    art.save(out, optimize=True)
    print(f"{out.name}  {art.size[0]}x{art.size[1]}  {out.stat().st_size / 1024:.1f} KB")


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    for stale in BRAND.glob("*.png"):
        stale.unlink()

    variants = {}
    for name in ("red", "black"):
        art, box = keyed(SOURCE / f"logo_{name}.png", SEAL if name == "red" else INK, LOW_LUM[name])
        variants[name] = (art, box)
        width = 192
        w, h = box[2] - box[0], box[3] - box[1]
        out = art.resize((width, round(width * h / w)), Image.LANCZOS)
        target = BRAND / f"logo-{name}.webp"
        out.save(target, "WEBP", quality=92, method=6)
        print(f"logo-{name}.webp  {out.size[0]}x{out.size[1]}  {target.stat().st_size / 1024:.1f} KB")

    art, box = variants["red"]
    for size in (16, 32, 48, 180):
        target = BRAND / f"icon-red-{size}.png"
        square_icon(art, box, size).save(target, optimize=True)
        print(f"icon-red-{size}.png  {target.stat().st_size / 1024:.1f} KB")

    ico = ROOT / "public" / "favicon.ico"
    square_icon(art, box, 48).save(ico, sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"favicon.ico  {ico.stat().st_size / 1024:.1f} KB")

    solid_logo(SOURCE / "logo_red.png", ROOT / "design" / "logo" / "derived" / "logo-red-solid.png")


if __name__ == "__main__":
    main()
