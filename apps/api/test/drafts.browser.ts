import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { chromium } from 'playwright';
import { checkStoryDemo } from './story-demo.browser.js';

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
        const visitor = await browser.newPage();
        await checkStoryDemo(visitor, origin);
        await visitor.close();
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
        await page
          .getByRole('link', { name: 'Review opening candidate' })
          .click();
        await page
          .getByRole('button', {
            name: 'Generate opening candidate',
            exact: true,
          })
          .click();
        await page.getByRole('region', { name: 'Opening candidate' }).waitFor();
        await page.getByText('A fork in the path', { exact: true }).waitFor();
        await page
          .getByRole('button', { name: 'Walk toward the water' })
          .waitFor();
        const opening = await page
          .getByRole('region', { name: 'Opening candidate' })
          .innerText();
        await page.reload();
        assert.equal(
          await page
            .getByRole('region', { name: 'Opening candidate' })
            .innerText(),
          opening,
        );
        await page.getByRole('link', { name: 'Back to draft' }).click();
        await page.getByLabel('Who are you').fill('A new premise.');
        assert.equal(
          await page
            .getByRole('link', { name: 'Review opening candidate' })
            .count(),
          0,
        );
        await page.getByRole('button', { name: 'Save draft' }).click();
        await page.getByText('Saved.', { exact: true }).waitFor();
        await page
          .getByRole('link', { name: 'Review opening candidate' })
          .click();
        await page
          .getByRole('alert')
          .filter({ hasText: 'This preview is from an earlier draft' })
          .waitFor();
      } finally {
        await browser.close();
      }
    },
  );
}
