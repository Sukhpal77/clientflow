import { expect } from '@playwright/test';
export const password = 'ClientFlowDemo2026!';
export async function login(page, account = 'owner') {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(account + '@clientflow.test');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Hello,/ })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Select workspace' })
    .selectOption('clientflow-seed-forma');
  await expect(page.getByRole('heading', { name: /^Hello,/ })).toBeVisible();
}
export async function nav(page, name) {
  if (
    page.viewportSize().width <= 800 &&
    !(await page.locator('.sidebar').evaluate((el) => el.classList.contains('visible')))
  )
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.locator('.sidebar').getByRole('button', { name, exact: true }).click();
  if (page.viewportSize().width <= 800)
    await expect
      .poll(async () => {
        const b = await page.locator('.sidebar').boundingBox();
        return b.x + b.width;
      })
      .toBeLessThanOrEqual(1);
}
export async function project(page, name = 'Brand & website') {
  if (
    page.viewportSize().width <= 800 &&
    !(await page.locator('.sidebar').evaluate((el) => el.classList.contains('visible')))
  )
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.locator('.projects-nav').getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('heading', { name: new RegExp('^' + name) })).toBeVisible();
}
export async function task(page, title) {
  await page.getByRole('heading', { name: title, exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Task details' })).toBeVisible();
}
export async function closeDialog(page) {
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
