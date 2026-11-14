/**
 * SA05: observability-only evidence lineage from stored source → final packet
 * → citation → publication. Not game authority; never invents model knowledge.
 */
import { createHash } from 'node:crypto';
import type { StorytellerTask } from '../tasks';
import { inspectOpenRouterRequest } from './openrouter';

export const STORYTELLER_EVIDENCE_LINEAGE_VERSION =
  'storyteller-evidence-lineage.v1' as const;

export type EvidenceLineageStageName =
  | 'stored'
  | 'eligible'
  | 'discovered'
  | 'exact-loaded'
  | 'final-packet'
  | 'cited-used'
  | 'published';

export type EvidenceLineageStageState = Readonly<{
  present: boolean;
  reason: string | null;
}>;

export type EvidenceLineageEntry = Readonly<{
  handle: string;
  kind: 'passage' | 'canonical-handle' | 'memory-item' | 'source-citation';
  stages: Readonly<Record<EvidenceLineageStageName, EvidenceLineageStageState>>;
  contentSha256: string | null;
  bytes: number | null;
}>;

export type EvidenceLineageFailureClass =
  | 'retrieval-missed'
  | 'selected-then-pruned'
  | 'model-ignored'
  | 'false-citation'
  | 'publication-rejected'
  | 'none';

export type StorytellerEvidenceLineage = Readonly<{
  version: typeof STORYTELLER_EVIDENCE_LINEAGE_VERSION;
  storyId: string | null;
  rootHash: string | null;
  rootRevision: number | null;
  task: StorytellerTask['task'];
  purposeId: string;
  packetSha256: string;
  packetBytes: number;
  entries: readonly EvidenceLineageEntry[];
  checkpoints: Readonly<{
    sourceExists: boolean;
    sourceSelected: boolean;
    exactLoaded: boolean;
    finalPacketIncludes: boolean;
    resultUses: boolean;
    publishedConsistent: boolean;
  }>;
  failureClass: EvidenceLineageFailureClass;
  unknowns: readonly string[];
  redaction: Readonly<{
    sourceBodies: 'omitted';
    promptBodies: 'omitted';
  }>;
  receiptSha256: string;
}>;

export type StorytellerEvidenceLineageInput = Readonly<{
  task: StorytellerTask;
  /** Handles known to exist in durable storage for this story/root. */
  storedHandles?: readonly string[];
  /** Handles eligible under visibility/authority for this task. */
  eligibleHandles?: readonly string[];
  /** Handles returned by discovery/search before exact read. */
  discoveredHandles?: readonly string[];
  /** Handles whose exact bodies were loaded (may later be pruned). */
  exactLoadedHandles?: readonly string[];
  /** Optional explicit omission after load (budget/pruning). */
  prunedFromFinal?: readonly Readonly<{
    handle: string;
    reason: string;
  }>[];
  /** Memory-loop citations after validation against the supplied pack. */
  cited?: Readonly<{
    itemIds: readonly string[];
    sourceIds: readonly string[];
  }>;
  /** Publication outcome relative to cited/final evidence. */
  publication?: Readonly<{
    state:
      | 'published'
      | 'not-run'
      | 'stale-refused'
      | 'interrupted'
      | 'failed'
      | 'rejected';
    preservedHandles?: readonly string[];
    reason?: string | null;
  }>;
}>;

function stage(
  present: boolean,
  reason: string | null = null,
): EvidenceLineageStageState {
  return { present, reason };
}

function emptyStages(): Record<EvidenceLineageStageName, EvidenceLineageStageState> {
  return {
    stored: stage(false),
    eligible: stage(false),
    discovered: stage(false),
    'exact-loaded': stage(false),
    'final-packet': stage(false),
    'cited-used': stage(false),
    published: stage(false),
  };
}

function passageHandles(task: StorytellerTask) {
  return task.context.evidence.map((passage) => `p${passage.sequence}`);
}

function extractFinalPacketHandles(task: StorytellerTask) {
  const inspection = inspectOpenRouterRequest(task);
  const user = inspection.body.messages.find((message) => message.role === 'user');
  const handles = new Set<string>();
  const hashes = new Map<string, { sha256: string; bytes: number }>();
  if (!user) {
    return { inspection, handles, hashes };
  }
  try {
    const parsed = JSON.parse(user.content) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { inspection, handles, hashes };
    }
    const scene = (parsed as { sceneContext?: { evidence?: unknown } })
      .sceneContext;
    const evidence = scene?.evidence;
    if (Array.isArray(evidence)) {
      for (const entry of evidence) {
        if (!entry || typeof entry !== 'object') continue;
        const handle = (entry as { handle?: unknown }).handle;
        if (typeof handle !== 'string') continue;
        handles.add(handle);
        const serialized = JSON.stringify(entry);
        hashes.set(handle, {
          sha256: createHash('sha256').update(serialized).digest('hex'),
          bytes: Buffer.byteLength(serialized, 'utf8'),
        });
      }
    }
    const library =
      scene &&
      typeof scene === 'object' &&
      'canonicalKnowledge' in scene &&
      scene.canonicalKnowledge &&
      typeof scene.canonicalKnowledge === 'object'
        ? (
            scene.canonicalKnowledge as {
              librarySelection?: { loadedHandles?: unknown };
              documentSelection?: { loadedHandles?: unknown };
            }
          )
        : null;
    for (const key of ['librarySelection', 'documentSelection'] as const) {
      const loaded = library?.[key]?.loadedHandles;
      if (Array.isArray(loaded)) {
        for (const handle of loaded) {
          if (typeof handle === 'string') handles.add(handle);
        }
      }
    }
  } catch {
    // Packet remains inspectable; lineage reports unknown parse.
  }
  // Current passage is projected into currentState, not the evidence array.
  if (task.context.current) {
    const currentHandle = `p${task.context.current.sequence}`;
    handles.add(currentHandle);
  }
  return { inspection, handles, hashes };
}

function classifyFailure(entries: readonly EvidenceLineageEntry[]): EvidenceLineageFailureClass {
  if (
    entries.some(
      (entry) =>
        entry.stages['cited-used'].present && !entry.stages['final-packet'].present,
    )
  ) {
    return 'false-citation';
  }
  if (
    entries.some(
      (entry) =>
        entry.stages['exact-loaded'].present &&
        !entry.stages['final-packet'].present &&
        !entry.stages['cited-used'].present,
    )
  ) {
    return 'selected-then-pruned';
  }
  if (
    entries.some(
      (entry) =>
        entry.kind === 'memory-item' &&
        entry.stages['final-packet'].present &&
        !entry.stages['cited-used'].present &&
        entry.stages.discovered.present,
    )
  ) {
    return 'model-ignored';
  }
  if (
    entries.some(
      (entry) =>
        entry.stages.eligible.present &&
        !entry.stages.discovered.present &&
        !entry.stages['final-packet'].present,
    )
  ) {
    return 'retrieval-missed';
  }
  if (
    entries.some(
      (entry) =>
        entry.stages['cited-used'].present &&
        entry.stages.published.reason === 'publication-rejected',
    )
  ) {
    return 'publication-rejected';
  }
  return 'none';
}

/**
 * Build a redacted lineage receipt. Throws if citations name handles absent
 * from the final provider packet (false “model knew it” claim).
 */
export function createStorytellerEvidenceLineage(
  input: StorytellerEvidenceLineageInput,
): StorytellerEvidenceLineage {
  const { inspection, handles: finalHandles, hashes } = extractFinalPacketHandles(
    input.task,
  );
  const loadedDefault = passageHandles(input.task);
  const stored = new Set(input.storedHandles ?? loadedDefault);
  const eligible = new Set(input.eligibleHandles ?? loadedDefault);
  const discovered = new Set(input.discoveredHandles ?? loadedDefault);
  const exactLoaded = new Set(input.exactLoadedHandles ?? loadedDefault);
  const pruned = new Map(
    (input.prunedFromFinal ?? []).map((entry) => [entry.handle, entry.reason]),
  );
  for (const [handle] of pruned) {
    finalHandles.delete(handle);
  }
  // Task-omitted sequences are never in the final evidence array.
  for (const sequence of input.task.contextManifest.omittedSequences) {
    finalHandles.delete(`p${sequence}`);
  }

  const citedItems = new Set(input.cited?.itemIds ?? []);
  const citedSources = new Set(input.cited?.sourceIds ?? []);
  const publishedHandles = new Set(
    input.publication?.preservedHandles ??
      (input.publication?.state === 'published'
        ? [...citedSources, ...citedItems, ...finalHandles]
        : []),
  );

  for (const handle of citedSources) {
    if (!finalHandles.has(handle) && !citedItems.has(handle)) {
      // Source citations (s#) are packet-local; passage/canonical must be final.
      if (/^p\d+$/.test(handle) || handle.startsWith('m') || handle.startsWith('x')) {
        throw new Error(
          `Evidence lineage false citation: ${handle} not in final provider packet`,
        );
      }
    }
  }
  for (const handle of citedItems) {
    if (
      (/^p\d+$/.test(handle) || /^[mx]\d+$/.test(handle)) &&
      !finalHandles.has(handle) &&
      !exactLoaded.has(handle)
    ) {
      throw new Error(
        `Evidence lineage false citation: ${handle} was never loaded into the operation`,
      );
    }
  }

  const allHandles = new Set<string>([
    ...stored,
    ...eligible,
    ...discovered,
    ...exactLoaded,
    ...finalHandles,
    ...citedItems,
    ...citedSources,
    ...pruned.keys(),
    ...publishedHandles,
  ]);

  const entries: EvidenceLineageEntry[] = [...allHandles]
    .sort((left, right) => left.localeCompare(right))
    .map((handle) => {
      const stages = emptyStages();
      stages.stored = stage(stored.has(handle), stored.has(handle) ? null : 'not-stored');
      stages.eligible = stage(
        eligible.has(handle),
        eligible.has(handle) ? null : 'not-eligible',
      );
      stages.discovered = stage(
        discovered.has(handle),
        discovered.has(handle) ? null : 'not-discovered',
      );
      stages['exact-loaded'] = stage(
        exactLoaded.has(handle),
        exactLoaded.has(handle) ? null : 'not-loaded',
      );
      const prunedReason = pruned.get(handle);
      stages['final-packet'] = stage(
        finalHandles.has(handle),
        finalHandles.has(handle)
          ? null
          : (prunedReason ??
              (exactLoaded.has(handle)
                ? 'loaded-then-absent-from-final-packet'
                : 'absent-from-final-packet')),
      );
      const cited =
        citedItems.has(handle) || citedSources.has(handle);
      stages['cited-used'] = stage(
        cited,
        cited ? null : 'not-cited',
      );
      if (cited && !finalHandles.has(handle) && /^p\d+$/.test(handle)) {
        throw new Error(
          `Evidence lineage false citation: ${handle} cited but omitted from final packet`,
        );
      }
      const publicationState = input.publication?.state ?? 'not-run';
      if (publicationState === 'published') {
        stages.published = stage(
          publishedHandles.has(handle) || (cited && finalHandles.has(handle)),
          null,
        );
      } else if (publicationState === 'rejected' || publicationState === 'stale-refused') {
        stages.published = stage(false, 'publication-rejected');
      } else {
        stages.published = stage(false, publicationState);
      }
      const meta = hashes.get(handle);
      const kind: EvidenceLineageEntry['kind'] = handle.startsWith('p')
        ? 'passage'
        : handle.startsWith('s')
          ? 'source-citation'
          : handle.startsWith('m') || handle.startsWith('x')
            ? 'memory-item'
            : 'canonical-handle';
      return {
        handle,
        kind,
        stages,
        contentSha256: meta?.sha256 ?? null,
        bytes: meta?.bytes ?? null,
      };
    });

  const failureClass = classifyFailure(entries);
  const storyId =
    'storyId' in input.task.source ? input.task.source.storyId : null;
  const rootHash = input.task.context.canonicalKnowledge?.rootHash ?? null;
  const rootRevision = input.task.context.canonicalKnowledge?.rootRevision ?? null;

  const lineage = {
    version: STORYTELLER_EVIDENCE_LINEAGE_VERSION,
    storyId,
    rootHash,
    rootRevision,
    task: input.task.task,
    purposeId: inspection.purpose.id,
    packetSha256: inspection.sha256,
    packetBytes: inspection.serializedBytes,
    entries,
    checkpoints: {
      sourceExists: entries.some((entry) => entry.stages.stored.present),
      sourceSelected: entries.some((entry) => entry.stages.eligible.present),
      exactLoaded: entries.some((entry) => entry.stages['exact-loaded'].present),
      finalPacketIncludes: entries.some(
        (entry) => entry.stages['final-packet'].present,
      ),
      resultUses: entries.some((entry) => entry.stages['cited-used'].present),
      publishedConsistent:
        (input.publication?.state ?? 'not-run') === 'published'
          ? !entries.some(
              (entry) =>
                entry.stages['cited-used'].present &&
                !entry.stages.published.present,
            )
          : (input.publication?.state ?? 'not-run') === 'not-run',
    },
    failureClass,
    unknowns: [
      ...(rootHash ? [] : ['rootHash']),
      'providerUsage',
      'semanticProseFaithfulness',
    ],
    redaction: {
      sourceBodies: 'omitted' as const,
      promptBodies: 'omitted' as const,
    },
  } as const;

  const receiptSha256 = createHash('sha256')
    .update(JSON.stringify(lineage))
    .digest('hex');
  return { ...lineage, receiptSha256 };
}

export function formatStorytellerEvidenceLineage(
  lineage: StorytellerEvidenceLineage,
) {
  const lines = [
    `# Storyteller evidence lineage ${lineage.version}`,
    '',
    `- task: ${lineage.task} / ${lineage.purposeId}`,
    `- story: ${lineage.storyId ?? 'none'}; root ${lineage.rootHash?.slice(0, 12) ?? 'absent'}@${lineage.rootRevision ?? '-'}`,
    `- packet: ${lineage.packetBytes}B#${lineage.packetSha256.slice(0, 12)}`,
    `- failureClass: ${lineage.failureClass}`,
    `- checkpoints: exists=${lineage.checkpoints.sourceExists}; selected=${lineage.checkpoints.sourceSelected}; loaded=${lineage.checkpoints.exactLoaded}; final=${lineage.checkpoints.finalPacketIncludes}; used=${lineage.checkpoints.resultUses}; published=${lineage.checkpoints.publishedConsistent}`,
    '',
    '## Handles',
  ];
  for (const entry of lineage.entries) {
    const present = (
      Object.entries(entry.stages) as Array<
        [EvidenceLineageStageName, EvidenceLineageStageState]
      >
    )
      .filter(([, state]) => state.present)
      .map(([name]) => name)
      .join('→');
    const absentReason =
      entry.stages['final-packet'].present || !entry.stages['exact-loaded'].present
        ? ''
        : ` (${entry.stages['final-packet'].reason})`;
    lines.push(`- ${entry.handle} [${entry.kind}]: ${present || 'none'}${absentReason}`);
  }
  lines.push('', `receiptSha256: ${lineage.receiptSha256}`);
  return `${lines.join('\n')}\n`;
}

/** Fail closed when a lineage claims citation without final-packet presence. */
export function assertEvidenceLineageCitationIntegrity(
  lineage: StorytellerEvidenceLineage,
) {
  for (const entry of lineage.entries) {
    if (
      entry.stages['cited-used'].present &&
      entry.kind === 'passage' &&
      !entry.stages['final-packet'].present
    ) {
      throw new Error(
        `Cited passage ${entry.handle} missing from final packet`,
      );
    }
  }
  if (lineage.failureClass === 'false-citation') {
    throw new Error('Evidence lineage recorded a false citation');
  }
}
