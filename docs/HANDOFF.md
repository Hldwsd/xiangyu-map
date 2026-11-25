# 交接文档 · 乡遇安徽

> 更新时间：2026-11-25 18:10（Asia/Shanghai）
> 当前 main：以 GitHub `main` 为准（多端收尾 PR 合并后）
> 线上：https://hldwsd.github.io/xiangyu-map/ （根路径品牌页，地图在 `/map/`）
> 目标读者：接手本仓库的 A/B 任一方，或下一位 agent。

## 一句话状态

**M0–M4 比赛版已完成：网页 v0.1.0、Windows NSIS、Android arm64 APK 均已交付，启动均进品牌页。**

main 当前有 **70 条数据、70 张封面、70/70 高德短链、20 条 practical、70/70 分享图、12 个头部项目的画廊**；
Windows/Android 安装包见 GitHub Release；Android 经过三轮渲染/滚动优化，真机手感已验收。

## 一、最近完成了什么

### 1. 完成度文案与键盘入口（#129）

- 全站“封面为占位/64 条”的旧文案改为真实计数；
- 删掉地图组件里 63 个隐藏 Tab 停靠点，统一走顶部“项目列表”抽屉；
- 顶栏移到 DOM 最前，Tab 顺序从菜单/搜索/列表开始；
- 筛选到 0 条时补空态。

### 2. 详情页高德短链、同城推荐、来源站点名（#130）

- 不再按经纬度拼 marker；70/70 精确 `surl.amap.com` 短链，缺失时回退名称 + 城市搜索；
- 新增“同城其他项目”（同城、同类优先、最多 3 条）；
- 来源从原始 URL 改为站点名，完整 URL 保留在 title/aria-label。

### 3. 预渲染、每页 OG/JSON-LD、分享图（#131 → #133）

- `pnpm prerender` 生成 70 个 `dist/site/<id>/index.html`，注入 title、description、canonical、OG/Twitter、`TouristAttraction` JSON-LD；
- 首页也注入站点级 meta；SPA 内跳转同步浏览器标题；
- 70 个项目的 1200×630 分享图已接入（11 张人工精选 + 59 张模板生成），数据里全部显式 shareImage；
- CI / deploy / preview 都接入 prerender；ADR 0012 记录方案。

> 合并历史提醒：#131 当时以 `feat/detail-decision` 为 base，只合进功能分支；#133 才把它带进 main。

### 4. 详情页决策信息、12 组画廊、8 条非遗/场馆（#134 / #136）

- `Site` 新增可选 `practical`：`duration` / `hours` / `ticket` / `audience`；当前 20 条有 duration/audience；
- 12 个头部项目各 2 张 `gallery-*.webp`；其余 58 条画廊为空；
- #136 新增 8 条：宣纸、徽墨、歙砚、汪满田鱼灯、池州傩、万安罗盘、冯嘴子花鼓灯、中国徽菜博物馆；
- 数据 62→70：黄山 13、宣城 7、池州 6、蚌埠 4；非遗 8、场馆 5、演艺仍为 1；
- 新条目封面来自高德 POI 页公开评论图片，授权口径同封面（ADR 0011）；坐标是千米级近似值。

> ⚠️ 流程问题：12 组画廊这批是直接提交到 main 的 `77cc466`，没有走 PR。CI/Deploy 是绿的，也没有 force-push。是否要 revert 后用 `feat/detail-gallery` 重新提交，需要负责人决定。

### 5. 地标交互与首屏预算（#139–#147）

- #139：重叠地标先做「小圆环 + 引线 + 真实位置锚点」，并校正 5 条黄山坐标；
- #142：按负责人要求改成**软碰撞小球**；#144–#147 继续修静止判定、悬停力度、选中/冻结、力模型/阻尼、缩放拖动跟随；
- 行为：球停住时仍可互相压住；hover 带一下再回位；选中放大 + 金环；离 home ≤48px；合并模式绕开物理；
- 实现：`src/components/map/marker-physics.ts`；决策记录 [ADR 0013](adr/0013-marker-physics.md)；
- #141/#143：新增 `pnpm bundle:size` 与 CI 首屏体积闸门（JS ≤300 KB、CSS ≤60 KB）。

### 6. M3 起步与手机端修复（#150–#157）

- #150/#152：接 `@vitest/coverage-v8`，核心逻辑 70% 阈值；当前全量语句 **91.84%**、分支 **85.60%**；
- #151：尊重 `prefers-reduced-motion`，reduce 下关入场动画与 hover 拨球；
- #153：手机拖动轻量化（roam 不逐帧 getOption、物理让路、DPR 封顶 2）；真机 p50 17→10ms、Janky 1.75→0.15%，p90 仍 34ms；
- #154/#155：双指缩放阻尼、缩放条防抖、关闭长按系统菜单；窄屏也铺书法背景；
- #156/#157：手机书法背景继续放大到 260%、薄纱 50–62%；
- #158：Playwright E2E 冒烟，桌面 + Pixel 5，跑首页、筛选、搜索、详情深链、预渲染 meta、分享弹层；

### 7. 分享卡片接入（#159 / #160 / 滚动锁定）

- `Site` 增加可选 `shareImage`，70 个项目显式指向 `/og/sites/<id>.jpg`（11 人工 + 59 模板）；徽菜博物馆也已换新封面并生成卡片；
- 预渲染改用 `site.shareImage`，并补 `og:image:type` / `og:image:alt` / `twitter:image:alt`；
- 详情页新增“分享”按钮与弹层：展示当前 1200×630 卡片，支持复制链接、保存图片、系统分享（`navigator.share`）；
- 弹层有 focus trap（Tab 循环、Esc 回焦）；打开时锁定 body 滚动，关闭/卸载恢复；
- E2E 增加分享弹层、专属/默认分享图与焦点/滚动断言。

## 二、当前数据与资产

| 项        | 现状                                                           |
| --------- | -------------------------------------------------------------- |
| 项目数    | **70**（16 个地级市全部 ≥2 条）                                |
| 分类      | 古镇 9 / 非遗 8 / 红色 5 / 自然 29 / 演艺 1 / 乡村 13 / 场馆 5 |
| 封面      | 70/70 WebP，单张 ≤300KB                                        |
| 高德短链  | 70/70，`src/data/amap-links.ts`                                |
| 预渲染    | 70 个详情页 + 首页，`pnpm prerender`                           |
| 分享图    | 70/70 独立图（11 人工 + 59 模板）                              |
| 画廊      | 12 个头部项目 ×2 张；其余 58 条仍为空                          |
| practical | 20 条有 `duration` / `audience`；`hours` / `ticket` 未填       |
| 单测      | **148 个用例 / 14 个文件**，全绿                               |
| E2E       | 6 个场景（桌面 + 移动端；移动端 2 个筛选场景跳过）             |

## 三、验证结果（2026-11-23 11:31 实跑）

```bash
pnpm lint              # 0
pnpm format:check      # 0
pnpm type-check        # 0
pnpm test:unit --run   # 154/154
pnpm test:coverage     # 语句 91.84% / 分支 85.60%（核心逻辑阈值 70%）
pnpm build             # 构建通过
pnpm bundle:size       # 入口 JS 约 267 / 300 KB（89%），CSS 6.75 / 60 KB
pnpm prerender         # 70 detail + home
pnpm test:e2e          # 18 passed, 4 skipped
```

- main 最近一次 CI、Deploy（#234）均 success；
- 本文件 PR 之外没有其他 open PR；open issue 只剩 **#16（M1 小球真机 FPS / 命中率复测）**；
- #107 已随 #129 关闭。

## 四、未完成与风险

### 1. Android 性能已验收（#232–#234）

- 触屏 DPR 1.5、`useDirtyRect`、聚合直接落位、跳过入场动画；
- 关闭 Lenis、固定背景、顶栏毛玻璃；只挂载一个预览卡、触屏关 tooltip；
- 真机（小米 24117RK2CC / Android 16）实测：品牌页滚动 p90 20ms、地图平移 p90 约 14ms、点地标弹窗 p50 27ms；
- 用户已确认「不怎么卡」，#16 的性能验收可收尾；后续只做回归，不再扩大优化范围。

### 2. 内容深度

- 20 条 practical 还缺 `hours`（开放时间）和 `ticket`（门票）；必须有可追溯来源；
- 58 条没有画廊；分享图已覆盖 70/70；
- 演艺只有 1 条（再芬黄梅公馆），内容结构偏自然/乡村；
- 详情页仍缺“看点”短列表、建议路线、周边联动。

### 3. v0.2 内容与窄屏

- 窄屏（360dp）高密度地标已默认合并（PR #168）；
- 20 条 practical 缺 hours/ticket；58 条缺画廊；演艺仍只有 1 条；
- E2E 只有冒烟，地图手势/筛选边界可继续补；
- 首屏入口 JS 已到 86%，再加大功能前要先看预算。

### 4. 合规（上线前必须处理）

- 地图审图号/底图授权未闭环；README 与 `public/maps/README.md` 已写明公开上线前必须处理；
- 封面、画廊、部分新条目图片来自公开资料/高德评论图片，版权归原作者；ADR 0011 已记录风险，公开商用前需逐张确认或替换；
- 当前站点是公开可访问的 GitHub Pages，严格说已构成公开登载，需尽快确认地图审核口径。

### 5. 待处理的小事

- 多端产物已归档到 GitHub Release v0.1.0（Windows setup + Android APK），本地副本在 `release/`（gitignore）；
- 已合并/过期分支可按需清理；
- `docs/PROJECT_PLAN.md` 的测试数、数据数、首屏体积每次改动后要同步：当前 **70 条 / 154 用例 / 约 267 KB 入口 JS**。

## 五、关键文件

| 内容       | 文件                                      |
| ---------- | ----------------------------------------- |
| 数据契约   | `src/types/site.ts`                       |
| 数据       | `src/data/sites.ts`                       |
| 高德短链   | `src/data/amap-links.ts`                  |
| 数据校验   | `src/utils/site-validation.ts`            |
| 详情页     | `src/views/SiteDetailView.vue`            |
| 地图       | `src/components/map/AnhuiMap.vue`         |
| 小球物理   | `src/components/map/marker-physics.ts`    |
| 预渲染     | `scripts/prerender-sites.mjs`             |
| 首屏预算   | `scripts/check-bundle-size.mjs`           |
| E2E        | `playwright.config.ts`、`e2e/`            |
| 分享图生成 | `scripts/make-og-images.py` / `-all.py`   |
| 预渲染 ADR | `docs/adr/0012-prerender-detail-pages.md` |
| 小球 ADR   | `docs/adr/0013-marker-physics.md`         |
| 分享图 ADR | `docs/adr/0014-share-card.md`             |
| 规划/验收  | `docs/PROJECT_PLAN.md`                    |

## 六、接手后建议的顺序

1. `git pull` → `pnpm install` → 跑完整闸门（含 `test:coverage` 与 `test:e2e`），确认 main 是绿的；
2. 做一轮 Android 回归（点地标、拖地图、品牌页滚动），确认 #232–#234 无回退；
3. 补 20 条 hours/ticket、58 条画廊、演艺内容；
4. 补详情页“看点/路线/周边”，进入 v0.2 内容迭代；
5. 处理地图审图号与图片授权，再考虑公开推广；
6. 多端已在 #229–#234 完成，不再开 M4 预研；需要正式分发时补签名与商店素材。

## 七、操作备注

- **不要直推 main**：本轮已经发生过一次（`77cc466`），后续务必先开分支；
- **E2E 前置**：`pnpm build && pnpm prerender` 后再 `pnpm test:e2e`；配置用系统 Chrome（channel=chrome），CI 的 ubuntu-latest 自带；
- **预渲染必须在 build 之后**：`pnpm build-only` → `pnpm prerender`；deploy/preview 已写好 `SITE_URL`；
- **预览限制**：GitHub Pages 只有根目录一个 `404.html`，PR 预览的无尾斜杠深链仍可能落到主站 404；预渲染页加尾斜杠可直接访问；
- **Browser Control**：扩展断开时 `browser-control status` 的 `extension.connected=false`；高德触发滑块时不要绕过，交由人工过验证；
- **数据纪律**：加项目只改 `src/data/sites.ts` + 放图；图片路径必须 `/images/sites/<id>/...webp` 且 ≤300KB；`sources` 必填；`id` 上线后不可改。

## 八、交接检查清单

- [ ] 当前分支不是 main，且工作区只有预期变更
- [ ] `pnpm lint` / `format:check` / `type-check` / `test:unit --run` / `test:coverage` / `build` / `bundle:size` / `prerender` / `test:e2e` 全绿
- [ ] 数据条数与 README / PROJECT_PLAN / 测试硬编码一致
- [ ] 新增项目有封面、来源、高德短链（或明确回退）
- [ ] 没有把低分辨率图、猜的坐标、未核验价格写进数据
- [ ] PR base 是 main，作者不自合
- #186：地图去掉市界/省界描边与首页书法背景（品牌页保留）；省界光晕系列一并移除。
