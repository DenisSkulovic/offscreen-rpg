import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  canonicalStructuredDocumentSchema,
  documentManifestSchema,
  type DocumentManifest,
  type DocumentStore,
} from '@offscreen/documents';
import type { campaign } from '@offscreen/db/campaign-schema';
import { StoryError } from '../stories/errors';

const jsonValue = z.json();

export const campaignStateFileSchema = z.strictObject({
  version: z.literal(1),
  settingsRevision: z.number().int().positive(),
  locked: z.boolean(),
  character: jsonValue.nullable(),
  storyFacts: jsonValue,
  activityOccurrences: jsonValue,
  acceptedActivityPlan: jsonValue.nullable(),
  content: jsonValue.nullable(),
  location: z.string().nullable(),
  tick: z.number().int().nonnegative(),
  clock: jsonValue,
  clockAnchorAt: z.iso.datetime(),
  clockPace: jsonValue,
  holds: jsonValue,
  offer: jsonValue.nullable(),
  situationAuthorization: jsonValue,
  activeActivityId: z.uuid().nullable(),
  activeActionOperationId: z.uuid().nullable(),
  worldConditions: jsonValue,
});

export function projectCampaignStateFile(row: typeof campaign.$inferSelect) {
  return campaignStateFileSchema.parse({
    version: 1,
    settingsRevision: row.settingsRevision,
    locked: row.locked === 1,
    character: row.character,
    storyFacts: row.storyFacts,
    activityOccurrences: row.activityOccurrences,
    acceptedActivityPlan: row.acceptedActivityPlan,
    content: row.content,
    location: row.location,
    tick: row.tick,
    clock: row.clock,
    clockAnchorAt: row.clockAnchorAt.toISOString(),
    clockPace: row.clockPace,
    holds: row.holds,
    offer: row.offer,
    situationAuthorization: row.situationAuthorization,
    activeActivityId: row.activeActivityId,
    activeActionOperationId: row.activeActionOperationId,
    worldConditions: row.worldConditions,
  });
}

function stableStateDocumentId(storyId: string) {
  const bytes = createHash('sha256')
    .update(`offscreen:campaign-state:${storyId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] ?? 0) & 0x0f | 0x50;
  bytes[8] = (bytes[8] ?? 0) & 0x3f | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function stageCampaignStateDocument(args: {
  storage: DocumentStore;
  storyId: string;
  operationId: string;
  rootHash: string | null;
  rootRevision: number;
  state: z.infer<typeof campaignStateFileSchema>;
}) {
  const current: DocumentManifest = args.rootHash
    ? await args.storage.readManifest(args.rootHash)
    : documentManifestSchema.parse({
        format: 'offscreen.manifest.v1',
        campaignId: args.storyId,
        revision: 0,
        previousRootHash: null,
        authorOperationId: null,
        entries: [],
      });
  if (current.campaignId !== args.storyId || current.revision !== args.rootRevision)
    throw new StoryError('conflict', 'document_root');
  const documentId = stableStateDocumentId(args.storyId);
  const previous = current.entries.find((entry) => entry.documentId === documentId);
  const revision = (previous?.revision ?? 0) + 1;
  const document = canonicalStructuredDocumentSchema.parse({
    format: 'offscreen.structured-document.v1',
    envelope: {
      documentId,
      kind: 'campaign-state',
      schemaVersion: 1,
      revision,
      authority: 'canon',
      visibility: 'storyteller-private',
      sources: [],
    },
    schemaId: 'campaign-state.v1',
    data: campaignStateFileSchema.parse(args.state),
  });
  const objectHash = await args.storage.putStructuredDocument(document);
  const entry = {
    documentId,
    revision,
    path: 'state/current.json',
    objectHash,
    kind: 'campaign-state' as const,
    authority: 'canon' as const,
    visibility: 'storyteller-private' as const,
  };
  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: args.storyId,
    revision: current.revision + 1,
    previousRootHash: args.rootHash,
    authorOperationId: args.operationId,
    entries: [...current.entries.filter((item) => item.documentId !== documentId), entry]
      .sort((left, right) => left.path.localeCompare(right.path)),
  });
  return {
    documentId,
    objectHash,
    rootHash: await args.storage.putManifest(manifest),
    rootRevision: manifest.revision,
    baseRootHash: args.rootHash,
    baseRootRevision: args.rootRevision,
  };
}
