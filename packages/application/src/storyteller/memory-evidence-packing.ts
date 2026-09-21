import type { PackableEvidenceItem } from '@offscreen/contracts/story-retrieval';
import type { MemoryExplorationSnapshot } from './memory-exploration';
import {
  packStoryEvidence,
  type EvidencePackingPolicy,
} from './evidence-packing';

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function groupKind(
  kind: string,
  path: string,
): PackableEvidenceItem['group']['kind'] {
  if (kind === 'identity') return 'identity';
  if (kind === 'source-passage') return 'event';
  if (
    kind === 'relationship' ||
    kind === 'narrative-thread' ||
    kind === 'private-possibility'
  ) {
    return 'thread';
  }
  if (kind.includes('rule') || path.startsWith('rules/')) return 'rule';
  if (
    kind === 'lore' ||
    path.startsWith('locations/') ||
    path.startsWith('environments/')
  ) {
    return 'place';
  }
  return 'other';
}

function sourceKey(
  unit: MemoryExplorationSnapshot['memoryHandles'][number]['unit'],
) {
  return `canonical:${unit.documentId}@${unit.revision}#sha256:${unit.sourceHash}`;
}

/** Converts only captured exploration evidence; it never reads or summarizes canon. */
export function buildPackableMemoryEvidence(
  snapshot: MemoryExplorationSnapshot,
): PackableEvidenceItem[] {
  const unitsByHandle = new Map(
    [...snapshot.memoryHandles, ...snapshot.sourceHandles].map((entry) => [
      entry.handle,
      entry.unit,
    ]),
  );
  const discoveries = new Map<
    string,
    { title: string; snippet?: string; order: number }
  >();
  const reads = new Map<
    string,
    { title: string; body: string; operation: 'inspect_memory' | 'read_source' }
  >();
  let order = 0;

  for (const rawRound of snapshot.rounds) {
    const round = record(rawRound);
    if (!round || !Array.isArray(round.results)) {
      throw new Error('Memory exploration round cannot be packed');
    }
    for (const rawResult of round.results) {
      const result = record(rawResult);
      if (
        !result ||
        typeof result.operation !== 'string' ||
        typeof result.state !== 'string'
      ) {
        throw new Error('Memory exploration result cannot be packed');
      }
      if (result.state !== 'ok') continue;
      if (
        result.operation === 'search_memory' ||
        result.operation === 'creative_search' ||
        result.operation === 'query_registry'
      ) {
        if (!Array.isArray(result.candidates)) {
          throw new Error('Memory exploration candidates cannot be packed');
        }
        for (const rawCandidate of result.candidates) {
          const candidate = record(rawCandidate);
          if (
            !candidate ||
            typeof candidate.handle !== 'string' ||
            typeof candidate.title !== 'string'
          ) {
            throw new Error('Memory exploration candidate cannot be packed');
          }
          if (discoveries.has(candidate.handle)) continue;
          discoveries.set(candidate.handle, {
            title: candidate.title,
            ...(typeof candidate.snippet === 'string' && candidate.snippet
              ? { snippet: candidate.snippet }
              : {}),
            order: order++,
          });
          if (Array.isArray(candidate.linkedSources)) {
            for (const rawSource of candidate.linkedSources) {
              const source = record(rawSource);
              if (
                !source ||
                typeof source.handle !== 'string' ||
                discoveries.has(source.handle)
              ) {
                continue;
              }
              discoveries.set(source.handle, {
                title: `${candidate.title} — exact source`,
                order: order++,
              });
            }
          }
        }
        continue;
      }
      if (
        result.operation === 'inspect_memory' ||
        result.operation === 'read_source'
      ) {
        if (
          typeof result.handle !== 'string' ||
          typeof result.title !== 'string' ||
          typeof result.body !== 'string'
        ) {
          throw new Error('Memory exploration read cannot be packed');
        }
        reads.set(result.handle, {
          title: result.title,
          body: result.body,
          operation: result.operation,
        });
        continue;
      }
      throw new Error('Memory exploration operation cannot be packed');
    }
  }

  const handles = new Set([...discoveries.keys(), ...reads.keys()]);
  return [...handles]
    .map((handle): PackableEvidenceItem => {
      const unit = unitsByHandle.get(handle);
      if (!unit) throw new Error('Memory exploration handle cannot be packed');
      const discovery = discoveries.get(handle);
      const read = reads.get(handle);
      const title = read?.title ?? discovery?.title ?? unit.title;
      const lead =
        discovery?.snippet?.trim() || `${title} — ${unit.contextualKey}`;
      const provenance = [sourceKey(unit)];
      const representations: PackableEvidenceItem['representations'] = [
        {
          level: 'lead',
          content: lead,
          sourceKeys: provenance,
          utility: 25,
        },
      ];
      if (read?.operation === 'inspect_memory') {
        representations.push({
          level: 'card',
          content: `${title}\n\n${read.body}`,
          sourceKeys: provenance,
          utility: 70,
        });
      } else if (read?.operation === 'read_source') {
        representations.push({
          level: 'exact',
          content: `${title}\n\n${read.body}`,
          sourceKeys: provenance,
          utility: 90,
        });
      }
      return {
        id: `${handle}:${unit.documentId}@${unit.revision}`,
        group: {
          kind: groupKind(unit.kind, unit.path),
          key: unit.documentId,
        },
        required: read !== undefined,
        minimumLevel:
          read?.operation === 'read_source'
            ? 'exact'
            : read?.operation === 'inspect_memory'
              ? 'card'
              : 'lead',
        relevance: Math.max(1, 100 - (discovery?.order ?? 50)),
        representations,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function packMemoryExplorationEvidence(
  snapshot: MemoryExplorationSnapshot,
  policy: EvidencePackingPolicy,
) {
  return packStoryEvidence(buildPackableMemoryEvidence(snapshot), policy);
}
