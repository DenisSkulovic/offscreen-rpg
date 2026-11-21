import { isDeepStrictEqual } from 'node:util';
import type { Database } from '@offscreen/db';
import {
  campaign,
  gameActionExecution,
  gameActivity,
  gameOffer,
  worldObligation,
} from '@offscreen/db/campaign-schema';
import { story, storyItem } from '@offscreen/db/story-schema';
import type { Transaction } from '@offscreen/db/outbox';
import { eq } from 'drizzle-orm';
import type { StoryContinuation } from './command-policy';
import { projectStoryItemEffects, type StoryItemSnapshot } from './persistence';

/** Disposable v2 representability caps; never truncate beyond these bounds. */
export const SCENE_AFTER_STATE_MAX_HOLDS = 20;
export const SCENE_AFTER_STATE_MAX_ACTIVITIES = 256;
export const SCENE_AFTER_STATE_MAX_OBLIGATIONS = 256;

export type SceneAfterStateStoryItem = StoryItemSnapshot;

export type SceneAfterStateCampaign = Readonly<{
  settingsRevision: number;
  character: unknown;
  storyFacts: unknown;
  activityOccurrences: unknown;
  acceptedActivityPlan: unknown;
  content: unknown;
  location: string | null;
  gameSecond: number;
  clock: unknown;
  clockPace: unknown;
  holds: unknown;
  offer: unknown;
  situationAuthorization: unknown;
  activeActivityId: string | null;
  activeActionOperationId: string | null;
  worldConditions: unknown;
}>;

export type SceneAfterStateActivity = Readonly<{
  id: string;
  plan: unknown;
  state: string;
  boundariesSettled: number;
  revision: number;
  progress: unknown;
}>;

export type SceneAfterStateWorldObligation = Readonly<{
  id: string;
  revision: number;
  definition: unknown;
  dueGameSecond: number;
  state: string;
  firedAtGameSecond: number | null;
}>;

export type SceneAfterStateGameOffer = Readonly<{
  id: string;
  narrativeRevision: number;
  plans: unknown;
}>;

export type SceneAfterStateActionExecution = Readonly<{
  operationId: string;
  offerId: string;
  actionKey: string;
  baseRevision: number;
  offer: unknown;
  plan: unknown;
  pendingResolution: unknown;
  preparationGenerationId: string | null;
  startGameSecond: number;
  targetGameSecond: number;
  state: string;
  revision: number;
}>;

/** Internal semantic after-image; not a public DTO or SceneCheckpointV2. */
export type SceneAfterState = Readonly<{
  continuityNotes: unknown;
  activeSceneScope: unknown;
  storyItems: readonly SceneAfterStateStoryItem[];
  campaign: SceneAfterStateCampaign | null;
  activities: readonly SceneAfterStateActivity[];
  worldObligations: readonly SceneAfterStateWorldObligation[];
  gameOffers: readonly SceneAfterStateGameOffer[];
  actionExecutions: readonly SceneAfterStateActionExecution[];
}>;

export class SceneAfterStateError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'SceneAfterStateError';
    this.code = code;
  }
}

function compareUuidLex(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function sortById<T extends { id: string }>(rows: readonly T[]): T[] {
  return [...rows].sort((left, right) => compareUuidLex(left.id, right.id));
}

function sortByOperationId<T extends { operationId: string }>(
  rows: readonly T[],
): T[] {
  return [...rows].sort((left, right) =>
    compareUuidLex(left.operationId, right.operationId),
  );
}

function sortStoryItems(
  items: readonly SceneAfterStateStoryItem[],
): SceneAfterStateStoryItem[] {
  return [...items].sort((left, right) => compareUuidLex(left.key, right.key));
}

function holdsCount(holds: unknown): number {
  return Array.isArray(holds) ? holds.length : 0;
}

/** Throws SceneAfterStateError with code and message `state_not_representable`. */
export function assertSceneAfterStateRepresentable(
  state: SceneAfterState,
): void {
  if (
    state.campaign !== null &&
    holdsCount(state.campaign.holds) > SCENE_AFTER_STATE_MAX_HOLDS
  ) {
    throw new SceneAfterStateError('state_not_representable');
  }
  if (state.activities.length > SCENE_AFTER_STATE_MAX_ACTIVITIES) {
    throw new SceneAfterStateError('state_not_representable');
  }
  if (state.worldObligations.length > SCENE_AFTER_STATE_MAX_OBLIGATIONS) {
    throw new SceneAfterStateError('state_not_representable');
  }
}

export function canonicalizeSceneAfterState(
  state: SceneAfterState,
): SceneAfterState {
  return {
    continuityNotes: state.continuityNotes,
    activeSceneScope: state.activeSceneScope,
    storyItems: sortStoryItems(state.storyItems),
    campaign: state.campaign,
    activities: sortById(state.activities),
    worldObligations: sortById(state.worldObligations),
    gameOffers: sortById(state.gameOffers),
    actionExecutions: sortByOperationId(state.actionExecutions),
  };
}

const COMPARE_FIELD_GROUPS: ReadonlyArray<{
  code: string;
  select: (state: SceneAfterState) => unknown;
}> = [
  { code: 'continuity_notes', select: (state) => state.continuityNotes },
  { code: 'active_scene_scope', select: (state) => state.activeSceneScope },
  { code: 'story_items', select: (state) => state.storyItems },
  { code: 'campaign', select: (state) => state.campaign },
  { code: 'activities', select: (state) => state.activities },
  { code: 'world_obligations', select: (state) => state.worldObligations },
  { code: 'game_offers', select: (state) => state.gameOffers },
  { code: 'action_executions', select: (state) => state.actionExecutions },
];

/**
 * Deterministic semantic comparison after canonical sorting. Equal states return `match`.
 */
export function compareSceneAfterState(
  actual: SceneAfterState,
  expected: SceneAfterState,
): string {
  const left = canonicalizeSceneAfterState(actual);
  const right = canonicalizeSceneAfterState(expected);
  for (const group of COMPARE_FIELD_GROUPS) {
    if (!isDeepStrictEqual(group.select(left), group.select(right))) {
      return group.code;
    }
  }
  return 'match';
}

export function projectSceneItemAfterState(
  base: readonly SceneAfterStateStoryItem[],
  effects: StoryContinuation['effects'],
): SceneAfterStateStoryItem[] {
  return projectStoryItemEffects(base, effects);
}

function mapCampaignRow(
  row: typeof campaign.$inferSelect,
): SceneAfterStateCampaign {
  return {
    settingsRevision: row.settingsRevision,
    character: row.character,
    storyFacts: row.storyFacts,
    activityOccurrences: row.activityOccurrences,
    acceptedActivityPlan: row.acceptedActivityPlan,
    content: row.content,
    location: row.location,
    gameSecond: row.gameSecond,
    clock: row.clock,
    clockPace: row.clockPace,
    holds: row.holds,
    offer: row.offer,
    situationAuthorization: row.situationAuthorization,
    activeActivityId: row.activeActivityId,
    activeActionOperationId: row.activeActionOperationId,
    worldConditions: row.worldConditions,
  };
}

export async function readSceneAfterState(
  tx: Transaction,
  storyId: string,
): Promise<SceneAfterState> {
  const [storyRow] = await tx
    .select({
      continuityNotes: story.continuityNotes,
      activeSceneScope: story.activeSceneScope,
    })
    .from(story)
    .where(eq(story.id, storyId));
  if (!storyRow) {
    throw new SceneAfterStateError('story_not_found');
  }

  const itemRows = await tx
    .select({
      key: storyItem.key,
      label: storyItem.label,
      holderKey: storyItem.holderKey,
    })
    .from(storyItem)
    .where(eq(storyItem.storyId, storyId));

  const [campaignRow] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, storyId));

  const activityRows = await tx
    .select({
      id: gameActivity.id,
      plan: gameActivity.plan,
      state: gameActivity.state,
      boundariesSettled: gameActivity.boundariesSettled,
      revision: gameActivity.revision,
      progress: gameActivity.progress,
    })
    .from(gameActivity)
    .where(eq(gameActivity.storyId, storyId));

  const obligationRows = await tx
    .select({
      id: worldObligation.id,
      revision: worldObligation.revision,
      definition: worldObligation.definition,
      dueGameSecond: worldObligation.dueGameSecond,
      state: worldObligation.state,
      firedAtGameSecond: worldObligation.firedAtGameSecond,
    })
    .from(worldObligation)
    .where(eq(worldObligation.storyId, storyId));

  const offerRows = await tx
    .select({
      id: gameOffer.id,
      narrativeRevision: gameOffer.narrativeRevision,
      plans: gameOffer.plans,
    })
    .from(gameOffer)
    .where(eq(gameOffer.storyId, storyId));

  const executionRows = await tx
    .select({
      operationId: gameActionExecution.operationId,
      offerId: gameActionExecution.offerId,
      actionKey: gameActionExecution.actionKey,
      baseRevision: gameActionExecution.baseRevision,
      offer: gameActionExecution.offer,
      plan: gameActionExecution.plan,
      pendingResolution: gameActionExecution.pendingResolution,
      preparationGenerationId: gameActionExecution.preparationGenerationId,
      startGameSecond: gameActionExecution.startGameSecond,
      targetGameSecond: gameActionExecution.targetGameSecond,
      state: gameActionExecution.state,
      revision: gameActionExecution.revision,
    })
    .from(gameActionExecution)
    .where(eq(gameActionExecution.storyId, storyId));

  const snapshot: SceneAfterState = {
    continuityNotes: storyRow.continuityNotes,
    activeSceneScope: storyRow.activeSceneScope,
    storyItems: sortStoryItems(itemRows),
    campaign: campaignRow ? mapCampaignRow(campaignRow) : null,
    activities: sortById(activityRows),
    worldObligations: sortById(obligationRows),
    gameOffers: sortById(offerRows),
    actionExecutions: sortByOperationId(executionRows),
  };

  assertSceneAfterStateRepresentable(snapshot);
  return snapshot;
}

/** Read-only snapshot outside a caller-owned story lock transaction. */
export async function readSceneAfterStateFromDatabase(
  database: Database,
  storyId: string,
): Promise<SceneAfterState> {
  return database.db.transaction((tx) => readSceneAfterState(tx, storyId));
}
