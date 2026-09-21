import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildLongStoryMemoryCorpus,
  materializeLongStoryMemoryCorpus,
} from '@offscreen/application/developer-tools';
import {
  createStorytellerRuntime,
  loadCanonicalKnowledge,
  prepareAdmittedStorytellerTask,
} from '@offscreen/application/storyteller';
import { dispatchReviewResponseSchema } from '@offscreen/contracts/chamber';
import type { EffectiveUsagePolicy } from '@offscreen/contracts/usage-policy';
import type { Database } from '@offscreen/db';
import { generation } from '@offscreen/db/generation-schema';
import { storytellerPublication } from '@offscreen/db/storyteller-schema';
import type { DocumentStore } from '@offscreen/documents';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import type { ExecutionPolicy } from '@offscreen/storyteller/tasks';

/**
 * Capture the exact first model round produced by the ordinary durable memory
 * controller. The provider is a tripwire: a successful capture must stop at
 * dispatch review before transport or spend.
 */
export async function captureHeldMemoryPacket(input: {
  apiOrigin: string;
  browserOrigin: string;
  cookie: string;
  database: Database;
  documentStore: DocumentStore;
  ownerId: string;
  execution: Extract<ExecutionPolicy, { mode: 'provider' }>;
  usagePolicy: EffectiveUsagePolicy;
}) {
  const corpus = buildLongStoryMemoryCorpus('greywake');
  const materialized = await materializeLongStoryMemoryCorpus(
    input.documentStore,
    corpus,
  );
  const canonicalKnowledge = await loadCanonicalKnowledge(input.documentStore, {
    storyId: materialized.storyId,
    rootHash: materialized.rootHash,
    rootRevision: materialized.rootRevision,
  });
  const currentScene = corpus.scenes.at(-1);
  if (!currentScene) throw new Error('Memory corpus has no current passage');

  const current = {
    id: currentScene.documentId,
    sequence: currentScene.sequence,
    content: {
      version: 1 as const,
      title: currentScene.title,
      paragraphs: currentScene.paragraphs,
    },
    response: null,
  };
  const task = prepareAdmittedStorytellerTask(
    {
      task: 'continuation',
      source: {
        storyId: corpus.campaignId,
        narrativeRevision: currentScene.sequence,
        passageId: currentScene.documentId,
        interactionId: randomUUID(),
      },
      profile: storytellerCatalogue.resolve({
        id: 'quiet-eerie-mystery',
        revision: 1,
      }),
      execution: input.execution,
      context: {
        canonicalKnowledge,
        premise: {
          title: 'Return to Greywake',
          premise:
            'A traveler returns to Greywake after a long absence and tries to resume an ordinary life.',
          storytellingDirection:
            'Recover only relevant established history before narrating the return.',
        },
        current,
        selected: {
          id: 'ask-key-hiding-place',
          label: 'Ask Mira where she hid the brass key',
          intention:
            'Ask Mira Vale to repeat the exact old hiding place she named for the brass key, without guessing from the current ledger or forcing a larger commitment.',
        },
        items: [],
        notes: [],
        evidence: [current],
      },
    },
    input.usagePolicy,
    {
      posture: 'minimal',
      requested: {
        maxQueries: 1,
        maxReads: 1,
        maxRetainedBytes: 4096,
        maxModelRounds: 1,
      },
    },
  );
  const generationId = randomUUID();
  await input.database.db.transaction(async (tx) => {
    await tx.insert(generation).values({
      id: generationId,
      ownerId: input.ownerId,
      kind: 'storyteller.profiled.v1',
      input: task,
    });
    await tx.insert(storytellerPublication).values({ generationId });
  });

  const runtime = createStorytellerRuntime(input.database, {
    documentStore: input.documentStore,
    dispatchAuthority: () => input.usagePolicy,
    provider: async () => {
      throw new Error('Held memory packet attempted provider transport');
    },
  });
  await runtime.complete(generationId);

  const response = await fetch(
    `${input.apiOrigin}/api/chamber-tools/generations/${generationId}/dispatch-review`,
    { headers: { cookie: input.cookie, origin: input.browserOrigin } },
  );
  if (!response.ok) {
    throw new Error(`Memory packet review was unavailable: ${response.status}`);
  }
  const review = dispatchReviewResponseSchema.parse(await response.json()).review;
  const accounting = await input.database.db.$client.query(
    `SELECT
       (SELECT count(*) FROM storyteller_attempt WHERE generation_id = $1) AS attempts,
       (SELECT count(*) FROM storyteller_dispatch_review WHERE generation_id = $1 AND state = 'awaiting-review') AS held,
       (SELECT state FROM storyteller_memory_exploration WHERE generation_id = $1) AS memory_state`,
    [generationId],
  );
  const row = accounting.rows[0];
  if (row?.attempts !== '0' || row?.held !== '1' || row?.memory_state !== 'held') {
    throw new Error('Memory packet did not stop cleanly before provider accounting');
  }

  const evidenceDirectory = join(tmpdir(), 'offscreen-rpg-packet-review');
  await mkdir(evidenceDirectory, { recursive: true });
  const evidencePath = join(
    evidenceDirectory,
    `memory-request-${generationId}.json`,
  );
  await writeFile(
    evidencePath,
    `${JSON.stringify(
      {
        corpus: materialized,
        generationId,
        accounting: { attempts: 0, heldReviews: 1, memoryState: 'held' },
        review,
      },
      null,
      2,
    )}\n`,
    { encoding: 'utf8', flag: 'wx' },
  );
  return { evidencePath, generationId, review, corpus: materialized } as const;
}
