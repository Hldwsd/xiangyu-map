/**
 * GeoJSON 的最小必要结构。
 *
 * ECharts 的 registerMap 需要完整的 GeoJSON 类型，但那是第三方库的内部类型，
 * 我们不复制它；这里只描述实际用到的字段，转换在 services/china-map-loader.ts 收口。
 */

export interface GeoJsonGeometry {
  type: string
  coordinates: unknown
}

export interface GeoJsonFeature {
  type: 'Feature'
  properties: Record<string, unknown> | null
  geometry: GeoJsonGeometry | null
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}
