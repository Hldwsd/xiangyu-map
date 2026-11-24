import { expect, test } from '@playwright/test'

/**
 * 品牌页（/brand/）冒烟：入口打得开、数据节点齐全、没有运行时错误。
 *
 * 动效节奏不在这里断言——逐帧动画在 CI 上不可靠，靠人工验收；
 * 这里只保证「页面结构没坏、数字没漂、回到地图的链接没断」。
 */
test('品牌页：首屏、地图点数与各分节都渲染出来', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/brand/')

  await expect(page).toHaveTitle(/乡遇安徽 · 七十处山水尽收一卷/)
  await expect(page.locator('.loader')).toHaveCount(0)

  // 标识：顶栏、首屏印章、页脚都用同一枚「乡」印
  await expect(page.locator('.brand__logo')).toBeVisible()
  await expect(page.locator('.hero__seal')).toBeVisible()
  if (test.info().project.name === 'desktop') {
    await expect(page.locator('.scrollbar__thumb')).toBeVisible()
  }

  await expect(page.locator('.hero__title .char')).toHaveCount(4)
  await expect(page.locator('.map__dot')).toHaveCount(70)
  await expect(page.locator('.map__city-dot')).toHaveCount(16)
  await expect(page.locator('.panel')).toHaveCount(6)
  await expect(page.locator('.city__row')).toHaveCount(16)
  await expect(page.locator('.craft')).toHaveCount(7)

  // 品牌页 → 地图：相对路径 ../ 在任何 base 下都回到主站
  await expect(page.locator('.cta')).toHaveAttribute('href', '../')
  await expect(page.locator('.topbar__enter')).toHaveAttribute('href', '../')

  expect(errors).toEqual([])
})

test('品牌页：窄屏没有横向溢出，页内锚点可达', async ({ page }) => {
  await page.goto('/brand/')
  await expect(page.locator('.panel')).toHaveCount(6)

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)

  // 窄屏导航收在顶栏里，只测桌面锚点
  test.skip(test.info().project.name === 'mobile', '窄屏隐藏页内导航')
  await page.getByRole('link', { name: /十六城/ }).click()
  await expect(page.locator('#cities')).toBeInViewport()
})

test('品牌页：刷新从顶端重播，不恢复上次位置', async ({ page }) => {
  await page.goto('/brand/')
  await expect(page.locator('.panel')).toHaveCount(6)

  await page.evaluate(() => window.scrollTo(0, 3200))
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1000)

  await page.reload()
  await expect(page.locator('.panel')).toHaveCount(6)
  const scrollY = await page.evaluate(() => Math.round(window.scrollY))
  expect(scrollY).toBeLessThan(20)
})

test('品牌页：风物抽屉按实际数量换图，点照片置顶', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', '窄屏没有图片抽屉')
  await page.goto('/brand/')

  const stack = page.locator('[data-craft-stack]')
  await expect(stack).toHaveAttribute('data-photo-count', '3')

  // 用程序化点击激活「演艺」：真实 hover 后，浏览器会在滚动后重新计算指针下的行，
  // 测试里指针位置固定，容易被滚动带偏到下一行。
  await page
    .locator('.craft__row')
    .nth(4)
    .evaluate((element) => (element as HTMLElement).click())
  await expect(stack).toHaveAttribute('data-photo-count', '1')
  await expect(page.locator('[data-craft-name]')).toHaveText('演艺')
  await expect(page.locator('.craft-drawer__photo:not([hidden])')).toHaveCount(1)

  // 回到古镇：点背面的照片，它应该被抽到最前，类别不变
  await page
    .locator('.craft__row')
    .nth(0)
    .evaluate((element) => (element as HTMLElement).click())
  await expect(page.locator('[data-craft-name]')).toHaveText('古镇')

  const backSrc = await page.locator('.craft-drawer__photo--back img').getAttribute('src')
  expect(backSrc).toBeTruthy()
  await page
    .locator('.craft-drawer__photo--back')
    .evaluate((element) => (element as HTMLElement).click())
  await expect(page.locator('.craft-drawer__photo--front img')).toHaveAttribute(
    'src',
    backSrc ?? '',
  )
  await expect(page.locator('[data-craft-name]')).toHaveText('古镇')
})
