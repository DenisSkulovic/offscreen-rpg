import type { StorytellerRuntimeOptions } from '@offscreen/story-engine/storyteller';
import { attestedFake } from './attested-fake-provider.js';

let attemptedProviderSends = 0;

export function resetTestlabProviderTripwire(): void {
  attemptedProviderSends = 0;
}

export function readTestlabProviderTripwireCount(): number {
  return attemptedProviderSends;
}

/**
 * Throws if a real provider dispatch is attempted; admission-only suites keep count at zero.
 */
export function testlabProviderTripwire(): NonNullable<
  StorytellerRuntimeOptions['provider']
> {
  return attestedFake(async () => {
    attemptedProviderSends += 1;
    throw new Error(
      'TESTLAB01: live provider send is forbidden in provider-free proof',
    );
  });
}
