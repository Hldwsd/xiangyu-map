# 乡遇地图 · Xiangyu Map

一张中国地图，标记值得专程一去的文旅项目。点击地标，展开这个项目的来龙去脉。

- 产品与项目规划：[docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)
- 两人协作规范：[docs/COLLABORATION.md](docs/COLLABORATION.md)
- 技术决策记录：[docs/adr/](docs/adr/README.md)

## 项目简介

首页是一张中国地图，地图上的每个地标代表一个文旅项目（古镇、非遗、红色、自然、演艺、乡村等）。点击地标即可查看项目详情：图文介绍、位置、最佳季节、交通与预约入口。

当前阶段只做网页端；桌面端与移动端在里程碑 M4 预研。

## 当前状态

仓库刚刚初始化，代码尚未开始：正在执行 **M0 基建**（脚手架、地图资源、数据契约）。进度以 [规划文档的里程碑表](docs/PROJECT_PLAN.md#里程碑与排期) 为准，本文件不再重复排期，避免两处漂移。

## 技术栈

选型理由见 [ADR 0001](docs/adr/0001-tech-stack.md)。

| 层 | 选型 |
| --- | --- |
| 框架 | Vue 3 + TypeScript + Vite |
| 地图可视化 | Apache ECharts（geo/map + scatter） |
| 路由 / 状态 | Vue Router / Pinia |
| 包管理 | pnpm（用 corepack 锁版本） |
| 质量 | ESLint + Prettier + Vitest |
| 多端（后续） | Tauri 2（桌面 + 移动壳），M4 对比 Capacitor |

## 快速开始

> 脚手架在 M0 提交后可用；当前仓库只有文档。

```bash
git clone https://github.com/Hldwsd/xiangyu-map.git
cd xiangyu-map
pnpm install
pnpm dev
```

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
