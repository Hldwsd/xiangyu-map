<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts/core'
import { ScatterChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsType } from 'echarts/core'

import {
  buildAnhuiMapOption,
  toScatterData,
  type ClusterScatterDatum,
  type MapScatterDatum,
} from '@/components/map/anhui-map-option'
import { groupOverlappingMarkers, type MarkerGroup } from '@/components/map/cluster-sites'
import { readThemePalette, type ThemePalette } from '@/theme/theme'
import { ANHUI_MAP_NAME, loadAnhuiMap } from '@/services/anhui-map-loader'
import type { Site } from '@/types/site'

// 按需注册：只引入实际用到的图表与组件，控制首屏 JS 体积
echarts.use([ScatterChart, GeoComponent, TooltipComponent, CanvasRenderer])

/**
 * 两颗地标在屏幕上靠得比这个距离更近，就并成一颗带数字的点。
 * 取值略大于基础地标直径（13px）：再小就会把「视觉上明显分开」的两颗也叠起来。
 */
const CLUSTER_MIN_GAP = 15
/** 点聚合点时放大一档；到上限还没分开，就退化成选中簇里第一个项目 */
const CLUSTER_ZOOM_FACTOR = 2

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
/** 当前画在图上的一批点（单点或簇），键盘高亮要按它找下标 */
let currentData: MapScatterDatum[] = []
/** 缩放动画的尾巴上补算几次：ECharts 的投影矩阵在渲染帧里才更新 */
let settleTimers: number[] = []
let refreshHandle: number | null = null
/** 当前主题的配色（分类色 + 地图配色）。主题只在加载时确定，读一次就够 */
let palette: ThemePalette | null = null

function themePalette(): ThemePalette {
  palette ??= readThemePalette()
  return palette
}

function handleChartClick(params: unknown): void {
  const payload = params as {
    seriesType?: string
    data?: Partial<ClusterScatterDatum> & { siteId?: string }
  }
  if (payload.seriesType !== 'scatter') return

  const clusterIds = payload.data?.clusterIds
  if (Array.isArray(clusterIds) && clusterIds.length > 1) {
    zoomIntoCluster(clusterIds, payload.data?.value)
    return
  }

  const siteId = payload.data?.siteId
  if (typeof siteId === 'string') {
    emit('select', siteId)
  }
}

/**
 * 点簇就放大一档。放大到 `scaleLimit.max` 还分不开时，
 * 说明这几个项目在同一处（同一景区里的多个项目），直接选中第一个：
 * 让用户卡在「点了没反应」比选错一个更糟。
 */
function zoomIntoCluster(clusterIds: string[], value: unknown): void {
  const instance = chart.value
  if (instance === null || !Array.isArray(value)) return

  const [lng, lat] = value as [number, number]
  const option = instance.getOption() as {
    geo?: Array<{ zoom?: number; scaleLimit?: { max?: number } }>
  }
  const zoom = option.geo?.[0]?.zoom ?? 1
  const maxZoom = option.geo?.[0]?.scaleLimit?.max ?? 8

  if (zoom >= maxZoom - 0.05) {
    const firstId = clusterIds[0]
    if (firstId !== undefined) emit('select', firstId)
    return
  }

  instance.setOption({
    geo: { center: [lng, lat], zoom: Math.min(maxZoom, zoom * CLUSTER_ZOOM_FACTOR) },
  })
  // `setOption` 之后 geo 的投影矩阵要等渲染帧才更新，此刻 convertToPixel 还是旧值。
  // 缩放在 ECharts 里是带缓动的动画，所以沿动画尾巴补算几次；每次都很轻（22 个点）。
  scheduleRefresh()
  scheduleSettledRefresh()
}

function scheduleSettledRefresh(): void {
  for (const delay of [90, 260, 520]) {
    settleTimers.push(
      window.setTimeout(() => {
        refreshMarkers()
      }, delay),
    )
  }
}

/** 当前视野下的像素坐标 → 分组。拿不到投影时返回 undefined，退回「每个项目一颗」 */
function computeGroups(instance: EChartsType): MarkerGroup[] | undefined {
  const pixels = new Map<string, readonly [number, number] | null>()

  for (const site of props.sites) {
    const point = instance.convertToPixel({ geoIndex: 0 }, [site.location.lng, site.location.lat])
    const usable =
      Array.isArray(point) &&
      Number.isFinite(point[0] as number) &&
      Number.isFinite(point[1] as number)
    pixels.set(site.id, usable ? ([point[0] as number, point[1] as number] as const) : null)
  }

  const groups = groupOverlappingMarkers(
    props.sites,
    (site) => pixels.get(site.id) ?? null,
    CLUSTER_MIN_GAP,
  )
  return groups.length === 0 ? undefined : groups
}

/**
 * 重画地标层。只替换 `series.data`（按 id 合并），不动 geo：
 * 用 notMerge 重建会把用户的缩放和拖拽状态一起清掉。
 */
function refreshMarkers(): void {
  const instance = chart.value
  if (instance === null || status.value !== 'ready') return

  const groups = computeGroups(instance)
  currentData = toScatterData(props.sites, props.selectedId, groups, themePalette())
  instance.setOption({ series: [{ id: 'sites', data: currentData }] })
}

function scheduleRefresh(): void {
  if (refreshHandle !== null) return
  refreshHandle = window.requestAnimationFrame(() => {
    refreshHandle = null
    refreshMarkers()
  })
}

/** 按项目 id 找它在当前这批点里的下标；被并进簇时返回簇的下标 */
function datumIndexOfSite(siteId: string): number {
  return currentData.findIndex((datum) =>
    'clusterIds' in datum ? datum.clusterIds.includes(siteId) : datum.siteId === siteId,
  )
}

function currentOption(): ReturnType<typeof buildAnhuiMapOption> {
  return buildAnhuiMapOption(props.sites, props.selectedId, undefined, themePalette())
}

/**
 * 双击还原视野。geo 的 roam 状态没有公开的「重置」动作，
 * 用 notMerge 重建一次 option 是最直接可靠的办法（默认中心/缩放来自底图范围）。
 */
function resetRoam(): void {
  if (chart.value === null || container.value === null) return
  if (container.value.clientWidth === 0 || container.value.clientHeight === 0) return
  chart.value.setOption(currentOption(), { notMerge: true })
  currentData = toScatterData(props.sites, props.selectedId, undefined, themePalette())
  scheduleRefresh()
}

/**
 * 键盘操作的地标列表：canvas 里的地标对读屏和 Tab 不可达，
 * 所以另渲染一份等价的按钮列表，聚焦时在地图上高亮对应地标，Enter 打开详情。
 *
 * 注意不能直接用列表的下标做 `dataIndex`：图上画的是「点 + 簇」，
 * 顺序与列表不同，被并进簇的项目也没有自己的点。所以先按 id 反查一次。
 */
function focusMarker(index: number): void {
  const instance = chart.value
  const site = props.sites[index]
  if (instance === null || site === undefined) return

  const dataIndex = datumIndexOfSite(site.id)
  if (dataIndex < 0) return
  instance.dispatchAction({ type: 'highlight', seriesId: 'sites', dataIndex })
  instance.dispatchAction({ type: 'showTip', seriesId: 'sites', dataIndex })
}

function blurMarker(index: number): void {
  const instance = chart.value
  const site = props.sites[index]
  if (instance === null || site === undefined) return

  const dataIndex = datumIndexOfSite(site.id)
  if (dataIndex < 0) return
  instance.dispatchAction({ type: 'downplay', seriesId: 'sites', dataIndex })
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
      // 缩放/拖拽之后像素距离变了，聚合结果要跟着重算
      instance.on('georoam', scheduleRefresh)
      // zr 级别的事件才拿得到双击，ECharts 的 chart.on('dblclick') 只对图形元素生效
      instance.getZr().on('dblclick', resetRoam)
      chart.value = instance
    }

    chart.value.setOption(currentOption(), { notMerge: true })
    chart.value.resize()
    status.value = 'ready'
    currentData = toScatterData(props.sites, props.selectedId, undefined, themePalette())
    refreshMarkers()
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
    if (sized) {
      chart.value.resize()
      // 画布尺寸变了，同样的经纬度会落到不同的像素位置，聚合要重算
      scheduleRefresh()
    }
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
  if (refreshHandle !== null) {
    window.cancelAnimationFrame(refreshHandle)
    refreshHandle = null
  }
  for (const timer of settleTimers) window.clearTimeout(timer)
  settleTimers = []
  chart.value?.off('georoam', scheduleRefresh)
  chart.value?.getZr().off('dblclick', resetRoam)
  chart.value?.dispose()
  chart.value = null
})

watch(
  () => [props.sites, props.selectedId] as const,
  () => {
    if (status.value === 'ready' && chart.value !== null) {
      chart.value.setOption(currentOption())
      refreshMarkers()
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
  border-radius: var(--radius-pill);
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
  background: rgb(var(--surface-rgb) / 96%);
  border: 1px solid var(--line, #ddd2bd);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
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
  border-radius: var(--radius-xs);
}

.anhui-map__a11y-item:focus-visible {
  color: var(--accent-ink);
  background: var(--accent, #b45309);
  outline: 2px solid var(--accent, #b45309);
  outline-offset: 1px;
}
</style>
