import type { GeoJsonFeatureCollection, GeoJsonFeature } from '@/types/geo'

export type MapLayer = 'city' | 'district' | 'water'

export interface TaggedFeature extends GeoJsonFeature {
  properties: Record<string, unknown> & { layer: MapLayer }
}

/** 合并三层底图为一份 FeatureCollection，并给每个要素打上 layer 标记 */
export function mergeMapLayers(
  city: GeoJsonFeatureCollection,
  districts: GeoJsonFeatureCollection | null,
  water: GeoJsonFeatureCollection | null,
): { type: 'FeatureCollection'; features: TaggedFeature[] } {
  const tag = (features: GeoJsonFeature[] | undefined, layer: MapLayer): TaggedFeature[] =>
    (features ?? []).map((feature) => ({
      ...feature,
      properties: { ...(feature.properties ?? {}), layer },
    }))

  // 顺序即绘制顺序：市域铺底 → 水域 → 区县界线
  return {
    type: 'FeatureCollection',
    features: [
      ...tag(city.features, 'city'),
      ...tag(water?.features, 'water'),
      ...tag(districts?.features, 'district'),
    ],
  }
}

export function featureName(feature: TaggedFeature): string | null {
  const name = feature.properties['name']
  return typeof name === 'string' ? name : null
}
