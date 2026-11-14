/**
 * SA01: compact redacted Storyteller operation timeline from cause → publication.
 * Reuses OpenRouter request inspection; never invents tokens, cache hits or charges.
 */
import { createHash, randomUUID } from 'node:crypto';
import type { StorytellerTask } from '../tasks';
import { inspectOpenRouterRequest } from './openrouter';

export const STORYTELLER_OPERATION_TRACE_VERSION =
  'storyteller-operation-trace.v1' as const;

export type StorytellerOperationTraceSpanKind =
  | 'cause'
  | 'task-capture'
  | 'source-selection'
  | 'context-pack'
  | 'provider-round'
  | 'validation'
  | 'publication'
  | 'retry'
  | 'cost';

export type StorytellerOperationTraceSpanStatus =
  | 'completed'
  | 'omitted'
  | 'not-run'
  | 'failed'
  | 'uncertain'
  | 'interrupted'
  | 'refused'
  | 'replayed';

export type StorytellerOperationTraceSourceHandle = Readonly<{
  handle: string;
  role: 'required' | 'selected' | 'loaded' | 'omitted' | 'final-included';
  reason?: string | null;
}>;

export type StorytellerOperationTraceSpan = Readonly<{
  spanId: string;
  parentSpanId: string | null;
  kind: StorytellerOperationTraceSpanKind;
  status: StorytellerOperationTraceSpanStatus;
  summary: string;
  metrics: Readonly<{
    serializedBytes?: number | null;
    readCount?: number | null;
    readBytes?: number | null;
    durationMs?: number | null;
    packetSha256?: string | null;
  }>;
}>;

export type StorytellerOperationTraceCost = Readonly<{
  settledMicrousd: string | null;
  uncertainReservationMicrousd: string | null;
  inputTokens: null;
  cacheHit: null;
  providerDurationMs: number | null;
  chargeReported: boolean;
  note: string;
}>;

export type StorytellerOperationTracePublication = Readonly<{
  state:
    | 'published'
    | 'not-run'
    | 'stale-refused'
    | 'interrupted'
    | 'failed'
    | 'uncertain';
  reason: string | null;
  publishedPassageId: string | null;
}>;

export type StorytellerOperationTraceInput = Readonly<{
  id: string;
  storyId: string;
  purposeLabel: string;
  generationId?: string;
  operationId?: string;
  attemptId?: string;
  runId?: string | null;
  sourceRevision?: number | null;
  canonicalRootHash?: string | null;
  task: StorytellerTask;
  /** Optional override when inspecting hybrid memory rounds. */
  providerDispatch?: Parameters<typeof inspectOpenRouterRequest>[1];
  recipeVersion?: string;
  route?: string | null;
  providerMode: 'simulated' | 'held' | 'real' | 'not-run';
  transportPerformed?: boolean;
  sources?: Readonly<{
    requiredHandles?: readonly string[];
    selectedHandles?: readonly string[];
    loadedHandles?: readonly string[];
    omitted?: readonly Readonly<{ handle: string; reason: string }>[];
    finalIncludedHandles?: readonly string[];
  }>;
  reads?: Readonly<{
    count: number;
    bytes: number;
    timeMs: number | null;
  }>;
  rounds?: readonly Readonly<{
    kind: 'decision' | 'final' | 'repair' | 'duplicate-delivery';
    status: StorytellerOperationTraceSpanStatus;
    summary: string;
    packetSha256?: string | null;
    serializedBytes?: number | null;
    paid?: boolean;
  }>[];
  validation?: Readonly<{
    status: StorytellerOperationTraceSpanStatus;
    summary: string;
  }>;
  publication?: StorytellerOperationTracePublication;
  cost?: Readonly<{
    settledMicrousd?: string | null;
    uncertainReservationMicrousd?: string | null;
    providerDurationMs?: number | null;
  }>;
  stateTransitions?: readonly string[];
  missingStages?: readonly string[];
}>;

function sourceRevision(task: StorytellerTask) {
  return task.task === 'opening'
    ? { kind: 'draft' as const, revision: task.source.draftRevision }
    : { kind: 'story' as const, revision: task.source.narrativeRevision };
}

function defaultLoadedHandles(task: StorytellerTask) {
  return task.context.evidence.map((passage) => `p${passage.sequence}`);
}

function assertNoPrivateLeak(serialized: string) {
  if (/sk-[a-zA-Z0-9]{16,}/.test(serialized)) {
    throw new Error('Operation trace leaked a secret-shaped token');
  }
  if (/Bearer\s+\S+/i.test(serialized)) {
    throw new Error('Operation trace leaked an authorization header');
  }
}

/**
 * Build one redacted, versioned causal timeline for a single Storyteller operation.
 * Packet metrics come from inspectOpenRouterRequest; usage/cache fields stay null
 * unless the caller supplies externally reported cost figures.
 */
export function createStorytellerOperationTrace(
  input: StorytellerOperationTraceInput,
) {
  const inspection = inspectOpenRouterRequest(
    input.task,
    input.providerDispatch,
  );
  const loadedHandles =
    input.sources?.loadedHandles ?? defaultLoadedHandles(input.task);
  const omittedFromTask = input.task.contextManifest.omittedSequences.map(
    (sequence) => ({
      handle: `p${sequence}`,
      reason: 'outside-bounded-selection',
    }),
  );
  const omitted = [...(input.sources?.omitted ?? []), ...omittedFromTask];
  const omittedHandles = new Set(omitted.map((entry) => entry.handle));
  const finalIncluded =
    input.sources?.finalIncludedHandles ??
    loadedHandles.filter((handle) => !omittedHandles.has(handle));
  const requiredHandles = input.sources?.requiredHandles ?? [];
  const selectedHandles = input.sources?.selectedHandles ?? loadedHandles;
  const reads = input.reads ?? { count: 0, bytes: 0, timeMs: null };
  const publication = input.publication ?? {
    state: 'not-run' as const,
    reason: 'publication-stage-absent',
    publishedPassageId: null,
  };
  const costSettled = input.cost?.settledMicrousd ?? null;
  const costUncertain = input.cost?.uncertainReservationMicrousd ?? null;
  const providerDurationMs = input.cost?.providerDurationMs ?? null;
  const chargeReported = costSettled != null || costUncertain != null;
  const rootSpanId = randomUUID();
  const spans: StorytellerOperationTraceSpan[] = [
    {
      spanId: rootSpanId,
      parentSpanId: null,
      kind: 'cause',
      status: 'completed',
      summary: input.purposeLabel,
      metrics: {},
    },
    {
      spanId: randomUUID(),
      parentSpanId: rootSpanId,
      kind: 'task-capture',
      status: 'completed',
      summary: `${input.task.task}/${inspection.purpose.id}`,
      metrics: {},
    },
    {
      spanId: randomUUID(),
      parentSpanId: rootSpanId,
      kind: 'source-selection',
      status: omitted.length > 0 ? 'omitted' : 'completed',
      summary: `${selectedHandles.length} selected; ${omitted.length} omitted`,
      metrics: {
        readCount: reads.count,
        readBytes: reads.bytes,
        durationMs: reads.timeMs,
      },
    },
    {
      spanId: randomUUID(),
      parentSpanId: rootSpanId,
      kind: 'context-pack',
      status: 'completed',
      summary: `packet ${inspection.serializedBytes}B#${inspection.sha256.slice(0, 8)}`,
      metrics: {
        serializedBytes: inspection.serializedBytes,
        packetSha256: inspection.sha256,
      },
    },
  ];

  const rounds = input.rounds ?? [
    {
      kind: 'final' as const,
      status:
        input.providerMode === 'not-run'
          ? ('not-run' as const)
          : ('completed' as const),
      summary:
        input.providerMode === 'not-run'
          ? 'provider round not run'
          : `${input.providerMode} final packet`,
      packetSha256: inspection.sha256,
      serializedBytes: inspection.serializedBytes,
      paid: false,
    },
  ];

  let paidRounds = 0;
  for (const round of rounds) {
    if (round.paid) paidRounds += 1;
    spans.push({
      spanId: randomUUID(),
      parentSpanId: rootSpanId,
      kind: 'provider-round',
      status: round.status,
      summary: `${round.kind}: ${round.summary}`,
      metrics: {
        serializedBytes: round.serializedBytes ?? null,
        packetSha256: round.packetSha256 ?? null,
      },
    });
  }

  const validation = input.validation ?? {
    status:
      publication.state === 'published'
        ? ('completed' as const)
        : ('not-run' as const),
    summary:
      publication.state === 'published'
        ? 'result validated'
        : 'validation not run',
  };
  spans.push({
    spanId: randomUUID(),
    parentSpanId: rootSpanId,
    kind: 'validation',
    status: validation.status,
    summary: validation.summary,
    metrics: {},
  });
  spans.push({
    spanId: randomUUID(),
    parentSpanId: rootSpanId,
    kind: 'publication',
    status:
      publication.state === 'published'
        ? 'completed'
        : publication.state === 'stale-refused'
          ? 'refused'
          : publication.state === 'interrupted'
            ? 'interrupted'
            : publication.state === 'failed'
              ? 'failed'
              : publication.state === 'uncertain'
                ? 'uncertain'
                : 'not-run',
    summary: publication.reason ?? publication.state,
    metrics: {},
  });
  spans.push({
    spanId: randomUUID(),
    parentSpanId: rootSpanId,
    kind: 'cost',
    status: chargeReported ? 'completed' : 'not-run',
    summary: chargeReported
      ? `settled=${costSettled ?? 'null'}; uncertain=${costUncertain ?? 'null'}`
      : 'provider usage not reported',
    metrics: {
      durationMs: providerDurationMs,
    },
  });

  const unknowns: string[] = [
    'inputTokens',
    'cacheHit',
    ...(providerDurationMs == null ? ['providerDurationMs'] : []),
    ...(costSettled == null && costUncertain == null
      ? ['settledMicrousd', 'uncertainReservationMicrousd']
      : []),
    ...(input.missingStages ?? []),
  ];

  const sourceHandles: StorytellerOperationTraceSourceHandle[] = [
    ...requiredHandles.map((handle) => ({
      handle,
      role: 'required' as const,
      reason: null,
    })),
    ...selectedHandles.map((handle) => ({
      handle,
      role: 'selected' as const,
      reason: null,
    })),
    ...loadedHandles.map((handle) => ({
      handle,
      role: 'loaded' as const,
      reason: null,
    })),
    ...omitted.map((entry) => ({
      handle: entry.handle,
      role: 'omitted' as const,
      reason: entry.reason,
    })),
    ...finalIncluded.map((handle) => ({
      handle,
      role: 'final-included' as const,
      reason: null,
    })),
  ];

  const recipeVersion =
    input.recipeVersion ?? input.task.resources.recipe.version;
  const route =
    input.route ??
    (input.task.execution.mode === 'provider'
      ? input.task.execution.policy.route
      : null);

  const trace = {
    version: STORYTELLER_OPERATION_TRACE_VERSION,
    id: input.id,
    storyId: input.storyId,
    purpose: {
      id: inspection.purpose.id,
      label: input.purposeLabel,
      inputContract: inspection.purpose.inputContract,
      outputContract: inspection.purpose.outputContract,
    },
    identities: {
      generationId: input.generationId ?? randomUUID(),
      operationId: input.operationId ?? randomUUID(),
      attemptId: input.attemptId ?? randomUUID(),
      runId: input.runId ?? null,
    },
    source: {
      ...sourceRevision(input.task),
      revision: input.sourceRevision ?? sourceRevision(input.task).revision,
      canonicalRootHash: input.canonicalRootHash ?? null,
    },
    versions: {
      taskInput: input.task.inputVersion,
      prompt: inspection.promptVersion,
      contextPolicy: inspection.contextPolicyVersion,
      recipe: recipeVersion,
      route,
    },
    providerMode: input.providerMode,
    transportPerformed: input.transportPerformed ?? false,
    paidProviderRounds: paidRounds,
    sources: {
      requiredHandles,
      selectedHandles,
      loadedHandles,
      omitted,
      finalIncludedHandles: finalIncluded,
      handles: sourceHandles,
    },
    reads: {
      count: reads.count,
      bytes: reads.bytes,
      timeMs: reads.timeMs,
    },
    packet: {
      sha256: inspection.sha256,
      serializedBytes: inspection.serializedBytes,
      capturedRequestBytes: inspection.capturedRequestBytes,
      outputSchemaBytes: inspection.outputSchemaBytes,
      outputSchemaSha256: inspection.outputSchemaSha256,
      userSections: inspection.userSections.map((section) => ({
        key: section.key,
        valueKind: section.valueKind,
        bytes: section.bytes,
        sha256: section.sha256,
      })),
    },
    spans,
    stateTransitions: input.stateTransitions ?? [
      'admitted',
      'task-captured',
      publication.state === 'published' ? 'published' : publication.state,
    ],
    cost: {
      settledMicrousd: costSettled,
      uncertainReservationMicrousd: costUncertain,
      inputTokens: null,
      cacheHit: null,
      providerDurationMs,
      chargeReported,
      note: 'Prefix overlap is not a cache hit; tokens stay null without a reported tokenizer/provider usage record.',
    } satisfies StorytellerOperationTraceCost,
    publication,
    unknowns,
    redaction: {
      promptBodies: 'omitted' as const,
      sourceBodies: 'omitted' as const,
      serviceLogSafe: true as const,
    },
  } as const;

  const serialized = JSON.stringify(trace);
  assertNoPrivateLeak(serialized);
  return {
    ...trace,
    receiptSha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

export type StorytellerOperationTrace = ReturnType<
  typeof createStorytellerOperationTrace
>;

/** Human Markdown receipt; JSON remains authoritative. */
export function formatStorytellerOperationTrace(
  trace: StorytellerOperationTrace,
) {
  const missing = trace.unknowns.length
    ? trace.unknowns.join(', ')
    : 'none';
  const lines = [
    `# Storyteller operation trace ${trace.version}`,
    '',
    `- id: ${trace.id}`,
    `- story: ${trace.storyId}`,
    `- purpose: ${trace.purpose.id} (${trace.purpose.label})`,
    `- identities: generation ${trace.identities.generationId}; operation ${trace.identities.operationId}; attempt ${trace.identities.attemptId}`,
    `- source: ${trace.source.kind} rev ${trace.source.revision}; root ${trace.source.canonicalRootHash ?? 'absent'}`,
    `- versions: task ${trace.versions.taskInput}; prompt ${trace.versions.prompt}; recipe ${trace.versions.recipe}; route ${trace.versions.route ?? 'none'}`,
    `- provider: mode ${trace.providerMode}; transport ${trace.transportPerformed ? 'performed' : 'not performed'}; paid rounds ${trace.paidProviderRounds}`,
    `- packet: ${trace.packet.serializedBytes}B#${trace.packet.sha256.slice(0, 12)}`,
    `- reads: ${trace.reads.count} / ${trace.reads.bytes}B / ${trace.reads.timeMs ?? 'time unknown'}ms`,
    `- sources loaded: ${trace.sources.loadedHandles.join(', ') || 'none'}`,
    `- sources omitted: ${trace.sources.omitted.map((entry) => `${entry.handle}:${entry.reason}`).join(', ') || 'none'}`,
    `- sources final: ${trace.sources.finalIncludedHandles.join(', ') || 'none'}`,
    `- publication: ${trace.publication.state}${trace.publication.reason ? ` (${trace.publication.reason})` : ''}`,
    `- cost: settled ${trace.cost.settledMicrousd ?? 'null'}; uncertain ${trace.cost.uncertainReservationMicrousd ?? 'null'}; tokens/cache unknown`,
    `- unknowns: ${missing}`,
    '',
    '## Spans',
  ];
  for (const span of trace.spans) {
    lines.push(`- [${span.kind}/${span.status}] ${span.summary}`);
  }
  lines.push('', `receiptSha256: ${trace.receiptSha256}`);
  return `${lines.join('\n')}\n`;
}

/** Fail closed if another story's identity appears in this redacted receipt. */
export function assertOperationTraceStoryIsolation(
  trace: StorytellerOperationTrace,
  foreignStoryId: string,
) {
  if (trace.storyId === foreignStoryId) {
    throw new Error('Foreign story id equals the traced story');
  }
  const haystack = JSON.stringify(trace);
  if (haystack.includes(foreignStoryId)) {
    throw new Error(
      `Story ${foreignStoryId} leaked into operation trace ${trace.id}`,
    );
  }
}

/** Stable JSON for developer evidence directories; never includes raw prompt bodies. */
export function serializeStorytellerOperationTrace(
  trace: StorytellerOperationTrace,
) {
  const serialized = `${JSON.stringify(trace, null, 2)}\n`;
  assertNoPrivateLeak(serialized);
  return serialized;
}
