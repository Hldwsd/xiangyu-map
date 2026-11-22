/**
 * 高德精确 POI 短链，按 site id 索引。
 *
 * 不按经纬度拼 marker 链接：坐标是千米级精度，高德侧未必能匹配到正确的 POI；
 * 短链是人工核对过的地点页，打开就是「徽州古城」而不是一个坐标点。
 * 没有条目的项目，详情页会退化为「名称 + 城市」搜索，仍然不使用经纬度。
 */
export const AMAP_SITE_URLS: Readonly<Record<string, string>> = {
  'huizhou-ancient-city': 'https://surl.amap.com/8bM7orMB7A0',
}
