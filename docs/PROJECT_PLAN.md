# 乡遇地图 · 项目规划

> 版本：v1.0 ｜ 制定日期：2026-11-18 ｜ 维护人：Hldwsd（A）、xc3122（B）
> 本文件是排期、分工与验收标准的**唯一准绳**；README 只做摘要，不复制排期。

## 项目定位

「乡遇地图」把散落在全国乡镇的文旅项目聚到一张可点击的中国地图上。它不是 OTA 预订平台，而是一个**发现入口**：先用地图建立空间感，再用详情页讲清一个项目"值不值得去、什么时候去、怎么去"。

判断标准：任何一个功能，如果不能让用户更快地"在地图上发现一个项目"或"看懂一个项目"，就不进 MVP。

## 目标与范围

### MVP 要做（In Scope）

| 能力 | 说明 |
| --- | --- |
| 首页中国地图 | 省界轮廓 + 地标点，支持缩放平移、悬停/点击反馈 |
| 地标数据层 | 结构化的项目数据（含坐标、分类、图文、来源），可增删改而无需改代码逻辑 |
| 详情展示 | 点击地标 → 详情卡/详情页，含图文、位置、季节、交通、预约入口 |
| 发现辅助 | 按分类/省份筛选、关键词搜索、列表与地图双向联动 |
| 响应式 | 桌面优先，兼容平板与手机浏览（触摸缩放可用） |
| 质量基线 | 类型检查、lint、核心工具函数单测、自动部署 |

### 明确不做（Out of Scope，至少 v0.3 前不做）

- 用户账号、登录、收藏、评论、UGC 投稿；
- 自建后台 CMS（数据用仓库内 JSON/TS 维护，走 PR 评审）；
- 真实底图瓦片与 POI 搜索（Google/高德/腾讯地图 SDK 接入）；
- 在线支付、票务打通、分销；
- 国际化（先只做简体中文）；
- 小程序端。

### 非功能目标

- 首屏可用（地图出现且可交互）≤ 2.5s（4G / 中端安卓机）；
- 首屏 JS（gzip）≤ 300 KB，地图 GeoJSON（gzip）≤ 250 KB；
- 缩放、平移、点选等交互保持 ≥ 50fps；
- 新增一个文旅项目 = 只改数据文件 + 放图片，不碰组件代码。

## 用户与核心流程

目标用户：计划国内短途/深度游的个人游客，以及做文旅内容的人。

核心流程（MVP 只保证第 1 条走通）：

1. **发现**：进入首页 → 看到中国地图上的地标分布 → 点击某个地标 → 侧栏出现项目摘要 → 进入详情页看完整信息。
2. **筛选**：选择"非遗"分类或某省份 → 地图只保留对应地标 → 列表同步收敛。
3. **检索**（M2 起）：输入"廊桥""梯田" → 命中地标并高亮定位。
4. **深链**：把 `/site/:id` 直接发给朋友，打开即达详情。

## 技术选型与版本基线

选型理由与备选方案对比见 [ADR 0001](adr/0001-tech-stack.md)。版本号取自 npm registry 的 `latest`，核对日期 **2026-11-18**；脚手架落地时以当日版本为准，并把实际版本写进 `package.json`。

| 依赖 | 版本基线 | 说明 |
| --- | --- | --- |
| vue | 3.5.45 | 组合式 API + `<script setup>` |
| vue-router | 5.5.1 | 路由与深链 |
| pinia | 4.1.0 | 筛选条件、选中地标、视图状态 |
| echarts | 6.1.0 | geo/map + scatter，按需引入 |
| vite | 8.3.8 | 要求 Node `^20.19.0 \|\| >=22.12.0` |
| typescript | 7.0.2 | 若 `vue-tsc`/ESLint 生态尚未适配，回退 5.x 并在 PR 里记录原因 |
| vitest | 5.1.1 | 单测 |
| @tauri-apps/cli | 2.12.5 | M4 桌面/移动壳预研 |
| @capacitor/core | 8.6.2 | M4 移动端备选方案 |

运行环境：Node.js 24 LTS（开发机实测 v24.12.0），pnpm 用 corepack 锁定（开发机当前 11.22.0，npm latest 为 12.21.0，升级单独开 PR）。

## 架构与目录

分层原则：**数据 → 状态 → 视图** 单向依赖；平台壳（Web / Tauri）只做外层包装，不污染核心代码，这是后续上桌面端、手机端的提前量。

```text
xiangyu-map/
├─ docs/                      # 规划、协作规范、ADR
├─ public/
│  ├─ maps/china.json         # 中国地图 GeoJSON（M0 落地，需注明来源）
│  └─ images/sites/           # 项目图片，按 site id 建目录
├─ src/
│  ├─ components/
│  │  ├─ map/                 # 地图容器、地标层、图例、Tooltip
│  │  └─ site/                # 详情卡、画廊、列表项
│  ├─ data/sites.ts           # 地标数据（M0 起为示例数据）
│  ├─ router/index.ts         # / 与 /site/:id
│  ├─ stores/                 # Pinia：filters、selection
│  ├─ types/site.ts           # 数据契约（双方评审后冻结）
│  ├─ utils/                  # 坐标、格式化、数据校验
│  ├─ views/
│  │  ├─ HomeView.vue
│  │  └─ SiteDetailView.vue
│  ├─ App.vue
│  └─ main.ts
├─ tests/                     # Vitest 单测
├─ .github/                   # PR / Issue 模板（CI 在 M0 补齐）
├─ package.json
└─ vite.config.ts
```

几个硬约定：

- 地图实例只由 `components/map/` 内的组件持有，其他组件通过 props/emit 或 store 交互，避免多处 `echarts.init` 抢 canvas。
- `src/types/site.ts` 是**接口契约**：字段增删必须双方在 PR 中确认（见协作规范的「契约先行」）。
- ECharts 6 已不再内置中国地图数据（自 5.0 起移除），GeoJSON 必须自备并用 `echarts.registerMap()` 注册；地图数据来源与审图号在 M0 落定（见风险一节）。

示意（仅说明接入方式，落地后以 `src/` 实现为准）：

```ts
import * as echarts from 'echarts/core'
import { MapChart, ScatterChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([MapChart, ScatterChart, GeoComponent, TooltipComponent, CanvasRenderer])

const geo = await fetch('/maps/china.json').then((r) => r.json())
echarts.registerMap('china', geo)
```

## 数据模型与约定

`src/types/site.ts`（M0 定稿）：

```ts
export type SiteCategory = '古镇' | '非遗' | '红色' | '自然' | '演艺' | '乡村'

export interface LngLat {
  lng: number
  lat: number
}

export interface Site {
  id: string           // 稳定 slug，如 'wuzhen'，一旦上线不可改（详情页深链依赖）
  name: string
  category: SiteCategory
  province: string     // 省级行政区全称，如 '浙江省'
  city: string
  location: LngLat     // GCJ-02（高德坐标拾取器取点）
  summary: string      // ≤ 60 字，地图侧栏与列表用
  description: string  // 详情页正文，Markdown
  cover: string        // public/images/sites/<id>/cover.webp
  gallery: string[]
  tags: string[]
  bestSeason?: string
  transport?: string
  bookingUrl?: string
  sources: string[]    // 资料与图片来源，必填，便于版权追溯
  updatedAt: string    // ISO 8601，如 '2026-11-18T10:00:00+08:00'
}
```

示例数据（**示意数据**：坐标为近似占位值，正式数据由 B 在 M0–M2 补齐并附来源）：

```json
{
  "id": "wuzhen",
  "name": "乌镇",
  "category": "古镇",
  "province": "浙江省",
  "city": "嘉兴市",
  "location": { "lng": 120.49, "lat": 30.745 },
  "summary": "枕水人家，西栅夜景与戏剧节是两次不同理由的重访。",
  "description": "江南六大古镇之一，东栅偏生活、西栅偏度假，建议住一晚。",
  "cover": "/images/sites/wuzhen/cover.webp",
  "gallery": ["/images/sites/wuzhen/01.webp"],
  "tags": ["水乡", "夜景", "戏剧节"],
  "bestSeason": "3–5 月、9–11 月",
  "bookingUrl": "https://example.com/booking",
  "sources": ["https://example.com/source"],
  "updatedAt": "2026-11-18T10:00:00+08:00"
}
```

字段规则：

| 规则 | 内容 |
| --- | --- |
| 分类 | 只用 `SiteCategory` 六个值；新增分类需改类型 + 图例配色，单独 PR |
| 坐标 | 统一 GCJ-02；若 geoJSON 底图与取点存在明显偏移（> 1km），统一做一次 WGS-84 → GCJ-02 转换，不逐条手改 |
| 图片 | WebP，单张 ≤ 300 KB，宽度 ≤ 1920px，按 `public/images/sites/<id>/` 存放 |
| 来源 | `sources` 必填：官方站点、开放数据或授权素材；无来源数据不入库 |
| 校验 | 数据在构建期用脚本校验（id 唯一、枚举合法、坐标在国内范围、summary 长度），CI 里必须通过 |

## 团队与分工

| 成员 | 标识 | 侧重 |
| --- | --- | --- |
| Hldwsd（DaiBaikun） | A | 工程基建、地图渲染内核、构建部署、桌面/移动壳、发布 |
| xc3122 | B | 数据模型与内容管线、详情页与信息架构、筛选搜索、测试与规范 |

按**功能纵切**分工，避免两人改同一批文件：

| 模块 | 主责 | 评审 |
| --- | --- | --- |
| 脚手架、构建、CI、部署、Release | A | B |
| 地图渲染与交互（`components/map/`） | A | B |
| 地标数据与校验脚本（`data/`、`utils/`） | B | A |
| 详情页与信息架构（`views/SiteDetailView.vue`） | B | A |
| 筛选 / 搜索 / 列表联动（`stores/`、`components/site/`） | B | A |
| 桌面 / 移动壳（M4） | A | B |
| 文档 | 各模块作者 | 对方 |

协作机制（细节见 [COLLABORATION.md](COLLABORATION.md)）：契约先行、短分支、PR 互评、每周复盘一次。出现分歧时，**先由提出人写 3 行 ADR 草案**（背景/方案/代价），对方 24 小时内表态，仍不一致则按"先做能跑通的最小方案，M3 复盘时再评估替换"处理，不阻塞进度。

## 里程碑与排期

6 周（M0–M3）做出 v0.1.0 网页可用版，再用 2 周（M4）做多端预研，合计 8 周。起始周为 2026-11-18（周三）所在周。

| 里程碑 | 周期 | 日期 | 一句话目标 |
| --- | --- | --- | --- |
| M0 基建 | W1 | 2026-11-18 ~ 11-24 | 脚手架、CI、地图能渲染、数据契约定稿 |
| M1 地图内核 | W2–W3 | 2026-11-25 ~ 12-08 | 地图上出现可点、可缩放、可筛选的地标 |
| M2 内容与交互 | W4–W5 | 2026-12-09 ~ 12-22 | 详情页、搜索、列表联动、三档响应式 |
| M3 质量与上线 | W6 | 2026-12-23 ~ 12-29 | 质量闸门 + 自动部署 + v0.1.0 发布 |
| M4 多端预研 | W7–W8 | 2026-12-30 ~ 2027-01-12 | Tauri 桌面壳跑通，移动端方案出 ADR |

> W7 含元旦假期，排期已按 3 天余额估算；春节（2027-02-06）在窗口之外，不影响。

### M0 基建（W1）

目标：一条命令起服务，一条命令出构建，地图能画出来，数据有契约。

- [ ] 【A】Vite + Vue 3 + TS 脚手架；`package.json` 写入 `engines` 与 `packageManager`，提交 `pnpm-lock.yaml`
- [ ] 【A】ESLint（flat config）+ Prettier + `vue-tsc --noEmit` + Vitest 空跑通过
- [ ] 【A】GitHub Actions：PR 上跑 `lint` / `typecheck` / `test` / `build`
- [ ] 【A】`public/maps/china.json` 落地，`registerMap` 渲染出省界，页面注明来源与审图号占位
- [ ] 【B】`src/types/site.ts` 契约初稿，PR 中 @A 评审后冻结
- [ ] 【B】10 条示例数据 + 数据校验脚本（构建期执行，CI 必过）
- [ ] 【A】部署链路打通（GitHub Pages 或 Vercel），推 main 自动出预览地址
- [ ] 【B】照 README 的「快速开始」在干净目录实跑一遍，修正文档

**DoD**：`pnpm build` 成功；首页可见中国地图轮廓；CI 在 PR 上必跑；新同学按 README 能在 10 分钟内跑起来。

### M1 地图内核（W2–W3）

目标：地标"长得对、点得准、动得顺"。

- 地标渲染：scatter/effectScatter，按分类配色与图标，密度高的区域做视觉聚合
- 交互：`roam` 缩放平移、hover 高亮 + tooltip、点击选中并联动侧栏
- 筛选：分类图例、省份选择（store 驱动，不直接操作 chart 实例）
- 键盘与读屏基础：地标可通过 Tab 聚焦、Enter 打开
- 性能：首次渲染与缩放帧率达标（见质量标准）

**DoD**：60 个地标同时在线不掉帧；点击命中率 100%（含边缘地标）；筛选后地图与数据一致；移动端两指缩放可用且不与页面滚动打架。

### M2 内容与交互（W4–W5）

目标：从"看到点"到"看懂一个项目"。

- `/site/:id` 详情页：图文排版、画廊、位置小图、交通与预约、上下一条导航
- 深链与分享：直达详情、回退保持地图选中态
- 搜索：名称/标签/省份检索，命中后地图定位并高亮
- 列表 ↔ 地图双向联动（悬停/选中互相同步）
- 状态完备：加载骨架、空态、错误态、图片懒加载与失败占位
- 响应式：≥1440 / 768–1439 / <768 三档布局

**DoD**：任一地标可通过 URL 直达；移动端可完成"发现 → 详情"全流程；断网时有明确错误提示而非白屏。

### M3 质量与上线（W6）

目标：能给别人看，且改得动。

- 单测：数据校验、坐标转换、筛选逻辑、路由守卫，核心逻辑覆盖率 ≥ 70%
- 性能预算核验（见下表），超标项必须有优化或书面豁免
- 可访问性：对比度、焦点可见、语义标签、`prefers-reduced-motion`
- 部署：main 自动发布，PR 预览环境
- 发布：打了 tag `v0.1.0`，GitHub Release 写清本期能力与已知问题

**DoD**：Lighthouse 性能桌面 ≥ 85、移动 ≥ 70；构建无 TS 报错与 lint warning；`v0.1.0` Release 可访问。

### M4 多端预研（W7–W8）

目标：验证"一套前端代码包出桌面/手机"的成本，而不是真的做完。

- Tauri 2 桌面壳：复用 `dist/`，跑通 Windows 打包与安装
- 移动端方案对比（Tauri 2 mobile vs Capacitor）：包体、插件生态、地图性能、上架流程
- 适配问题清单：安全区、手势冲突、`back` 键行为、离线缓存
- 产出 ADR 0002（结论 + 代价），以及 v0.2.0 的候选清单

**DoD**：本机产出可安装的 Windows 包；ADR 0002 记录选型结论与遗留问题。

## 工程与质量标准

| 项 | 标准 |
| --- | --- |
| 类型 | `strict: true`，禁止 `any`（确需时写 `unknown` + 收窄，并注释原因） |
| Lint | ESLint + Prettier，提交前 `pnpm lint` 零 warning |
| 测试 | Vitest；核心数据/工具/筛选逻辑覆盖率 ≥ 70%；E2E 在 M3 按需补 Playwright |
| 提交 | Conventional Commits，正文写「为什么」；一个 commit 只做一件事 |
| 评审 | 每个 PR 至少 1 个 approve；作者不能自己合自己的 PR |
| 依赖 | 新增运行时依赖需在 PR 说明体积与替代方案；单次新增 ≥ 100 KB（gzip）需双方同意 |
| 性能预算 | 首屏 JS ≤ 300 KB（gzip）；GeoJSON ≤ 250 KB（gzip）；LCP ≤ 2.5s；交互 ≥ 50fps |
| 兼容 | 最近两个大版本的 Chrome / Edge / Safari / Firefox；iOS Safari 15+；忽略 IE |

## 风险与对策

| 风险 | 概率 | 影响 | 对策 |
| --- | --- | --- | --- |
| **地图合规**：公开登载中国地图需地图审核、标注审图号；互联网地图服务还涉及测绘资质 | 中 | 高（可能被迫下线） | M0 就定底图来源（优先使用官方标准地图服务或已授权底图），页面显著位置标注审图号与来源；上线前向自然资源主管部门/法务确认；先内测不公开访问。依据：《地图管理条例》与自然资源部、工信部 2024 年《关于规范移动互联网应用程序中登载使用地图行为的通知》要求履行地图审核并标示审图号 |
| GeoJSON 体积过大导致首屏慢 | 高 | 中 | 简化边界精度（保留国界与省界）、gzip/brotli、按需加载（先渲染轮廓再补细节）、必要时按大区分片 |
| 移动端地图手势与页面滚动冲突 | 高 | 中 | 用 `touch-action` 与 roam 手势边界控制；进入地图区域时才接管手势；真机测试纳入 M1 DoD |
| 两人并行改同一文件冲突 | 中 | 中 | 功能纵切 + 契约先行；`types/`、`router/`、`main.ts` 改动在 PR 里 @对方；分支存活 ≤ 3 天 |
| 文旅数据真实性与图片版权 | 高 | 中 | `sources` 必填、图片只用授权/自有素材、示例数据显式标注；上线前做一次全量抽查 |
| 后续多端迁移成本 | 中 | 中 | 核心逻辑与平台壳分离；不在组件里直接调浏览器 API（统一走 utils）；M4 用小壳验证而非大改 |
| TS 7 / Vue 生态适配滞后 | 中 | 低 | 脚手架阶段若 `vue-tsc` 或 ESLint 解析器不支持，回退 TypeScript 5.x 并在 PR 记录 |

## 度量与复盘

每周日各写 3 行：本周完成、卡点、下周计划（发在对应 Issue 下，不新建文档）。

项目级验收（v0.1.0）：

- 里程碑按期率（M0–M3 四期）≥ 75%；
- 首屏性能预算全部达标；
- 新增一个项目的耗时 ≤ 30 分钟（只改数据 + 放图）；
- 从任意页面 3 次点击内可达任一项目详情。

## 参考

合规与选型依据（核对日期 2026-11-18）：

- 自然资源部办公厅、工业和信息化部办公厅《关于规范移动互联网应用程序中登载使用地图行为的通知》（2024-05）：要求履行地图审核程序并标示审图号，[报道](https://m.gmw.cn/2024-05/13/content_1303736179.htm)。
- 国家测绘局《关于加强互联网地图管理工作的通知》（国测图发〔2009〕6 号）：未经依法审核批准的互联网地图不得公开登载，[原文](https://f.mnr.gov.cn/202105/t20210510_2631406.html)。
- Apache ECharts 常见问题（地图数据不随包提供，需自行注册 GeoJSON）：https://echarts.apache.org/zh/faq.html。
- Tauri 2.0 稳定版发布说明（桌面 + iOS/Android）：[发布博客](https://github.com/tauri-apps/tauri-docs/blob/e63e51d3b6f9391db758050f278bf62447ac6eb5/src/content/docs/blog/tauri-2.0.mdx)。

