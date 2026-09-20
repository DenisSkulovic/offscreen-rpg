import type { DocumentStore } from '@offscreen/documents';
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

const searchInputSchema = z.strictObject({
  storyId: z.uuid(),
  rootHash: z.string().min(1),
  rootRevision: z.number().int().positive(),
  query: z.string().trim().min(2).max(160),
  maxResults: z.number().int().min(1).max(8).default(5),
  maxScanDocuments: z.number().int().min(1).max(256).default(128),
  maxScanBytes: z
    .number()
    .int()
    .min(1024)
    .max(512 * 1024)
    .default(128 * 1024),
  maxDocumentBytes: z
    .number()
    .int()
    .min(256)
    .max(64 * 1024)
    .default(16 * 1024),
});

export type CanonicalKnowledgeSearchInput = z.input<typeof searchInputSchema>;

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
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const selected = ranked[0]?.segment ?? '';
  return selected.length <= 280 ? selected : `${selected.slice(0, 277).trimEnd()}...`;
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
  const input = searchInputSchema.parse(rawInput);
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

  const candidates: Array<{
    documentId: string;
    revision: number;
    path: string;
    kind: string;
    authority: string;
    visibility: string;
    title: string;
    snippet: string;
    matchedFields: Array<'title' | 'path' | 'body'>;
    matchedTerms: string[];
    score: number;
  }> = [];
  let scannedDocuments = 0;
  let scannedBytes = 0;
  let skippedOversized = 0;
  let stoppedByByteLimit = false;

  for (const entry of eligible) {
    if (scannedDocuments >= input.maxScanDocuments) break;
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
    if (bytes > input.maxDocumentBytes) {
      skippedOversized += 1;
      continue;
    }
    if (scannedBytes + bytes > input.maxScanBytes) {
      stoppedByByteLimit = true;
      break;
    }
    scannedBytes += bytes;

    const fields = {
      title: normalize(document.title),
      path: normalize(entry.path),
      body: normalize(document.body),
    };
    const matchedFields = (Object.keys(fields) as Array<keyof typeof fields>)
      .filter((field) =>
        terms.some((term) => ` ${fields[field]} `.includes(` ${term} `)),
      );
    if (!matchedFields.length) continue;
    const matchedTerms = terms.filter((term) =>
      Object.values(fields).some((value) =>
        ` ${value} `.includes(` ${term} `),
      ),
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
      documentId: entry.documentId,
      revision: entry.revision,
      path: entry.path,
      kind: entry.kind,
      authority: entry.authority,
      visibility: entry.visibility,
      title: document.title,
      snippet: bestSnippet(document.body, phrase, terms),
      matchedFields,
      matchedTerms,
      score,
    });
  }

  const results = candidates
    .sort(
      (left, right) =>
        right.score - left.score || left.path.localeCompare(right.path),
    )
    .slice(0, input.maxResults);
  return {
    query: input.query,
    results,
    trace: {
      normalizedTerms: terms,
      termsTruncated: allTerms.length > terms.length,
      eligibleDocuments: eligible.length,
      scannedDocuments,
      scannedBytes,
      skippedOversized,
      candidates: candidates.length,
      returned: results.length,
      maxResults: input.maxResults,
      maxScanDocuments: input.maxScanDocuments,
      maxScanBytes: input.maxScanBytes,
      maxDocumentBytes: input.maxDocumentBytes,
      coverageComplete:
        !stoppedByByteLimit &&
        skippedOversized === 0 &&
        scannedDocuments >= eligible.length,
      stoppedByDocumentLimit:
        !stoppedByByteLimit && scannedDocuments < eligible.length,
      stoppedByByteLimit,
    },
  };
}
