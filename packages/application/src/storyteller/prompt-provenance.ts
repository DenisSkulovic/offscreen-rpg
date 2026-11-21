import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { storytellerPromptProvenance } from '@offscreen/db/storyteller-schema';
import {
  storytellerPromptComponentCatalogueV1,
  type StorytellerTask,
} from '@offscreen/storyteller/tasks';
import type { Transaction } from '@offscreen/db/outbox';
import type { Database } from '@offscreen/db';

const sha256 = z.string().regex(/^[0-9a-f]{64}$/);

export const promptProvenanceManifestV1Schema = z.strictObject({
  version: z.literal('prompt-provenance.v1'),
  generationId: z.uuid(),
  sourceKind: z.enum(['consequence', 'pending-consequence']),
  compilerBuildId: z.string().min(1).max(120),
  promptVersion: z.literal('storyteller.v17'),
  taskInputSha256: sha256,
  compiledRequestSha256: sha256,
  schemaVersion: z.literal(17),
  captureStatus: z.enum(['ready', 'promoted']),
  components: z
    .array(
      z.strictObject({
        stableComponentKey: z.string().min(1).max(80),
        purpose: z.string().min(1).max(40),
        originKind: z.enum(['code-constant', 'profile', 'task-request']),
        originSourceId: z.string().min(1).max(240),
        contentSha256: sha256,
        included: z.boolean(),
        reasonCode: z.string().min(1).max(80).nullable(),
      }),
    )
    .max(32),
  effectiveSettings: z.strictObject({
    profileId: z.string().min(1).max(120),
    profileRevision: z.number().int().positive(),
    profileContentSha256: sha256,
    capturedExecutionMode: z.enum(['scripted', 'provider']),
    capturedExecutionSha256: sha256,
  }),
  sourceDecisions: z
    .array(
      z.strictObject({
        sourceKind: z.enum([
          'campaign-document',
          'passage',
          'canonical-root',
        ]),
        sourceHandle: z.string().min(1).max(80).nullable(),
        sourceId: z.string().min(1).max(80).nullable(),
        status: z.enum([
          'selected',
          'loaded',
          'included',
          'omitted',
          'required',
          'pinned',
          'not-evaluated',
        ]),
        reasonCode: z.string().min(1).max(80).nullable(),
        capturedRootHash: sha256.nullable(),
      }),
    )
    .max(128),
  coverage: z.strictObject({
    stagesRecorded: z.array(z.string().min(1).max(80)).max(32),
    missingStages: z.array(z.string().min(1).max(80)).max(32),
    exactRequestComparison: z.literal('sidecar-additive'),
  }),
});

export type PromptProvenanceManifestV1 = z.infer<
  typeof promptProvenanceManifestV1Schema
>;

function hashJson(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(value), 'utf8')
    .digest('hex');
}

export function hashStorytellerTaskInput(task: StorytellerTask) {
  return hashJson({
    task: task.task,
    source: task.source,
    profile: task.profile,
    execution: task.execution,
    context: task.context,
    contextManifest: task.contextManifest,
    resources: task.resources,
    inputVersion: task.inputVersion,
    promptVersion: task.promptVersion,
  });
}

export function hashCompiledRequest(task: StorytellerTask) {
  return hashJson(task.request);
}

/**
 * Build redacted consequence provenance from an already-compiled task.
 * Sidecar only: does not mutate task/request bytes.
 */
export function buildConsequencePromptProvenance(input: {
  generationId: string;
  task: StorytellerTask;
  captureStatus?: 'ready' | 'promoted';
  compilerBuildId?: string;
}): PromptProvenanceManifestV1 {
  const task = input.task;
  if (task.task !== 'consequence' && task.task !== 'pending-consequence') {
    throw new Error('prompt_provenance_purpose_unsupported');
  }
  const taskInputSha256 = hashStorytellerTaskInput(task);
  const compiledRequestSha256 = hashCompiledRequest(task);
  const components: PromptProvenanceManifestV1['components'] = [
    ...storytellerPromptComponentCatalogueV1.map((entry) => {
      const included = (entry.includedForTasks as readonly string[]).includes(
        task.task,
      );
      return {
        stableComponentKey: entry.stableComponentKey,
        purpose: entry.purpose,
        originKind: 'code-constant' as const,
        originSourceId: entry.originSourceId,
        contentSha256: entry.contentSha256,
        included,
        reasonCode: included ? null : 'task-branch-omitted',
      };
    }),
    {
      stableComponentKey: 'user/profile',
      purpose: 'profile',
      originKind: 'profile',
      originSourceId: `${task.profile.id}@${task.profile.revision}`,
      contentSha256: hashJson(task.profile),
      included: true,
      reasonCode: null,
    },
    {
      stableComponentKey: 'user/task-request',
      purpose: 'compiled-request',
      originKind: 'task-request',
      originSourceId: `generation:${input.generationId}`,
      contentSha256: compiledRequestSha256,
      included: true,
      reasonCode: null,
    },
  ];

  const sourceDecisions: PromptProvenanceManifestV1['sourceDecisions'] = [];
  const knowledge = task.context.canonicalKnowledge;
  if (knowledge) {
    sourceDecisions.push({
      sourceKind: 'canonical-root',
      sourceHandle: null,
      sourceId: null,
      status: 'pinned',
      reasonCode: null,
      capturedRootHash: knowledge.rootHash,
    });
    for (const entry of knowledge.catalogue) {
      sourceDecisions.push({
        sourceKind: 'campaign-document',
        sourceHandle: entry.handle,
        sourceId: entry.documentId,
        status: entry.loaded
          ? 'loaded'
          : knowledge.documentSelection.requestedDocumentIds.includes(
                entry.documentId,
              )
            ? 'selected'
            : 'not-evaluated',
        reasonCode: entry.bodyInspected ? null : 'catalogue-metadata-only',
        capturedRootHash: knowledge.rootHash,
      });
    }
    for (const omitted of knowledge.documentSelection.omitted) {
      sourceDecisions.push({
        sourceKind: 'campaign-document',
        sourceHandle: null,
        sourceId: omitted.documentId,
        status: 'omitted',
        reasonCode: omitted.reason,
        capturedRootHash: knowledge.rootHash,
      });
    }
  }
  for (const sequence of task.contextManifest.omittedSequences) {
    sourceDecisions.push({
      sourceKind: 'passage',
      sourceHandle: `p${sequence}`,
      sourceId: null,
      status: 'omitted',
      reasonCode: 'context-bound-omitted',
      capturedRootHash: knowledge?.rootHash ?? null,
    });
  }
  for (const handle of task.contextManifest.activeScene?.requiredHandles ??
    []) {
    sourceDecisions.push({
      sourceKind: 'passage',
      sourceHandle: handle,
      sourceId: null,
      status: 'required',
      reasonCode: null,
      capturedRootHash: knowledge?.rootHash ?? null,
    });
  }

  return promptProvenanceManifestV1Schema.parse({
    version: 'prompt-provenance.v1',
    generationId: input.generationId,
    sourceKind: task.task,
    compilerBuildId:
      input.compilerBuildId ?? process.env['OFFSCREEN_BUILD_ID'] ?? 'local-dev',
    promptVersion: 'storyteller.v17',
    taskInputSha256,
    compiledRequestSha256,
    schemaVersion: 17,
    captureStatus: input.captureStatus ?? 'promoted',
    components,
    effectiveSettings: {
      profileId: task.profile.id,
      profileRevision: task.profile.revision,
      profileContentSha256: hashJson(task.profile),
      capturedExecutionMode: task.execution.mode,
      capturedExecutionSha256: hashJson(task.execution),
    },
    sourceDecisions,
    coverage: {
      stagesRecorded: [
        'components',
        'effectiveSettings',
        'sourceDecisions',
      ],
      missingStages: knowledge
        ? []
        : ['canonical-catalogue-unobserved'],
      exactRequestComparison: 'sidecar-additive',
    },
  });
}

export async function persistPromptProvenance(
  tx: Transaction,
  input: {
    generationId: string;
    task: StorytellerTask;
    captureStatus?: 'ready' | 'promoted';
  },
) {
  if (input.task.task !== 'consequence' && input.task.task !== 'pending-consequence') {
    return null;
  }
  const manifest = buildConsequencePromptProvenance({
    generationId: input.generationId,
    task: input.task,
    ...(input.captureStatus ? { captureStatus: input.captureStatus } : {}),
  });
  await tx
    .insert(storytellerPromptProvenance)
    .values({
      generationId: input.generationId,
      taskInputSha256: manifest.taskInputSha256,
      compiledRequestSha256: manifest.compiledRequestSha256,
      manifest,
    })
    .onConflictDoNothing({
      target: storytellerPromptProvenance.generationId,
    });
  return manifest;
}

export async function readPromptProvenance(
  database: Database,
  generationId: string,
) {
  const [row] = await database.db
    .select()
    .from(storytellerPromptProvenance)
    .where(eq(storytellerPromptProvenance.generationId, generationId));
  if (!row) return null;
  return {
    ...row,
    manifest: promptProvenanceManifestV1Schema.parse(row.manifest),
  };
}
