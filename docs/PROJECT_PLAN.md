# 乡遇安徽 · 项目规划

> 版本：v1.3 ｜ 制定日期：2026-11-18 ｜ 修订：2026-11-19 范围收窄到安徽省（[ADR 0002](adr/0002-scope-anhui.md)）、项目中文名定为「乡遇安徽」；2026-11-21 同步进度（M1 已交付、M2 进行中、视觉改「纸本墨线」、OSM 署名落地） ｜ 维护人：Hldwsd（A）、xc3122（B）
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
│  ├─ maps/anhui.json             # 主底图：16 个地级市面（gzip 39.8 KB）
│  ├─ maps/anhui-outline.json     # 省界轮廓，用于渐隐光晕（gzip 15 KB）
│  ├─ maps/anhui-water.json       # 9 个湖泊水面（OSM / ODbL）
│  ├─ maps/anhui-rivers.json      # 长江、淮河河道线（OSM / ODbL）
│  ├─ maps/anhui-districts.json   # 区县界线 104 个（默认加载，菜单可关）
│  ├─ maps/README.md              # 图层来源、sha256、ODbL 与审图号提示
│  ├─ images/bg-calligraphy.webp  # 背景书法（邓石如《少学琴书册》墨迹）
│  ├─ images/placeholder.svg      # 占位图；正式图放 images/sites/<id>/
│  └─ og-cover.jpg                # 默认分享图（1200×630）
├─ scripts/fetch-anhui-*.mjs      # 四个图层抓取脚本（pnpm data:anhui-*）
├─ scripts/prerender-sites.mjs    # 构建后生成 70 个详情页静态 HTML（pnpm prerender）
├─ src/
│  ├─ assets/main.css、tokens.css # 全局样式与设计变量（纸本墨线）
│  ├─ components/
│  │  ├─ map/AnhuiMap.vue         # 唯一创建/销毁 ECharts 实例的地方
│  │  ├─ map/anhui-map-option.ts  # 纯函数构建 option（可直接单测）
│  │  ├─ map/merge-map-layers.ts  # 市界/水域/区县合并成一张底图
│  │  ├─ map/cluster-sites.ts     # 密集地标的屏幕像素聚合
│  │  ├─ map/marker-physics.ts    # 小球软碰撞/回位/nudge（ADR 0013）
│  │  ├─ home/HomeRail.vue        # 左侧版头（图例、精选、版记）
│  │  ├─ home/CategoryLegend.vue  # 分类图例（版头与左抽屉共用）
│  │  ├─ layout/TopBar.vue        # 常显顶栏：菜单/搜索/列表
│  │  ├─ layout/MenuDrawer.vue    # 菜单：图层开关、关于与署名
│  │  ├─ layout/EdgeDrawer.vue    # 窄屏左右抽拉（分类/城市）
│  │  ├─ icons/                   # S1 线稿图标与分类字形
│  │  └─ site/SitePanel.vue       # 选中地标摘要卡
│  ├─ data/sites.ts               # 地标数据（当前 70 条，可核验来源）
│  ├─ data/amap-links.ts          # 高德精确 POI 短链（按 site id，缺失时按名称搜索）
│  ├─ router/index.ts             # / 与 /site/:id（详情页按需加载）
│  ├─ services/anhui-map-loader.ts # 底图与图层加载、缓存，全站唯一 fetch 出口
│  ├─ stores/sites.ts             # 数据 + 筛选 + 选中态
│  ├─ types/site.ts               # 数据契约（双方评审后冻结）
│  ├─ utils/site-validation.ts    # 运行时校验：启动即校验，失败抛 SiteDataError
│  ├─ views/HomeView.vue、views/SiteDetailView.vue
│  ├─ __tests__/                  # Vitest 单测（14 个文件 / 148 个用例）
│  ├─ App.vue
│  └─ main.ts
├─ e2e/                           # Playwright 冒烟（桌面 + 移动端）
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
  shareImage?: string // 分享卡片图：/og/sites/<id>.jpg；缺省用 public/og-cover.jpg
  gallery: string[]
  tags: string[]
  bestSeason?: string
  transport?: string
  practical?: {
    duration?: string // 建议停留
    hours?: string // 开放时间
    ticket?: string // 门票/预约提示
    audience?: string // 适合人群/玩法
  }
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
  "shareImage": "/og/sites/hongcun.jpg",
  "gallery": [],
  "tags": ["示例数据", "徽派", "村落"],
  "bestSeason": "3-4 月、11 月",
  "transport": "黄山北站转乘至黟县，再换乘至宏村。",
  "sources": ["https://example.com/sites/hongcun"],
  "updatedAt": "2026-11-19"
}
```

字段规则：

| 规则     | 内容                                                                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 分类     | 只用 `SiteCategory` 七个值（2026-11-21 新增「场馆」，见 ADR 0010）；新增分类需改类型 + 图例配色，单独 PR                                                                                 |
| 坐标     | 统一 GCJ-02；若 geoJSON 底图与取点存在明显偏移（> 1km），统一做一次 WGS-84 → GCJ-02 转换，不逐条手改                                                                                     |
| 图片     | WebP，单张 ≤ 300 KB，宽度 ≤ 1920px，按 `public/images/sites/<id>/` 存放；数据里写站点根路径（`/images/...`），渲染时用 `src/utils/asset-url.ts` 的 `assetUrl()` 套部署基地址             |
| 来源     | `sources` 必填：官方站点、开放数据或授权素材；无来源数据不入库                                                                                                                           |
| 分享图   | `shareImage` 可选：`/og/sites/<id>.jpg`，文件名必须与 id 一致；缺省回退 `public/og-cover.jpg`；详情页分享弹层与 OG/Twitter 共用                                                          |
| 实用信息 | `practical` 可选：`duration` / `hours` / `ticket` / `audience`，每项 ≤ 80 字；没有可靠来源就留空，不写“约”“仅供参考”凑数                                                                 |
| 校验     | 启动时校验：id 唯一与格式、分类枚举、省份固定为安徽省、城市属于 16 个地级市、坐标落在安徽省外包框内、summary 长度、图片路径与 id 一致、updatedAt 真实日期；单测覆盖真实数据，CI 必须通过 |

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

**进度快照（2026-11-23，可直接对照线上版）**

| 项               | 目标              | 现状                                                                                                         |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| 地标数据         | 60 条（M1）       | **70 条**可核验（M1 的 60 条目标已达成）；16 市全部 ≥2 条；**「示例数据」标签已清零**；**封面 70/70 已置入** |
| 单元测试         | 覆盖率 ≥ 70%      | **148 个用例 / 14 个文件**，全绿；覆盖率闸门已接（语句 91.84% / 分支 85.60%）                                |
| 首屏 JS（gzip）  | ≤ 300 KB          | **256.6 KB**（入口 JS；构建总量 265.4 KB）                                                                   |
| 底图体积（gzip） | ≤ 250 KB          | 市 41 + 省界 17 + 湖 11 + 河 3 + 区县 126 = **198 KB**                                                       |
| 线上             | main 自动发布     | https://hldwsd.github.io/xiangyu-map/ （main 自动发布，资源哈希随构建变化）                                  |
| 合规             | 审图号 + OSM 署名 | OSM ODbL 已署名（页脚/版记/关于）；**审图号待办**                                                            |

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

- 地标渲染：scatter/effectScatter，按分类配色与形状图标；密度高的区域按**屏幕像素**聚合成带数量的点，点击放大直到分开
- 交互：`roam` 缩放平移、hover 高亮 + tooltip、点击选中并联动侧栏、双击还原视野
- 筛选：分类图例、城市选择（16 个地级市，store 驱动，不直接操作 chart 实例）
- 键盘与读屏基础：地标可通过 Tab 聚焦、Enter 打开
- 性能：首次渲染与缩放帧率达标（见质量标准）

**DoD**：60 个地标同时在线不掉帧；点击命中率 100%（含边缘地标）；筛选后地图与数据一致；移动端两指缩放可用且不与页面滚动打架。

**M1 进度**（截至 2026-11-22，**M1 交付项已完成**）：

- 已落地：分类形状 + 配色、命中尺寸、双击还原视野、键盘与读屏入口、密集聚合
  （`cluster-sites.ts` + 点击放大）、ECharts 原生 roam（滚轮/双指/拖动 + 中心夹取）、
  缩放条、区县界开关（默认开）、省界渐隐光晕、湖泊 9 个、长江/淮河河道 193 段。
- 地标交互演进：重叠点先尝试圆环 + 引线（#139），后改为软碰撞小球（#142–#147，
  [ADR 0013](adr/0013-marker-physics.md)）；缩放/拖动时跟随 home 平移，不再重置。
- 数据：**70 条可核验**（16 市全部 ≥2 条，M1 目标 60 已达成）；**「示例数据」标签已清零**（#102），头部 10 条文案按真实信息重写、来源升级为 UNESCO/百科/政府页；封面 70/70 已置入（公开资料，授权状态见 [ADR 0011](adr/0011-cover-source-baike.md)）。
- 剩余：**小球真机 FPS、移动端触摸命中、聚合/筛选组合回归**（[Issue #16](https://github.com/Hldwsd/xiangyu-map/issues/16)；
  ego 会话里 rAF 被节流，测不准）；`prefers-reduced-motion` 已由 #151 关闭入场与 hover 拨球。

### M2 内容与交互（W4–W5）

目标：从"看到点"到"看懂一个项目"。

- 视觉语言：**纸本墨线**——米白纸、墨线、宋体标题、金色点睛，颜色与字号统一走 `src/assets/tokens.css`，
  分类靠形状区分（[ADR 0007](adr/0007-ink-paper-home.md) 取代早先的黑白极简方向；[ADR 0004](adr/0004-visual-language.md) 保留为历史理由）
- `/site/:id` 详情页：图文排版、画廊、位置小图、交通与预约、上下一条导航
- 深链与分享：直达详情、回退保持地图选中态
- 搜索：名称/标签/城市检索，命中后地图定位并高亮
- 列表 ↔ 地图双向联动（悬停/选中互相同步）
- 状态完备：加载骨架、空态、错误态、图片懒加载与失败占位
- 响应式：≥1200（右栏 + 边缘标签退场）/ 768–1199（隐藏右栏、左右竖排边缘标签）/ <768（单列）三档，另有 900（地图）、720（详情页）与 760/820（按高度）两档微调；实测见 docs/research/2026-11-21-responsive-audit.md

**DoD**：任一地标可通过 URL 直达；移动端可完成"发现 → 详情"全流程；断网时有明确错误提示而非白屏。

**M2 进度**（截至 2026-11-22）：

- 详情页、深链、搜索、列表抽屉、城市索引、三档响应式（≥1200 双栏 + 左右抽拉、<1200 边签）已落地；
- 顶栏融合了搜索/菜单/列表，筛选收进菜单与图例，去掉独立筛选浮层；
- 视觉完成两轮：纸本墨线 → 「版式融合 + 省界光晕 + cover 背景」；
- 封面：**70/70 已置入**，素材来源与授权风险见 [ADR 0011](adr/0011-cover-source-baike.md)；
- 详情页：新增高德地点链接（70/70 精确 POI 短链已置入，缺失时按名称 + 城市搜索，不拼经纬度）、同城其他项目、来源域名展示（2026-11-22）；
- 详情页决策信息：12 个头部项目补 `practical.duration` / `audience`；`hours` / `ticket` 待有可追溯来源后补；
- 画廊：12 个头部项目各 2 张 `gallery-*.webp`（高德 POI 公开评论图片）；其余 58 条仍为空；
- 内容补强：新增 8 条非遗/场馆（宣纸、徽墨、歙砚、汪满田鱼灯、池州傩、万安罗盘、冯嘴子花鼓灯、中国徽菜博物馆），数据 62→70；
- 分享与收录：构建后预渲染 70 个详情页，注入各自的 title / description / OG / JSON-LD（[ADR 0012](adr/0012-prerender-detail-pages.md)）；70/70 个项目已有独立分享图（11 张人工精选 + 59 张模板生成）；详情页可打开分享弹层（复制链接/保存图片/系统分享）；
- 键盘入口：移除地图内重复的隐藏地标列表，统一走顶部「项目列表」抽屉（[Issue #107](https://github.com/Hldwsd/xiangyu-map/issues/107)）；
- 剩余：加载骨架与错误态的细粒度打磨、图片懒加载在真实图片上验证、
  列表 ↔ 地图的 hover（目前只做选中联动）。
- 图层设置：区县界**默认开启**、合并重叠标签**默认关闭**（均记 localStorage，见 [ADR 0007](adr/0007-ink-paper-home.md) 补充）。

### M3 质量与上线（W6）

目标：能给别人看，且改得动。

- 单测：数据校验、坐标转换、筛选逻辑、路由守卫，核心逻辑覆盖率 ≥ 70%
- 性能预算核验（见下表），超标项必须有优化或书面豁免
- 可访问性：对比度、焦点可见、语义标签、`prefers-reduced-motion`
- 部署：main 自动发布，PR 预览环境
- 发布：打了 tag `v0.1.0`，GitHub Release 写清本期能力与已知问题

**DoD**：Lighthouse 性能桌面 ≥ 85、移动 ≥ 70；构建无 TS 报错与 lint warning；`v0.1.0` Release 可访问。

**M3 进度**（截至 2026-11-23）：

- 覆盖率闸门已接（#150/#152）：核心逻辑 70% 阈值，当前全量语句 91.84% / 分支 85.60%；
- E2E 冒烟已接：Playwright 桌面 + 移动端，首页计数、城市筛选、搜索列表、详情深链与预渲染 meta；
- Lighthouse 基线已测（[2026-11-23](audits/2026-11-23-lighthouse.md)）：桌面 **93** / 移动 **77**，a11y 100、SEO 100，均达 DoD；
- prefers-reduced-motion 已接（#151）：关闭入场动画与 hover 拨球；
- 已发布 0.1.0 tag + GitHub Release；
- 仍需外部输入：审图号与图片授权（不阻塞 v0.1.0，发布说明已注明）。

### M4 多端预研（W7–W8）

目标：验证"一套前端代码包出桌面/手机"的成本，而不是真的做完。

- Tauri 2 桌面壳：复用 `dist/`，跑通 Windows 打包与安装
- 移动端方案对比（Tauri 2 mobile vs Capacitor）：包体、插件生态、地图性能、上架流程
- 适配问题清单：安全区、手势冲突、`back` 键行为、离线缓存
- 产出 ADR 0005（多端结论 + 代价；0004 已被视觉语言占用），以及 v0.2.0 的候选清单

**DoD**：本机产出可安装的 Windows 包；ADR 0005 记录多端选型结论与遗留问题。

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
