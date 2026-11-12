'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Local offer-tree navigation only. Resets when the offer identity changes.
 * Must never clear or remount campaign command retry identity.
 */
export function useOfferPath(offerId: string | null | undefined) {
  const [path, setPath] = useState<string[]>([]);
  const [successorPaths, setSuccessorPaths] = useState<string[][]>([]);
  const [planHorizonGameSeconds, setPlanHorizonGameSeconds] = useState(60);
  const seenOfferId = useRef(offerId);

  useEffect(() => {
    if (seenOfferId.current === offerId) {
      return;
    }
    seenOfferId.current = offerId;
    setPath([]);
    setSuccessorPaths([]);
  }, [offerId]);

  return {
    path,
    setPath,
    successorPaths,
    setSuccessorPaths,
    planHorizonGameSeconds,
    setPlanHorizonGameSeconds,
  };
}
