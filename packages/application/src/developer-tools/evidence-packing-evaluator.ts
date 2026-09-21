import type {
  EvidenceRepresentationLevel,
  PackableEvidenceItem,
} from '@offscreen/contracts/story-retrieval';
import {
  packStoryEvidence,
  type EvidencePackingPolicy,
} from '../storyteller/evidence-packing';

export const evidencePackingPressurePostures = {
  minimal: { maxBytes: 5_500, maxItems: 40, maxItemsPerGroup: 1 },
  balanced: { maxBytes: 8_000, maxItems: 40, maxItemsPerGroup: 1 },
  rich: { maxBytes: 18_000, maxItems: 40, maxItemsPerGroup: 1 },
} as const satisfies Record<string, EvidencePackingPolicy>;

const rank: Record<EvidenceRepresentationLevel, number> = {
  lead: 0,
  card: 1,
  exact: 2,
};

const returnSceneSource =
  'canonical:passages/greywake-return.md@revision-204#sha256:4af4a0f47699cbe72186418a65ba68f5';
const returnThreadSource =
  'canonical:threads/greywake-return.md@revision-17#sha256:79a85e4428cdcc79248b3f0916efbf6b';

function representations(args: {
  id: string;
  label: string;
  fact: string;
  detail: string;
  sourceKeys: string[];
  exactUtility?: number;
}) {
  return [
    {
      level: 'lead' as const,
      content: `${args.label}: ${args.fact}`,
      sourceKeys: args.sourceKeys,
      utility: 25,
    },
    {
      level: 'card' as const,
      content: `${args.label}: ${args.fact} ${args.detail}`,
      sourceKeys: args.sourceKeys,
      utility: 60,
    },
    {
      level: 'exact' as const,
      content: `${args.label}: ${args.fact} ${args.detail} Exact evidence marker: ${args.id}.`,
      sourceKeys: args.sourceKeys,
      utility: args.exactUtility ?? 60,
    },
  ];
}

/** Fixed eligible working set for measuring allocation after retrieval filters. */
export function buildEvidencePackingPressureFixture(): PackableEvidenceItem[] {
  const people = Array.from({ length: 20 }, (_, index) => {
    const ordinal = index + 1;
    const id = `person-${ordinal.toString().padStart(2, '0')}`;
    const required = ordinal <= 3;
    return {
      id,
      group: { kind: 'identity' as const, key: id },
      required,
      minimumLevel: required ? ('card' as const) : ('lead' as const),
      relevance: 96 - ordinal,
      representations: representations({
        id,
        label: `Greywake person ${ordinal}`,
        fact: `currently carries continuity fact ${ordinal}`,
        detail: `Their present relationship and intention are recorded without assuming a humanoid game model.`,
        sourceKeys: [
          `canonical:identities/${id}.md@revision-7#sha256:evidence-${id}`,
          returnSceneSource,
        ],
      }),
    };
  });
  const places = Array.from({ length: 5 }, (_, index) => {
    const ordinal = index + 1;
    const id = `place-${ordinal.toString().padStart(2, '0')}`;
    const required = ordinal === 1;
    return {
      id,
      group: { kind: 'place' as const, key: id },
      required,
      minimumLevel: required ? ('card' as const) : ('lead' as const),
      relevance: 92 - ordinal * 2,
      representations: representations({
        id,
        label: `Greywake place ${ordinal}`,
        fact: `has current condition ${ordinal}`,
        detail: `The location state is newer than its historical description and remains source-linked.`,
        sourceKeys: [
          `canonical:world/places/${id}.md@revision-12#sha256:evidence-${id}`,
          returnSceneSource,
        ],
      }),
    };
  });
  const nodes = Array.from({ length: 15 }, (_, index) => {
    const ordinal = index + 1;
    const id = `node-${ordinal.toString().padStart(2, '0')}`;
    const exactPromise = ordinal === 1;
    const required = ordinal <= 2;
    return {
      id,
      group: { kind: 'event' as const, key: id },
      required,
      minimumLevel: exactPromise
        ? ('exact' as const)
        : required
          ? ('card' as const)
          : ('lead' as const),
      relevance: 98 - ordinal,
      representations: representations({
        id,
        label: `Prior plot node ${ordinal}`,
        fact: exactPromise
          ? 'contains the promise whose exact wording controls this decision'
          : `established durable consequence ${ordinal}`,
        detail: `It occurred before the current return and remains relevant to the pending choice.`,
        sourceKeys: [
          `canonical:passages/${id}.md@revision-${ordinal}#sha256:evidence-${id}`,
          returnThreadSource,
        ],
        ...(exactPromise ? { exactUtility: 90 } : {}),
      }),
    };
  });
  return [...people, ...places, ...nodes];
}

export function evaluateEvidencePackingPressure(
  rawItems: readonly PackableEvidenceItem[] =
    buildEvidencePackingPressureFixture(),
  postures: Readonly<Record<string, EvidencePackingPolicy>> =
    evidencePackingPressurePostures,
) {
  const itemsById = new Map(rawItems.map((item) => [item.id, item]));
  const required = rawItems.filter((item) => item.required);
  const allGroups = new Set(
    rawItems.map((item) => `${item.group.kind}:${item.group.key}`),
  );

  return {
    format: 'offscreen.evidence-packing-pressure-report.v1' as const,
    fixture: {
      items: rawItems.length,
      identities: rawItems.filter((item) => item.group.kind === 'identity').length,
      places: rawItems.filter((item) => item.group.kind === 'place').length,
      plotNodes: rawItems.filter((item) => item.group.kind === 'event').length,
      required: required.length,
      groups: allGroups.size,
    },
    postures: Object.entries(postures).map(([posture, policy]) => {
      const packed = packStoryEvidence(rawItems, policy);
      const selectedById = new Map(
        packed.selected.map((selection) => [selection.itemId, selection.level]),
      );
      const selectedItems = packed.selected
        .map((selection) => itemsById.get(selection.itemId))
        .filter((item): item is PackableEvidenceItem => item !== undefined);
      const selectedGroups = new Set(
        selectedItems.map((item) => `${item.group.kind}:${item.group.key}`),
      );
      const groupCoverageByKind = Object.fromEntries(
        [...new Set(rawItems.map((item) => item.group.kind))]
          .sort()
          .map((kind) => {
            const eligibleGroups = new Set(
              rawItems
                .filter((item) => item.group.kind === kind)
                .map((item) => item.group.key),
            );
            const representedGroups = new Set(
              selectedItems
                .filter((item) => item.group.kind === kind)
                .map((item) => item.group.key),
            );
            return [
              kind,
              {
                eligible: eligibleGroups.size,
                selected: representedGroups.size,
                coverage: representedGroups.size / eligibleGroups.size,
              },
            ];
          }),
      );
      const selectedEvidence = new Map(
        packed.packet.evidence.map((entry) => [entry.itemId, entry]),
      );
      const sourceById = new Map(
        packed.packet.sources.map((source) => [source.id, source.key]),
      );
      const requiredAtMinimum = required.filter((item) => {
        const selectedLevel = selectedById.get(item.id);
        return selectedLevel !== undefined && rank[selectedLevel] >= rank[item.minimumLevel];
      });
      const requiredWithSources = required.filter((item) => {
        const selected = selectedEvidence.get(item.id);
        const selectedSourceKeys = new Set(
          selected?.sourceIds.map((id) => sourceById.get(id)) ?? [],
        );
        const level = selectedById.get(item.id);
        const representation = item.representations.find(
          (candidate) => candidate.level === level,
        );
        return (
          representation !== undefined &&
          representation.sourceKeys.every((source) =>
            selectedSourceKeys.has(source),
          )
        );
      });
      const usefulUniqueBytes = packed.packet.contents.reduce(
        (total, content) =>
          total + Buffer.byteLength(content.text, 'utf8'),
        0,
      );
      const fidelity = { lead: 0, card: 0, exact: 0 };
      for (const selection of packed.selected) fidelity[selection.level] += 1;
      const omissions = {
        itemLimit: packed.omitted.filter((entry) => entry.reason === 'item-limit').length,
        groupLimit: packed.omitted.filter((entry) => entry.reason === 'group-limit').length,
        byteLimit: packed.omitted.filter((entry) => entry.reason === 'byte-limit').length,
        mandatoryOverflow: packed.omitted.filter(
          (entry) => entry.reason === 'mandatory-overflow',
        ).length,
      };
      return {
        posture,
        policy,
        status: packed.status,
        bytes: packed.bytes,
        selectedItems: packed.selected.length,
        requiredRecall: required.length
          ? requiredAtMinimum.length / required.length
          : 1,
        requiredSourceRecall: required.length
          ? requiredWithSources.length / required.length
          : 1,
        groupCoverage: allGroups.size
          ? selectedGroups.size / allGroups.size
          : 1,
        groupCoverageByKind,
        usefulUniqueBytes,
        usefulDensity: packed.bytes
          ? usefulUniqueBytes / packed.bytes
          : 0,
        duplicateBytesRemoved: packed.duplicateBytesRemoved,
        fidelity,
        omissions,
        selected: packed.selected,
      };
    }),
  };
}
