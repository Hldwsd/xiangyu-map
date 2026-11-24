import { createRouter, createWebHistory } from 'vue-router'

import { sites } from '@/data/sites'
import { applyPageMeta, SITE_TITLE } from '@/utils/page-meta'
import HomeView from '@/views/HomeView.vue'

const HOME_DESCRIPTION = `在安徽省地图上浏览 ${sites.length} 个古镇、非遗、红色、自然、演艺、乡村与场馆项目，按 16 个地级市划分。`

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/site/:id',
      name: 'site-detail',
      // 详情页不在首屏路径上，按需加载
      component: () => import('@/views/SiteDetailView.vue'),
      props: true,
    },
    {
      path: '/gallery',
      name: 'gallery',
      // 分享图集是独立的重动效页面，不进首屏
      component: () => import('@/views/GalleryView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'home' },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

/**
 * 静态 HTML 的 title/OG 由 prerender 生成；这里补 SPA 内跳转时的浏览器标题，
 * 否则从首页点进详情后，分享扩展/浏览器标签仍停留在首页文案。
 */
router.afterEach((to) => {
  if (to.name === 'site-detail') {
    const rawId = to.params.id
    const id = Array.isArray(rawId) ? rawId[0] : rawId
    const site = sites.find((item) => item.id === id)
    if (site === undefined) {
      applyPageMeta('没有找到这个项目 · 乡遇安徽', '链接可能已经失效，或者该项目已从数据中移除。')
    } else {
      applyPageMeta(`${site.name} · 乡遇安徽`, site.summary)
    }
    return
  }
  if (to.name === 'gallery') {
    applyPageMeta(
      '分享图集 · 乡遇安徽',
      `70 张分享卡排成一面墙：十张精选沿竖螺旋转动，最后落回全部 ${sites.length} 张分享图的矩阵里。`,
    )
    return
  }
  applyPageMeta(SITE_TITLE, HOME_DESCRIPTION)
})

export default router
