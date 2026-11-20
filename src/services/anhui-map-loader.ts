import type { GeoJsonFeatureCollection } from '@/types/geo'

/** ECharts 里注册的地图名，geo.map / series.map 必须与它一致 */
export const ANHUI_MAP_NAME = 'anhui'
/** 市域 + 水域 + 区县的合并底图（区县是后加载的，所以用第二个名字重新注册） */
export const ANHUI_FULL_MAP_NAME = 'anhui-full'
/** 区县界（只做底图纹理，不参与交互） */
export const ANHUI_DISTRICTS_MAP_NAME = 'anhui-districts'
/** 主要湖泊水面 */
export const ANHUI_WATER_MAP_NAME = 'anhui-water'

/** 底图放在 public 下，运行时按需下载，不打进 JS bundle */
export const ANHUI_MAP_URL = `${import.meta.env.BASE_URL}maps/anhui.json`
export const ANHUI_DISTRICTS_URL = `${import.meta.env.BASE_URL}maps/anhui-districts.json`
export const ANHUI_WATER_URL = `${import.meta.env.BASE_URL}maps/anhui-water.json`
export const ANHUI_OUTLINE_URL = `${import.meta.env.BASE_URL}maps/anhui-outline.json`
export const ANHUI_RIVERS_URL = `${import.meta.env.BASE_URL}maps/anhui-rivers.json`

export class MapDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MapDataError'
  }
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { type?: unknown; features?: unknown }
  return (
    candidate.type === 'FeatureCollection' &&
    Array.isArray(candidate.features) &&
    candidate.features.length > 0
  )
}

async function fetchGeoJson(url: string, label: string): Promise<GeoJsonFeatureCollection> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new MapDataError(`${label}加载失败：HTTP ${response.status}`)
  }

  const data: unknown = await response.json()
  if (!isFeatureCollection(data)) {
    throw new MapDataError(`${label}格式不正确：缺少 FeatureCollection.features`)
  }

  return data
}

const cache = new Map<string, Promise<GeoJsonFeatureCollection>>()

function load(url: string, label: string): Promise<GeoJsonFeatureCollection> {
  const existing = cache.get(url)
  if (existing !== undefined) return existing

  const request = fetchGeoJson(url, label).catch((error: unknown) => {
    cache.delete(url)
    throw error instanceof MapDataError
      ? error
      : new MapDataError(`${label}加载失败：网络或解析错误`)
  })
  cache.set(url, request)
  return request
}

/**
 * 加载安徽省底图 GeoJSON，同一会话内只请求一次。
 * 失败时会清空缓存，调用方（组件里的「重试」）可以再次触发真正的重新请求。
 */
export function loadAnhuiMap(): Promise<GeoJsonFeatureCollection> {
  return load(ANHUI_MAP_URL, '底图')
}

/** 区县界：装饰层，失败不应该拖垮整张地图（调用方自行 catch） */
export function loadAnhuiDistricts(): Promise<GeoJsonFeatureCollection> {
  return load(ANHUI_DISTRICTS_URL, '区县界')
}

/** 主要湖泊水面：同上，缺了只是少一层纹理 */
export function loadAnhuiWater(): Promise<GeoJsonFeatureCollection> {
  return load(ANHUI_WATER_URL, '水域')
}

/** 长江/淮河河道线：同上，缺了只是少一层纹理 */
export function loadAnhuiRivers(): Promise<GeoJsonFeatureCollection> {
  return load(ANHUI_RIVERS_URL, '河道')
}

/** 省界轮廓：给省域画一圈向外渐隐的边框，缺了只是少一圈托底 */
export function loadAnhuiOutline(): Promise<GeoJsonFeatureCollection> {
  return load(ANHUI_OUTLINE_URL, '省界')
}

/** 仅供测试使用：清空模块级缓存 */
export function resetAnhuiMapCache(): void {
  cache.clear()
}
