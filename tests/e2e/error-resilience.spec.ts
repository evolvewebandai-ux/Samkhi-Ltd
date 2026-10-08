import { test, expect } from '@playwright/test';

test.describe('Samkhi Limited Admin - Error Resilience & Offline Sync', () => {
  
  test.beforeEach(async ({ page }) => {
    // Standard mock setup for credentials
    await page.addInitScript(() => {
      window.localStorage.setItem('admin_role', 'Manager');
      window.localStorage.setItem('admin_session_active', 'true');
    });
  });

  test('Form Validation - Empty Required Fields & Invalid Negative Numbers', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/products/new');
    
    // Attempt block save with empty values
    const saveButton = page.locator('#btn-save-product');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Verify inline validation highlights
    const titleError = page.locator('#err-product-title');
    await expect(titleError).toContainText('Title is required');
    await expect(page.locator('#input-product-title')).toHaveClass(/border-red-500/);

    // Negative pricing checks
    const priceInput = page.locator('#input-product-price');
    await priceInput.fill('-145000');
    await saveButton.click();
    
    const priceError = page.locator('#err-product-price');
    await expect(priceError).toContainText('Price must be greater than or equal to 0');
  });

  test('Local Persistence & Network Resilience - Offline Buffering', async ({ page, context }) => {
    await page.goto('http://localhost:3000/admin/products/new');

    // Fill form input prior to network state change
    await page.locator('#input-product-title').fill('Resilient Solar Panel 450W');
    await page.locator('#input-product-sku').fill('SP-450-RES');
    await page.locator('#input-product-price').fill('120000');
    
    // Simulate losing connection
    await context.setOffline(true);

    // Click Save under offline environment
    await page.locator('#btn-save-product').click();

    // Ensure connection backup recovery notice is shown
    const errorToast = page.locator('.toast-error-offline');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText('Offline Mode: Your draft is securely preserved locally');

    // Verify localStorage has buffered payload safely
    const draftContent = await page.evaluate(() => window.localStorage.getItem('draft_product_resilient'));
    expect(draftContent).toContain('SP-450-RES');

    // Re-establish internet link
    await context.setOffline(false);

    // Force mock network to deliver 200 SUCCESS on recovery trigger
    await page.locator('#btn-retry-offline').click();

    // Expect successful synchronization announcement
    const successToast = page.locator('.toast-success-online');
    await expect(successToast).toBeVisible();
    await expect(successToast).toContainText('Draft recovery synchronized successfully');
  });

  test('Authorization Controls & RBAC - 403 Forbidden Access', async ({ page }) => {
    // Downgrade local role to simulated Fulfillment clerk (read-only inventory)
    await page.addInitScript(() => {
      window.localStorage.setItem('admin_role', 'Fulfillment');
    });

    await page.goto('http://localhost:3000/admin/notifications/templates');

    // Attempt direct post execution (access banned page)
    const accessAlert = page.locator('#panel-unauthorized-notice');
    await expect(accessAlert).toBeVisible();
    await expect(accessAlert).toContainText("You do not have administrative permissions to modify email templates");
    
    const dashboardButton = page.locator('#btn-unauthorized-home');
    await dashboardButton.click();
    await expect(page).toHaveURL('http://localhost:3000/admin');
  });

  test('Not Found / Invalid ID Handles - Fallback User Experiences', async ({ page }) => {
    // Visit structural item key with corrupted format
    await page.goto('http://localhost:3000/admin/products/invalid-id-99999');

    const notFoundCard = page.locator('#card-product-not-found');
    await expect(notFoundCard).toBeVisible();
    await expect(notFoundCard).toContainText('Product Not Found');

    const backButton = page.locator('#btn-back-to-products');
    await backButton.click();
    await expect(page).toHaveURL('/admin/products');
  });

  test('Global Error Boundaries - Capture Uncaught Native Errors', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/inventory');

    // Trigger explicit render crash simulation in browser instance
    await page.locator('#btn-simulated-app-crash').click();

    // ErrorBoundary diagnostic view should display immediately
    const errorBoundaryPage = page.locator('.bg-slate-900:has-text("Application Boundary Fault")');
    await expect(errorBoundaryPage).toBeVisible();
    await expect(errorBoundaryPage).toContainText('Something went unexpected');

    // Reload action check
    const reloadButton = page.locator('button:has-text("Reload Page")');
    await expect(reloadButton).toBeVisible();
  });
});
