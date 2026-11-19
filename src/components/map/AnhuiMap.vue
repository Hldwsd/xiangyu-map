<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LinesChart, ScatterChart } from 'echarts/charts'
import { GeoComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsType } from 'echarts/core'

import AppIcon from '@/components/icons/AppIcon.vue'
import {
  buildAnhuiMapOption,
  toScatterData,
  type ClusterScatterDatum,
  type MapRegionStyle,
  type MapScatterDatum,
  type RiverLine,
} from '@/components/map/anhui-map-option'
import { groupOverlappingMarkers, type MarkerGroup } from '@/components/map/cluster-sites'
import { featureName, mergeMapLayers, type TaggedFeature } from '@/components/map/merge-map-layers'
import {
  ANHUI_MAP_NAME,
  loadAnhuiDistricts,
  loadAnhuiMap,
  loadAnhuiRivers,
  loadAnhuiWater,
} from '@/services/anhui-map-loader'
import { readThemePalette, type ThemePalette } from '@/theme/theme'
import type { Site } from '@/types/site'

// 按需注册：只引入实际用到的图表与组件，控制首屏 JS 体积
echarts.use([ScatterChart, LinesChart, GeoComponent, TooltipComponent, CanvasRenderer])

/**
 * 两颗地标在屏幕上靠得比这个距离更近，就并成一颗带数字的点。
 * 略小于圆钉直径（36）：允许轻微重叠不合并，否则聚合会太激进。
 */
const CLUSTER_MIN_GAP = 34
/** 点聚合点时放大一档；到上限还没分开，就退化成选中簇里第一个项目 */
const CLUSTER_ZOOM_FACTOR = 2
/** 点簇时的缓动时长：太短会「跳」，太长会拖沓 */
const CLUSTER_TWEEN_MS = 320
/** 滚轮/缩放条的单步缓动：要跟手，所以比点簇短 */
const WHEEL_TWEEN_MS = 140
const ZOOM_MIN = 0.9
const ZOOM_MAX = 8
/** 越过这个倍数后，可交互的从「市域」切成「区县」，避免两层同时高亮 */
const LAYER_SWITCH_ZOOM = 1.9
/** 没有拖拽、没有漫游时的兜底中心（安徽省几何中心附近） */
const FALLBACK_CENTER: [number, number] = [117.3, 31.8]
/** 拖动时允许的中心范围：省域外接框略收一点，避免把地图拖出视野只剩空白 */
const CENTER_MIN: [number, number] = [115.4, 30.2]
const CENTER_MAX: [number, number] = [119.1, 33.9]

const props = defineProps<{
  sites: Site[]
  selectedId: string | null
}>()

const emit = defineEmits<{ select: [id: string] }>()

const container = ref<HTMLDivElement | null>(null)
const chart = shallowRef<EChartsType | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
/** 给缩放条用的当前倍数 */
const zoomLevel = ref(1)

let resizeObserver: ResizeObserver | null = null
let disposed = false
/** 当前画在图上的一批点（单点或簇），键盘高亮要按它找下标 */
let currentData: MapScatterDatum[] = []
let refreshHandle: number | null = null
let zoomTween: number | null = null
/** 双指缩放的起点距离与起点 zoom；null 表示当前没有手势 */
let pinchStart: { distance: number; zoom: number } | null = null
/** 自己发起的缩放动画进行中：期间不重算聚合（地图在动，算出来也是中间态） */
let tweening = false
/** 合并底图的要素列表，用来按缩放级别重建 regions（市 / 区县） */
let mapFeatures: TaggedFeature[] = []
/** 合并底图里去掉市域之后的逐要素样式（区县界、水域） */
let layerRegions: MapRegionStyle[] = []
/** 长江/淮河的折线段，画成 lines 系列 */
let riverLines: RiverLine[] = []
/** 当前可交互的层级：低倍只让市域可选中，高倍只让区县可选中 */
let layerMode: 'city' | 'district' = 'city'
/** 当前主题的配色（分类色 + 地图配色）。主题只在加载时确定，读一次就够 */
let palette: ThemePalette | null = null

function themePalette(): ThemePalette {
  palette ??= readThemePalette()
  return palette
}

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value))
}

function geoState(): { center: [number, number]; zoom: number } {
  const instance = chart.value
  if (instance === null) return { center: FALLBACK_CENTER, zoom: 1 }
  const option = instance.getOption() as {
    geo?: Array<{ center?: number[]; zoom?: number }>
  }
  const center = option.geo?.[0]?.center
  return {
    center:
      Array.isArray(center) && center.length === 2
        ? ([center[0] as number, center[1] as number] as [number, number])
        : FALLBACK_CENTER,
    zoom: option.geo?.[0]?.zoom ?? 1,
  }
}

function clampCenter(center: [number, number]): [number, number] {
  return [
    Math.min(CENTER_MAX[0], Math.max(CENTER_MIN[0], center[0])),
    Math.min(CENTER_MAX[1], Math.max(CENTER_MIN[1], center[1])),
  ]
}

/**
 * 拖动结束/过程中夹住中心。
 *
 * `roam: 'move'` 交给 ECharts 做平移手感（惯性、指针捕获都是现成的），
 * 但默认可以把地图拖到视野外只剩空白；这里在 georoam 里做范围夹取。
 */
function handleGeoRoam(): void {
  const instance = chart.value
  if (instance === null || tweening) return

  const { center } = geoState()
  const [clampedX, clampedY] = clampCenter(center)
  if (clampedX !== center[0] || clampedY !== center[1]) {
    instance.setOption({ geo: { center: [clampedX, clampedY] } })
  }
  scheduleRefresh()
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
  const { zoom } = geoState()

  if (zoom >= ZOOM_MAX - 0.05) {
    const firstId = clusterIds[0]
    if (firstId !== undefined) emit('select', firstId)
    return
  }

  animateGeoTo([lng, lat], clampZoom(zoom * CLUSTER_ZOOM_FACTOR), CLUSTER_TWEEN_MS)
}

/**
 * 缓动到目标中心/缩放。
 *
 * 为什么自己写：`geo` 的 center/zoom 用 setOption 是一次性写入，没有过渡，
 * 滚轮会是「一格一跳」、点簇会「瞬移」。这里用 rAF 插值，滚轮 140ms、点簇 320ms；
 * 动画期间不重算聚合，结束再算一次，避免中途把簇算成中间态。
 */
function animateGeoTo(center: [number, number], zoom: number, duration = WHEEL_TWEEN_MS): void {
  const instance = chart.value
  if (instance === null) return

  const from = geoState()
  const target = clampCenter(center)
  if (zoomTween !== null) window.cancelAnimationFrame(zoomTween)
  tweening = true

  const started = performance.now()
  const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

  const step = (now: number): void => {
    const progress = duration === 0 ? 1 : Math.min(1, (now - started) / duration)
    const k = easeOutCubic(progress)
    const nextZoom = from.zoom + (zoom - from.zoom) * k
    instance.setOption(
      {
        geo: {
          center: [
            from.center[0] + (target[0] - from.center[0]) * k,
            from.center[1] + (target[1] - from.center[1]) * k,
          ],
          zoom: nextZoom,
        },
      },
      { lazyUpdate: true },
    )
    zoomLevel.value = Number(nextZoom.toFixed(2))
    if (progress < 1) {
      zoomTween = window.requestAnimationFrame(step)
      return
    }
    zoomTween = null
    tweening = false
    syncLayerMode()
    refreshMarkers()
  }

  zoomTween = window.requestAnimationFrame(step)
}

/** 按缩放级别切换可交互层级：低倍市域、高倍区县 */
function syncLayerMode(): void {
  const next: 'city' | 'district' = zoomLevel.value >= LAYER_SWITCH_ZOOM ? 'district' : 'city'
  if (next === layerMode) return
  layerMode = next
  layerRegions = buildLayerRegions(mapFeatures, layerMode)
  chart.value?.setOption({ geo: { regions: layerRegions } })
}

/**
 * 滚轮缩放：以鼠标位置为锚点。
 *
 * 锚定公式：放大 k 倍时，要让光标下的地理点保持不动，中心要按 c' = g + (c − g)/k 移动
 * （g 是光标下的经纬度，c 是当前中心）。缩放本身交给 animateGeoTo 做缓动，所以是一次连续变化。
 */
function handleWheel(event: WheelEvent): void {
  if (chart.value === null || container.value === null) return
  event.preventDefault()

  const rect = container.value.getBoundingClientRect()
  const point: [number, number] = [event.clientX - rect.left, event.clientY - rect.top]
  const anchor = chart.value.convertFromPixel({ geoIndex: 0 }, point)
  const { center, zoom } = geoState()

  const factor = Math.exp(-event.deltaY * 0.0015)
  const targetZoom = clampZoom(zoom * factor)
  if (Math.abs(targetZoom - zoom) < 0.001) return

  const k = targetZoom / zoom
  const geoAnchor: [number, number] =
    Array.isArray(anchor) && anchor.length === 2
      ? ([anchor[0] as number, anchor[1] as number] as [number, number])
      : center

  animateGeoTo(
    [geoAnchor[0] + (center[0] - geoAnchor[0]) / k, geoAnchor[1] + (center[1] - geoAnchor[1]) / k],
    targetZoom,
  )
}

/** 缩放条 / 加减按钮：锚定在画布中心 */
function zoomTo(target: number): void {
  const { center, zoom } = geoState()
  const next = clampZoom(target)
  if (Math.abs(next - zoom) < 0.001) return
  animateGeoTo(center, next)
}

function zoomBy(factor: number): void {
  zoomTo(geoState().zoom * factor)
}

function onZoomInput(event: Event): void {
  zoomTo(Number((event.target as HTMLInputElement).value))
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
  return buildAnhuiMapOption(
    props.sites,
    props.selectedId,
    undefined,
    themePalette(),
    layerRegions,
    riverLines,
  )
}

/** 把河道 GeoJSON 转成 lines 系列需要的折线数据 */
function buildRiverLines(collection: { features: unknown[] } | null): RiverLine[] {
  if (collection === null) return []
  const lines: RiverLine[] = []

  for (const feature of collection.features) {
    const candidate = feature as {
      properties?: { name?: unknown; width?: unknown }
      geometry?: { type?: string; coordinates?: unknown }
    }
    const name = candidate.properties?.name
    const coordinates = candidate.geometry?.coordinates
    if (typeof name !== 'string' || candidate.geometry?.type !== 'LineString') continue
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue

    const coords: [number, number][] = []
    for (const point of coordinates) {
      if (!Array.isArray(point) || point.length !== 2) continue
      const [lng, lat] = point as [unknown, unknown]
      if (typeof lng !== 'number' || typeof lat !== 'number') continue
      coords.push([lng, lat])
    }
    if (coords.length < 2) continue

    const width = typeof candidate.properties?.width === 'number' ? candidate.properties.width : 1.6
    lines.push({ name, width, coords })
  }

  return lines
}

/**
 * 逐要素样式。
 *
 * 三个层级同时画在一张图里，如果都响应鼠标，悬停时市域与区县会一起高亮。
 * 所以按缩放级别只让一层可交互：低倍看市、高倍看区县（syncLayerMode 负责切换）。
 */
function buildLayerRegions(
  features: TaggedFeature[],
  interactive: 'city' | 'district',
): MapRegionStyle[] {
  const paletteNow = themePalette()
  const regions: MapRegionStyle[] = []

  for (const feature of features) {
    const name = featureName(feature)
    if (name === null) continue
    const layer = feature.properties.layer

    if (layer === 'city') {
      regions.push({
        name,
        itemStyle: {
          areaColor: paletteNow.mapArea,
          borderColor: paletteNow.mapBorder,
          borderWidth: 0.9,
        },
        emphasis: { itemStyle: { areaColor: paletteNow.mapAreaHover } },
        silent: interactive !== 'city',
        label: { show: true },
      })
      continue
    }

    if (layer === 'water') {
      regions.push({
        name,
        itemStyle: {
          areaColor: paletteNow.waterFill,
          borderColor: paletteNow.waterBorder,
          borderWidth: 0.6,
        },
        silent: true,
        label: { show: false },
      })
      continue
    }

    regions.push({
      name,
      itemStyle: {
        areaColor: 'transparent',
        borderColor: paletteNow.districtLine,
        borderWidth: 0.6,
      },
      emphasis: {
        itemStyle: { areaColor: paletteNow.mapAreaHover, borderColor: paletteNow.mapBorder },
      },
      silent: interactive !== 'district',
      label: { show: false },
    })
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

function touchDistance(touches: TouchList): number {
  const first = touches[0]
  const second = touches[1]
  if (first === undefined || second === undefined) return 0
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
}

/**
 * 手机双指缩放：跟手，不做缓动。
 *
 * 单指拖动保持禁用（与桌面一致：外层不能拖着跑）；
 * 双指按两指中点为锚点缩放，公式与滚轮一致，避免「一捏就往左上跑」。
 */
function handleTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 2 || chart.value === null) return
  event.preventDefault()
  pinchStart = { distance: touchDistance(event.touches), zoom: geoState().zoom }
}

function handleTouchMove(event: TouchEvent): void {
  const instance = chart.value
  if (instance === null || pinchStart === null || event.touches.length !== 2) return
  event.preventDefault()

  const distance = touchDistance(event.touches)
  if (distance <= 0 || pinchStart.distance <= 0) return

  const first = event.touches[0]
  const second = event.touches[1]
  if (first === undefined || second === undefined || container.value === null) return

  const rect = container.value.getBoundingClientRect()
  const midpoint: [number, number] = [
    (first.clientX + second.clientX) / 2 - rect.left,
    (first.clientY + second.clientY) / 2 - rect.top,
  ]
  const anchor = instance.convertFromPixel({ geoIndex: 0 }, midpoint)
  const { center } = geoState()

  const targetZoom = clampZoom(pinchStart.zoom * (distance / pinchStart.distance))
  const k = targetZoom / pinchStart.zoom
  const geoAnchor: [number, number] =
    Array.isArray(anchor) && anchor.length === 2
      ? ([anchor[0] as number, anchor[1] as number] as [number, number])
      : center

  if (zoomTween !== null) {
    window.cancelAnimationFrame(zoomTween)
    zoomTween = null
  }
  tweening = true
  instance.setOption(
    {
      geo: {
        center: [
          geoAnchor[0] + (center[0] - geoAnchor[0]) / k,
          geoAnchor[1] + (center[1] - geoAnchor[1]) / k,
        ],
        zoom: targetZoom,
      },
    },
    { lazyUpdate: true },
  )
  zoomLevel.value = Number(targetZoom.toFixed(2))
}

function handleTouchEnd(event: TouchEvent): void {
  if (pinchStart === null) return
  if (event.touches.length >= 2) return
  pinchStart = null
  tweening = false
  syncLayerMode()
  refreshMarkers()
}

async function render(): Promise<void> {
  status.value = 'loading'
  errorMessage.value = ''

  try {
    // 区县界与水域是装饰层：失败就少一层纹理，不应该让整张地图报错
    const [city, districts, water, rivers] = await Promise.all([
      loadAnhuiMap(),
      loadAnhuiDistricts().catch(() => null),
      loadAnhuiWater().catch(() => null),
      loadAnhuiRivers().catch(() => null),
    ])
    if (disposed || container.value === null) return
    // 容器尺寸为 0 时不要 setOption：geo 投影拿不到绘图区，ECharts 会抛
    // "Cannot read properties of null (reading '0')"。等 ResizeObserver 给出真实尺寸再画。
    if (container.value.clientWidth === 0 || container.value.clientHeight === 0) return

    const merged = mergeMapLayers(city, districts, water)
    mapFeatures = merged.features
    riverLines = buildRiverLines(rivers)
    layerMode = 'city'
    layerRegions = buildLayerRegions(mapFeatures, layerMode)
    echarts.registerMap(ANHUI_MAP_NAME, merged as Parameters<typeof echarts.registerMap>[1])

    if (chart.value === null) {
      const instance = echarts.init(container.value, undefined, { renderer: 'canvas' })
      instance.on('click', handleChartClick)
      // 拖动平移由 ECharts 负责（roam: 'move'），这里只做范围夹取与聚合重算
      instance.on('georoam', handleGeoRoam)
      chart.value = instance
    }

    chart.value.setOption(currentOption(), { notMerge: true })
    chart.value.resize()
    status.value = 'ready'
    const { zoom } = geoState()
    zoomLevel.value = Number(zoom.toFixed(2))
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
  // passive: false 才能 preventDefault：页面本身不滚动，滚轮只用来缩放地图
  container.value.addEventListener('wheel', handleWheel, { passive: false })
  container.value.addEventListener('touchstart', handleTouchStart, { passive: false })
  container.value.addEventListener('touchmove', handleTouchMove, { passive: false })
  container.value.addEventListener('touchend', handleTouchEnd)
  handleResize()
})

onBeforeUnmount(() => {
  disposed = true
  container.value?.removeEventListener('wheel', handleWheel)
  container.value?.removeEventListener('touchstart', handleTouchStart)
  container.value?.removeEventListener('touchmove', handleTouchMove)
  container.value?.removeEventListener('touchend', handleTouchEnd)
  resizeObserver?.disconnect()
  resizeObserver = null
  if (refreshHandle !== null) window.cancelAnimationFrame(refreshHandle)
  if (zoomTween !== null) window.cancelAnimationFrame(zoomTween)
  chart.value?.off('georoam', handleGeoRoam)
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
      aria-label="安徽省地图，按 16 个地级市划分，标注了各文旅项目的位置。可用右侧缩放条缩放；键盘用户可用下方地标列表逐项浏览"
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

    <div class="anhui-map__zoom" role="group" aria-label="地图缩放">
      <button type="button" class="anhui-map__zoom-button" aria-label="放大" @click="zoomBy(1.4)">
        <AppIcon name="plus" :size="13" />
      </button>
      <input
        class="anhui-map__zoom-range"
        type="range"
        :min="ZOOM_MIN"
        :max="ZOOM_MAX"
        step="0.1"
        :value="zoomLevel"
        aria-label="缩放级别"
        @input="onZoomInput"
      />
      <button
        type="button"
        class="anhui-map__zoom-button"
        aria-label="缩小"
        @click="zoomBy(1 / 1.4)"
      >
        <AppIcon name="minus" :size="13" />
      </button>
    </div>
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

.anhui-map__zoom {
  position: absolute;
  top: 50%;
  right: var(--space-2);
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: center;
  padding: 0.4rem 0.3rem;
  background: rgb(var(--surface-rgb) / 92%);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-card);
  transform: translateY(-50%);
}

.anhui-map__zoom-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  color: var(--ink);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 50%;
}

.anhui-map__zoom-button:hover {
  background: var(--surface-muted);
}

/* 竖向滑块：writing-mode 让 range 竖起来，纯 CSS 方案，不用额外依赖 */
.anhui-map__zoom-range {
  width: 1.1rem;
  height: 7rem;
  margin: 0;
  cursor: pointer;
  appearance: none;
  background: transparent;
  writing-mode: vertical-lr;
  direction: rtl;
}

.anhui-map__zoom-range::-webkit-slider-runnable-track {
  width: 2px;
  background: var(--line-strong);
  border-radius: 1px;
}

.anhui-map__zoom-range::-webkit-slider-thumb {
  width: 0.85rem;
  height: 0.85rem;
  margin-left: -0.35rem;
  background: var(--ink);
  border: 2px solid #fff;
  border-radius: 50%;
  appearance: none;
}

.anhui-map__zoom-range::-moz-range-track {
  width: 2px;
  background: var(--line-strong);
}

.anhui-map__zoom-range::-moz-range-thumb {
  width: 0.85rem;
  height: 0.85rem;
  background: var(--ink);
  border: 2px solid #fff;
  border-radius: 50%;
}

@media (width <= 900px) {
  .anhui-map__zoom {
    right: var(--space-1);
  }
}
</style>
