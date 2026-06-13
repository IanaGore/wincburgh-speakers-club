import { test, expect } from '@playwright/test'

// #35: /get-started intent chooser, deep-links, and redirects

test.describe('#35 get-started', () => {
  test('shows intent chooser at /get-started', async ({ page }) => {
    await page.goto('/get-started')
    await expect(page.getByText('Come to a meeting')).toBeVisible()
    await expect(page.getByText('Ask a question')).toBeVisible()
  })

  test('?intent=attend skips chooser and shows signup flow', async ({ page }) => {
    await page.goto('/get-started?intent=attend')
    await expect(page.getByText('Come to a meeting').first()).not.toBeVisible()
  })

  test('?intent=ask skips chooser and shows contact form', async ({ page }) => {
    await page.goto('/get-started?intent=ask')
    await expect(page.getByRole('textbox', { name: /your name/i })).toBeVisible()
  })

  test('/signup redirects to /get-started', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/\/get-started/)
  })

  test('/contact redirects to /get-started', async ({ page }) => {
    await page.goto('/contact')
    await expect(page).toHaveURL(/\/get-started/)
  })
})
