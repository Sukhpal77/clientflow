import { test, expect } from '@playwright/test';
import { login, nav, project, task, closeDialog, password } from './support/helpers.js';
test('live sign-in, overview metrics, and personal workspace isolation', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Completed tasks', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('img', { name: /Due-date task counts/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Workload date range' }).selectOption('14');
  await expect(page.getByRole('img', { name: /next 14 days/ })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Select workspace' })
    .selectOption('clientflow-seed-personal-owner');
  await project(page, 'My plans');
  await expect(page.getByRole('heading', { name: 'Plan the week', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Internal budget review', exact: true }),
  ).toHaveCount(0);
});
test('task creation, checklist, comment, status, filters and deletion are persisted', async ({
  page,
}) => {
  await login(page);
  await project(page);
  const title = 'Playwright task ' + Date.now();
  await page.getByRole('button', { name: 'New task', exact: true }).click();
  await page.getByRole('textbox', { name: 'Task name', exact: true }).fill(title);
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('End-to-end verification task');
  await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('Urgent');
  await page.getByRole('combobox', { name: 'Visibility', exact: true }).selectOption('client');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search tasks' }).fill(title);
  await task(page, title);
  await page.getByRole('textbox', { name: 'New subtask' }).fill('Confirm the delivery');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Confirm the delivery' }).check();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('In review');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await task(page, title);
  await expect(page.getByRole('checkbox', { name: 'Confirm the delivery' })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue(
    'In review',
  );
  await page.getByRole('tab', { name: /Comments/ }).click();
  await page.getByRole('textbox', { name: 'Leave a comment' }).fill('Ready for review.');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await task(page, title);
  await page.getByRole('tab', { name: /Comments/ }).click();
  await expect(page.getByText('Ready for review.', { exact: true })).toBeVisible();
  await closeDialog(page);
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('button', { name: new RegExp(title) })).toBeVisible();
  await page.getByRole('button', { name: new RegExp(title) }).click();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await page
    .getByRole('button', { name: 'Delete task', exact: true })
    .filter({ hasText: 'Delete task' })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});
test('project edit, archive/restore and workspace rename have real API effects', async ({
  page,
}) => {
  await login(page);
  await nav(page, 'Settings');
  await page.getByRole('button', { name: 'Rename workspace' }).click();
  await page.getByRole('textbox', { name: 'Workspace name' }).fill('Forma Studio — verified');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(
    page.locator('.breadcrumb').getByText('Forma Studio — verified', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rename workspace' }).click();
  await page.getByRole('textbox', { name: 'Workspace name' }).fill('Forma Studio');
  await page.getByRole('button', { name: 'Save name' }).click();
  const campaign = page
    .locator('.manage-project-list > div')
    .filter({ has: page.getByText('Fall campaign', { exact: true }) });
  await campaign.getByRole('button', { name: 'Edit', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Description', exact: true })
    .fill('Updated by the browser verification suite');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await campaign.getByRole('button', { name: 'Archive', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restore', exact: true })).toHaveCount(0);
  const response = await page.request.get('/api/bootstrap');
  const data = await response.json();
  expect(data.projects.find((p) => p.id === 'clientflow-seed-campaign').description).toBe(
    'Updated by the browser verification suite',
  );
});
test('pending invitations can be created and revoked from the UI', async ({ page }) => {
  await login(page);
  await nav(page, 'People & access');
  await page.getByRole('button', { name: 'Invite a person' }).click();
  const email = 'pending-' + Date.now() + '@example.test';
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('button', { name: 'Create invitation' }).click();
  await expect(page.getByRole('heading', { name: 'Invitation ready' })).toBeVisible();
  await closeDialog(page);
  const row = page.locator('.pending-invites p').filter({ hasText: email });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Revoke' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(row).toHaveCount(0);
});
test('client account sees only its projects and shared tasks and can comment', async ({ page }) => {
  await login(page, 'client.acme');
  await project(page);
  await expect(page.getByRole('button', { name: 'New task', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Audit the current website', exact: true }),
  ).toHaveCount(0);
  await task(page, 'Review the brand concept');
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: /Comments/ }).click();
  const comment = 'Client approval ' + Date.now();
  await page.getByRole('textbox', { name: 'Leave a comment' }).fill(comment);
  await page.getByRole('button', { name: 'Post comment' }).click();
  await task(page, 'Review the brand concept');
  await page.getByRole('tab', { name: /Comments/ }).click();
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  await closeDialog(page);
  const response = await page.request.get('/api/bootstrap');
  const data = await response.json();
  expect(data.projects.some((p) => p.id === 'clientflow-seed-campaign')).toBe(false);
  expect(
    data.tasks
      .filter((t) => t.project_id === 'clientflow-seed-brand')
      .every((t) => t.visibility === 'client'),
  ).toBe(true);
});
test('viewer is read-only and task tabs work with the keyboard', async ({ page }) => {
  await login(page, 'viewer');
  await project(page);
  await task(page, 'Design the homepage');
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: /Subtasks/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Comments/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('textbox', { name: 'Leave a comment' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('only overflowing components scroll and fixed headers remain still', async ({ page }) => {
  await login(page);
  await project(page);
  if (page.viewportSize().width > 800) await page.setViewportSize({ width: 1440, height: 700 });
  const header = await page.locator('.topbar').boundingBox();
  const column = page.getByRole('region', { name: 'Backlog column' });
  const scroll = page.locator('.kanban-column[aria-label="Backlog column"] .column-body');
  await expect.poll(() => scroll.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  await scroll.hover();
  await page.mouse.wheel(0, 600);
  await expect.poll(() => scroll.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect((await page.locator('.topbar').boundingBox()).y).toBe(header.y);
  expect(
    await page
      .locator('.kanban-column[aria-label="To do column"] .column-body')
      .evaluate((e) => e.scrollTop),
  ).toBe(0);
  await page.getByRole('textbox', { name: 'Search tasks' }).fill('Design the homepage');
  await task(page, 'Design the homepage');
  const modalHeader = await page.getByRole('dialog').locator('header').first().boundingBox();
  const drawer = page.locator('.task-detail-scroll');
  await drawer.hover();
  await page.mouse.wheel(0, 900);
  await expect.poll(() => drawer.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  await page.screenshot({
    path:
      'test-results/task-details-' +
      (page.viewportSize().width <= 800 ? 'mobile' : 'desktop') +
      '.png',
  });
  expect((await page.getByRole('dialog').locator('header').first().boundingBox()).y).toBe(
    modalHeader.y,
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await closeDialog(page);
  await nav(page, 'Overview');
  await page.screenshot({
    path:
      'test-results/overview-' + (page.viewportSize().width <= 800 ? 'mobile' : 'desktop') + '.png',
    fullPage: false,
  });
});
