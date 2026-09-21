import {
  memoryEvaluationObservationSchema,
  memoryEvaluationReportSchema,
  memoryEvaluationSuiteReportSchema,
  type LongStoryMemoryCorpus,
  type MemoryEvaluationObservation,
  type MemoryOracleQuery,
} from '@offscreen/contracts/memory-evaluation';
import type { StoryRetrievalResult } from '@offscreen/contracts/story-retrieval';
import type { DocumentStore } from '@offscreen/documents';
import { searchCanonicalKnowledge } from '../storyteller/canonical-search';
import type { LexicalStoryIndex } from '../storyteller/lexical-story-index';

function stageEvidence(query: MemoryOracleQuery, observed: readonly string[]) {
  const expected = new Set(query.expectedEvidence);
  const acceptable = new Set(query.acceptableEvidence);
  const forbidden = new Set(query.forbiddenEvidence);
  const missingExpected = query.expectedEvidence.filter(
    (key) => !observed.includes(key),
  );
  const forbiddenObserved = observed.filter((key) => forbidden.has(key));
  const unexpectedObserved = observed.filter(
    (key) => !expected.has(key) && !acceptable.has(key) && !forbidden.has(key),
  );
  return { missingExpected, forbiddenObserved, unexpectedObserved };
}

/** Diagnoses the three memory stages without using an LLM or conflating failures. */
export function evaluateMemoryObservation(
  corpus: LongStoryMemoryCorpus,
  rawObservation: MemoryEvaluationObservation,
) {
  const observation = memoryEvaluationObservationSchema.parse(rawObservation);
  if (observation.corpusId !== corpus.id) {
    throw new Error('Memory evaluation observation belongs to another corpus');
  }
  const query = corpus.queries.find(
    (candidate) => candidate.id === observation.queryId,
  );
  if (!query) throw new Error('Unknown memory evaluation query');

  const retrievalEvidence = stageEvidence(
    query,
    observation.retrieval.evidenceKeys,
  );
  const relevantRetrieved = observation.retrieval.evidenceKeys.filter(
    (key) =>
      query.expectedEvidence.includes(key) ||
      query.acceptableEvidence.includes(key),
  ).length;
  const expectedRecall = query.expectedEvidence.length
    ? (query.expectedEvidence.length - retrievalEvidence.missingExpected.length) /
      query.expectedEvidence.length
    : 1;
  const contextPrecision = observation.retrieval.evidenceKeys.length
    ? relevantRetrieved / observation.retrieval.evidenceKeys.length
    : query.expectedEvidence.length === 0
      ? 1
      : 0;
  const assemblyEvidence = stageEvidence(
    query,
    observation.assembly.evidenceKeys,
  );
  const generationEvidence = stageEvidence(
    query,
    observation.generation.usedEvidenceKeys,
  );
  const failed = (stage: ReturnType<typeof stageEvidence>) =>
    stage.missingExpected.length > 0 || stage.forbiddenObserved.length > 0;

  return memoryEvaluationReportSchema.parse({
    format: 'offscreen.memory-evaluation-report.v1',
    corpusId: corpus.id,
    queryId: query.id,
    retrieval: {
      ...retrievalEvidence,
      status: failed(retrievalEvidence) ? 'failed' : 'passed',
      expectedRecall,
      contextPrecision,
      coverage: observation.retrieval.coverage,
      candidatesExamined: observation.retrieval.candidatesExamined,
      durationMs: observation.retrieval.durationMs,
    },
    assembly: {
      ...assemblyEvidence,
      status: failed(assemblyEvidence) ? 'failed' : 'passed',
      bytes: observation.assembly.bytes,
      duplicateBytes: observation.assembly.duplicateBytes,
    },
    generation: {
      ...generationEvidence,
      status:
        observation.generation.disposition === 'not-run'
          ? 'not-run'
          : failed(generationEvidence)
            ? 'failed'
            : 'passed',
      disposition: observation.generation.disposition,
    },
  });
}

export async function observeLinearMemoryBaseline(args: {
  storage: DocumentStore;
  corpus: LongStoryMemoryCorpus;
  rootHash: string;
  rootRevision: number;
  queryId: string;
}): Promise<MemoryEvaluationObservation> {
  return observeMemoryRetrieval({
    corpus: args.corpus,
    queryId: args.queryId,
    search: (query) =>
      searchCanonicalKnowledge(args.storage, {
        storyId: args.corpus.campaignId,
        rootHash: args.rootHash,
        rootRevision: args.rootRevision,
        query: query.query,
        maxResults: query.budget.maxCandidates,
        maxExaminedUnits: 256,
        maxExaminedBytes: 512 * 1024,
      }),
  });
}

async function observeMemoryRetrieval(args: {
  corpus: LongStoryMemoryCorpus;
  queryId: string;
  search: (
    query: MemoryOracleQuery,
  ) => Promise<StoryRetrievalResult> | StoryRetrievalResult;
}): Promise<MemoryEvaluationObservation> {
  const query = args.corpus.queries.find((entry) => entry.id === args.queryId);
  if (!query) throw new Error('Unknown memory evaluation query');
  const started = performance.now();
  const result = await args.search(query);
  const evidenceByPath = new Map(
    args.corpus.evidence.map((entry) => [entry.path, entry]),
  );
  const retrieved = result.candidates
    .map((entry) => evidenceByPath.get(entry.unit.path))
    .filter((entry) => entry !== undefined);
  const assembled = retrieved.slice(0, query.budget.maxReads);
  return memoryEvaluationObservationSchema.parse({
    format: 'offscreen.memory-evaluation-observation.v1',
    corpusId: args.corpus.id,
    queryId: query.id,
    retrieval: {
      evidenceKeys: retrieved.map((entry) => entry.key),
      coverage: result.coverage.state,
      candidatesExamined: result.coverage.examinedUnits,
      durationMs: performance.now() - started,
    },
    assembly: {
      evidenceKeys: assembled.map((entry) => entry.key),
      bytes: assembled.reduce(
        (total, entry) => total + Buffer.byteLength(entry.body, 'utf8'),
        0,
      ),
      duplicateBytes: 0,
    },
    generation: { disposition: 'not-run', usedEvidenceKeys: [] },
  });
}

export async function observeIndexedMemoryRetrieval(args: {
  index: LexicalStoryIndex;
  corpus: LongStoryMemoryCorpus;
  queryId: string;
}): Promise<MemoryEvaluationObservation> {
  return observeMemoryRetrieval({
    corpus: args.corpus,
    queryId: args.queryId,
    search: (query) =>
      args.index.search({
        storyId: args.corpus.campaignId,
        rootHash: args.index.rootHash,
        rootRevision: args.index.rootRevision,
        query: query.query,
        maxResults: query.budget.maxCandidates,
        maxExaminedUnits: 256,
        maxExaminedBytes: 512 * 1024,
      }),
  });
}

export async function evaluateLinearMemoryBaseline(args: {
  storage: DocumentStore;
  corpus: LongStoryMemoryCorpus;
  rootHash: string;
  rootRevision: number;
}) {
  return evaluateMemorySuite(args.corpus, (queryId) =>
    observeLinearMemoryBaseline({ ...args, queryId }),
  );
}

export async function evaluateIndexedMemoryRetrieval(args: {
  index: LexicalStoryIndex;
  corpus: LongStoryMemoryCorpus;
}) {
  return evaluateMemorySuite(args.corpus, (queryId) =>
    observeIndexedMemoryRetrieval({ ...args, queryId }),
  );
}

async function evaluateMemorySuite(
  corpus: LongStoryMemoryCorpus,
  observe: (queryId: string) => Promise<MemoryEvaluationObservation>,
) {
  const reports = [];
  for (const query of corpus.queries) {
    reports.push(evaluateMemoryObservation(corpus, await observe(query.id)));
  }
  const queries = reports.length;
  return memoryEvaluationSuiteReportSchema.parse({
    format: 'offscreen.memory-evaluation-suite-report.v1',
    corpusId: corpus.id,
    reports,
    summary: {
      queries,
      retrievalPassed: reports.filter(
        (report) => report.retrieval.status === 'passed',
      ).length,
      assemblyPassed: reports.filter(
        (report) => report.assembly.status === 'passed',
      ).length,
      generationPassed: reports.filter(
        (report) => report.generation.status === 'passed',
      ).length,
      generationNotRun: reports.filter(
        (report) => report.generation.status === 'not-run',
      ).length,
      meanExpectedRecall:
        reports.reduce(
          (total, report) => total + report.retrieval.expectedRecall,
          0,
        ) / queries,
      meanContextPrecision:
        reports.reduce(
          (total, report) => total + report.retrieval.contextPrecision,
          0,
        ) / queries,
    },
  });
}
