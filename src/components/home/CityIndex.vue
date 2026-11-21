<script setup lang="ts">
import { ALL_CITIES, useSitesStore } from '@/stores/sites'
import { ANHUI_CITIES, type AnhuiCity } from '@/types/site'

const store = useSitesStore()

function toggle(city: AnhuiCity): void {
  store.setCity(store.city === city ? ALL_CITIES : city)
}
</script>

<template>
  <section class="city-index" aria-label="城市索引">
    <div class="city-index__head">
      <b>城市索引</b>
      <span>16 CITIES</span>
    </div>
    <div class="city-index__grid">
      <button
        v-for="city in ANHUI_CITIES"
        :key="city"
        type="button"
        class="city"
        :class="{ 'city--on': store.city === city }"
        :aria-pressed="store.city === city"
        :disabled="store.cityCounts[city] === 0"
        @click="toggle(city)"
      >
        <span>{{ city.replace('市', '') }}</span>
        <span class="city__n">{{ store.cityCounts[city] }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.city-index {
  width: 100%;
}

.city-index__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--line-strong);
}

.city-index__head b {
  font-family: var(--font-serif);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.18em;
}

.city-index__head span {
  font-family: var(--font-display);
  font-size: 0.6rem;
  color: var(--ink-soft);
  letter-spacing: 0.18em;
}

.city-index__grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  column-gap: 0.6rem;
}

.city {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0.16rem 0;
  font: inherit;
  font-size: 0.66rem;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
}

.city:hover:not(:disabled) {
  color: var(--ink);
}

.city--on {
  color: var(--ink);
  box-shadow: inset 0 -1px 0 var(--ink);
}

.city:disabled {
  color: var(--line-strong);
  cursor: default;
}

.city__n {
  margin-left: auto;
  font-family: var(--font-display);
  font-size: 0.64rem;
  color: inherit;
  font-variant-numeric: tabular-nums;
}
</style>
