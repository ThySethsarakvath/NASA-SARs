import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

test('loads team exports by default with date/radar/season selection in the existing explorer', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?page=explore')
  await expect(page.getByText('Derived exports · source provenance and validation pending')).toBeVisible()
  await expect(page.locator('.map-workspace')).toHaveAttribute('data-map-state', 'ready')
  await page.locator('.prepared-controls summary').click()
  await expect(page.getByLabel('Before export date').locator('option')).toHaveCount(11)
  await page.getByLabel('Before export date').selectOption('2026-07-01')
  await page.getByLabel('After export date').selectOption('2026-10-05')
  await expect(page.getByRole('switch')).toBeDisabled()
  await page.getByLabel('Display type').selectOption('radar')
  await expect(page).toHaveURL(/display=radar/)
  await expect(page.locator('.control-deck')).toContainText('Low display value')
  for (const id of ['frequency', 'water_class', 'change']) {
    await page.getByLabel('Data layer', { exact: true }).selectOption(id)
    await expect(page.locator('.map-workspace')).toHaveAttribute('data-layer', id)
    await expect(page.locator('.map-workspace')).toHaveAttribute('data-map-state', 'ready')
    await expect(page.getByRole('button', { name: 'Before', exact: true })).toBeDisabled()
  }
  await page.reload()
  await expect(page.locator('.map-workspace')).toHaveAttribute('data-layer', 'change')
  await expect(page.getByText('Real observations', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: 'output/playwright/team-data-desktop.png' })
  expect(errors).toEqual([])
})

test('offers the imported data and reported figures on mobile with explicit provenance', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?page=explore&case=tonle-sap-2026')
  await expect(page.getByRole('button', { name: 'After', exact: true })).toBeEnabled()
  await page.locator('.prepared-controls summary').click()
  await page.getByLabel('After export date').selectOption('2026-10-05')
  await page.locator('.prepared-controls summary').click()
  await page.getByRole('button', { name: 'Open evidence panel' }).click()
  await page.getByRole('button', { name: 'Data & method', exact: true }).click()
  await page.locator('.reported-series summary').click()
  await expect(page.getByRole('table')).toContainText('10,003.3')
  await expect(page.locator('.date-context')).toContainText('exact acquisition times')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'output/playwright/team-data-mobile.png' })
  await page.getByRole('button', { name: 'View sources & provenance' }).click()
  await expect(page.getByText('Team-provided exports · review pending.', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Import provenance & file checksums/ })).toHaveAttribute('href', '/data/tonle-sap-2026/provenance.json')
})

test('reports a missing selected export instead of silently showing another date', async ({ page }) => {
  await page.route('**/water_20260701.png', (route) => route.fulfill({ status: 404 }))
  await page.goto('/?page=explore&case=tonle-sap-2026&from=2026-07-01&to=2026-10-05')
  await expect(page.getByText('Observation image unavailable. Comparison is disabled.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'After', exact: true })).toBeDisabled()
})

test('ships all 25 data rasters with recorded checksums, bounded dimensions and no copied UI code', () => {
  const record = JSON.parse(readFileSync('public/data/tonle-sap-2026/provenance.json', 'utf8')) as { files: { displayPath: string; displaySha256: string; displayDimensions: number[] }[] }
  expect(record.files).toHaveLength(25)
  for (const file of record.files) {
    const image = readFileSync(`public${file.displayPath}`)
    expect(createHash('sha256').update(image).digest('hex')).toBe(file.displaySha256)
    expect(Math.max(...file.displayDimensions)).toBeLessThanOrEqual(2048)
    expect(image.readUInt32BE(16)).toBe(file.displayDimensions[0])
    expect(image.readUInt32BE(20)).toBe(file.displayDimensions[1])
  }
})

test('stacks both maps in the same viewport and reveals different dated pixels when swiping', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.goto('/?page=explore&case=tonle-sap-2026&view=compare')
  await expect(page.locator('.map-workspace')).toHaveAttribute('data-map-state', 'ready')
  const before = await page.locator('.map-before').boundingBox()
  const after = await page.locator('.map-after').boundingBox()
  if (!before || !after) throw new Error('Both comparison maps must be present')
  expect(Math.abs(before.y - after.y)).toBeLessThan(1)
  expect(Math.abs(before.x - after.x)).toBeLessThan(1)
  expect(Math.abs(before.width - after.width)).toBeLessThan(1)
  const divider = page.getByRole('slider', { name: 'Comparison divider position' })
  await divider.fill('100')
  await page.mouse.move(0, 0)
  const clip = { x: before.x + before.width * .35, y: before.y + before.height * .3, width: before.width * .3, height: before.height * .3 }
  const first = await page.screenshot({ clip })
  await divider.fill('0')
  await page.mouse.move(0, 0)
  const last = await page.screenshot({ clip })
  expect(first.equals(last)).toBe(false)
  await divider.fill('50')
  await page.screenshot({ path: 'output/playwright/team-data-swipe.png' })
})
