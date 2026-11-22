import { expect, test } from '@playwright/test'

test('首页：地图、搜索入口与 70 条计数', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('searchbox', { name: '搜索文旅项目' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^项目列表/ })).toContainText('70')
  await expect(page.getByRole('img', { name: /安徽省地图/ })).toBeVisible()

  // 窄屏版头收在抽屉里，不在首屏断言 h1。
  if (test.info().project.name === 'desktop') {
    await expect(page.getByRole('heading', { level: 1, name: /乡.*遇.*安.*徽/ })).toBeVisible()
  }
})

test('城市筛选：黄山 13 条，可回到全部 70 条', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', '移动端筛选在左右抽屉里，另测')

  await page.goto('/')
  await page.getByRole('button', { name: '黄山 13' }).click()
  await expect(page.getByRole('button', { name: /^项目列表/ })).toContainText('13')

  // “全部 70”只重置分类，不重置城市；刷新回到初始状态。
  await page.reload()
  await expect(page.getByRole('button', { name: /^项目列表/ })).toContainText('70')
})

test('搜索“古城”后，项目列表出现对应条目', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', '移动端搜索结果在列表抽屉里，另测')

  await page.goto('/')
  await page.getByRole('searchbox', { name: '搜索文旅项目' }).fill('古城')
  await page.getByRole('button', { name: /^项目列表/ }).click()

  const list = page.getByRole('dialog', { name: '项目列表' })
  await expect(list).toBeVisible()
  await expect(list).toContainText('徽州古城')
  await expect(list).toContainText('歙县古城墨砚博物馆')
})
