# 乡遇安徽 · 项目规划

> 版本：v1.2 ｜ 制定日期：2026-11-18 ｜ 修订：2026-11-19 范围收窄到安徽省（[ADR 0002](adr/0002-scope-anhui.md)）、项目中文名定为「乡遇安徽」 ｜ 维护人：Hldwsd（A）、xc3122（B）
> 本文件是排期、分工与验收标准的**唯一准绳**；README 只做摘要，不复制排期。

## 项目定位

「乡遇安徽」把安徽各地散落的文旅项目聚到一张可点击的安徽省地图上，地图按 16 个地级市分区。它不是 OTA 预订平台，而是一个**发现入口**：先用地图建立空间感，再用详情页讲清一个项目"值不值得去、什么时候去、怎么去"。

判断标准：任何一个功能，如果不能让用户更快地"在地图上发现一个项目"或"看懂一个项目"，就不进 MVP。

## 目标与范围

### MVP 要做（In Scope）

| 能力         | 说明                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| 首页安徽地图 | 16 个地级市分区轮廓 + 市名 + 地标点，支持缩放平移、悬停/点击反馈       |
| 地标数据层   | 结构化的项目数据（含坐标、分类、图文、来源），可增删改而无需改代码逻辑 |
| 详情展示     | 点击地标 → 详情卡/详情页，含图文、位置、季节、交通、预约入口           |
| 发现辅助     | 按分类/城市筛选、关键词搜索、列表与地图双向联动                        |
| 响应式       | 桌面优先，兼容平板与手机浏览（触摸缩放可用）                           |
| 质量基线     | 类型检查、lint、核心工具函数单测、自动部署                             |

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

1. **发现**：进入首页 → 看到安徽省地图上按 16 个地级市划分的地标分布 → 点击某个地标 → 侧栏出现项目摘要 → 进入详情页看完整信息。
2. **筛选**：选择"非遗"分类或某个城市（如黄山市）→ 地图只保留对应地标 → 列表同步收敛。
3. **检索**（M2 起）：输入"廊桥""梯田" → 命中地标并高亮定位。
4. **深链**：把 `/site/:id` 直接发给朋友，打开即达详情。

## 技术选型与版本基线

选型理由与备选方案对比见 [ADR 0001](adr/0001-tech-stack.md)。`npm latest` 取自 npm registry，核对日期 **2026-11-18**；`实际落地` 是 M0 脚手架跑通后 lockfile 里的版本，两者不一致时必须在 PR 里写明原因。

| 依赖            | npm latest | 实际落地 | 说明                                                                                     |
| --------------- | ---------- | -------- | ---------------------------------------------------------------------------------------- |
| vue             | 3.5.45     | 3.5.45   | 组合式 API + `<script setup>`                                                            |
| vue-router      | 5.5.1      | 5.5.1    | 路由与深链                                                                               |
| pinia           | 4.1.0      | 4.1.0    | 筛选条件、选中地标、视图状态                                                             |
| echarts         | 6.1.0      | 6.1.0    | geo + scatter，按需引入（首屏 JS 224.7 KB gzip）                                         |
| vite            | 8.3.8      | 8.3.8    | 要求 Node `^20.19.0 \|\| >=22.12.0`                                                      |
| typescript      | 7.0.2      | 6.0.3    | **回退分支已触发**：`vue-tsc` 3.3 尚不支持 TS 7，先用 6.0.x                              |
| vitest          | 5.1.1      | 4.1.12   | 跟随 create-vue 官方模板的组合（模板锁 `vitest ^4.1.11` + `vite ^8.2.2`），升级单独开 PR |
| prettier        | —          | 3.10.1   | 格式化；CI 跑 `format:check`                                                             |
| @tauri-apps/cli | 2.12.5     | —        | M4 引入                                                                                  |
| @capacitor/core | 8.6.2      | —        | M4 备选方案                                                                              |

版本以 `pnpm-lock.yaml` 为唯一准绳，本表只用于回答「为什么是这几个」。

运行环境：Node.js 24 LTS（开发机实测 v24.12.0），pnpm 用 corepack 锁定（开发机当前 11.22.0，npm latest 为 12.21.0，升级单独开 PR）。

## 架构与目录

分层原则：**数据 → 状态 → 视图** 单向依赖；平台壳（Web / Tauri）只做外层包装，不污染核心代码，这是后续上桌面端、手机端的提前量。

```text
xiangyu-map/
├─ docs/                          # 规划、协作规范、ADR
├─ public/
│  ├─ maps/anhui.json             # 安徽省 GeoJSON（16 个市级要素，124.3 KB / gzip 39.8 KB）
│  ├─ maps/README.md              # 底图来源、sha256、合规提示
│  └─ images/placeholder.svg      # 示例数据统一占位图；正式图放 images/sites/<id>/
├─ scripts/fetch-anhui-map.mjs    # 重新抓取底图（pnpm data:anhui-map）
├─ src/
│  ├─ assets/main.css             # 设计变量与全局样式
│  ├─ components/
│  │  ├─ map/AnhuiMap.vue         # 唯一创建/销毁 ECharts 实例的地方
│  │  ├─ map/anhui-map-option.ts  # 纯函数构建 option（可直接单测）
│  │  └─ site/CategoryFilter.vue、site/SitePanel.vue
│  ├─ data/sites.ts               # 地标数据（当前 10 条示例）
│  ├─ router/index.ts             # / 与 /site/:id（详情页按需加载）
│  ├─ services/anhui-map-loader.ts # 底图加载与缓存，全站唯一的 fetch 出口
│  ├─ stores/sites.ts             # 数据 + 筛选 + 选中态
│  ├─ types/site.ts               # 数据契约（双方评审后冻结）
│  ├─ utils/site-validation.ts    # 运行时校验：启动即校验，失败抛 SiteDataError
│  ├─ views/HomeView.vue、views/SiteDetailView.vue
│  ├─ __tests__/                  # Vitest 单测（4 个文件 / 48 个用例）
│  ├─ App.vue
│  └─ main.ts
├─ .github/workflows/ci.yml       # PR 上跑 lint / format / typecheck / test / build
├─ package.json
└─ vite.config.ts
```

几个硬约定：

- 地图实例只由 `components/map/` 内的组件持有，其他组件通过 props/emit 或 store 交互，避免多处 `echarts.init` 抢 canvas。
- `src/types/site.ts` 是**接口契约**：字段增删必须双方在 PR 中确认（见协作规范的「契约先行」）。
- ECharts 6 已不再内置地图数据（自 5.0 起移除），GeoJSON 必须自备并用 `echarts.registerMap()` 注册。本项目底图是 DataV.GeoAtlas 的安徽省市级轮廓（16 个要素），来源、sha256 与审图号待办记在 `public/maps/README.md`。

示意（仅说明接入方式，落地后以 `src/` 实现为准）：

```ts
// src/services/anhui-map-loader.ts —— 全站唯一调用 fetch 的地方
const geoJson = await loadAnhuiMap() // 同一会话只请求一次，失败清缓存可重试

// src/components/map/AnhuiMap.vue —— 唯一持有实例的地方
echarts.registerMap(ANHUI_MAP_NAME, geoJson)
chart.value?.setOption(buildAnhuiMapOption(sites, selectedId))
```

## 数据模型与约定

`src/types/site.ts`（M0 定稿）：

```ts
export type SiteCategory = '古镇' | '非遗' | '红色' | '自然' | '演艺' | '乡村'

// 当前范围只有安徽，所以省份是字面量、城市是 16 个地级市的联合类型：
// 写错一个字的城市名在编译期就被拦下，而不是等到筛选时静默落空。
export const ANHUI_PROVINCE = '安徽省' as const
export const ANHUI_CITIES = [
  '合肥市',
  '芜湖市',
  '蚌埠市',
  '淮南市',
  '马鞍山市',
  '淮北市',
  '铜陵市',
  '安庆市',
  '黄山市',
  '滁州市',
  '阜阳市',
  '宿州市',
  '六安市',
  '亳州市',
  '池州市',
  '宣城市',
] as const
export type AnhuiCity = (typeof ANHUI_CITIES)[number]

export interface LngLat {
  lng: number
  lat: number
}

export interface Site {
  id: string // 稳定 slug，如 'hongcun'，一旦上线不可改（详情页深链依赖）
  name: string
  category: SiteCategory
  province: typeof ANHUI_PROVINCE // 字面量：当前只有安徽
  city: AnhuiCity // 必须是 16 个地级市之一；地图分区与筛选都依赖它
  location: LngLat // GCJ-02（高德坐标拾取器取点）
  summary: string // ≤ 60 字，地图侧栏与列表用
  description: string // 详情页正文，纯文本；空行分段
  cover: string // 封面：正式图 public/images/sites/<id>/cover.webp，示例数据用占位图
  gallery: string[]
  tags: string[]
  bestSeason?: string
  transport?: string
  bookingUrl?: string
  sources: string[] // 资料与图片来源，必填，便于版权追溯
  updatedAt: string // 最后更新日期，YYYY-MM-DD
}
```

示例数据（**示例占位**：坐标是近似值、文案为编辑示例、来源为 example.com 占位；正式数据入库前必须补可核验来源）：

```json
{
  "id": "hongcun",
  "name": "宏村",
  "category": "乡村",
  "province": "安徽省",
  "city": "黄山市",
  "location": { "lng": 117.988, "lat": 29.996 },
  "summary": "牛形水系串起月沼与南湖的古村落，白墙黛瓦倒映在水面，清晨最安静。",
  "description": "宏村的水系按牛形布局，水圳从每家门前流过，月沼与南湖是两处最开阔的水面。",
  "cover": "/images/placeholder.svg",
  "gallery": [],
  "tags": ["示例数据", "徽派", "村落"],
  "bestSeason": "3-4 月、11 月",
  "transport": "黄山北站转乘至黟县，再换乘至宏村。",
  "sources": ["https://example.com/sites/hongcun"],
  "updatedAt": "2026-11-19"
}
```

字段规则：

| 规则 | 内容                                                                                                                                                                                     |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 分类 | 只用 `SiteCategory` 六个值；新增分类需改类型 + 图例配色，单独 PR                                                                                                                         |
| 坐标 | 统一 GCJ-02；若 geoJSON 底图与取点存在明显偏移（> 1km），统一做一次 WGS-84 → GCJ-02 转换，不逐条手改                                                                                     |
| 图片 | WebP，单张 ≤ 300 KB，宽度 ≤ 1920px，按 `public/images/sites/<id>/` 存放；数据里写站点根路径（`/images/...`），渲染时用 `src/utils/asset-url.ts` 的 `assetUrl()` 套部署基地址             |
| 来源 | `sources` 必填：官方站点、开放数据或授权素材；无来源数据不入库                                                                                                                           |
| 校验 | 启动时校验：id 唯一与格式、分类枚举、省份固定为安徽省、城市属于 16 个地级市、坐标落在安徽省外包框内、summary 长度、图片路径与 id 一致、updatedAt 真实日期；单测覆盖真实数据，CI 必须通过 |

## 团队与分工

| 成员                | 标识 | 侧重                                                       |
| ------------------- | ---- | ---------------------------------------------------------- |
| Hldwsd（DaiBaikun） | A    | 工程基建、地图渲染内核、构建部署、桌面/移动壳、发布        |
| xc3122              | B    | 数据模型与内容管线、详情页与信息架构、筛选搜索、测试与规范 |

按**功能纵切**分工，避免两人改同一批文件：

| 模块                                                    | 主责       | 评审 |
| ------------------------------------------------------- | ---------- | ---- |
| 脚手架、构建、CI、部署、Release                         | A          | B    |
| 地图渲染与交互（`components/map/`）                     | A          | B    |
| 地标数据与校验脚本（`data/`、`utils/`）                 | B          | A    |
| 详情页与信息架构（`views/SiteDetailView.vue`）          | B          | A    |
| 筛选 / 搜索 / 列表联动（`stores/`、`components/site/`） | B          | A    |
| 桌面 / 移动壳（M4）                                     | A          | B    |
| 文档                                                    | 各模块作者 | 对方 |

协作机制（细节见 [COLLABORATION.md](COLLABORATION.md)）：契约先行、短分支、PR 互评、每周复盘一次。出现分歧时，**先由提出人写 3 行 ADR 草案**（背景/方案/代价），对方 24 小时内表态，仍不一致则按"先做能跑通的最小方案，M3 复盘时再评估替换"处理，不阻塞进度。

## 里程碑与排期

6 周（M0–M3）做出 v0.1.0 网页可用版，再用 2 周（M4）做多端预研，合计 8 周。起始周为 2026-11-18（周三）所在周。

| 里程碑        | 周期  | 日期                    | 一句话目标                           |
| ------------- | ----- | ----------------------- | ------------------------------------ |
| M0 基建       | W1    | 2026-11-18 ~ 11-24      | 脚手架、CI、地图能渲染、数据契约定稿 |
| M1 地图内核   | W2–W3 | 2026-11-25 ~ 12-08      | 地图上出现可点、可缩放、可筛选的地标 |
| M2 内容与交互 | W4–W5 | 2026-12-09 ~ 12-22      | 详情页、搜索、列表联动、三档响应式   |
| M3 质量与上线 | W6    | 2026-12-23 ~ 12-29      | 质量闸门 + 自动部署 + v0.1.0 发布    |
| M4 多端预研   | W7–W8 | 2026-12-30 ~ 2027-01-12 | Tauri 桌面壳跑通，移动端方案出 ADR   |

> W7 含元旦假期，排期已按 3 天余额估算；春节（2027-02-06）在窗口之外，不影响。

### M0 基建（W1）

目标：一条命令起服务，一条命令出构建，地图能画出来，数据有契约。

- [x] 【A】Vite + Vue 3 + TS 脚手架；`package.json` 写入 `engines` 与 `packageManager`，提交 `pnpm-lock.yaml`
- [x] 【A】ESLint（flat config）+ Prettier + `vue-tsc --build` + Vitest 通过（4 个文件 / 48 个用例）
- [x] 【A】GitHub Actions：PR 上跑 `lint` / `format:check` / `type-check` / `test:unit` / `build`
- [x] 【A】`public/maps/anhui.json` 落地（16 个市级要素，gzip 39.8 KB），`registerMap` 渲染出 16 个地级市边界与市名，页脚与 `public/maps/README.md` 注明来源、审图号待办
- [x] 【B】`src/types/site.ts` 契约初稿 + `utils/site-validation.ts` 校验实现，PR 中 @A 评审后冻结
- [x] 【B】10 条示例数据（全部标注「示例数据」），校验在 store 初始化时执行，校验失败直接抛 `SiteDataError`
- [x] 【A】部署链路打通（[ADR 0003](adr/0003-deployment.md)）：GitHub Pages 分支发布 `https://hldwsd.github.io/xiangyu-map/`，PR 走 `/pr-<n>/` 子目录预览并在评论里维护链接；资源路径统一走 `import.meta.env.BASE_URL`（`src/utils/asset-url.ts`），`404.html` 兜底深链
- [x] 【A】范围收窄到安徽省（[ADR 0002](adr/0002-scope-anhui.md)）：底图换 `anhui.json`（16 市）、`province` 固定 + `city` 收成 16 市联合类型、校验换 `ANHUI_BBOX` 与市级白名单、10 条示例数据与 48 个用例同步
- [x] 【B】照 README 的「快速开始」在干净目录实跑一遍，修正文档（A 已实测，见下；B 合并前置 checkout 复核）

**DoD 进度**：`pnpm build` 成功 ✅；首页可见安徽省 16 个地级市的分区轮廓与市名 ✅（含 10 个可点击地标）；CI 在 PR 上必跑 ✅（配置已提交，首次运行见本 PR 的 checks）；新同学按 README 10 分钟跑起来 ✅（2026-11-18 在全新克隆目录实测：`pnpm install --frozen-lockfile` 3 分 14 秒 + `pnpm build` 0.5 秒，产物与开发机一致）；`main` 合并自动部署 + PR 预览 ✅（2026-11-19，见 [ADR 0003](adr/0003-deployment.md)）。

**M0 起已可用的手感验证**（M0 交付时实测）：点击地标 → 侧栏摘要 → 详情页；分类筛选与关键词搜索联动列表与地图；窗口缩到 500px 宽自动切单列。

### M1 地图内核（W2–W3）

目标：地标"长得对、点得准、动得顺"。

- 地标渲染：scatter/effectScatter，按分类配色与图标，密度高的区域做视觉聚合
- 交互：`roam` 缩放平移、hover 高亮 + tooltip、点击选中并联动侧栏
- 筛选：分类图例、城市选择（16 个地级市，store 驱动，不直接操作 chart 实例）
- 键盘与读屏基础：地标可通过 Tab 聚焦、Enter 打开
- 性能：首次渲染与缩放帧率达标（见质量标准）

**DoD**：60 个地标同时在线不掉帧；点击命中率 100%（含边缘地标）；筛选后地图与数据一致；移动端两指缩放可用且不与页面滚动打架。

### M2 内容与交互（W4–W5）

目标：从"看到点"到"看懂一个项目"。

- `/site/:id` 详情页：图文排版、画廊、位置小图、交通与预约、上下一条导航
- 深链与分享：直达详情、回退保持地图选中态
- 搜索：名称/标签/城市检索，命中后地图定位并高亮
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
- 产出 ADR 0004（结论 + 代价），以及 v0.2.0 的候选清单

**DoD**：本机产出可安装的 Windows 包；ADR 0004 记录选型结论与遗留问题。

## 工程与质量标准

| 项       | 标准                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| 类型     | `strict: true`，禁止 `any`（确需时写 `unknown` + 收窄，并注释原因）           |
| Lint     | ESLint + Prettier，提交前 `pnpm lint` 零 warning                              |
| 测试     | Vitest；核心数据/工具/筛选逻辑覆盖率 ≥ 70%；E2E 在 M3 按需补 Playwright       |
| 提交     | Conventional Commits，正文写「为什么」；一个 commit 只做一件事                |
| 评审     | 每个 PR 至少 1 个 approve；作者不能自己合自己的 PR                            |
| 依赖     | 新增运行时依赖需在 PR 说明体积与替代方案；单次新增 ≥ 100 KB（gzip）需双方同意 |
| 性能预算 | 首屏 JS ≤ 300 KB（gzip）；GeoJSON ≤ 250 KB（gzip）；LCP ≤ 2.5s；交互 ≥ 50fps  |
| 兼容     | 最近两个大版本的 Chrome / Edge / Safari / Firefox；iOS Safari 15+；忽略 IE    |

## 风险与对策

| 风险                                                                                     | 概率 | 影响               | 对策                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------- | ---- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **地图合规**：公开登载安徽省地图同样需地图审核、标注审图号；互联网地图服务还涉及测绘资质 | 中   | 高（可能被迫下线） | M0 就定底图来源（优先使用官方标准地图服务或已授权底图），页面显著位置标注审图号与来源；上线前向自然资源主管部门/法务确认；先内测不公开访问。依据：《地图管理条例》与自然资源部、工信部 2024 年《关于规范移动互联网应用程序中登载使用地图行为的通知》要求履行地图审核并标示审图号 |
| GeoJSON 体积过大导致首屏慢                                                               | 低   | 中                 | 当前安徽省底图 gzip 39.8 KB，距 250 KB 预算余量很大；扩到多省/全国时再按省分片加载，并重新核算预算                                                                                                                                                                               |
| 移动端地图手势与页面滚动冲突                                                             | 高   | 中                 | 用 `touch-action` 与 roam 手势边界控制；进入地图区域时才接管手势；真机测试纳入 M1 DoD                                                                                                                                                                                            |
| 两人并行改同一文件冲突                                                                   | 中   | 中                 | 功能纵切 + 契约先行；`types/`、`router/`、`main.ts` 改动在 PR 里 @对方；分支存活 ≤ 3 天                                                                                                                                                                                          |
| 文旅数据真实性与图片版权                                                                 | 高   | 中                 | `sources` 必填、图片只用授权/自有素材、示例数据显式标注；上线前做一次全量抽查                                                                                                                                                                                                    |
| 后续多端迁移成本                                                                         | 中   | 中                 | 核心逻辑与平台壳分离；不在组件里直接调浏览器 API（统一走 utils）；M4 用小壳验证而非大改                                                                                                                                                                                          |
| TS 7 / Vue 生态适配滞后                                                                  | 中   | 低                 | **已触发**：`vue-tsc` 3.3 尚不支持 TS 7，M0 落地为 TypeScript 6.0.3（见本 PR 说明）；待生态跟进后单独开 PR 升级                                                                                                                                                                  |
| 依赖下载失败（镜像抖动/超时）                                                            | 中   | 低                 | CI 用 `--frozen-lockfile`；本地首次安装失败时用 `pnpm install --fetch-retries=10 --fetch-timeout=900000 --network-concurrency=3`，不要删 lockfile 重装                                                                                                                           |

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
