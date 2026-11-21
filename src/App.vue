<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import AppIcon from '@/components/icons/AppIcon.vue'

const route = useRoute()
/** 首页是全屏地图，导航与页脚都收进菜单；其余页面保留常规头部与页脚 */
const chromeHidden = computed(() => route.name === 'home')
</script>

<template>
  <div class="app">
    <header v-if="!chromeHidden" class="app__header">
      <RouterLink class="app__brand" :to="{ name: 'home' }">
        <span class="app__brand-name">乡遇安徽</span>
        <span class="app__brand-tag">在地图上遇见一个文旅项目</span>
      </RouterLink>

      <nav class="app__nav">
        <RouterLink class="app__nav-link" :to="{ name: 'home' }">
          <AppIcon name="map" :size="14" />地图
        </RouterLink>
      </nav>
    </header>

    <div class="app__content">
      <main class="app__main">
        <RouterView />
      </main>

      <footer v-if="!chromeHidden" class="app__footer">
        <span>
          64 条数据已核验 · 封面暂为占位 · 水系与河道 ©
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            >OpenStreetMap contributors</a
          >（ODbL） · 底图：DataV.GeoAtlas · 来源见 public/maps/README.md
        </span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 内容整体在页面背景之上 */
.app__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.app__header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  max-width: 1400px;
  padding: 1.15rem 1.25rem 0.9rem;
  margin: 0 auto;
  border-bottom: 1px solid var(--line);
}

.app__brand {
  display: flex;
  gap: 0.7rem;
  align-items: baseline;
  text-decoration: none;
}

.app__brand-name {
  font-family: var(--font-display);
  font-size: 1.22rem;
  font-weight: 600;
  letter-spacing: var(--tracking-brand);
  color: var(--ink);
}

.app__brand-tag {
  font-size: 0.78rem;
  color: var(--ink-soft);
}

/* 导航：图标与文字同一行对齐 */
.app__nav-link {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--ink-soft);
  text-decoration: none;
}

.app__nav-link:hover,
.app__nav-link.router-link-active {
  color: var(--accent);
}

.app__main {
  flex: 1;
  min-height: 0;
}

.app__footer {
  padding: 0.9rem 1.25rem 1.4rem;
  font-size: 0.74rem;
  color: var(--ink-soft);
  text-align: center;
}
</style>
