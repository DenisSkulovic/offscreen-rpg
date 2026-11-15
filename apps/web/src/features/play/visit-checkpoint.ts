/**
 * GM06 client policy: when a visit ACK may be issued.
 * SSR, prefetch, SSE and hidden tabs must never acknowledge.
 */

export type VisitAckGateInput = Readonly<{
  visibilityState: DocumentVisibilityState | 'hidden' | 'visible' | 'prerender';
  routeIsActiveForegroundStory: boolean;
  storySituationRendered: boolean;
  digestVisibleOrExplicitContinue: boolean;
  hasTrustedVisitToken: boolean;
}>;

export function mayAcknowledgeStoryVisit(input: VisitAckGateInput): boolean {
  if (input.visibilityState !== 'visible') return false;
  if (!input.routeIsActiveForegroundStory) return false;
  if (!input.storySituationRendered) return false;
  if (!input.digestVisibleOrExplicitContinue) return false;
  if (!input.hasTrustedVisitToken) return false;
  return true;
}

export function visitDigestCopy(args: {
  previous: { eventSequence: number } | null;
  newEventCount: number;
  hasMore: boolean;
  coverage: 'since-enabled' | 'complete';
}): string {
  if (args.previous === null || args.coverage !== 'since-enabled') {
    return 'Recent developments';
  }
  if (args.newEventCount === 0) {
    return 'No new recorded developments since your last opening';
  }
  if (args.hasMore) {
    return 'Since you last opened this story — showing the most recent recorded developments; see more in Journal';
  }
  return 'Since you last opened this story';
}
