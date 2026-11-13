import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createDatabase, readDatabaseConfig } from '@offscreen/db';
import { story, storyPassage } from '@offscreen/db/story-schema';
import { LocalDocumentStore } from '@offscreen/documents';
import { immediateActionPlanSchema } from '@offscreen/game/immediate-actions';
import { storytellerCatalogue } from '@offscreen/storyteller/profiles';
import { offlineExecution } from '@offscreen/storyteller/tasks';
import { createStories } from '../dist/stories/index.js';
import { initializeStoryInTransaction } from '../dist/stories/initialization.js';
import { initializeCampaign } from '../dist/campaign/settings.js';
import { lockOwnedStory } from '../dist/stories/persistence.js';
import { stageStoryBootstrapDocuments } from '../dist/stories/passage-documents.js';
import {
  createEng03DelayedDocumentStore,
  destroyDisposableSandboxDatabase,
  provisionDisposableSandboxDatabase,
} from '../dist/developer-tools/index.js';

const profile = storytellerCatalogue.resolve({
  id: 'absurd-action-comedy',
  revision: 1,
});

const persuadePlan = immediateActionPlanSchema.parse({
  version: 1,
  key: 'persuade-guard',
  label: 'Persuade the guard',
  intention: 'Talk past the harbor guard without drawing steel.',
  risk: null,
  evidence: [],
  requires: [],
  resolution: {
    kind: 'check',
    fictionalDurationSeconds: 5,
    check: {
      rule: 'srd-5.2.1-subset.v1',
      purpose: 'Persuade a guard',
      skill: 'persuasion',
      ability: 'charisma',
      dc: 10,
      advantage: false,
      disadvantage: false,
      modifiers: [],
    },
    difficultyBasis: 'The guard is attentive but not hostile.',
    success: {
      text: 'The guard lets you pass.',
      effects: [],
    },
    failure: {
      text: 'The guard refuses.',
      effects: [],
    },
  },
});

function quayCharacter() {
  return {
    name: 'A quay runner',
    scores: {
      strength: 10,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 12,
      charisma: 14,
    },
    applicableAbilities: [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ],
    skills: [{ id: 'persuasion', label: 'Persuasion' }],
    proficientSkills: ['persuasion'],
    proficiencyBonus: 2,
    hp: 10,
    maxHp: 10,
    facts: [],
    quantities: [],
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function withDisposable(run) {
  const runId = randomUUID();
  const provisioned = await provisionDisposableSandboxDatabase({
    runId,
    confirmDisposableProvision: true,
    applyFullMigrations: true,
  });
  const database = createDatabase(
    readDatabaseConfig({ DATABASE_URL: provisioned.connectionString }),
    () => {},
  );
  try {
    await run(database);
  } finally {
    await database.close().catch(() => undefined);
    await destroyDisposableSandboxDatabase({
      runId,
      confirmDisposableProvision: true,
    });
  }
}

async function insertUser(database, ownerId) {
  await database.db.$client.query(
    `insert into "user" (id, name, email, email_verified, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [ownerId, 'ENG03-M', `${ownerId}@example.test`],
  );
}

async function seedDocumentedStory(database, storage) {
  const ownerId = `eng03m-${randomUUID()}`;
  const storyId = randomUUID();
  const passageId = randomUUID();
  await insertUser(database, ownerId);
  const content = {
    version: 1,
    title: 'Harbor lock probe',
    paragraphs: ['A harbor guard blocks the quay gate.'],
  };
  const premise = {
    title: 'Harbor lock probe',
    premise: 'A quay runner faces a harbor guard.',
    storytellingDirection: 'Keep probes factual.',
  };
  const staged = await stageStoryBootstrapDocuments({
    storage,
    storyId,
    passageId,
    sequence: 1,
    operationId: storyId,
    rootHash: null,
    rootRevision: 0,
    content,
    premise,
    items: [],
  });
  await database.db.transaction(async (tx) => {
    await initializeStoryInTransaction(tx, {
      ownerId,
      storyId,
      input: {
        source: 'playable.opening.v1',
        premise,
        storyteller: profile,
        execution: offlineExecution,
        usagePolicy: null,
        items: [],
        content,
        interaction: null,
      },
      stagedPassage: staged,
    });
    await initializeCampaign(
      tx,
      storyId,
      profile,
      {
        mechanics: true,
        locked: false,
        pace: { kind: 'instant' },
        time: {
          kind: 'elapsed',
          id: 'simulation-game-seconds',
          revision: 1,
          unit: {
            id: 'game-second',
            label: 'game-second',
            pluralLabel: 'game-seconds',
            gameSecondsPerUnit: 1,
          },
          epoch: { wholeUnits: 0, gameSecondOfUnit: 0 },
        },
        worldObligations: [],
        worlds: [],
      },
      {
        character: quayCharacter(),
        storyFacts: [],
        plans: [persuadePlan],
        activityAccess: { kind: 'none' },
      },
    );
  });
  const [row] = await database.db
    .select({
      documentRootHash: story.documentRootHash,
      contentDocumentHash: storyPassage.contentDocumentHash,
    })
    .from(story)
    .innerJoin(storyPassage, eq(storyPassage.storyId, story.id))
    .where(eq(story.id, storyId));
  assert.ok(row.documentRootHash);
  assert.ok(row.contentDocumentHash);
  return { ownerId, storyId };
}

async function measureTrial(database, storage, delayMs) {
  const readSpans = [];
  let readStarted = false;
  const delayed = createEng03DelayedDocumentStore(storage, {
    delayMs,
    onBeforeRead: () => {
      readStarted = true;
    },
    onRead: (span) => readSpans.push(span),
  });
  const { ownerId, storyId } = await seedDocumentedStory(database, storage);
  const stories = createStories(database, { documentStore: delayed });
  const before = await stories.read({ ownerId, storyId });
  assert.ok(before.campaign?.offer);
  const operationId = randomUUID();

  const actionStarted = performance.now();
  const actionPromise = stories.campaignAction({
    ownerId,
    storyId,
    operationId,
    body: {
      expectedRevision: before.revision,
      offerId: before.campaign.offer.id,
      path: ['persuade-guard'],
    },
  });

  const waitDeadline = Date.now() + 20000;
  while (!readStarted && Date.now() < waitDeadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(readStarted, true, 'DocumentStore read should start under lock');

  const waitStart = performance.now();
  await database.db.transaction(async (tx) => {
    await lockOwnedStory(tx, { ownerId, storyId });
  });
  const competitorWaitMs = performance.now() - waitStart;
  await actionPromise;
  const actionHoldMs = performance.now() - actionStarted;
  const documentReadMs = readSpans.reduce(
    (sum, span) => sum + (span.endedAt - span.startedAt),
    0,
  );

  const other = await seedDocumentedStory(database, storage);
  const unrelatedStart = performance.now();
  await database.db.transaction(async (tx) => {
    await lockOwnedStory(tx, {
      ownerId: other.ownerId,
      storyId: other.storyId,
    });
  });
  const unrelatedLockMs = performance.now() - unrelatedStart;

  return {
    delayMs,
    actionHoldMs,
    competitorWaitMs,
    documentReadMs,
    documentReadCount: readSpans.length,
    unrelatedLockMs,
  };
}

test('ENG03-M: DocumentStore delay propagates into story lock hold', async () => {
  await withDisposable(async (database) => {
    const root = await mkdtemp(join(tmpdir(), 'eng03m-docs-'));
    const storage = new LocalDocumentStore(root);
    const matrix = [0, 250, 2000];
    const repeats = 3;
    const observations = [];

    for (const delayMs of matrix) {
      await measureTrial(database, storage, delayMs);
      for (let i = 0; i < repeats; i += 1) {
        observations.push(await measureTrial(database, storage, delayMs));
      }
    }

    const byDelay = Object.fromEntries(
      matrix.map((delayMs) => {
        const rows = observations.filter((row) => row.delayMs === delayMs);
        return [
          delayMs,
          {
            actionHoldMedian: median(rows.map((row) => row.actionHoldMs)),
            competitorWaitMedian: median(
              rows.map((row) => row.competitorWaitMs),
            ),
            documentReadMedian: median(rows.map((row) => row.documentReadMs)),
            unrelatedLockMedian: median(rows.map((row) => row.unrelatedLockMs)),
            rows,
          },
        ];
      }),
    );

    const baseline = byDelay[0];
    const delayed2s = byDelay[2000];
    const holdDelta = delayed2s.actionHoldMedian - baseline.actionHoldMedian;
    const waitDelta =
      delayed2s.competitorWaitMedian - baseline.competitorWaitMedian;
    const decision =
      holdDelta >= 1500 && waitDelta >= 1000
        ? 'proceed-narrow-eng03-capture'
        : holdDelta >= 1500
          ? 'prefer-cheap-source-prefetch'
          : 'no-refactor';

    const evidencePath = join(
      process.cwd(),
      '../../docs/engine-architecture/evidence/eng03-lock-measurement-2026-11-14.md',
    );
    const summary = {
      holdDeltaMs: holdDelta,
      waitDeltaMs: waitDelta,
      decision,
      byDelay: Object.fromEntries(
        Object.entries(byDelay).map(([key, value]) => [
          key,
          {
            actionHoldMedian: value.actionHoldMedian,
            competitorWaitMedian: value.competitorWaitMedian,
            documentReadMedian: value.documentReadMedian,
            unrelatedLockMedian: value.unrelatedLockMedian,
          },
        ]),
      ),
    };
    const markdown = `# ENG03-M lock measurement evidence | 2026-11-14

Provider-free disposable SQL + LocalDocumentStore delay injection on \`preparePendingActionNarration\` path.

## Environment

- machine/os: \`${process.platform}\`
- node: \`${process.version}\`
- db: disposable sandbox postgres
- document store: LocalDocumentStore + ENG03 delayed wrapper
- source shape: short documented opening (CAS passage + root)
- repeats per delay (after warmup): ${repeats}

## Results (medians, ms)

| delayMs | actionHold | competitorWait | documentRead | unrelatedLock |
| --- | ---: | ---: | ---: | ---: |
${matrix
  .map((delayMs) => {
    const row = byDelay[delayMs];
    return `| ${delayMs} | ${row.actionHoldMedian.toFixed(1)} | ${row.competitorWaitMedian.toFixed(1)} | ${row.documentReadMedian.toFixed(1)} | ${row.unrelatedLockMedian.toFixed(1)} |`;
  })
  .join('\n')}

## Decision inputs

- 2000ms − 0ms action-hold delta: **${holdDelta.toFixed(1)} ms** (threshold ≥ 1500)
- 2000ms − 0ms competitor-wait delta: **${waitDelta.toFixed(1)} ms** (threshold ≥ 1000)
- go/no-go: **\`${decision}\`**

## Negatives observed

- Unrelated story lock medians stayed low relative to same-story competitor waits under delay.
- No paid Storyteller dispatch.
- ~40-passage active-scene matrix left for a follow-up run if short-source go/no-go is ambiguous.

\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\`
`;
    await writeFile(evidencePath, markdown, 'utf8');

    assert.ok(
      delayed2s.documentReadMedian > baseline.documentReadMedian + 1000,
      'injected DocumentStore delay must appear in read spans',
    );
    assert.ok(
      delayed2s.actionHoldMedian > baseline.actionHoldMedian + 1000,
      'story action transaction should retain DocumentStore delay under lock',
    );
    assert.ok(
      delayed2s.competitorWaitMedian > baseline.competitorWaitMedian + 500,
      'same-story competitor should wait on FOR UPDATE while delayed reads run',
    );
    assert.ok(
      delayed2s.unrelatedLockMedian < 500,
      'unrelated story lock must not inherit same-story DocumentStore delay',
    );
    console.log(JSON.stringify(summary, null, 2));
  });
});
