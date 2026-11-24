# 乡遇安徽 · 全站文案清单（手改稿）

这份文件把站内**所有可改的文案**集中到一处，每块都标了它在代码里的位置。你直接改正文，改完把文件发回来，我按标记逐块替换进项目，再跑 `lint / format / type-check / test:unit / build` 与品牌页 e2e 验证。

## 怎么改（必读）

1. **每块 = 一行标记 + 一行正文**：

   ```
   <!-- A-16 | brand/index.html | 首屏 · .hero__lede -->
   在安徽，值得专程一去的地方，一处一处标在同一张纸上。
   ```

   - 只改**正文那一行**；不要动 `<!-- ... -->` 标记行。
   - 一块只能一行：长段落也别手动折行（编辑器的软换行不影响，别按回车）。
2. **想删掉**：把正文写成 `（删除）`。**想新增**：复制一块，ID 自己编（例如 `A-46b`），标记里的「位置」写清楚新文案放在哪。
3. **含变量的块**（`{{ siteCount }}`、`${site.name}`）不能删变量；块下方以 `>` 开头的行是备注，说明原文结构（跨行、带标签、含变量）。
4. **D 区分段**：每条项目的详情正文在代码里是一整串、用空行分两段。清单里拆成 `p1` / `p2` 两块，对应改完会重新拼成 `p1\n\np2`。要加第三段请告诉我，别自己加块。
5. **事实不在这份清单里**：项目名、市名、分类名、数字（16 / 70 / 7 / 9）、坐标、日期、`tags`、来源链接、图片路径都属于数据或契约，改它们不是改文案——项目名 / 市名 / 坐标见 `src/data/sites.ts` 与 `src/types/site.ts`，数字见 `brand/index.html` 与 `src/brand/data.ts`。
6. **读屏文案（aria-label / alt / title）也收了进来**，标为「读屏」；它们不影响视觉，改的时候注意别把「关闭」「放大」这类操作含义改掉（e2e 与单测里有少量断言依赖它）。

## 目录

| 区  | 内容                                        | 文件                                                             |
| --- | ------------------------------------------- | ---------------------------------------------------------------- |
| A   | 品牌页 `/brand/` 的全部文字                 | `brand/index.html`、`src/brand/hero.ts`                          |
| B   | 品牌页脚本里的文字（风物注、遮罩、alt）     | `src/brand/*.ts`、`src/utils/brand-transition.ts`                |
| C   | 地图页与详情页（含 meta、菜单、空状态）     | `src/components/**`、`src/views/**`、`index.html`、`src/utils/page-meta.ts` |
| D   | 70 个项目的简介、正文两段、交通             | `src/data/sites.ts`                                              |
| E   | 事实与标签：不在这份清单里，别当文案改      | 见文件末尾说明                                                   |

> 时间有限的话，优先级：**A 区（A-01~A-04 标题与分享文案、A-15 小标、A-16 首屏引子、A-28/A-29 缘起大字、A-30/A-31 缘起正文、A-37~A-39 所见标题、A-43/A-44 十六城标题、A-48/A-49 风物标题、A-52~A-55 尾声）> D 区 summary > 其它**。

---

## A · 品牌页（`brand/index.html` + 首屏地图脚本 `src/brand/hero.ts`）

### 文档头（浏览器标签、搜索与分享卡片）

<!-- A-01 | brand/index.html | head · <title> -->
乡遇安徽 · 七十处山水尽收一卷

<!-- A-02 | brand/index.html | head · meta[name=description] -->
十六城、七十处山水，尽收一卷纸本墨线。乡遇安徽品牌页。

<!-- A-03 | brand/index.html | head · og:title -->
乡遇安徽 · 七十处山水尽收一卷

<!-- A-04 | brand/index.html | head · og:description -->
摊开地图，尽收安徽十六城，走遍整个安徽文化。

### 载入与外壳

<!-- A-05 | brand/index.html | 跳转链接 · .skip -->
跳到正文

<!-- A-06 | brand/index.html | loader · .loader__mark（4 个字各自一个 span，只改字，别加标点） -->
乡遇安徽

> A-06 是四个 `span`（乡 / 遇 / 安 / 徽）拼起来的，清单里写成连写只是为了好读；要改就四个字一起换。

<!-- A-07 | brand/index.html | loader · .loader__meta 第 1 行 -->
XIANGYU · ANHUI

<!-- A-08 | brand/index.html | loader · .loader__meta 第 2 行 -->
2016 → 2026

<!-- A-09 | brand/index.html | 顶栏 · .brand 的 aria-label（读屏） -->
乡遇安徽 · 品牌页

<!-- A-10 | brand/index.html | 顶栏导航 · 01 -->
缘起

<!-- A-11 | brand/index.html | 顶栏导航 · 02 -->
所见

<!-- A-12 | brand/index.html | 顶栏导航 · 03 -->
十六城

<!-- A-13 | brand/index.html | 顶栏导航 · 04 -->
风物

<!-- A-14 | brand/index.html | 顶栏 · .topbar__enter -->
进入地图

### 首屏

<!-- A-15 | brand/index.html | 首屏 · .hero__eyebrow（「地图上的安徽」这类小标） -->
一张纸上的安徽

<!-- A-16 | brand/index.html | 首屏 · .hero__lede -->
摊开地图，尽收安徽十六城，走遍整个安徽文化。

<!-- A-17 | brand/index.html | 首屏 · .hero__rail（竖排装饰，读屏隐藏） -->
一纸山河 · 十六画卷

<!-- A-18 | brand/index.html | 首屏 · .hero__folio 第 1 格 -->
卷壹 · 皖

<!-- A-19 | brand/index.html | 首屏 · .hero__folio 第 2 格 -->
北纬 29.4°–34.6° · 东经 114.9°–119.6°

<!-- A-20 | brand/index.html | 首屏 · .hero__enter-label -->
进入地图

<!-- A-21 | brand/index.html | 首屏 · .hero__enter-sub -->
16 座城 · 70 处山水

<!-- A-22 | brand/index.html | 首屏 · 地图占位提示 .hero__map-fallback -->
地图加载中……久久不出，请检查是否禁用了 JavaScript。

<!-- A-23 | brand/index.html | 首屏 · 图例第 1 项 -->
文旅项目

<!-- A-24 | brand/index.html | 首屏 · 图例第 2 项 -->
地级市

<!-- A-25 | brand/index.html | 首屏 · .hero__scroll -->
向下 · SCROLL

### 缘起（01）

<!-- A-26 | brand/index.html | 分节头 · 01 中文 -->
缘起

<!-- A-27 | brand/index.html | 分节头 · 01 英文 -->
Origin

<!-- A-28 | brand/index.html | 缘起 · .manifesto__line 第 1 行 -->
一张地图，

<!-- A-29 | brand/index.html | 缘起 · .manifesto__line 第 2 行 -->
收进散在县道尽头的祠堂、渡口、戏台。

<!-- A-30 | brand/index.html | 缘起 · 正文第 1 段 -->
安徽十六座城。每座城都富有文化底蕴，祠堂、渡口、戏台，散在各个县道尽头——跟着地图，走遍整个安徽文化。

<!-- A-31 | brand/index.html | 缘起 · 正文第 2 段 -->
十六座城落在同一张地图上：七十处古镇、非遗、红色、自然、演艺、乡村与场馆，每一处都有其特点。

> 说明：上面的 4 个数字（16 / 70 / 7 / 9）与单位（座 / 处 / 类 / 片）是数据，改文案时不要改它们的口径；数字本身在 `brand/index.html` 的 `.ledger` 与 `.stats` 里，改数字要同步 `src/brand/data.ts`。

### 照片带（02.5）

<!-- A-32 | brand/index.html | 照片带 · 标题 -->
纸上所见

<!-- A-33 | brand/index.html | 照片带 · 小标第 1 格 -->
FROM THE ROAD

<!-- A-34 | brand/index.html | 照片带 · 小标第 2 格 -->
五张

> 照片带 5 张图下面的名字与「市 · 分类」是事实（天柱山 / 桃花潭 / 查济 / 九华山 / 花戏楼），不在本清单里。

### 所见（02）

<!-- A-35 | brand/index.html | 分节头 · 02 中文 -->
所见

<!-- A-36 | brand/index.html | 分节头 · 02 英文 -->
Sights

<!-- A-37 | brand/index.html | 所见 · 大标题第 1 行 -->
六处地点

<!-- A-38 | brand/index.html | 所见 · 大标题第 2 行 -->
精彩的不仅是风景，

<!-- A-39 | brand/index.html | 所见 · 大标题第 3 行 -->
都在地图一一呈现。

<!-- A-40 | brand/index.html | 所见 · 底部提示 -->
-> · 横向滚动 · ->

### 十六城（03）

<!-- A-41 | brand/index.html | 分节头 · 03 中文 -->
十六城

<!-- A-42 | brand/index.html | 分节头 · 03 英文 -->
16 Cities

<!-- A-43 | brand/index.html | 十六城 · 大标题第 1 行 -->
十六座城，

<!-- A-44 | brand/index.html | 十六城 · 大标题第 2 行 -->
各有各的文化底蕴。

<!-- A-45 | brand/index.html | 十六城 · 右侧注 -->
鼠标停在城名上，可查看预览图。

### 风物（04）

<!-- A-46 | brand/index.html | 分节头 · 04 中文 -->
风物

<!-- A-47 | brand/index.html | 分节头 · 04 英文 -->
Seven Kinds

<!-- A-48 | brand/index.html | 风物 · 大标题第 1 行 -->
七类风物，

<!-- A-49 | brand/index.html | 风物 · 大标题第 2 行 -->
七种文化展现。

<!-- A-50 | brand/index.html | 风物 · 抽屉序号（`01 / SEVEN`，序号是变量） -->
01 / SEVEN

<!-- A-51 | brand/index.html | 风物 · 抽屉提示 -->
点击照片置顶

### 尾声（05）

<!-- A-52 | brand/index.html | 尾声 · 小标 -->
尾声 · 相遇安徽

<!-- A-53 | brand/index.html | 尾声 · 大标题第 1 行 -->
乡遇安徽，

<!-- A-54 | brand/index.html | 尾声 · 大标题第 2 行 -->
让我们在安徽相遇。

<!-- A-55 | brand/index.html | 尾声 · 引言 -->
安徽十六座城共绘一卷。跟着地图，走遍整个安徽文化。

<!-- A-56 | brand/index.html | 尾声 · 主按钮 -->
进入安徽省地图

<!-- A-57 | brand/index.html | 尾声 · 落款印下的字 -->
乡遇 · 二〇二六

### 页脚（colophon）

<!-- A-58 | brand/index.html | 页脚 · 品牌中文 -->
乡遇安徽

<!-- A-59 | brand/index.html | 页脚 · 品牌英文行 -->
一张纸上的七十处山水 · 2026

<!-- A-60 | brand/index.html | 页脚 · 底图 值 -->
DataV.GeoAtlas（开发期示意，上线前替换为经审核数据）

<!-- A-61 | brand/index.html | 页脚 · 水面与河道 值 -->
© OpenStreetMap contributors（ODbL）

<!-- A-62 | brand/index.html | 页脚 · 书法 值 -->
邓石如《少学琴书册》，清代，公有领域

<!-- A-63 | brand/index.html | 页脚 · 图片与文字 值 -->
来源见各项目详情页

<!-- A-64 | brand/index.html | 页脚 · 左下角 -->
MIT License · xiangyu-map

<!-- A-65 | brand/index.html | 页脚 · 右下角返回 -->
返回地图 ↗

### 品牌页的读屏文案

<!-- A-66 | src/brand/hero.ts | 首屏地图 · svg <title>（读屏） -->
安徽省地图，16 个地级市与 70 处文旅项目

<!-- A-67 | src/brand/hero.ts | 首屏地图 · svg role=group 的 aria-label（读屏；与上一条只差一个标点） -->
安徽省地图：16 个地级市与 70 处文旅项目

<!-- A-68 | brand/index.html | 十六城 · 城市封面 aria-hidden 容器，内含「处」的单位（读屏不读） -->
处

> A-68 这类单位字（`处`、`座`、`类`、`片`、`张`）在页面里出现多次，属于标签而不是句子，一般不用单独改。

---

## B · 品牌页脚本里的文字

<!-- B-01 | src/brand/data.ts | 风物注 · 古镇 -->
青石板、马头墙，没走完巷子，便不算到过。

<!-- B-02 | src/brand/data.ts | 风物注 · 非遗 -->
宣纸、徽墨、鱼灯、傩面，传下来的不止是技艺。

<!-- B-03 | src/brand/data.ts | 风物注 · 红色 -->
大别山与皖南的旧址，留着一代人的名字。

<!-- B-04 | src/brand/data.ts | 风物注 · 自然 -->
云海、山脊、湖面，以及不必赶路的一天。

<!-- B-05 | src/brand/data.ts | 风物注 · 演艺 -->
黄梅戏的腔，一辈子的台上台下。

<!-- B-06 | src/brand/data.ts | 风物注 · 乡村 -->
晒秋的屋檐、稻场，和村口那棵古老的树。

<!-- B-07 | src/brand/data.ts | 风物注 · 场馆 -->
博物院里的楚大鼎，和一座城的记忆。

<!-- B-08 | src/brand/data.ts | 首屏图例计数行 HERO_META（模板，只改三个量词） -->
${TOTAL_CITIES} 城 · ${TOTAL_SITES} 处 · ${SITE_CATEGORIES.length} 类

> B-08 里的 `${...}` 是三个数字（16 / 70 / 7），别删；能改的只有「城 / 处 / 类」三个量词与中间的 ` · ` 分隔符。

<!-- B-09 | src/brand/hero.ts | 地图点上的 aria-label 模板（读屏；变量 ${site.name} / ${site.city} 不能删） -->
${site.name}，${site.city}，查看详情

<!-- B-10 | src/brand/hero.ts | 地图悬停提示第 2 行（模板） -->
${site.category} · ${site.city}

<!-- B-11 | src/brand/hero.ts | 地级市点的悬停提示 -->
${city.count} 处项目

<!-- B-12 | src/brand/sights.ts | 「所见」每块画板的 aria-label（读屏，模板） -->
${site.name}，查看项目详情

<!-- B-13 | src/brand/sights.ts | 画板图片 alt（读屏，模板） -->
${site.name}的封面

<!-- B-14 | src/brand/sights.ts | 画板上的「看详情」 -->
看详情

<!-- B-15 | src/brand/crafts.ts | 风物照片的 aria-label（读屏，模板） -->
把${pick.name}放到最前

<!-- B-16 | src/brand/entry.ts | 点「进入地图」后遮罩上的小字 -->
地图 · 一纸山河

<!-- B-17 | src/utils/brand-transition.ts | 从地图去品牌页时遮罩上的小字 -->
品牌页 · 一纸山河

---

## C · 地图页与详情页

### 站点级 meta 与标题

<!-- C-01 | index.html | head · meta[name=description] -->
乡遇安徽：一张安徽省地图，古镇、非遗、红色、自然、演艺、乡村，按十六城逐一标注。

<!-- C-02 | index.html | head · <title> -->
乡遇安徽

<!-- C-03 | src/utils/page-meta.ts | SITE_TITLE（详情页标题会拼成「项目名 · 乡遇安徽」） -->
乡遇安徽 · 在地图上，遇见安徽

<!-- C-04 | src/views/SiteDetailView.vue | 详情页 title 模板（模板，别删 ${}） -->
${current.name} · 乡遇安徽

### 首页版头（HomeRail）

<!-- C-05 | src/components/home/HomeRail.vue | .rail__sub -->
摊开地图，尽收安徽十六城，走遍整个安徽文化

<!-- C-06 | src/components/home/HomeRail.vue | .rail__quote（古诗，汤显祖《游黄山》） -->
一生痴绝处，无梦到徽州

<!-- C-07 | src/components/home/HomeRail.vue | .rail__label 第 1 个 -->
分类 · 图例

<!-- C-08 | src/components/home/HomeRail.vue | .rail__hint（原文有错字：「上市底色」） -->
地图上底色越深，收录越多。

<!-- C-09 | src/components/home/HomeRail.vue | .rail__label 第 2 个 -->
本期精选

<!-- C-10 | src/components/home/HomeRail.vue | .rail__meta 第 1 行 -->
安徽省 · 16 个地级市

<!-- C-11 | src/components/home/HomeRail.vue | .rail__meta 第 2 行 -->
底图：DataV.GeoAtlas · 封面来自公开资料

<!-- C-12 | src/components/home/HomeRail.vue | .rail__meta-warn -->
公开登载需审图号（待办，见菜单 About）；底图需核验商用授权

<!-- C-13 | src/components/home/HomeRail.vue | .rail__credit 前半 -->
水系与河道 ©

<!-- C-14 | src/components/home/HomeRail.vue | .rail__menu -->
菜单 / 关于

<!-- C-15 | src/components/home/HomeRail.vue | .rail 的 aria-label（读屏） -->
地图版头

### 顶栏（TopBar）

<!-- C-16 | src/components/layout/TopBar.vue | 搜索框 placeholder -->
搜地名、城市或标签，如「古城」

<!-- C-17 | src/components/layout/TopBar.vue | 打开菜单按钮 aria-label（读屏） -->
打开菜单

<!-- C-18 | src/components/layout/TopBar.vue | 搜索框 aria-label（读屏） -->
搜索文旅项目

<!-- C-19 | src/components/layout/TopBar.vue | 清除搜索 aria-label（读屏） -->
清除搜索

<!-- C-20 | src/components/layout/TopBar.vue | 项目列表 aria-label（读屏） -->
项目列表

### 菜单抽屉（MenuDrawer）

<!-- C-21 | src/components/layout/MenuDrawer.vue | 抽屉标签 -->
一纸山河 · 十六画卷

<!-- C-22 | src/components/layout/MenuDrawer.vue | 导航 · 项目列表 -->
项目列表

<!-- C-23 | src/components/layout/MenuDrawer.vue | 导航 · 回到地图 -->
回到地图

<!-- C-24 | src/components/layout/MenuDrawer.vue | 导航 · 品牌页 -->
品牌页 · 一纸山河

<!-- C-25 | src/components/layout/MenuDrawer.vue | 「地图图层」小标题 -->
地图图层

<!-- C-26 | src/components/layout/MenuDrawer.vue | 开关 1 标签 -->
显示区县界

<!-- C-27 | src/components/layout/MenuDrawer.vue | 开关 1 说明 -->
默认开启：按区县看项目分布更准；官方标准图（皖S(2025)71号）有 16 个地级市

<!-- C-28 | src/components/layout/MenuDrawer.vue | 开关 2 标签 -->
合并重叠标签

<!-- C-29 | src/components/layout/MenuDrawer.vue | 开关 2 说明 -->
默认关闭：每个项目单独画，方便逐个点选；打开后靠得近的项目会合成一个数字

<!-- C-30 | src/components/layout/MenuDrawer.vue | 「关于」小标题 -->
关于

<!-- C-31 | src/components/layout/MenuDrawer.vue | 关于 · 第 1 段（模板里 16 与「个」之间跨行，改完我合并） -->
「乡遇安徽」一张地图收录十六城的文旅项目：古镇、非遗、红色、自然、演艺、乡村、场馆七类，以形区分，点开查看详情。

<!-- C-32 | src/components/layout/MenuDrawer.vue | 关于 · 第 2 段（含变量 {{ siteCount }}，不能删；`public/maps/README.md` 原文是 code 标签） -->
{{ siteCount }} 条数据的出处，条条可核；封面取自公开资料，版权归原作者，底图与图层来源见 public/maps/README.md。

<!-- C-33 | src/components/layout/MenuDrawer.vue | 关于 · 第 3 段（审图号，事实性很强，慎改） -->
行政区划依据：安徽省自然资源厅《安徽省示意图（一）》（审图号 皖S(2025)71号）——该标准图只划分 16 个地级市，因此区县界只是补充图层，可在上方按需关掉。

<!-- C-34 | src/components/layout/MenuDrawer.vue | 关于 · 第 4 段 -->
背景书法：邓石如《少学琴书册》（清代，公有领域）。

<!-- C-35 | src/components/layout/MenuDrawer.vue | 关于 · 第 5 段（版权声明，事实性；OpenStreetMap 原文是链接，改字我保留链接） -->
湖泊与河道数据 © OpenStreetMap contributors，按 ODbL 授权；底图轮廓来自 DataV.GeoAtlas。

<!-- C-36 | src/components/layout/MenuDrawer.vue | 抽屉页脚 -->
纸本墨线 · 2026

<!-- C-37 | src/components/layout/MenuDrawer.vue | 关闭菜单 aria-label ×2（读屏） -->
关闭菜单

### 列表、选中卡、筛选

<!-- C-38 | src/components/layout/SiteListSheet.vue | 列表头（含变量 {{ sites.length }}） -->
当前 {{ sites.length }} 个项目

<!-- C-39 | src/components/layout/SiteListSheet.vue | 空状态 -->
没有匹配，换个关键词，或清空筛选。

<!-- C-40 | src/components/layout/SiteListSheet.vue | 关闭列表 aria-label（读屏） -->
关闭列表

<!-- C-41 | src/components/site/SitePanel.vue | 事实项 1 -->
最佳季节

<!-- C-42 | src/components/site/SitePanel.vue | 事实项 2 -->
交通

<!-- C-43 | src/components/site/SitePanel.vue | 按钮 -->
查看详情

<!-- C-44 | src/components/site/CategoryFilter.vue | 分类 chip 的「全部」 -->
全部

<!-- C-45 | src/components/site/CategoryFilter.vue | 分组 aria-label（读屏） -->
按分类筛选

<!-- C-46 | src/components/site/CityFilter.vue | 城市选择器标签 -->
城市

<!-- C-47 | src/components/site/CityFilter.vue | 下拉第一项 -->
全部城市

<!-- C-48 | src/components/home/CategoryLegend.vue | 图例「全部」 -->
全部

<!-- C-49 | src/components/home/CityIndex.vue | 城市索引标题 -->
城市索引

<!-- C-50 | src/components/home/CityIndex.vue | 城市索引 aria-label（读屏） -->
城市索引

### 地图页（HomeView）与地图组件

<!-- C-51 | src/views/HomeView.vue | 从品牌页进来时的遮罩标题 -->
乡遇安徽

<!-- C-52 | src/views/HomeView.vue | 从品牌页进来时的遮罩小字 -->
地图 · 一纸山河

<!-- C-53 | src/views/HomeView.vue | 筛到 0 条 · 主文案 -->
没有匹配的项目

<!-- C-54 | src/views/HomeView.vue | 筛到 0 条 · 按钮 -->
清空筛选

<!-- C-55 | src/views/HomeView.vue | 有筛选时的重置按钮（同 C-54 文字，两处） -->
清空筛选

<!-- C-56 | src/views/HomeView.vue | 窄屏左抽屉按钮 -->
分类

<!-- C-57 | src/views/HomeView.vue | 窄屏右抽屉按钮 -->
城市

<!-- C-58 | src/views/HomeView.vue | 左抽屉标题 -->
分类筛选

<!-- C-59 | src/views/HomeView.vue | 右抽屉标题 -->
城市索引

<!-- C-60 | src/views/HomeView.vue | 左下角范围标签 -->
安徽省 · 16 个地级市

<!-- C-61 | src/components/map/AnhuiMap.vue | 地图整体 aria-label（读屏，长句） -->
安徽省地图，按 16 个地级市划分，标注各文旅项目位置。可用右侧缩放条缩放；键盘用户可用顶部「项目列表」逐项浏览

<!-- C-62 | src/components/map/AnhuiMap.vue | 底图加载中 -->
底图加载中…

<!-- C-63 | src/components/map/AnhuiMap.vue | 加载失败时按钮 -->
重试

<!-- C-64 | src/components/map/AnhuiMap.vue | 加载失败兜底文案（无具体错误信息时） -->
底图加载失败

<!-- C-65 | src/components/map/AnhuiMap.vue | 缩放条分组 aria-label（读屏） -->
地图缩放

<!-- C-66 | src/components/map/AnhuiMap.vue | 放大按钮 aria-label（读屏） -->
放大

<!-- C-67 | src/components/map/AnhuiMap.vue | 缩小按钮 aria-label（读屏） -->
缩小

<!-- C-68 | src/components/map/AnhuiMap.vue | 缩放级别 aria-label（读屏） -->
缩放级别

### 详情页（SiteDetailView）

<!-- C-69 | src/views/SiteDetailView.vue | 顶部返回按钮 -->
返回地图

<!-- C-70 | src/views/SiteDetailView.vue | 封面 alt 模板（读屏） -->
${site.name} 封面

<!-- C-71 | src/views/SiteDetailView.vue | 更新时间前缀 -->
更新于

<!-- C-72 | src/views/SiteDetailView.vue | 分享按钮 -->
分享

<!-- C-73 | src/views/SiteDetailView.vue | 小节标题 · 简介 -->
简介

<!-- C-74 | src/views/SiteDetailView.vue | 小节标题 · 实用信息 -->
实用信息

<!-- C-75 | src/views/SiteDetailView.vue | 事实项 · 坐标 -->
坐标

<!-- C-76 | src/views/SiteDetailView.vue | 事实项 · 建议停留 -->
建议停留

<!-- C-77 | src/views/SiteDetailView.vue | 事实项 · 最佳季节 -->
最佳季节

<!-- C-78 | src/views/SiteDetailView.vue | 事实项 · 开放时间 -->
开放时间

<!-- C-79 | src/views/SiteDetailView.vue | 事实项 · 门票 -->
门票

<!-- C-80 | src/views/SiteDetailView.vue | 事实项 · 交通 -->
交通

<!-- C-81 | src/views/SiteDetailView.vue | 事实项 · 适合 -->
适合

<!-- C-82 | src/views/SiteDetailView.vue | 事实项 · 地图 -->
地图

<!-- C-83 | src/views/SiteDetailView.vue | 高德链接文字 -->
在高德地图查看位置

<!-- C-84 | src/views/SiteDetailView.vue | 高德链接 title 提示 -->
打开高德地图的地点页；没有精确短链时按名称搜索

<!-- C-85 | src/views/SiteDetailView.vue | 事实项 · 预约 -->
预约

<!-- C-86 | src/views/SiteDetailView.vue | 小节标题 · 图集 -->
图集

<!-- C-87 | src/views/SiteDetailView.vue | 小节标题 · 同城其他项目 -->
同城其他项目

<!-- C-88 | src/views/SiteDetailView.vue | 小节标题 · 来源 -->
来源

<!-- C-89 | src/views/SiteDetailView.vue | 示例数据提示（仅带「示例数据」标签的项目显示） -->
当前为示例数据：文案、图片与来源均为占位，正式上线前会逐条替换为可核验的官方资料。

<!-- C-90 | src/views/SiteDetailView.vue | 封面来源提示（常规项目显示） -->
封面来自公开资料，版权归原作者；正式授权素材到位后替换。

<!-- C-91 | src/views/SiteDetailView.vue | 相邻项目 · 上一条 -->
上一条

<!-- C-92 | src/views/SiteDetailView.vue | 相邻项目 · 下一条 -->
下一条

<!-- C-93 | src/views/SiteDetailView.vue | 相邻项目 · 边界提示 1 -->
已是第一条

<!-- C-94 | src/views/SiteDetailView.vue | 相邻项目 · 边界提示 2 -->
已是最后一条

<!-- C-95 | src/views/SiteDetailView.vue | 底部返回按钮（文字同 C-69） -->
返回地图

<!-- C-96 | src/views/SiteDetailView.vue | 分享弹层标题 -->
分享这张卡片

<!-- C-97 | src/views/SiteDetailView.vue | 分享弹层 · 说明 -->
分享到社交平台时会显示这张 1200×630 卡片。

<!-- C-98 | src/views/SiteDetailView.vue | 分享弹层 · 按钮 1 -->
复制链接

<!-- C-99 | src/views/SiteDetailView.vue | 分享弹层 · 按钮 2 -->
保存图片

<!-- C-100 | src/views/SiteDetailView.vue | 分享弹层 · 按钮 3（支持系统分享时出现） -->
系统分享

<!-- C-101 | src/views/SiteDetailView.vue | 复制成功提示 -->
链接已复制

<!-- C-102 | src/views/SiteDetailView.vue | 复制失败提示 -->
复制失败，请手动复制地址栏

<!-- C-103 | src/views/SiteDetailView.vue | 找不到项目 · 标题 -->
没有找到这个项目

<!-- C-104 | src/views/SiteDetailView.vue | 找不到项目 · 说明 -->
链接可能已经失效，或者该项目已从数据中移除。

<!-- C-105 | src/views/SiteDetailView.vue | 读屏 · 关闭分享 -->
关闭分享

<!-- C-106 | src/views/SiteDetailView.vue | 读屏 · 相邻项目分组 -->
相邻项目

<!-- C-107 | src/views/SiteDetailView.vue | 读屏 · 来源链接模板 -->
打开来源：${source}

<!-- C-108 | src/views/SiteDetailView.vue | 读屏 · 分享图 alt（模板，含兜底词「项目」） -->
${site.value?.name ?? '项目'} · 分享图

---

## D · 70 个项目的文字

> 每条 4 块：`summary`（卡片一句话，上限 60 字）、`p1` / `p2`（详情正文两段，会拼成一段空行分隔的正文）、`transport`（交通，短句）。
> 标记里带项目 id，方便对照。`p2` 原样留空表示该项目只有一段，别自己合并。


## D · 70 个项目的文字

<!-- D-001 | src/data/sites.ts | 三河古镇（sanhe-ancient-town）· 一句话简介（≤60 字） -->
三河交汇的水乡古镇，青石板街与皖中老宅原样存着。

<!-- D-002 | src/data/sites.ts | 三河古镇（sanhe-ancient-town）· 正文 p1 -->
古镇因丰乐河、杭埠河、小南河三河交汇得名，主街沿河铺开，石板路两侧是晚清至民国的铺面与民居，杨振宁旧居就在街内。

<!-- D-003 | src/data/sites.ts | 三河古镇（sanhe-ancient-town）· 正文 p2 -->
沿河走一圈约两小时，晨昏光线最好；2015 年它成了合肥首个 5A 景区。镇内祠堂与名人旧居多，门票与开放时间以现场公示为准。

<!-- D-004 | src/data/sites.ts | 三河古镇（sanhe-ancient-town）· 交通 -->
合肥市区自驾约 1 小时，或乘至肥西的班车后转乘

<!-- D-005 | src/data/sites.ts | 徽州古城（huizhou-ancient-city）· 一句话简介（≤60 字） -->
旧徽州府治所在的歙县古城，许国石坊、斗山街、渔梁坝串成一条读徽州的路。

<!-- D-006 | src/data/sites.ts | 徽州古城（huizhou-ancient-city）· 正文 p1 -->
古城是旧徽州府治所在，许国石坊——明万历年间的八脚牌坊——是城内最醒目的地标，斗山街两侧徽派宅第成片。

<!-- D-007 | src/data/sites.ts | 徽州古城（huizhou-ancient-city）· 正文 p2 -->
它是 5A「古徽州文化旅游区」的一部分，出城不远就是渔梁坝；傍晚在坝上看练江收束，是许多人对歙县的第一眼。

<!-- D-008 | src/data/sites.ts | 徽州古城（huizhou-ancient-city）· 交通 -->
黄山北站转乘至歙县，县城内步行可达

<!-- D-009 | src/data/sites.ts | 寿县古城（shouxian-ancient-city）· 一句话简介（≤60 字） -->
楚末都寿春的宋代城垣，四门瓮城完整，城外淮河平原一望无际。

<!-- D-010 | src/data/sites.ts | 寿县古城（shouxian-ancient-city）· 正文 p1 -->
寿县古称寿春，是楚国最后一座都城；宋代重修的城墙周长七公里余，四座城门与瓮城形制完整。

<!-- D-011 | src/data/sites.ts | 寿县古城（shouxian-ancient-city）· 正文 p2 -->
沿城墙走，可俯瞰城内街巷；报恩寺、孔庙与安徽楚文化博物馆适合安排半天，博物馆是读楚文化的入口。

<!-- D-012 | src/data/sites.ts | 寿县古城（shouxian-ancient-city）· 交通 -->
淮南市区自驾约 40 分钟

<!-- D-013 | src/data/sites.ts | 黄山风景区（huangshan-scenic）· 一句话简介（≤60 字） -->
世界文化与自然双遗产，奇松怪石云海温泉四绝，中国山岳的经典。

<!-- D-014 | src/data/sites.ts | 黄山风景区（huangshan-scenic）· 正文 p1 -->
黄山 1990 年列入世界文化与自然双遗产，以奇松、怪石、云海、温泉「四绝」著称。

<!-- D-015 | src/data/sites.ts | 黄山风景区（huangshan-scenic）· 正文 p2 -->
前山后山各有索道，徒步与索道可拼着走；看日出通常要在山上过夜，山下汤口是集散地。天气变得快，雨具与保暖衣物四季都用得上。

<!-- D-016 | src/data/sites.ts | 黄山风景区（huangshan-scenic）· 交通 -->
黄山北站转乘景区班车至汤口，再换乘上山

<!-- D-017 | src/data/sites.ts | 九华山（jiuhuashan）· 一句话简介（≤60 字） -->
中国佛教四大名山之一，地藏菩萨道场，肉身宝殿与百岁宫沿山叠起。

<!-- D-018 | src/data/sites.ts | 九华山（jiuhuashan）· 正文 p1 -->
九华山是中国佛教四大名山之一、国家 5A 景区，以地藏菩萨道场闻名，寺院满山。

<!-- D-019 | src/data/sites.ts | 九华山（jiuhuashan）· 正文 p2 -->
化城寺、肉身宝殿、百岁宫是常走的几处；山脚柯村是换乘点，山上以步行与索道为主，晨昏人少。

<!-- D-020 | src/data/sites.ts | 九华山（jiuhuashan）· 交通 -->
池州站转乘至柯村换乘中心

<!-- D-021 | src/data/sites.ts | 天柱山（tianzhushan）· 一句话简介（≤60 字） -->
花岗岩峰柱的世界地质公园，主峰如柱擎天，汉武帝曾在此封禅。

<!-- D-022 | src/data/sites.ts | 天柱山（tianzhushan）· 正文 p1 -->
天柱山是 UNESCO 世界地质公园、国家 5A 景区，花岗岩峰林与洞穴是看点，主峰孤悬群峰之间。

<!-- D-023 | src/data/sites.ts | 天柱山（tianzhushan）· 正文 p2 -->
索道省去大半爬升，剩下的山脊步道仍要些体力；山下潜山住宿多，适合留两天。

<!-- D-024 | src/data/sites.ts | 天柱山（tianzhushan）· 交通 -->
潜山站转乘至景区大门

<!-- D-025 | src/data/sites.ts | 云岭新四军军部旧址（yunling-memorial）· 一句话简介（≤60 字） -->
泾县云岭的新四军军部驻地（1938–1941），第一批全国重点文物保护单位。

<!-- D-026 | src/data/sites.ts | 云岭新四军军部旧址（yunling-memorial）· 正文 p1 -->
1938–1941 年新四军军部驻扎泾县云岭，军部机关、大会堂与领导人旧居散在几个村落间，多是皖南民居。

<!-- D-027 | src/data/sites.ts | 云岭新四军军部旧址（yunling-memorial）· 正文 p2 -->
旧址 1961 年列入第一批全国重点文物保护单位；纪念馆按时间线梳理皖南事变前后，看完再走旧址群，这片山地的空间关系会清楚许多。

<!-- D-028 | src/data/sites.ts | 云岭新四军军部旧址（yunling-memorial）· 交通 -->
泾县县城自驾约 40 分钟

<!-- D-029 | src/data/sites.ts | 亳州花戏楼（huaxilou）· 一句话简介（≤60 字） -->
山陕会馆里的砖雕木雕戏台，第三批全国重点文物保护单位。

<!-- D-030 | src/data/sites.ts | 亳州花戏楼（huaxilou）· 正文 p1 -->
花戏楼本名山陕会馆（大关帝庙），是清代晋陕商人在亳州集资所建；1988 年列入第三批全国重点文物保护单位。

<!-- D-031 | src/data/sites.ts | 亳州花戏楼（huaxilou）· 正文 p2 -->
戏台木雕与外墙砖雕是核心，题材密，值得慢看；旁边亳州老街与曹操运兵道可一并走。

<!-- D-032 | src/data/sites.ts | 亳州花戏楼（huaxilou）· 交通 -->
亳州站打车约 20 分钟

<!-- D-033 | src/data/sites.ts | 宏村（hongcun）· 一句话简介（≤60 字） -->
世界文化遗产的牛形村落，水圳流过每家门前，清晨最静。

<!-- D-034 | src/data/sites.ts | 宏村（hongcun）· 正文 p1 -->
宏村 2000 年作为「皖南古村落—西递、宏村」列入世界文化遗产，水系按牛形布局，水圳从每家门前进过。

<!-- D-035 | src/data/sites.ts | 宏村（hongcun）· 正文 p2 -->
月沼与南湖是最开阔的两处水面，巷道窄，晨昏斜光最好看；住村里能避开团队客流，西递、塔川可顺路。

<!-- D-036 | src/data/sites.ts | 宏村（hongcun）· 交通 -->
黄山北站转乘至黟县，再换乘至宏村

<!-- D-037 | src/data/sites.ts | 龙子湖（longzihu）· 一句话简介（≤60 字） -->
蚌埠城东的城中湖，环湖步道与跨湖桥串起一片开阔水面。

<!-- D-038 | src/data/sites.ts | 龙子湖（longzihu）· 正文 p1 -->
龙子湖在蚌埠市区东侧，湖面开阔，环湖步道与几座跨湖桥相连，是本地人散步骑行的日常去处。

<!-- D-039 | src/data/sites.ts | 龙子湖（longzihu）· 正文 p2 -->
湖边是高校与新城，把它当作行程里一个不赶的午后就好。

<!-- D-040 | src/data/sites.ts | 龙子湖（longzihu）· 交通 -->
蚌埠南站打车约 20 分钟

<!-- D-041 | src/data/sites.ts | 采石矶（caishiji）· 一句话简介（≤60 字） -->
长江边的矶头与太白楼，江面在此收窄，是读李白晚年的一处落点。

<!-- D-042 | src/data/sites.ts | 采石矶（caishiji）· 正文 p1 -->
采石矶是长江东岸的一处矶头，临江崖壁与江面构成天然观景处，山上有太白楼与相关纪念建筑。

<!-- D-043 | src/data/sites.ts | 采石矶（caishiji）· 正文 p2 -->
这里与李白晚年行迹交织，步道不长，江景与人文并置，半天足够。

<!-- D-044 | src/data/sites.ts | 采石矶（caishiji）· 交通 -->
马鞍山东站打车约 30 分钟

<!-- D-045 | src/data/sites.ts | 临涣古镇（linhuan-ancient-town）· 一句话简介（≤60 字） -->
皖北的老集镇长街，茶馆大壶续水，赶集日的市井气比建筑更耐看。

<!-- D-046 | src/data/sites.ts | 临涣古镇（linhuan-ancient-town）· 正文 p1 -->
临涣在濉溪县，是皖北老街市，镇上茶馆至今保留大壶续水、按位而坐的老习惯。

<!-- D-047 | src/data/sites.ts | 临涣古镇（linhuan-ancient-town）· 正文 p2 -->
建筑不讲究雕琢，看点在市井：茶馆、集市、街边手艺人，赶集日最热闹。

<!-- D-048 | src/data/sites.ts | 临涣古镇（linhuan-ancient-town）· 交通 -->
淮北站打车约 50 分钟

<!-- D-049 | src/data/sites.ts | 大通古镇（datong-ancient-town）· 一句话简介（≤60 字） -->
长江边因盐运而兴的老镇，和悦洲的老街与江滩留着旧码头格局。

<!-- D-050 | src/data/sites.ts | 大通古镇（datong-ancient-town）· 正文 p1 -->
大通在铜陵市郊，长江与青通河在此交汇，旧时是盐运商埠，老街与和悦洲一带还能看出当年的样子。

<!-- D-051 | src/data/sites.ts | 大通古镇（datong-ancient-town）· 正文 p2 -->
江滩与渡口是这里的日常，适合慢走，看江面上来往的船。

<!-- D-052 | src/data/sites.ts | 大通古镇（datong-ancient-town）· 交通 -->
铜陵站打车约 40 分钟

<!-- D-053 | src/data/sites.ts | 小岗村（xiaogang-village）· 一句话简介（≤60 字） -->
中国农村改革的起点，一纸红手印如何改变一个村庄，纪念馆与旧居讲得清。

<!-- D-054 | src/data/sites.ts | 小岗村（xiaogang-village）· 正文 p1 -->
小岗村在凤阳县。1978 年，18 户村民按下红手印、包干到户，这里自此成为中国农村改革的标志。

<!-- D-055 | src/data/sites.ts | 小岗村（xiaogang-village）· 正文 p2 -->
村里有纪念馆、旧居与大包干纪念场所，配上讲解看，才读得懂当年的处境。

<!-- D-056 | src/data/sites.ts | 小岗村（xiaogang-village）· 交通 -->
滁州站转乘至凤阳，再打车约 40 分钟

<!-- D-057 | src/data/sites.ts | 八里河（balihe）· 一句话简介（≤60 字） -->
皖北平原上的人工湖区，水面开阔、堤岸成林，是周边少见的亲水处。

<!-- D-058 | src/data/sites.ts | 八里河（balihe）· 正文 p1 -->
八里河在颍上县，是低洼湖区治理而成的水利与旅游区，水面与堤岸林带是主要景观。

<!-- D-059 | src/data/sites.ts | 八里河（balihe）· 正文 p2 -->
平原上少有这般成片的水，适合骑行步行；景区内也有几处人工景点，随兴取舍。

<!-- D-060 | src/data/sites.ts | 八里河（balihe）· 交通 -->
颍上北站打车约 30 分钟

<!-- D-061 | src/data/sites.ts | 皇藏峪（huangcangyu）· 一句话简介（≤60 字） -->
萧县山谷里的次生林，树龄老、夏季阴凉，山道不长但台阶密。

<!-- D-062 | src/data/sites.ts | 皇藏峪（huangcangyu）· 正文 p1 -->
皇藏峪在萧县东南，是皖北少见的成片次生林山谷，林下阴凉，夏天比平原舒服许多。

<!-- D-063 | src/data/sites.ts | 皇藏峪（huangcangyu）· 正文 p2 -->
山道以石阶为主，落差集中，走完约两三小时；谷内有几处汉高祖传说相关的旧迹。

<!-- D-064 | src/data/sites.ts | 皇藏峪（huangcangyu）· 交通 -->
萧县北站打车约 40 分钟

<!-- D-065 | src/data/sites.ts | 金寨红军广场（jinzhai-red-army-square）· 一句话简介（≤60 字） -->
大别山里的将军县地标，纪念碑与革命博物馆连成一片，适合安静走半天。

<!-- D-066 | src/data/sites.ts | 金寨红军广场（jinzhai-red-army-square）· 正文 p1 -->
金寨是著名的将军县，红军广场一带集中了革命烈士纪念碑、纪念塔与金寨县革命博物馆。

<!-- D-067 | src/data/sites.ts | 金寨红军广场（jinzhai-red-army-square）· 正文 p2 -->
博物馆按时间线展陈鄂豫皖苏区历史，看完再走广场，对大别山根据地会更有空间感。

<!-- D-068 | src/data/sites.ts | 金寨红军广场（jinzhai-red-army-square）· 交通 -->
金寨站打车约 20 分钟

<!-- D-069 | src/data/sites.ts | 琅琊山（langyashan）· 一句话简介（≤60 字） -->
滁州城西的山林，醉翁亭在山脚，欧阳修「环滁皆山也」写的就是这里。

<!-- D-070 | src/data/sites.ts | 琅琊山（langyashan）· 正文 p1 -->
琅琊山在滁州城西南，山不算高，林木深，醉翁亭、琅琊寺沿山道分布。

<!-- D-071 | src/data/sites.ts | 琅琊山（langyashan）· 正文 p2 -->
山脚到醉翁亭步行即可，再上到琅琊寺约半小时；秋叶与山雾是这里常被拍下的两个题材。

<!-- D-072 | src/data/sites.ts | 琅琊山（langyashan）· 交通 -->
滁州站打车约 20 分钟

<!-- D-073 | src/data/sites.ts | 天堂寨（tiantangzhai）· 一句话简介（≤60 字） -->
大别山主峰之一，瀑布群连着原始林，夏天是皖西的避暑地。

<!-- D-074 | src/data/sites.ts | 天堂寨（tiantangzhai）· 正文 p1 -->
天堂寨在大别山腹地、皖鄂交界，主峰海拔一千七百多米，山北是金寨，山南是湖北罗田。

<!-- D-075 | src/data/sites.ts | 天堂寨（tiantangzhai）· 正文 p2 -->
景区以瀑布群与林间步道为主，路线较长，留一整天为宜；山上比县城冷，早晚要加衣。

<!-- D-076 | src/data/sites.ts | 天堂寨（tiantangzhai）· 交通 -->
金寨站转乘至景区约 1.5 小时

<!-- D-077 | src/data/sites.ts | 八公山（bagongshan）· 一句话简介（≤60 字） -->
淮南城边的低山，豆腐的传说与汉淮南王墓都在这一带，登顶能望见淮河平原。

<!-- D-078 | src/data/sites.ts | 八公山（bagongshan）· 正文 p1 -->
八公山在淮南市西，山势低缓，因八公与豆腐的传说得名，山上有汉淮南王墓等旧迹。

<!-- D-079 | src/data/sites.ts | 八公山（bagongshan）· 正文 p2 -->
登顶不难，视野开阔，能望到淮河与平原；山下的豆腐宴是当地招牌，值得留到午饭。

<!-- D-080 | src/data/sites.ts | 八公山（bagongshan）· 交通 -->
淮南站打车约 30 分钟

<!-- D-081 | src/data/sites.ts | 杏花村（xinghuacun）· 一句话简介（≤60 字） -->
池州城西的杏花村，杜牧「牧童遥指杏花村」让它成了一处文化地标。

<!-- D-082 | src/data/sites.ts | 杏花村（xinghuacun）· 正文 p1 -->
杏花村在池州城西，因杜牧《清明》得名，村内有与杏花、酒文化相关的园子与旧迹。

<!-- D-083 | src/data/sites.ts | 杏花村（xinghuacun）· 正文 p2 -->
春天杏花开时最好看；村子离城区不远，可与齐山、平天湖串成半日。

<!-- D-084 | src/data/sites.ts | 杏花村（xinghuacun）· 交通 -->
池州站打车约 20 分钟

<!-- D-085 | src/data/sites.ts | 西递（xidi）· 一句话简介（≤60 字） -->
黟县山坳里的徽派古村，牌坊、祠堂、巷弄保存完整，比宏村安静几分。

<!-- D-086 | src/data/sites.ts | 西递（xidi）· 正文 p1 -->
西递与宏村同为皖南古村的代表，村口胡文光牌坊是最醒目的地标，街巷依山势铺开。

<!-- D-087 | src/data/sites.ts | 西递（xidi）· 正文 p2 -->
比起宏村的水系，西递更重宗族与宅第格局；游客少一些，适合慢慢看门楼上的砖雕。

<!-- D-088 | src/data/sites.ts | 西递（xidi）· 交通 -->
黄山北站转乘至黟县，再换乘至西递

<!-- D-089 | src/data/sites.ts | 屯溪老街（tunxi-old-street）· 一句话简介（≤60 字） -->
黄山市区的老街，徽派店面夹着石板路，进山前后歇脚采买的地方。

<!-- D-090 | src/data/sites.ts | 屯溪老街（tunxi-old-street）· 正文 p1 -->
屯溪老街沿新安江铺开，两侧是徽派店面与百年老字号，卖文房、茶叶与徽州小吃。

<!-- D-091 | src/data/sites.ts | 屯溪老街（tunxi-old-street）· 正文 p2 -->
它更像一条仍在过日子的商业街，不收门票，早晚各有各的样子。

<!-- D-092 | src/data/sites.ts | 屯溪老街（tunxi-old-street）· 交通 -->
黄山站打车约 10 分钟

<!-- D-093 | src/data/sites.ts | 黄梅戏·再芬黄梅公馆（huangmeixi-zaiyfen）· 一句话简介（≤60 字） -->
安庆城里的黄梅戏驻场演出，唱腔与身段都在小剧场里，听着不隔。

<!-- D-094 | src/data/sites.ts | 黄梅戏·再芬黄梅公馆（huangmeixi-zaiyfen）· 正文 p1 -->
黄梅戏发源于安庆一带，再芬黄梅公馆是当地驻场演出场所，常演《天仙配》《女驸马》等折子。

<!-- D-095 | src/data/sites.ts | 黄梅戏·再芬黄梅公馆（huangmeixi-zaiyfen）· 正文 p2 -->
小剧场距离近，唱腔与乐队都在眼前；演出随季节调整，去前先确认场次。

<!-- D-096 | src/data/sites.ts | 黄梅戏·再芬黄梅公馆（huangmeixi-zaiyfen）· 交通 -->
安庆站打车约 20 分钟

<!-- D-097 | src/data/sites.ts | 万佛湖（wanfohu）· 一句话简介（≤60 字） -->
舒城境内的大型水库，湖湾多、水质清，环湖公路适合骑车慢慢绕。

<!-- D-098 | src/data/sites.ts | 万佛湖（wanfohu）· 正文 p1 -->
万佛湖是龙河口水库形成的湖面，湖岸曲折，岛屿散落，周边是大别山余脉。

<!-- D-099 | src/data/sites.ts | 万佛湖（wanfohu）· 正文 p2 -->
环湖公路路况好、车少，适合骑行；湖区也有游船与露营点，夏天人多，春秋更自在。

<!-- D-100 | src/data/sites.ts | 万佛湖（wanfohu）· 交通 -->
舒城东站打车约 40 分钟

<!-- D-101 | src/data/sites.ts | 桃花潭（taohuatan）· 一句话简介（≤60 字） -->
泾县青弋江上的深潭，两岸村落与古渡相对，春天桃花开时最像诗里写的。

<!-- D-102 | src/data/sites.ts | 桃花潭（taohuatan）· 正文 p1 -->
桃花潭在泾县西南，青弋江在此转出一个深潭，两岸是村落、古渡与踏歌岸阁。

<!-- D-103 | src/data/sites.ts | 桃花潭（taohuatan）· 正文 p2 -->
它因李白《赠汪伦》而知名；清晨江面起雾最好看，夏季可坐竹筏，水浅处还能下水。

<!-- D-104 | src/data/sites.ts | 桃花潭（taohuatan）· 交通 -->
泾县站打车约 50 分钟

<!-- D-105 | src/data/sites.ts | 查济（chaji-village）· 一句话简介（≤60 字） -->
泾县山里的查姓古村，祠堂与民居沿溪铺开，规模比一般古村大得多。

<!-- D-106 | src/data/sites.ts | 查济（chaji-village）· 正文 p1 -->
查济在泾县桃花潭镇，是皖南保存规模较大的古村落：溪水穿村、石桥众多，祠堂与老宅沿着水声排布。

<!-- D-107 | src/data/sites.ts | 查济（chaji-village）· 正文 p2 -->
游客密度不高，适合慢走；巷子窄、石阶多，穿双舒服的鞋。

<!-- D-108 | src/data/sites.ts | 查济（chaji-village）· 交通 -->
泾县站打车约 50 分钟

<!-- D-109 | src/data/sites.ts | 水墨汀溪（shuimo-tingxi）· 一句话简介（≤60 字） -->
泾县东南的山涧溪谷，水浅石白、树荫密，夏天适合沿溪踩水。

<!-- D-110 | src/data/sites.ts | 水墨汀溪（shuimo-tingxi）· 正文 p1 -->
水墨汀溪在泾县汀溪乡，溪流在花岗岩河床上拐出许多浅滩与水潭，两岸是竹林与阔叶林。

<!-- D-111 | src/data/sites.ts | 水墨汀溪（shuimo-tingxi）· 正文 p2 -->
夏天最舒服，可沿溪走一段、下到浅滩踩水；雨后水量大、石头滑，注意脚下。

<!-- D-112 | src/data/sites.ts | 水墨汀溪（shuimo-tingxi）· 交通 -->
泾县站打车约 1 小时

<!-- D-113 | src/data/sites.ts | 茂林皖南事变激战地（maolin-battlefield）· 一句话简介（≤60 字） -->
皖南事变的主要激战地，山坳里的旧址与纪念碑，适合安静走一趟。

<!-- D-114 | src/data/sites.ts | 茂林皖南事变激战地（maolin-battlefield）· 正文 p1 -->
1941 年皖南事变中，新四军在茂林一带被围，山坳与溪谷间留下多处战场遗址。

<!-- D-115 | src/data/sites.ts | 茂林皖南事变激战地（maolin-battlefield）· 正文 p2 -->
镇上有纪念碑与旧址群；对照周边地形看，会更容易理解当年为什么在这里被围住。

<!-- D-116 | src/data/sites.ts | 茂林皖南事变激战地（maolin-battlefield）· 交通 -->
泾县站打车约 50 分钟

<!-- D-117 | src/data/sites.ts | 渡江战役纪念馆（dujiang-memorial）· 一句话简介（≤60 字） -->
巢湖岸边的战舰形纪念馆，全国唯一全面呈现渡江战役的军事题材场馆。

<!-- D-118 | src/data/sites.ts | 渡江战役纪念馆（dujiang-memorial）· 正文 p1 -->
纪念馆在合肥滨湖新区、巢湖北岸，主体建筑以 49° 角前倾，像两艘驶向江面的战舰。

<!-- D-119 | src/data/sites.ts | 渡江战役纪念馆（dujiang-memorial）· 正文 p2 -->
馆内以渡江战役为主线，解放广场、总前委群像与胜利塔连成一条轴线；免费开放，可与巢湖岸线一起安排半天。

<!-- D-120 | src/data/sites.ts | 渡江战役纪念馆（dujiang-memorial）· 交通 -->
合肥地铁 1 号线至万年埠站步行可达

<!-- D-121 | src/data/sites.ts | 巢湖（chaohu）· 一句话简介（≤60 字） -->
全国五大淡水湖之一，合肥的内湖；环湖大道串起中庙、姥山岛与湿地公园。

<!-- D-122 | src/data/sites.ts | 巢湖（chaohu）· 正文 p1 -->
巢湖水域约 780 平方公里，是合肥「大湖名城」的底色；环湖北路上最值得停的是中庙与姥山岛，湖天一线时像海。

<!-- D-123 | src/data/sites.ts | 巢湖（chaohu）· 正文 p2 -->
环湖国家风景名胜区还包括紫微洞、银屏山等；自驾环湖最方便，风大的日子湖面浪大，注意安全。

<!-- D-124 | src/data/sites.ts | 巢湖（chaohu）· 交通 -->
合肥市区自驾沿环湖北路约 1 小时

<!-- D-125 | src/data/sites.ts | 镜湖公园（jinghu-park）· 一句话简介（≤60 字） -->
芜湖市中心的名片式湖泊，南宋张孝祥捐田百亩汇成，紧邻中山路步行街。

<!-- D-126 | src/data/sites.ts | 镜湖公园（jinghu-park）· 正文 p1 -->
镜湖原名陶塘，在芜湖最核心的地段，步出中山路步行街就是湖边。

<!-- D-127 | src/data/sites.ts | 镜湖公园（jinghu-park）· 正文 p2 -->
「水清可鉴，形似圆镜」是名字的来处；湖畔有步月桥与柳春园，夜色里对岸灯影入水，是市民散步的日常，也是旅人歇脚的中途站。

<!-- D-128 | src/data/sites.ts | 镜湖公园（jinghu-park）· 交通 -->
芜湖火车站公交约 20 分钟

<!-- D-129 | src/data/sites.ts | 湖上升明月（hushang-mingyue）· 一句话简介（≤60 字） -->
龙子湖西南岸的古民居博览园，450 栋迁建修复的古建筑沿湖而立。

<!-- D-130 | src/data/sites.ts | 湖上升明月（hushang-mingyue）· 正文 p1 -->
「湖上升明月」把散落各地的 450 栋古民居整体迁到蚌埠龙子湖畔修复，徽派与闽南红砖厝同处一园，人称露天民居博物馆。

<!-- D-131 | src/data/sites.ts | 湖上升明月（hushang-mingyue）· 正文 p2 -->
园区很大，建议乘电瓶车分区逛；傍晚湖面倒影最好看。

<!-- D-132 | src/data/sites.ts | 湖上升明月（hushang-mingyue）· 交通 -->
蚌埠南站打车约 20 分钟

<!-- D-133 | src/data/sites.ts | 李白文化园（libai-culture-park）· 一句话简介（≤60 字） -->
当涂青山西麓的李白长眠地，太白祠与青莲书院围着全国重点文保的李白墓。

<!-- D-134 | src/data/sites.ts | 李白文化园（libai-culture-park）· 正文 p1 -->
李白晚年依当涂族叔李阳冰，病逝后葬于青山，李白墓是全国重点文物保护单位，历经多次修葺。

<!-- D-135 | src/data/sites.ts | 李白文化园（libai-culture-park）· 正文 p2 -->
文化园分前中后三区，竹木掩映、题刻众多；清明前后山脚油菜花开，可与采石矶串成一条「李白线」。

<!-- D-136 | src/data/sites.ts | 李白文化园（libai-culture-park）· 交通 -->
马鞍山东站打车约 40 分钟

<!-- D-137 | src/data/sites.ts | 凤凰山（tongling-fenghuangshan）· 一句话简介（≤60 字） -->
义安区的药用牡丹原乡，「江南第一牡丹园」，春天满坡凤丹如雪。

<!-- D-138 | src/data/sites.ts | 凤凰山（tongling-fenghuangshan）· 正文 p1 -->
凤凰山在铜陵义安区顺安镇，凤丹种植历史 1600 多年，与洛阳、菏泽牡丹并称国内三大名贵牡丹。

<!-- D-139 | src/data/sites.ts | 凤凰山（tongling-fenghuangshan）· 正文 p2 -->
清明前后是花期，相思树、滴水崖与牡丹园连成环线；非花期是安静的丘陵步道，适合半日。

<!-- D-140 | src/data/sites.ts | 凤凰山（tongling-fenghuangshan）· 交通 -->
铜陵北站自驾约 30 分钟

<!-- D-141 | src/data/sites.ts | 相山（xiangshan-huaibei）· 一句话简介（≤60 字） -->
淮北市区的城市森林公园，主峰是皖北至高点，登顶可俯瞰全城。

<!-- D-142 | src/data/sites.ts | 相山（xiangshan-huaibei）· 正文 p1 -->
相山国家森林公园在淮北市中心南麓，免费开放；显通寺始建于西晋，乾隆题过「惠我南黎」。

<!-- D-143 | src/data/sites.ts | 相山（xiangshan-huaibei）· 正文 p2 -->
环形步道一圈约一个半小时，雨后常能看见云海漫过山脊；对这座城而言，相山是日常，也是最高点。

<!-- D-144 | src/data/sites.ts | 相山（xiangshan-huaibei）· 交通 -->
淮北火车站公交约 20 分钟

<!-- D-145 | src/data/sites.ts | 涉故台（shegutai）· 一句话简介（≤60 字） -->
大泽乡的陈胜吴广起义遗址，夯土高台保存至今，省级重点文物保护单位。

<!-- D-146 | src/data/sites.ts | 涉故台（shegutai）· 正文 p1 -->
公元前 209 年陈胜吴广在蕲县大泽乡揭竿而起，「涉故台」即当年筑台盟誓处；台东南的鸿鹄苑有碑廊与陈列。

<!-- D-147 | src/data/sites.ts | 涉故台（shegutai）· 正文 p2 -->
遗址在宿州东南的大泽乡镇，乡野气息重，对秦末历史有兴趣的人值得专程一走。

<!-- D-148 | src/data/sites.ts | 涉故台（shegutai）· 交通 -->
宿州站自驾约 40 分钟

<!-- D-149 | src/data/sites.ts | 韭山洞（jiushan-cave）· 一句话简介（≤60 字） -->
凤阳韭山国家森林公园里的喀斯特溶洞，主洞近 1500 米，人称「江北第一洞」。

<!-- D-150 | src/data/sites.ts | 韭山洞（jiushan-cave）· 正文 p1 -->
韭山洞形成于寒武纪灰岩，《水经注》已有记载；洞内分虎踞龙蟠、摘星揽月等段，元末朱元璋屯兵留下演兵场等人文痕迹。

<!-- D-151 | src/data/sites.ts | 韭山洞（jiushan-cave）· 正文 p2 -->
洞内恒温约 17℃，夏天进洞记得带件薄外套；可与狼巷迷谷串成一日。

<!-- D-152 | src/data/sites.ts | 韭山洞（jiushan-cave）· 交通 -->
凤阳县城自驾约 40 分钟

<!-- D-153 | src/data/sites.ts | 焦岗湖（jiaogang-lake）· 一句话简介（≤60 字） -->
淮河南岸的湿地大湖，千亩荷花淀与万亩芦苇荡，人称「华东白洋淀」。

<!-- D-154 | src/data/sites.ts | 焦岗湖（jiaogang-lake）· 正文 p1 -->
焦岗湖跨淮南毛集实验区与颍上县，是国家湿地公园、国家水利风景区，湖面芦苇与荷花是主打。

<!-- D-155 | src/data/sites.ts | 焦岗湖（jiaogang-lake）· 正文 p2 -->
夏天坐船穿芦苇荡、看荷花淀最好；湖边渔家乐的鱼宴是老饕的理由。

<!-- D-156 | src/data/sites.ts | 焦岗湖（jiaogang-lake）· 交通 -->
淮南市区自驾约 1 小时

<!-- D-157 | src/data/sites.ts | 明堂山（mingtang-mountain）· 一句话简介（≤60 字） -->
岳西大别山腹地的三峰并列山岳，绝壁栈道与玻璃天梯悬在 400 米落差之上。

<!-- D-158 | src/data/sites.ts | 明堂山（mingtang-mountain）· 正文 p1 -->
明堂山因汉武帝封禅天柱山时设「明堂」祭拜得名，主峰海拔 1563 米，是长江、淮河两大流域的分水岭。

<!-- D-159 | src/data/sites.ts | 明堂山（mingtang-mountain）· 正文 p2 -->
景区以栈道出名：1800 米绝壁栈道接 130 米玻璃栈道，还有垂直落差 365 米的云端天梯；缆车可代步，体力要求不高。

<!-- D-160 | src/data/sites.ts | 明堂山（mingtang-mountain）· 交通 -->
岳西县城自驾约 1 小时

<!-- D-161 | src/data/sites.ts | 牯牛降（guniujiang）· 一句话简介（≤60 字） -->
石台与祁门交界的国家级自然保护区，主峰海拔 1727.6 米，人称「华东最后一片原始森林」。

<!-- D-162 | src/data/sites.ts | 牯牛降（guniujiang）· 正文 p1 -->
牯牛降古称「西黄山」，是黄山山脉向西延伸的主体，集国家级自然保护区、国家地质公园与 4A 景区于一身。

<!-- D-163 | src/data/sites.ts | 牯牛降（guniujiang）· 正文 p2 -->
石台一侧的开放区以水潭、四叠瀑布与峡谷步道为主；近年闭园改造创 5A，出行前先查开放状态。

<!-- D-164 | src/data/sites.ts | 牯牛降（guniujiang）· 交通 -->
石台县城自驾约 40 分钟

<!-- D-165 | src/data/sites.ts | 包公园（baogong-park）· 一句话简介（≤60 字） -->
护城河上的包拯纪念园林，包公祠、包公墓与清风阁沿水而列，4A 景区。

<!-- D-166 | src/data/sites.ts | 包公园（baogong-park）· 正文 p1 -->
包河原是合肥护城河，宋仁宗赐予包拯，河上有包公祠、包公墓、清风阁与浮庄四处。

<!-- D-167 | src/data/sites.ts | 包公园（baogong-park）· 正文 p2 -->
公园免费，祠墓单独购票；「铁面无私」的故事配上荷风柳岸，是合肥市中心安静的一隅。

<!-- D-168 | src/data/sites.ts | 包公园（baogong-park）· 交通 -->
合肥地铁 1 号线至包公园站

<!-- D-169 | src/data/sites.ts | 张公山公园（zhanggong-park）· 一句话简介（≤60 字） -->
蚌埠市区最大的开放式公园，张公山与张公湖山水相映，望淮塔可俯瞰全城。

<!-- D-170 | src/data/sites.ts | 张公山公园（zhanggong-park）· 正文 p1 -->
张公山在蚌埠禹会区，山顶海拔 71 米，望淮塔是城市地标；山下张公湖垂柳环岸。

<!-- D-171 | src/data/sites.ts | 张公山公园（zhanggong-park）· 正文 p2 -->
1973 年建园、免费开放，秋季湖山最好看；园中园的江南园林与淮河碑廊值得慢看。

<!-- D-172 | src/data/sites.ts | 张公山公园（zhanggong-park）· 交通 -->
蚌埠站公交约 25 分钟

<!-- D-173 | src/data/sites.ts | 霸王祠（bawangci）· 一句话简介（≤60 字） -->
楚霸王项羽的自刎之地，汉阙式门楼与历代碑刻立在长江边的凤凰山上。

<!-- D-174 | src/data/sites.ts | 霸王祠（bawangci）· 正文 p1 -->
公元前 202 年项羽兵败自刎乌江，后人立祠祀之；祠为安徽省重点文物保护单位，门楼「霸王祠」三字出自董其昌手书。

<!-- D-175 | src/data/sites.ts | 霸王祠（bawangci）· 正文 p2 -->
祠旁就是长江与驷马山河，把霸王祠、陋室（刘禹锡）与鸡笼山串成和县一日线更顺。

<!-- D-176 | src/data/sites.ts | 霸王祠（bawangci）· 交通 -->
马鞍山市区自驾约 1 小时（经和县）

<!-- D-177 | src/data/sites.ts | 阜阳生态乐园（fuyang-ecopark）· 一句话简介（≤60 字） -->
建在古颍州西湖遗址上的生态园，欧阳修会老堂在侧，4A 级亲子目的地。

<!-- D-178 | src/data/sites.ts | 阜阳生态乐园（fuyang-ecopark）· 正文 p1 -->
颍州西湖「始于周、兴于唐、盛于宋」，宋代欧阳修、苏轼都知颍州；如今的生态乐园就建在遗址上，会老堂是遗存。

<!-- D-179 | src/data/sites.ts | 阜阳生态乐园（fuyang-ecopark）· 正文 p2 -->
园区以生态农业与园林为主，春季赏花、夏秋采摘，还有动物园与热带雨林馆；适合带孩子的半日游。

<!-- D-180 | src/data/sites.ts | 阜阳生态乐园（fuyang-ecopark）· 交通 -->
阜阳西站打车约 25 分钟

<!-- D-181 | src/data/sites.ts | 曹操公园（caocao-park）· 一句话简介（≤60 字） -->
亳州最大的公园，建在曹操宗族墓群之上，魏武祠与松涛墓冢连成三国一课。

<!-- D-182 | src/data/sites.ts | 曹操公园（caocao-park）· 正文 p1 -->
曹操公园原称曹氏公园，园内「曹四孤堆」是曹操宗族墓群，园中建有曹操纪念馆与魏武祠。

<!-- D-183 | src/data/sites.ts | 曹操公园（caocao-park）· 正文 p2 -->
免费开放的露天博物馆，松涛、墓冢与诗碑并存；可与曹操运兵道、花戏楼串成亳州三国一日线。

<!-- D-184 | src/data/sites.ts | 曹操公园（caocao-park）· 交通 -->
亳州南站打车约 20 分钟

<!-- D-185 | src/data/sites.ts | 渔梁坝（yuliang-dam）· 一句话简介（≤60 字） -->
新安江上游最古老的拦河坝，唐代始建、全国重点文保，坝旁渔梁街是「徽商之源」。

<!-- D-186 | src/data/sites.ts | 渔梁坝（yuliang-dam）· 正文 p1 -->
渔梁坝横截练江，坝上水缓、坝下激流，兼具蓄水泄洪与通航之用，2001 年列入第五批全国重点文物保护单位。

<!-- D-187 | src/data/sites.ts | 渔梁坝（yuliang-dam）· 正文 p2 -->
坝旁的渔梁古街曾是徽商水运码头，青石街巷直通坝顶；傍晚坐在坝上看练江水声，是歙县城南最省力的慢时光。

<!-- D-188 | src/data/sites.ts | 渔梁坝（yuliang-dam）· 交通 -->
歙县北站打车约 15 分钟

<!-- D-189 | src/data/sites.ts | 潜口民宅（qiankou-mansion）· 一句话简介（≤60 字） -->
徽州明清古建筑的异地保护博物馆，明园清园两区，「看民宅到潜口」。

<!-- D-190 | src/data/sites.ts | 潜口民宅（qiankou-mansion）· 正文 p1 -->
潜口民宅博物馆把散落徽州的明清古建筑整体迁建于紫霞山麓，曹门厅、司谏第等是黄山市首批全国重点文物保护单位。

<!-- D-191 | src/data/sites.ts | 潜口民宅（qiankou-mansion）· 正文 p2 -->
作为古徽州文化旅游区（5A）的一部分免费参观，距徽州古城约 7 公里；「观皇宫去北京，看民宅到潜口」说的就是这里。

<!-- D-192 | src/data/sites.ts | 潜口民宅（qiankou-mansion）· 交通 -->
黄山北站自驾约 30 分钟

<!-- D-193 | src/data/sites.ts | 九子岩（jiuzi-yan）· 一句话简介（≤60 字） -->
九华山后山的森林公园主打景区，九子峰下双溪寺，游客比前山少得多。

<!-- D-194 | src/data/sites.ts | 九子岩（jiuzi-yan）· 正文 p1 -->
九子岩在青阳县朱备镇，是九华山国家森林公园的核心景区，九子溪穿谷汇入青通河。

<!-- D-195 | src/data/sites.ts | 九子岩（jiuzi-yan）· 正文 p2 -->
后山清幽，双溪寺与丛林步道是主打；想避开九华街的人流，从后山走这一线最合适。

<!-- D-196 | src/data/sites.ts | 九子岩（jiuzi-yan）· 交通 -->
青阳县城自驾约 20 分钟

<!-- D-197 | src/data/sites.ts | 赭山公园（zhashan-park）· 一句话简介（≤60 字） -->
芜湖市中心的地标山园，土石呈赭色得名，4A 免费开放，园内有皖南最大动物园。

<!-- D-198 | src/data/sites.ts | 赭山公园（zhashan-park）· 正文 p1 -->
赭山在芜湖市中心、鸠兹广场北侧，大赭山海拔 84.8 米，因山体土石呈殷红色得名。

<!-- D-199 | src/data/sites.ts | 赭山公园（zhashan-park）· 正文 p2 -->
1933 年筹建、1958 年建成，凝芳园、海棠园等园中园与广济寺相邻；登顶可环视芜湖城，与镜湖公园步行可达，可串成市中心半日线。

<!-- D-200 | src/data/sites.ts | 赭山公园（zhashan-park）· 交通 -->
芜湖火车站步行或公交约 15 分钟

<!-- D-201 | src/data/sites.ts | 龙川（longchuan）· 一句话简介（≤60 字） -->
绩溪坑口村的胡氏聚居古村，胡氏宗祠与奕世尚书坊皆是全国文保，5A 景区。

<!-- D-202 | src/data/sites.ts | 龙川（longchuan）· 正文 p1 -->
龙川是大坑口村的古称，村形如船、依山傍水；胡氏宗祠始建于宋、嘉靖年间扩建，木雕「四和图」让它有「木雕艺术博物馆」之称。

<!-- D-203 | src/data/sites.ts | 龙川（longchuan）· 正文 p2 -->
宗祠、奕世尚书坊与胡炳衡宅三处全国重点文保组成 5A 景区；胡宗宪、胡富的故里故事，适合配着三雕细看。

<!-- D-204 | src/data/sites.ts | 龙川（longchuan）· 交通 -->
绩溪北站打车约 20 分钟

<!-- D-205 | src/data/sites.ts | 升金湖（shengjin-lake）· 一句话简介（≤60 字） -->
跨东至与贵池的国际重要湿地，「中国鹤湖」，白头鹤在全球最大的天然越冬地过冬。

<!-- D-206 | src/data/sites.ts | 升金湖（shengjin-lake）· 正文 p1 -->
升金湖因湖中渔货价值「升金」得名，333 平方公里的永久性淡水湖泊经黄湓闸与长江相通，是安徽首个国际重要湿地。

<!-- D-207 | src/data/sites.ts | 升金湖（shengjin-lake）· 正文 p2 -->
每年 10 月下旬到次年 4 月上旬，越冬水鸟最集中；湖岸多为保护区域，观鸟请走官方观测点，冬季最壮观。

<!-- D-208 | src/data/sites.ts | 升金湖（shengjin-lake）· 交通 -->
池州市区自驾约 1 小时

<!-- D-209 | src/data/sites.ts | 凌家滩遗址（lingjiatian）· 一句话简介（≤60 字） -->
含山脚下 5800 年前的史前聚落，玉人玉鹰玉版出土于此，国家考古遗址公园。

<!-- D-210 | src/data/sites.ts | 凌家滩遗址（lingjiatian）· 正文 p1 -->
凌家滩是距今约 5800–5300 年的新石器时代中心聚落，出土的高规格玉礼器被视为「古国时代」第一阶段的代表，2023 年国家考古遗址公园揭牌。

<!-- D-211 | src/data/sites.ts | 凌家滩遗址（lingjiatian）· 正文 p2 -->
遗址公园、凌家滩遗址博物馆与考古研学小镇相邻，对史前文明有兴趣的人值得专程半天；配着隔壁的运漕古镇更好。

<!-- D-212 | src/data/sites.ts | 凌家滩遗址（lingjiatian）· 交通 -->
马鞍山市区自驾约 1 小时

<!-- D-213 | src/data/sites.ts | 明皇陵（minghuangling）· 一句话简介（≤60 字） -->
朱元璋为父母兄嫂营建的陵墓，皇陵碑与石刻群是全国重点文物保护单位。

<!-- D-214 | src/data/sites.ts | 明皇陵（minghuangling）· 正文 p1 -->
明皇陵在凤阳县城南，1366 年始建、历时 13 年建成；「明中都皇故城及皇陵石刻」1982 年列入第二批全国重点文物保护单位。

<!-- D-215 | src/data/sites.ts | 明皇陵（minghuangling）· 正文 p2 -->
皇陵碑的碑文由朱元璋亲自撰写，石刻群沿神道排列；可与明中都皇故城遗址串成凤阳的明代遗存一日线。

<!-- D-216 | src/data/sites.ts | 明皇陵（minghuangling）· 交通 -->
凤阳县城自驾约 20 分钟

<!-- D-217 | src/data/sites.ts | 司空山（sikong-mountain）· 一句话简介（≤60 字） -->
岳西境内的「中华禅宗第一山」，二祖慧可在此避难传法，主峰海拔 1227 米。

<!-- D-218 | src/data/sites.ts | 司空山（sikong-mountain）· 正文 p1 -->
司空山在岳西县店前镇与冶溪镇交界，公元 577 年禅宗二祖慧可携达摩衣钵在此弘法，二祖寺分上下两院。

<!-- D-219 | src/data/sites.ts | 司空山（sikong-mountain）· 正文 p2 -->
山势雄奇、人文与自然交错，李白曾避居于此，留有太白书堂；3A 景区，游客不多，寻禅与徒步的人适合慢慢走。

<!-- D-220 | src/data/sites.ts | 司空山（sikong-mountain）· 交通 -->
岳西县城自驾约 1.5 小时

<!-- D-221 | src/data/sites.ts | 白马尖（baimajian）· 一句话简介（≤60 字） -->
大别山主峰，海拔 1777 米，花岗岩山体常年白云缭绕，4A 景区里最难爬的一座。

<!-- D-222 | src/data/sites.ts | 白马尖（baimajian）· 正文 p1 -->
白马尖在霍山县与岳西县交界，与多云尖、天河尖呈品字形鼎立，是大别山（六安）国家地质公园的主峰园区。

<!-- D-223 | src/data/sites.ts | 白马尖（baimajian）· 正文 p2 -->
上下山同一条路，登顶约需大半天，被驴友称作「安徽最难爬的山」；东北坡有千年都枝杜鹃，体力好再上，量力而行。

<!-- D-224 | src/data/sites.ts | 白马尖（baimajian）· 交通 -->
霍山县城自驾约 2 小时

<!-- D-225 | src/data/sites.ts | 柳孜运河遗址（liuzi-site）· 一句话简介（≤60 字） -->
隋唐大运河通济渠的码头遗存，全国文保，2014 年入选世界遗产「中国大运河」。

<!-- D-226 | src/data/sites.ts | 柳孜运河遗址（liuzi-site）· 正文 p1 -->
柳孜运河遗址在濉溪县百善镇柳孜村，两次考古发掘出唐宋河道、河堤与码头实物，是还原千年运河面貌的关键地点。

<!-- D-227 | src/data/sites.ts | 柳孜运河遗址（liuzi-site）· 正文 p2 -->
2014 年成为世界遗产「中国大运河」的遗产点段之一（安徽仅两处），2026 年获评省级考古遗址公园；对运河史有兴趣，值得专程。

<!-- D-228 | src/data/sites.ts | 柳孜运河遗址（liuzi-site）· 交通 -->
淮北市区自驾约 40 分钟

<!-- D-229 | src/data/sites.ts | 六尺巷（liuchixiang）· 一句话简介（≤60 字） -->
桐城城里的一条两米窄巷，「让他三尺又何妨」的礼让故事让它在 2024 年再度走红。

<!-- D-230 | src/data/sites.ts | 六尺巷（liuchixiang）· 正文 p1 -->
清康熙年间大学士张英一句回诗化解了张吴两家的宅基地之争，两家各让三尺，留出这条巷子；现属安徽省级文物保护单位。

<!-- D-231 | src/data/sites.ts | 六尺巷（liuchixiang）· 正文 p2 -->
2024 年升级改造后由六尺巷、张府吴府遗存与勺园组成，免费参观；把桐城文庙、孔城老街串成一日线更顺。

<!-- D-232 | src/data/sites.ts | 六尺巷（liuchixiang）· 交通 -->
桐城市内步行可达

<!-- D-233 | src/data/sites.ts | 安徽博物院（anhui-museum）· 一句话简介（≤60 字） -->
国家一级博物馆，新馆取「五方相连、四水归堂」的徽派格局，楚大鼎是镇馆之宝。

<!-- D-234 | src/data/sites.ts | 安徽博物院（anhui-museum）· 正文 p1 -->
安徽博物院是省内唯一的省级综合类博物馆，国家一级博物馆；新馆在怀宁路天鹅湖畔，建筑体现「五方相连、四水归堂」的徽派意匠。

<!-- D-235 | src/data/sites.ts | 安徽博物院（anhui-museum）· 正文 p2 -->
常设安徽文明史、徽州古建筑、安徽革命史等陈列，铸客大鼎（楚大鼎）是镇馆之宝，也是「国家公祭鼎」的原型；免费预约参观，老馆在安庆路。

<!-- D-236 | src/data/sites.ts | 安徽博物院（anhui-museum）· 交通 -->
合肥地铁 3 号线至市政务区站

<!-- D-237 | src/data/sites.ts | 安徽创新馆（anhui-innovation-museum）· 一句话简介（≤60 字） -->
滨湖巢湖之畔的全国首座创新主题场馆，三馆呈「原子裂变」状排布。

<!-- D-238 | src/data/sites.ts | 安徽创新馆（anhui-innovation-museum）· 正文 p1 -->
安徽创新馆 2019 年开馆，是全国第一座以创新为主题的场馆；三栋场馆从空中看呈原子裂变状，陈列量子计算机、聚变堆模型等两千七百余件展品。

<!-- D-239 | src/data/sites.ts | 安徽创新馆（anhui-innovation-museum）· 正文 p2 -->
一号馆看展、三号馆有球幕影院，与渡江战役纪念馆同在滨湖一线，可一起安排半天；免费预约参观。

<!-- D-240 | src/data/sites.ts | 安徽创新馆（anhui-innovation-museum）· 交通 -->
合肥地铁 1 号线转公交或打车

<!-- D-241 | src/data/sites.ts | 安徽中国徽州文化博物馆（huizhou-culture-museum）· 一句话简介（≤60 字） -->
屯溪的国家一级博物馆，馆藏约 10 万件，是读懂徽州「一府六县」的第一站。

<!-- D-242 | src/data/sites.ts | 安徽中国徽州文化博物馆（huizhou-culture-museum）· 正文 p1 -->
徽州文化博物馆是安徽省第二大综合性博物馆、国家一级博物馆，馆藏约 10 万件（套），新馆 2008 年开放。

<!-- D-243 | src/data/sites.ts | 安徽中国徽州文化博物馆（huizhou-culture-museum）· 正文 p2 -->
展览从徽州人的由来讲到「一府六县」的形成与徽商兴衰，馆舍本身就是徽派风格；看懂了这里，再看西递宏村与徽州古村，会完全不同。

<!-- D-244 | src/data/sites.ts | 安徽中国徽州文化博物馆（huizhou-culture-museum）· 交通 -->
黄山北站打车约 20 分钟

<!-- D-245 | src/data/sites.ts | 安徽楚文化博物馆（chu-culture-museum）· 一句话简介（≤60 字） -->
寿春城里的全国唯一「楚文化」命名博物馆，2024 年晋升国家一级博物馆。

<!-- D-246 | src/data/sites.ts | 安徽楚文化博物馆（chu-culture-museum）· 正文 p1 -->
寿县是楚国最后一座都城寿春，楚幽王陵就在周边；安徽楚文化博物馆是全国唯一以「楚文化」命名的博物馆，2022 年开馆、2024 年晋升国家一级。

<!-- D-247 | src/data/sites.ts | 安徽楚文化博物馆（chu-culture-museum）· 正文 p2 -->
楚式高台风格的馆舍里珍藏 1 万余件（套）文物；与寿州古城墙一街之隔，看完博物馆再登城墙正好。

<!-- D-248 | src/data/sites.ts | 安徽楚文化博物馆（chu-culture-museum）· 交通 -->
寿县高铁站打车约 15 分钟

<!-- D-249 | src/data/sites.ts | 中国宣纸文化园（jingxian-xuan-paper）· 一句话简介（≤60 字） -->
泾县宣纸传统制作技艺的展示园区，可看捞纸、晒纸等工序，适合非遗研学。

<!-- D-250 | src/data/sites.ts | 中国宣纸文化园（jingxian-xuan-paper）· 正文 p1 -->
中国宣纸文化园在泾县榔桥镇，围绕宣纸传统制作技艺展开：捞纸、晒纸、剪纸等工序都能在园区里看到。

<!-- D-251 | src/data/sites.ts | 中国宣纸文化园（jingxian-xuan-paper）· 正文 p2 -->
宣纸制作技艺是首批国家级非遗；园区适合安排半天，可与泾县周边的古村、查济串成一条线。

<!-- D-252 | src/data/sites.ts | 中国宣纸文化园（jingxian-xuan-paper）· 交通 -->
泾县县城自驾约 30 分钟

<!-- D-253 | src/data/sites.ts | 老胡开文墨厂（shexian-ink-garden）· 一句话简介（≤60 字） -->
歙县老胡开文墨厂，徽墨制作技艺的代表性厂区，可看炼烟、制墨与描金。

<!-- D-254 | src/data/sites.ts | 老胡开文墨厂（shexian-ink-garden）· 正文 p1 -->
老胡开文墨厂在歙县，是徽墨制作技艺的代表性厂区；炼烟、和胶、制墨、描金等工序仍按传统流程进行。

<!-- D-255 | src/data/sites.ts | 老胡开文墨厂（shexian-ink-garden）· 正文 p2 -->
徽墨是文房四宝之一，也是国家级非遗；参观时间不长，可与徽州古城、歙砚博物馆一起安排。

<!-- D-256 | src/data/sites.ts | 老胡开文墨厂（shexian-ink-garden）· 交通 -->
歙县县城内步行或短途打车

<!-- D-257 | src/data/sites.ts | 歙县古城墨砚博物馆（shexian-inkstone-museum）· 一句话简介（≤60 字） -->
歙县古城里的歙砚专题博物馆，展出砚石、砚雕与文房器物。

<!-- D-258 | src/data/sites.ts | 歙县古城墨砚博物馆（shexian-inkstone-museum）· 正文 p1 -->
歙县古城墨砚博物馆以歙砚为主题，展出砚石、砚雕与文房器物，能看清一块砚石如何变成一方砚。

<!-- D-259 | src/data/sites.ts | 歙县古城墨砚博物馆（shexian-inkstone-museum）· 正文 p2 -->
歙砚制作技艺是国家级非遗；博物馆在歙县古城附近，可与许国石坊、斗山街串半天。

<!-- D-260 | src/data/sites.ts | 歙县古城墨砚博物馆（shexian-inkstone-museum）· 交通 -->
歙县古城内步行可达

<!-- D-261 | src/data/sites.ts | 汪满田村（wangmantian-village）· 一句话简介（≤60 字） -->
歙县溪头镇的鱼灯古村，正月十三至十六有大型鱼灯巡游。

<!-- D-262 | src/data/sites.ts | 汪满田村（wangmantian-village）· 正文 p1 -->
汪满田村在歙县溪头镇，以正月鱼灯民俗出名：竹骨纸糊的大鱼灯在村巷里巡游，是皖南春节最热闹的场景之一。

<!-- D-263 | src/data/sites.ts | 汪满田村（wangmantian-village）· 正文 p2 -->
鱼灯集中在正月十三至十六；平日村庄安静，适合看古村与山景，灯会期建议提前确认路线与停车。

<!-- D-264 | src/data/sites.ts | 汪满田村（wangmantian-village）· 交通 -->
歙县县城自驾约 40 分钟

<!-- D-265 | src/data/sites.ts | 傩文化馆（chizhou-nuo-culture-park）· 一句话简介（≤60 字） -->
贵池的傩文化展馆，展出傩面具、傩仪与池州傩戏相关器物。

<!-- D-266 | src/data/sites.ts | 傩文化馆（chizhou-nuo-culture-park）· 正文 p1 -->
池州傩文化馆在贵池，展出傩面具、傩仪与傩戏相关器物，是理解「戏曲活化石」池州傩的入口。

<!-- D-267 | src/data/sites.ts | 傩文化馆（chizhou-nuo-culture-park）· 正文 p2 -->
池州傩戏是国家级非遗，宗族傩活动多在春节前后；展馆适合搭配刘街、茅坦等傩戏村一起看。

<!-- D-268 | src/data/sites.ts | 傩文化馆（chizhou-nuo-culture-park）· 交通 -->
池州主城区打车约 20 分钟

<!-- D-269 | src/data/sites.ts | 安徽万安罗经文化博物馆（wanan-compass-museum）· 一句话简介（≤60 字） -->
休宁万安镇的罗盘专题博物馆，讲万安罗盘的历史与制作技艺。

<!-- D-270 | src/data/sites.ts | 安徽万安罗经文化博物馆（wanan-compass-museum）· 正文 p1 -->
安徽万安罗经文化博物馆在休宁万安镇，讲万安罗盘的历史、工序与用途；罗盘制作技艺是国家级非遗。

<!-- D-271 | src/data/sites.ts | 安徽万安罗经文化博物馆（wanan-compass-museum）· 正文 p2 -->
万安老街就在附近，博物馆不大，可与休宁古城岩、齐云山串成一条短线。

<!-- D-272 | src/data/sites.ts | 安徽万安罗经文化博物馆（wanan-compass-museum）· 交通 -->
休宁县城自驾约 15 分钟

<!-- D-273 | src/data/sites.ts | 冯嘴子村（fengzaizi-village）· 一句话简介（≤60 字） -->
蚌埠禹会区的花鼓灯传习村，中国花鼓灯艺术传习所所在地。

<!-- D-274 | src/data/sites.ts | 冯嘴子村（fengzaizi-village）· 正文 p1 -->
冯嘴子村在蚌埠禹会区，是中国花鼓灯艺术传习所所在地；花鼓灯是首批国家级非遗，锣鼓、灯歌与舞蹈在这里仍有传承。

<!-- D-275 | src/data/sites.ts | 冯嘴子村（fengzaizi-village）· 正文 p2 -->
村里有传习与展演空间，具体演出需提前联系；对民俗、民间舞蹈感兴趣的人值得专程安排半天。

<!-- D-276 | src/data/sites.ts | 冯嘴子村（fengzaizi-village）· 交通 -->
蚌埠市区自驾约 30 分钟

<!-- D-277 | src/data/sites.ts | 中国徽菜博物馆（huicai-museum）· 一句话简介（≤60 字） -->
黄山屯溪的徽菜文化博物馆，展陈、市集与品鉴一体的饮食文化馆。

<!-- D-278 | src/data/sites.ts | 中国徽菜博物馆（huicai-museum）· 正文 p1 -->
中国徽菜博物馆在黄山屯溪，展陈徽菜源流、食材与宴席，也设有小吃市集和品鉴区，是「看+吃」一体的饮食文化馆。

<!-- D-279 | src/data/sites.ts | 中国徽菜博物馆（huicai-museum）· 正文 p2 -->
徽菜重火功、善烧炖；博物馆适合安排在屯溪老街前后，半天足够，饭点可直接在馆内解决。

<!-- D-280 | src/data/sites.ts | 中国徽菜博物馆（huicai-museum）· 交通 -->
屯溪市区打车约 15 分钟

---

## E · 事实与标签（别当文案改）

| 想改什么                                             | 改这里                                                                      | 注意                                                   |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| 项目名、市、坐标、日期、tags、来源                   | `src/data/sites.ts`                                                         | city 必须是 16 市之一；坐标 GCJ-02；id 上线后不可改    |
| 16 个市 / 7 个分类的名字与顺序                       | `src/types/site.ts`                                                         | 契约，改前先在 Issue 里 @ 对方（见 AGENTS.md）         |
| 数字 16 / 70 / 7 / 9                                 | `brand/index.html` 的 `.ledger` / `.stats`；`src/brand/data.ts` 的 `HERO_META` | 两处要同步                                             |
| 建议停留 / 开放时间 / 门票 / 适合 / 最佳季节         | `src/data/sites.ts` 的 `practical` / `bestSeason`                       | 必须能追溯到 sources                                   |
| 照片带 5 张的图名与「市 · 分类」                     | `brand/index.html`                                                         | 一般只换图不换字                                       |
| 封面 / 图集 / 分享图路径                             | `src/data/sites.ts`、`public/images/sites/...`                            | 见 AGENTS.md 图片规则                                  |

改完文案把这份文件发回来就行；上表里的东西如果也想动，单独说一声，我按数据契约的流程处理（可能要补 sources 或写 ADR）。
