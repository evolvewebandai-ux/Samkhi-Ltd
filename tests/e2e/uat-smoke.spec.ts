import { test, expect } from '@playwright/test';

test.describe('Samkhi Limited Admin - UAT Workflows for User Personas', () => {

  test.beforeEach(async ({ page }) => {
    // Inject mock session with direct Manager access for full pipeline control
    await page.addInitScript(() => {
      window.localStorage.setItem('admin_role', 'Manager');
      window.localStorage.setItem('admin_session_active', 'true');
    });
  });

  test('Persona A: Catalog Manager (Maria) - Create & Publish Solar Battery', async ({ page }) => {
    // 1. Navigate to Products area
    await page.goto('http://localhost:3000/admin/products');
    await page.locator('#btn-add-new-product').click();
    await expect(page).toHaveURL('http://localhost:3000/admin/products/new');

    // 2. Complete product specification
    await page.locator('#input-product-name').fill('Solar Battery Pro 10kWh');
    await page.locator('#input-product-sku').fill('BAT-PRO-10K');
    await page.locator('#input-product-price').fill('285000');
    await page.locator('#input-product-type').selectOption('Battery');
    await page.locator('#input-product-vendor').fill('Samkhi');
    await page.locator('#input-product-tags').fill('battery, off-grid, sale');
    await page.locator('#input-product-collections').fill('Batteries, Summer Sale');

    // 3. Complete Initial inventory constraints
    await page.locator('#input-inventory-onhand').fill('25');
    await page.locator('#input-inventory-reorder').fill('5');

    // 4. Save and verify listing presence
    await page.locator('#btn-save-product').click();
    
    // Toast confirmation
    const feedbackToast = page.locator('.toast-success');
    await expect(feedbackToast).toBeVisible();
    await expect(feedbackToast).toContainText('Product saved successfully');

    // Redirected back to Catalog inventory table
    await expect(page).toHaveURL('http://localhost:3000/admin/products');
    const newlyCreatedRow = page.locator('tr:has-text("Solar Battery Pro 10kWh")');
    await expect(newlyCreatedRow).toBeVisible();
  });

  test('Persona B: Fulfillment Clerk (Devon) - Process Shipping Pipeline Order #90281', async ({ page }) => {
    // 1. Visit core orders table
    await page.goto('http://localhost:3000/admin/orders');
    
    // Filter by 'Payment Confirmed' column to capture correct starting orders
    await page.locator('#filter-order-status').selectOption('payment_confirmed');
    
    // Click on target row order index #90281
    await page.locator('tr:has-text("#90281")').click();
    await expect(page).toHaveURL(/.*\/admin\/orders\/90281/);

    // Verify shipping constraints
    await expect(page.locator('#order-fulfillment-type')).toContainText('🚚 Shipping');
    await expect(page.locator('#order-shipping-cost')).toContainText('$3,500 JMD');

    // 2. Mark order as Picked
    const activePipelineAction = page.locator('#btn-pipeline-action');
    await expect(activePipelineAction).toContainText('Mark as Picked');
    await activePipelineAction.click();

    // Confirm Modal trigger
    await page.locator('#btn-modal-confirm-action').click();
    await expect(page.locator('.toast-success')).toContainText('Order state updated: Picked');

    // Status label dynamically updates without page re-render
    await expect(page.locator('#status-badge')).toContainText('Picked');

    // 3. Progress sequentially through pipeline to Complete status
    await activePipelineAction.click(); // Pack
    await page.locator('#btn-modal-confirm-action').click();
    await activePipelineAction.click(); // Mark Ready for Delivery
    await page.locator('#btn-modal-confirm-action').click();
    await activePipelineAction.click(); // Complete
    await page.locator('#btn-modal-confirm-action').click();

    await expect(page.locator('#status-badge')).toContainText('Completed');
  });

  test('Persona C: Store Owner (Mr. Chin) - KPI Dashboard Review and Drilldown', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');

    // 1. Verify primary system health KPIs are live and rendered cleanly
    const revenueWidget = page.locator('#kpi-revenue-today');
    await expect(revenueWidget).toBeVisible();
    await expect(revenueWidget).toContainText('JMD');

    const lowStockAlerts = page.locator('#kpi-low-stock');
    await expect(lowStockAlerts).toBeVisible();

    // 2. Drilldown trigger check - Select Low Stock alert block
    await lowStockAlerts.click();

    // Verify system redirects directly to table filtered specifically to alert bounds
    await expect(page).toHaveURL('http://localhost:3000/admin/inventory?filter=low');
    await expect(page.locator('#header-inventory-title')).toContainText('Stock Alerts');
  });

  test('Persona D: Marketing Admin (Aisha) - Edit & Send SendGrid Email Template', async ({ page }) => {
    // 1. Load active template editor view
    await page.goto('http://localhost:3000/admin/notifications/templates');
    await page.locator('.btn-edit-template:has-text("Order Placed")').click();

    // 2. Edit core email parameters
    await page.locator('#input-template-subject').fill('🇯🇲 Samkhi Order Confirmed! {{order_number}}');
    await page.locator('#input-template-body').fill('Hi {{customer_name}}, total is {{grand_total}}. Respect!');

    // 3. Click the interactive placeholder variable injection buttons
    await page.locator('.variable-pill-btn:has-text("Grand Total")').click();

    // 4. Send targeted simulation verification test
    await page.locator('#input-test-email-recipient').fill('admin@samkhi.com');
    await page.locator('#btn-send-test-email').click();

    const testConfirmationToast = page.locator('.toast-success');
    await expect(testConfirmationToast).toBeVisible();
    await expect(testConfirmationToast).toContainText('Test email dispatched successfully');
  });
});
