import { expect, test } from '@playwright/test'

test('详情深链：黄山风景区直接打开，保留决策信息与高德入口', async ({ page }) => {
  await page.goto('/site/huangshan-scenic/')

  await expect(page.getByRole('heading', { level: 1, name: '黄山风景区' })).toBeVisible()
  await expect(page.getByText('建议停留')).toBeVisible()
  await expect(page.getByText('适合')).toBeVisible()
  await expect(page.getByRole('link', { name: /在高德地图查看位置/ })).toBeVisible()
})

test('详情页预渲染 meta 可被爬虫直接读到', async ({ page }) => {
  await page.goto('/site/huangshan-scenic/')

  await expect(page).toHaveTitle(/黄山风景区/)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /黄山风景区/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/site\/huangshan-scenic/,
  )
})
