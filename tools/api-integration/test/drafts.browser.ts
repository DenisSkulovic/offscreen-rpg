import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { chromium } from 'playwright';
import { checkStoryDemo } from './story-demo.browser.js';
import {
  createCustomDraftSetup,
  openDraftRoleStep,
} from './helpers/draft-wizard.js';

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
        await createCustomDraftSetup(page, {
          title: 'Browser beginning',
          premise: 'A traveller at a locked gate.',
          direction: 'Strange but gentle.',
        });
        const savedURL = page.url();
        assert.match(savedURL, /\/stories\/[0-9a-f-]{36}$/);
        await page.reload();
        await openDraftRoleStep(page);
        assert.equal(
          await page.getByLabel(/Story title/i).inputValue(),
          'Browser beginning',
        );
        assert.equal(
          await page
            .getByLabel(/World, character and starting circumstances/i)
            .inputValue(),
          'A traveller at a locked gate.',
        );
        const second = await context.newPage();
        await second.goto(savedURL);
        await openDraftRoleStep(second);
        await second.getByLabel(/Story title/i).fill('Unsent second-tab idea');
        await page.getByLabel(/Story title/i).fill('First-tab saved idea');
        await page
          .getByRole('button', { name: 'Continue to Storyteller' })
          .click();
        await page.getByRole('button', { name: 'Review setup' }).click();
        await page.getByRole('button', { name: 'Save setup' }).click();
        await page.getByRole('status', { name: /Setup saved/i }).waitFor();
        await second
          .getByRole('button', { name: 'Continue to Storyteller' })
          .click();
        await second.getByRole('button', { name: 'Review setup' }).click();
        await second.getByRole('button', { name: 'Save setup' }).click();
        await second
          .getByRole('button', { name: 'Load saved setup' })
          .waitFor();
        assert.equal(await second.getByLabel(/Story title/i).count(), 0);
        await page.reload();
        await openDraftRoleStep(page);
        assert.equal(
          await page.getByLabel(/Story title/i).inputValue(),
          'First-tab saved idea',
        );
        await page.getByRole('link', { name: 'Create the opening' }).click();
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
        await openDraftRoleStep(page);
        await page
          .getByLabel(/World, character and starting circumstances/i)
          .fill('A new premise.');
        assert.equal(
          await page.getByRole('link', { name: 'Create the opening' }).count(),
          0,
        );
        await page
          .getByRole('button', { name: 'Continue to Storyteller' })
          .click();
        await page.getByRole('button', { name: 'Review setup' }).click();
        await page.getByRole('button', { name: 'Save setup' }).click();
        await page.getByRole('status', { name: /Setup saved/i }).waitFor();
        await page.getByRole('link', { name: 'Create the opening' }).click();
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
