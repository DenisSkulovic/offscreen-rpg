import assert from 'node:assert/strict';
import assert from 'node:assert/strict';
import { createCustomDraftSetup } from './helpers/draft-wizard.js';
import { withBrowserSession } from './helpers/browser-session.js';
import type { TestContext } from 'node:test';
import { type ProfiledStoryteller } from './storyteller-suite.js';
import { registerProfiledStoryteller } from './storyteller-suite.js';

// Moved unchanged from the profiled Storyteller suite.
export async function checkBrowserCreation(
  t: TestContext,
  {
    origin,
    cookie,
    restartWorker,
  }: ProfiledStoryteller,
): Promise<void> {
  await t.test(
    'browser selects a profile, starts, chooses, reloads and finds live story',
    async () => {
      await restartWorker();
      await withBrowserSession(origin, cookie, async ({ context }) => {
        const page = await context.newPage();
        await page.goto(`${origin}/stories/new`);
        // W08 multi-step setup: scratch -> role -> Storyteller -> review -> save.
        await createCustomDraftSetup(page, {
          title: 'Pineapple browser story',
          premise: 'I am SpongeBob in the pineapple with Gary.',
          storytellerName: 'Quiet Eerie Mystery',
        });
        await page
          .getByRole('link', { name: 'Create the opening' })
          .click();
        await page
          .getByRole('button', {
            name: 'Create opening',
            exact: true,
          })
          .click();
        await page
          .getByRole('button', { name: 'Start story', exact: true })
          .click({ timeout: 30000 });
        await page.waitForURL('**/play/**');
        await page
          .getByRole('button', {
            name: 'Ask Gary about the delivery',
            exact: true,
          })
          .click();
        await page
          .getByRole('heading', { name: 'Gary’s promise', exact: true })
          .waitFor({ timeout: 30000 });
        await page
          .getByRole('button', {
            name: 'Walk to work and leave this for later',
            exact: true,
          })
          .click();
        await page
          .getByRole('heading', {
            name: 'On the way to work',
            exact: true,
          })
          .waitFor({ timeout: 30000 });
        await page
          .getByRole('button', { name: 'Pause', exact: true })
          .click();
        await page.getByText('Journey paused', { exact: true }).waitFor();
        await restartWorker();
        const url = page.url();
        await page.reload();
        await page.getByText('Journey paused', { exact: true }).waitFor();
        await page
          .getByRole('button', { name: 'Resume', exact: true })
          .click();
        await page
          .getByRole('heading', { name: 'Outside work', exact: true })
          .waitFor({ timeout: 35000 });
        await page.reload();
        await page.getByRole('button', { name: 'Contents', exact: true }).click();
        await page.getByRole('link', { name: 'Journal', exact: true }).click();
        await page
          .getByRole('button', {
            name: 'Read saved passages',
            exact: true,
          })
          .click();
        await page
          .getByRole('button', {
            name: /1\. Morning in the pineapple/,
          })
          .waitFor();
        await page.goto(`${origin}/stories`);
        assert.ok(
          await page
            .locator(`a[href="${new URL(url).pathname}"]`)
            .count(),
        );
      });
    },
  );
}

registerProfiledStoryteller(import.meta.url, 'browser story creation', checkBrowserCreation);
