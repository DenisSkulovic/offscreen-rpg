import type { DocumentStore } from '@offscreen/documents';
import {
  storyRetrievalQuerySchema,
  storyRetrievalResultSchema,
  type StoryRetrievalCandidate,
  type StoryRetrievalQuery,
} from '@offscreen/contracts/story-retrieval';
import { z } from 'zod';

export const canonicalKnowledgeKinds: ReadonlySet<string> = new Set([
  'orientation',
  'identity',
  'relationship',
  'narrative-thread',
  'lore',
  'private-possibility',
  'creative-guidance',
]);

export const canonicalKnowledgePriority: ReadonlyMap<string, number> = new Map(
  [...canonicalKnowledgeKinds].map((kind, index) => [kind, index]),
);

export type CanonicalKnowledgeSearchInput = StoryRetrievalQuery;

const recallCueSchema = z.strictObject({
  documentId: z.uuid(),
  reason: z.enum(['identity', 'place', 'thread']),
});
const recallInputSchema = z.strictObject({
  storyId: z.uuid(),
  rootHash: z.string().min(1),
  rootRevision: z.number().int().positive(),
  cues: z.array(recallCueSchema).max(12),
  excludedDocumentIds: z.array(z.uuid()).max(4).default([]),
  maxCandidates: z.number().int().min(0).max(4).default(4),
});
export type CanonicalRecallCue = z.infer<typeof recallCueSchema>;
export type CanonicalRecallInput = z.input<typeof recallInputSchema>;

/** Resolves already-admitted identities against one captured current root. */
export async function resolveCanonicalRecallCues(
  storage: DocumentStore,
  rawInput: CanonicalRecallInput,
) {
  const input = recallInputSchema.parse(rawInput);
  const manifest = await storage.readManifest(input.rootHash);
  if (
    manifest.campaignId !== input.storyId ||
    manifest.revision !== input.rootRevision
  ) {
    throw new Error('Canonical recall root does not match its campaign');
  }
  const eligible = new Map(
    manifest.entries
      .filter(
        (entry) =>
          entry.path.endsWith('.md') &&
          entry.visibility !== 'developer-private' &&
          canonicalKnowledgeKinds.has(entry.kind),
      )
      .map((entry) => [entry.documentId, entry]),
  );
  const grouped = new Map<string, CanonicalRecallCue['reason'][]>();
  for (const cue of input.cues) {
    const reasons = grouped.get(cue.documentId) ?? [];
    if (!reasons.includes(cue.reason)) reasons.push(cue.reason);
    grouped.set(cue.documentId, reasons);
  }
  const candidates: Array<{
    documentId: string;
    revision: number;
    path: string;
    kind: string;
    authority: string;
    visibility: string;
    reasons: CanonicalRecallCue['reason'][];
  }> = [];
  const unavailable: Array<{
    documentId: string;
    reasons: CanonicalRecallCue['reason'][];
    reason: 'not-current-or-readable' | 'candidate-limit' | 'already-selected';
  }> = [];
  const excluded = new Set(input.excludedDocumentIds);
  for (const [documentId, reasons] of grouped) {
    if (excluded.has(documentId)) {
      unavailable.push({ documentId, reasons, reason: 'already-selected' });
      continue;
    }
    const entry = eligible.get(documentId);
    if (!entry) {
      unavailable.push({
        documentId,
        reasons,
        reason: 'not-current-or-readable',
      });
      continue;
    }
    if (candidates.length >= input.maxCandidates) {
      unavailable.push({ documentId, reasons, reason: 'candidate-limit' });
      continue;
    }
    candidates.push({
      documentId,
      revision: entry.revision,
      path: entry.path,
      kind: entry.kind,
      authority: entry.authority,
      visibility: entry.visibility,
      reasons,
    });
  }
  return {
    candidates,
    trace: {
      requested: input.cues,
      resolvedDocumentIds: candidates.map((candidate) => candidate.documentId),
      unavailable,
      excludedDocumentIds: input.excludedDocumentIds,
      maxCandidates: input.maxCandidates,
    },
  };
}

function normalize(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function matchingTerms(value: string, terms: readonly string[]) {
  const normalized = ` ${normalize(value)} `;
  return terms.filter((term) => normalized.includes(` ${term} `));
}

function bestSnippet(body: string, phrase: string, terms: readonly string[]) {
  const segments = body
    .split(/\r?\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const ranked = segments
    .map((segment, index) => {
      const normalized = normalize(segment);
      return {
        segment,
        index,
        score:
          (phrase && normalized.includes(phrase) ? 20 : 0) +
          matchingTerms(segment, terms).length,
      };
    })
    .sort(
      (left, right) => right.score - left.score || left.index - right.index,
    );
  const selected = ranked[0]?.segment ?? '';
  return selected.length <= 280
    ? selected
    : `${selected.slice(0, 277).trimEnd()}...`;
}

/**
 * Bounded linear lexical baseline over current canonical document versions.
 * Candidate results are discovery leads; callers must still load an exact
 * document identity through the current manifest before using its contents.
 */
export async function searchCanonicalKnowledge(
  storage: DocumentStore,
  rawInput: CanonicalKnowledgeSearchInput,
) {
  const input = storyRetrievalQuerySchema.parse(rawInput);
  const manifest = await storage.readManifest(input.rootHash);
  if (
    manifest.campaignId !== input.storyId ||
    manifest.revision !== input.rootRevision
  ) {
    throw new Error('Canonical search root does not match its campaign');
  }

  const phrase = normalize(input.query);
  const allTerms = [
    ...new Set(phrase.split(' ').filter((term) => term.length > 1)),
  ];
  const terms = allTerms.slice(0, 12);
  if (!terms.length) {
    throw new Error('Canonical search query has no searchable terms');
  }
  const eligible = manifest.entries
    .filter(
      (entry) =>
        entry.path.endsWith('.md') &&
        entry.visibility !== 'developer-private' &&
        canonicalKnowledgeKinds.has(entry.kind),
    )
    .sort((left, right) => left.path.localeCompare(right.path));

  const candidates: StoryRetrievalCandidate[] = [];
  let scannedDocuments = 0;
  let scannedBytes = 0;
  let skippedOversized = 0;
  let stoppedByByteLimit = false;

  for (const entry of eligible) {
    if (scannedDocuments >= input.maxExaminedUnits) break;
    const document = await storage.readDocument(entry.objectHash);
    if (
      document.envelope.documentId !== entry.documentId ||
      document.envelope.revision !== entry.revision ||
      document.envelope.kind !== entry.kind ||
      document.envelope.authority !== entry.authority ||
      document.envelope.visibility !== entry.visibility
    ) {
      throw new Error(`Canonical search document mismatch: ${entry.path}`);
    }
    scannedDocuments += 1;
    const bytes = Buffer.byteLength(document.body, 'utf8');
    if (bytes > input.maxUnitBytes) {
      skippedOversized += 1;
      continue;
    }
    if (scannedBytes + bytes > input.maxExaminedBytes) {
      stoppedByByteLimit = true;
      break;
    }
    scannedBytes += bytes;

    const fields = {
      title: normalize(document.title),
      path: normalize(entry.path),
      body: normalize(document.body),
    };
    const matchedFields = (
      Object.keys(fields) as Array<keyof typeof fields>
    ).filter((field) =>
      terms.some((term) => ` ${fields[field]} `.includes(` ${term} `)),
    );
    if (!matchedFields.length) continue;
    const matchedTerms = terms.filter((term) =>
      Object.values(fields).some((value) => ` ${value} `.includes(` ${term} `)),
    );
    if (matchedTerms.length !== terms.length) continue;
    const score =
      (fields.title.includes(phrase) ? 100 : 0) +
      (fields.path.includes(phrase) ? 80 : 0) +
      (fields.body.includes(phrase) ? 40 : 0) +
      matchingTerms(document.title, terms).length * 12 +
      matchingTerms(entry.path, terms).length * 8 +
      matchingTerms(document.body, terms).length * 3 +
      10;
    candidates.push({
      unit: {
        unitId: `${entry.documentId}@${entry.revision}#root`,
        documentId: entry.documentId,
        revision: entry.revision,
        sourceHash: entry.objectHash,
        path: entry.path,
        kind: entry.kind,
        authority: entry.authority,
        visibility: entry.visibility,
        branchKey: null,
        current: true,
        headingPath: [],
        linkedDocumentIds: document.envelope.sources.map(
          (source) => source.documentId,
        ),
        effectiveFromTick: document.envelope.coverage?.fromTick ?? null,
        effectiveThroughTick: document.envelope.coverage?.throughTick ?? null,
        title: document.title,
        contextualKey: `${entry.kind} ${document.title} ${entry.path}`,
        bodyBytes: bytes,
      },
      snippet: bestSnippet(document.body, phrase, terms),
      matchedFields,
      matchedTerms,
      score: { provider: 'linear-lexical.v1', value: score },
    });
  }

  const results = candidates
    .sort(
      (left, right) =>
        right.score.value - left.score.value ||
        left.unit.path.localeCompare(right.unit.path),
    )
    .slice(0, input.maxResults);
  const omissions = [
    ...(scannedDocuments < eligible.length && !stoppedByByteLimit
      ? (['unit-limit'] as const)
      : []),
    ...(stoppedByByteLimit ? (['byte-limit'] as const) : []),
    ...(skippedOversized > 0 ? (['oversized-unit'] as const) : []),
  ];
  return storyRetrievalResultSchema.parse({
    format: 'offscreen.story-retrieval-result.v1',
    query: input.query,
    candidates: results,
    coverage: {
      state: omissions.length ? 'partial' : 'complete',
      rootHash: input.rootHash,
      indexedThroughRevision: input.rootRevision,
      eligibleUnits: eligible.length,
      examinedUnits: scannedDocuments,
      examinedBytes: scannedBytes,
      omissions,
    },
    diagnostics: {
      tuning: null,
      limits: {
        maxResults: input.maxResults,
        maxExaminedUnits: input.maxExaminedUnits,
        maxExaminedBytes: input.maxExaminedBytes,
        maxUnitBytes: input.maxUnitBytes,
      },
      normalizedTerms: terms,
      termsTruncated: allTerms.length > terms.length,
      matchedUnits: candidates.length,
      returnedUnits: results.length,
    },
  });
}
