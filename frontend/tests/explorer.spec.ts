import { expect, test } from '@playwright/test'
import { mkdirSync, readFileSync } from 'node:fs'

test('loads the labeled fixture, switches views, inspects evidence and completes the story', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await expect(page.getByText('Synthetic imagery · no real NISAR observations or flood findings')).toBeVisible()
  await page.getByRole('button', { name: 'Explore flooding', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Before', exact: true })).toBeEnabled()
  await expect(page.locator('.map-workspace')).toHaveAttribute('data-map-state', 'ready')
  await page.getByRole('button', { name: 'Before', exact: true }).click()
  await expect(page).toHaveURL(/view=before/)
  await page.getByRole('button', { name: 'After', exact: true }).click()
  await expect(page).toHaveURL(/view=after/)
  await page.getByRole('button', { name: 'Compare', exact: true }).click()
  const handle = page.locator('.compare-swiper-vertical')
  await expect(handle).toBeInViewport()
  const bounds = await handle.boundingBox()
  if (!bounds) throw new Error('Comparison handle has no rendered bounds')
  const bar = await page.locator('.maplibregl-compare').boundingBox()
  expect(Math.abs(bounds.x + bounds.width / 2 - (bar?.x ?? 0))).toBeLessThan(2)
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.down()
  await page.mouse.move(bounds.x + 80, bounds.y + bounds.height / 2)
  await page.mouse.up()
  await expect.poll(async () => (await handle.boundingBox())!.x).toBeGreaterThan(bounds.x + 40)
  await page.getByRole('slider', { name: 'Comparison divider position' }).fill('35')
  await page.getByRole('switch').check()
  await expect(page.getByRole('switch')).toBeChecked()
  await page.getByRole('button', { name: 'Data & method', exact: true }).click()
  await expect(page.getByText('None — synthetic development graphics')).toBeVisible()
  await page.getByRole('button', { name: 'Sources', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button', { name: 'Guided story', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Start with a place.' })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Look across two moments.' })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await page.getByRole('button', { name: 'Finish story', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Guided story' })).not.toBeVisible()
  expect(errors).toEqual([])
})

test('keeps mobile layout within the viewport and exposes evidence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await page.getByRole('button', { name: 'Explore flooding', exact: true }).click()
  await page.getByRole('button', { name: 'After', exact: true }).click()
  await page.getByRole('button', { name: 'Open evidence panel' }).click()
  await expect(page.getByRole('complementary', { name: 'Evidence and interpretation' })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Close evidence panel' }).click()
})

test('reports missing imagery without quietly substituting another observation', async ({ page }) => {
  await page.route('**/synthetic-tonle-sap/after.png', (route) => route.fulfill({ status: 404 }))
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await page.getByRole('button', { name: 'Dismiss introduction' }).click()
  await expect(page.getByText('Observation image unavailable. Comparison is disabled.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeDisabled()
})

test('handles a malformed manifest explicitly', async ({ page }) => {
  await page.route('**/synthetic-tonle-sap/case.json', (route) => route.fulfill({ json: { schemaVersion: 99 } }))
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await expect(page.getByRole('heading', { name: 'We couldn’t open this case.' })).toBeVisible()
  await expect(page.getByText('Unsupported case schema version.')).toBeVisible()
})

test('keeps observations available when the optional change image is missing', async ({ page }) => {
  await page.route('**/synthetic-tonle-sap/change.png', (route) => route.fulfill({ status: 404 }))
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await expect(page.getByText('Change layer unavailable. Observation comparison remains available.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Before', exact: true })).toBeEnabled()
  await expect(page.getByRole('switch')).toBeDisabled()
})

test('switches cases without retaining old metadata and reports empty availability', async ({ page }) => {
  const fixture = JSON.parse(readFileSync('public/data/synthetic-tonle-sap/case.json', 'utf8')) as Record<string, unknown>
  await page.route('**/data/index.json', (route) => route.fulfill({ json: { cases: [
    { id: 'synthetic-tonle-sap', title: 'First fixture', location: 'Illustrative', manifest: '/data/synthetic-tonle-sap/case.json', dataKind: 'synthetic-demo' },
    { id: 'second', title: 'Second fixture', location: 'Illustrative', manifest: '/data/second/case.json', dataKind: 'synthetic-demo' },
  ] } }))
  await page.route('**/data/second/case.json', (route) => route.fulfill({ json: { ...fixture, id: 'second', title: 'Second fixture' } }))
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await page.getByRole('button', { name: 'Explore flooding', exact: true }).click()
  await page.getByRole('button', { name: /Second fixture/ }).click()
  await expect(page.getByRole('heading', { name: 'Second fixture', exact: true })).toBeVisible()
  await expect(page.locator('.map-workspace')).toHaveAttribute('data-map-state', 'ready')
  await expect(page).toHaveURL(/case=second/)
  await page.route('**/data/index.json', (route) => route.fulfill({ json: { cases: [] } }))
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await expect(page.getByText('No study windows are available yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Before', exact: true })).toBeDisabled()
})

test('retains case imagery when the external basemap fails', async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await page.getByRole('button', { name: 'Explore flooding', exact: true }).click()
  await expect(page.getByText('Basemap unavailable or incomplete · case overlays remain available')).toBeVisible()
  await expect(page.getByRole('button', { name: 'After', exact: true })).toBeEnabled()
})

test('offers static observations when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null
      return original.apply(this, args)
    } as typeof original
  })
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await page.getByRole('button', { name: 'Explore flooding', exact: true }).click()
  await expect(page.getByText('Interactive map unavailable. Static observation view.')).toBeVisible()
  await page.getByRole('button', { name: 'Before', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Example frame A — synthetic-demo' })).toBeVisible()
})

test('keeps all target viewport sizes usable and captures review images', async ({ page }) => {
  mkdirSync('output/playwright', { recursive: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/?page=explore&case=synthetic-tonle-sap')
    await expect(page.getByRole('button', { name: 'Before', exact: true })).toBeEnabled()
    await expect(page.locator('.map-workspace')).toHaveAttribute('data-map-state', 'ready')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `output/playwright/explorer-${width}.png`, fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?page=explore&case=synthetic-tonle-sap')
  await page.getByRole('button', { name: 'Explore flooding', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Welcome to the explorer' })).not.toBeVisible()
  await expect(page.getByRole('slider', { name: 'Comparison divider position' })).toBeEnabled()
  await expect(page.locator('.map-workspace')).toHaveAttribute('data-map-state', 'ready')
  await page.screenshot({ path: 'output/playwright/comparison-desktop.png', fullPage: true })
})
