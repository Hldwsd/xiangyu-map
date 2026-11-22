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
  buildCityAreaColors,
  toScatterData,
  type ClusterScatterDatum,
  type MapRegionStyle,
  type MapScatterDatum,
  type OutlineRing,
  type RiverLine,
} from '@/components/map/anhui-map-option'
import { groupOverlappingMarkers, type MarkerGroup } from '@/components/map/cluster-sites'
import { clampViewCenter } from '@/components/map/view-clamp'
import { featureName, mergeMapLayers, type TaggedFeature } from '@/components/map/merge-map-layers'
import { FEATURED_SITE_IDS } from '@/data/sites'
import {
  ANHUI_FULL_MAP_NAME,
  ANHUI_MAP_NAME,
  loadAnhuiDistricts,
  loadAnhuiMap,
  loadAnhuiOutline,
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
const CLUSTER_MIN_GAP = 36
/** 点聚合点时放大一档；到上限还没分开，就退化成选中簇里第一个项目 */
const CLUSTER_ZOOM_FACTOR = 2
/** 点簇时的缓动时长：太短会「跳」，太长会拖沓 */
const CLUSTER_TWEEN_MS = 320
const ZOOM_MIN = 0.9
const ZOOM_MAX = 8
/** 越过这个倍数后，可交互的从「市域」切成「区县」，避免两层同时高亮 */
const LAYER_SWITCH_ZOOM = 1.9
/** 没有拖拽、没有漫游时的兜底中心（安徽省几何中心附近） */
const FALLBACK_CENTER: [number, number] = [117.3, 31.8]
/**
 * 省域经纬度外框（由合并后的底图实时算出）。
 *
 * 拖动夹取必须按「当前缩放」换算可见范围：固定一个中心框在放大后会把人挡住——
 * 放到 8 倍时视野只有零点几度，却只能停在固定框内，省域最西 / 最北的角永远看不到。
 */
let provinceBBox: [[number, number], [number, number]] | null = null
const FALLBACK_BBOX: [[number, number], [number, number]] = [
  [114.88, 29.39],
  [119.65, 34.65],
]

const props = defineProps<{
  sites: Site[]
  selectedId: string | null
  /** 是否显示区县界。默认开启：找项目时按区县定位比只看 16 个市更准 */
  showDistricts?: boolean
  /** 是否把靠得近的地标合并成一个数字标签。关掉后每个项目单独画，便于逐个点选 */
  cluster?: boolean
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
/** 我们自己在 georoam 里写回中心时置 true，避免递归 */
let clampingCenter = false
let zoomTween: number | null = null
/** 自己发起的缩放动画进行中：期间不重算聚合（地图在动，算出来也是中间态） */
let tweening = false
/** 合并底图的要素列表，用来按缩放级别重建 regions（市 / 区县） */
let mapFeatures: TaggedFeature[] = []
/** 合并底图里去掉市域之后的逐要素样式（区县界、水域） */
let layerRegions: MapRegionStyle[] = []
/** 长江/淮河的折线段，画成 lines 系列 */
let riverLines: RiverLine[] = []
let activeMapName = ANHUI_MAP_NAME
/** 首屏加载的市界与水域，切换区县图层时复用，不再重复请求 */
let cachedCity: Parameters<typeof mergeMapLayers>[0] | null = null
let cachedWater: Parameters<typeof mergeMapLayers>[2] = null
/** 省界光晕：同一圈轮廓的三种线宽/浓度（lines 系列画，拐点用圆角） */
let outlineRings: OutlineRing[] = []
/** 当前可交互的层级：低倍只让市域可选中，高倍只让区县可选中 */
let layerMode: 'city' | 'district' = 'city'
/** 本期精选的 id 集合：地图上用金色虚线环 + 大一号圆钉标记 */
const FEATURED_ID_SET: ReadonlySet<string> = new Set(FEATURED_SITE_IDS)
/** 首次 setOption 之后置 false：落墨入场动画只在首帧播，筛选/聚合更新不再播 */
let firstOptionApplied = false
/** 当前主题的配色（分类色 + 地图配色）。主题只在加载时确定，读一次就够 */
let palette: ThemePalette | null = null

function themePalette(): ThemePalette {
  palette ??= readThemePalette()
  return palette
}

function bboxOfFeatures(
  features: { geometry?: { coordinates?: unknown } | null }[],
): [[number, number], [number, number]] {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  const visit = (node: unknown): void => {
    if (!Array.isArray(node)) return
    if (node.length >= 2 && typeof node[0] === 'number' && typeof node[1] === 'number') {
      const [lng, lat] = node as [number, number]
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
      return
    }
    for (const child of node) visit(child)
  }

  for (const feature of features) visit(feature.geometry?.coordinates)
  if (!Number.isFinite(minLng)) return FALLBACK_BBOX
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
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

/**
 * 把中心夹到「当前缩放下的可平移范围」。
 *
 * 可见半幅（经纬度）= 视口像素 / 每度像素 / 2；中心允许范围就是省域外框内缩半幅后的区间。
 * 缩得很小时半幅比省域还大，就固定在省域中心（不出现大片空白）。
 */
function clampCenter(center: [number, number], zoom = geoState().zoom): [number, number] {
  const instance = chart.value
  const containerEl = container.value
  if (instance === null || containerEl === null) return center

  const state = geoState()
  const p0 = instance.convertToPixel({ geoIndex: 0 }, state.center)
  const pLng = instance.convertToPixel({ geoIndex: 0 }, [state.center[0] + 0.5, state.center[1]])
  const pLat = instance.convertToPixel({ geoIndex: 0 }, [state.center[0], state.center[1] + 0.5])
  if (!Array.isArray(p0) || !Array.isArray(pLng) || !Array.isArray(pLat)) return center

  const pxPerLng = Math.abs((pLng[0] as number) - (p0[0] as number)) / 0.5
  const pxPerLat = Math.abs((pLat[1] as number) - (p0[1] as number)) / 0.5

  return clampViewCenter({
    center,
    zoom,
    currentZoom: state.zoom,
    bbox: provinceBBox ?? FALLBACK_BBOX,
    viewport: { width: containerEl.clientWidth, height: containerEl.clientHeight },
    pxPerLng,
    pxPerLat,
  })
}

/**
 * 拖动结束/过程中夹住中心。
 *
 * `roam: 'move'` 交给 ECharts 做平移手感（惯性、指针捕获都是现成的），
 * 但默认可以把地图拖到视野外只剩空白；这里在 georoam 里做范围夹取。
 */
function handleGeoRoam(): void {
  const instance = chart.value
  if (instance === null || tweening || clampingCenter) return

  const { center, zoom } = geoState()
  zoomLevel.value = Number(zoom.toFixed(2))
  syncLayerMode()
  scheduleRefresh()

  // 实时夹取：拖动过程中越界就把中心顶回边界，而不是等松手后「传送」回来。
  // 写回时带上传当前 zoom，避免只写 center 时把缩放重置成默认值。
  const [clampedX, clampedY] = clampCenter(center, zoom)
  if (clampedX !== center[0] || clampedY !== center[1]) {
    clampingCenter = true
    instance.setOption({ geo: { center: [clampedX, clampedY], zoom } })
    clampingCenter = false
  }
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
function animateGeoTo(center: [number, number], zoom: number, duration = CLUSTER_TWEEN_MS): void {
  const instance = chart.value
  if (instance === null) return

  const from = geoState()
  const target = clampCenter(center, zoom)
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
 * 缩放条 / 加减按钮：一次性设置 zoom，不做补间。
 *
 * 缩放条的输入本身就是连续的（拖动时逐帧触发），再叠一层动画只会延迟生效；
 * 滚轮与双指已交给 ECharts 原生 roam，这里也不需要再插动画。
 */
function zoomTo(target: number): void {
  const instance = chart.value
  if (instance === null) return

  const { center, zoom } = geoState()
  const next = clampZoom(target)
  if (Math.abs(next - zoom) < 0.001) return

  instance.setOption({ geo: { center: clampCenter(center, next), zoom: next } })
  zoomLevel.value = Number(next.toFixed(2))
  syncLayerMode()
  refreshMarkers()
}

function zoomBy(factor: number): void {
  zoomTo(geoState().zoom * factor)
}

function onZoomInput(event: Event): void {
  zoomTo(Number((event.target as HTMLInputElement).value))
}

/** 当前视野下的像素坐标 → 分组。拿不到投影时返回 undefined，退回「每个项目一颗」 */
function computeGroups(instance: EChartsType): MarkerGroup[] | undefined {
  // 关掉合并时返回 undefined：toScatterData 按「每个项目一颗」处理
  if (props.cluster === false) return undefined

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
  currentData = toScatterData(
    props.sites,
    props.selectedId,
    groups,
    themePalette(),
    FEATURED_ID_SET,
  )
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

function currentOption(): ReturnType<typeof buildAnhuiMapOption> {
  const option = buildAnhuiMapOption(
    props.sites,
    props.selectedId,
    undefined,
    themePalette(),
    layerRegions,
    riverLines,
    activeMapName,
    outlineRings,
    FEATURED_ID_SET,
    // 落墨入场只播一次：首次 setOption 为 true，之后的更新一律 false
    !firstOptionApplied,
  )
  firstOptionApplied = true
  return option
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

    // 默认 2.2：长江/淮河是构图的水文骨架，1.6 在省域视野下细得像注记
    const width = typeof candidate.properties?.width === 'number' ? candidate.properties.width : 2.2
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
  // choropleth：按市收录项目数上墨（0–1 个保持原色，2–3 / ≥4 各深一档）
  const cityColors = buildCityAreaColors(props.sites, paletteNow)
  const regions: MapRegionStyle[] = []

  for (const feature of features) {
    const name = featureName(feature)
    if (name === null) continue
    const layer = feature.properties.layer

    if (layer === 'city') {
      const areaColor = cityColors.get(name) ?? paletteNow.mapArea
      regions.push({
        name,
        itemStyle: {
          areaColor,
          borderColor: paletteNow.mapBorder,
          borderWidth: 1.1,
        },
        // hover 只加深描边、保持档位底色：铺灰底会把压在上面的河道盖成一片灰，
        // 变回原色则会让深色市在悬停时「变浅」，两者都会破坏 choropleth 的读法
        // hover 保留档位底色（否则城市变透明会露出页面背景）：
        // 湖面已经改成画在 geo 之上的 custom 系列，不会被这一层重绘盖住。
        emphasis: {
          itemStyle: {
            areaColor,
            borderColor: paletteNow.mapLabel,
            borderWidth: 1.4,
          },
        },
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
        borderWidth: 0.7,
      },
      emphasis: {
        itemStyle: {
          areaColor: 'transparent',
          borderColor: paletteNow.mapLabel,
          borderWidth: 1.2,
        },
      },
      silent: interactive !== 'district',
      label: { show: false },
    })
  }

  return regions
}

/*
 * 键盘与读屏的等价入口在顶部「项目列表」抽屉里：抽屉本身可 Tab、可 Enter，
 * 地图 canvas 只保留一句 aria-label 说明。不再在地图组件内维护第二份地标列表，
 * 否则两个入口要同步、而且整份列表会排在搜索框之前抢占 Tab 序列（Issue #107）。
 */

/**
 * 切换区县界图层。
 *
 * 默认显示：官方标准图（皖S(2025)71号「安徽省示意图（一）」）只画 16 个地级市，
 * 没有县区界；区县一层留作可选的定位细节，菜单里可以关掉。首次启用时请求一次（gzip 126KB）。
 * 重建前记下 center/zoom，重建后写回去——否则用户的缩放会被打回默认。
 */
async function applyDistrictLayer(include: boolean): Promise<void> {
  const instance = chart.value
  if (cachedCity === null || instance === null || disposed || status.value !== 'ready') return

  const districts = include ? await loadAnhuiDistricts().catch(() => null) : null
  if (include && districts === null) return
  if (disposed || chart.value === null) return

  const { center, zoom } = geoState()
  const merged = mergeMapLayers(cachedCity, districts, cachedWater)
  mapFeatures = merged.features
  layerMode = zoom >= LAYER_SWITCH_ZOOM ? 'district' : 'city'
  layerRegions = buildLayerRegions(mapFeatures, layerMode)
  activeMapName = districts === null ? ANHUI_MAP_NAME : ANHUI_FULL_MAP_NAME

  echarts.registerMap(activeMapName, merged as Parameters<typeof echarts.registerMap>[1])
  instance.setOption(currentOption(), { notMerge: true })
  instance.setOption({ geo: { center, zoom } })
  zoomLevel.value = Number(zoom.toFixed(2))
  refreshMarkers()
}

/** 省界 GeoJSON → 三圈折线（外圈最粗最浅，内圈最细最深） */
function buildOutlineRings(outline: { features: unknown[] } | null): OutlineRing[] {
  const feature = outline?.features?.[0] as
    { geometry?: { type?: string; coordinates?: unknown } } | undefined
  const geometry = feature?.geometry
  if (geometry === undefined) return []

  const toCoords = (ring: unknown): [number, number][] => {
    if (!Array.isArray(ring)) return []
    const points: [number, number][] = []
    for (const point of ring) {
      if (!Array.isArray(point) || point.length < 2) continue
      const [lng, lat] = point as [unknown, unknown]
      if (typeof lng !== 'number' || typeof lat !== 'number') continue
      points.push([lng, lat])
    }
    return points
  }

  const rings: [number, number][][] = []
  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    for (const ring of geometry.coordinates) rings.push(toCoords(ring))
  } else if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    for (const polygon of geometry.coordinates) {
      if (!Array.isArray(polygon)) continue
      for (const ring of polygon) rings.push(toCoords(ring))
    }
  }

  const styles = [
    { width: 20, alpha: 'rgb(28 26 23 / 6%)' },
    { width: 9, alpha: 'rgb(28 26 23 / 15%)' },
    { width: 2.5, alpha: 'rgb(28 26 23 / 42%)' },
  ]

  const result: OutlineRing[] = []
  for (const coords of rings) {
    if (coords.length < 3) continue
    for (const style of styles) result.push({ coords, width: style.width, alpha: style.alpha })
  }
  return result
}

async function render(): Promise<void> {
  status.value = 'loading'
  errorMessage.value = ''

  try {
    // 区县界与底图**并行**拉：默认开启后它要跟着首屏用，晚一步就多等一个 RTT。
    // 加载器按 URL 做了 Promise 缓存，稍后 applyDistrictLayer() 再取是同一个请求，不会重复下载。
    if (props.showDistricts === true) void loadAnhuiDistricts().catch(() => null)

    const [city, water, rivers, outline] = await Promise.all([
      loadAnhuiMap(),
      loadAnhuiWater().catch(() => null),
      loadAnhuiRivers().catch(() => null),
      loadAnhuiOutline().catch(() => null),
    ])
    if (disposed || container.value === null) return
    // 容器尺寸为 0 时不要 setOption：geo 投影拿不到绘图区，ECharts 会抛
    // "Cannot read properties of null (reading '0')"。等 ResizeObserver 给出真实尺寸再画。
    if (container.value.clientWidth === 0 || container.value.clientHeight === 0) return

    cachedCity = city
    cachedWater = water
    outlineRings = buildOutlineRings(outline)
    const merged = mergeMapLayers(city, null, water)
    mapFeatures = merged.features
    provinceBBox = bboxOfFeatures(merged.features)
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
    currentData = toScatterData(
      props.sites,
      props.selectedId,
      undefined,
      themePalette(),
      FEATURED_ID_SET,
    )
    refreshMarkers()

    // 区县界已在开头并行预取，这里直接合并进底图（重注册地图并保留当前视野）
    if (props.showDistricts === true) void applyDistrictLayer(true)
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
  chart.value?.off('georoam', handleGeoRoam)
  chart.value?.dispose()
  chart.value = null
})

watch(
  () => props.showDistricts,
  (include) => {
    if (status.value !== 'ready' || chart.value === null) return
    void applyDistrictLayer(include === true)
  },
)

watch(
  () => props.cluster,
  () => {
    if (status.value !== 'ready' || chart.value === null) return
    refreshMarkers()
  },
)

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
      aria-label="安徽省地图，按 16 个地级市划分，标注了各文旅项目的位置。可用右侧缩放条缩放；键盘用户可用顶部「项目列表」逐项浏览"
    />

    <p v-if="status === 'loading'" class="anhui-map__hint">
      <span class="anhui-map__spinner" aria-hidden="true" />
      底图加载中…
    </p>

    <div v-else-if="status === 'error'" class="anhui-map__hint anhui-map__hint--error">
      <span>{{ errorMessage }}</span>
      <button type="button" class="anhui-map__retry" @click="render">重试</button>
    </div>

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
  border: 2px solid var(--surface);
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
  border: 2px solid var(--surface);
  border-radius: 50%;
}

@media (width <= 900px) {
  .anhui-map__zoom {
    right: var(--space-1);
  }
}
</style>
