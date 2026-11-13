import type { Page, Request, Response } from 'playwright';

/** Redacted route class for W14 receipts — never log cookies or story prose. */
export type PrivateRouteClass =
  | 'play-html'
  | 'play-snapshot-get'
  | 'play-updates-sse'
  | 'stories-html'
  | 'sign-in-html'
  | 'other';

export type PrivateRouteRequestSample = Readonly<{
  class: PrivateRouteClass;
  method: string;
  status: number | null;
  timingMs: number | null;
}>;

export type PrivateRouteMetricsReceipt = Readonly<{
  revisionHint: string;
  environment: 'next-start+nest+disposable-db';
  sample: Readonly<{
    htmlBytes: number;
    scriptRequests: number;
    playSnapshotGetsBeforeHeading: number;
    playSnapshotGetsTotal: number;
    sseOpens: number;
    wallMsToHeading: number;
  }>;
  requests: readonly PrivateRouteRequestSample[];
}>;

function classifyUrl(url: string, storyId: string): PrivateRouteClass {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path === `/play/${storyId}`) return 'play-html';
    if (path === `/api/stories/${storyId}/updates`) return 'play-updates-sse';
    if (path === `/api/stories/${storyId}`) return 'play-snapshot-get';
    if (path === '/stories') return 'stories-html';
    if (path === '/sign-in') return 'sign-in-html';
  } catch {
    return 'other';
  }
  return 'other';
}

/** Attach Playwright network listeners and build a redacted W14 metrics receipt. */
export function attachPrivateRouteMetrics(
  page: Page,
  args: { storyId: string; revisionHint: string },
) {
  const started = new Map<Request, number>();
  const samples: PrivateRouteRequestSample[] = [];
  let playSnapshotGets = 0;
  let playSnapshotGetsBeforeHeading = 0;
  let sseOpens = 0;
  let headingSeen = false;
  const wallStarted = Date.now();
  let wallMsToHeading = 0;

  const onRequest = (request: Request) => {
    started.set(request, Date.now());
    const kind = classifyUrl(request.url(), args.storyId);
    if (kind === 'play-snapshot-get' && request.method() === 'GET') {
      playSnapshotGets += 1;
      if (!headingSeen) {
        playSnapshotGetsBeforeHeading += 1;
      }
    }
    if (kind === 'play-updates-sse') {
      sseOpens += 1;
    }
  };

  const onResponse = (response: Response) => {
    const request = response.request();
    const began = started.get(request);
    const kind = classifyUrl(request.url(), args.storyId);
    if (kind === 'other' && request.resourceType() !== 'script') {
      return;
    }
    samples.push({
      class: kind === 'other' ? 'other' : kind,
      method: request.method(),
      status: response.status(),
      timingMs: began === undefined ? null : Date.now() - began,
    });
  };

  page.on('request', onRequest);
  page.on('response', onResponse);

  return {
    markHeadingVisible() {
      if (!headingSeen) {
        headingSeen = true;
        wallMsToHeading = Date.now() - wallStarted;
      }
    },
    async receipt(html: string): Promise<PrivateRouteMetricsReceipt> {
      page.off('request', onRequest);
      page.off('response', onResponse);
      const scriptRequests = samples.filter(
        (sample) => sample.class === 'other' && sample.method === 'GET',
      ).length;
      return {
        revisionHint: args.revisionHint,
        environment: 'next-start+nest+disposable-db',
        sample: {
          htmlBytes: Buffer.byteLength(html, 'utf8'),
          scriptRequests,
          playSnapshotGetsBeforeHeading,
          playSnapshotGetsTotal: playSnapshotGets,
          sseOpens,
          wallMsToHeading,
        },
        requests: samples.filter((sample) => sample.class !== 'other'),
      };
    },
  };
}
