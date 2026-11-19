<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/icons/AppIcon.vue'
import { ALL_CITIES, type CityFilter } from '@/stores/sites'
import { ANHUI_CITIES, type AnhuiCity } from '@/types/site'

const city = defineModel<CityFilter>('city', { required: true })

const props = defineProps<{
  counts: Record<AnhuiCity, number>
}>()

/**
 * 16 个市全部列出，但还没有项目的市置灰。
 * 不隐藏它们：一是位置稳定（数据增长时选项不会跳），二是「这里还没内容」本身是有效信息。
 */
const options = computed(() =>
  ANHUI_CITIES.map((name) => ({
    name,
    count: props.counts[name] ?? 0,
    disabled: (props.counts[name] ?? 0) === 0,
  })),
)
</script>

<template>
  <label class="city">
    <span class="city__label"><AppIcon name="pin" :size="13" />城市</span>
    <select v-model="city" class="city__select">
      <option :value="ALL_CITIES">全部城市</option>
      <option
        v-for="option in options"
        :key="option.name"
        :value="option.name"
        :disabled="option.disabled"
      >
        {{ option.name }}（{{ option.count }}）
      </option>
    </select>
  </label>
</template>

<style scoped>
.city {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.city__label {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  font-size: 0.78rem;
  color: var(--ink-soft);
}

.city__select {
  padding: 0.38rem 0.6rem;
  font: inherit;
  font-size: 0.82rem;
  color: var(--ink);
  cursor: pointer;
  background: rgb(var(--surface-rgb) / 92%);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
}

.city__select:hover {
  border-color: var(--accent);
}

.city__select:focus-visible {
  border-color: var(--accent);
  outline: 2px solid transparent;
}
</style>
