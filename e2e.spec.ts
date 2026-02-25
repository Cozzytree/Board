import { test, expect } from '@playwright/test';
import path from 'path';

test('test file upload', async ({ page }) => {
  await page.goto('http://localhost:5174/');

  // click library button
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('button[title="Import Library"]').click();
  const fileChooser = await fileChooserPromise;

  // upload testlibrary.json
  await fileChooser.setFiles(path.join(process.cwd(), 'testlibrary.json'));

  // open shape popover
  await page.locator('button').filter({ hasText: /^$/ }).nth(1).click();

  // verify new icon is added
  await expect(page.locator('.lucide-bell')).toBeVisible();
});
