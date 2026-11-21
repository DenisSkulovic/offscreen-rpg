import type { EvidencePacket } from '@offscreen/contracts/story-retrieval';
import {
  memoryEvidenceUseSchema,
  type MemoryEvidenceUse,
} from '@offscreen/storyteller/tasks';

export type MemoryEvidenceUseReport = Readonly<{
  format: 'offscreen.memory-evidence-use.v1';
  declaredItemIds: readonly string[];
  declaredSourceIds: readonly string[];
  requiredItemIds: readonly string[];
  requiredUnusedItemIds: readonly string[];
}>;

/**
 * Validates the model's private self-citation against the exact supplied pack.
 * This proves reference integrity, not that the prose semantically used evidence.
 */
export function validateMemoryEvidenceUse(
  packet: EvidencePacket,
  rawUse: MemoryEvidenceUse,
): MemoryEvidenceUseReport {
  const use = memoryEvidenceUseSchema.parse(rawUse);
  const items = new Map(packet.evidence.map((item) => [item.itemId, item]));
  const citedSources = new Set<string>();
  for (const itemId of use.itemIds) {
    const item = items.get(itemId);
    if (!item) throw new Error(`Evidence use cites unknown item: ${itemId}`);
    for (const sourceId of item.sourceIds) citedSources.add(sourceId);
  }
  for (const sourceId of use.sourceIds) {
    if (!citedSources.has(sourceId)) {
      throw new Error(
        `Evidence use source is not attached to a cited item: ${sourceId}`,
      );
    }
  }
  const declaredSources = new Set(use.sourceIds);
  for (const sourceId of citedSources) {
    if (!declaredSources.has(sourceId)) {
      throw new Error(`Evidence use omits cited item source: ${sourceId}`);
    }
  }
  const requiredItemIds = packet.evidence
    .filter((item) => item.required)
    .map((item) => item.itemId);
  const declaredItems = new Set(use.itemIds);
  return {
    format: 'offscreen.memory-evidence-use.v1',
    declaredItemIds: use.itemIds,
    declaredSourceIds: use.sourceIds,
    requiredItemIds,
    requiredUnusedItemIds: requiredItemIds.filter(
      (itemId) => !declaredItems.has(itemId),
    ),
  };
}
