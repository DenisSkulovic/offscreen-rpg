'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * True only after a verified passage id replaces a previous one.
 * First paint, a same-id refresh, and a held command do not count.
 */
export function usePassageArrival(
  passageId: string | undefined,
  style: 'none' | 'fade' | 'rise-subtle',
  held = false,
) {
  const previous = useRef<string | null>(null);
  const [arrival, setArrival] = useState(false);
  useEffect(() => {
    if (held) {
      setArrival(false);
      return;
    }
    const prior = previous.current;
    previous.current = passageId ?? null;
    if (prior === null || style === 'none' || prior === passageId) {
      setArrival(false);
      return;
    }
    setArrival(true);
  }, [passageId, style, held]);
  return arrival;
}
