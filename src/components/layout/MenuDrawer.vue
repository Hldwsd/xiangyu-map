<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AppIcon from '@/components/icons/AppIcon.vue'
import { useFocusTrap } from '@/composables/use-focus-trap'
import { assetUrl } from '@/utils/asset-url'

const props = defineProps<{
  open: boolean
  siteCount: number
  showDistricts: boolean
  mergeMarkers: boolean
}>()
const emit = defineEmits<{
  close: []
  'open-list': []
  'update:show-districts': [value: boolean]
  'update:merge-markers': [value: boolean]
}>()

/** 品牌页是独立的静态入口（/brand/），不在 SPA 路由表里，所以用普通链接 */
const brandHref = assetUrl('/brand/')

const panel = ref<HTMLElement | null>(null)
useFocusTrap(
  computed(() => props.open),
  panel,
)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

watch(
  () => props.open,
  (open) => {
    document.body.classList.toggle('has-overlay', open)
  },
)
onBeforeUnmount(() => document.body.classList.remove('has-overlay'))
</script>

<template>
  <div v-if="open" class="drawer">
    <button type="button" class="drawer__backdrop" aria-label="关闭菜单" @click="emit('close')" />

    <aside
      ref="panel"
      class="drawer__panel"
      role="dialog"
      aria-modal="true"
      aria-label="菜单"
      tabindex="-1"
    >
      <header class="drawer__header">
        <span class="drawer__brand">乡遇安徽</span>
        <span class="drawer__tag">在地图上遇见一个文旅项目</span>
        <button type="button" class="drawer__close" aria-label="关闭菜单" @click="emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </header>

      <nav class="drawer__nav">
        <button type="button" class="drawer__item" @click="emit('open-list')">
          <AppIcon name="all" :size="16" />
          <span>项目列表</span>
          <span class="drawer__count">{{ siteCount }}</span>
        </button>
        <RouterLink class="drawer__item" :to="{ name: 'home' }" @click="emit('close')">
          <AppIcon name="map" :size="16" />
          <span>回到地图</span>
        </RouterLink>
        <a class="drawer__item" :href="brandHref" @click="emit('close')">
          <AppIcon name="external" :size="16" />
          <span>品牌页 · 一纸山河</span>
        </a>
      </nav>

      <section class="drawer__section">
        <h2>地图图层</h2>
        <label class="drawer__toggle">
          <input
            type="checkbox"
            :checked="showDistricts"
            @change="emit('update:show-districts', ($event.target as HTMLInputElement).checked)"
          />
          <span>
            显示区县界
            <small
              >默认开启：按区县看项目分布更准；官方标准图（皖S(2025)71号）只有 16 个地级市</small
            >
          </span>
        </label>
        <label class="drawer__toggle">
          <input
            type="checkbox"
            :checked="mergeMarkers"
            @change="emit('update:merge-markers', ($event.target as HTMLInputElement).checked)"
          />
          <span>
            合并重叠标签
            <small>默认关闭：每个项目单独画，方便逐个点选；打开后靠得近的项目会合成一个数字</small>
          </span>
        </label>
      </section>

      <section class="drawer__section">
        <h2>关于</h2>
        <p>
          「乡遇安徽」把安徽省 16
          个地级市的文旅项目放在一张地图上：古镇、非遗、红色、自然、演艺、乡村、场馆七类，
          按形状区分，点开看详情。
        </p>
        <p class="drawer__note">
          当前
          {{ siteCount }} 条数据的来源可逐条核验；封面来自公开资料，版权归原作者，底图与图层来源见
          <code>public/maps/README.md</code>。
        </p>
        <p class="drawer__note">
          行政区划依据：安徽省自然资源厅《安徽省示意图（一）》（审图号
          皖S(2025)71号）——该标准图只划分 16 个地级市，因此区县界只是补充图层，可在上方按需关掉。
        </p>
        <p class="drawer__note">背景书法：邓石如《少学琴书册》（清代，公有领域）。</p>
        <p class="drawer__note">
          湖泊与河道数据 ©
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            >OpenStreetMap contributors</a
          >，按 ODbL 授权；底图轮廓来自 DataV.GeoAtlas。
        </p>
      </section>

      <footer class="drawer__footer">
        <span>纸本墨线 · 2026</span>
        <a href="https://github.com/Hldwsd/xiangyu-map" target="_blank" rel="noopener noreferrer">
          GitHub
          <AppIcon name="external" :size="12" />
        </a>
      </footer>
    </aside>
  </div>
</template>

<style scoped>
.drawer {
  position: absolute;
  inset: 0;
  z-index: 30;
}

.drawer__backdrop {
  position: absolute;
  inset: 0;
  cursor: pointer;
  background: rgb(var(--overlay-rgb) / 24%);
  border: 0;
  animation: fade-in 0.16s ease;
}

.drawer__panel {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: min(20rem, 84vw);
  padding: calc(env(safe-area-inset-top, 0px) + var(--space-4)) var(--space-4) var(--space-4);
  overflow-y: auto;
  background: var(--surface);
  border-right: 1px solid var(--line);
  animation: slide-in 0.2s ease;
}

.drawer__header {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-right: 2rem;
}

.drawer__brand {
  font-size: var(--text-lg);
  font-weight: 650;
  letter-spacing: var(--tracking-brand);
  color: var(--ink);
}

.drawer__tag {
  font-size: var(--text-xs);
  color: var(--ink-soft);
}

.drawer__close {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  color: var(--ink);
  cursor: pointer;
  background: var(--surface-muted);
  border: 0;
  border-radius: 50%;
}

.drawer__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}

.drawer__item {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: 0.6rem var(--space-2);
  font: inherit;
  font-size: var(--text-base);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.drawer__item:hover {
  background: var(--surface-muted);
}

.drawer__count {
  margin-left: auto;
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--ink-soft);
}

.drawer__section {
  padding-top: var(--space-3);
  border-top: 1px solid var(--line);
}

.drawer__section h2 {
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xs);
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  color: var(--ink-soft);
}

.drawer__toggle {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: var(--text-sm);
  color: var(--ink);
  cursor: pointer;
}

.drawer__toggle input {
  margin-top: 0.2rem;
  accent-color: var(--accent);
}

.drawer__toggle small {
  display: block;
  margin-top: 0.15rem;
  font-size: var(--text-2xs);
  line-height: 1.6;
  color: var(--ink-soft);
}

.drawer__section p {
  margin: 0 0 var(--space-2);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--ink);
}

.drawer__note {
  font-size: var(--text-xs) !important;
  color: var(--ink-soft) !important;
}

.drawer__note code {
  font-size: 0.95em;
}

.drawer__footer {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-top: var(--space-3);
  font-size: var(--text-2xs);
  color: var(--ink-soft);
  border-top: 1px solid var(--line);
}

.drawer__footer a {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  color: var(--ink-soft);
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes slide-in {
  from {
    transform: translateX(-8px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .drawer__backdrop,
  .drawer__panel {
    animation: none;
  }
}
</style>
