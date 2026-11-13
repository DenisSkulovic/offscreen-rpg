import type { Page } from 'playwright';

/** Drive the W08 multi-step draft editor from /stories/new through Save setup. */
export async function createCustomDraftSetup(
  page: Page,
  args: {
    title: string;
    premise: string;
    direction?: string;
    /** Accessible name fragment matching a catalogue radio, e.g. "Driven Adventure". */
    storytellerName?: string;
  },
) {
  await page.getByRole('button', { name: 'Create from scratch' }).click();
  await page.getByLabel(/Story title/i).fill(args.title);
  await page
    .getByLabel(/World, character and starting circumstances/i)
    .fill(args.premise);
  await page.getByRole('button', { name: 'Continue to Storyteller' }).click();
  const storyteller = page.getByRole('radio', {
    name: new RegExp(args.storytellerName ?? 'Driven Adventure', 'i'),
  });
  await storyteller.waitFor();
  await storyteller.check();
  if (args.direction) {
    await page.getByLabel(/Personal direction/i).fill(args.direction);
  }
  await page.getByRole('button', { name: 'Review setup' }).click();
  await page.getByRole('button', { name: 'Save setup' }).click();
  // Exact status copy; /Setup saved/i also matches the disabled submit label.
  await page
    .getByText('Setup saved. It is ready to create an opening.')
    .waitFor();
}

/** Reopen an existing draft on the role step for editing title/premise. */
export async function openDraftRoleStep(page: Page) {
  const edit = page.getByRole('button', { name: 'Edit setup' });
  if (await edit.count()) {
    await edit.click();
  }
  const backFromStoryteller = page.getByRole('button', { name: 'Back' });
  if (
    (await page.getByLabel(/Personal direction/i).count()) > 0 &&
    (await backFromStoryteller.count()) > 0
  ) {
    await backFromStoryteller.click();
  }
}
