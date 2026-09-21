import {
  longStoryMemoryCorpusSchema,
  type LongStoryMemoryCorpus,
  type MemoryOracleQuery,
} from '@offscreen/contracts/memory-evaluation';
import type { DocumentStore } from '@offscreen/documents';
import { createHash } from 'node:crypto';

function stableUuid(seed: string) {
  const value = createHash('sha256').update(seed).digest('hex').slice(0, 32);
  const versioned = `${value.slice(0, 12)}5${value.slice(13, 16)}8${value.slice(17)}`;
  return `${versioned.slice(0, 8)}-${versioned.slice(8, 12)}-${versioned.slice(12, 16)}-${versioned.slice(16, 20)}-${versioned.slice(20)}`;
}

const budget = {
  maxCandidates: 6,
  maxReads: 3,
  maxBytes: 12 * 1024,
  maxRounds: 2,
} as const;

function query(
  id: string,
  queryClass: MemoryOracleQuery['queryClass'],
  text: string,
  expectedEvidence: string[],
  forbiddenEvidence: string[] = [],
  time: MemoryOracleQuery['scope']['time'] = 'any',
): MemoryOracleQuery {
  return {
    id,
    queryClass,
    informationNeed: text,
    query: text,
    expectedEvidence,
    acceptableEvidence: [],
    forbiddenEvidence,
    scope: {
      branchKey: 'main',
      currentVersionsOnly: time !== 'historical',
      visibilities: ['player-known', 'storyteller-private'],
      time,
    },
    abstainWhenExpectedMissing: true,
    budget,
  };
}

function scenes(corpusId: string, count: number, landmarks: Map<number, string>) {
  return Array.from({ length: count }, (_, index) => {
    const sequence = index + 1;
    return {
      sequence,
      tick: String(sequence * 10),
      documentId: stableUuid(`${corpusId}:scene:${sequence}`),
      path: `sources/passages/${String(sequence).padStart(4, '0')}.json`,
      title: `Passage ${sequence}`,
      paragraphs: [
        landmarks.get(sequence) ??
          `Ordinary interval ${sequence}: weather, movement and attention changed without establishing a durable named fact.`,
      ],
    };
  });
}

type EvidenceInput = Omit<LongStoryMemoryCorpus['evidence'][number], 'documentId'>;

function evidence(corpusId: string, entries: EvidenceInput[]) {
  return entries.map((entry) => ({
    ...entry,
    documentId: stableUuid(`${corpusId}:evidence:${entry.key}`),
  }));
}

function greywakeCorpus(sceneCount: number): LongStoryMemoryCorpus {
  const id = `greywake-${sceneCount}`;
  const landmarks = new Map([
    [7, 'Mira Vale accepted the brass key and promised to keep it beneath the blue ledger.'],
    [9, 'The player promised Mira Vale a quiet favor after damaging the western shutter.'],
    [12, 'Mira Vale warned that the exposed bridge road was unsafe, reporting what she had heard rather than proving it.'],
    [61, 'Mira Pell, a cartographer unrelated to the innkeeper, arrived with salt-stained charts.'],
    [143, 'Workers repaired the bridge; the patient tide road is now the sheltered current route.'],
    [188, 'The return to Greywake renewed the small unpaid favor and revealed the shutter still damaged.'],
  ]);
  const records = evidence(id, [
    { key: 'identity.player', revision: 1, path: 'identities/player.md', kind: 'identity', authority: 'canon', visibility: 'player-known', title: 'The player', body: 'The returning traveler known at Greywake.', sourceSequences: [1] },
    { key: 'identity.mira-vale', revision: 1, path: 'identities/mira-vale.md', kind: 'identity', authority: 'canon', visibility: 'player-known', title: 'Mira Vale', body: 'Greywake innkeeper; keeper of the blue ledger and the brass key.', sourceSequences: [7] },
    { key: 'identity.mira-pell', revision: 1, path: 'identities/mira-pell.md', kind: 'identity', authority: 'canon', visibility: 'player-known', title: 'Mira Pell', body: 'A visiting cartographer, distinct from Mira Vale.', sourceSequences: [61] },
    { key: 'place.greywake', revision: 1, path: 'locations/greywake-quay.md', kind: 'lore', authority: 'canon', visibility: 'player-known', title: 'Greywake quay', body: 'A salt quay with an inn whose western shutter remains damaged.', sourceSequences: [9, 188] },
    { key: 'relationship.open-favor', revision: 1, path: 'relationships/mira-vale-favor.md', kind: 'relationship', authority: 'canon', visibility: 'player-known', title: 'A quiet favor', body: 'The player still owes Mira Vale one quiet favor; no deadline was established.', sourceSequences: [9, 188] },
    { key: 'claim.bridge-warning', revision: 1, path: 'claims/old-bridge-warning.md', kind: 'narrative-thread', authority: 'attributed', visibility: 'player-known', title: 'Mira Vale reported an unsafe road', body: 'Historical claim: Mira Vale said the exposed bridge road was unsafe.', sourceSequences: [12] },
    { key: 'thread.patient-tide-current', revision: 2, path: 'threads/patient-tide-return.md', kind: 'narrative-thread', authority: 'canon', visibility: 'player-known', title: 'Patient tide return', body: 'Current correction: the bridge was repaired. The sheltered patient tide road is the current route.', sourceSequences: [12, 143] },
    { key: 'possibility.smugglers', revision: 1, path: 'possibilities/smugglers.md', kind: 'private-possibility', authority: 'noncanonical', visibility: 'storyteller-private', title: 'Possible smugglers', body: 'A private unconfirmed possibility about smugglers beneath the quay.', sourceSequences: [70] },
    { key: 'decoy.false-road', revision: 1, path: 'developer/false-tide-road.md', kind: 'lore', authority: 'noncanonical', visibility: 'developer-private', title: 'False tide road', body: 'Decoy: patient tide road remains exposed and broken.', sourceSequences: [12] },
    { key: 'branch.destroyed-greywake', revision: 1, path: 'developer/fork-destroyed-greywake.md', kind: 'lore', authority: 'noncanonical', visibility: 'developer-private', title: 'Destroyed Greywake fork', body: 'Alternate branch only: Greywake was destroyed by a falling star.', sourceSequences: [120] },
  ]);
  const queries = [
    query('greywake.current-route', 'exact-current-state', 'What is the current patient tide route?', ['thread.patient-tide-current'], ['claim.bridge-warning', 'decoy.false-road'], 'current'),
    query('greywake.which-mira', 'alias-disambiguation', 'Which Mira keeps the blue ledger?', ['identity.mira-vale'], ['identity.mira-pell']),
    query('greywake.promise-words', 'exact-wording', 'What exactly was promised to Mira Vale?', ['relationship.open-favor']),
    query('greywake.coiled-return', 'paraphrased-callback', 'What old obligation should shape this homecoming?', ['relationship.open-favor']),
    query('greywake.mira-quay-link', 'multi-hop-relation', 'How is Mira Vale connected to the damaged Greywake quay?', ['identity.mira-vale', 'place.greywake', 'relationship.open-favor']),
    query('greywake.bridge-update', 'temporal-update', 'What changed after the warning about the bridge road?', ['claim.bridge-warning', 'thread.patient-tide-current']),
    query('greywake.report-not-proof', 'attributed-claim', 'What did Mira report rather than establish?', ['claim.bridge-warning']),
    query('greywake.exclude-decoy', 'private-decoy', 'Find the current patient tide road without developer evidence.', ['thread.patient-tide-current'], ['decoy.false-road']),
    query('greywake.small-favor', 'low-drama-detail', 'Recall the quiet unfinished social detail from long ago.', ['relationship.open-favor']),
    query('greywake.catch-up', 'broad-synthesis', 'Summarize the pressures shaping the return to Greywake.', ['place.greywake', 'relationship.open-favor', 'thread.patient-tide-current']),
    query('greywake.no-deadline', 'absence-abstention', 'favor deadline', ['relationship.open-favor']),
    query('greywake.main-branch', 'branch-isolation', 'What is true of Greywake on this branch?', ['place.greywake'], ['branch.destroyed-greywake']),
  ];
  return longStoryMemoryCorpusSchema.parse({
    format: 'offscreen.memory-evaluation-corpus.v1',
    id,
    worldContrast: 'conventional',
    campaignId: stableUuid(`${id}:campaign`),
    branch: { key: 'main', id: stableUuid(`${id}:branch:main`), parentKey: null, forkSequence: null },
    scenes: scenes(id, sceneCount, landmarks),
    evidence: records,
    queries,
  });
}

function gradientCorpus(sceneCount: number): LongStoryMemoryCorpus {
  const id = `gradient-life-${sceneCount}`;
  const records = evidence(id, [
    { key: 'identity.gradient-organism', revision: 1, path: 'identities/gradient-organism.md', kind: 'identity', authority: 'canon', visibility: 'player-known', title: 'Gradient organism', body: 'A distributed chemical consciousness without humanoid anatomy.', sourceSequences: [1] },
    { key: 'lore.iron-gradient', revision: 1, path: 'environments/iron-gradient.md', kind: 'lore', authority: 'canon', visibility: 'player-known', title: 'Iron gradient', body: 'The organism previously survived the sharp iron gradient by slowing exchange.', sourceSequences: [37] },
  ]);
  return longStoryMemoryCorpusSchema.parse({
    format: 'offscreen.memory-evaluation-corpus.v1', id, worldContrast: 'abstract',
    campaignId: stableUuid(`${id}:campaign`),
    branch: { key: 'main', id: stableUuid(`${id}:branch:main`), parentKey: null, forkSequence: null },
    scenes: scenes(id, sceneCount, new Map([[37, 'The distributed organism slowed exchange and survived a sharp iron gradient.']])),
    evidence: records,
    queries: [query('gradient.no-human-defaults', 'abstract-world-contrast', 'What prior adaptation applies without inventing taverns wages humanoids or calendars?', ['lore.iron-gradient'], ['identity.keeper', 'place.warehouse', 'thread.employment'])],
  });
}

export function buildLongStoryMemoryCorpus(
  world: 'greywake' | 'greywake-destroyed-fork' | 'gradient-life',
  sceneCount = 200,
) {
  if (world === 'gradient-life') return gradientCorpus(sceneCount);
  const main = greywakeCorpus(sceneCount);
  if (world === 'greywake') return main;
  const id = `greywake-destroyed-fork-${sceneCount}`;
  return longStoryMemoryCorpusSchema.parse({
    ...main,
    id,
    campaignId: stableUuid(`${id}:campaign`),
    branch: {
      key: 'destroyed-fork',
      id: stableUuid(`${id}:branch:destroyed-fork`),
      parentKey: 'main',
      forkSequence: 120,
    },
    scenes: main.scenes.map((scene) => ({
      ...scene,
      documentId: stableUuid(`${id}:scene:${scene.sequence}`),
      ...(scene.sequence === 120
        ? {
            paragraphs: [
              'A falling star destroyed Greywake on this alternate branch.',
            ],
          }
        : {}),
    })),
    evidence: main.evidence.map((entry) => ({
      ...entry,
      documentId: stableUuid(`${id}:evidence:${entry.key}`),
      ...(entry.key === 'place.greywake'
        ? {
            revision: 2,
            body: 'On this alternate branch, a falling star destroyed Greywake.',
            sourceSequences: [120],
          }
        : {}),
    })),
    queries: main.queries.map((entry) => ({
      ...entry,
      scope: { ...entry.scope, branchKey: 'destroyed-fork' },
    })),
  });
}

export async function materializeLongStoryMemoryCorpus(
  storage: DocumentStore,
  corpus: LongStoryMemoryCorpus,
) {
  const sceneIds = new Map(corpus.scenes.map((scene) => [scene.sequence, scene.documentId]));
  const entries = [];
  for (const scene of corpus.scenes) {
    const objectHash = await storage.putSourcePassage({
      format: 'offscreen.source-passage.v1',
      envelope: { documentId: scene.documentId, kind: 'source-passage', schemaVersion: 1, revision: 1, authority: 'source', visibility: 'player-known', sources: [], coverage: { fromSequence: scene.sequence, throughSequence: scene.sequence, fromTick: scene.tick, throughTick: scene.tick } },
      content: { version: 1, title: scene.title, paragraphs: scene.paragraphs },
    });
    entries.push({ documentId: scene.documentId, revision: 1, path: scene.path, objectHash, kind: 'source-passage' as const, authority: 'source' as const, visibility: 'player-known' as const });
  }
  for (const record of corpus.evidence) {
    const objectHash = await storage.putDocument({
      format: 'offscreen.document.v1',
      envelope: { documentId: record.documentId, kind: record.kind, schemaVersion: 1, revision: record.revision, authority: record.authority, visibility: record.visibility, sources: record.sourceSequences.map((sequence) => ({ documentId: sceneIds.get(sequence)!, revision: 1 })), coverage: { fromSequence: Math.min(...record.sourceSequences), throughSequence: Math.max(...record.sourceSequences) } },
      title: record.title,
      body: record.body,
    });
    entries.push({ documentId: record.documentId, revision: record.revision, path: record.path, objectHash, kind: record.kind, authority: record.authority, visibility: record.visibility });
  }
  const rootHash = await storage.putManifest({ format: 'offscreen.manifest.v1', campaignId: corpus.campaignId, revision: 1, previousRootHash: null, authorOperationId: stableUuid(`${corpus.id}:materialize`), entries });
  return { corpusId: corpus.id, storyId: corpus.campaignId, rootHash, rootRevision: 1, scenes: corpus.scenes.length, evidence: corpus.evidence.length, queries: corpus.queries.length };
}
