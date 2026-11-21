import type { StorytellerRuntimeOptions } from '@offscreen/story-engine/storyteller';
import { prepareOpenRouterWire } from '@offscreen/storyteller/providers/openrouter';

type FakeProvider = NonNullable<StorytellerRuntimeOptions['provider']>;

/**
 * OBS00-C: the application refuses (before budget reservation and dispatch) any
 * provider that cannot attest the exact wire packet it would send. Local fake
 * providers in these suites never leave the process and read no credentials;
 * they attest with the production wire builder so the real review, equality
 * and settlement machinery is what these tests exercise.
 */
export function attestedFake(fn: FakeProvider): FakeProvider {
  return Object.assign(fn, { prepareWire: prepareOpenRouterWire });
}
