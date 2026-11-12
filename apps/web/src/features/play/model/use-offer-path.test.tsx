import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { fixtureOfferIds } from '@/src/test/campaign-fixtures';
import { useOfferPath } from './use-offer-path';

describe('useOfferPath', () => {
  it('resets local path when offer identity changes without touching callers', () => {
    const { result, rerender } = renderHook(
      ({ offerId }) => useOfferPath(offerId),
      { initialProps: { offerId: fixtureOfferIds.offerA } },
    );

    act(() => {
      result.current.setPath(['look']);
      result.current.setSuccessorPaths([['look', 'wait']]);
    });
    expect(result.current.path).toEqual(['look']);
    expect(result.current.successorPaths).toHaveLength(1);

    rerender({ offerId: fixtureOfferIds.offerB });
    expect(result.current.path).toEqual([]);
    expect(result.current.successorPaths).toEqual([]);
  });
});
