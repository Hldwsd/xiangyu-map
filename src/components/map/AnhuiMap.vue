<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsType } from 'echarts/core'

import { buildAnhuiMapOption } from '@/components/map/anhui-map-option'
import { ANHUI_MAP_NAME, loadAnhuiMap } from '@/services/anhui-map-loader'
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

function currentOption(): ReturnType<typeof buildAnhuiMapOption> {
  return buildAnhuiMapOption(props.sites, props.selectedId)
}

/**
 * 双击还原视野。geo 的 roam 状态没有公开的「重置」动作，
 * 用 notMerge 重建一次 option 是最直接可靠的办法（默认中心/缩放来自底图范围）。
 */
function resetRoam(): void {
  if (chart.value === null || container.value === null) return
  if (container.value.clientWidth === 0 || container.value.clientHeight === 0) return
  chart.value.setOption(currentOption(), { notMerge: true })
}

/**
 * 键盘操作的地标列表：canvas 里的地标对读屏和 Tab 不可达，
 * 所以另渲染一份等价的按钮列表，聚焦时在地图上高亮对应地标，Enter 打开详情。
 */
function focusMarker(index: number): void {
  const instance = chart.value
  if (instance === null) return
  instance.dispatchAction({ type: 'highlight', seriesId: 'sites', dataIndex: index })
  instance.dispatchAction({ type: 'showTip', seriesId: 'sites', dataIndex: index })
}

function blurMarker(index: number): void {
  const instance = chart.value
  if (instance === null) return
  instance.dispatchAction({ type: 'downplay', seriesId: 'sites', dataIndex: index })
  instance.dispatchAction({ type: 'hideTip' })
}

async function render(): Promise<void> {
  status.value = 'loading'
  errorMessage.value = ''

  try {
    const geoJson = await loadAnhuiMap()
    if (disposed || container.value === null) return
    // 容器尺寸为 0 时不要 setOption：geo 投影拿不到绘图区，ECharts 会抛
    // "Cannot read properties of null (reading '0')"。等 ResizeObserver 给出真实尺寸再画。
    if (container.value.clientWidth === 0 || container.value.clientHeight === 0) return

    echarts.registerMap(ANHUI_MAP_NAME, geoJson as Parameters<typeof echarts.registerMap>[1])

    if (chart.value === null) {
      const instance = echarts.init(container.value, undefined, { renderer: 'canvas' })
      instance.on('click', handleChartClick)
      // zr 级别的事件才拿得到双击，ECharts 的 chart.on('dblclick') 只对图形元素生效
      instance.getZr().on('dblclick', resetRoam)
      chart.value = instance
    }

    chart.value.setOption(currentOption(), { notMerge: true })
    chart.value.resize()
    status.value = 'ready'
  } catch (error: unknown) {
    status.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '底图加载失败'
  }
}

function handleResize(): void {
  const el = container.value
  if (el === null) return
  const sized = el.clientWidth > 0 && el.clientHeight > 0
  if (chart.value !== null) {
    if (sized) chart.value.resize()
    return
  }
  if (sized && status.value !== 'error') void render()
}

onMounted(() => {
  if (container.value === null) return
  resizeObserver = new ResizeObserver(handleResize)
  resizeObserver.observe(container.value)
  handleResize()
})

onBeforeUnmount(() => {
  disposed = true
  resizeObserver?.disconnect()
  resizeObserver = null
  chart.value?.getZr().off('dblclick', resetRoam)
  chart.value?.dispose()
  chart.value = null
})

watch(
  () => [props.sites, props.selectedId] as const,
  () => {
    if (status.value === 'ready' && chart.value !== null) {
      chart.value.setOption(currentOption())
    }
  },
)
</script>

<template>
  <div class="anhui-map">
    <div
      ref="container"
      class="anhui-map__canvas"
      role="img"
      aria-label="安徽省地图，按 16 个地级市划分，标注了各文旅项目的位置；双击可还原视野。键盘用户可用下方地标列表逐项浏览"
    />

    <p v-if="status === 'loading'" class="anhui-map__hint">底图加载中…</p>

    <div v-else-if="status === 'error'" class="anhui-map__hint anhui-map__hint--error">
      <span>{{ errorMessage }}</span>
      <button type="button" class="anhui-map__retry" @click="render">重试</button>
    </div>

    <ul v-if="status === 'ready'" class="anhui-map__a11y" aria-label="地图上的文旅项目">
      <li v-for="(site, index) in sites" :key="site.id">
        <button
          type="button"
          class="anhui-map__a11y-item"
          @focus="focusMarker(index)"
          @blur="blurMarker(index)"
          @click="emit('select', site.id)"
        >
          {{ site.name }}（{{ site.category }} · {{ site.city }}）
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.anhui-map {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
}

.anhui-map__canvas {
  width: 100%;
  height: 100%;
}

.anhui-map__hint {
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

.anhui-map__hint--error {
  color: var(--danger, #b3261e);
}

.anhui-map__retry {
  padding: 0.25rem 0.7rem;
  font: inherit;
  color: inherit;
  cursor: pointer;
  background: transparent;
  border: 1px solid currentcolor;
  border-radius: 999px;
}

/*
 * 平时不可见（不占位、不进读屏的视觉流），但 Tab 能进来：
 * 一旦有焦点就整块显形，否则键盘用户看不到自己在选哪个地标。
 */
.anhui-map__a11y {
  position: absolute;
  top: 0.6rem;
  left: 0.6rem;
  z-index: 3;
  max-width: min(18rem, 70%);
  max-height: 70%;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
  background: rgb(255 253 248 / 96%);
  border: 1px solid var(--line, #ddd2bd);
  border-radius: 10px;
  box-shadow: 0 6px 18px rgb(42 38 32 / 12%);
  clip-path: inset(50%);
}

.anhui-map__a11y:focus-within {
  padding: 0.35rem;
  clip-path: none;
}

.anhui-map__a11y-item {
  display: block;
  width: 100%;
  padding: 0.28rem 0.45rem;
  font: inherit;
  font-size: 0.78rem;
  color: var(--ink, #2a2620);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.anhui-map__a11y-item:focus-visible {
  color: #fff;
  background: var(--accent, #b45309);
  outline: 2px solid var(--accent, #b45309);
  outline-offset: 1px;
}
</style>
