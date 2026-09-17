import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { chromium } from 'playwright';

export async function checkDraftBrowser(
  t: TestContext,
  origin: string,
  cookie: string,
) {
  await t.test(
    'browser saves, reopens and preserves conflicting edits',
    async () => {
      const browser = await chromium.launch();
      try {
        const context = await browser.newContext();
        await context.addCookies(
          cookie.split(';').map((part) => {
            const separator = part.indexOf('=');
            return {
              name: part.slice(0, separator).trim(),
              value: part.slice(separator + 1).trim(),
              url: origin,
            };
          }),
        );
        const page = await context.newPage();
        await page.goto(`${origin}/stories/new`);
        await page.getByLabel('Title').fill('Browser beginning');
        await page
          .getByLabel('Who are you')
          .fill('A traveller at a locked gate.');
        await page
          .getByLabel('How should the story feel?')
          .fill('Strange but gentle.');
        await page.getByRole('button', { name: 'Save draft' }).click();
        await page.getByText('Saved.', { exact: true }).waitFor();
        const savedURL = page.url();
        assert.match(savedURL, /\/stories\/[0-9a-f-]{36}$/);
        await page.reload();
        assert.equal(
          await page.getByLabel('Title').inputValue(),
          'Browser beginning',
        );
        assert.equal(
          await page.getByLabel('Who are you').inputValue(),
          'A traveller at a locked gate.',
        );
        const second = await context.newPage();
        await second.goto(savedURL);
        await second.getByLabel('Title').fill('Unsent second-tab idea');
        await page.getByLabel('Title').fill('First-tab saved idea');
        await page.getByRole('button', { name: 'Save draft' }).click();
        await page.getByText('Saved.', { exact: true }).waitFor();
        await second.getByRole('button', { name: 'Save draft' }).click();
        await second
          .getByRole('link', { name: 'Compare saved version' })
          .waitFor();
        assert.equal(
          await second.getByLabel('Title').inputValue(),
          'Unsent second-tab idea',
        );
        await page.reload();
        assert.equal(
          await page.getByLabel('Title').inputValue(),
          'First-tab saved idea',
        );
      } finally {
        await browser.close();
      }
    },
  );
}
