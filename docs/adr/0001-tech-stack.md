# 0001. 技术栈：Vue 3 + Vite + TypeScript + ECharts

- 状态：已接受
- 日期：2026-11-18
- 决策人：Hldwsd（A）、xc3122（B）

## 背景

两位开发者、约 8 周做出网页 MVP，核心是「一张地图（2026-11-19 起收窄为安徽省，按 16 个地级市分区）+ 可点击的地标 + 详情展示」。当前只做 Web，但明确要在之后扩展到桌面端与手机端。约束：人力少、没有后端、数据以仓库内静态文件维护；后续上线的地图展示涉及国内地图合规要求。

## 决策

| 层           | 选型                                     | 版本基线（2026-11-18 npm latest） |
| ------------ | ---------------------------------------- | --------------------------------- |
| 框架         | Vue 3（组合式 API + `<script setup>`）   | 3.5.45                            |
| 构建         | Vite                                     | 8.3.8                             |
| 语言         | TypeScript                               | 7.0.2（生态不适配则回退 5.x）     |
| 地图         | Apache ECharts（geo/map + scatter）      | 6.1.0                             |
| 路由/状态    | Vue Router / Pinia                       | 5.5.1 / 4.1.0                     |
| 包管理       | pnpm（corepack 锁定）                    | 开发机 11.22.0                    |
| 多端壳（M4） | Tauri 2（桌面 + 移动），Capacitor 作备选 | 2.12.5 / 8.6.2                    |

## 理由

- **ECharts 而非 MapLibre/Leaflet**：本项目要的是"风格化的省域轮廓 + 市级分区 + 打点"，不是路网级底图。ECharts 的 `geo` 直接吃 GeoJSON、`scatter` 打点、`roam` 缩放平移开箱可用，无需瓦片服务与地图 SDK 授权；引入 MapLibre 反而要解决瓦片来源、密钥与合规，MVP 成本不划算。代价是 ECharts 自 5.0 起**不再内置地图数据**，必须自备 GeoJSON 并 `registerMap`。
- **Vue 3 而非 React**：两人对 Vue 更熟，且国内文旅可视化/大屏的生态与示例以 Vue 居多，踩坑成本低；组合式 API 配合 TS 的类型推导比 Options API 好。
- **Vite 而非 Webpack**：冷启动与 HMR 快，产物小，`base`/`build` 配置简单，便于后续被 Tauri 以 `dist/` 复用。
- **TypeScript**：地标数据结构是两人协作的接口，编译期约束能挡住"字段名各写一套"这类问题。
- **pnpm**：依赖体积小、安装快、lockfile 严格，适合两人共用一份依赖树。
- **Tauri 2 而非 Electron**：Tauri 2 自 2024-10-02 发布稳定版起同时支持桌面与 iOS/Android，包体远小于 Electron，正好覆盖"先网页、后桌面、再手机"的路线；移动端另留 Capacitor 作为纯 Web 技术栈的对照方案，在 M4 用实测数据决定。

## 后果

- 需要自己维护省级 GeoJSON（体积、精度、来源与审图号合规），这是 M0 的硬任务；
- ECharts 必须按需引入（`echarts/core` + 具体 chart/component），否则包体轻易超出 300 KB 预算；
- 移动端 canvas 手势与页面滚动天然冲突，需要单独处理（`touch-action`、手势边界）；
- TS 7 为较新版本，若 `vue-tsc`/ESLint 解析器暂未适配，回退 5.x，不影响选型结论。

## 备选方案

| 方案                             | 放弃原因                                                                 |
| -------------------------------- | ------------------------------------------------------------------------ |
| React + Vite + ECharts           | 团队熟悉度低，本项目没有需要 React 生态的诉求                            |
| Vue 3 + uni-app                  | 一套码覆盖多端很诱人，但地图交互能力受限、桌面端弱，与"地图体验优先"冲突 |
| MapLibre GL / Leaflet + 真实底图 | 需要底图服务与合规成本，MVP 阶段收益小于成本；保留为"真实地图"阶段的候选 |
| Electron                         | 包体与内存开销大，Tauri 2 已能覆盖同样场景                               |

## 参考

- Tauri v2 稳定版 2024-10-02 发布，同时支持桌面与 iOS/Android：[Tauri 2.0 发布说明](https://github.com/tauri-apps/tauri-docs/blob/e63e51d3b6f9391db758050f278bf62447ac6eb5/src/content/docs/blog/tauri-2.0.mdx)。
- ECharts 地图数据需自行提供与 `registerMap` 注册：[ECharts 常见问题](https://echarts.apache.org/zh/faq.html)。
