import {
  campaignStartSchema,
  type CampaignStart,
} from '@offscreen/contracts/campaign';
import { storytellerKind } from '../storyteller/records';
import { startStorytellerCandidate } from '../storyteller/start';
import {
  playableOpeningArtifactSchema,
  playablePresentation,
  playableProposalSchema,
  premiseContentSchema,
  validatePlayableResult,
  mechanicalOpeningSceneSchema,
  storytellerTaskSchema,
  validateStorytellerResult,
} from '@offscreen/storyteller/tasks';
import type { Database } from '@offscreen/db';
import { storyDraft } from '@offscreen/db/draft-schema';
import { draftOpening, generation } from '@offscreen/db/generation-schema';
import { and, eq } from 'drizzle-orm';
import { initializeStoryInTransaction } from './initialization';
import { parseStoryIdentifier, StoryError } from './errors';
import type { DocumentStore, RulePackageReference } from '@offscreen/documents';
import {
  instantiateStartPackage,
  stableNamespacedDocumentId,
} from '@offscreen/documents';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  stageStoryBootstrapDocuments,
  type StagedStoryBootstrap,
} from './passage-documents';
import { story, storyPassage } from '@offscreen/db/story-schema';
import { worldPackageReferenceSchema } from '@offscreen/documents';
import { z } from 'zod';
import { worldObligationProposalSchema } from '@offscreen/game/world-obligations';

export const playableOpeningStorySource = 'playable.opening.v1';

const playableOpeningKinds = new Set([
  'opening.playable.v1',
  'opening.playable.scripted.v1',
]);

type StartFromCandidate = Readonly<{
  ownerId: string;
  storyId: string;
  candidateId: string;
  expectedDraftRevision: number;
  campaign?: CampaignStart;
}>;

export function createStoryStart(
  database: Database,
  documentStore?: DocumentStore,
  defaultRules?: RulePackageReference,
) {
  return async function startFromCandidate({
    ownerId,
    storyId,
    candidateId,
    expectedDraftRevision,
    campaign,
  }: StartFromCandidate) {
    const id = parseStoryIdentifier(storyId);
    const generationId = parseStoryIdentifier(candidateId);
    if (
      !Number.isSafeInteger(expectedDraftRevision) ||
      expectedDraftRevision < 1 ||
      expectedDraftRevision > 2147483646
    ) {
      throw new StoryError('invalid');
    }
    const requestedCampaignOptions = campaignStartSchema.parse(campaign ?? {});
    let campaignOptions = requestedCampaignOptions;
    let startManifest;
    if (requestedCampaignOptions.startPackage) {
      if (!documentStore) throw new StoryError('unavailable', 'document_store');
      startManifest = await documentStore.readStartPackageManifest(
        requestedCampaignOptions.startPackage.rootHash,
      );
      if (
        startManifest.startPackageId !==
          requestedCampaignOptions.startPackage.startPackageId ||
        startManifest.revision !==
          requestedCampaignOptions.startPackage.revision
      ) {
        throw new StoryError('invalid', 'start_reference');
      }
      if (
        requestedCampaignOptions.worlds.length &&
        !isDeepStrictEqual(
          requestedCampaignOptions.worlds,
          startManifest.worlds,
        )
      ) {
        throw new StoryError('invalid', 'world_references');
      }
      if (
        !defaultRules ||
        !isDeepStrictEqual(defaultRules, startManifest.rules)
      ) {
        throw new StoryError('invalid', 'rule_reference');
      }
      const packageObligations = [];
      for (const entry of startManifest.entries) {
        if (entry.activation !== 'executable-obligation') continue;
        const document = await documentStore.readStructuredDocument(
          entry.objectHash,
        );
        if (document.schemaId !== 'world-obligation.v1') {
          throw new StoryError('invalid', 'start_obligation');
        }
        const parsed = z
          .strictObject({
            version: z.literal(1),
            obligation: worldObligationProposalSchema,
          })
          .parse(document.data);
        packageObligations.push({
          ...parsed.obligation,
          id: stableNamespacedDocumentId(
            'campaign-obligation',
            id,
            parsed.obligation.id,
          ),
        });
      }
      const combinedObligations = [
        ...requestedCampaignOptions.worldObligations,
        ...packageObligations,
      ];
      if (
        new Set(combinedObligations.map((obligation) => obligation.id)).size !==
        combinedObligations.length
      ) {
        throw new StoryError('invalid', 'duplicate_world_obligation');
      }
      campaignOptions = campaignStartSchema.parse({
        ...requestedCampaignOptions,
        worlds: startManifest.worlds,
        worldObligations: combinedObligations,
      });
    }
    if (defaultRules) {
      if (!documentStore) throw new StoryError('unavailable', 'document_store');
      const rulesManifest = await documentStore.readRulePackageManifest(
        defaultRules.rootHash,
      );
      if (
        rulesManifest.ruleSetId !== defaultRules.ruleSetId ||
        rulesManifest.revision !== defaultRules.revision ||
        !isDeepStrictEqual(rulesManifest.engine, defaultRules.engine)
      ) {
        throw new StoryError('invalid', 'rule_reference');
      }
    }
    if (documentStore) {
      for (const reference of campaignOptions.worlds) {
        const manifest = await documentStore.readWorldPackageManifest(
          reference.rootHash,
        );
        if (
          manifest.worldId !== reference.worldId ||
          manifest.revision !== reference.revision
        ) {
          throw new StoryError('invalid', 'world_reference');
        }
      }
    } else if (campaignOptions.worlds.length) {
      throw new StoryError('unavailable', 'document_store');
    }

    const [candidateForStaging] = documentStore
      ? await database.db
          .select()
          .from(generation)
          .where(eq(generation.id, generationId))
      : [];
    if (documentStore && !candidateForStaging) {
      throw new StoryError('not_found');
    }
    if (candidateForStaging && candidateForStaging.ownerId !== ownerId) {
      throw new StoryError('not_found');
    }
    const [existingPassage] = documentStore
      ? await database.db
          .select({
            id: storyPassage.id,
            content: storyPassage.content,
            contentDocumentHash: storyPassage.contentDocumentHash,
          })
          .from(storyPassage)
          .where(
            and(eq(storyPassage.storyId, id), eq(storyPassage.sequence, 1)),
          )
      : [];
    const existingPassageContent =
      documentStore && existingPassage?.contentDocumentHash
        ? (
            await documentStore.readSourcePassage(
              existingPassage.contentDocumentHash,
            )
          ).content
        : existingPassage?.content;
    if (documentStore && existingPassage) {
      const [existingStory] = await database.db
        .select({ rootHash: story.documentRootHash })
        .from(story)
        .where(eq(story.id, id));
      if (!existingStory?.rootHash) {
        throw new StoryError('conflict', 'document_root');
      }
      const manifest = await documentStore.readManifest(existingStory.rootHash);
      const worldEntry = manifest.entries.find(
        (entry) => entry.path === 'world/references.json',
      );
      const existingWorlds = worldEntry
        ? z
            .object({
              version: z.literal(1),
              worlds: z.array(worldPackageReferenceSchema).max(8),
            })
            .parse(
              (
                await documentStore.readStructuredDocument(
                  worldEntry.objectHash,
                )
              ).data,
            ).worlds
        : [];
      if (!isDeepStrictEqual(existingWorlds, campaignOptions.worlds)) {
        throw new StoryError('conflict', 'world_references');
      }
      const ruleEntry = manifest.entries.find(
        (entry) => entry.path === 'rules/reference.json',
      );
      const existingRules = ruleEntry
        ? z
            .object({ version: z.literal(1), rules: z.unknown() })
            .parse(
              (await documentStore.readStructuredDocument(ruleEntry.objectHash))
                .data,
            ).rules
        : undefined;
      if (!isDeepStrictEqual(existingRules, defaultRules)) {
        throw new StoryError('conflict', 'rule_reference');
      }
      const startEntry = manifest.entries.find(
        (entry) => entry.path === 'start/reference.json',
      );
      const existingStart = startEntry
        ? z
            .object({
              version: z.literal(1),
              startPackageId: z.uuid(),
              rootHash: z.string(),
              revision: z.number().int().positive(),
            })
            .parse(
              (
                await documentStore.readStructuredDocument(
                  startEntry.objectHash,
                )
              ).data,
            )
        : undefined;
      const requestedStart = requestedCampaignOptions.startPackage
        ? {
            version: 1 as const,
            ...requestedCampaignOptions.startPackage,
          }
        : undefined;
      if (
        !isDeepStrictEqual(
          existingStart
            ? {
                version: existingStart.version,
                startPackageId: existingStart.startPackageId,
                rootHash: existingStart.rootHash,
                revision: existingStart.revision,
              }
            : undefined,
          requestedStart,
        )
      ) {
        throw new StoryError('conflict', 'start_reference');
      }
    }
    let stagedPassage: StagedStoryBootstrap | undefined;
    if (
      documentStore &&
      candidateForStaging?.state === 'succeeded' &&
      !existingPassage
    ) {
      let content;
      let premise;
      let character;
      if (candidateForStaging.kind === storytellerKind) {
        const task = storytellerTaskSchema.parse(candidateForStaging.input);
        if (task.task !== 'opening') throw new StoryError('invalid');
        const result = validateStorytellerResult(
          task,
          candidateForStaging.output,
        );
        if (task.context.mechanicalOpening) {
          content = mechanicalOpeningSceneSchema.parse(result.scene).content;
          character = task.context.mechanicalOpening.character;
        } else {
          content = playablePresentation(
            playableProposalSchema.parse(result.scene),
          ).content;
        }
        premise = task.context.premise;
      } else {
        const artifact = playableOpeningArtifactSchema.parse(
          candidateForStaging.input,
        );
        const [draftForStaging] = await database.db
          .select()
          .from(storyDraft)
          .where(
            and(
              eq(storyDraft.id, artifact.source.draftId),
              eq(storyDraft.ownerId, ownerId),
            ),
          );
        if (!draftForStaging) throw new StoryError('not_found');
        const proposal = playableProposalSchema.parse(
          candidateForStaging.output,
        );
        content = playablePresentation(proposal).content;
        premise = premiseContentSchema.parse({
          title: draftForStaging.title,
          premise: draftForStaging.premise,
          storytellingDirection: draftForStaging.storytellingDirection,
        });
      }
      stagedPassage = await stageStoryBootstrapDocuments({
        storage: documentStore,
        storyId: id,
        passageId: randomUUID(),
        sequence: 1,
        operationId: id,
        rootHash: null,
        rootRevision: 0,
        content,
        premise,
        worldReferences: campaignOptions.worlds,
        ...(defaultRules ? { ruleReference: defaultRules } : {}),
        campaignSettings: {
          mechanics: campaignOptions.mechanics,
          locked: campaignOptions.locked,
          pace: campaignOptions.pace,
          risk: 'nonlethal',
        },
        timeDefinition: campaignOptions.time,
        ...(character ? { character } : {}),
      });
      if (startManifest && requestedCampaignOptions.startPackage) {
        const instantiated = await instantiateStartPackage(documentStore, {
          startRootHash: requestedCampaignOptions.startPackage.rootHash,
          campaignId: id,
          operationId: id,
          baseRootHash: stagedPassage.rootHash,
          baseRootRevision: stagedPassage.rootRevision,
        });
        stagedPassage = {
          ...stagedPassage,
          rootHash: instantiated.rootHash,
          rootRevision: instantiated.manifest.revision,
        };
      }
    }

    await database.db.transaction(async (tx) => {
      const [candidate] = await tx
        .select()
        .from(generation)
        .where(eq(generation.id, generationId));
      if (!candidate || candidate.ownerId !== ownerId) {
        throw new StoryError('not_found');
      }
      if (candidate.kind === storytellerKind) {
        await startStorytellerCandidate(tx, {
          ownerId,
          storyId: id,
          expectedDraftRevision,
          candidate,
          campaign: campaignOptions,
          ...(stagedPassage ? { stagedPassage } : {}),
          ...(existingPassageContent === undefined
            ? {}
            : { existingPassageContent }),
        });
        return;
      }
      if (requestedCampaignOptions.startPackage) {
        throw new StoryError('invalid', 'start_package_requires_storyteller');
      }
      const artifact = playableOpeningArtifactSchema.safeParse(candidate.input);
      if (!artifact.success) {
        throw new StoryError('invalid');
      }
      const [draft] = await tx
        .select()
        .from(storyDraft)
        .where(
          and(
            eq(storyDraft.id, artifact.data.source.draftId),
            eq(storyDraft.ownerId, ownerId),
          ),
        )
        .for('update');
      if (!draft) {
        throw new StoryError('not_found');
      }
      if (draft.revision !== expectedDraftRevision) {
        throw new StoryError('conflict');
      }
      if (!playableOpeningKinds.has(candidate.kind)) {
        throw new StoryError('conflict');
      }
      if (candidate.state !== 'succeeded') {
        throw new StoryError('conflict');
      }
      if (artifact.data.source.draftRevision !== expectedDraftRevision) {
        throw new StoryError('conflict');
      }
      const [currentOpening] = await tx
        .select({ generationId: draftOpening.generationId })
        .from(draftOpening)
        .where(eq(draftOpening.draftId, draft.id));
      if (currentOpening?.generationId !== generationId) {
        throw new StoryError('conflict');
      }
      const proposal = playableProposalSchema.safeParse(candidate.output);
      if (!proposal.success) {
        throw new StoryError('invalid');
      }
      try {
        validatePlayableResult('opening', proposal.data);
      } catch {
        throw new StoryError('invalid');
      }
      const presentation = playablePresentation(proposal.data);
      if (!presentation.interaction) {
        throw new StoryError('invalid');
      }
      await initializeStoryInTransaction(tx, {
        ownerId,
        storyId: id,
        input: {
          source: playableOpeningStorySource,
          sourceGenerationId: generationId,
          sourceGenerationPart: 'current',
          premise: premiseContentSchema.parse({
            title: draft.title,
            premise: draft.premise,
            storytellingDirection: draft.storytellingDirection,
          }),
          items: [],
          content: presentation.content,
          interaction: presentation.interaction,
        },
        ...(stagedPassage ? { stagedPassage } : {}),
        ...(existingPassageContent === undefined
          ? {}
          : { existingPassageContent }),
      });
    });
  };
}
