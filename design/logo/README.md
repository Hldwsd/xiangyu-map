# 标识资产

红 / 黑两版同一个构图。**`public/brand/` 里的文件是脚本产物**，改源图后重跑脚本，不要手改。

## 源文件（`source/`）

| 文件             | 尺寸      | 说明                                          |
| ---------------- | --------- | --------------------------------------------- |
| `logo_red.png`   | 762×852   | 红版，朱砂印面 + 纸白笔刷「乡」，带纸纹与毛边 |
| `logo_black.png` | 1094×1250 | 黑版，同构图的单色版                          |

两版都是不透明位图（纸底是图的一部分），没有透明通道。

## 上站资产（由 `build-assets.py` 生成）

| 文件                                     | 用在                         | 说明                                       |
| ---------------------------------------- | ---------------------------- | ------------------------------------------ |
| `public/brand/logo-red.webp`             | 版头落款印（`HomeRail.vue`） | 192 宽，约 26 KB；纸底抠空、字是镂空       |
| `public/brand/icon-red-16/32/48/180.png` | favicon / apple-touch        | 方形纸底，印占 86%，四周留白               |
| `public/favicon.ico`                     | 老浏览器兜底                 | 由同一图标生成 16/32/48 三档               |
| `public/brand/logo-black.webp`           | 单色场景                     | 192 宽；一色印刷、浅底且不需要品牌红的场合 |
| `design/logo/derived/logo-red-solid.png` | 分享图（70 张 OG 卡）        | 256 宽；**纸白字、印外透明**，压照片不丢字 |

## 分享图

`scripts/make-og-images.py`（12 张精选）与 `scripts/make-og-images-all.py`（其余模板卡）都从
`derived/logo-red-solid.png` 取标识，在每张卡左上角画 52px 高的印。

- 换标识后要重跑两个脚本；`make-og-images-all.py` 只补缺文件，所以先删 `public/og/sites/*.jpg` 再跑。
- `public/og-cover.jpg`（默认分享图）没有生成脚本，标识是手工替换的：**换标识时要单独处理这张**。

## 处理规则

1. **抠纸底**：`alpha = (238 − 亮度) / (238 − 印色亮度)`，低于 9% 归零，再线性拉开；RGB 统一成 token 色（红 `#9e2a22` / 墨 `#1c1a17`）。纸底和笔画里透出的纸色都会变透明——版头里透出的就是卡片自己的纸色，所以不要给图片加底色。
2. **方形图标**：裁到墨迹 bbox，纸底 `#f4eee2` 铺满，印占 86%（四周留 7%），再缩到 16/32/48/180。
3. **体积**：192 宽 WebP（q92）约 26 KB；180 图标约 42 KB，纸纹是压缩大头。

## 已知限制

- **位图**：16px 只剩「红块白斑」；竖长比例（0.87–0.90）放进方形位（头像、App 图标）会左右留白，所以图标补了方形纸底；纸纹与毛边在缩放时会被重采样。
- **深底不可用**：透明版的字是镂空，深色底会把「乡」吃掉。深色/照片场景用 `derived/logo-red-solid.png`（纸白字、印外透明），分享图就是这么用的。
- **黑色版是单色版，不是深底版**：它同样是镂空字，只适合浅底或白色承印物。
- **换色**：改 `build-assets.py` 里的 `INK` / `SEAL` 重跑；换图先替换 `source/` 再重跑。

## 重新生成

```bash
python design/logo/build-assets.py   # 需要 Pillow + numpy
```

## 引用点

- `src/components/home/HomeRail.vue`：`.rail__seal` 的 `<img>`，宽 3.2rem（约 51px）。旧版是 2.6rem 的朱砂方块 + 「徽」字，48px 量级下笔锋会糊，所以放大了一档。
- `index.html`：favicon 三行（Vite 构建时会按 `BASE_URL` 改写成 `/xiangyu-map/...`）。
- `public/favicon.ico`：兼容老浏览器。
