import { test, expect } from '@playwright/test'

// #30/#31 regression: the pull-quote, its attribution, and the CTA paragraph must
// render from `site_settings` (president_quote / president_name_fallback / cta_body)
// and the get_president_name() rpc — not hardcoded copy. Asserts against the
// migration's canonical seed values. REQUIRES the 20260610130000 migration to be
// applied to the DB the app points at. Until then these fail — expected, not a defect.

test.describe('#30 president quote renders from site_settings', () => {
  test('homepage shows the seeded quote with a derived attribution', async ({ page }) => {
    await page.goto('/')
    const quote = page.locator('.home-quote')
    await expect(quote).toContainText('You just need to turn up')
    // The name depends on which profile holds the President club role in the
    // live DB, so assert the stable suffix rather than a specific person.
    await expect(quote.locator('.home-quote__attribution')).toContainText(', Club President')
  })

  test('login page shows the same seeded quote', async ({ page }) => {
    await page.goto('/login')
    const quote = page.locator('.login-left__quote')
    await expect(quote).toContainText('You just need to turn up')
    await expect(quote.locator('cite')).toContainText(', Club President')
  })
})

test.describe('#31 homepage CTA is generic and settings-driven', () => {
  test('CTA shows the seeded generic copy, not a named person', async ({ page }) => {
    await page.goto('/')
    const cta = page.locator('.home-cta')
    await expect(cta).toContainText('A member of the committee will reach out')
    await expect(cta).not.toContainText('Margaret, our president')
  })
})
