# 乡遇安徽 · Xiangyu Map

一张安徽省地图，标记值得专程一去的文旅项目。点击地标，展开这个项目的来龙去脉。

> 项目中文名于 2026-11-19 由「乡遇地图」定为「**乡遇安徽**」，与范围收窄到安徽省（[ADR 0002](docs/adr/0002-scope-anhui.md)）同步；仓库名与技术标识仍为 `xiangyu-map`，未随改名迁移，避免打死链。

- 产品与项目规划：[docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)
- 当前交接文档：[docs/HANDOFF.md](docs/HANDOFF.md)
- 两人协作规范：[docs/COLLABORATION.md](docs/COLLABORATION.md)
- 两台机器上的 DSH 协作设置：[docs/DSH_COLLAB.md](docs/DSH_COLLAB.md)
- 技术决策记录：[docs/adr/](docs/adr/README.md)

## 项目简介

首页是一张安徽省地图，按 16 个地级市分区；地图上的每个地标代表一个文旅项目（古镇、非遗、红色、自然、演艺、乡村、场馆等）。点击地标即可查看项目详情：图文介绍、位置、最佳季节、交通与预约入口。

当前有 **网页端、Windows 桌面版、Android 版**：两端 App 都从品牌页进入，地图是品牌页的入口。安装包见 [GitHub Release v0.1.0](https://github.com/Hldwsd/xiangyu-map/releases/tag/v0.1.0)。

另有一页**品牌页** `/brand/`：用 GSAP 做滚动叙事（省界描边与 16 市地名、逐字显墨、五张近景图带、
横向 pin 的六处项目、十六城索引与悬停封面、七类风物图片抽屉、朱砂落款），自绘滚动条，
刷新后从顶端重播开场；回答「这张图是什么、凭什么可信」。入口在站内菜单「品牌页 · 一纸山河」，
品牌页的 CTA 回到地图。选型与代价见 [ADR 0018](docs/adr/0018-brand-site.md)。

## 当前状态

**v0.1.0 已发布，M0–M4 比赛版完成**（2026-11-25）。线上是可直接用的开发版：全屏安徽省地图（16 个地级市）+
70 条可核验的文旅项目、分类图例、关键词搜索、列表抽屉、城市索引、详情页、区县界开关
（默认开启）、9 个湖泊与长江/淮河水道、省界渐隐光晕；70/70 封面已置入。地标是软碰撞小球，
密集处会自然挤开，缩放/拖动时跟随地图平移（[ADR 0013](docs/adr/0013-marker-physics.md)）。
Windows（NSIS）与 Android（arm64 APK）比赛版已打包，启动均进品牌页。

- 视觉走「纸本墨线」：米白纸、墨线、宋体标题、金色点睛，分类靠形状区分（[ADR 0007](docs/adr/0007-ink-paper-home.md)），
  背景是邓石如《少学琴书册》的墨迹（清代，公有领域）；
- 区划以**安徽省自然资源厅官方标准图（审图号 皖S(2025)71号）**为准：该图只划分 16 个地级市，
  所以区县界默认显示，可在菜单里关掉；
- 底图几何仍是 DataV.GeoAtlas 的公开 GeoJSON（开发期示意，来源与 sha256 见
  [public/maps/README.md](public/maps/README.md)），**公开上线前仍须完成地图审核与审图号标注**；
- 部署链路已接通（见下节），PR 各自有预览地址。

进度以 [规划文档的里程碑表](docs/PROJECT_PLAN.md#里程碑与排期) 为准，本文件不重复排期，避免两处漂移。

## 下载

| 平台    | 文件                                  | 说明                                               |
| ------- | ------------------------------------- | -------------------------------------------------- |
| Windows | `乡遇安徽_0.1.0_x64-setup.exe`        | NSIS 安装包，默认装到 `%LOCALAPPDATA%\xiangyu_map` |
| Android | `乡遇安徽_0.1.0_android_arm64.apk`    | arm64，比赛演示证书签名                            |
| 网页    | https://hldwsd.github.io/xiangyu-map/ | 无需安装                                           |

两个 App 启动都先到品牌页，点「进入地图」才进地图。安装包未签名/使用演示证书，系统会提示未知来源，比赛演示可接受。

## 技术栈

选型理由见 [ADR 0001](docs/adr/0001-tech-stack.md)。

| 层          | 选型                                              |
| ----------- | ------------------------------------------------- |
| 框架        | Vue 3 + TypeScript + Vite                         |
| 地图可视化  | Apache ECharts 6（geo + scatter，按需引入）       |
| 路由 / 状态 | Vue Router / Pinia                                |
| 品牌页      | 原生 TS + GSAP 3 / ScrollTrigger + Lenis          |
| 包管理      | pnpm（`packageManager` 字段锁 11.22.0）           |
| 质量        | ESLint + Prettier + Vitest                        |
| 多端        | Tauri 2（Windows NSIS + Android APK，品牌页入口） |

## 快速开始

环境要求：Node.js `^22.18.0 || >=24.12.0`（开发机实测 v24.12.0）、pnpm 11。

```bash
git clone https://github.com/Hldwsd/xiangyu-map.git
cd xiangyu-map
pnpm install
pnpm dev          # http://localhost:5173
```

常用命令：

| 命令                               | 作用                                                                  |
| ---------------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                         | 本地开发（HMR）                                                       |
| `pnpm build`                       | 类型检查 + 生产构建（CI 与本地都跑这一条）                            |
| `pnpm bundle:size`                 | 首屏入口 JS/CSS 体积预算（JS ≤300 KB、CSS ≤60 KB，gzip）              |
| `pnpm prerender`                   | 构建后生成 70 个详情页的静态 HTML（title/OG/JSON-LD）                 |
| `pnpm preview`                     | 预览 `dist/`                                                          |
| `pnpm test:unit`                   | 单元测试（`--run` 跑一次）                                            |
| `pnpm test:coverage`               | 单元测试 + 覆盖率闸门（核心逻辑 ≥70%）                                |
| `pnpm test:e2e`                    | Playwright E2E（先 `build` + `prerender`，再用 Chrome 跑桌面/移动端） |
| `pnpm lint`                        | ESLint（`lint:fix` 自动修）                                           |
| `pnpm format`                      | Prettier 格式化（`format:check` 只校验）                              |
| `pnpm data:anhui-map`              | 重新抓取底图到 `public/maps/anhui.json`                               |
| `pnpm data:anhui-outline`          | 重新抓取省界轮廓到 `public/maps/anhui-outline.json`                   |
| `pnpm data:anhui-water`            | 重新抓取 9 个湖泊水面到 `public/maps/anhui-water.json`（OSM）         |
| `pnpm data:anhui-rivers`           | 重新抓取长江/淮河河道线到 `public/maps/anhui-rivers.json`（OSM）      |
| `pnpm data:anhui-districts`        | 重新抓取区县界线到 `public/maps/anhui-districts.json`（默认加载）     |
| `node scripts/build-brand-geo.mjs` | 重新生成品牌页的 SVG 几何 `src/brand/geo.generated.ts`（改底图后跑）  |
| `node scripts/check-sources.mjs`   | 检查每条数据的 `sources` 是否可达（加 `--strict` 有不可达时退出码 1） |

首次安装若因镜像超时失败，用 `pnpm install --fetch-retries=10 --fetch-timeout=900000 --network-concurrency=3` 重试，不要删 lockfile。

### Windows 桌面版（比赛用）

桌面壳用 Tauri 2，复用同一份 `dist/`。应用启动先进入**品牌页**，点「进入地图」才进地图。

环境要求：Rust 1.77+、MSVC 构建工具、WebView2 Runtime（Win10/11 一般自带；安装包会在缺失时下载 bootstrapper）。

```bash
pnpm desktop:dev     # Tauri 开发模式，窗口打开品牌页
pnpm desktop:build   # 构建 NSIS 安装包
```

产物：`src-tauri/target/release/bundle/nsis/` 下的 `*-setup.exe`，默认安装到 `%LOCALAPPDATA%\xiangyu_map`（文件夹用 ASCII，界面与窗口仍显示「乡遇安徽」）。安装包未签名，Windows 会提示“未知发布者”，比赛演示可接受。实现取舍见 [ADR 0005](docs/adr/0005-desktop-windows-tauri.md)。

### Android（比赛演示）

Tauri 2 的 Android 壳复用同一份 dist/，启动仍是品牌页，地图从品牌页进入。

环境：Android SDK（platform 36 / build-tools 36）、NDK 27.0.12077973、JDK 21、Rust Android targets。

`ash
pnpm exec tauri android init --ci   # 生成 src-tauri/gen/android（已 gitignore）
pnpm android:prepare                # 修正 Gradle Rust 任务工作目录 + 复制图标
pnpm android:build                  # 产出 arm64 release APK（unsigned）
pnpm android:dev                    # 连手机热更新调试
`

release APK 在 src-tauri/gen/android/app/build/outputs/apk/arm64/release/，比赛演示可用 Android debug keystore 签名：

`ash
"/build-tools/36.0.0/apksigner.bat" sign \
  --ks "/.android/debug.keystore" --ks-pass pass:android --key-pass pass:android \
  --out app-arm64-release-signed.apk app-arm64-release-unsigned.apk
`

## 部署

| 环境    | 地址                                         | 触发                                                                  |
| ------- | -------------------------------------------- | --------------------------------------------------------------------- |
| 线上    | https://hldwsd.github.io/xiangyu-map/        | 推送 `main`（`.github/workflows/deploy.yml`）                         |
| PR 预览 | https://hldwsd.github.io/xiangyu-map/pr-<n>/ | PR 打开/更新（`.github/workflows/preview.yml`），链接自动贴在该 PR 里 |

- 站点是 GitHub Pages 的 `gh-pages` 分支，主站在根目录、每个 PR 一个 `pr-<n>/` 子目录，PR 关闭时自动清理；
- 品牌页与主站同一次构建、同一个产物：`brand/index.html` → `dist/brand/index.html`，线上是
  `/xiangyu-map/brand/`（PR 预览同理），共享同一份 `BASE_URL`，不需要单独的 workflow；
- 构建后跑 `pnpm prerender`，把 70 个详情页写成 `dist/site/<id>/index.html`，注入各自的 title、description、OG 与 JSON-LD；`SITE_URL` 由 deploy/preview workflow 注入，用于生成绝对 URL；
- 因为部署在子路径下，所有资源路径都走 `import.meta.env.BASE_URL`（`src/utils/asset-url.ts`，`public/maps` 的加载器同理）。本地要在子路径下验证，可以 `pnpm build-only --base=/xiangyu-map/` 后用任意静态服务器挂在同名前缀下；
- 深链（`/site/<id>` 刷新）优先命中预渲染页；未知路径仍靠 `dist/404.html` 兜底，构建时由 `deploy.yml` 复制 `index.html` 生成；
- 预渲染方案与代价见 [ADR 0012](docs/adr/0012-prerender-detail-pages.md)，部署选型见 [ADR 0003](docs/adr/0003-deployment.md)。

## 数据与底图

- **地标数据**：`src/data/sites.ts`，字段契约在 `src/types/site.ts`（改字段需双方在 PR 确认）。新增一个项目 = 加一条数据 + 放图，不动组件代码；`province` 固定为安徽省，`city` 必须是 16 个地级市之一（联合类型，写错编译期就报错）。
- **数据校验**：`src/utils/site-validation.ts` 在应用启动时校验全部数据（id 唯一与格式、分类枚举、城市属于 16 个地级市、坐标落在安徽省内、摘要字数、来源必填），不合格直接抛 `SiteDataError` 并列出问题条目，不静默降级。
- **高德链接**：精确 POI 短链按 site id 维护在 `src/data/amap-links.ts`，当前 70/70 已置入；没有短链的项目回退到「名称 + 城市」搜索，不按经纬度拼 marker（坐标是千米级精度，容易落到隔壁点位）。
- **分享图**：11 个头部项目用 `scripts/make-og-images.py` 的人工文案，其余 59 个用 `scripts/make-og-images-all.py` 从封面自动生成；70 个项目在数据里用 `shareImage` 显式指向，全部 70 个都有专属图。预渲染写 `og:image` / `og:image:alt`，详情页“分享”弹层复用同一张图，可复制链接/保存图片/调用系统分享。
- **画廊**：头部 12 个项目各补了 2 张 `gallery-*.webp`（来源为高德 POI 页的公开评论图片，授权口径同封面）；其余项目 `gallery` 仍为空。
- **底图与专题图层**（都在 `public/maps/`，来源、字段与 sha256 见 [public/maps/README.md](public/maps/README.md)）：

  | 文件                   | 内容                                   | 来源                            | 生成命令                    |
  | ---------------------- | -------------------------------------- | ------------------------------- | --------------------------- |
  | `anhui.json`           | 16 个地级市面（主底图）                | DataV.GeoAtlas                  | `pnpm data:anhui-map`       |
  | `anhui-outline.json`   | 省界轮廓（用来做渐隐光晕）             | DataV.GeoAtlas                  | `pnpm data:anhui-outline`   |
  | `anhui-water.json`     | 9 个主要湖泊水面                       | OpenStreetMap（Overpass，ODbL） | `pnpm data:anhui-water`     |
  | `anhui-rivers.json`    | 长江、淮河在省域内的河道线             | OpenStreetMap（Overpass，ODbL） | `pnpm data:anhui-rivers`    |
  | `anhui-districts.json` | 区县界线（104 个，默认加载，菜单可关） | 公开数据集                      | `pnpm data:anhui-districts` |

  区划口径以安徽省自然资源厅官方标准图（审图号 皖S(2025)71号）为准，该标准图只到 16 个地级市，
  所以区县界默认开启。

- **来源核验**：`node scripts/check-sources.mjs` 把每条数据的 `sources` 跑一遍，按「可达 / 反爬 / 不可达 / 占位」分类；政府站点常对脚本请求返回 403/412，这类单列为「反爬」不算失败（`.github/workflows/sources.yml` 在数据变更时跑它，非阻断）。
- **图片来源**：正式图片放 `public/images/sites/<id>/`（WebP，单张 ≤ 300 KB）；加载失败时统一用 `public/images/placeholder.svg` 兜底。数据里写的是站点根路径（`/images/...`），渲染时由 `src/utils/asset-url.ts` 套上部署基地址 —— 部署在 `/xiangyu-map/` 这类子路径下也不会 404。封面素材取自公开资料，授权状态见 [ADR 0011](docs/adr/0011-cover-source-baike.md)。

## 目录结构

见 [规划文档「架构与目录」](docs/PROJECT_PLAN.md#架构与目录)：目录结构只在该处维护一份，避免 README 与规划不一致。

## 协作方式

两人开发，规则见 [docs/COLLABORATION.md](docs/COLLABORATION.md)：

- 短分支 + PR + squash 合并，`main` 始终保持可运行；
- 提交遵循 Conventional Commits，正文必须写清「为什么」；
- 一个 PR 只做一件事，合并前由另一人评审。

## 地图合规提示

在中国境内公开登载地图涉及地图审核与审图号要求（《地图管理条例》及自然资源部相关规定）。本项目：

- **区划口径**采用安徽省自然资源厅官方标准图（审图号 **皖S(2025)71号**，只到 16 个地级市）；
- **底图几何**目前仍是 DataV.GeoAtlas 的公开数据，属开发期示意，**公开上线前必须换成经审核的矢量数据并标注审图号**；
- 湖泊与河道来自 OpenStreetMap（ODbL），已在页面署名，见下节。

详见规划文档「风险与对策」一节与 [public/maps/README.md](public/maps/README.md)。

## 素材与署名

| 素材                   | 来源                                              | 许可                                                    |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| 湖泊水面 / 河道线      | © OpenStreetMap contributors（Overpass API 抓取） | ODbL，页面已署名（页脚、首页版记、「菜单 → 关于」）     |
| 省与市轮廓             | DataV.GeoAtlas                                    | 见其仓库说明，公开上线前替换为经审核数据                |
| 封面图                 | 百度百科词条主图（项目所有者逐条审核并替换部分）  | 版权待确认，公开商用前须替换或取得授权，见 ADR 0011     |
| 默认分享图             | 项目内生成（省界轮廓来自 DataV.GeoAtlas）         | 随项目 MIT；70/70 项目有分享图（11 人工 + 59 模板生成） |
| 背景书法《少学琴书册》 | 邓石如（清，1743–1805），项目所有者提供的扫描件   | 作品为公有领域；扫描件授权待确认                        |
| 分类图标               | 项目内自绘（`src/components/icons/`，S1 线稿）    | 随项目 MIT                                              |

## 许可

MIT License，见 [LICENSE](LICENSE)。

## 版本记录

- [CHANGELOG](CHANGELOG.md)
