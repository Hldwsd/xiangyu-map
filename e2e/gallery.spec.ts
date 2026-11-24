import { expect, test } from '@playwright/test'

/**
 * 分享图集（/gallery/）冒烟：十张螺旋卡、七十张矩阵、精选格、无横向溢出。
 * 逐帧 3D 旋转不在 CI 里断言——靠人工验收；这里只保证结构与加载没坏。
 */
test('分享图集：十张螺旋 + 七十张矩阵', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/gallery/')

  await expect(page).toHaveTitle(/分享图集 · 乡遇安徽/)
  await expect(page.locator('.gallery__title')).toBeVisible()
  await expect(page.locator('.helix-card')).toHaveCount(10)
  await expect(page.locator('.matrix__cell')).toHaveCount(78)
  await expect(page.locator('.matrix__cell.is-featured')).toHaveCount(1)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  if (test.info().project.name === 'desktop') {
    const stageTop = await page.evaluate(
      () => document.querySelector('.gallery__stage')?.getBoundingClientRect().top ?? 0,
    )
    await page.evaluate((top) => window.scrollTo(0, window.scrollY + top + 2600), stageTop)
    await page.waitForFunction(
      () => Number(getComputedStyle(document.querySelector('.matrix') as Element).opacity) > 0.95,
    )
    await expect(page.locator('.matrix__cell.is-featured')).toBeVisible()
    await expect(page.locator('.matrix__label')).toBeVisible()
  }

  // 矩阵图片在进入图廊后才挂 src；移动端静态模式在挂载时就有
  await expect(page.locator('.matrix__cell img')).toHaveCount(70)

  expect(errors).toEqual([])
})
