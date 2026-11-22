# 交接文档 · 乡遇安徽

> 更新时间：2026-11-22 17:15（Asia/Shanghai）
> 当前 main：`77cc466 feat(detail): 12 个头部项目补两组画廊图`（62 条）
> 内容 PR：#136（8 条非遗/场馆，合并后 70 条）
> 线上：https://hldwsd.github.io/xiangyu-map/
> 目标读者：接手本仓库的 A/B 任一方，或下一位 agent。

## 一句话状态

**M0、M1 已完成；M2 的内容、详情页与分享链路基本完成；M3 质量闸门未开始；M4 未开始。**

main 当前是 **70 条数据 + 70 封面 + 70/70 高德短链**（#136 已合并：非遗 1→8、场馆 4→5）。预渲染、每页 OG/JSON-LD、12 个头部项目的分享图与画廊都已在 main。

## 一、这次会话完成了什么

### 1. 完成度文案与键盘入口（#129，已合并）

- 全站“封面为占位/64 条”的旧文案改为真实计数、封面来自公开资料；
- 删掉地图组件里 63 个隐藏 Tab 停靠点，统一走顶部“项目列表”抽屉；
- 顶栏移到 DOM 最前，Tab 顺序从菜单/搜索/列表开始；
- 筛选到 0 条时补空态。

### 2. 详情页高德短链、同城推荐、来源站点名（#130，已合并）

- 不再按经纬度拼 marker；精确 `surl.amap.com` 短链，缺失时回退名称 + 城市搜索；
- 新增“同城其他项目”（同城、同类优先、最多 3 条）；
- 来源从原始 URL 改为站点名，完整 URL 保留在 title/aria-label。

### 3. 预渲染、每页 OG/JSON-LD、12 张分享图（#131 → #133）

- `pnpm prerender` 生成每个详情页的 `dist/site/<id>/index.html`，注入 title、description、canonical、OG/Twitter、`TouristAttraction` JSON-LD；
- 首页也注入站点级 meta；SPA 内跳转同步浏览器标题；
- 12 个头部项目有独立 1200×630 分享图，其余回退 `public/og-cover.jpg`；
- CI / deploy / preview 都接入 prerender；ADR 0012 记录方案。

> 合并历史提醒：#131 当时以 `feat/detail-decision` 为 base，只合进功能分支；#133 才把它带进 main。以后开 PR 前先确认 base 是 main。

### 4. 详情页决策信息与 12 个头部项目画廊（#134 + 直接提交）

- `Site` 新增可选 `practical`：`duration` / `hours` / `ticket` / `audience`；
- 12 个头部项目已填“建议停留”和“适合人群”；
- 12 个头部项目各 2 张 `gallery-*.webp`，详情页“图集”已显示；
- 校验：practical 未知字段、空串、超过 80 字都会报错。

> ⚠️ 流程问题：画廊这批是直接提交到 main 的 `77cc466`，没有走 PR。CI/Deploy 是绿的，也没有 force-push。是否要 revert 后用 `feat/detail-gallery` 重新提交，需要负责人决定。

### 5. 8 条非遗/场馆内容（#136，已合并）

PR #136（已合并）新增：

- 中国宣纸文化园（泾县）
- 老胡开文墨厂（歙县）
- 歙县古城墨砚博物馆
- 汪满田村（鱼灯）
- 傩文化馆（池州）
- 安徽万安罗经文化博物馆
- 冯嘴子村（花鼓灯）
- 中国徽菜博物馆（场馆）

每条有封面、高德短链、来源、practical（时长/适合）。合并后数据 70：黄山 8→13、宣城 6→7、池州 5→6、蚌埠 3→4。

封面来自高德 POI 页公开评论图片，授权口径同现有封面；坐标是千米级近似值，只用于地图发现。

## 二、数据与资产

| 项        | main（77cc466）                                                | 合并 #136 后                                                   |
| --------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| 项目数    | **70**（16 市全部 ≥2）                                         | —                                                              |
| 分类      | 古镇 9 / 非遗 1 / 红色 5 / 自然 29 / 演艺 1 / 乡村 13 / 场馆 4 | 古镇 9 / 非遗 8 / 红色 5 / 自然 29 / 演艺 1 / 乡村 13 / 场馆 5 |
| 封面      | 70/70 WebP ≤300KB                                              | —                                                              |
| 高德短链  | 70/70                                                          | —                                                              |
| 预渲染    | 70 详情 + 首页                                                 | —                                                              |
| 分享图    | 12 个头部独立图 + 默认图                                       | 同左（新条目用默认图）                                         |
| 画廊      | 12 个头部 ×2；其余 50 为空                                     | 12 个头部 ×2；其余 58 为空                                     |
| practical | 12 个头部有 duration/audience                                  | 20 个条目有 duration/audience                                  |
| 单测      | **128 / 10 文件**                                              | 128 / 10 文件                                                  |

## 三、验证结果

main（2026-11-22 16:54 实跑）：

```bash
pnpm lint          # 0
pnpm format:check  # 0
pnpm type-check    # 0
pnpm test:unit --run  # 128/128
pnpm build         # 首屏 JS 259.43 KB gzip
pnpm prerender     # 62 detail + home
```

内容 PR #136（2026-11-22 17:10 实跑）：

```bash
pnpm test:unit --run  # 128/128
pnpm build         # 首屏 JS 261.25 KB gzip
pnpm prerender     # 70 detail + home
```

- main 的 CI、Deploy 最近一次 run 均 success；
- 当前 open PR：#135（本交接文档）、#136（8 条内容）；
- open issue 只剩 **#16（M1 聚合命中率/FPS 真机复测）**；
- #107 已随 #129 关闭。

## 四、未完成与阻塞

### 1. 内容深度

- 12 个头部项目还缺 `hours`（开放时间）和 `ticket`（门票）；必须来自可追溯来源，不能猜；
- 其余 50 个项目还没有画廊（#136 合并后是 58 个）；
- 详情页仍缺“看点”短列表、建议路线、周边联动等更强的决策信息。

### 2. M3 质量闸门（未开始）

- 覆盖率 ≥70% 尚未接 `@vitest/coverage-v8`；
- Lighthouse 性能/可访问性未测；
- Playwright E2E 未接；
- 没有 `v0.1.0` tag / GitHub Release；
- #16 的真机 FPS/命中率复测仍未闭环。

### 3. 合规（上线前必须处理）

- 地图审图号/底图授权未闭环；README 与 `public/maps/README.md` 已写明公开上线前必须处理；
- 封面、画廊、部分新条目图片来自公开资料/高德评论图片，版权归原作者；ADR 0011 已记录风险，公开商用前需逐张确认或替换；
- 当前站点是公开可访问的 GitHub Pages，严格说已构成公开登载，需尽快确认地图审核口径。

### 4. 待处理的小事

- 未跟踪文件 `docs/research/2026-11-21-cover-sourcing.md` 是早期封面调研，内容已被 ADR 0011 取代；要么补状态说明后入库，要么删除，别直接 `git add .`；
- 已合并/过期分支：`feat/detail-decision`、`feat/prerender-main`、`feat/prerender-seo`、`feat/detail-practical`，可按需清理；
- `docs/PROJECT_PLAN.md` 的测试数、数据数每次改动后要同步：合并 #136 后是 **70 条 / 128 用例**；
- 合并 #136 后，本文件的数据快照要同步到 70（当前写的是 main 62 / #136 后 70）。

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
2. 先合并 #136（内容）与 #135（本文件），合并后把 HANDOFF 的数据快照更新到 70；
3. 决定 `77cc466`（画廊直推 main）是否 revert 重提；
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
