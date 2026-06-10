import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBeLessThan(400)
  await expect(page.locator('body')).toBeVisible()
})
