import type { GeoJsonFeatureCollection } from '@/types/geo'

/** ECharts 里注册的地图名，geo.map / series.map 必须与它一致 */
export const ANHUI_MAP_NAME = 'anhui'

/** 底图放在 public 下，运行时按需下载，不打进 JS bundle */
export const ANHUI_MAP_URL = `${import.meta.env.BASE_URL}maps/anhui.json`

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

let pending: Promise<GeoJsonFeatureCollection> | null = null

async function fetchAnhuiMap(): Promise<GeoJsonFeatureCollection> {
  const response = await fetch(ANHUI_MAP_URL)

  if (!response.ok) {
    throw new MapDataError(`底图加载失败：HTTP ${response.status}`)
  }

  const data: unknown = await response.json()
  if (!isFeatureCollection(data)) {
    throw new MapDataError('底图格式不正确：缺少 FeatureCollection.features')
  }

  return data
}

/**
 * 加载安徽省底图 GeoJSON，同一会话内只请求一次。
 * 失败时会清空缓存，调用方（组件里的「重试」）可以再次触发真正的重新请求。
 */
export function loadAnhuiMap(): Promise<GeoJsonFeatureCollection> {
  pending ??= fetchAnhuiMap().catch((error: unknown) => {
    pending = null
    throw error instanceof MapDataError ? error : new MapDataError('底图加载失败：网络或解析错误')
  })

  return pending
}

/** 仅供测试使用：清空模块级缓存 */
export function resetAnhuiMapCache(): void {
  pending = null
}
