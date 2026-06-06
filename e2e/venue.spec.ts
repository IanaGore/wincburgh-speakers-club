import { test, expect } from '@playwright/test'

// #32 regression: the public pages must render venue/meeting details that live in
// `site_settings` + the `facilities` table, not hardcoded copy. Asserts against the
// migration's canonical seed values. REQUIRES the 20260605120000 migration to be
// applied to the DB the app points at (locally: apply to your dev Supabase; in CI it
// runs post-deploy). Until then these will fail — that is expected, not a code defect.

test.describe('#32 venue details render from site_settings', () => {
  test('homepage shows the canonical venue name and address', async ({ page }) => {
    await page.goto('/')
    const venue = page.locator('.home-venue__info')
    await expect(venue).toContainText('Winchburgh Community Centre')
    await expect(venue).toContainText('EH52 6QF')
  })

  test('homepage shows schedule and times lines', async ({ page }) => {
    await page.goto('/')
    const venue = page.locator('.home-venue__info')
    await expect(venue).toContainText('Tuesday')
    await expect(venue).toContainText('Doors 6:30pm')
    await expect(venue).toContainText('Meeting 7:00pm')
  })

  test('homepage shows at least one facility from the facilities table', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.home-venue__access')).toContainText('Step-free access')
  })

  test('navbar ribbon shows the meeting day from settings', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.nav-ribbon')).toContainText('Tuesday')
  })

  test('contact page no longer shows the old drifted postcode', async ({ page }) => {
    await page.goto('/contact')
    await expect(page.locator('#find-us')).toContainText('EH52 6QF')
    await expect(page.locator('#find-us')).not.toContainText('EH52 6RP')
  })
})
