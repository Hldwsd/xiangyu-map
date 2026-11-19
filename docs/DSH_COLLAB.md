# 两人两机的 DSH 协作方案

> 适用：A（Hldwsd）、B（xc3122），各自一台电脑、各自装 DSH，各自挑插件。
> 实测环境：DSH `0.2.2-rc.3`（Windows Desktop，profile = `desktop`）、Node `24.12.0`、pnpm `11.22.0`。
> 配套：[AGENTS.md](../AGENTS.md)（agent 每次会话自动读）、[协作规范](COLLABORATION.md)（人的规则）、[项目规划](PROJECT_PLAN.md)（唯一准绳）。

## 0. 一句话方案

**仓库里放"共享能力"，机器上放"个人能力"。**

- 共享的（指令、技能、MCP 定义、契约、质量闸门）进 git → 两个人**自动**一致，不需要谁去同步谁；
- 个人的（插件、模型密钥、会话、权限预设）留在各自的 `$DSH_HOME` → 谁也不该要求对方"装我这个才能跑"。

## 1. 先认清一件事：agent 的记忆不跨机器

DSH 的会话、插件、模型配置、bundle 都在 profile 目录里（本机是 `C:\Users\hldws\.dsh\profiles\desktop`）。两台机器就是两份，永远不会自动同步。

所以：

- 对方 agent **看不到**你昨天在会话里说过的任何话；
- 唯一可靠的跨机器上下文通道是 **git 里的文件**：`AGENTS.md`、PR 描述、commit 正文、`docs/`；
- 推论——凡是"下周还要用"的信息，落进仓库，别留在对话里。这也是本仓库要求提交信息写「为什么」的真正原因。

## 2. 共享面：进仓库、双方自动生效

| 文件                                     | 作用                         | 双方怎么"吃到"它                                                                                                      |
| ---------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`（项目根）                    | 给 agent 的团队约定          | 每次新会话自动注入项目指令链（实测：文件落盘后当前会话立刻出现 `Instructions from: …/AGENTS.md`）                     |
| `.dsh/skills/<name>/SKILL.md`            | 团队技能（可复用的操作手册） | 项目技能根 rank 100，优先级高于个人技能根 rank 400（实测：新增 `site-data-entry` 后，当前会话的技能目录立刻出现该条） |
| `.dsh/@it-glen/dsh-mcp-manager/mcp.json` | 项目级 MCP 服务器定义        | 随仓库走、按当前工作目录热加载；文件里只存 `${ENV}` 引用                                                              |
| `src/types/site.ts`                      | 数据契约                     | 代码里唯一的接口真相                                                                                                  |
| `.github/`（PR/Issue 模板 + CI）         | 闸门与评审格式               | 开 PR 自动套模板，CI 自动跑                                                                                           |
| `docs/`（规划、ADR、协作、本文）         | 人读的决策与规则             | 人和 agent 都能引用                                                                                                   |

三条实施细节：

1. **技能放小事**：`SKILL.md` 适合"新增一个文旅项目要检查什么"这种两人都会反复做的事；一个技能一个目录，名字 kebab-case。
2. **MCP 配置要 review**：项目级 `mcp.json` 随仓库走，意味着别人 approve 的是"会以你的身份跑什么"。原则是文件里只写 `${ENV}` 引用，真 token 和真路径放各自的环境变量；新增服务器必须在 PR 里说明用途和权限范围。
3. **项目根 = 最近的 `.git` 祖先**：所以 `.dsh/` 必须放在仓库根，放在子目录不会被加载。

## 3. 个人面：不进仓库、互不干涉

| 东西                 | 位置                                          | 规则                                     |
| -------------------- | --------------------------------------------- | ---------------------------------------- |
| 插件 / bundle        | `$DSH_HOME/profiles/<profile>/`               | 各自挑，装什么不影响对方                 |
| 模型与 API key       | 同上（Settings → Models）                     | 绝不提交；两个人用不同 provider 也没问题 |
| 全局 MCP 服务器      | `$DSH_HOME/@it-glen/dsh-mcp-manager/mcp.json` | 个人常连的放全局；项目相关的才进仓库     |
| 会话历史、技能、归档 | `$DSH_HOME`                                   | 属于个人上下文，不作为交付物             |
| 权限与审批策略       | 每次会话/预设                                 | 可以不同，但都要遵守下面的"下限能力"     |

## 4. 每人一次性 setup（约 10 分钟）

1. 装 Node 24.12（或满足 `engines` 的版本）、`corepack enable`；pnpm 版本由 `package.json` 的 `packageManager` 自动锁定；
2. `git clone` → `pnpm install --frozen-lockfile`；
3. 用 DSH 打开这个仓库目录作为 workspace；
4. **新开一个会话，确认首条请求里出现 `Instructions from: …/AGENTS.md`**——没出现说明项目根识别错了，先修这个，不然后面所有约定都不生效；
5. 按需装插件（见第 6 节），装完重启会话；
6. 需要 MCP 时：项目级写 `.dsh/@it-glen/dsh-mcp-manager/mcp.json`（只写 `${ENV}`），个人常连的写自己 profile；
7. `git config --global user.email` 用 GitHub 的 noreply 地址（见 [COLLABORATION.md](COLLABORATION.md)）。

排查命令：`dsh --profile desktop --dump-config` 可以看到当前 profile 实际加载了哪些行。

## 5. 日常循环：一次改动七步

| 步骤 | 谁做     | 产物                                     | 检查点                              |
| ---- | -------- | ---------------------------------------- | ----------------------------------- |
| 1    | 任何人   | GitHub Issue：一句话意图 + 验收标准      | 认领（assignee）= 占坑，防止撞车    |
| 2    | 认领者   | 从最新 `main` 切分支                     | 分支名带 scope，如 `feat/map-hover` |
| 3    | 认领者   | `git pull --rebase`，然后才让 agent 动手 | 只改自己 scope 内的文件             |
| 4    | 认领者   | 本地五条闸门全绿                         | 见 `AGENTS.md`「硬性规则」第 3 条   |
| 5    | 认领者   | 提交：Conventional Commits + 为什么      | 一个提交一件事                      |
| 6    | 认领者   | Push + PR（套模板，填交接三行）          | 描述里写清验证方式                  |
| 7    | **对方** | 评审 → approve → squash 合并             | 作者不自合；评审 24h 内响应         |

评审建议用 DSH 的 `read-only` 权限预设开一个会话（官方的工作流就是用它跑评审）：对方 agent 只读，不会把你的工作区改坏。

## 6. 插件分工与"能力下限"

**核心规则：任何一次提交，必须能被"下限能力"复现。** 下限 = 读写文件 + 跑 shell + git + gh + 跑测试。插件只加速，不能成为别人复现你改动的先决条件。

| 能力                           | 是否必需 | 说明                                                |
| ------------------------------ | -------- | --------------------------------------------------- |
| 文件读写、shell、git           | 必需     | 没有这个连代码都改不了                              |
| `gh` CLI                       | 必需     | 开 Issue / PR、看 CI；两人本地都装过并登录          |
| 浏览器自动化（如 ego-browser） | 可选     | UI 改动自验收；没装就用截图 + 描述，或请对方代验    |
| 文档/Office 类                 | 可选     | 写汇报、导表格时用，不进仓库流程                    |
| 记忆 / 归档 / 侧栏类           | 可选     | 纯个人效率偏好，不影响仓库                          |
| MCP（GitHub、数据库、设计稿）  | 可选     | 一旦写进仓库的 `mcp.json` 就变成团队资产，要 review |

想让两人装**同一套**插件：可以自建一个插件索引（`index.json` 放 GitHub Pages），两边从同一 source 装同一版本——注意索引属于第三方内容，DSH 只校验格式不校验宣称，装前务必确认 source。

A 机器上目前在用的一套，仅供参考、**不是要求**：

| 插件                              | 用途                                             |
| --------------------------------- | ------------------------------------------------ |
| `dsh-ego-browser`                 | UI 改动的自验收（截图 + 点击闭环）               |
| `billion-context` / `dsh-context` | 长会话上下文压缩，跑长任务时少断片               |
| `@michengai/dsh-archive-manager`  | 会话归档，复盘时能翻回当时的判断                 |
| `dsh-better-sidebar`              | 界面效率（纯个人偏好）                           |
| `@it-glen/dsh-mcp-manager`        | MCP 服务器管理，本方案的项目级 `mcp.json` 靠它读 |

B 挑自己顺手的即可。只要"下限能力"齐备，两个人用完全不同的插件集也能接力——这正是把共享约定放进仓库、而不是放进插件的原因。

## 7. 两个 agent 同时写代码时的冲突规则

1. **文件所有权优先**：`PROJECT_PLAN.md` 的分工表说谁管哪块，就谁改；"顺手改一下"是冲突之源。
2. **一次只锁一个领域**：改动跨两个领域 → 拆 PR，别让两个 agent 在同一批文件上同时落笔。
3. **lockfile 单点负责**：谁改依赖谁 `pnpm install` 并提交 `pnpm-lock.yaml`；另一人 rebase 之后再动依赖。
4. **生成物不手改**：底图用 `pnpm data:china-map`，排版用 `pnpm format`——手改会让下次生成时整篇漂移。
5. **长分支不友好**：3 天内合，合不了就砍成两个 PR。
6. **冲突不可怕，"你以为对方知道"才可怕**：任何跨文件约定，先落到文档或 Issue 里。

## 8. 交接（handoff）格式

没做完就留三行，写进 PR 描述（模板里有「交接」栏）或 Issue 评论：

```text
当前状态：地图 hover 已经能高亮，但 tooltip 在缩放后位置会偏
下一步：改用 geo 坐标转换重算偏移，参考 issue #12 的截图
已知的坑：CN 地图在 roam 后 getZr() 的偏移基准会变，别直接用页面坐标
```

原因见第 1 节：对方的 agent 读不到你的会话，只读得到仓库。

## 9. 安全与权限

- **评审会话用只读预设**，不要用满权限去 review 别人的分支。
- **`$DSH_HOME` 永不入库**：里面有 key、会话历史、插件。
- **项目级 `mcp.json` 会被执行**：它等价于"以你的身份启动的进程清单"，review 它的认真程度应该和 review 代码一样。
- 提交前自查：`git diff --cached | findstr /i "token secret password"`（Windows）或 `git diff --cached | grep -iE "token|secret|password"`。

## 10. 一页检查清单

**开工前**

- [ ] Issue 存在且我认领了
- [ ] 分支从最新 `main` 切出，`git pull --rebase` 过
- [ ] 新会话里确认 `AGENTS.md` 已加载

**提交前**

- [ ] `pnpm lint` / `format:check` / `type-check` / `test:unit --run` / `build` 全绿
- [ ] 提交信息有「为什么」，一个提交一件事
- [ ] 没有 `.env`、截图、个人配置混进暂存区

**开 PR 前**

- [ ] 描述填了验证方式（点了哪里、看到什么）
- [ ] 没做完 → 交接三行
- [ ] 涉及契约 → 已 @ 对方

**合并后**

- [ ] 删分支；`main` 上 `pnpm install && pnpm dev` 仍可跑
- [ ] 有取舍的决策补一条 ADR

## 附录：本文事实来源（可复核）

| 结论                                       | 出处                                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 项目技能根 rank 100、个人技能根 rank 400   | 安装内文档 `docs/subsystems/skills.md`「Local discovery priority」                                                                       |
| 项目根按最近 `.git` 祖先判定               | 同上（「The project root is the nearest ancestor containing `.git`」）                                                                   |
| 项目指令链与用户全局 `$DSH_HOME/AGENTS.md` | 安装内 `docs/config-catalog.md`（`@deepseek-ai/dsh-agent-instructions`）、升级指南 `v0.2.1-alpha.1/instruction-home-override`            |
| 项目级 MCP 配置路径与 `${ENV}` 约定        | `@it-glen/dsh-mcp-manager` `0.3.2` 的 README（「项目级配置 … 随仓库走、可提交 git 团队共享」「配置只存 `${ENV}` 引用、不落盘密钥本身」） |
| 自建插件索引                               | 安装内 `docs/user/guide/plugin-market.md`                                                                                                |
| `read-only` 用于评审会话                   | 安装内 `docs/user/guide/github-review.md`                                                                                                |
| DSH 版本                                   | `dsh --version` → `0.2.2-rc.3`                                                                                                           |
