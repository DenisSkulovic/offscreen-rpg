/**
 * SA09: when a published turn may create a descriptive identity/relationship
 * record. Structured cues only — not a prose classifier or entity graph.
 */
import { z } from 'zod';
import {
  proposedDocumentChangeSchema,
  type ProposedDocumentChange,
} from './document-changes';

export const DESCRIPTIVE_MATERIALIZATION_VERSION =
  'descriptive-materialization.v1' as const;

export const descriptiveMaterializationCueSchema = z.discriminatedUnion(
  'situation',
  [
    z.strictObject({
      situation: z.literal('named-gift-or-favor'),
      personStable: z.boolean(),
      transferSucceeded: z.boolean(),
      futureRelevance: z.boolean(),
      counterpartExact: z.boolean(),
    }),
    z.strictObject({
      situation: z.literal('passing-crowd-mention'),
      distinctiveEngagement: z.boolean(),
    }),
    z.strictObject({
      situation: z.literal('relationship-stance-change'),
      bothIdentitiesExact: z.boolean(),
      durableChange: z.boolean(),
    }),
    z.strictObject({
      situation: z.literal('disputed-or-rumored-claim'),
      attributedSpeakerKnown: z.boolean(),
      laterCorrectnessDepends: z.boolean(),
    }),
    z.strictObject({
      situation: z.literal('failed-transfer-as-success'),
      claimedSuccessfulGift: z.literal(true),
      transferSucceeded: z.literal(false),
    }),
  ],
);

export type DescriptiveMaterializationCue = z.infer<
  typeof descriptiveMaterializationCueSchema
>;

export const descriptiveMaterializationDecisionSchema = z.discriminatedUnion(
  'action',
  [
    z.strictObject({
      version: z.literal(DESCRIPTIVE_MATERIALIZATION_VERSION),
      action: z.literal('create'),
      kind: z.enum(['identity', 'relationship', 'lore', 'narrative-thread']),
      authority: z.enum(['canon', 'attributed']),
      visibility: z.literal('player-known'),
      reason: z.string().min(1).max(240),
    }),
    z.strictObject({
      version: z.literal(DESCRIPTIVE_MATERIALIZATION_VERSION),
      action: z.literal('omit'),
      reason: z.string().min(1).max(240),
    }),
    z.strictObject({
      version: z.literal(DESCRIPTIVE_MATERIALIZATION_VERSION),
      action: z.literal('reject'),
      reason: z.string().min(1).max(240),
    }),
  ],
);

export type DescriptiveMaterializationDecision = z.infer<
  typeof descriptiveMaterializationDecisionSchema
>;

/**
 * Deterministic stewardship gate. Low-drama facts are not omitted solely for
 * being quiet; failed gifts cannot be recorded as successful favors.
 */
export function decideDescriptiveMaterialization(
  rawCue: DescriptiveMaterializationCue,
): DescriptiveMaterializationDecision {
  const cue = descriptiveMaterializationCueSchema.parse(rawCue);
  switch (cue.situation) {
    case 'failed-transfer-as-success':
      return descriptiveMaterializationDecisionSchema.parse({
        version: DESCRIPTIVE_MATERIALIZATION_VERSION,
        action: 'reject',
        reason:
          'A failed transfer cannot be remembered as a successful gift or favor',
      });
    case 'passing-crowd-mention':
      if (cue.distinctiveEngagement) {
        return descriptiveMaterializationDecisionSchema.parse({
          version: DESCRIPTIVE_MATERIALIZATION_VERSION,
          action: 'create',
          kind: 'identity',
          authority: 'canon',
          visibility: 'player-known',
          reason:
            'Distinctive engagement made the individual later-correctness relevant',
        });
      }
      return descriptiveMaterializationDecisionSchema.parse({
        version: DESCRIPTIVE_MATERIALIZATION_VERSION,
        action: 'omit',
        reason: 'Passing crowd or decorative mention needs no descriptive record',
      });
    case 'named-gift-or-favor':
      if (!cue.transferSucceeded) {
        return descriptiveMaterializationDecisionSchema.parse({
          version: DESCRIPTIVE_MATERIALIZATION_VERSION,
          action: 'reject',
          reason:
            'A failed transfer cannot be remembered as a successful gift or favor',
        });
      }
      if (!cue.personStable || !cue.counterpartExact) {
        return descriptiveMaterializationDecisionSchema.parse({
          version: DESCRIPTIVE_MATERIALIZATION_VERSION,
          action: 'omit',
          reason:
            'Gift memory requires exact stable identities on both sides of the transfer',
        });
      }
      if (!cue.futureRelevance) {
        return descriptiveMaterializationDecisionSchema.parse({
          version: DESCRIPTIVE_MATERIALIZATION_VERSION,
          action: 'create',
          kind: 'relationship',
          authority: 'canon',
          visibility: 'player-known',
          reason:
            'Successful named transfer still deserves a concise relationship record even when low-drama',
        });
      }
      return descriptiveMaterializationDecisionSchema.parse({
        version: DESCRIPTIVE_MATERIALIZATION_VERSION,
        action: 'create',
        kind: 'relationship',
        authority: 'canon',
        visibility: 'player-known',
        reason:
          'Successful gift or favor with exact identities and future relevance',
      });
    case 'relationship-stance-change':
      if (!cue.bothIdentitiesExact || !cue.durableChange) {
        return descriptiveMaterializationDecisionSchema.parse({
          version: DESCRIPTIVE_MATERIALIZATION_VERSION,
          action: 'omit',
          reason:
            'Relationship records require exact identities and a durable stance change',
        });
      }
      return descriptiveMaterializationDecisionSchema.parse({
        version: DESCRIPTIVE_MATERIALIZATION_VERSION,
        action: 'create',
        kind: 'relationship',
        authority: 'canon',
        visibility: 'player-known',
        reason: 'Durable trust, obligation, access or commitment change',
      });
    case 'disputed-or-rumored-claim':
      if (!cue.laterCorrectnessDepends) {
        return descriptiveMaterializationDecisionSchema.parse({
          version: DESCRIPTIVE_MATERIALIZATION_VERSION,
          action: 'omit',
          reason: 'Unimportant rumor need not enter descriptive canon',
        });
      }
      if (!cue.attributedSpeakerKnown) {
        return descriptiveMaterializationDecisionSchema.parse({
          version: DESCRIPTIVE_MATERIALIZATION_VERSION,
          action: 'omit',
          reason:
            'Unattributed rumor stays uncertain and is not promoted to a public record',
        });
      }
      return descriptiveMaterializationDecisionSchema.parse({
        version: DESCRIPTIVE_MATERIALIZATION_VERSION,
        action: 'create',
        kind: 'lore',
        authority: 'attributed',
        visibility: 'player-known',
        reason:
          'Disputed claim retained as attributed lore; canonical truth stays unsettled',
      });
  }
}

/** Fixture helper: ensure a proposed change matches a create decision. */
export function proposedChangeMatchesMaterialization(
  change: ProposedDocumentChange,
  decision: DescriptiveMaterializationDecision,
): boolean {
  proposedDocumentChangeSchema.parse(change);
  if (decision.action !== 'create') return false;
  return (
    change.operation === 'create' &&
    change.kind === decision.kind &&
    change.authority === decision.authority &&
    change.visibility === decision.visibility
  );
}
