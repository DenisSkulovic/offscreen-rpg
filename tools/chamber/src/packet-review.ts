import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { dispatchReviewResponseSchema } from '@offscreen/contracts/chamber';
import type { DispatchReviewView } from '@offscreen/contracts/chamber';
import { draftSchema } from '@offscreen/contracts/drafts';
import type { Database } from '@offscreen/db';

/**
 * Exercise normal HTTP admission and the worker's durable dispatch hold without
 * starting a browser or constructing a provider. The generation-scoped name
 * preserves earlier evidence so packet comparisons cannot silently overwrite it.
 */
export async function captureHeldOpeningPacket(input: {
  apiOrigin: string;
  browserOrigin: string;
  cookie: string;
  database: Database;
  contentId?: string;
}) {
  const draftId = crypto.randomUUID();
  const generationId = crypto.randomUUID();
  const request = async (path: string, init?: RequestInit) => {
    const response = await fetch(`${input.apiOrigin}${path}`, {
      ...init,
      headers: {
        cookie: input.cookie,
        origin: input.browserOrigin,
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`Packet-review API failed: ${response.status} ${path}`);
    }
    return response.json();
  };
  const draft = draftSchema.parse(
    await request(`/api/drafts/${draftId}`, {
      method: 'PUT',
      body: JSON.stringify({
        expectedRevision: 0,
        storyteller: { id: 'quiet-eerie-mystery', revision: 1 },
        title: '',
        premise:
          'I am a newly arrived prisoner in Seyda Neen. I have little money, no local standing, and want to reach Balmora without the world waiting passively for me.',
        storytellingDirection: '',
      }),
    }),
  );
  await request(`/api/drafts/${draftId}/openings/${generationId}`, {
    method: 'PUT',
    body: JSON.stringify({
      expectedRevision: draft.revision,
      ...(input.contentId ? { contentId: input.contentId } : {}),
    }),
  });
  let captured: DispatchReviewView | undefined;
  for (let read = 0; read < 30; read++) {
    const response = await fetch(
      `${input.apiOrigin}/api/chamber-tools/generations/${generationId}/dispatch-review`,
      { headers: { cookie: input.cookie, origin: input.browserOrigin } },
    );
    if (response.ok) {
      captured = dispatchReviewResponseSchema.parse(await response.json()).review;
      break;
    }
    await delay(200);
  }
  if (!captured) throw new Error('Held packet was not captured');
  const accounting = await input.database.db.$client.query(
    'SELECT (SELECT count(*) FROM storyteller_attempt WHERE generation_id = $1) AS attempts, (SELECT count(*) FROM storyteller_dispatch_review WHERE generation_id = $1 AND state = $2) AS held',
    [generationId, 'awaiting-review'],
  );
  if (
    accounting.rows[0]?.attempts !== '0' ||
    accounting.rows[0]?.held !== '1'
  ) {
    throw new Error('Held packet unexpectedly reached provider accounting');
  }
  const evidenceDirectory = join(tmpdir(), 'offscreen-rpg-packet-review');
  await mkdir(evidenceDirectory, { recursive: true });
  const evidencePath = join(
    evidenceDirectory,
    `opening-request-${generationId}.json`,
  );
  await writeFile(evidencePath, `${JSON.stringify(captured, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
  return { evidencePath, draftId, generationId, review: captured } as const;
}
