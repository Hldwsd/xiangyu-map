<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { prefersReducedMotion } from '@/utils/motion'

import { useSitesStore } from '@/stores/sites'
import AppIcon from '@/components/icons/AppIcon.vue'
import CategoryIcon from '@/components/icons/CategoryIcon.vue'
import { assetUrl } from '@/utils/asset-url'
import { amapSiteUrl, sourceLabel } from '@/utils/site-links'

const FALLBACK_COVER = '/images/placeholder.svg'

const props = defineProps<{ id: string }>()

const store = useSitesStore()
const router = useRouter()
const site = computed(() => store.getSiteById(props.id))

const DEFAULT_SHARE_IMAGE = '/og-cover.jpg'
const shareImageUrl = computed(() => assetUrl(site.value?.shareImage ?? DEFAULT_SHARE_IMAGE))
const shareImageAlt = computed(() => `${site.value?.name ?? '项目'} · 分享图`)

const shareOpen = ref(false)
const shareStatus = ref('')
const canNativeShare = ref(false)
const shareClose = ref<HTMLButtonElement | null>(null)
const shareDialog = ref<HTMLElement | null>(null)
const shareTrigger = ref<HTMLButtonElement | null>(null)
let previousBodyOverflow = ''

function lockBodyScroll(): void {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockBodyScroll(): void {
  document.body.style.overflow = previousBodyOverflow
  previousBodyOverflow = ''
}

function openShare(): void {
  shareStatus.value = ''
  shareOpen.value = true
}

function closeShare(): void {
  shareOpen.value = false
  shareStatus.value = ''
  void nextTick(() => shareTrigger.value?.focus())
}

/** modal 内的焦点循环：Tab / Shift+Tab 不跑到弹层外，Esc 关闭 */
function handleShareKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeShare()
    return
  }
  if (event.key !== 'Tab') return
  const dialog = shareDialog.value
  if (dialog === null) return
  const focusables = [
    ...dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ].filter(
    (element) =>
      !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  )
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (first === undefined || last === undefined) {
    event.preventDefault()
    return
  }
  const active = document.activeElement
  const inside = active !== null && dialog.contains(active)
  if (event.shiftKey && (active === first || !inside)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !inside)) {
    event.preventDefault()
    first.focus()
  }
}

watch(shareOpen, (open) => {
  if (open) {
    lockBodyScroll()
    window.addEventListener('keydown', handleShareKeydown)
    void nextTick(() => shareClose.value?.focus())
    return
  }
  unlockBodyScroll()
  window.removeEventListener('keydown', handleShareKeydown)
})

onBeforeUnmount(() => {
  unlockBodyScroll()
  window.removeEventListener('keydown', handleShareKeydown)
})

function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

async function copyShareLink(): Promise<void> {
  const text = window.location.href
  const clipboard = navigator.clipboard
  if (typeof clipboard?.writeText === 'function') {
    try {
      // 某些浏览器里 clipboard 权限弹窗不出现、Promise 一直挂起，加个超时免得按钮像没反应
      await Promise.race([
        clipboard.writeText(text),
        new Promise((_resolve, reject) => {
          window.setTimeout(() => reject(new Error('clipboard-timeout')), 1200)
        }),
      ])
      shareStatus.value = '链接已复制'
      return
    } catch {
      // 落到 execCommand 兜底
    }
  }
  shareStatus.value = legacyCopy(text) ? '链接已复制' : '复制失败，请手动复制地址栏'
}

async function nativeShare(): Promise<void> {
  const current = site.value
  if (current === null || typeof navigator.share !== 'function') return
  try {
    await navigator.share({
      title: `${current.name} · 乡遇安徽`,
      text: current.summary,
      url: window.location.href,
    })
  } catch {
    // 用户取消系统分享时浏览器会抛 AbortError，不需要提示
  }
}

/** 只有还带「示例数据」标签的条目才提示「内容为占位」；其余只说明封面来源与授权状态 */
const isSample = computed(() => site.value?.tags.includes('示例数据') === true)

/**
 * 路由切换后把焦点交给标题。
 *
 * SPA 里换页不会像整页刷新那样把焦点归零：点「查看详情」后焦点仍留在原链接所在的页面，
 * 读屏用户听不到任何新内容，键盘用户下一次 Tab 会从文档开头重新数。
 * 标题加 tabindex="-1" 后可以程序化聚焦，又不会插进 Tab 序列。
 */
const heading = ref<HTMLHeadingElement | null>(null)

function focusHeading(): void {
  void nextTick(() => heading.value?.focus({ preventScroll: true }))
}

onMounted(() => {
  focusHeading()
  canNativeShare.value = typeof navigator.share === 'function'
})

// 详情页之间用「上一条 / 下一条」互跳时不得整页重挂，靠监听 id 重新聚焦
watch(() => props.id, focusHeading)

const paragraphs = computed(() => {
  const current = site.value
  if (current === null) return []
  return current.description
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
})

/**
 * 同城其他项目：短途游客更可能把同城几个点串成半天/一天，所以不跨城推荐。
 * 同类项目优先，最多 3 条；数据顺序作为同分时的稳定次序。
 */
const nearbySites = computed(() => {
  const current = site.value
  if (current === null) return []
  const sameCity = store.sites.filter(
    (item) => item.city === current.city && item.id !== current.id,
  )
  return [...sameCity]
    .sort(
      (a, b) => Number(b.category === current.category) - Number(a.category === current.category),
    )
    .slice(0, 3)
})

/** 相邻项目按数据文件顺序取，不循环：首尾各给一句明确的边界提示，比绕回更可预期 */
const index = computed(() => store.sites.findIndex((item) => item.id === props.id))
const previous = computed(() => (index.value > 0 ? (store.sites[index.value - 1] ?? null) : null))
const next = computed(() => {
  if (index.value < 0) return null
  return store.sites[index.value + 1] ?? null
})

/**
 * 图片失败占位。
 * 记下坏掉的地址再换占位图，而不是在原元素上改 src——占位图自己也可能 404，
 * 那样会变成无限的 error 循环。
 */
const brokenImages = ref<ReadonlySet<string>>(new Set())

function srcFor(url: string): string {
  return brokenImages.value.has(url) ? FALLBACK_COVER : url
}

function markBroken(url: string): void {
  brokenImages.value = new Set([...brokenImages.value, url])
}

/** 返回地图：记录大图当前矩形，回地图后由地图侧把它收进右侧卡片封面 */
function backToMap(event: MouseEvent): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()

  store.selectSite(props.id)

  const hero = document.querySelector<HTMLImageElement>('.detail__hero-img')
  if (prefersReducedMotion() || hero === null) {
    void router.push({ name: 'home' })
    return
  }

  const rect = hero.getBoundingClientRect()
  sessionStorage.setItem(
    'xy-return-flight',
    JSON.stringify({
      src: hero.src,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    }),
  )
  sessionStorage.setItem('xy-return-instant', '1')
  void router.push({ name: 'home' })
}
</script>

<template>
  <article v-if="site" class="detail">
    <button type="button" class="detail__back" @click="backToMap">
      <AppIcon name="back" :size="14" />返回地图
    </button>

    <figure class="detail__hero">
      <img
        class="detail__hero-img detail__cover"
        :src="assetUrl(srcFor(site.cover))"
        :alt="`${site.name} 封面`"
        @error="markBroken(site.cover)"
      />
    </figure>

    <header class="detail__header">
      <p class="detail__meta">
        <span class="detail__category">
          <CategoryIcon :category="site.category" :size="18" />{{ site.category }}
        </span>
        <span>{{ site.province }} · {{ site.city }}</span>
        <span class="detail__updated">更新于 {{ site.updatedAt }}</span>
      </p>

      <div class="detail__heading">
        <h1 ref="heading" class="detail__title" tabindex="-1">{{ site.name }}</h1>
        <button
          ref="shareTrigger"
          type="button"
          class="detail__share"
          aria-haspopup="dialog"
          @click="openShare"
        >
          <AppIcon name="share" :size="14" />分享
        </button>
      </div>

      <p class="detail__summary">{{ site.summary }}</p>
    </header>

    <div class="detail__layout">
      <section class="detail__section detail__intro">
        <h2>简介</h2>
        <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
      </section>

      <aside class="detail__side">
        <section class="detail__section detail__facts-section">
          <h2>实用信息</h2>
          <dl class="detail__facts">
            <dt><AppIcon name="pin" :size="12" />坐标</dt>
            <dd>{{ site.location.lng }}, {{ site.location.lat }}（GCJ-02）</dd>
            <template v-if="site.practical?.duration">
              <dt><AppIcon name="clock" :size="12" />建议停留</dt>
              <dd>{{ site.practical.duration }}</dd>
            </template>
            <template v-if="site.bestSeason">
              <dt><AppIcon name="calendar" :size="12" />最佳季节</dt>
              <dd>{{ site.bestSeason }}</dd>
            </template>
            <template v-if="site.practical?.hours">
              <dt><AppIcon name="clock" :size="12" />开放时间</dt>
              <dd>{{ site.practical.hours }}</dd>
            </template>
            <template v-if="site.practical?.ticket">
              <dt><AppIcon name="ticket" :size="12" />门票</dt>
              <dd>{{ site.practical.ticket }}</dd>
            </template>
            <template v-if="site.transport">
              <dt><AppIcon name="route" :size="12" />交通</dt>
              <dd>{{ site.transport }}</dd>
            </template>
            <template v-if="site.practical?.audience">
              <dt><AppIcon name="users" :size="12" />适合</dt>
              <dd>{{ site.practical.audience }}</dd>
            </template>
            <dt><AppIcon name="pin" :size="12" />地图</dt>
            <dd>
              <a
                class="detail__nav"
                :href="amapSiteUrl(site)"
                target="_blank"
                rel="noopener noreferrer"
                title="打开高德地图的地点页；没有精确短链时按名称搜索"
              >
                在高德地图查看位置<AppIcon name="external" :size="12" />
              </a>
            </dd>
            <template v-if="site.bookingUrl">
              <dt><AppIcon name="external" :size="12" />预约</dt>
              <dd>
                <a :href="site.bookingUrl" target="_blank" rel="noopener noreferrer">{{
                  site.bookingUrl
                }}</a>
              </dd>
            </template>
          </dl>
        </section>
      </aside>

      <section v-if="site.gallery.length > 0" class="detail__section detail__gallery-section">
        <h2>图集</h2>
        <div class="detail__gallery">
          <img
            v-for="image in site.gallery"
            :key="image"
            :src="assetUrl(srcFor(image))"
            :alt="site.name"
            loading="lazy"
            @error="markBroken(image)"
          />
        </div>
      </section>

      <section v-if="nearbySites.length > 0" class="detail__section">
        <h2>同城其他项目</h2>
        <ul class="detail__nearby">
          <li v-for="item in nearbySites" :key="item.id">
            <RouterLink
              class="detail__nearby-link"
              :to="{ name: 'site-detail', params: { id: item.id } }"
            >
              <span class="detail__nearby-cat">
                <CategoryIcon :category="item.category" :size="17" />
              </span>
              <span class="detail__nearby-body">
                <b>{{ item.name }}</b>
                <small>{{ item.category }} · {{ item.summary }}</small>
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section class="detail__section detail__sources-section">
        <h2>来源</h2>
        <ul class="detail__sources">
          <li v-for="source in site.sources" :key="source">
            <a
              :href="source"
              target="_blank"
              rel="noopener noreferrer"
              :title="source"
              :aria-label="`打开来源：${source}`"
              >{{ sourceLabel(source) }}</a
            >
          </li>
        </ul>
        <p v-if="isSample" class="detail__notice">
          当前为示例数据：文案、图片与来源均为占位，正式上线前会逐条替换为可核验的官方资料。
        </p>
        <p v-else class="detail__notice">
          封面来自公开资料，版权归原作者；正式授权素材到位后替换。
        </p>
      </section>

      <nav class="detail__pager" aria-label="相邻项目">
        <RouterLink
          v-if="previous"
          class="detail__pager-item"
          :to="{ name: 'site-detail', params: { id: previous.id } }"
        >
          <span class="detail__pager-dir"><AppIcon name="prev" :size="12" />上一条</span>
          <span class="detail__pager-name">{{ previous.name }}</span>
        </RouterLink>
        <span v-else class="detail__pager-item detail__pager-item--empty">已是第一条</span>

        <RouterLink
          v-if="next"
          class="detail__pager-item detail__pager-item--next"
          :to="{ name: 'site-detail', params: { id: next.id } }"
        >
          <span class="detail__pager-dir">下一条<AppIcon name="next" :size="12" /></span>
          <span class="detail__pager-name">{{ next.name }}</span>
        </RouterLink>
        <span v-else class="detail__pager-item detail__pager-item--empty detail__pager-item--next"
          >已是最后一条</span
        >
      </nav>
    </div>

    <button type="button" class="detail__back detail__back--bottom" @click="backToMap">
      <AppIcon name="back" :size="14" />返回地图
    </button>

    <Teleport to="body">
      <div
        v-if="shareOpen"
        class="share-layer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        @click.self="closeShare"
      >
        <div ref="shareDialog" class="share-card">
          <header class="share-card__head">
            <h2 id="share-title">分享这张卡片</h2>
            <button
              ref="shareClose"
              type="button"
              class="share-card__close"
              aria-label="关闭分享"
              @click="closeShare"
            >
              <AppIcon name="close" :size="16" />
            </button>
          </header>
          <img class="share-card__image" :src="shareImageUrl" :alt="shareImageAlt" loading="lazy" />
          <p class="share-card__caption">
            {{ site.name }} · {{ site.city }}<br />
            <span>分享到社交平台时会显示这张 1200×630 卡片。</span>
          </p>
          <div class="share-card__actions">
            <button type="button" class="share-card__button" @click="copyShareLink">
              复制链接
            </button>
            <a class="share-card__button" :href="shareImageUrl" :download="`${site.id}-share.jpg`">
              保存图片
            </a>
            <button
              v-if="canNativeShare"
              type="button"
              class="share-card__button share-card__button--primary"
              @click="nativeShare"
            >
              系统分享
            </button>
          </div>
          <p class="share-card__status" aria-live="polite">{{ shareStatus }}</p>
        </div>
      </div>
    </Teleport>
  </article>

  <div v-else class="detail detail--missing">
    <h1>没有找到这个项目</h1>
    <p>链接可能已经失效，或者该项目已从数据中移除。</p>
    <button type="button" class="detail__back" @click="backToMap">← 返回地图</button>
  </div>
</template>

<style scoped>
.detail {
  width: 100%;
  max-width: 74rem;
  margin: 0 auto;
  padding: 0 clamp(1.1rem, 3vw, 2.6rem) var(--space-7);
}

/* ---- 返回 ---- */

.detail__back {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.55rem 0.95rem;
  margin: var(--space-4) 0 var(--space-3);
  font: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
  appearance: none;
  color: var(--surface);
  text-decoration: none;
  background: var(--ink);
  border: 1px solid var(--ink);
  border-radius: var(--radius-sm);
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.detail__back:hover {
  color: var(--surface);
  background: #2a241d;
  transform: translateX(-2px);
}

.detail__back:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.detail__back--bottom {
  margin-top: var(--space-6);
}

/* ---- 大图开场 ---- */

.detail__hero {
  margin: var(--space-2) 0 0;
}

.detail__hero-img {
  display: block;
  view-transition-name: site-cover;
  width: 100%;
  max-height: min(56vh, 34rem);
  aspect-ratio: 2.25 / 1;
  object-fit: cover;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

/* ---- 标题区：大标题 + 右侧分享，无卡片 ---- */

.detail__header {
  padding: clamp(1.4rem, 3vw, 2.4rem) 0 clamp(1.2rem, 2.4vw, 2rem);
  border-bottom: 1px solid var(--line);
}

.detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin: 0 0 var(--space-4);
  font-size: var(--text-xs);
  color: var(--ink-soft);
}

.detail__category {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  padding: 0.14rem 0.55rem;
  color: var(--ink);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
}

.detail__updated {
  margin-left: auto;
  font-size: var(--text-2xs);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.detail__heading {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  justify-content: space-between;
}

.detail__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.1rem, 4.2vw, 3.2rem);
  font-weight: 650;
  line-height: 1.12;
  letter-spacing: var(--tracking-display);
  color: var(--ink);
}

.detail__title:focus {
  outline: none;
}

.detail__summary {
  max-width: 66ch;
  margin: var(--space-3) 0 0;
  font-size: var(--text-md);
  line-height: var(--leading-relaxed);
  color: var(--ink-soft);
}

.detail__share {
  display: inline-flex;
  flex: none;
  gap: 0.35rem;
  align-items: center;
  margin-top: 0.5rem;
  padding: 0.45rem 0.8rem;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--ink);
  cursor: pointer;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.detail__share:hover {
  background: var(--surface);
  border-color: var(--line-strong);
}

.detail__share:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ---- 主体：正文一列，实用信息右侧吸顶 ---- */

.detail__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 21rem;
  grid-template-areas:
    'intro side'
    'gallery side'
    'nearby side'
    'sources sources'
    'pager pager';
  column-gap: clamp(2rem, 4vw, 4.5rem);
  align-items: start;
}

.detail__intro {
  grid-area: intro;
}

.detail__side {
  grid-area: side;
  position: sticky;
  top: 1.5rem;
  padding: 1.2rem 1.3rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.detail__gallery-section {
  grid-area: gallery;
}

.detail__sources-section {
  grid-area: sources;
}

.detail__pager {
  grid-area: pager;
}

/* ---- 小节：只用细线分节，不再套卡片 ---- */

.detail__section {
  padding-top: var(--space-4);
  margin-top: var(--space-5);
  border-top: 1px solid var(--line);
}

.detail__section h2 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-2xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  color: var(--ink-soft);
}

.detail__section p {
  max-width: 64ch;
  margin: 0 0 var(--space-3);
  font-size: var(--text-base);
  line-height: 1.9;
  color: var(--ink);
}

.detail__intro {
  margin-top: var(--space-4);
  border-top: 0;
}

.detail__intro p {
  font-size: var(--text-md);
}

/* 右侧卡里的实用信息不重复画线 */

.detail__facts-section {
  padding-top: 0;
  margin-top: 0;
  border-top: 0;
}

.detail__facts {
  display: grid;
  grid-template-columns: 6.2rem 1fr;
  margin: 0;
  font-size: var(--text-sm);
}

.detail__facts dt,
.detail__facts dd {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--line);
}

.detail__facts dt {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  color: var(--ink-soft);
}

.detail__facts dd {
  margin: 0;
  line-height: var(--leading-snug);
}

.detail__facts dt:last-of-type,
.detail__facts dd:last-of-type {
  border-bottom: 0;
}

.detail__nav {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  color: var(--accent);
  text-underline-offset: 0.18em;
}

/* ---- 图集：第一张通栏，其余两列 ---- */

.detail__gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.detail__gallery img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

/* 3 张以上时第一张通栏；只有 2 张时并排等宽，不留空格 */
.detail__gallery:has(img:nth-child(3)) img:first-child {
  grid-column: 1 / -1;
  aspect-ratio: 16 / 7;
}

/* ---- 同城其他项目：行式列表，弱化底色 ---- */

.detail__nearby {
  display: grid;
  gap: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

.detail__nearby li + li {
  border-top: 1px solid var(--line);
}

.detail__nearby-link {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: 0.85rem 0.2rem;
  color: var(--ink);
  text-decoration: none;
  transition:
    color 0.15s ease,
    transform 0.15s ease;
}

.detail__nearby-link:hover {
  color: var(--accent);
  transform: translateX(2px);
}

.detail__nearby-cat {
  display: inline-flex;
  margin-top: 0.1rem;
  color: var(--ink-soft);
}

.detail__nearby-body {
  display: flex;
  flex-direction: column;
  gap: 0.16rem;
  min-width: 0;
}

.detail__nearby-body b {
  font-size: var(--text-base);
  font-weight: 600;
}

.detail__nearby-body small {
  display: -webkit-box;
  overflow: hidden;
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--ink-soft);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* ---- 来源与提示 ---- */

.detail__sources {
  padding-left: 1.1rem;
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
}

.detail__sources a {
  color: var(--accent);
  word-break: break-all;
}

.detail__notice {
  margin: var(--space-3) 0 0 !important;
  padding: 0.65rem 0.8rem;
  font-size: var(--text-xs) !important;
  line-height: 1.65 !important;
  color: var(--ink-soft) !important;
  background: var(--surface-muted);
  border-radius: var(--radius-sm);
}

/* ---- 上下一条 ---- */

.detail__pager {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding-top: var(--space-4);
  margin-top: var(--space-5);
  border-top: 1px solid var(--line);
}

.detail__pager-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.7rem 0.85rem;
  color: var(--ink);
  text-decoration: none;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.detail__pager-item:hover {
  background: var(--surface-muted);
  border-color: var(--line-strong);
}

.detail__pager-item--next {
  align-items: flex-end;
  text-align: right;
}

.detail__pager-item--empty {
  color: var(--ink-soft);
  background: transparent;
  border-style: dashed;
}

.detail__pager-dir {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  font-size: var(--text-2xs);
  letter-spacing: 0.06em;
  color: var(--ink-soft);
}

.detail__pager-name {
  font-size: var(--text-base);
}

/* ---- 分享卡片 ---- */

.share-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(20 18 15 / 58%);
  backdrop-filter: blur(2px);
}

.share-card {
  width: min(44rem, 100%);
  max-height: calc(100vh - 2rem);
  padding: clamp(1rem, 3vw, 1.5rem);
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
}

.share-card__head {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.share-card__head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--ink);
}

.share-card__close {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  color: var(--ink-soft);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 50%;
}

.share-card__close:hover {
  color: var(--ink);
  border-color: var(--line-strong);
}

.share-card__image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1200 / 630;
  object-fit: cover;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

.share-card__caption {
  margin: var(--space-3) 0;
  font-size: var(--text-sm);
  line-height: 1.65;
  color: var(--ink);
}

.share-card__caption span {
  color: var(--ink-soft);
}

.share-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.share-card__button {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.8rem;
  font: inherit;
  font-size: var(--text-sm);
  color: var(--ink);
  text-decoration: none;
  cursor: pointer;
  background: var(--surface-muted);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
}

.share-card__button:hover {
  background: var(--surface);
  border-color: var(--line-strong);
}

.share-card__button--primary {
  color: var(--surface);
  background: var(--ink);
  border-color: var(--ink);
}

.share-card__button--primary:hover {
  color: var(--surface);
  background: var(--ink-soft);
  border-color: var(--ink-soft);
}

.share-card__status {
  min-height: 1.2em;
  margin: 0.6rem 0 0;
  font-size: var(--text-xs);
  color: var(--accent);
}

.share-card__status:empty {
  display: none;
}

.detail--missing {
  padding-top: var(--space-6);
}

@media (width <= 720px) {
  .detail__facts {
    grid-template-columns: 1fr;
  }

  .detail__facts dt {
    padding-bottom: 0.1rem;
    border-bottom: 0;
  }

  .detail__facts dd {
    padding-top: 0.1rem;
    padding-bottom: 0.7rem;
  }

  .detail__pager {
    grid-template-columns: 1fr;
  }

  .detail__pager-item--next {
    align-items: flex-start;
    text-align: left;
  }
}

@media (width <= 900px) {
  .detail__layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      'intro'
      'side'
      'gallery'
      'nearby'
      'sources'
      'pager';
    column-gap: 0;
  }

  .detail__side {
    position: static;
  }

  .detail__hero-img {
    aspect-ratio: 16 / 9;
    max-height: none;
  }

  .detail__heading {
    flex-direction: column;
  }

  .detail__share {
    margin-top: 0;
  }

  .detail__gallery:has(img:nth-child(3)) img:first-child {
    aspect-ratio: 16 / 9;
  }
}
</style>
