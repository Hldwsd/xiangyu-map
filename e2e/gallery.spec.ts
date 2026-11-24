import { expect, test } from '@playwright/test'

/**
 * 分享图集（/gallery/）冒烟：WebGL 画布、七十张无障碍入口、
 * 七十张矩阵地图（桌面滚到地图段；移动端静态矩阵）。
 */
test('分享图集：竖螺旋与安徽矩阵', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/gallery/')

  await expect(page).toHaveTitle(/分享图集 · 乡遇安徽/)
  await expect(page.locator('.gallery__title')).toBeVisible()
  await expect(page.locator('.sr-only a')).toHaveCount(70)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  if (test.info().project.name === 'desktop') {
    await expect(page.locator('.stage__canvas')).toBeVisible()
    // ScrollTrigger 插入 pin-spacer 后，文档高度才包含 320% 的 pin 行程。
    await page.waitForSelector('.pin-spacer')
    const stageTop = await page.evaluate(
      () => document.querySelector('.gallery__stage')?.getBoundingClientRect().top ?? 0,
    )
    await page.evaluate(
      (top) => window.scrollTo(0, window.scrollY + top + window.innerHeight * 2.75),
      stageTop,
    )
    await page.waitForFunction(
      () =>
        document.querySelector('.stage__map-caption')?.classList.contains('is-visible') === true,
      undefined,
      { timeout: 10_000 },
    )
    await expect(page.locator('.stage__map-title')).toContainText('拼成安徽')
    await expect(page.locator('.stage__hud')).toHaveClass(/is-hidden/)
  } else {
    await expect(page.locator('.matrix__cell')).toHaveCount(78)
    await expect(page.locator('.matrix__cell img')).toHaveCount(70)
  }

  expect(errors).toEqual([])
})
