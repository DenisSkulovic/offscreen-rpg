/**
 * SA03: Storyteller commitment queries must not scan terminal activity history.
 * Aligns with ENG04 Now filter, plus completion-pending retained work.
 */
import { and, eq, inArray, or, type SQL } from 'drizzle-orm';
import { gameActivity } from '@offscreen/db/campaign-schema';

/** Nonterminal / retained commitments eligible for Storyteller current context. */
export const STORYTELLER_ACTIVITY_STATES = [
  'running',
  'paused',
  'encounter',
  'suspended',
  'blocked',
  'completion-pending',
] as const;

export type StorytellerActivityState =
  (typeof STORYTELLER_ACTIVITY_STATES)[number];

export function isStorytellerActivityState(
  state: string,
): state is StorytellerActivityState {
  return (STORYTELLER_ACTIVITY_STATES as readonly string[]).includes(state);
}

/** SQL predicate: active row (if any) plus nonterminal commitments for one story. */
export function storytellerActivityContextFilter(input: {
  storyId: string;
  activeActivityId: string | null;
}): SQL {
  const nonterminal = inArray(
    gameActivity.state,
    STORYTELLER_ACTIVITY_STATES as unknown as string[],
  );
  const activityFilter = input.activeActivityId
    ? or(eq(gameActivity.id, input.activeActivityId), nonterminal)
    : nonterminal;
  const filter = and(eq(gameActivity.storyId, input.storyId), activityFilter);
  if (!filter) {
    throw new Error('Storyteller activity filter must constrain a story.');
  }
  return filter;
}
