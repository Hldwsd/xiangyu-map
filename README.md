# 乡遇安徽 · Xiangyu Map

一张安徽省地图，标记值得专程一去的文旅项目。点击地标，展开这个项目的来龙去脉。

> 项目中文名于 2026-11-19 由「乡遇地图」定为「**乡遇安徽**」，与范围收窄到安徽省（[ADR 0002](docs/adr/0002-scope-anhui.md)）同步；仓库名与技术标识仍为 `xiangyu-map`，未随改名迁移，避免打死链。

- 产品与项目规划：[docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)
- 两人协作规范：[docs/COLLABORATION.md](docs/COLLABORATION.md)
- 两台机器上的 DSH 协作设置：[docs/DSH_COLLAB.md](docs/DSH_COLLAB.md)
- 技术决策记录：[docs/adr/](docs/adr/README.md)

## 项目简介

首页是一张安徽省地图，按 16 个地级市分区；地图上的每个地标代表一个文旅项目（古镇、非遗、红色、自然、演艺、乡村等）。点击地标即可查看项目详情：图文介绍、位置、最佳季节、交通与预约入口。

当前阶段只做网页端；桌面端与移动端在里程碑 M4 预研。

## 当前状态

**M0 基建已落地**（脚手架、地图渲染、数据契约、CI）。现在跑起来能看到：安徽省 16 个地级市的分区轮廓与市名、10 个可点击的分类地标、点击后侧栏摘要、`/site/:id` 详情页、分类筛选与关键词搜索、窄屏自动切单列。

- 地标数据是 **10 条示例占位数据**（坐标近似、文案为编辑示例、`sources` 指向 example.com），图上与详情页都有「示例数据」标注，正式内容在 M1–M2 替换；
- 底图用 DataV.GeoAtlas 的公开安徽省 GeoJSON（16 个市级要素）做开发期示意，来源、sha256 与合规待办记在 [public/maps/README.md](public/maps/README.md)，**上线前必须确认审图号**；
- 部署链路（M0 最后一项）尚未接，线上地址暂无。

进度以 [规划文档的里程碑表](docs/PROJECT_PLAN.md#里程碑与排期) 为准，本文件不重复排期，避免两处漂移。

## 技术栈

选型理由见 [ADR 0001](docs/adr/0001-tech-stack.md)。

| 层           | 选型                                        |
| ------------ | ------------------------------------------- |
| 框架         | Vue 3 + TypeScript + Vite                   |
| 地图可视化   | Apache ECharts 6（geo + scatter，按需引入） |
| 路由 / 状态  | Vue Router / Pinia                          |
| 包管理       | pnpm（`packageManager` 字段锁 11.22.0）     |
| 质量         | ESLint + Prettier + Vitest                  |
| 多端（后续） | Tauri 2（桌面 + 移动壳），M4 对比 Capacitor |

## 快速开始

环境要求：Node.js `^22.18.0 || >=24.12.0`（开发机实测 v24.12.0）、pnpm 11。

```bash
git clone https://github.com/Hldwsd/xiangyu-map.git
cd xiangyu-map
pnpm install
pnpm dev          # http://localhost:5173
```

常用命令：

| 命令                  | 作用                                       |
| --------------------- | ------------------------------------------ |
| `pnpm dev`            | 本地开发（HMR）                            |
| `pnpm build`          | 类型检查 + 生产构建（CI 与本地都跑这一条） |
| `pnpm preview`        | 预览 `dist/`                               |
| `pnpm test:unit`      | 单元测试（`--run` 跑一次）                 |
| `pnpm lint`           | ESLint（`lint:fix` 自动修）                |
| `pnpm format`         | Prettier 格式化（`format:check` 只校验）   |
| `pnpm data:anhui-map` | 重新抓取底图到 `public/maps/anhui.json`    |

首次安装若因镜像超时失败，用 `pnpm install --fetch-retries=10 --fetch-timeout=900000 --network-concurrency=3` 重试，不要删 lockfile。

## 数据与底图

- **地标数据**：`src/data/sites.ts`，字段契约在 `src/types/site.ts`（改字段需双方在 PR 确认）。新增一个项目 = 加一条数据 + 放图，不动组件代码；`province` 固定为安徽省，`city` 必须是 16 个地级市之一（联合类型，写错编译期就报错）。
- **数据校验**：`src/utils/site-validation.ts` 在应用启动时校验全部数据（id 唯一与格式、分类枚举、城市属于 16 个地级市、坐标落在安徽省内、摘要字数、来源必填），不合格直接抛 `SiteDataError` 并列出问题条目，不静默降级。
- **底图**：`public/maps/anhui.json`，由 `pnpm data:anhui-map` 从 DataV.GeoAtlas 抓取并校验（16 个市级要素），详见 [public/maps/README.md](public/maps/README.md)。
- **图片来源**：正式图片放 `public/images/sites/<id>/`（WebP，单张 ≤ 300 KB），示例数据统一用 `public/images/placeholder.svg`。

## 目录结构

见 [规划文档「架构与目录」](docs/PROJECT_PLAN.md#架构与目录)：目录结构只在该处维护一份，避免 README 与规划不一致。

## 协作方式

两人开发，规则见 [docs/COLLABORATION.md](docs/COLLABORATION.md)：

- 短分支 + PR + squash 合并，`main` 始终保持可运行；
- 提交遵循 Conventional Commits，正文必须写清「为什么」；
- 一个 PR 只做一件事，合并前由另一人评审。

## 地图合规提示

在中国境内公开登载地图涉及地图审核与审图号要求（《地图管理条例》及自然资源部相关规定）。上线前须确认底图来源与审图号，不得使用来源不明的边界数据；详见规划文档「风险与对策」一节。

## 许可

MIT License，见 [LICENSE](LICENSE)。
