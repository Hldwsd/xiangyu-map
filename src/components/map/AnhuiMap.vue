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
import {
  clusterGapForWidth,
  clusterStartPosition,
  DEFAULT_CLUSTER_GAP,
  groupOverlappingMarkers,
  markerClusterKey,
  type MarkerGroup,
} from '@/components/map/cluster-sites'
import { nudgeBall, stepBalls, type BallState, type Point } from '@/components/map/marker-physics'
import { clampViewCenter } from '@/components/map/view-clamp'
import { pinchZoom } from '@/components/map/pinch-zoom'
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
/** 不合并时，屏幕距离小于它的地标才散开：只在「真的叠住」时动手，避免满屏引线 */
const reduceMotionQuery =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
/** 系统开了「减少动态效果」时：不放入场动画、不响应 hover 拨球，静止布局仍保留 */
const reduceMotion = ref(reduceMotionQuery?.matches === true)
if (reduceMotionQuery !== null) {
  const onChange = (event: MediaQueryListEvent): void => {
    reduceMotion.value = event.matches
  }
  reduceMotionQuery.addEventListener('change', onChange)
  onBeforeUnmount(() => reduceMotionQuery.removeEventListener('change', onChange))
}

/** 软碰撞半径：比针径小，球会推开一点但仍重叠 */
const BALL_COLLIDE = 18
/** 合并标签比单个球大，碰撞半径也大一点；仍保持轻压，不排成整齐圆环 */
const CLUSTER_COLLIDE = 30
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
  /** 城市索引 hover 时高亮对应市域（值形如「合肥」，null 取消） */
  highlightCity?: string | null
}>()

const emit = defineEmits<{ select: [id: string]; 'marker-hover': [city: string | null] }>()

const container = ref<HTMLDivElement | null>(null)
const chart = shallowRef<EChartsType | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
/** 选中项目时对应市域的持续高亮；关闭卡片（selectedId 变 null）才结束 */
const pulseCity = ref<string | null>(null)
const errorMessage = ref('')
/** 给缩放条用的当前倍数 */
const zoomLevel = ref(1)

let resizeObserver: ResizeObserver | null = null
let disposed = false
/** 当前画在图上的一批点（单点或簇），键盘高亮要按它找下标 */
let currentData: MapScatterDatum[] = []
/** 地标小球的物理状态；只在「不合并」模式下使用 */
let balls: BallState[] = []
let ballHomes = new Map<string, Point>()
let ballRAF: number | null = null
/** 合并模式的簇也有小球物理：碰撞半径按数字标签大小取，合并/拆分时从旧位置吸附过去 */
let clusterNodes: BallState[] = []
let clusterHomes = new Map<string, Point>()
let clusterRAF: number | null = null
/** 每个项目上一次被画在屏幕上的位置，用来给拆分/合并找起点 */
let clusterMemberPositions = new Map<string, Point>()
let clusterStillFrames = 0
/** 合并模式下的「普通标签」（单点）也走小球物理：hover 拨动 + 相互软碰撞 */
const singleBalls = new Map<string, BallState>()
const singleHomes = new Map<string, Point>()
let singleRAF: number | null = null
let singleStillFrames = 0
/** 簇/单点的偏移分开算、合并写一次，避免互相覆盖 */
const clusterOffsetMap = new Map<string, Point>()
const singleOffsetMap = new Map<string, Point>()
/** 缩放进行中：簇要实时重算，期间不做过渡动画 */
let liveZoom = false
let liveZoomRefresh: number | null = null
let lastLiveZoom = 0
/** 合并/拆分过渡：从旧位置缓动到新 home，期间不做弹簧碰撞 */
let clusterTween: { from: Point[]; to: Point[]; started: number; duration: number } | null = null
/** 拖动/缩放时不要每个 georoam 都重建数据：防抖到停下后再刷新 */
let roamRefreshTimer: number | null = null
/** 漫游结束后的时间点：这段时间内物理循环让路，避免和地图重绘抢帧 */
let roamActiveUntil = 0
let ballStillFrames = 0
/** 上一帧位置：静止判定看「这一帧位移量」，不看速度——弹簧在平衡点仍有残余速度 */
let ballLastPos = new Map<string, [number, number]>()
const ballNudgeAt = new Map<string, number>()
/** 鼠标移动采样：用来按滑动速度决定「带一下」的力度 */
let pointerLast: { x: number; y: number; t: number } | null = null
/** 最近一次 mousemove 的指针速度（px/ms）：hover 时用上一次移动估算，不能用当前位置比当前位置 */
let pointerSpeed = 0
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
function clampCenter(center: [number, number]): [number, number] {
  return clampViewCenter(center, provinceBBox ?? FALLBACK_BBOX)
}

/**
 * 拖动结束/过程中夹住中心。
 *
 * `roam: 'move'` 交给 ECharts 做平移手感（惯性、指针捕获都是现成的），
 * 但默认可以把地图拖到视野外只剩空白；这里在 georoam 里做范围夹取。
 */
/**
 * 双指缩放：ECharts 原生 pinch 是 1:1 映射，指尖动一点地图就跳很多。
 * 这里在 container 上捕获两指移动（capture + preventDefault/stopPropagation 挡住 zrender 的 roam），
 * 用 ratio^0.75 的阻尼曲线自己算 zoom，同时按两指中点位移平移中心。
 */
const PINCH_DAMPING = 0.75
let pinchState: {
  distance: number
  zoom: number
  center: [number, number]
  midpoint: [number, number]
  pxPerLng: number
  pxPerLat: number
} | null = null

function touchPoints(event: TouchEvent): [[number, number], [number, number]] | null {
  const a = event.touches[0]
  const b = event.touches[1]
  if (a === undefined || b === undefined) return null
  return [
    [a.clientX, a.clientY],
    [b.clientX, b.clientY],
  ]
}

function handleTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 2) return
  const instance = chart.value
  const points = touchPoints(event)
  if (instance === null || points === null) return
  const { center, zoom } = geoState()

  const base = instance.convertToPixel({ geoIndex: 0 }, center)
  const lng = instance.convertToPixel({ geoIndex: 0 }, [center[0] + 0.01, center[1]])
  const lat = instance.convertToPixel({ geoIndex: 0 }, [center[0], center[1] + 0.01])
  if (!Array.isArray(base) || !Array.isArray(lng) || !Array.isArray(lat)) return

  pinchState = {
    distance: Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]),
    zoom,
    center,
    midpoint: [(points[0][0] + points[1][0]) / 2, (points[0][1] + points[1][1]) / 2],
    pxPerLng: Math.abs((lng[0] as number) - (base[0] as number)) / 0.01,
    pxPerLat: Math.abs((lat[1] as number) - (base[1] as number)) / 0.01,
  }
}

function handleTouchMove(event: TouchEvent): void {
  if (event.touches.length !== 2 || pinchState === null) return
  const instance = chart.value
  const points = touchPoints(event)
  if (instance === null || points === null) return
  if (pinchState.distance <= 1) return

  event.preventDefault()
  event.stopPropagation()

  const distance = Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1])
  const ratio = distance / pinchState.distance
  const zoom = pinchZoom(pinchState.zoom, ratio, {
    min: ZOOM_MIN,
    max: ZOOM_MAX,
    damping: PINCH_DAMPING,
  })
  const midpoint: [number, number] = [
    (points[0][0] + points[1][0]) / 2,
    (points[0][1] + points[1][1]) / 2,
  ]

  const center: [number, number] = [
    pinchState.center[0] - (midpoint[0] - pinchState.midpoint[0]) / pinchState.pxPerLng,
    pinchState.center[1] + (midpoint[1] - pinchState.midpoint[1]) / pinchState.pxPerLat,
  ]

  instance.setOption({ geo: { center: clampCenter(center), zoom } })
  zoomLevel.value = Number(zoom.toFixed(2))
  roamActiveUntil = performance.now() + 180
}

function handleTouchEnd(event: TouchEvent): void {
  if (event.touches.length >= 2) return
  pinchState = null
  scheduleRoamRefresh()
}

/** 缩放/自动放大过程中：标记 live 状态并按 rAF 触发一次实时重分组 */
let lastLiveRefreshAt = 0
let lastClusterSignature = ''
let lastClusterSelected = ''
function markLiveZoom(): void {
  if (!props.cluster) return
  liveZoom = true
  if (liveZoomRefresh !== null) return
  // 每帧都重算 70 个像素坐标 + setOption 会卡；70ms 一次肉眼仍是「实时」
  const wait = Math.max(0, 70 - (performance.now() - lastLiveRefreshAt))
  liveZoomRefresh = window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      lastLiveRefreshAt = performance.now()
      liveZoomRefresh = null
      if (props.cluster) refreshMarkers()
    }, wait)
  })
}

/** 读取当前 geo zoom；走模型而不是 getOption（后者会克隆整份 option，逐帧调用太贵） */
function geoZoomFast(): number | null {
  const instance = chart.value
  if (instance === null) return null
  try {
    const model = (
      instance as unknown as {
        getModel: () => {
          getComponent: (type: string) => { option?: { zoom?: number } } | undefined
        }
      }
    ).getModel()
    const zoom = model.getComponent('geo')?.option?.zoom
    return typeof zoom === 'number' ? zoom : null
  } catch {
    return null
  }
}

function handleGeoRoam(): void {
  const instance = chart.value
  if (instance === null || tweening || clampingCenter) return
  roamActiveUntil = performance.now() + 180

  // 滚轮/双指缩放：zoom 一变就实时重新分组，不等松手
  const zoom = geoZoomFast()
  if (zoom !== null && Math.abs(zoom - lastLiveZoom) > 0.05) {
    lastLiveZoom = zoom
    markLiveZoom()
  }

  scheduleRoamRefresh()
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
    // 点簇自动放大时也要边放大边拆分；但每帧重算会卡，zoom 变化超过 0.08 再算
    if (Math.abs(nextZoom - lastLiveZoom) > 0.12) {
      lastLiveZoom = nextZoom
      markLiveZoom()
    }
    if (progress < 1) {
      zoomTween = window.requestAnimationFrame(step)
      return
    }
    zoomTween = null
    tweening = false
    liveZoom = false
    syncLayerMode()
    refreshMarkers()
    if (props.cluster) settleClustersSilently()
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
  applyCityHighlight()
}

/** 从一个市的 GeoJSON feature 里取出多边形环（Polygon / MultiPolygon） */
function cityRings(city: string): number[][][] {
  const name = city.endsWith('市') ? city : `${city}市`
  const collection = cachedCity as {
    features?: {
      properties?: { name?: string }
      geometry?: { type?: string; coordinates?: unknown }
    }[]
  } | null
  const feature = collection?.features?.find((item) => item.properties?.name === name)
  if (feature?.geometry === undefined) return []

  const rings: number[][][] = []
  if (feature.geometry.type === 'Polygon') {
    for (const ring of feature.geometry.coordinates as number[][][]) rings.push(ring)
  } else if (feature.geometry.type === 'MultiPolygon') {
    for (const polygon of feature.geometry.coordinates as number[][][][]) {
      for (const ring of polygon) rings.push(ring)
    }
  }
  return rings
}

/**
 * 城市索引 hover / 选中项目：用一条独立的朱砂线条描出市界。
 * - 不改 geo region 的 fill/border，区县界线不会被盖住；
 * - 线条跟着 geo 投影走，放大到区县图层也不会消失；
 * - 只画外环，不参与 hover 命中（silent）。
 */
function applyCityHighlight(): void {
  const instance = chart.value
  if (instance === null || status.value !== 'ready') return
  const city = props.highlightCity ?? pulseCity.value ?? null
  const data = city === null ? [] : cityRings(city).map((coords) => ({ coords }))
  // 选中态（没有 hover 其它城市）比 hover 再重一点：柔光更宽，卡片关掉才消失
  const selected = props.highlightCity === null && pulseCity.value !== null
  instance.setOption({
    series: [
      { id: 'city-highlight-halo', data, lineStyle: { width: selected ? 8 : 6 } },
      { id: 'city-highlight', data, lineStyle: { width: selected ? 2.4 : 2 } },
    ],
  })
}

watch(
  () => props.highlightCity,
  () => {
    if (status.value === 'ready') applyCityHighlight()
  },
)

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

  instance.setOption({ geo: { center: clampCenter(center), zoom: next } })
  zoomLevel.value = Number(next.toFixed(2))
  syncLayerMode()
  refreshMarkers()
}

function zoomBy(factor: number): void {
  zoomTo(geoState().zoom * factor)
}

function onZoomInput(event: Event): void {
  const instance = chart.value
  if (instance === null) return
  const next = clampZoom(Number((event.target as HTMLInputElement).value))
  // 拖动缩放条会连续触发 input：只改 geo 缩放，图层/地标刷新防抖到松手后再做
  const { center } = geoState()
  instance.setOption({ geo: { center: clampCenter(center), zoom: next } })
  zoomLevel.value = Number(next.toFixed(2))
  roamActiveUntil = performance.now() + 180
  scheduleRoamRefresh()
}

/** 当前视野下的像素坐标 → 分组。拿不到投影时返回 undefined，退回「每个项目一颗」 */
function computeGroups(instance: EChartsType, minGap = DEFAULT_CLUSTER_GAP): MarkerGroup[] {
  const pixels = new Map<string, readonly [number, number] | null>()

  for (const site of props.sites) {
    const point = instance.convertToPixel({ geoIndex: 0 }, [site.location.lng, site.location.lat])
    const usable =
      Array.isArray(point) &&
      Number.isFinite(point[0] as number) &&
      Number.isFinite(point[1] as number)
    pixels.set(site.id, usable ? ([point[0] as number, point[1] as number] as const) : null)
  }

  const groups = groupOverlappingMarkers(props.sites, (site) => pixels.get(site.id) ?? null, minGap)

  // 按经纬度排序：数据下标稳定，缩放时不会因为顺序变化出现「两个点互换位置」
  return [...groups].sort((a, b) => (a.lng === b.lng ? a.lat - b.lat : a.lng - b.lng))
}

/**
 * 合并模式的簇也走同一套软碰撞物理：
 * - 同一簇/新簇从旧位置出发，再被弹簧吸到新锚点；
 * - 合并时取旧位置平均，拆分时所有新簇从旧簇位置出发；
 * - 初次出现静默结算，避免首屏逐帧 setOption（TBT）。
 */
function syncClusters(instance: EChartsType, groups: MarkerGroup[]): void {
  const previousNodes = new Map(clusterNodes.map((node) => [node.id, node]))
  const previousHomes = clusterHomes
  const next: BallState[] = []
  const homes = new Map<string, Point>()

  for (const group of groups) {
    const point = instance.convertToPixel({ geoIndex: 0 }, [group.lng, group.lat])
    if (!Array.isArray(point)) continue
    const [x, y] = point as [number, number]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue

    // 与 toScatterData 保持一致：选中项会从簇里被单独拎出来，
    // 所以簇的 key / 起始位置必须用「去掉选中项之后的成员」，
    // 否则数据里的 clusterKey 和这里的 node.id 对不上，偏移永远应用不上。
    const members = group.ids.filter((id) => id !== props.selectedId)
    if (members.length < 2) continue
    const key = markerClusterKey(members)
    const home: Point = [x, y]
    homes.set(key, home)
    const old = previousNodes.get(key)
    const oldHome = previousHomes.get(key)
    const start: Point =
      old === undefined
        ? clusterStartPosition(members, clusterMemberPositions, home)
        : oldHome === undefined
          ? [old.x, old.y]
          : // 同一簇、只是视野变了：跟着 home 平移，保留当前偏移
            [old.x + (home[0] - oldHome[0]), old.y + (home[1] - oldHome[1])]
    next.push({
      id: key,
      x: start[0],
      y: start[1],
      vx: 0,
      vy: 0,
    })
  }

  const initial = clusterNodes.length === 0
  const sameSet =
    previousNodes.size > 0 &&
    next.length === previousNodes.size &&
    next.every((node) => previousNodes.has(node.id))
  clusterNodes = next
  clusterHomes = homes
  clusterStillFrames = 0

  // 缩放进行中：实时分组。组成不变时按 home 平移、保留 hover 的偏移，
  // 只有真的合并/拆分才把簇落到新锚点（否则 hover 的回弹会被逐帧刷新打断）。
  if (liveZoom) {
    if (sameSet) {
      for (const node of clusterNodes) {
        const home = clusterHomes.get(node.id)
        const oldHome = previousHomes.get(node.id)
        if (home === undefined || oldHome === undefined) continue
        node.x += home[0] - oldHome[0]
        node.y += home[1] - oldHome[1]
      }
    } else {
      for (const node of clusterNodes) {
        const home = clusterHomes.get(node.id)
        if (home === undefined) continue
        node.x = home[0]
        node.y = home[1]
        node.vx = 0
        node.vy = 0
      }
    }
    applyClusterOffsets()
    return
  }

  // 首屏/减少动效时静默结算；视野变化但簇组成没变时也不放动画——
  // 否则每次拖动/缩放停下，地标都会从旧位置「吸」过去，看起来像卡顿。
  if (initial || reduceMotion.value) {
    settleClustersSilently()
    return
  }
  // 视野变化但簇组成没变：直接按 home 平移，不放弹簧动画
  if (sameSet) {
    for (const node of clusterNodes) {
      node.vx = 0
      node.vy = 0
    }
    applyClusterOffsets()
    return
  }
  // 合并/拆分：从旧位置缓动到新位置，并让「一簇拆成几簇」先呈扇形散开
  startClusterTween()
}

function settleClustersSilently(): void {
  // matter 引擎每步都要解约束+碰撞，240 步在缩放结束时能攒出几百毫秒长任务。
  // 没有重叠就不必跑：直接清零速度、按 home 落位即可。
  const points = [...clusterHomes.values()]
  let overlapped = false
  for (let i = 0; i < points.length && !overlapped; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i]!
      const b = points[j]!
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < CLUSTER_COLLIDE) {
        overlapped = true
        break
      }
    }
  }
  if (!overlapped) {
    for (const node of clusterNodes) {
      const home = clusterHomes.get(node.id)
      if (home === undefined) continue
      node.x = home[0]
      node.y = home[1]
      node.vx = 0
      node.vy = 0
    }
    applyClusterOffsets()
    return
  }
  for (let i = 0; i < 24; i += 1) {
    const speed = stepBalls(clusterNodes, clusterHomes, {
      spring: 0.06,
      damping: 0.72,
      collide: CLUSTER_COLLIDE,
      contact: 0.12,
    })
    if (speed < 0.02) break
  }
  for (const node of clusterNodes) {
    node.vx = 0
    node.vy = 0
  }
  applyClusterOffsets()
}

function applyClusterOffsets(): void {
  const instance = chart.value
  if (instance === null) return

  const offsets = new Map<string, Point>()
  const byKey = new Map<string, BallState>()
  for (const node of clusterNodes) {
    const home = clusterHomes.get(node.id)
    if (home === undefined) continue
    byKey.set(node.id, node)
    const dx = node.x - home[0]
    const dy = node.y - home[1]
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) offsets.set(node.id, [dx, dy])
  }

  clusterOffsetMap.clear()
  for (const [key, offset] of offsets) clusterOffsetMap.set(key, offset)

  // 记下每个项目当前实际屏幕位置，下一次拆分/合并从这里出发
  for (const datum of currentData) {
    const cluster = datum as Partial<ClusterScatterDatum>
    if (cluster.clusterKey === undefined || cluster.clusterIds === undefined) continue
    const node = byKey.get(cluster.clusterKey)
    if (node === undefined) continue
    for (const id of cluster.clusterIds) {
      clusterMemberPositions.set(id, [node.x, node.y])
    }
  }
}

/** 把簇与单点的偏移合并写一次 series.data */
function applyMarkerOffsets(): void {
  const instance = chart.value
  if (instance === null) return
  const data = currentData.map((datum) => {
    const marker = datum as { siteId?: string; clusterKey?: string }
    if (marker.clusterKey !== undefined) {
      const offset = clusterOffsetMap.get(marker.clusterKey)
      return offset === undefined ? datum : { ...datum, symbolOffset: offset }
    }
    const offset = marker.siteId === undefined ? undefined : singleOffsetMap.get(marker.siteId)
    return offset === undefined ? datum : { ...datum, symbolOffset: offset }
  })
  instance.setOption({ series: [{ id: 'sites', data }] })
}

/**
 * 合并/拆分过渡：从旧位置缓动到新 home。
 *
 * 拆分时多个新簇的起点会重合在旧簇中心，如果直接落到各自 home，看起来像「凭空出现」；
 * 这里先给每颗一个扇形起点（半径 9px），再一起缓动出去。
 */
/** 合并模式下，没被合并成簇的项目（普通标签）也维护一份小球状态 */
function syncSingleBalls(instance: EChartsType, groups: MarkerGroup[]): void {
  const singleIds = new Set<string>()
  for (const site of props.sites) {
    const group = groups.find((item) => item.ids.includes(site.id))
    if (group === undefined || group.ids.length < 2) singleIds.add(site.id)
  }
  if (props.selectedId !== null) singleIds.add(props.selectedId)

  for (const id of [...singleBalls.keys()]) {
    if (!singleIds.has(id)) singleBalls.delete(id)
  }
  for (const id of singleIds) {
    const site = props.sites.find((item) => item.id === id)
    if (site === undefined) continue
    const point = instance.convertToPixel({ geoIndex: 0 }, [site.location.lng, site.location.lat])
    if (!Array.isArray(point)) continue
    const [px, py] = point as [number, number]
    const home: Point = [px, py]
    const previousHome = singleHomes.get(id)
    const ball = singleBalls.get(id)
    if (ball === undefined) {
      singleBalls.set(id, { id, x: home[0], y: home[1], vx: 0, vy: 0 })
    } else if (previousHome === undefined) {
      ball.x = home[0]
      ball.y = home[1]
    } else {
      ball.x += home[0] - previousHome[0]
      ball.y += home[1] - previousHome[1]
    }
    singleHomes.set(id, home)
  }
}

function applySingleOffsets(): void {
  const instance = chart.value
  if (instance === null) return
  const offsets = new Map<string, Point>()
  for (const [id, ball] of singleBalls) {
    const home = singleHomes.get(id)
    if (home === undefined) continue
    const dx = ball.x - home[0]
    const dy = ball.y - home[1]
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) offsets.set(id, [dx, dy])
  }
  singleOffsetMap.clear()
  for (const [id, offset] of offsets) singleOffsetMap.set(id, offset)
}

function kickSingle(): void {
  if (reduceMotion.value) return
  if (singleRAF !== null) window.cancelAnimationFrame(singleRAF)
  singleStillFrames = 0
  singleRAF = window.requestAnimationFrame(tickSingle)
}

function tickSingle(): void {
  singleRAF = null
  if (!props.cluster || disposed) return
  if (performance.now() < roamActiveUntil) {
    singleRAF = window.requestAnimationFrame(tickSingle)
    return
  }
  const speed = stepBalls([...singleBalls.values()], singleHomes, {
    spring: 0.06,
    damping: 0.72,
    collide: 16,
    contact: 0.12,
  })
  applySingleOffsets()
  applyMarkerOffsets()
  if (speed < 0.02) singleStillFrames += 1
  else singleStillFrames = 0
  if (singleStillFrames < 12) {
    singleRAF = window.requestAnimationFrame(tickSingle)
    return
  }
  singleStillFrames = 0
}

function startClusterTween(duration = 280): void {
  if (reduceMotion.value) {
    settleClustersSilently()
    return
  }
  const from = clusterNodes.map((node) => [node.x, node.y] as Point)
  const to = clusterNodes.map((node) => clusterHomes.get(node.id) ?? ([node.x, node.y] as Point))

  // 同一个起点的多颗（拆分）→ 沿圆周错开一点，形成「炸开」的起点
  for (let i = 0; i < clusterNodes.length; i += 1) {
    const sameStart = clusterNodes.filter(
      (node) => Math.hypot(node.x - from[i]![0], node.y - from[i]![1]) < 0.5,
    )
    if (sameStart.length < 2) continue
    const index = sameStart.indexOf(clusterNodes[i]!)
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sameStart.length
    from[i] = [from[i]![0] + Math.cos(angle) * 9, from[i]![1] + Math.sin(angle) * 9]
  }

  clusterNodes.forEach((node, i) => {
    node.x = from[i]![0]
    node.y = from[i]![1]
    node.vx = 0
    node.vy = 0
  })
  clusterTween = { from, to, started: performance.now(), duration }
  applyClusterOffsets()
  applyMarkerOffsets()

  if (clusterRAF !== null) window.cancelAnimationFrame(clusterRAF)
  clusterRAF = window.requestAnimationFrame(tickClusterTween)
}

function tickClusterTween(): void {
  clusterRAF = null
  if (!props.cluster || disposed || clusterTween === null) return
  const progress = Math.min(1, (performance.now() - clusterTween.started) / clusterTween.duration)
  const eased = 1 - (1 - progress) ** 3
  clusterNodes.forEach((node, i) => {
    const start = clusterTween!.from[i]!
    const target = clusterTween!.to[i]!
    node.x = start[0] + (target[0] - start[0]) * eased
    node.y = start[1] + (target[1] - start[1]) * eased
  })
  applyClusterOffsets()
  applyMarkerOffsets()

  if (progress < 1) {
    clusterRAF = window.requestAnimationFrame(tickClusterTween)
    return
  }
  clusterTween = null
  for (const node of clusterNodes) {
    node.vx = 0
    node.vy = 0
  }
}

function kickClusters(): void {
  if (reduceMotion.value) return
  // hover 要立刻接管：正在播的合并/拆分缓动先取消，
  // 否则它在下一帧发现 tween 为 null 就直接退出，hover 的力被吞掉。
  if (clusterRAF !== null) {
    window.cancelAnimationFrame(clusterRAF)
    clusterRAF = null
  }
  clusterTween = null
  clusterStillFrames = 0
  clusterRAF = window.requestAnimationFrame(tickClusters)
}

function tickClusters(): void {
  clusterRAF = null
  if (!props.cluster || disposed) return
  if (performance.now() < roamActiveUntil) {
    clusterRAF = window.requestAnimationFrame(tickClusters)
    return
  }

  const speed = stepBalls(clusterNodes, clusterHomes, {
    spring: 0.06,
    damping: 0.72,
    collide: CLUSTER_COLLIDE,
    contact: 0.12,
  })
  applyClusterOffsets()
  applyMarkerOffsets()

  if (speed < 0.02) clusterStillFrames += 1
  else clusterStillFrames = 0

  if (clusterStillFrames < 12) {
    clusterRAF = window.requestAnimationFrame(tickClusters)
    return
  }

  for (const node of clusterNodes) {
    node.vx = 0
    node.vy = 0
  }
  clusterStillFrames = 0
  clusterRAF = null
}

function stopClusterAnimation(): void {
  if (clusterRAF !== null) {
    window.cancelAnimationFrame(clusterRAF)
    clusterRAF = null
  }
  clusterStillFrames = 0
}

/**
 * 重画地标层。只替换 `series.data`（按 id 合并），不动 geo：
 * 用 notMerge 重建会把用户的缩放和拖拽状态一起清掉。
 */
function refreshMarkers(): void {
  const instance = chart.value
  if (instance === null || status.value !== 'ready') return

  if (props.cluster) {
    const groups = computeGroups(instance, clusterGapForWidth(container.value?.clientWidth ?? 0))
    const signature = groups
      .map((group) => [...group.ids].sort().join(','))
      .sort()
      .join('|')
    const selectedKey = props.selectedId ?? ''
    if (
      signature === '' ||
      signature !== lastClusterSignature ||
      selectedKey !== lastClusterSelected
    ) {
      lastClusterSignature = signature
      lastClusterSelected = selectedKey
      currentData = toScatterData(
        props.sites,
        props.selectedId,
        groups,
        themePalette(),
        FEATURED_ID_SET,
      )
    }
    syncClusters(instance, groups)
    syncSingleBalls(instance, groups)
    applyClusterOffsets()
    applySingleOffsets()
    applyMarkerOffsets()
    applyCityHighlight()
    return
  }

  stopClusterAnimation()
  clusterNodes = []
  clusterHomes = new Map()
  clusterMemberPositions = new Map()
  if (singleRAF !== null) window.cancelAnimationFrame(singleRAF)
  singleRAF = null
  singleBalls.clear()
  singleHomes.clear()

  // 不合并：每个项目单独画，重叠的交给「软碰撞小球的物理模拟」互相挤开一点
  currentData = toScatterData(
    props.sites,
    props.selectedId,
    undefined,
    themePalette(),
    FEATURED_ID_SET,
  )
  lastClusterSignature = ''
  syncBalls(instance)
  // 数据重建后必须把球的当前位置重新写回：否则选中/刷新会让所有球叠回原点（看起来「碰撞消失」）
  applyBalls()
  applyCityHighlight()
}

/**
 * 视野没变时只更新 home，保留球的当前位置与速度。
 *
 * 组件会因为选中、hover、resize 观察等再次 refreshMarkers；如果每次都把球重置回原点，
 * 已经停稳的球会周期性「跳」一下，看起来像永远在动。
 */
function syncBalls(instance: EChartsType): void {
  const homes = new Map<string, Point>()
  let same = balls.length === props.sites.length && balls.length > 0
  for (const site of props.sites) {
    const point = instance.convertToPixel({ geoIndex: 0 }, [site.location.lng, site.location.lat])
    if (!Array.isArray(point)) {
      same = false
      break
    }
    const [x, y] = point as [number, number]
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      same = false
      break
    }
    homes.set(site.id, [x, y])
    const previous = ballHomes.get(site.id)
    if (previous === undefined || Math.hypot(previous[0] - x, previous[1] - y) > 0.5) same = false
  }

  if (same) {
    ballHomes = homes
    return
  }

  // 视野变化（缩放/拖动）：球跟着 home 一起平移，保留当前的相对偏移，
  // 不能整组重置——否则用户缩放地图时刚挤出来的状态就没了。
  const sameIds =
    balls.length === props.sites.length &&
    props.sites.every((site) => balls.some((ball) => ball.id === site.id))
  if (sameIds) {
    for (const ball of balls) {
      const next = homes.get(ball.id)
      const previous = ballHomes.get(ball.id)
      if (next === undefined) continue
      if (previous === undefined) {
        ball.x = next[0]
        ball.y = next[1]
      } else {
        ball.x += next[0] - previous[0]
        ball.y += next[1] - previous[1]
      }
      ball.vx = 0
      ball.vy = 0
    }
    ballHomes = homes
    ballStillFrames = 0
    return
  }

  resetBalls(instance)
}

function resetBalls(instance: EChartsType): void {
  const homes = new Map<string, Point>()
  const next: BallState[] = []
  for (const site of props.sites) {
    const point = instance.convertToPixel({ geoIndex: 0 }, [site.location.lng, site.location.lat])
    if (!Array.isArray(point)) continue
    const [x, y] = point as [number, number]
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    homes.set(site.id, [x, y])
    next.push({ id: site.id, x, y, vx: 0, vy: 0 })
  }
  balls = next
  ballHomes = homes
  ballStillFrames = 0
  ballLastPos = new Map()
  // 初次落位不要在页面加载时逐帧 setOption：节流的手机上会变成几十个长任务（Lighthouse TBT 爆表）。
  // 先静默把物理跑到平衡，再一次性写入偏移。
  settleBallsSilently()
}

/** 不打 RAF、不渲染，只把物理跑到静止，然后一次性应用 */
function settleBallsSilently(): void {
  for (let i = 0; i < 240; i += 1) {
    const speed = stepBalls(balls, ballHomes, {
      spring: 0.06,
      damping: 0.72,
      collide: BALL_COLLIDE,
      contact: 0.12,
    })
    if (speed < 0.02) break
  }
  for (const ball of balls) {
    ball.vx = 0
    ball.vy = 0
  }
  ballLastPos = new Map(balls.map((ball) => [ball.id, [ball.x, ball.y] as [number, number]]))
  applyBalls()
}

function applyBalls(): void {
  const instance = chart.value
  if (instance === null) return
  const offsets = new Map<string, [number, number]>()
  for (const ball of balls) {
    const home = ballHomes.get(ball.id)
    if (home === undefined) continue
    const dx = ball.x - home[0]
    const dy = ball.y - home[1]
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) offsets.set(ball.id, [dx, dy])
  }
  const data = currentData.map((datum) => {
    const offset = 'siteId' in datum ? offsets.get(datum.siteId) : undefined
    return offset === undefined ? datum : { ...datum, symbolOffset: offset }
  })
  instance.setOption({ series: [{ id: 'sites', data }] })
}

function kickBalls(): void {
  if (ballRAF !== null) return
  ballStillFrames = 0
  ballRAF = window.requestAnimationFrame(tickBalls)
}

function tickBalls(): void {
  ballRAF = null
  if (props.cluster || disposed) return
  // 拖动/缩放期间让路：ECharts 自己在重绘地图，这时候每一步物理再 setOption 一次会抢帧
  if (performance.now() < roamActiveUntil) {
    ballRAF = window.requestAnimationFrame(tickBalls)
    return
  }

  const previous = ballLastPos
  const speed = stepBalls(balls, ballHomes, {
    spring: 0.06,
    damping: 0.72,
    collide: BALL_COLLIDE,
    contact: 0.12,
  })
  applyBalls()

  let maxStep = 0
  const positions = new Map<string, [number, number]>()
  for (const ball of balls) {
    positions.set(ball.id, [ball.x, ball.y])
    const before = previous.get(ball.id)
    if (before !== undefined) {
      maxStep = Math.max(maxStep, Math.hypot(ball.x - before[0], ball.y - before[1]))
    }
  }
  ballLastPos = positions

  // 只有「真的不动了」才冻结：速度与位移都足够小连续 15 帧。
  // 不设时间上限——停下是阻尼 + 非弹性接触把动能磨掉的结果，不是被强制截断。
  if (speed < 0.02 && maxStep < 0.02) {
    ballStillFrames += 1
  } else {
    ballStillFrames = 0
  }

  if (ballStillFrames < 15) {
    ballRAF = window.requestAnimationFrame(tickBalls)
    return
  }

  for (const ball of balls) {
    ball.vx = 0
    ball.vy = 0
  }
  ballStillFrames = 0
  ballRAF = null
}

/** 鼠标滑过小球：朝指针反方向「带一下」，随后被弹簧拉回 */
function handlePointerMove(params: unknown): void {
  const event = (params as { event?: { offsetX?: number; offsetY?: number } }).event
  if (typeof event?.offsetX !== 'number' || typeof event?.offsetY !== 'number') return
  const now = performance.now()
  if (pointerLast !== null) {
    const dt = Math.max(8, now - pointerLast.t)
    pointerSpeed = Math.hypot(event.offsetX - pointerLast.x, event.offsetY - pointerLast.y) / dt
  }
  pointerLast = { x: event.offsetX, y: event.offsetY, t: now }
}

/**
 * 鼠标滑过小球时的「带一下」。
 *
 * 力度跟鼠标滑动速度走：慢慢移过去只是轻轻碰一下（约 0.6），快速划过最多到当前手感的 6，
 * 避免每颗球都夸张地弹开。方向仍然背离指针。
 */
function handleMarkerHover(params: unknown): void {
  const payload = params as {
    seriesId?: string
    data?: { siteId?: string; clusterIds?: string[] }
    event?: { offsetX?: number; offsetY?: number }
  }
  if (payload.seriesId !== 'sites') return
  if (reduceMotion.value) return

  const now = performance.now()
  const pointer: Point = [payload.event?.offsetX ?? 0, payload.event?.offsetY ?? 0]
  if (pointerLast === null || now - pointerLast.t > 150) return
  if (pointerSpeed < 0.06) return

  const clusterIds = payload.data?.clusterIds
  if (Array.isArray(clusterIds) && clusterIds.length > 1) {
    const key = markerClusterKey(clusterIds)
    const node = clusterNodes.find((item) => item.id === key)
    if (node === undefined) return
    if (now - (ballNudgeAt.get(key) ?? 0) < 260) return
    ballNudgeAt.set(key, now)
    const strength = Math.min(6, 0.8 + pointerSpeed * 2)
    nudgeBall(node, [pointer[0] || node.x, pointer[1] || node.y], strength)
    kickClusters()
    return
  }

  const id = payload.data?.siteId
  if (typeof id !== 'string') return
  const ball = props.cluster ? singleBalls.get(id) : balls.find((item) => item.id === id)
  if (ball === undefined) return
  if (now - (ballNudgeAt.get(id) ?? 0) < 260) return
  ballNudgeAt.set(id, now)
  const strength = Math.min(6, 0.8 + pointerSpeed * 2)
  nudgeBall(ball, [pointer[0] || ball.x, pointer[1] || ball.y], strength)
  if (props.cluster) kickSingle()
  else kickBalls()
}

/** 鼠标划过地标/簇时，把对应城市告诉外面（城市索引反向高亮） */
let lastMarkerCity: string | null = null
function emitMarkerCity(city: string | null): void {
  if (city === lastMarkerCity) return
  lastMarkerCity = city
  emit('marker-hover', city)
}

function cityForIds(ids: readonly string[]): string | null {
  const cities = new Set<string>()
  for (const id of ids) {
    const site = props.sites.find((item) => item.id === id)
    if (site !== undefined) cities.add(site.city)
  }
  return cities.size === 1 ? ([...cities][0] ?? null) : null
}

function handleMarkerCityHover(params: unknown): void {
  const payload = params as {
    seriesId?: string
    data?: { siteId?: string; clusterIds?: string[] }
  }
  if (payload.seriesId !== 'sites') return
  const clusterIds = payload.data?.clusterIds
  if (Array.isArray(clusterIds) && clusterIds.length > 1) {
    emitMarkerCity(cityForIds(clusterIds))
    return
  }
  const siteId = payload.data?.siteId
  if (typeof siteId !== 'string') return
  const site = props.sites.find((item) => item.id === siteId)
  emitMarkerCity(site?.city ?? null)
}

function handleMarkerCityOut(params: unknown): void {
  const payload = params as { seriesId?: string }
  if (payload.seriesId !== undefined && payload.seriesId !== 'sites') return
  emitMarkerCity(null)
}

/** 选中项目 → 对应市域高亮 1.1s，之后回到 hover 状态 */
watch(
  () => props.selectedId,
  (id) => {
    pulseCity.value =
      id === null ? null : (props.sites.find((item) => item.id === id)?.city ?? null)
    if (status.value === 'ready') applyCityHighlight()
  },
)

function scheduleRoamRefresh(): void {
  if (roamRefreshTimer !== null) window.clearTimeout(roamRefreshTimer)
  // 拖动/缩放停下后再做夹取、图层切换与数据重算：
  // ECharts 的 georoam 会按指针频率触发，逐帧 getOption + setOption 是手机上掉帧的主因
  roamRefreshTimer = window.setTimeout(() => {
    roamRefreshTimer = null
    liveZoom = false
    const instance = chart.value
    if (instance === null || disposed) return

    const { center, zoom } = geoState()
    zoomLevel.value = Number(zoom.toFixed(2))
    syncLayerMode()

    const [clampedX, clampedY] = clampCenter(center)
    if (clampedX !== center[0] || clampedY !== center[1]) {
      clampingCenter = true
      instance.setOption({ geo: { center: [clampedX, clampedY], zoom } })
      clampingCenter = false
    }

    refreshMarkers()
    if (props.cluster) settleClustersSilently()
  }, 140)
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
          borderWidth: 1.3,
        },
        // hover 只加深描边、保持档位底色：铺灰底会把压在上面的河道盖成一片灰，
        // 变回原色则会让深色市在悬停时「变浅」，两者都会破坏 choropleth 的读法
        // hover 保留档位底色（否则城市变透明会露出页面背景）：
        // 湖面已经改成画在 geo 之上的 custom 系列，不会被这一层重绘盖住。
        emphasis: {
          itemStyle: {
            areaColor,
            borderColor: paletteNow.mapLabel,
            borderWidth: 1.6,
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
      const instance = echarts.init(container.value, undefined, {
        renderer: 'canvas',
        // 手机上 DPR 常 3+：整块 canvas 每帧按物理像素重绘，拖图会明显掉帧；
        // 封顶 2 倍，肉眼几乎无差，填充率直接降到 1/2～1/3
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      })
      instance.on('click', handleChartClick)
      instance.on('mouseover', handleMarkerHover)
      instance.on('mouseover', handleMarkerCityHover)
      instance.on('globalout', handleMarkerCityOut)
      instance.on('mousemove', handlePointerMove)
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
    lastClusterSignature = ''
    refreshMarkers()
    applyCityHighlight()

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
  container.value.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true })
  container.value.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false })
  container.value.addEventListener('touchend', handleTouchEnd, { capture: true })
  container.value.addEventListener('touchcancel', handleTouchEnd, { capture: true })
  handleResize()
})

onBeforeUnmount(() => {
  disposed = true
  resizeObserver?.disconnect()
  resizeObserver = null
  if (refreshHandle !== null) window.cancelAnimationFrame(refreshHandle)
  if (roamRefreshTimer !== null) window.clearTimeout(roamRefreshTimer)
  if (zoomTween !== null) window.cancelAnimationFrame(zoomTween)
  chart.value?.off('georoam', handleGeoRoam)
  if (container.value !== null) {
    container.value.removeEventListener('touchstart', handleTouchStart, { capture: true })
    container.value.removeEventListener('touchmove', handleTouchMove, { capture: true })
    container.value.removeEventListener('touchend', handleTouchEnd, { capture: true })
    container.value.removeEventListener('touchcancel', handleTouchEnd, { capture: true })
  }
  chart.value?.off('mouseover', handleMarkerHover)
  chart.value?.off('mouseover', handleMarkerCityHover)
  chart.value?.off('globalout', handleMarkerCityOut)
  chart.value?.off('mousemove', handlePointerMove)
  if (ballRAF !== null) {
    window.cancelAnimationFrame(ballRAF)
    ballRAF = null
  }
  stopClusterAnimation()
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
