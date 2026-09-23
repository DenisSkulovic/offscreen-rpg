import {
  storyRetrievalQuerySchema,
  storyRetrievalResultSchema,
  storyRetrievalUnitSchema,
  type StoryRetrievalCandidate,
  type StoryRetrievalQuery,
  type StoryRetrievalUnit,
} from '@offscreen/contracts/story-retrieval';
import type { DocumentStore } from '@offscreen/documents';
import { z } from 'zod';
import { canonicalKnowledgeKinds } from './canonical-search';

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'did',
  'do',
  'does',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'what',
  'when',
  'which',
  'who',
  'with',
  'without',
]);

function normalize(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function terms(value: string) {
  return [
    ...new Set(
      normalize(value)
        .split(' ')
        .filter((term) => term.length > 1 && !stopWords.has(term)),
    ),
  ];
}

function termFrequency(value: string) {
  const frequencies = new Map<string, number>();
  for (const term of normalize(value).split(' ').filter(Boolean)) {
    frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  }
  return frequencies;
}

type IndexedUnit = Readonly<{
  unit: StoryRetrievalUnit;
  title: Map<string, number>;
  path: Map<string, number>;
  context: Map<string, number>;
  body: Map<string, number>;
  bodyText: string;
}>;

const frequencySchema = z.record(
  z.string().min(1).max(100),
  z.number().int().positive(),
);

export const lexicalStoryIndexSnapshotSchema = z.strictObject({
  format: z.literal('offscreen.lexical-story-index.v1'),
  storyId: z.uuid(),
  rootHash: z.string().regex(/^[0-9a-f]{64}$/),
  rootRevision: z.number().int().positive(),
  units: z
    .array(
      z.strictObject({
        unit: storyRetrievalUnitSchema,
        title: frequencySchema,
        path: frequencySchema,
        context: frequencySchema,
        body: frequencySchema,
        bodyText: z.string().max(512 * 1024),
      }),
    )
    .max(100_000),
});

export type LexicalStoryIndexSnapshot = z.infer<
  typeof lexicalStoryIndexSnapshotSchema
>;

function frequencyRecord(frequencies: ReadonlyMap<string, number>) {
  return Object.fromEntries(
    [...frequencies].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function snippet(body: string, queryTerms: readonly string[]) {
  const segments = body
    .split(/\r?\n+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const selected =
    segments
      .map((value, index) => ({
        value,
        index,
        matches: queryTerms.filter((term) => normalize(value).includes(term))
          .length,
      }))
      .sort(
        (left, right) =>
          right.matches - left.matches || left.index - right.index,
      )[0]?.value ?? '';
  return selected.length <= 280
    ? selected
    : `${selected.slice(0, 277).trimEnd()}...`;
}

export class LexicalStoryIndex {
  private readonly postings = new Map<string, number[]>();
  private readonly sourcePassageUnits: number;

  constructor(
    readonly storyId: string,
    readonly rootHash: string,
    readonly rootRevision: number,
    private readonly units: readonly IndexedUnit[],
  ) {
    this.sourcePassageUnits = units.filter(
      (unit) => unit.unit.kind === 'source-passage',
    ).length;
    units.forEach((unit, index) => {
      const indexedTerms = new Set([
        ...unit.title.keys(),
        ...unit.path.keys(),
        ...unit.context.keys(),
        ...unit.body.keys(),
      ]);
      for (const term of indexedTerms) {
        const entries = this.postings.get(term) ?? [];
        entries.push(index);
        this.postings.set(term, entries);
      }
    });
  }

  snapshot(): LexicalStoryIndexSnapshot {
    return lexicalStoryIndexSnapshotSchema.parse({
      format: 'offscreen.lexical-story-index.v1',
      storyId: this.storyId,
      rootHash: this.rootHash,
      rootRevision: this.rootRevision,
      units: this.units.map((indexed) => ({
        unit: indexed.unit,
        title: frequencyRecord(indexed.title),
        path: frequencyRecord(indexed.path),
        context: frequencyRecord(indexed.context),
        body: frequencyRecord(indexed.body),
        bodyText: indexed.bodyText,
      })),
    });
  }

  search(rawQuery: StoryRetrievalQuery) {
    const query = storyRetrievalQuerySchema.parse(rawQuery);
    if (
      query.storyId !== this.storyId ||
      query.rootHash !== this.rootHash ||
      query.rootRevision !== this.rootRevision
    ) {
      throw new Error('Lexical index does not match the captured story root');
    }
    const allTerms = terms(query.query);
    const queryTerms = allTerms.slice(0, query.tuning.maxQueryTerms);
    const eligibleUnitCount =
      this.units.length -
      (query.tuning.includeSourcePassages ? 0 : this.sourcePassageUnits);
    if (!queryTerms.length)
      throw new Error('Story retrieval query has no searchable terms');
    const documentFrequency = new Map<string, number>();
    for (const term of queryTerms) {
      documentFrequency.set(
        term,
        (this.postings.get(term) ?? []).filter(
          (index) =>
            query.tuning.includeSourcePassages ||
            this.units[index]?.unit.kind !== 'source-passage',
        ).length,
      );
    }
    const scored: StoryRetrievalCandidate[] = [];
    const candidateIndexes = new Set(
      queryTerms.flatMap((term) => this.postings.get(term) ?? []),
    );
    for (const index of candidateIndexes) {
      const indexed = this.units[index];
      if (!indexed) continue;
      if (
        !query.tuning.includeSourcePassages &&
        indexed.unit.kind === 'source-passage'
      ) {
        continue;
      }
      const matchedFields = (
        ['title', 'path', 'context', 'body'] as const
      ).filter(
        (field) =>
          query.tuning.fieldWeights[field] > 0 &&
          queryTerms.some((term) => indexed[field].has(term)),
      );
      const matchedTerms = queryTerms.filter((term) =>
        matchedFields.some((field) => indexed[field].has(term)),
      );
      if (!matchedTerms.length) continue;
      const score = matchedTerms.reduce((total, term) => {
        const idf = Math.log(
          1 +
            (eligibleUnitCount + 1) / ((documentFrequency.get(term) ?? 0) + 1),
        );
        return (
          total +
          idf *
            ((indexed.title.get(term) ?? 0) * query.tuning.fieldWeights.title +
              (indexed.path.get(term) ?? 0) * query.tuning.fieldWeights.path +
              (indexed.context.get(term) ?? 0) *
                query.tuning.fieldWeights.context +
              Math.min(
                indexed.body.get(term) ?? 0,
                query.tuning.maxBodyTermFrequency,
              ) *
                query.tuning.fieldWeights.body)
        );
      }, 0);
      scored.push({
        unit: indexed.unit,
        snippet: snippet(indexed.bodyText, matchedTerms),
        matchedFields,
        matchedTerms,
        score: { provider: 'field-lexical.v1', value: score },
      });
    }
    scored.sort(
      (left, right) =>
        right.score.value - left.score.value ||
        left.unit.path.localeCompare(right.unit.path),
    );
    const examined = scored.slice(0, query.maxExaminedUnits);
    let examinedBytes = 0;
    const withinBytes: StoryRetrievalCandidate[] = [];
    let skippedOversized = 0;
    let stoppedByByteLimit = false;
    for (const candidate of examined) {
      if (candidate.unit.bodyBytes > query.maxUnitBytes) {
        skippedOversized += 1;
        continue;
      }
      if (examinedBytes + candidate.unit.bodyBytes > query.maxExaminedBytes) {
        stoppedByByteLimit = true;
        break;
      }
      examinedBytes += candidate.unit.bodyBytes;
      withinBytes.push(candidate);
    }
    const omissions = [
      ...(scored.length > examined.length ? (['unit-limit'] as const) : []),
      ...(stoppedByByteLimit ? (['byte-limit'] as const) : []),
      ...(skippedOversized ? (['oversized-unit'] as const) : []),
    ];
    return storyRetrievalResultSchema.parse({
      format: 'offscreen.story-retrieval-result.v1',
      query: query.query,
      candidates: withinBytes.slice(0, query.maxResults),
      coverage: {
        state: omissions.length ? 'partial' : 'complete',
        rootHash: this.rootHash,
        indexedThroughRevision: this.rootRevision,
        eligibleUnits: eligibleUnitCount,
        examinedUnits: examined.length,
        examinedBytes,
        omissions,
      },
      diagnostics: {
        tuning: query.tuning,
        limits: {
          maxResults: query.maxResults,
          maxExaminedUnits: query.maxExaminedUnits,
          maxExaminedBytes: query.maxExaminedBytes,
          maxUnitBytes: query.maxUnitBytes,
        },
        normalizedTerms: queryTerms,
        termsTruncated: allTerms.length > queryTerms.length,
        matchedUnits: scored.length,
        returnedUnits: Math.min(withinBytes.length, query.maxResults),
      },
    });
  }
}

export function restoreLexicalStoryIndex(rawSnapshot: unknown) {
  const snapshot = lexicalStoryIndexSnapshotSchema.parse(rawSnapshot);
  return new LexicalStoryIndex(
    snapshot.storyId,
    snapshot.rootHash,
    snapshot.rootRevision,
    snapshot.units.map((indexed) => ({
      unit: indexed.unit,
      title: new Map(Object.entries(indexed.title)),
      path: new Map(Object.entries(indexed.path)),
      context: new Map(Object.entries(indexed.context)),
      body: new Map(Object.entries(indexed.body)),
      bodyText: indexed.bodyText,
    })),
  );
}

export async function buildLexicalStoryIndex(
  storage: DocumentStore,
  identity: { storyId: string; rootHash: string; rootRevision: number },
) {
  const manifest = await storage.readManifest(identity.rootHash);
  if (
    manifest.campaignId !== identity.storyId ||
    manifest.revision !== identity.rootRevision
  ) {
    throw new Error('Lexical index root does not match its campaign');
  }
  const units: IndexedUnit[] = [];
  for (const entry of manifest.entries
    .filter(
      (candidate) =>
        candidate.visibility !== 'developer-private' &&
        ((candidate.path.endsWith('.md') &&
          canonicalKnowledgeKinds.has(candidate.kind)) ||
          (candidate.path.endsWith('.json') &&
            candidate.kind === 'source-passage')),
    )
    .sort((left, right) => left.path.localeCompare(right.path))) {
    const document =
      entry.kind === 'source-passage'
        ? await storage.readSourcePassage(entry.objectHash).then((passage) => ({
            envelope: passage.envelope,
            title: passage.content.title,
            body: passage.content.paragraphs.join('\n\n'),
          }))
        : await storage.readDocument(entry.objectHash);
    if (
      document.envelope.documentId !== entry.documentId ||
      document.envelope.revision !== entry.revision ||
      document.envelope.kind !== entry.kind ||
      document.envelope.authority !== entry.authority ||
      document.envelope.visibility !== entry.visibility
    ) {
      throw new Error(`Lexical index document mismatch: ${entry.path}`);
    }
    const contextualKey = `${entry.kind} ${document.title} ${entry.path}`;
    const unit: StoryRetrievalUnit = {
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
      effectiveFromGameSecond: document.envelope.coverage?.fromGameSecond ?? null,
      effectiveThroughGameSecond:
        document.envelope.coverage?.throughGameSecond ?? null,
      title: document.title,
      contextualKey,
      bodyBytes: Buffer.byteLength(document.body, 'utf8'),
    };
    units.push({
      unit,
      title: termFrequency(document.title),
      path: termFrequency(entry.path),
      context: termFrequency(contextualKey),
      body: termFrequency(document.body),
      bodyText: document.body,
    });
  }
  return new LexicalStoryIndex(
    identity.storyId,
    identity.rootHash,
    identity.rootRevision,
    units,
  );
}
