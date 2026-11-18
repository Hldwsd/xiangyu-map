# 协作规范

> 适用：Hldwsd（A）、xc3122（B）。目标不是流程好看，而是**两个人同时改一个仓库不互相踩、每次改动都能追溯为什么**。
> 配套文件：[项目规划](PROJECT_PLAN.md)、[ADR 索引](adr/README.md)

## 三条底线

1. `main` 永远可运行：任何人 `git pull` 后 `pnpm install && pnpm dev` 都能跑起来。
2. 每次改动都要有说明：提交信息写清「做了什么」和「为什么」，不写"update""fix bug"。
3. 不审不合：自己写的 PR 不能自己合，必须对方 approve。

## 一、环境与身份

Node.js 24 LTS（规划文档的版本基线要求 Node `^20.19.0 || >=22.12.0`），包管理用 pnpm，版本以 `package.json` 的 `packageManager` 字段为准，通过 corepack 自动切换。

```bash
corepack enable
corepack prepare pnpm@<package.json 中的版本> --activate
pnpm install
```

Git 身份（**每人一次**，本机全局配置；仓库内不要写别人的名字）：

```bash
# A（已完成，供参考）
git config --global user.name  "Hldwsd"
git config --global user.email "139202556+Hldwsd@users.noreply.github.com"

# B
git config --global user.name  "xc3122"
git config --global user.email "<在 GitHub → Settings → Emails 复制你的 noreply 邮箱>"
```

用 GitHub 的 noreply 邮箱可以避免真实邮箱进入提交历史。提交者信息错误会导致贡献统计错位，改名前请先确认。

## 二、分支模型

短分支 + PR，不用 Git Flow，不长期保留 develop 分支。

| 类型 | 命名 | 例 |
| --- | --- | --- |
| 功能 | `feat/<scope>-<简述>` | `feat/map-marker-cluster` |
| 修复 | `fix/<scope>-<简述>` | `fix/detail-image-404` |
| 文档 | `docs/<简述>` | `docs/collaboration-rules` |
| 重构 | `refactor/<scope>-<简述>` | `refactor/map-into-composable` |
| 杂务 | `chore/<简述>` | `chore/bump-echarts` |

规则：

- 分支存活 **≤ 3 天**；做不完就拆成两个 PR，先合能用的部分。
- 合入前把自己分支 rebase 到最新 `main`，保持线性历史。
- 禁止直接向 `main` push（包括文档和小修）；紧急情况也需要 PR + 事后说明。
- 一个 PR 只做一件事：混了重构和功能，评审时难以判断风险。

## 三、提交规范

采用 Conventional Commits：

```text
<type>(<scope>): <摘要>

<正文：为什么改、改了什么、有什么影响>

<关联 Issue：Closes #12>
```

- 摘要 ≤ 50 字，中文，句尾不加句号；
- 正文必填，至少一句「为什么」；
- 一个提交完成一个可独立回滚的改动。

`type`：

| type | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修 bug |
| `docs` | 文档 |
| `style` | 格式（不影响逻辑） |
| `refactor` | 重构（不改行为） |
| `perf` | 性能优化 |
| `test` | 测试 |
| `build` | 构建、依赖、脚本 |
| `ci` | CI 配置 |
| `chore` | 杂务 |
| `revert` | 回滚 |

`scope`：`map`（地图渲染）、`data`（数据与校验）、`ui`（通用组件与样式）、`detail`（详情页）、`filter`（筛选搜索）、`router`、`store`、`build`、`ci`、`docs`、`deps`。

好的提交：

```text
feat(map): 地标按分类着色并支持图例筛选

分类色板集中到 utils/palette.ts，图例点击只改 store，
地图组件监听筛选结果重绘，避免把筛选逻辑写进 chart 回调。

Closes #8
```

坏的提交（会被 review 打回）：

```text
update
fix bug
修改了一些东西
```

## 四、PR 与评审

流程：

1. 从最新 `main` 切分支 → 开发 → 本地自检（`pnpm lint`、`pnpm typecheck`、`pnpm test`）；
2. 推送分支，开 PR，标题沿用提交规范（squash 后它就是主干上的提交标题）；
3. 按模板填「变更内容 / 为什么 / 验证方式 / 截图 / 影响面」；
4. 指定对方为 reviewer，**24 小时内**给结论：approve、评论、或 request changes；
5. approve 后由 **reviewer** 点 squash merge（作者不自己合），合并后删除分支。

评审关注顺序：

1. 行为是否正确、边界是否处理（空数据、单点、极端缩放）；
2. 是否引入不必要的依赖或体积；
3. 命名与目录是否符合规划；
4. 样式与格式问题交给 lint，不占用评审精力。

PR 体积：超过 400 行改动先说明理由并拆；纯格式化与业务改动分开提交。

## 五、契约先行

`src/types/site.ts`、路由表、store 的公开字段属于**接口契约**：

- 改字段 = 双方都要改代码，因此这类 PR 必须在描述里 `@` 对方，并说明迁移方式；
- 先合契约、再并行开发，避免各自定义一套 `Site` 结构；
- 契约变更后 24 小时内同步更新示例数据与校验脚本。

## 六、Issue 与看板

- 新建 Issue 用模板：Bug 报告 / 功能建议；标题写现象或目标，不写"优化一下"。
- 里程碑用 GitHub Milestones 对应 M0–M4，Issue 必须挂里程碑，否则视为待办池。
- 看板只保留三列：待办 / 进行中 / 待验证。每人同时进行中的 Issue 不超过 2 个。
- 每周日各写 3 行复盘（本周完成 / 卡点 / 下周计划），作为对应 Issue 的评论，不另建文档。

## 七、代码风格

- `.vue` 组件文件用 PascalCase（`SiteCard.vue`），TS 模块与目录用 kebab-case（`site-source.ts`）；
- 组件内顺序：`<script setup>` → `<template>` → `<style scoped>`；
- 只写 `scoped` 样式，全局变量放 `src/assets/styles/`；
- 不在组件里直接访问 `fetch`/`localStorage`/`window`，统一走 `src/utils/`，为后续多端留口；
- 地图实例只在 `components/map/` 内创建与销毁，禁止跨组件 `echarts.getInstanceByDom` 乱取；
- 注释解释「为什么」，不复述代码。

## 八、发布与版本

- `main` 随时可发布；合并即进入下一次发布的候选。
- 版本号 `0.x.y`：新功能升 `x`（0.1.0 → 0.2.0），修复升 `y`。
- 发布动作：打 tag `v0.1.0` + GitHub Release，正文写「本期能力 / 已知问题 / 升级注意」。
- 回滚优先 `git revert`，不在 `main` 上强推。

## 九、日常节奏

| 时间 | 动作 |
| --- | --- |
| 每天开工 | 互发一句「今天做什么」，避免同时改同一块 |
| 每天收工 | 推分支、开/更新 PR，不留未提交的本地改动过夜 |
| 每周日 | 3 行复盘 + 下周排期微调（直接改规划文档的里程碑表，说明改期原因） |
| 每个里程碑结束 | 对照 DoD 验收，未达成的项写进下一个里程碑，不默默延期 |

## 十、安全与仓库卫生

- `.env*` 一律不入库，只提交 `.env.example`；
- 图片：WebP、单张 ≤ 300 KB，超过先压缩或走图床，禁止把原图直接 commit；
- 不提交 `node_modules`、`dist`、本地缓存（`.gitignore` 已覆盖）；
- 素材与数据必须可追溯来源（`sources` 字段），无授权素材不进仓库。
