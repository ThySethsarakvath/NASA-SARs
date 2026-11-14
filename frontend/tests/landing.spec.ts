import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'

test('introduces the vision without fetching scientific cases or the map renderer', async ({ page }) => {
  const requests: string[] = []
  const errors: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Our home.Our planet.A closer look.')
  await expect(page.getByText('Planned exploration', { exact: true })).toHaveCount(3)
  await expect(page.getByText('PROFILE PLACEHOLDER', { exact: true })).toHaveCount(0)
  for (const name of ['Sethasarakvath Thy', 'Sun Sovisal', 'Sokha Ordom', 'Chheng Rayuth', 'Tat Chansereyvong']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name, exact: true })).toHaveCount(1)
  }
  await expect(page.locator('.landing-data-note')).toContainText('team-provided data exports')
  await expect(page.locator('.landing-hero')).not.toContainText('A CAMBODIAN PERSPECTIVE')
  await expect(page.locator('.landing-hero')).not.toContainText('Natural Earth outlines')
  await expect(page.locator('.landing-header-cta, .hero-scene-credit, .landing-hero-foot, .landing-section-label, .landing-scope-note, .landing-team-note, .landing-prototype-note')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Discover our mission' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Step inside the explorer' })).toHaveCount(0)
  await page.locator('.landing-credits summary').click()
  await expect(page.getByRole('link', { name: 'Tonlé Sap 01 — LBM1948' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'CC BY-SA 4.0', exact: true })).toHaveCount(4)
  await expect(page.getByRole('link', { name: 'CC BY 2.5', exact: true })).toHaveCount(1)
  const themeImages = await page.locator('.landing-theme-image img').evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  expect(new Set(themeImages).size).toBe(4)
  expect(requests.filter((url) => /\/data\/index\.json|MapWorkspace\.vue|maplibre-gl-worker/.test(url))).toEqual([])
  expect(errors).toEqual([])
})

test('opens the existing prototype, returns home, and preserves old case links', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Explore the flood prototype', exact: true }).click()
  await expect(page).toHaveURL(/page=explore/)
  await expect(page.getByText('Derived exports · source provenance and validation pending')).toBeVisible()
  await page.getByRole('link', { name: 'Cambodia Flood Explorer home' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Our home.')
  await page.goto('/?case=synthetic-tonle-sap&view=after')
  await expect(page.getByRole('button', { name: 'After', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Before', exact: true })).toBeEnabled()
})

test('supports mobile navigation, keyboard dismissal and section anchors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Open navigation' }).click()
  await page.getByRole('link', { name: 'Our team', exact: true }).click()
  await expect(page).toHaveURL(/#team$/)
  await expect(page.getByRole('heading', { name: /Five curious minds\.\s*One place we call home\./ })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
})

test('renders real local photographs and responsive layouts without overflow', async ({ page }) => {
  mkdirSync('output/playwright', { recursive: true })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [1440, 1043, 768, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    if (width === 1440) {
      await expect.poll(() => page.locator('.landing-hero-image.is-active').evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
      await expect(page.locator('.hero-earth')).toHaveAttribute('data-globe-state', 'ready')
      await page.screenshot({ path: 'output/playwright/landing-hero.png' })
    }
    for (const image of await page.locator('.landing img').all()) {
      await image.scrollIntoViewIfNeeded()
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true)
    }
    await page.getByRole('link', { name: 'Back to top', exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `output/playwright/landing-${width}.png`, fullPage: true })
    if (width === 1440) {
      await page.locator('#team').screenshot({ path: 'output/playwright/team-desktop.png' })
      await page.locator('#themes').screenshot({ path: 'output/playwright/themes-desktop.png' })
    }
  }
})


test('makes the whole theme cards accessible with honest planned-theme details', async ({ page }) => {
  await page.goto('/')
  const forest = page.getByRole('button', { name: 'Forests & deforestation — planned exploration', exact: true })
  await forest.locator('img').click()
  const dialog = page.getByRole('dialog', { name: 'Forests & deforestation', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('This explorer is not available yet')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(forest).toBeFocused()
  await page.getByRole('button', { name: 'Climate & seasons — planned exploration', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Climate & seasons', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Got it', exact: true }).click()
  await page.getByRole('link', { name: 'Explore flooding and water prototype', exact: true }).locator('img').click()
  await expect(page).toHaveURL(/page=explore/)
  await expect(page.getByText('Derived exports · source provenance and validation pending')).toBeVisible()
})
