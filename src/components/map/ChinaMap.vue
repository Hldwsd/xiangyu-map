<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsType } from 'echarts/core'

import { buildChinaMapOption } from '@/components/map/china-map-option'
import { CHINA_MAP_NAME, loadChinaMap } from '@/services/china-map-loader'
import type { Site } from '@/types/site'

// 按需注册：只引入实际用到的图表与组件，控制首屏 JS 体积
echarts.use([ScatterChart, GeoComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{
  sites: Site[]
  selectedId: string | null
}>()

const emit = defineEmits<{ select: [id: string] }>()

const container = ref<HTMLDivElement | null>(null)
const chart = shallowRef<EChartsType | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')

let resizeObserver: ResizeObserver | null = null
let disposed = false

function handleChartClick(params: unknown): void {
  const payload = params as { seriesType?: string; data?: { siteId?: string } }
  const siteId = payload.data?.siteId
  if (payload.seriesType === 'scatter' && typeof siteId === 'string') {
    emit('select', siteId)
  }
}

async function render(): Promise<void> {
  status.value = 'loading'
  errorMessage.value = ''

  try {
    const geoJson = await loadChinaMap()
    if (disposed || container.value === null) return

    echarts.registerMap(CHINA_MAP_NAME, geoJson as Parameters<typeof echarts.registerMap>[1])

    if (chart.value === null) {
      const instance = echarts.init(container.value, undefined, { renderer: 'canvas' })
      instance.on('click', handleChartClick)
      chart.value = instance
    }

    chart.value.setOption(buildChinaMapOption(props.sites, props.selectedId))
    chart.value.resize()
    status.value = 'ready'
  } catch (error: unknown) {
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '底图加载失败'
  }
}

onMounted(() => {
  if (container.value === null) return
  resizeObserver = new ResizeObserver(() => chart.value?.resize())
  resizeObserver.observe(container.value)
  void render()
})

onBeforeUnmount(() => {
  disposed = true
  resizeObserver?.disconnect()
  resizeObserver = null
  chart.value?.dispose()
  chart.value = null
})

watch(
  () => [props.sites, props.selectedId] as const,
  () => {
    if (status.value === 'ready' && chart.value !== null) {
      chart.value.setOption(buildChinaMapOption(props.sites, props.selectedId))
    }
  },
)
</script>

<template>
  <div class="china-map">
    <div
      ref="container"
      class="china-map__canvas"
      role="img"
      aria-label="中国地图，标注了各文旅项目的位置"
    />

    <p v-if="status === 'loading'" class="china-map__hint">底图加载中…</p>

    <div v-else-if="status === 'error'" class="china-map__hint china-map__hint--error">
      <span>{{ errorMessage }}</span>
      <button type="button" class="china-map__retry" @click="render">重试</button>
    </div>
  </div>
</template>

<style scoped>
.china-map {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
}

.china-map__canvas {
  width: 100%;
  height: 100%;
}

.china-map__hint {
  position: absolute;
  inset: auto 0 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-soft, #6b6154);
}

.china-map__hint--error {
  color: var(--danger, #b3261e);
}

.china-map__retry {
  padding: 0.25rem 0.7rem;
  font: inherit;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 1px solid currentcolor;
  border-radius: 999px;
}
</style>
