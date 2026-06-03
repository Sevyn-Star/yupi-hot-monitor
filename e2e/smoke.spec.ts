import { test, expect } from '@playwright/test';

test.describe('HotPulse smoke', () => {
  test('loads dashboard and navigates tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('热点雷达').or(page.locator('nav'))).toBeVisible({
      timeout: 15000
    });

    await page.getByRole('link', { name: /监控词/ }).click();
    await expect(page.getByText('关键词模板').or(page.getByText('还没有监控关键词'))).toBeVisible();

    await page.getByRole('link', { name: /搜索/ }).click();
    await expect(page.getByPlaceholder('搜索热点内容')).toBeVisible();

    await page.getByRole('link', { name: /设置/ }).click();
    await expect(page.getByText('扫描与通知')).toBeVisible();
  });

  test('health API responds', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
