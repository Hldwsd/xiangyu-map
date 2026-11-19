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
  type MapRegionStyle,
  type MapScatterDatum,
} from '@/components/map/anhui-map-option'
import { groupOverlappingMarkers, type MarkerGroup } from '@/components/map/cluster-sites'
import { featureName, mergeMapLayers, type TaggedFeature } from '@/components/map/merge-map-layers'
import {
  ANHUI_MAP_NAME,
  loadAnhuiDistricts,
  loadAnhuiMap,
  loadAnhuiWater,
} from '@/services/anhui-map-loader'
import { readThemePalette, type ThemePalette } from '@/theme/theme'
import type { Site } from '@/types/site'

// 按需注册：只引入实际用到的图表与组件，控制首屏 JS 体积
echarts.use([ScatterChart, GeoComponent, TooltipComponent, CanvasRenderer])

/**
 * 两颗地标在屏幕上靠得比这个距离更近，就并成一颗带数字的点。
 * 略小于圆钉直径（36）：允许轻微重叠不合并，否则聚合会太激进。
 */
const CLUSTER_MIN_GAP = 34
/** 点聚合点时放大一档；到上限还没分开，就退化成选中簇里第一个项目 */
const CLUSTER_ZOOM_FACTOR = 2
/** 点簇时的缓动时长：太短会「跳」，太长会拖沓 */
const ZOOM_TWEEN_MS = 320

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
let refreshHandle: number | null = null
let zoomTween: number | null = null
/** 自己发起的缩放动画进行中：期间不重算聚合（地图在动，算出来也是中间态） */
let tweening = false
/** 合并底图里去掉市域之后的逐要素样式（区县界、水域） */
let layerRegions: MapRegionStyle[] = []
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

  animateGeoTo([lng, lat], Math.min(maxZoom, zoom * CLUSTER_ZOOM_FACTOR))
}

/**
 * 缓动到目标中心/缩放。
 *
 * 为什么自己写：`geo` 的 center/zoom 用 setOption 是一次性写入，没有过渡，
 * 点簇会「瞬移」。这里用 rAF 插值 300ms，视觉上顺滑；期间不重算聚合，
 * 动画结束再算一次，避免中途把簇算成中间态。
 */
function animateGeoTo(center: [number, number], zoom: number): void {
  const instance = chart.value
  if (instance === null) return

  const option = instance.getOption() as { geo?: Array<{ center?: number[]; zoom?: number }> }
  const fromCenter = (option.geo?.[0]?.center ?? [center[0], center[1]]) as [number, number]
  const fromZoom = option.geo?.[0]?.zoom ?? 1

  if (zoomTween !== null) window.cancelAnimationFrame(zoomTween)
  tweening = true
  const started = performance.now()
  const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

  const step = (now: number): void => {
    const progress = Math.min(1, (now - started) / ZOOM_TWEEN_MS)
    const k = easeOutCubic(progress)
    instance.setOption(
      {
        geo: {
          center: [
            fromCenter[0] + (center[0] - fromCenter[0]) * k,
            fromCenter[1] + (center[1] - fromCenter[1]) * k,
          ],
          zoom: fromZoom + (zoom - fromZoom) * k,
        },
      },
      { lazyUpdate: true },
    )
    if (progress < 1) {
      zoomTween = window.requestAnimationFrame(step)
      return
    }
    zoomTween = null
    tweening = false
    refreshMarkers()
  }

  zoomTween = window.requestAnimationFrame(step)
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
  if (groups.length === 0) return undefined

  // 按经纬度排序：数据下标稳定，缩放时不会因为顺序变化出现「两个点互换位置」
  return [...groups].sort((a, b) => (a.lng === b.lng ? a.lat - b.lat : a.lng - b.lng))
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
    if (tweening) return
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
  return buildAnhuiMapOption(props.sites, props.selectedId, undefined, themePalette(), layerRegions)
}

/**
 * 区县界与水域的逐要素样式。
 *
 * 三层数据合并成一张地图（见 merge-map-layers.ts），geo 里用 `regions` 按 name 覆盖样式：
 * 市域保留默认白底与市名，区县只画更浅的线，水域填浅灰。
 */
function buildLayerRegions(features: TaggedFeature[]): MapRegionStyle[] {
  const paletteNow = themePalette()
  const regions: MapRegionStyle[] = []

  for (const feature of features) {
    const layer = feature.properties.layer
    if (layer === 'city') continue
    const name = featureName(feature)
    if (name === null) continue

    regions.push(
      layer === 'water'
        ? {
            name,
            itemStyle: {
              areaColor: paletteNow.waterFill,
              borderColor: paletteNow.waterBorder,
              borderWidth: 0.6,
            },
            label: { show: false },
          }
        : {
            name,
            itemStyle: {
              areaColor: 'transparent',
              borderColor: paletteNow.districtLine,
              borderWidth: 0.5,
            },
            label: { show: false },
          },
    )
  }

  return regions
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
    // 区县界与水域是装饰层：失败就少一层纹理，不应该让整张地图报错
    const [city, districts, water] = await Promise.all([
      loadAnhuiMap(),
      loadAnhuiDistricts().catch(() => null),
      loadAnhuiWater().catch(() => null),
    ])
    if (disposed || container.value === null) return
    // 容器尺寸为 0 时不要 setOption：geo 投影拿不到绘图区，ECharts 会抛
    // "Cannot read properties of null (reading '0')"。等 ResizeObserver 给出真实尺寸再画。
    if (container.value.clientWidth === 0 || container.value.clientHeight === 0) return

    const merged = mergeMapLayers(city, districts, water)
    layerRegions = buildLayerRegions(merged.features)
    echarts.registerMap(ANHUI_MAP_NAME, merged as Parameters<typeof echarts.registerMap>[1])

    if (chart.value === null) {
      const instance = echarts.init(container.value, undefined, { renderer: 'canvas' })
      instance.on('click', handleChartClick)
      // 缩放/拖拽之后像素距离变了，聚合结果要跟着重算（双击不再重置视野）
      instance.on('georoam', scheduleRefresh)
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
  if (refreshHandle !== null) window.cancelAnimationFrame(refreshHandle)
  if (zoomTween !== null) window.cancelAnimationFrame(zoomTween)
  chart.value?.off('georoam', scheduleRefresh)
  chart.value?.dispose()
  chart.value = null
})

watch(
  () => [props.sites, props.selectedId] as const,
  () => {
    if (status.value !== 'ready' || chart.value === null) return
    chart.value.setOption(currentOption())
    refreshMarkers()
  },
)
</script>

<template>
  <div class="anhui-map">
    <div
      ref="container"
      class="anhui-map__canvas"
      role="img"
      aria-label="安徽省地图，按 16 个地级市划分，标注了各文旅项目的位置。键盘用户可用下方地标列表逐项浏览"
    />

    <p v-if="status === 'loading'" class="anhui-map__hint">
      <span class="anhui-map__spinner" aria-hidden="true" />
      底图加载中…
    </p>

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
  color: var(--ink-soft);
}

.anhui-map__hint--error {
  color: var(--danger);
}

/* 加载指示器：黑白界面里不用彩色 spinner，用一圈细弧 + 旋转 */
.anhui-map__spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 1.5px solid var(--line-strong);
  border-top-color: var(--ink);
  border-radius: 50%;
  animation: anhui-spin 0.8s linear infinite;
}

@keyframes anhui-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .anhui-map__spinner {
    animation: none;
    border-top-color: var(--line-strong);
  }
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
  border: 1px solid var(--line);
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
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: var(--radius-xs);
}

.anhui-map__a11y-item:focus-visible {
  color: var(--accent-ink);
  background: var(--accent);
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
</style>
