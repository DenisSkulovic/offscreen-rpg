import assert from 'node:assert/strict';
import type { Page } from 'playwright';

export async function checkStoryDemo(page: Page, origin: string) {
  await page.goto(`${origin}/demo`);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: 'Advance demo time' }).isDisabled(),
    true,
  );
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Advance demo time' }).click();
  await page
    .getByRole('heading', { name: 'An apple. A pear. A smile.', exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'Accept the apple' }).click();
  await page
    .getByRole('heading', {
      name: 'The world smells of sweetness.',
      exact: true,
    })
    .waitFor();
  await page.getByRole('button', { name: 'Wait and listen' }).click();
  await page.getByRole('button', { name: 'Advance demo time' }).click();
  await page.getByRole('button', { name: 'Leap through the opening' }).click();
  await page
    .getByRole('heading', {
      name: 'An apology, and a cup of tea.',
      exact: true,
    })
    .waitFor();
  await page.locator('summary').click();
  assert.equal(await page.locator('.story-history li').count(), 6);
  assert.ok(
    (await page.locator('.story-history').innerText()).includes(
      'You chose: Accept the apple',
    ),
  );
  await page.getByRole('button', { name: 'Try another path' }).click();
  assert.equal(await page.locator('.story-history li').count(), 1);
  await page.getByRole('button', { name: 'Advance demo time' }).click();
  await page.getByRole('button', { name: 'Decline and keep walking' }).click();
  await page
    .locator('#scene-title')
    .filter({ hasText: 'You arrive with your doubts intact.' })
    .waitFor();
}
