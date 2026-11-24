import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import HomeView from '@/views/HomeView.vue'
import { useSitesStore } from '@/stores/sites'

/**
 * 本文只验证 HomeView 把「搜索结果」正确传给地图（AnhuiMap 的 targetSiteId）：
 * 具体的平移/缩放在 AnhuiMap 里（ECharts 依赖，不在 jsdom 里测）。
 */
const AnhuiMapStub = {
  name: 'AnhuiMap',
  props: ['sites', 'selectedId', 'showDistricts', 'cluster', 'highlightCity', 'targetSiteId'],
  emits: ['marker-hover', 'select'],
  template: '<div class="anhui-map-stub" />',
}

describe('HomeView：搜索结果定位地图', () => {
  it('有搜索命中时 targetSiteId 是第一条结果，清空后回 null', async () => {
    setActivePinia(createPinia())
    const store = useSitesStore()
    const wrapper = mount(HomeView, { global: { stubs: { AnhuiMap: AnhuiMapStub } } })

    const map = wrapper.findComponent({ name: 'AnhuiMap' })
    expect(map.props('targetSiteId')).toBeNull()

    store.setQuery('黄山')
    await nextTick()
    const firstHit = store.filteredSites[0]?.id ?? null
    expect(firstHit).not.toBeNull()
    expect(map.props('targetSiteId')).toBe(firstHit)

    store.setQuery('')
    await nextTick()
    expect(map.props('targetSiteId')).toBeNull()
  })
})
