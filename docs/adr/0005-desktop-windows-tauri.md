# 0005. 多端：Windows 先用 Tauri 2 桌面壳，移动端暂缓

- 状态：已接受
- 日期：2026-11-24
- 决策人：Hldwsd（A）

## 背景

项目是比赛作品，不正式公开上架；数据已基本齐备，网页版 v0.1.0 已发布。比赛演示需要可双击安装的 Windows 应用，而不是只开浏览器。M4 原计划同时预研 Tauri mobile 与 Capacitor，但比赛时间有限，移动端没有交付压力。

## 决策

- 用 **Tauri 2** 桌面壳复用现有 Vite 构建产物，只做 Windows；
- 应用启动页是**品牌页**（`brand/index.html`），地图是品牌页的入口，不做独立启动器；
- 前端以 `base=/` 构建后嵌入 `src-tauri`，通过 Tauri 自定义协议加载；
- 打包目标先只做 **NSIS** 安装包，够比赛演示与拷贝安装；
- 移动端（Tauri mobile / Capacitor）本轮不做，保留为 v0.2 候选，不在比赛版里塞 Capacitor。

## 代价与已知问题

- Tauri 使用系统 WebView2；缺失时安装包会走 `downloadBootstrapper` 在线安装，离线机器需先装 WebView2；
- SPA 用 history 路由，桌面壳内刷新深层路由（如 `/site/xxx`）会命中自定义协议 404；桌面演示按“品牌页 → 地图 → 详情”正常前进，不依赖刷新；
- 品牌页与地图页的资源路径必须使用 `import.meta.env.BASE_URL` / `assetUrl()`；构建桌面版时统一 `--base=/`；
- 安装包未签名，Windows SmartScreen 会提示“未知发布者”，比赛演示可接受；
- 没有自动更新、没有多窗口、没有原生菜单，这些都不影响比赛演示。

## 后续

- 移动端若要做，先比较 Tauri 2 mobile 与 Capacitor 的包体、插件、地图手势与上架流程，再单独开 ADR；
- 若要公开分发，需补代码签名与 WebView2 固定版本策略。
