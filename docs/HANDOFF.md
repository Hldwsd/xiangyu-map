# 交接文档 · 乡遇安徽

> 更新时间：2026-11-22 16:55（Asia/Shanghai）
> 当前 main：`77cc466 feat(detail): 12 个头部项目补两组画廊图`
> 线上：https://hldwsd.github.io/xiangyu-map/
> 目标读者：接手本仓库的 A/B 任一方，或下一位 agent。

## 一句话状态

**M0、M1 已完成；M2 的内容与分享链路基本完成；M3 质量闸门未开始；M4 未开始。**
main 当前有 62 条数据、62 张真实封面、62/62 高德短链、12 个头部项目的独立分享图 + 画廊，以及 62 个详情页的预渲染。

## 一、这次会话完成了什么

### 1. 完成度文案与键盘入口（#129，已合并）

- 全站“封面为占位/64 条”的旧文案改为 62 条、封面来自公开资料；
- 删掉地图组件里 63 个隐藏 Tab 停靠点，统一走顶部“项目列表”抽屉；
- 顶栏移到 DOM 最前，Tab 顺序从菜单/搜索/列表开始；
- 筛选到 0 条时补空态。

### 2. 详情页高德短链、同城推荐、来源站点名（#130，已合并）

- 不再按经纬度拼 marker；62/62 精确 `surl.amap.com` 短链，缺失时回退名称 + 城市搜索；
- 新增“同城其他项目”（同城、同类优先、最多 3 条）；
- 来源从原始 URL 改为站点名（百度百科 / UNESCO / 政府域名），完整 URL 保留在 title/aria-label。

### 3. 预渲染、每页 OG/JSON-LD、12 张分享图（#131 → #133）

- `pnpm prerender` 生成 62 个 `dist/site/<id>/index.html`，注入 title、description、canonical、OG/Twitter、`TouristAttraction` JSON-LD；
- 首页也注入站点级 meta；
- SPA 内跳转时 `router.afterEach` 同步浏览器标题；
- 头部 12 个项目有独立 1200×630 分享图（`public/og/sites/`），其余回退 `public/og-cover.jpg`；
- CI / deploy / preview 都接入 prerender；ADR 0012 记录方案。

> 注意合并历史：#131 当时以 `feat/detail-decision` 为 base，只合进了功能分支；#133 才把它带进 main。以后开 PR 前先确认 base 是 main。

### 4. 详情页决策信息与 12 个头部项目画廊（#134 + 直接提交）

- `Site` 新增可选 `practical`：`duration` / `hours` / `ticket` / `audience`；
- 12 个头部项目已填“建议停留”和“适合人群”；
- 12 个头部项目各 2 张 `gallery-*.webp`，详情页“图集”已显示；
- 校验：practical 未知字段、空串、超过 80 字都会报错。

> ⚠️ 流程问题：画廊这批是直接提交到 main 的 `77cc466`，没有走 PR。CI/Deploy 是绿的，也没有 force-push。是否要 revert 后用 `feat/detail-gallery` 重新提交，需要负责人决定。

## 二、当前数据与资产

| 项        | 现状                                                             |
| --------- | ---------------------------------------------------------------- |
| 项目数    | **62**（16 个地级市全部 ≥2 条）                                  |
| 分类      | 古镇 9 / 非遗 1 / 红色 5 / 自然 29 / 演艺 1 / 乡村 13 / 场馆 4   |
| 封面      | 62/62 WebP，单张 ≤300KB                                          |
| 高德短链  | 62/62，`src/data/amap-links.ts`                                  |
| 预渲染    | 62 个详情页 + 首页，`pnpm prerender`                             |
| 分享图    | 12 个头部项目独立图 + 1 张默认图                                 |
| 画廊      | 12 个头部项目 ×2 张；其余 50 条仍为空                            |
| practical | 12 个头部项目有 `duration` / `audience`；`hours` / `ticket` 未填 |
| 单测      | **128 个用例 / 10 个文件**，全绿                                 |

## 三、验证结果（2026-11-22 16:54 实跑）

```bash
pnpm lint          # 0
pnpm format:check  # 0
pnpm type-check    # 0
pnpm test:unit --run  # 128/128
pnpm build         # 首屏 JS 259.43 KB gzip
pnpm prerender     # 62 detail + home
```

- main 的 CI、Deploy 最近一次 run 均 success；
- 交接时没有其他 open PR（本文件自身通过 #135 提交）；
- open issue 只剩 **#16（M1 聚合命中率/FPS 真机复测）**；
- #107 已随 #129 关闭。

## 四、未完成与阻塞

### 1. 第三件：8 条非遗/演艺内容（未入库）

原计划 8 条：宣纸、徽墨/歙砚、鱼灯、傩戏、黄梅戏、花鼓灯、徽州三雕、万安罗盘。

实际进展：

- 已找到 7 个高德 POI：中国宣纸文化园、老胡开文墨厂、歙县古城墨砚博物馆、汪满田、傩文化馆、万安罗经文化博物馆、冯嘴子；
- 第 8 个（香茗大剧院 / 中国徽菜博物馆）没有稳定命中；
- 下载到的候选封面只有 375×500 / 500×400，放详情页会明显发虚；
- 高德连续搜索后触发反爬，Browser Control 扩展也断开过。

**没有把低分辨率封面、猜的坐标写进数据。** 需要：

1. 在 Chrome 重新连上 Browser Control，并手动过一次高德滑块；或
2. 直接提供 8 个点的官方图 / 高德分享链接 / 坐标。

推荐新开 `feat/content-ich` 分支，不要直推 main。

### 2. 详情页内容深度

- 12 个头部项目还缺 `hours`（开放时间）和 `ticket`（门票）；这两个必须来自可追溯来源，不能猜；
- 其余 50 个项目还没有画廊；
- 详情页仍缺“看点”短列表、建议路线、周边联动等更强的决策信息。

### 3. M3 质量闸门（未开始）

- 覆盖率 ≥70% 尚未接 `@vitest/coverage-v8`；
- Lighthouse 性能/可访问性未测；
- Playwright E2E 未接；
- 没有 `v0.1.0` tag / GitHub Release；
- #16 的真机 FPS/命中率复测仍未闭环。

### 4. 合规（上线前必须处理）

- 地图审图号/底图授权未闭环；README 与 `public/maps/README.md` 已写明公开上线前必须处理；
- 封面与画廊图片来自公开资料/高德评论图片，版权归原作者；ADR 0011 已记录风险，公开商用前需逐张确认或替换；
- 当前站点是公开可访问的 GitHub Pages，严格说已构成公开登载，需尽快确认地图审核口径。

### 5. 待处理的小事

- 未跟踪文件 `docs/research/2026-11-21-cover-sourcing.md` 是早期封面调研，内容已被 ADR 0011 取代；要么补状态说明后入库，要么删除，别直接 `git add .`；
- `feat/detail-decision`、`feat/prerender-main`、`feat/prerender-seo`、`feat/detail-practical` 等分支已合并/过期，可按需清理；
- `docs/PROJECT_PLAN.md` 的测试数、数据数每次改动后要同步；当前是 62 条 / 128 用例。

## 五、关键文件

| 内容       | 文件                                      |
| ---------- | ----------------------------------------- |
| 数据契约   | `src/types/site.ts`                       |
| 数据       | `src/data/sites.ts`                       |
| 高德短链   | `src/data/amap-links.ts`                  |
| 数据校验   | `src/utils/site-validation.ts`            |
| 详情页     | `src/views/SiteDetailView.vue`            |
| 地图       | `src/components/map/AnhuiMap.vue`         |
| 预渲染     | `scripts/prerender-sites.mjs`             |
| 分享图生成 | `scripts/make-og-images.py`               |
| 预渲染 ADR | `docs/adr/0012-prerender-detail-pages.md` |
| 规划/验收  | `docs/PROJECT_PLAN.md`                    |

## 六、接手后建议的顺序

1. `git pull` → `pnpm install` → 跑完整闸门，确认 main 是绿的；
2. 先决定 `77cc466`（画廊直推 main）是否 revert 重提；
3. 恢复 Browser Control / 过一次高德滑块，补第三件 8 条非遗/演艺；
4. 给 12 个头部项目补 `hours` / `ticket`（有来源才填）；
5. 接覆盖率、Lighthouse、E2E，打 `v0.1.0` tag / Release；
6. 处理地图审图号与图片授权，再考虑公开推广。

## 七、操作备注

- **不要直推 main**：本轮已经发生过一次（`77cc466`），后续务必先开分支；
- **预渲染必须在 build 之后**：`pnpm build-only` → `pnpm prerender`；deploy/preview 已写好 `SITE_URL`；
- **预览限制**：GitHub Pages 只有根目录一个 `404.html`，PR 预览的无尾斜杠深链仍可能落到主站 404；预渲染页本身可直接访问；
- **Browser Control**：扩展断开时 `browser-control status` 的 `extension.connected=false`；高德触发滑块时不要绕过，交由人工过验证；
- **数据纪律**：加项目只改 `src/data/sites.ts` + 放图；图片路径必须 `/images/sites/<id>/...webp` 且 ≤300KB；`sources` 必填；`id` 上线后不可改。

## 八、交接检查清单

- [ ] 当前分支不是 main，且工作区只有预期变更
- [ ] `pnpm lint` / `format:check` / `type-check` / `test:unit --run` / `build` / `prerender` 全绿
- [ ] 数据条数与 README / PROJECT_PLAN / 测试硬编码一致
- [ ] 新增项目有封面、来源、高德短链（或明确回退）
- [ ] 没有把低分辨率图、猜的坐标、未核验价格写进数据
- [ ] PR base 是 main，作者不自合
