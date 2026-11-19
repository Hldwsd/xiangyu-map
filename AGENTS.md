# AGENTS.md

> 这份文件会被 DSH 在**每次新会话开始时自动加载**（项目指令链）。两人、两台机器上的 agent 读到的都是同一份，所以：改这里 = 改团队约定，改完要在 PR 里说明为什么。
>
> 唯一准绳是 [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)（范围、排期、契约）；协作规则见 [docs/COLLABORATION.md](docs/COLLABORATION.md)；DSH 环境与插件分工见 [docs/DSH_COLLAB.md](docs/DSH_COLLAB.md)。

## 项目

「乡遇地图」：一张中国地图，地标代表文旅项目（古镇/非遗/红色/自然/演艺/乡村），点击看详情。当前只有网页端：Vue 3 + Vite + TypeScript + Pinia + Vue Router + ECharts 6。桌面/移动壳在 M4 预研。

## 命令

```bash
pnpm dev                     # http://localhost:5173
pnpm build                   # 类型检查 + 生产构建（提交前必须绿）
pnpm test:unit --run         # 单测
pnpm lint                    # ESLint
pnpm format                  # Prettier
pnpm data:china-map          # 重新抓取 public/maps/china.json
```

首次安装失败（镜像超时）用 `pnpm install --fetch-retries=10 --fetch-timeout=900000 --network-concurrency=3`，**不要删 lockfile 重装**。

## 硬性规则

1. **不直推 `main`**。分支名 `feat|fix|docs|refactor|chore/<scope>-<简述>`，一个分支只做一件事，活不过 3 天。
2. **提交信息用 Conventional Commits，正文写「为什么」**。只写「改了什么」的提交等于没写：一周后没人知道当时在躲哪个坑。
3. **合入前本地必须全绿**：`pnpm lint`、`pnpm format:check`、`pnpm type-check`、`pnpm test:unit --run`、`pnpm build`。CI 会再跑一遍，但别把绿不绿赌在 CI 上。
4. **契约先行**：改 `src/types/site.ts`、路由表、store 的公开字段，先在 Issue/PR 里 @ 对方，得到确认再动手。契约是两个人唯一的接头点。
5. **不提交**：`node_modules/`、`dist/`、`.env*`、`.tmp/`、个人 DSH 配置、任何密钥。MCP 配置里只写 `${ENV}` 引用（见 DSH_COLLAB.md）。
6. **不合并自己开的 PR**。作者不自合，等对方 approve。
7. **不确定时先读文档再问人**：范围问题看规划文档，规则问题看协作规范，别在代码里猜。

## 改动落点

| 想改什么                | 改这里                                                       | 别动                     |
| ----------------------- | ------------------------------------------------------------ | ------------------------ |
| 新增/修改一个文旅项目   | `src/data/sites.ts`（加一条数据 + 放图）                     | 组件里不写死项目内容     |
| 地标样式、配色、tooltip | `src/components/map/china-map-option.ts`                     | 不要在组件外 new ECharts |
| 地图实例生命周期        | `src/components/map/ChinaMap.vue`                            | 别处不碰 ECharts 实例    |
| 筛选、搜索、选中态      | `src/stores/sites.ts`                                        | 组件内不各自过滤         |
| 数据结构与校验          | `src/types/site.ts`、`src/utils/site-validation.ts`          | 校验失败不要静默降级     |
| 底图                    | `public/maps/china.json`（用 `pnpm data:china-map` 生成）    | 不要手改 JSON            |
| 构建、CI、依赖          | `vite.config.ts`、`.github/workflows/ci.yml`、`package.json` | 不在 PR 里偷偷放宽闸门   |

## 数据规则

- 坐标一律 **GCJ-02**；`id` 是 kebab-case 深链，上线后不可改（改了旧链接就死）。
- `summary` ≤ 60 字；`sources` 必填，必须是可访问的 `http(s)` 链接。
- 示例数据必须在 `tags` 首项写「示例数据」，别让占位内容看起来像事实。
- 图片放 `public/images/sites/<id>/`，WebP、单张 ≤ 300 KB。

## 收尾

- 收尾前自查：这次改动**新增了什么行为**？**谁需要知道**（对方 / 只在 README 说明）？
- 没做完就写清楚交接三行：当前状态、下一步、已知的坑（写进 PR 描述，别只留在会话里——对方的 agent 读不到你的上下文）。
- 有取舍的决策记一条 ADR（`docs/adr/`），别只存在于对话里。
