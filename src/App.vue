<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="app__header">
      <RouterLink class="app__brand" :to="{ name: 'home' }">
        <span class="app__brand-name">乡遇安徽</span>
        <span class="app__brand-tag">在地图上遇见一个文旅项目</span>
      </RouterLink>

      <nav class="app__nav">
        <RouterLink class="app__nav-link" :to="{ name: 'home' }">地图</RouterLink>
      </nav>
    </header>

    <main class="app__main">
      <RouterView />
    </main>

    <footer class="app__footer">
      <span>示例数据，仅供演示 · 底图数据来源见 public/maps/README.md</span>
    </footer>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
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

.app__nav {
  display: flex;
  gap: 1rem;
}

.app__nav-link {
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
