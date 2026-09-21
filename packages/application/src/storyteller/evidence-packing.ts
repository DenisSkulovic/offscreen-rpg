import {
  packableEvidenceItemSchema,
  type EvidenceRepresentationLevel,
  type PackableEvidenceItem,
} from '@offscreen/contracts/story-retrieval';

const levelRank: Record<EvidenceRepresentationLevel, number> = {
  lead: 0,
  card: 1,
  exact: 2,
};

type Representation = PackableEvidenceItem['representations'][number];
type Selected = { item: PackableEvidenceItem; representation: Representation };

export type EvidencePackingPolicy = Readonly<{
  maxBytes: number;
  maxItems: number;
  maxItemsPerGroup: number;
}>;

function packetFor(selected: readonly Selected[]) {
  const contentIds = new Map<string, string>();
  const sourceIds = new Map<string, string>();
  const contents: Array<{ id: string; text: string }> = [];
  const sources: Array<{ id: string; key: string }> = [];
  const evidence = selected.map(({ item, representation }) => {
    let contentId = contentIds.get(representation.content);
    if (!contentId) {
      contentId = `c${contentIds.size + 1}`;
      contentIds.set(representation.content, contentId);
      contents.push({ id: contentId, text: representation.content });
    }
    const evidenceSourceIds = [...new Set(representation.sourceKeys)]
      .sort()
      .map((sourceKey) => {
        let sourceId = sourceIds.get(sourceKey);
        if (!sourceId) {
          sourceId = `s${sourceIds.size + 1}`;
          sourceIds.set(sourceKey, sourceId);
          sources.push({ id: sourceId, key: sourceKey });
        }
        return sourceId;
      });
    return {
      itemId: item.id,
      group: item.group,
      required: item.required,
      level: representation.level,
      contentId,
      sourceIds: evidenceSourceIds,
    };
  });
  return {
    format: 'offscreen.evidence-pack.v1' as const,
    contents,
    sources,
    evidence,
  };
}

function packetBytes(selected: readonly Selected[]) {
  return Buffer.byteLength(JSON.stringify(packetFor(selected)), 'utf8');
}

function inlinePacketBytes(selected: readonly Selected[]) {
  return Buffer.byteLength(
    JSON.stringify({
      format: 'offscreen.evidence-pack.v1',
      evidence: selected.map(({ item, representation }) => ({
        itemId: item.id,
        group: item.group,
        required: item.required,
        level: representation.level,
        content: representation.content,
        sourceKeys: [...new Set(representation.sourceKeys)].sort(),
      })),
    }),
    'utf8',
  );
}

function orderedRepresentations(item: PackableEvidenceItem) {
  return [...item.representations]
    .filter((entry) => levelRank[entry.level] >= levelRank[item.minimumLevel])
    .sort((left, right) => levelRank[left.level] - levelRank[right.level]);
}

export function packStoryEvidence(
  rawItems: readonly PackableEvidenceItem[],
  policy: EvidencePackingPolicy,
) {
  if (
    !Number.isInteger(policy.maxBytes) ||
    policy.maxBytes <= 0 ||
    !Number.isInteger(policy.maxItems) ||
    policy.maxItems <= 0 ||
    !Number.isInteger(policy.maxItemsPerGroup) ||
    policy.maxItemsPerGroup <= 0
  ) {
    throw new Error('Evidence packing limits must be positive integers');
  }
  const items = rawItems.map((item) => packableEvidenceItemSchema.parse(item));
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error('Evidence item IDs must be unique');
  }
  const selected: Selected[] = [];
  const omitted = new Map<string, 'item-limit' | 'group-limit' | 'byte-limit'>();
  const addBase = (item: PackableEvidenceItem) => {
    const representation = orderedRepresentations(item)[0];
    if (!representation) throw new Error('Evidence item has no usable representation');
    selected.push({ item, representation });
  };

  for (const item of items.filter((entry) => entry.required).sort((a, b) => a.id.localeCompare(b.id))) {
    addBase(item);
  }
  if (selected.length > policy.maxItems || packetBytes(selected) > policy.maxBytes) {
    return {
      status: 'mandatory-overflow' as const,
      packet: packetFor([]),
      bytes: packetBytes([]),
      selected: [],
      omitted: items.map((item) => ({ itemId: item.id, reason: 'mandatory-overflow' as const })),
      duplicateContentBytesRemoved: 0,
      duplicateSourceKeyBytesRemoved: 0,
      duplicateBytesRemoved: 0,
    };
  }

  const optional = items.filter((item) => !item.required);
  while (optional.length && selected.length < policy.maxItems) {
    optional.sort((left, right) => {
      const count = (item: PackableEvidenceItem) =>
        selected.filter(
          (entry) =>
            entry.item.group.kind === item.group.kind &&
            entry.item.group.key === item.group.key,
        ).length;
      return count(left) - count(right) || right.relevance - left.relevance || left.id.localeCompare(right.id);
    });
    const item = optional.shift()!;
    const groupCount = selected.filter(
      (entry) =>
        entry.item.group.kind === item.group.kind &&
        entry.item.group.key === item.group.key,
    ).length;
    if (groupCount >= policy.maxItemsPerGroup) {
      omitted.set(item.id, 'group-limit');
      continue;
    }
    addBase(item);
    if (packetBytes(selected) > policy.maxBytes) {
      selected.pop();
      omitted.set(item.id, 'byte-limit');
    }
  }
  for (const item of optional) omitted.set(item.id, 'item-limit');

  for (;;) {
    const upgrades = selected.flatMap((entry, index) => {
      const representations = orderedRepresentations(entry.item);
      const next = representations[representations.indexOf(entry.representation) + 1];
      if (!next) return [];
      const upgraded = selected.map((candidate, candidateIndex) =>
        candidateIndex === index ? { ...candidate, representation: next } : candidate,
      );
      const addedBytes = packetBytes(upgraded) - packetBytes(selected);
      return [{ index, next, addedBytes, gain: next.utility - entry.representation.utility }];
    }).filter((upgrade) => upgrade.gain > 0 && packetBytes(selected) + upgrade.addedBytes <= policy.maxBytes);
    upgrades.sort((left, right) =>
      right.gain / Math.max(1, right.addedBytes) - left.gain / Math.max(1, left.addedBytes) ||
      selected[left.index]!.item.id.localeCompare(selected[right.index]!.item.id),
    );
    const upgrade = upgrades[0];
    if (!upgrade) break;
    selected[upgrade.index] = { ...selected[upgrade.index]!, representation: upgrade.next };
  }

  const packet = packetFor(selected);
  const undeduplicatedContentBytes = selected.reduce(
    (total, entry) => total + Buffer.byteLength(entry.representation.content, 'utf8'),
    0,
  );
  const uniqueContentBytes = packet.contents.reduce(
    (total, entry) => total + Buffer.byteLength(entry.text, 'utf8'),
    0,
  );
  const undeduplicatedSourceKeyBytes = selected.reduce(
    (total, entry) =>
      total +
      [...new Set(entry.representation.sourceKeys)].reduce(
        (sourceTotal, sourceKey) =>
          sourceTotal + Buffer.byteLength(sourceKey, 'utf8'),
        0,
      ),
    0,
  );
  const uniqueSourceKeyBytes = packet.sources.reduce(
    (total, entry) => total + Buffer.byteLength(entry.key, 'utf8'),
    0,
  );
  const duplicateContentBytesRemoved =
    undeduplicatedContentBytes - uniqueContentBytes;
  const duplicateSourceKeyBytesRemoved =
    undeduplicatedSourceKeyBytes - uniqueSourceKeyBytes;
  return {
    status: 'packed' as const,
    packet,
    bytes: packetBytes(selected),
    selected: selected.map((entry) => ({ itemId: entry.item.id, level: entry.representation.level })),
    omitted: [...omitted].map(([itemId, reason]) => ({ itemId, reason })),
    duplicateContentBytesRemoved,
    duplicateSourceKeyBytesRemoved,
    duplicateBytesRemoved: Math.max(
      0,
      inlinePacketBytes(selected) - packetBytes(selected),
    ),
  };
}
