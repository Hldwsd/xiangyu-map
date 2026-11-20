import type { GeoJsonFeatureCollection, GeoJsonFeature } from '@/types/geo'

export type MapLayer = 'outline' | 'city' | 'district' | 'water'

export interface TaggedFeature extends GeoJsonFeature {
  properties: Record<string, unknown> & { layer: MapLayer }
}

/** 合并三层底图为一份 FeatureCollection，并给每个要素打上 layer 标记 */
export function mergeMapLayers(
  city: GeoJsonFeatureCollection,
  districts: GeoJsonFeatureCollection | null,
  water: GeoJsonFeatureCollection | null,
  outline: GeoJsonFeatureCollection | null = null,
): { type: 'FeatureCollection'; features: TaggedFeature[] } {
  const tag = (features: GeoJsonFeature[] | undefined, layer: MapLayer): TaggedFeature[] =>
    (features ?? []).map((feature) => ({
      ...feature,
      properties: { ...(feature.properties ?? {}), layer },
    }))

  /*
   * 省界托底：同一份省界几何复制三份，分别给「最外最浅 → 最里最深」三种描边。
   * ECharts 的描边是沿路径居中的，市域白底后画会盖掉向内的一半，只剩向外的光晕，
   * 视觉上就是省域外面一圈由浅到深的边框。
   */
  const outlineFeatures: TaggedFeature[] = []
  const province = outline?.features?.[0]
  if (province !== undefined) {
    for (const ring of [1, 2, 3] as const) {
      outlineFeatures.push({
        ...province,
        properties: {
          ...(province.properties ?? {}),
          name: `省界 ${ring}`,
          layer: 'outline',
          ring,
        },
      })
    }
  }

  // 顺序即绘制顺序：省界光晕 → 市域铺底 → 水域 → 区县界线
  return {
    type: 'FeatureCollection',
    features: [
      ...outlineFeatures,
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
