# 0005. 多端：Tauri 2 Windows + Android 比赛版

- 状态：已接受
- 日期：2026-11-24
- 决策人：Hldwsd（A）

## 背景

项目是比赛作品，不正式公开上架；数据已基本齐备，网页版 v0.1.0 已发布。比赛演示需要可安装的 Windows 应用和安卓应用，而不是只开浏览器。原计划比较 Tauri mobile 与 Capacitor，实际直接复用了 Windows 壳的 Tauri 2，不再引入第二套运行时。

## 决策

- 用 **Tauri 2** 桌面壳复用现有 Vite 构建产物，只做 Windows；
- 应用启动页是**品牌页**（`brand/index.html`），地图是品牌页的入口，不做独立启动器；
- 前端以 `base=/` 构建后嵌入 `src-tauri`，通过 Tauri 自定义协议加载；
- 打包目标先只做 **NSIS** 安装包，够比赛演示与拷贝安装；
- 安装包图标用朱砂 logo；默认安装目录通过自定义 NSIS 模板固定为 `%LOCALAPPDATA%\xiangyu_map`，显示名仍是「乡遇安徽」；
- 安卓同样用 **Tauri 2**（arm64 release，比赛演示用 debug keystore 签名），启动页仍是品牌页；
- Windows 打包 NSIS，Android 打包 APK；两端共用 `dist/`、`brand/index.html` 入口和同一套安全区 CSS。

## 代价与已知问题

- Tauri 使用系统 WebView2；缺失时安装包会走 `downloadBootstrapper` 在线安装，离线机器需先装 WebView2；
- SPA 用 history 路由，桌面壳内刷新深层路由（如 `/site/xxx`）会命中自定义协议 404；桌面演示按“品牌页 → 地图 → 详情”正常前进，不依赖刷新；
- 品牌页与地图页的资源路径必须使用 `import.meta.env.BASE_URL` / `assetUrl()`；构建桌面版时统一 `--base=/`；
- 安装包未签名，Windows SmartScreen 会提示“未知发布者”，比赛演示可接受；
- 没有自动更新、没有多窗口、没有原生菜单，这些都不影响比赛演示；
- Android 用比赛演示证书签名（不是商店发布证书），状态栏/手势条已用 `env(safe-area-inset-*)` 适配；
- Android Gradle 工程在 `src-tauri/gen/android`（gitignore），换机器需 `tauri android init` + `pnpm android:prepare`。

## 后续

- 若未来要上架应用商店，再补正式签名、隐私清单与商店素材；移动端不再单开 ADR，延续本决策。
- 若要公开分发，需补代码签名与 WebView2 固定版本策略。
