# Lighthouse 基线（2026-11-23）

对象：<https://hldwsd.github.io/xiangyu-map/>（main `2270c05`，prerender + CDN）
工具：Lighthouse 12，headless Chrome，本机 Windows；移动档为 Lighthouse 默认模拟（Moto G Power 级 CPU 4× 节流 + 慢 4G）。

## 结果

| 分类           | 桌面   | 移动   | DoD                   |
| -------------- | ------ | ------ | --------------------- |
| Performance    | **93** | **77** | 桌面 ≥85、移动 ≥70 ✅ |
| Accessibility  | 100    | 100    | —                     |
| Best Practices | 100    | 96     | —                     |
| SEO            | 100    | 100    | —                     |

关键指标：

| 指标        | 桌面   | 移动   |
| ----------- | ------ | ------ |
| FCP         | 0.8 s  | 0.8 s  |
| LCP         | 1.3 s  | 2.2 s  |
| TBT         | 100 ms | 520 ms |
| CLS         | 0      | 0      |
| Speed Index | 1.4 s  | 8.7 s  |
| TTI         | 1.4 s  | 3.3 s  |

## 移动档是怎么从 64 提到 77 的

第一次移动档 **Performance 64**、TBT **14,840 ms**、TTI 21.9 s。归因到地标小球：初次加载时 `resetBalls` 用 RAF 动画，70 颗球每帧一次 `setOption`，4× CPU 节流下变成几十个 200–600 ms 长任务。

改为「初次落位静默结算」后（#161）：不 RAF、不渲染，跑物理到平衡再一次性 `applyBalls`。

| 指标        | 改前      | 改后                           |
| ----------- | --------- | ------------------------------ |
| Performance | 64        | 82（本地 preview）/ 77（生产） |
| TBT         | 14,840 ms | 220 ms（本地）/ 520 ms（生产） |
| TTI         | 21.9 s    | 4.2 s / 3.3 s                  |

## 已知失分项（不影响 DoD）

- 移动 **Best Practices 96**：`font-size` 审计报「0% legible text」。根因待查——根字号用了 `clamp()`，疑似 Lighthouse 读不到 clamp 后的实际字号导致全量误判；其余项均满分；
- `valid-source-maps` 为信息项（权重 0），未上传 source map。
- 移动 Speed Index 8.7 s 偏高：首屏要等 ECharts 绘制完地图才「视觉稳定」，属于地图类页面的固有特征；TBT 与 LCP 均已达标。

## 复跑方式

```bash
npx --yes lighthouse@12 https://hldwsd.github.io/xiangyu-map/ \
  --preset=desktop --output=json --output-path=.tmp/lh-desktop.json --chrome-flags="--headless=new"
npx --yes lighthouse@12 https://hldwsd.github.io/xiangyu-map/ \
  --output=json --output-path=.tmp/lh-mobile.json --chrome-flags="--headless=new"
```

分数受网络与机器负载影响，记录一次即可；后续发版前复跑对比。
