import type { Page } from 'playwright';

/**
 * Default custom-draft inputs for provider-free browser proof.
 * Premise must match narrative-rehearsal matchTerms; storyteller must exist in
 * that rehearsal catalogue so openings are not the generic fallback.
 */
export const scriptedBrowserDraft = {
  premise: 'A morning in the pineapple under the sea with SpongeBob.',
  storytellerName: 'Absurd Action Comedy',
  openingTitle: 'Morning in the pineapple',
  openingChoice: 'Walk to work and leave this for later',
} as const;

/** Drive the W08 multi-step draft editor from /stories/new through Save setup. */
export async function createCustomDraftSetup(
  page: Page,
  args: {
    title: string;
    premise?: string;
    direction?: string;
    /** Accessible name fragment matching a catalogue radio. */
    storytellerName?: string;
  },
) {
  await page.getByRole('button', { name: 'Create from scratch' }).click();
  await page.getByLabel(/Story title/i).fill(args.title);
  await page
    .getByLabel(/World, character and starting circumstances/i)
    .fill(args.premise ?? scriptedBrowserDraft.premise);
  await page.getByRole('button', { name: 'Continue to Storyteller' }).click();
  const storyteller = page.getByRole('radio', {
    name: new RegExp(
      args.storytellerName ?? scriptedBrowserDraft.storytellerName,
      'i',
    ),
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
  const title = page.getByLabel(/Story title/i);
  if (await title.isVisible().catch(() => false)) {
    return;
  }
  // Saved drafts hydrate on Review; wait rather than racing edit.count() === 0.
  await page.getByRole('button', { name: 'Edit setup' }).click();
  await page.getByLabel(/Personal direction/i).waitFor();
  await page.getByRole('button', { name: 'Back' }).click();
  await title.waitFor();
}

/** Return from the role step to Review so Create the opening is available. */
export async function returnDraftToReview(page: Page) {
  await page.getByRole('button', { name: 'Continue to Storyteller' }).click();
  await page.getByRole('button', { name: 'Review setup' }).click();
  await page.getByRole('link', { name: 'Create the opening' }).waitFor();
}
