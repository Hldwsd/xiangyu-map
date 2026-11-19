import { ANHUI_CITIES, type AnhuiCity } from '@/types/site'

/**
 * 安徽省经纬度外包框，由 `public/maps/anhui.json` 的几何范围（114.88–119.65°E /
 * 29.40–34.65°N）留出约 0.1° 余量得到。
 *
 * 只用来拦住「坐标落在外省」「经纬度写反」这类错误，不判断点位是否真的落在岸上——
 * 那种精度需要底图参与，不在数据校验的职责里。
 */
export const ANHUI_BBOX = {
  minLng: 114.8,
  maxLng: 119.75,
  minLat: 29.3,
  maxLat: 34.75,
} as const

const CITY_SET: ReadonlySet<string> = new Set(ANHUI_CITIES)

/** 类型收窄：判断字符串是否为 16 个地级市之一 */
export function isAnhuiCity(value: string): value is AnhuiCity {
  return CITY_SET.has(value)
}
