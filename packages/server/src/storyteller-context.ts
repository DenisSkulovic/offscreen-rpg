import { campaign, campaignSettings } from '@offscreen/db/campaign-schema';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { storyItem, storyPassage } from '@offscreen/db/story-schema';
import { contextInputSchema } from '@offscreen/storyteller/context';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import type { Transaction } from './outbox';

/** Called inside admission while holding the story lock. No uncommitted future is evidence. */
export async function loadStorytellerContext(
  tx: Transaction,
  input: {
    storyId: string;
    revision: number;
    premise: unknown;
    notes: unknown;
    selected: { id: string; label: string; intention: string };
  },
) {
  const notes = continuityNotesSchema.parse(input.notes ?? []);
  const recent = await tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, input.storyId),
        lte(storyPassage.sequence, input.revision),
      ),
    )
    .orderBy(desc(storyPassage.sequence))
    .limit(7);
  const evidenceIds = [...new Set(notes.flatMap((note) => note.sources))];
  const older = evidenceIds.length
    ? await tx
        .select()
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, input.storyId),
            lte(storyPassage.sequence, input.revision),
            inArray(storyPassage.id, evidenceIds),
          ),
        )
    : [];
  const evidence = [
    ...new Map(
      [...recent, ...older].map((passage) => [
        passage.id,
        {
          id: passage.id,
          sequence: passage.sequence,
          content: passage.content,
          // The published passage already describes the consequence; retain the accepted response identity as evidence.
          response:
            passage.response === null
              ? null
              : interactionSubmissionSchema.parse(passage.response).answer
                  .optionId,
        },
      ]),
    ).values(),
  ];
  const current = evidence.find(
    (passage) => passage.sequence === input.revision,
  );
  if (!current) {
    throw new Error('Missing current story context');
  }
  const items = await tx
    .select({
      key: storyItem.key,
      label: storyItem.label,
      holderKey: storyItem.holderKey,
    })
    .from(storyItem)
    .where(eq(storyItem.storyId, input.storyId));
  const [settingsRow] = await tx.select().from(campaign).where(eq(campaign.storyId, input.storyId));
  const [captured] = settingsRow ? await tx.select({ settings: campaignSettings.settings })
    .from(campaignSettings)
    .where(and(eq(campaignSettings.storyId, input.storyId), eq(campaignSettings.revision, settingsRow.settingsRevision))) : [];
  if (settingsRow && !captured) {
    throw new Error('Missing captured campaign settings');
  }
  return contextInputSchema.parse({
    ...(captured ? { campaignSettings: captured.settings } : {}),
    premise: input.premise,
    current,
    items,
    selected: input.selected,
    notes,
    evidence,
  });
}
