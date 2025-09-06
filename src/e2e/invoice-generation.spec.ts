import { test, expect } from '@playwright/test'

test.describe('Admin Invoice Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login (adjust URL based on your routing)
    await page.goto('/admin/login')
    
    // Mock admin login (adjust selectors based on your form)
    await page.fill('[data-testid="email-input"]', 'admin@autolab.my')
    await page.fill('[data-testid="password-input"]', 'admin123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for navigation to admin dashboard
    await page.waitForURL('**/admin/orders')
  })

  test('should generate professional invoice with correct company details', async ({ page }) => {
    // Find first order in the list
    const orderRow = page.locator('table tbody tr').first()
    
    // Click the invoice generation button
    const invoiceButton = orderRow.locator('[title="Generate Invoice"]')
    await invoiceButton.click()
    
    // Wait for invoice modal to appear
    const invoiceModal = page.locator('#invoice-content')
    await expect(invoiceModal).toBeVisible()
    
    // Verify company information
    await expect(page.locator('text=AUTO LABS SDN BHD')).toBeVisible()
    await expect(page.locator('text=17, Jalan 7/95B, Cheras Utama')).toBeVisible()
    await expect(page.locator('text=56100 Cheras, Wilayah Persekutuan Kuala Lumpur')).toBeVisible()
    await expect(page.locator('text=03-4297 7668')).toBeVisible()
    
    // Verify invoice structure
    await expect(page.locator('text=INVOICE')).toBeVisible()
    await expect(page.locator('text=Order ID:')).toBeVisible()
    
    // Test PDF download functionality
    const downloadButton = page.locator('button:has-text("Download PDF")')
    await expect(downloadButton).toBeVisible()
    
    // Test print functionality
    const printButton = page.locator('button:has-text("Print Invoice")')
    await expect(printButton).toBeVisible()
  })

  test('should display correct number-to-words conversion', async ({ page }) => {
    // Navigate to an order with known amount (you may need to create test data)
    const orderRow = page.locator('table tbody tr').first()
    const invoiceButton = orderRow.locator('[title="Generate Invoice"]')
    await invoiceButton.click()
    
    // Check for proper number-to-words conversion
    const wordsSection = page.locator('text=/RINGGIT MALAYSIA .* ONLY/')
    await expect(wordsSection).toBeVisible()
    
    // Verify it doesn't contain "undefined"
    const textContent = await wordsSection.textContent()
    expect(textContent).not.toContain('undefined')
    expect(textContent).not.toContain('NaN')
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 })
    
    const orderRow = page.locator('table tbody tr').first()
    const invoiceButton = orderRow.locator('[title="Generate Invoice"]')
    await invoiceButton.click()
    
    const invoiceModal = page.locator('#invoice-content')
    await expect(invoiceModal).toBeVisible()
    
    // Verify modal is properly sized for mobile
    const modalContent = page.locator('.modal-content')
    const boundingBox = await modalContent.boundingBox()
    
    expect(boundingBox?.width).toBeLessThanOrEqual(375)
  })
})