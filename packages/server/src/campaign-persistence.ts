import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { campaign, gameRoll, gameActivity } from '@offscreen/db/campaign-schema';
import { characterSchema, offerSchema, type Roll, type GameOffer, type OutcomeEffect } from '@offscreen/contracts/campaign';
import type { Transaction } from './outbox';
import { advanceStoryView, insertContinuationPassage, type StoryRecord } from './story-persistence';
import { StoryError } from './story-errors';
import { actionContentSchema } from './rules/action-content';
import { composeOpportunities } from './rules/opportunities';

export type CampaignRecord = typeof campaign.$inferSelect;
export type ActivityRecord = typeof gameActivity.$inferSelect;
export async function requireCampaign(tx: Transaction, storyId: string) {
  const [state] = await tx.select().from(campaign).where(eq(campaign.storyId, storyId));
  if (!state || !state.character || !state.content) throw new StoryError('conflict');
  return state;
}
export async function recordRoll(tx: Transaction, args: {
  storyId: string; operationId: string; segment: number; checkKey: string;
  gameTimeMs: number; plan: unknown; result: Roll; effects: OutcomeEffect[];
}) {
  await tx.insert(gameRoll).values({ id: randomUUID(), ...args });
}
export async function refreshOffer(tx: Transaction, state: CampaignRecord, activityState: string | null): Promise<GameOffer> {
  const offer = composeOpportunities(actionContentSchema.parse(state.content), campaignCharacter(state), activityState === 'running' || activityState === 'paused');
  await tx.update(campaign).set({ offer }).where(eq(campaign.storyId, state.storyId));
  return offer;
}
export async function appendMechanicalPassage(tx: Transaction, current: StoryRecord, title: string, paragraphs: string[]) {
  const passageId = await insertContinuationPassage(tx, {
    storyId: current.id, sequence: current.revision + 1, transitionId: randomUUID(), responseSource: null,
    input: { expectedRevision: current.revision, content: { version: 1, title, paragraphs }, effects: [], response: null, interaction: null, wait: null, decision: null },
  });
  await advanceStoryView(tx, { storyId: current.id, revision: current.revision + 1, viewVersion: current.viewVersion + 1 });
  return passageId;
}
export function campaignCharacter(state: CampaignRecord) { return characterSchema.parse(state.character); }
export function campaignOffer(state: CampaignRecord) { return offerSchema.parse(state.offer); }
