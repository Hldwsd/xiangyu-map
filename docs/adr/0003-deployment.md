# 0003. 部署选型：GitHub Pages（分支发布）+ 子目录 PR 预览

- 状态：已接受
- 日期：2026-11-19
- 决策人：Hldwsd（A）

## 背景

M0 最后一项（Issue #7）要求「PR 出预览地址、main 合并即上线」。约束有三条，都在排期里：

1. **没有后端、没有域名预算**：v0.1.0 之前只托管静态产物；
2. **只有两个人的账号**：任何需要新注册第三方账号、把 API token 塞进仓库 secret 的方案，都要额外一次「谁去注册、token 放哪」的协调；
3. **每次改动都要评审**：预览环境的价值不在「看首页」，而在于评审者能点到对方的改动。

## 决策

用 **GitHub Pages + `gh-pages` 分支发布**，PR 预览放在同一站点的子目录：

- `deploy.yml`：push `main` → `pnpm build-only --base=/<repo>/` → 把 `dist/index.html` 复制成 `dist/404.html` → 推到 `gh-pages` 根目录（`keep_files: true`）；
- `preview.yml`：`pull_request`（opened / synchronize / reopened）→ 以 `--base=/<repo>/pr-<n>/` 构建 → 推到 `gh-pages` 的 `pr-<n>/` → 在 PR 里维护一条带 `<!-- deploy-preview -->` 标记的评论；
- PR 关闭时，`cleanup` job 删掉对应的 `pr-<n>/` 目录；
- 两个工作流共用一个 `concurrency: gh-pages-deploy`，因为都要推同一分支，并行推会互相覆盖；
- 站点地址：`https://hldwsd.github.io/xiangyu-map/`，预览地址 `https://hldwsd.github.io/xiangyu-map/pr-<n>/`。

## 理由

- **零新账号、零新 secret**：只需要仓库自带的 `GITHUB_TOKEN`，权限用 `contents: write` 显式声明；B 不需要在自己的机器上配任何东西。
- **预览与主站同源**：预览是主站的一个子目录，评审者不用登录第三方面板；PR 关闭即清理，不留垃圾站点。
- **失败隔离**：预览与部署是两个独立工作流，预览挂了不会把 lint/test 的 `CI` 拖红——这是 Issue #7 的验收项之一。
- **子路径能力顺手验证了部署正确性**：为了在子目录下工作，资源路径必须走 `import.meta.env.BASE_URL`（新增 `src/utils/asset-url.ts`）。这条约束如果只在根路径部署，永远发现不了，等到换托管平台才爆。

## 后果

- **深链在预览里不完美**：GitHub Pages 只认站点根目录的一个 `404.html`，预览站的 `/pr-<n>/site/<id>` 刷新会落到主站的 404 页（也就是主站首页）。评审以首页与站内点击为准，深链行为以 `main` 为准——这一点写进了 `preview.yml` 的注释。
- **`gh-pages` 分支会积累历史**：每次部署一次提交，`.git` 会慢慢变大；需要时用 `git checkout --orphan` 重建该分支即可，不影响源码仓库。
- **没有自定义域名与 HTTPS 证书管理**：GitHub Pages 给 `*.github.io` 的 HTTPS 是自动的；将来上域名时只需加 `CNAME` 并同步 Vite `base`。
- **不能跑动态能力**：将来要做评论、后台录入，静态托管就不够了，届时换 Vercel/Cloudflare 或上 BaaS，另开 ADR。

## 备选方案

- **Vercel**：PR 预览是原生能力，体验最好；但需要 GitHub 应用授权或 `VERCEL_TOKEN` 写进仓库 secret，Hobby 计划对商业用途有限制，事实与价格本仓库未核实（本文档不引用未验证的数字）。留作「有域名/有团队账号」后的迁移目标。
- **Cloudflare Pages**：免费额度宽松（官方文档：Free 500 builds/月、单次构建并发 1、单站点 20,000 文件、单文件 25 MiB、预览部署数量不限，见 [Limits](https://developers.cloudflare.com/pages/platform/limits/)），预览部署也是原生能力；但同样需要 Cloudflare 账号与 API token。
- **官方 `actions/deploy-pages`**：只需 `GITHUB_TOKEN`，但一次部署只推进一个产物包，做不了「主站 + 每次 PR 一个子目录」的结构，与预览需求冲突。
- **Netlify / Surge / Vercel 静态 CLI（一次性上传）**：要么账号，要么每次带 token，在 CI 里都是同一个问题。

## 参考

- GitHub Pages 用量限制（1 GB 站点、10 分钟部署超时、100 GB/月软带宽、10 次/小时软构建限制——用自定义 Actions 工作流构建时不受最后一条限制）：[GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- 自定义 404 页：[GitHub Docs](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site)
- Cloudflare Pages 限制：[Cloudflare Docs](https://developers.cloudflare.com/pages/platform/limits/)
