<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppIcon from '@/components/icons/AppIcon.vue'
import { useFocusTrap } from '@/composables/use-focus-trap'

/**
 * 侧边抽屉：窄屏用来装左侧「分类」与右侧「城市索引」。
 *
 * 和菜单抽屉一样锁焦点、Esc 关闭；区别是从左右边缘滑出，宽度按视口收敛。
 */
const props = defineProps<{ open: boolean; side: 'left' | 'right'; title: string }>()
const emit = defineEmits<{ close: [] }>()

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
  <div v-if="open" class="edge" :class="`edge--${side}`">
    <button type="button" class="edge__backdrop" aria-label="关闭" @click="emit('close')" />

    <aside
      ref="panel"
      class="edge__panel"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      tabindex="-1"
    >
      <header class="edge__head">
        <h2>{{ title }}</h2>
        <button type="button" class="edge__close" aria-label="关闭" @click="emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </header>
      <div class="edge__body">
        <slot />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.edge {
  position: absolute;
  inset: 0;
  z-index: 32;
}

.edge__backdrop {
  position: absolute;
  inset: 0;
  cursor: pointer;
  background: rgb(var(--overlay-rgb) / 24%);
  border: 0;
  animation: fade-in 0.16s ease;
}

.edge__panel {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: min(20rem, 86vw);
  background: var(--surface);
  animation: slide-in 0.2s ease;
}

.edge--left .edge__panel {
  left: 0;
  border-right: 1px solid var(--line);
  box-shadow: var(--shadow-panel);
}

.edge--right .edge__panel {
  right: 0;
  border-left: 1px solid var(--line);
  box-shadow: var(--shadow-panel);
}

.edge__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 1rem) 1.1rem 0.9rem;
  border-bottom: 1px solid var(--rule);
}

.edge__head h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--ink);
}

.edge__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  color: var(--ink);
  cursor: pointer;
  background: var(--surface-muted);
  border: 0;
  border-radius: 50%;
}

.edge__body {
  flex: 1;
  padding: 0.9rem 1.1rem calc(env(safe-area-inset-bottom, 0px) + 1.2rem);
  overflow-y: auto;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes slide-in {
  from {
    opacity: 0;
  }
}

.edge--left .edge__panel {
  animation-name: slide-in-left;
}

.edge--right .edge__panel {
  animation-name: slide-in-right;
}

@keyframes slide-in-left {
  from {
    transform: translateX(-10px);
    opacity: 0;
  }
}

@keyframes slide-in-right {
  from {
    transform: translateX(10px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .edge__backdrop,
  .edge__panel {
    animation: none;
  }
}
</style>
