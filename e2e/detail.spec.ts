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
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /\/og\/sites\/huangshan-scenic\.jpg$/,
  )
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    /黄山风景区/,
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/site\/huangshan-scenic/,
  )
})

test('分享弹层展示专属卡片，非头部项目用生成卡片', async ({ page }) => {
  await page.goto('/site/huangshan-scenic/')
  await page.getByRole('button', { name: '分享' }).click()

  const dialog = page.getByRole('dialog', { name: '分享这张卡片' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: '关闭分享' })).toBeFocused()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await expect(dialog.locator('img')).toHaveAttribute('src', /\/og\/sites\/huangshan-scenic\.jpg$/)

  await page.keyboard.press('Shift+Tab')
  await expect
    .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true)
  await expect(page.getByRole('button', { name: '关闭分享' })).not.toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: '关闭分享' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: '分享' })).toBeFocused()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')

  await page.goto('/site/chaohu/')
  await page.getByRole('button', { name: '分享' }).click()
  await expect(page.getByRole('dialog').locator('img')).toHaveAttribute(
    'src',
    /\/og\/sites\/chaohu\.jpg$/,
  )
})
