import { ANHUI_CITIES, type AnhuiCity } from '@/types/site'

/**
 * 安徽省经纬度外框，取自 `public/maps/anhui.json` 的几何范围（实测：
 * 114.883371–119.649144°E / 29.395253–34.650809°N）。
 *
 * 两处外框收敛到同一份常数：数据校验用这里（`src/utils/site-validation.ts`），
 * 地图视野夹取用 `AnhuiMap.vue` 的 FALLBACK_BBOX，修改后请同步更新两边。
 *
 * 只用来拦住「坐标落在外省」「经纬度写反」这类错误，不判断点位是否真的落在岸上——
 * 那种精度需要底图参与（scripts/check-sites-map.mjs 用底图轮廓做这件事）。
 */
export const ANHUI_BBOX = {
  minLng: 114.883371,
  maxLng: 119.649144,
  minLat: 29.395253,
  maxLat: 34.650809,
} as const

const CITY_SET: ReadonlySet<string> = new Set(ANHUI_CITIES)

/** 类型收窄：判断字符串是否为 16 个地级市之一 */
export function isAnhuiCity(value: string): value is AnhuiCity {
  return CITY_SET.has(value)
}
