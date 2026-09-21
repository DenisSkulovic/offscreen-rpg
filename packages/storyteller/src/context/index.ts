import { campaignSettingsSchema } from '@offscreen/contracts/campaign';
import { worldTimeViewSchema } from '@offscreen/game/calendar';
import { worldConditionSchema } from '@offscreen/game/world-obligations';
import {
  immediateActionPlanSchema,
  storyFactDeclarationsSchema,
} from '@offscreen/game/immediate-actions';
import { rollSchema } from '@offscreen/game/checks';
import { outcomeEffectsSchema } from '@offscreen/game/effects';
import { offerSchema } from '@offscreen/game/offers';
import { characterSchema, storyFactsSchema } from '@offscreen/game/state';
import { z } from 'zod';
import { isDeepStrictEqual } from 'node:util';
import {
  passageContentSchema,
  storyItemsSchema,
} from '@offscreen/contracts/stories';

export const storytellerCampaignSettingsSchema = campaignSettingsSchema.omit({
  time: true,
});
import { activityAccessSchema } from '@offscreen/game/immediate-actions';
import { premiseContentSchema } from './premise';
import { continuityNotesSchema } from './continuity';

export * from './continuity';
export * from './premise';

export const evidencePassageSchema = z.strictObject({
  id: z.uuid(),
  sequence: z.number().int().positive(),
  content: passageContentSchema,
  response: z.string().max(2000).nullable(),
});
const canonicalLibraryCatalogueEntrySchema = z.strictObject({
  handle: z.string().regex(/^k[1-9][0-9]*$/),
  path: z.string().min(1).max(320),
  kind: z.string().min(1).max(80),
  sourceBytes: z.number().int().nonnegative().max(512 * 1024),
  sections: z
    .array(
      z.strictObject({
        handle: z.string().regex(/^k[1-9][0-9]*\.s[1-9][0-9]*$/),
        heading: z.string().min(1).max(240),
        level: z.number().int().min(1).max(6),
        line: z.number().int().positive(),
        topics: z.array(z.string().min(1).max(80)).max(16),
      }),
    )
    .max(12),
  topics: z.array(z.string().min(1).max(80)).max(16),
  loaded: z.boolean(),
});
const canonicalLibrarySchema = z.strictObject({
  handle: z.string().regex(/^l[1-9][0-9]*$/),
  kind: z.enum(['world', 'rules']),
  title: z.string().min(1).max(160),
  mount: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/).optional(),
  rootHash: z.string().regex(/^[0-9a-f]{64}$/),
  revision: z.number().int().positive(),
  catalogue: z.array(canonicalLibraryCatalogueEntrySchema).max(64),
  catalogueTruncated: z.boolean(),
  orientation: z
    .strictObject({
      documentHandle: z.string().regex(/^k[1-9][0-9]*$/),
      title: z.string().min(1).max(240),
      body: z.string().max(4 * 1024),
    })
    .optional(),
  selectedSections: z
    .array(
      z.strictObject({
        handle: z.string().regex(/^k[1-9][0-9]*\.s[1-9][0-9]*$/),
        documentHandle: z.string().regex(/^k[1-9][0-9]*$/),
        title: z.string().min(1).max(240),
        heading: z.string().min(1).max(240),
        body: z.string().max(8 * 1024),
        bytes: z.number().int().positive().max(8 * 1024),
      }),
    )
    .max(8),
});
const canonicalLibrarySelectionTraceSchema = z.strictObject({
  requestedTopics: z
    .array(z.string().regex(/^[a-z][a-z0-9-]{0,79}$/))
    .max(8),
  unmatchedTopics: z
    .array(z.string().regex(/^[a-z][a-z0-9-]{0,79}$/))
    .max(8),
  requestedHandles: z
    .array(z.string().regex(/^k[1-9][0-9]*\.s[1-9][0-9]*$/))
    .max(8),
  loadedHandles: z
    .array(z.string().regex(/^k[1-9][0-9]*\.s[1-9][0-9]*$/))
    .max(8),
  omitted: z
    .array(
      z.strictObject({
        handle: z.string().regex(/^k[1-9][0-9]*\.s[1-9][0-9]*$/),
        reason: z.enum([
          'read-limit',
          'byte-limit',
          'section-too-large',
          'request-limit',
        ]),
        bytes: z.number().int().positive().max(512 * 1024),
      }),
    )
    .max(8),
  maxReads: z.number().int().nonnegative().max(8),
  maxBytes: z.number().int().nonnegative().max(32 * 1024),
  usedReads: z.number().int().nonnegative().max(8),
  usedBytes: z.number().int().nonnegative().max(32 * 1024),
});
const canonicalDocumentSelectionTraceSchema = z.strictObject({
  cueResolution: z.strictObject({
    requested: z
      .array(
        z.strictObject({
          documentId: z.uuid(),
          reason: z.enum(['identity', 'place', 'thread']),
        }),
      )
      .max(12),
    resolvedDocumentIds: z.array(z.uuid()).max(4),
    unavailable: z
      .array(
        z.strictObject({
          documentId: z.uuid(),
          reasons: z
            .array(z.enum(['identity', 'place', 'thread']))
            .min(1)
            .max(3),
          reason: z.enum([
            'not-current-or-readable',
            'candidate-limit',
            'already-selected',
          ]),
        }),
      )
      .max(12),
    excludedDocumentIds: z.array(z.uuid()).max(4),
    maxCandidates: z.number().int().min(0).max(4),
  }),
  requestedDocumentIds: z.array(z.uuid()).max(4),
  loadedHandles: z
    .array(z.string().regex(/^d[1-9][0-9]*$/))
    .max(4),
  omitted: z
    .array(
      z.strictObject({
        documentId: z.uuid(),
        reason: z.enum([
          'document-too-large',
          'context-limit',
          'request-limit',
        ]),
        bytes: z.number().int().positive().max(512 * 1024),
      }),
    )
    .max(4),
  maxReads: z.literal(4),
  maxBytes: z.literal(12 * 1024),
  usedReads: z.number().int().nonnegative().max(4),
  usedBytes: z.number().int().nonnegative().max(12 * 1024),
});
export const canonicalKnowledgeSchema = z.strictObject({
  rootHash: z.string().regex(/^[0-9a-f]{64}$/),
  rootRevision: z.number().int().positive(),
  catalogue: z
    .array(
      z.strictObject({
        handle: z.string().regex(/^d[1-9][0-9]*$/),
        documentId: z.uuid(),
        revision: z.number().int().positive(),
        path: z.string().min(1).max(320),
        kind: z.enum([
          'orientation',
          'lore',
          'identity',
          'relationship',
          'narrative-thread',
          'creative-guidance',
          'private-possibility',
        ]),
        authority: z.enum([
          'canon',
          'source',
          'derived',
          'attributed',
          'projection',
          'noncanonical',
        ]),
        visibility: z.enum(['player-known', 'storyteller-private']),
        title: z.string().min(1).max(240),
        bytes: z.number().int().nonnegative().max(512 * 1024),
        loaded: z.boolean(),
      }),
    )
    .max(64),
  catalogueTruncated: z.boolean(),
  documents: z
    .array(
      z.strictObject({
        handle: z.string().regex(/^d[1-9][0-9]*$/),
        title: z.string().min(1).max(240),
        body: z.string().max(4 * 1024),
      }),
    )
    .max(8),
  documentSelection: canonicalDocumentSelectionTraceSchema,
  libraries: z.array(canonicalLibrarySchema).max(9),
  librarySelection: canonicalLibrarySelectionTraceSchema,
});
export const activeSceneScopeSchema = z
  .strictObject({
    version: z.literal('active-scene.v1'),
    fromSequence: z.number().int().positive(),
    throughSequence: z.number().int().positive(),
    requiredPassageIds: z.array(z.uuid()).max(40),
  })
  .refine(
    (scope) =>
      scope.throughSequence >= scope.fromSequence &&
      scope.throughSequence - scope.fromSequence < 40,
    'Active scene scope must contain one to forty passages',
  )
  .refine(
    (scope) =>
      new Set(scope.requiredPassageIds).size ===
      scope.requiredPassageIds.length,
    'Active scene required passage IDs must be unique',
  );
export const contextInputSchema = z.strictObject({
  canonicalKnowledge: canonicalKnowledgeSchema.optional(),
  activeSceneScope: activeSceneScopeSchema.optional(),
  activitySituation: z
    .strictObject({
      activityAccess: activityAccessSchema,
      activeActivityId: z.uuid().nullable(),
      acceptedPlan: z
        .strictObject({
          id: z.uuid(),
          revision: z.number().int().nonnegative(),
          horizonTick: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
          nextEntry: z.strictObject({
            id: z.uuid(),
            plan: immediateActionPlanSchema.refine(
              (plan) => plan.resolution.kind === 'process',
              'Accepted plan entries must be extended activities',
            ),
          }),
        })
        .optional(),
      commitments: z
        .array(
          z.strictObject({
            activityId: z.uuid(),
            actionId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
            revision: z.number().int().nonnegative(),
            state: z.enum([
              'running',
              'paused',
              'suspended',
              'blocked',
              'encounter',
              'completion-pending',
            ]),
            label: z.string().min(1).max(200),
            progress: z.discriminatedUnion('kind', [
              z.strictObject({
                kind: z.literal('contribution'),
                label: z.string().min(1).max(120),
                earned: z.number().int().nonnegative(),
                required: z.number().int().positive(),
              }),
              z.strictObject({
                kind: z.literal('wait'),
                label: z.string().min(1).max(120),
                elapsedTicks: z.number().int().nonnegative(),
                requiredTicks: z.number().int().positive(),
              }),
            ]),
          }),
        )
        .max(20),
    })
    .optional(),
  mechanicalOpening: z
    .strictObject({
      id: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,99}$/),
      character: characterSchema,
      storyFacts: storyFactsSchema.default([]),
      opening: passageContentSchema,
    })
    .optional(),
  resolution: z
    .strictObject({
      character: characterSchema,
      storyFacts: storyFactsSchema.default([]),
      tick: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
      offer: offerSchema.nullable(),
      receipts: z
        .array(
          z.strictObject({
            id: z.uuid(),
            outcome: z.enum(['automatic', 'success', 'failure']).optional(),
            text: z.string().max(1000).optional(),
            roll: rollSchema.nullable(),
            effects: outcomeEffectsSchema,
            declarations: storyFactDeclarationsSchema,
          }),
        )
        .max(192),
    })
    .optional(),
  campaignSettings: storytellerCampaignSettingsSchema.optional(),
  campaignTime: worldTimeViewSchema.optional(),
  worldConditions: z.array(worldConditionSchema).max(64).optional(),
  premise: premiseContentSchema,
  current: evidencePassageSchema.nullable(),
  items: storyItemsSchema,
  selected: z
    .strictObject({
      id: z.string().max(100),
      label: z.string().max(500),
      intention: z.string().max(2000),
    })
    .nullable(),
  notes: continuityNotesSchema,
  evidence: z.array(evidencePassageSchema).max(87),
});
export type StorytellerContext = z.infer<typeof contextInputSchema>;

export function contextRequestSections(context: StorytellerContext) {
  const handle = (id: string) => {
    const passage = context.evidence.find((item) => item.id === id);
    if (!passage) {
      throw new Error('Missing continuity evidence');
    }
    return `p${passage.sequence}`;
  };
  return {
    sceneContext: {
      premise: context.premise,
      ...(context.canonicalKnowledge
        ? {
            canonicalKnowledge: {
              catalogue: context.canonicalKnowledge.catalogue,
              catalogueTruncated:
                context.canonicalKnowledge.catalogueTruncated,
              documents: context.canonicalKnowledge.documents,
              documentSelection:
                context.canonicalKnowledge.documentSelection,
              libraries: context.canonicalKnowledge.libraries.map(
                ({ rootHash: _rootHash, ...library }) => library,
              ),
              librarySelection: context.canonicalKnowledge.librarySelection,
            },
          }
        : {}),
      notes: context.notes.map((note) => ({
        key: note.key,
        text: note.text,
        evidence: note.sources.map(handle),
      })),
      evidence: context.evidence
        .filter((passage) => passage.id !== context.current?.id)
        .map((passage) => ({
          handle: `p${passage.sequence}`,
          content: passage.content,
          response: passage.response,
        })),
    },
    currentState: {
      ...(context.activitySituation
        ? { activitySituation: context.activitySituation }
        : {}),
      ...(context.mechanicalOpening
        ? {
            mechanicalOpening: {
              character: context.mechanicalOpening.character,
              storyFacts: context.mechanicalOpening.storyFacts,
              opening: context.mechanicalOpening.opening,
            },
          }
        : {}),
      ...(context.resolution ? { resolution: context.resolution } : {}),
      ...(context.campaignSettings
        ? { campaignSettings: context.campaignSettings }
        : {}),
      ...(context.campaignTime ? { campaignTime: context.campaignTime } : {}),
      ...(context.worldConditions
        ? { worldConditions: context.worldConditions }
        : {}),
      current: context.current
        ? {
            handle: `p${context.current.sequence}`,
            content: context.current.content,
          }
        : null,
      items: context.items,
    },
    selectedIntention: context.selected,
  };
}

/** Preserve mandatory note evidence; omit complete optional passages, never partial facts. */
export function boundStorytellerContext(
  input: unknown,
  fits: (context: StorytellerContext) => boolean,
) {
  const context = contextInputSchema.parse(input);
  const ids = context.evidence.map((passage) => passage.id);
  const sequences = context.evidence.map((passage) => passage.sequence);
  if (
    new Set(ids).size !== ids.length ||
    new Set(sequences).size !== sequences.length
  ) {
    throw new Error('Duplicate context evidence');
  }
  if (context.current) {
    const current = context.current;
    const currentEvidence = context.evidence.find(
      (passage) => passage.id === current.id,
    );
    if (!isDeepStrictEqual(currentEvidence, current)) {
      throw new Error('Current passage differs from context evidence');
    }
    if (
      context.evidence.some((passage) => passage.sequence > current.sequence)
    ) {
      throw new Error('Context evidence includes a future passage');
    }
  }
  const activeScene = context.activeSceneScope;
  if (activeScene) {
    if (
      !context.current ||
      activeScene.fromSequence > activeScene.throughSequence ||
      activeScene.throughSequence !== context.current.sequence
    ) {
      throw new Error('Invalid active scene scope');
    }
    const sceneSequences = new Set(
      context.evidence
        .filter(
          (passage) =>
            passage.sequence >= activeScene.fromSequence &&
            passage.sequence <= activeScene.throughSequence,
        )
        .map((passage) => passage.sequence),
    );
    for (
      let sequence = activeScene.fromSequence;
      sequence <= activeScene.throughSequence;
      sequence++
    ) {
      if (!sceneSequences.has(sequence)) {
        throw new Error('Active scene evidence is incomplete');
      }
    }
  }
  const required = new Set(context.notes.flatMap((note) => note.sources));
  if (context.current) {
    required.add(context.current.id);
  }
  if (activeScene) {
    for (const passage of context.evidence) {
      if (
        passage.sequence >= activeScene.fromSequence &&
        passage.sequence <= activeScene.throughSequence
      ) {
        required.add(passage.id);
      }
    }
    for (const passageId of activeScene.requiredPassageIds) {
      required.add(passageId);
    }
  }
  const mandatory = context.evidence.filter((passage) =>
    required.has(passage.id),
  );
  if (mandatory.length !== required.size) {
    throw new Error('Missing continuity evidence');
  }
  const captured = { ...context, evidence: mandatory };
  while (
    !fits(captured) &&
    captured.canonicalKnowledge &&
    captured.canonicalKnowledge.documents.length
  ) {
    const documents = captured.canonicalKnowledge.documents.slice(0, -1);
    const loadedHandles = new Set(documents.map((document) => document.handle));
    captured.canonicalKnowledge = {
      ...captured.canonicalKnowledge,
      catalogue: captured.canonicalKnowledge.catalogue.map((entry) => ({
        ...entry,
        loaded: loadedHandles.has(entry.handle),
      })),
      documents,
      documentSelection: (() => {
        const selection = captured.canonicalKnowledge!.documentSelection;
        const removed = captured.canonicalKnowledge!.documents.at(-1);
        if (!removed || !selection.loadedHandles.includes(removed.handle)) {
          return selection;
        }
        const catalogueEntry = captured.canonicalKnowledge!.catalogue.find(
          (entry) => entry.handle === removed.handle,
        );
        if (!catalogueEntry) {
          throw new Error('Missing selected campaign document catalogue entry');
        }
        return {
          ...selection,
          loadedHandles: selection.loadedHandles.filter(
            (handle) => handle !== removed.handle,
          ),
          omitted: [
            ...selection.omitted,
            {
              documentId: catalogueEntry.documentId,
              reason: 'request-limit' as const,
              bytes: catalogueEntry.bytes,
            },
          ],
          usedReads: selection.usedReads - 1,
          usedBytes: selection.usedBytes - catalogueEntry.bytes,
        };
      })(),
    };
  }
  while (
    !fits(captured) &&
    captured.canonicalKnowledge?.libraries.some(
      (library) => library.orientation,
    )
  ) {
    const libraries = [...captured.canonicalKnowledge.libraries];
    const index = libraries.findLastIndex((library) => library.orientation);
    const library = libraries[index];
    if (!library?.orientation) {
      break;
    }
    const orientationHandle = library.orientation.documentHandle;
    const { orientation: _orientation, ...withoutOrientation } = library;
    libraries[index] = {
      ...withoutOrientation,
      catalogue: library.catalogue.map((entry) => ({
        ...entry,
        loaded:
          entry.handle === orientationHandle
            ? library.selectedSections.some(
                (section) => section.documentHandle === entry.handle,
              )
            : entry.loaded,
      })),
    };
    captured.canonicalKnowledge = {
      ...captured.canonicalKnowledge,
      libraries,
    };
  }
  while (
    !fits(captured) &&
    captured.canonicalKnowledge?.libraries.some(
      (library) => library.selectedSections.length,
    )
  ) {
    const libraries = [...captured.canonicalKnowledge.libraries];
    const index = libraries.findLastIndex(
      (library) => library.selectedSections.length > 0,
    );
    const library = libraries[index];
    const removed = library?.selectedSections.at(-1);
    if (!library || !removed) {
      break;
    }
    const selectedSections = library.selectedSections.slice(0, -1);
    libraries[index] = {
      ...library,
      selectedSections,
      catalogue: library.catalogue.map((entry) => ({
        ...entry,
        loaded:
          entry.handle === library.orientation?.documentHandle ||
          selectedSections.some(
            (section) => section.documentHandle === entry.handle,
          ),
      })),
    };
    const selection = captured.canonicalKnowledge.librarySelection;
    captured.canonicalKnowledge = {
      ...captured.canonicalKnowledge,
      libraries,
      librarySelection: {
        ...selection,
        loadedHandles: selection.loadedHandles.filter(
          (handle) => handle !== removed.handle,
        ),
        omitted: [
          ...selection.omitted,
          {
            handle: removed.handle,
            reason: 'request-limit' as const,
            bytes: removed.bytes,
          },
        ],
        usedReads: selection.usedReads - 1,
        usedBytes: selection.usedBytes - removed.bytes,
      },
    };
  }
  if (!fits(captured)) {
    throw new Error('context_too_large');
  }
  const optional = context.evidence
    .filter((passage) => !required.has(passage.id))
    .sort((a, b) => b.sequence - a.sequence)
    .slice(0, 6);
  for (const passage of optional) {
    const candidate = {
      ...captured,
      evidence: [...captured.evidence, passage],
    };
    if (fits(candidate)) {
      captured.evidence.push(passage);
    }
  }
  captured.evidence.sort((a, b) => a.sequence - b.sequence);
  return captured;
}
