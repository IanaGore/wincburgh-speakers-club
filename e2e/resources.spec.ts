import { test, expect } from '@playwright/test'

// #36: role resources are member-gated. The member layout redirects logged-out
// visitors to /login; the data itself is further protected by authenticated-only
// RLS + grants (no anon access).

test.describe('#36 role resources are member-gated', () => {
  test('logged-out visit to /member/resources redirects to login', async ({ page }) => {
    await page.goto('/member/resources')
    await expect(page).toHaveURL(/\/login/)
  })
})
