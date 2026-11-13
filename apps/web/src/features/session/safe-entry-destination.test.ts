import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAFE_ENTRY,
  resolveSafeEntryDestination,
  signInHrefFor,
} from './safe-entry-destination';

const draftId = '11111111-1111-4111-8111-111111111111';
const storyId = '22222222-2222-4222-8222-222222222222';

describe('resolveSafeEntryDestination', () => {
  it('accepts allowlisted local destinations', () => {
    expect(resolveSafeEntryDestination('/stories')).toBe('/stories');
    expect(resolveSafeEntryDestination('/stories/new')).toBe('/stories/new');
    expect(resolveSafeEntryDestination(`/stories/new?id=${draftId}`)).toBe(
      `/stories/new?id=${draftId}`,
    );
    expect(resolveSafeEntryDestination(`/stories/${draftId}`)).toBe(
      `/stories/${draftId}`,
    );
    expect(resolveSafeEntryDestination(`/stories/${draftId}/preview`)).toBe(
      `/stories/${draftId}/preview`,
    );
    expect(resolveSafeEntryDestination(`/play/${storyId}`)).toBe(
      `/play/${storyId}`,
    );
  });

  it('rejects open redirects and hostile schemes (negative)', () => {
    expect(resolveSafeEntryDestination('https://evil.example/phish')).toBe(
      DEFAULT_SAFE_ENTRY,
    );
    expect(resolveSafeEntryDestination('//evil.example/phish')).toBe(
      DEFAULT_SAFE_ENTRY,
    );
    expect(resolveSafeEntryDestination('javascript:alert(1)')).toBe(
      DEFAULT_SAFE_ENTRY,
    );
    expect(resolveSafeEntryDestination('/\\evil.example')).toBe(
      DEFAULT_SAFE_ENTRY,
    );
    expect(
      resolveSafeEntryDestination('/%2F%2Fevil.example%2Fphish'),
    ).toBe(DEFAULT_SAFE_ENTRY);
    expect(
      resolveSafeEntryDestination('/stories/new?next=https://evil.example'),
    ).toBe(DEFAULT_SAFE_ENTRY);
    expect(resolveSafeEntryDestination('/chamber')).toBe(DEFAULT_SAFE_ENTRY);
    expect(resolveSafeEntryDestination('/sign-in')).toBe(DEFAULT_SAFE_ENTRY);
    expect(resolveSafeEntryDestination('/api/stories')).toBe(DEFAULT_SAFE_ENTRY);
    expect(resolveSafeEntryDestination(`/play/${storyId}?token=secret`)).toBe(
      DEFAULT_SAFE_ENTRY,
    );
  });

  it('defaults malformed, empty and oversized values', () => {
    expect(resolveSafeEntryDestination(undefined)).toBe(DEFAULT_SAFE_ENTRY);
    expect(resolveSafeEntryDestination('')).toBe(DEFAULT_SAFE_ENTRY);
    expect(resolveSafeEntryDestination('stories')).toBe(DEFAULT_SAFE_ENTRY);
    expect(resolveSafeEntryDestination(`/${'a'.repeat(250)}`)).toBe(
      DEFAULT_SAFE_ENTRY,
    );
  });
});

describe('signInHrefFor', () => {
  it('omits next for the default home and encodes allowlisted create', () => {
    expect(signInHrefFor('/stories')).toBe('/sign-in');
    expect(signInHrefFor('/chamber')).toBe('/sign-in');
    expect(signInHrefFor('/stories/new')).toBe(
      `/sign-in?next=${encodeURIComponent('/stories/new')}`,
    );
  });
});
