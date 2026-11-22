# 0012. 详情页预渲染：构建后注入静态 meta

- 状态：已接受
- 日期：2026-11-22
- 决策人：A（Hldwsd）

## 背景

站点是 Vite + Vue Router 的 SPA，`/site/:id` 的内容完全由浏览器执行 JS 后渲染。带来两个问题：

1. 微信、Slack、Twitter 等分享抓取的是 HTML 里的 `og:*`，不会执行 SPA 的 JS，所有项目分享出来都是同一个「乡遇安徽」；
2. 搜索引擎拿到的是空 `<div id="app">`，62 个详情页很难被单独收录。

项目需要的是“一个项目一个链接、一个分享卡”，但又不想为了 SEO 把整个前端迁到 SSR/SSG 框架。

## 决策

构建后跑 `pnpm prerender`（`scripts/prerender-sites.mjs`）：

1. 用 Vite 的 `ssrLoadModule()` 读取 `src/data/sites.ts`，不复制一份数据；
2. 读取构建产物 `dist/index.html` 作为模板，为每个项目注入：
   - `<title>` 与 `meta[name=description]`
   - `canonical`
   - `og:title/description/url/image`、`twitter:*`
   - `application/ld+json`（`TouristAttraction`，含地址与坐标）
3. 写到 `dist/site/<id>/index.html`；首页 `dist/index.html` 也注入站点级 meta；
4. `SITE_URL` 由 deploy/preview workflow 注入，保证 OG/canonical 是绝对地址；
5. OG 图优先用 `public/og/sites/<id>.jpg`（头部 12 个项目由 `scripts/make-og-images.py` 生成），没有独立图的项目回退到统一 `public/og-cover.jpg`；后续再补剩余项目。

不引入 SSG 框架，不动运行时路由与组件，构建后的 HTML 仍然加载同一个 SPA bundle。

## 理由

- 以最小改动拿到“每页独立 title/OG”的实际收益，且不增加运行时体积；
- 数据只有一份，预渲染脚本直接读 `sites.ts`，不会出现“预渲染数据和页面数据不一致”；
- 静态文件与现有 GitHub Pages 部署兼容，不需要 Node 服务器；
- 未来要换 SSG，注入逻辑和 meta 生成规则可以复用。

## 后果

- 构建顺序固定：`build-only` → `prerender` → 复制 404；漏跑 prerender 会退回 SPA 行为；
- 每个详情页多一个 `dist/site/<id>/index.html`，部署文件数增加 62 个；
- 详情页的 canonical 使用带尾斜杠的 `/site/<id>/`，与静态目录一致；Vue Router 默认允许尾斜杠，运行时仍能命中；
- 目前只有头部 12 个项目有独立分享图，其余项目仍用统一图；后续可按同一脚本补齐剩余项目；
- PR 预览的预渲染页可直接访问，但无尾斜杠的深链仍受 GitHub Pages 404 限制（已知限制）。

## 备选方案

- **vite-ssg / Nuxt 等 SSG**：收益更完整，但要改路由、构建和组件生命周期，超出当前范围；
- **自建 SSR 服务**：GitHub Pages 无法承载 Node 服务；
- **只做客户端 `document.title`**：浏览器标签会变，但微信/搜索仍拿不到，解决不了核心问题；
- **不做预渲染，只放默认 OG**：所有项目分享卡仍然一样，等于没解决“分享一个具体项目”的需求。
