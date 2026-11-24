<script setup lang="ts">
import { computed } from 'vue'

import CategoryLegend from '@/components/home/CategoryLegend.vue'
import AppIcon from '@/components/icons/AppIcon.vue'
import { FEATURED_SITE_IDS } from '@/data/sites'
import { useSitesStore } from '@/stores/sites'
import type { Site } from '@/types/site'
import { assetUrl } from '@/utils/asset-url'

const emit = defineEmits<{ menu: []; select: [id: string] }>()

const store = useSitesStore()

/** 本期精选：地图上带金色虚线环的那几个项目，点名字直接选中 */
const picks = computed(() =>
  FEATURED_SITE_IDS.map((id) => store.getSiteById(id)).filter(
    (site): site is Site => site !== null,
  ),
)
</script>

<template>
  <aside class="rail" aria-label="地图版头">
    <div class="rail__brand">
      <h1><span>乡</span><span>遇</span><span>安</span><span>徽</span></h1>
      <img class="rail__seal" :src="assetUrl('/brand/logo-red.webp')" alt="" aria-hidden="true" />
      <p class="rail__sub">摊开地图，尽收安徽十六城，走遍整个安徽文化</p>
      <p class="rail__quote">一生痴绝处，无梦到徽州</p>
    </div>

    <p class="rail__label">分类 · 图例</p>
    <CategoryLegend />
    <p class="rail__hint">地图上底色越深，收录越多。</p>

    <p class="rail__label rail__label--gap">本期精选</p>
    <div class="rail__picks">
      <button
        v-for="site in picks"
        :key="site.id"
        type="button"
        class="pick"
        @click="emit('select', site.id)"
      >
        <span class="pick__dot" aria-hidden="true" />
        <b>{{ site.name }}</b>
        <span class="pick__city">{{ site.city.replace('市', '') }}</span>
      </button>
    </div>

    <div class="rail__meta">
      <b>安徽省 · 16 个地级市</b>
      <span>底图：DataV.GeoAtlas · 封面来自公开资料</span>
      <span class="rail__meta-warn">
        公开登载需审图号（待办，见菜单 About）；底图需核验商用授权
      </span>
      <span class="rail__credit">
        水系与河道 ©
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer"
          >OpenStreetMap contributors</a
        >（ODbL）
      </span>
      <button type="button" class="rail__menu" @click="emit('menu')">
        <AppIcon name="menu" :size="13" />菜单 / 关于
      </button>
    </div>
  </aside>
</template>

<style scoped>
/*
 * 版头是一张独立的纸片：不透明底色 + 描边 + 投影。
 * 之前直接浮在地图上，文字和地图线重叠，读起来很费劲。
 */
.rail {
  position: absolute;
  /* 顶栏（菜单 / 搜索 / 筛选）现在常驻，版头从它下面开始 */
  top: 5.4rem;
  bottom: 1.4rem;
  left: 1.4rem;
  z-index: 12;
  display: flex;
  flex-direction: column;
  width: 19rem;
  padding: 1.2rem 1.1rem;
  overflow-y: auto;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-panel);
  scrollbar-width: none;
}

.rail::-webkit-scrollbar {
  display: none;
}

/*
 * 品牌区：竖排题字 + 落款朱砂印（ADR 0008，方案 D）。
 * 用 grid 而不是 flex：行高由内容直接决定，不经过 flex 收缩机制——
 * 嵌套 flex 曾把标题压成「每字一列」的横向排列（实测踩坑）。
 * 读序从右起：标题右上、落款印右下、副题中列、引言贴左缘。
 * 引言（汤显祖写徽州的名句，公有领域）是为填满标题左侧留白补的第三列。
 */
.rail__brand {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-rows: auto auto;
  column-gap: 18px;
  align-items: start;
  /* 版头是可滚动的 column flex：矮屏下空间不足会按比例收缩子项，
     brand 被压到 min-height 后落款印溢出叠进图例（实测踩坑），禁收缩 */
  flex-shrink: 0;
}

.rail__brand h1 {
  grid-column: 3;
  grid-row: 1;
  justify-self: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3em;
  margin: 0;
  font-family: var(--font-display);
  font-size: 2.4rem;
  font-weight: 600;
  line-height: 1.15;
  /*
   * 伪竖排：每字一个 span 纵向堆叠。不走 writing-mode: vertical-rl——
   * 实测它在部分内核 + 大字号 + letter-spacing 组合下会退化成
   * 「每字一列」的横向排列（副题小字正常、标题大字异常，无法通过
   * 宽度/高度约束修复），逐字堆叠在所有内核行为一致。
   */
}

/*
 * 落款印：改用标识图（design/logo/source/logo_red.png 的透明版），取代原来的朱砂方块 +「徽」字。
 * 图里纸底已抠掉，字是镂空的，透出的是卡片自身的纸色——所以不要给它加底色。
 * 2.6rem 的旧印位在 48px 量级下笔锋会糊，这里放到 3.2rem（≈51px）。
 */
.rail__seal {
  grid-column: 3;
  grid-row: 2;
  justify-self: center;
  display: block;
  flex: none;
  width: 3.2rem;
  height: auto;
  margin-top: 14px;
}

/* 朱砂落款印：全页唯一的高饱和色（ADR 0008 的单色纪律例外） */

/* 竖排副题：细字、低对比，像题画诗的位置；跨两行贴在标题列左侧 */
.rail__sub {
  grid-column: 2;
  grid-row: 1 / span 2;
  justify-self: end;
  margin: 0;
  padding-top: 6px;
  writing-mode: vertical-rl;
  font-size: 0.68rem;
  line-height: 2;
  letter-spacing: 0.2em;
  color: var(--ink-soft);
}

/*
 * 竖排引言：汤显祖写徽州的名句，公有领域。深金小字（--seal-ink）
 * 是 0007 里「小字号金」的合法用法，提亮而不抢主标题。
 * 贴卡片左缘，与下方图例的左对齐呼应——填掉标题左侧的大片留白。
 */
.rail__quote {
  grid-column: 1;
  grid-row: 1 / span 2;
  justify-self: start;
  margin: 0;
  padding-top: 8px;
  writing-mode: vertical-rl;
  font-family: var(--font-serif);
  font-size: 0.72rem;
  line-height: 2;
  letter-spacing: 0.34em;
  color: var(--seal-ink);
}

/* 矮屏（1284×685 这类）版头原本就要滚动，品牌区收一档减少挤出量 */
@media (max-height: 760px) {
  .rail__brand {
    min-height: 8rem;
  }

  .rail__brand h1 {
    font-size: 2rem;
    min-height: 10rem;
  }
}

.rail__label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 1.5rem 0 0.6rem;
  font-size: 0.64rem;
  font-weight: 500;
  color: var(--ink-soft);
  letter-spacing: 0.26em;
}

.rail__label--gap {
  margin-top: 18px;
}

.rail__badge {
  font-size: 0.55rem;
  letter-spacing: 0.08em;
  color: var(--ink-soft);
}

/* choropleth 的语义说明：颜色不解释就有歧义（会被误读成推荐度或经济水平） */
.rail__hint {
  margin: 0.5rem 0 0;
  font-size: 0.62rem;
  line-height: 1.6;
  color: var(--ink-soft);
  letter-spacing: 0.05em;
}

.pick {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  height: 28px;
  padding: 0 4px;
  font: inherit;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
}

.pick:hover {
  color: var(--ink);
  background: var(--surface-muted);
}

.pick__dot {
  flex: none;
  width: 4px;
  height: 4px;
  background: var(--seal);
}

.pick b {
  overflow: hidden;
  font-family: var(--font-serif);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick__city {
  margin-left: auto;
  font-size: 0.64rem;
  letter-spacing: 0.06em;
}

.rail__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 9px;
  margin-top: auto;
  font-size: 0.58rem;
  line-height: 1.9;
  color: var(--ink-soft);
  letter-spacing: 0.08em;
  border-top: 1px solid var(--rule);
}

.rail__credit a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.rail__meta b {
  font-weight: 500;
  color: var(--ink);
  letter-spacing: 0.16em;
}

/* 合规提示：审图号 / 授权两件事都是「上线前待办」，藏在菜单 About 里
   会被推迟处理，这里放回版头可见处（要求非常见的外部合规闸门） */
.rail__meta-warn {
  font-size: 0.58rem;
  color: var(--ink);
}

.rail__menu {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  align-self: flex-start;
  padding: 4px 0 0;
  margin-top: 4px;
  font: inherit;
  font-size: 8px;
  color: var(--ink-soft);
  letter-spacing: 0.1em;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.rail__menu:hover {
  color: var(--ink);
}

@media (width <= 1199px) {
  .rail {
    display: none;
  }
}
</style>
