import {
  canonicalDocumentSchema,
  canonicalSourcePassageSchema,
  canonicalStructuredDocumentSchema,
  documentManifestSchema,
  worldPackageReferenceSchema,
  rulePackageReferenceSchema,
  hashCanonicalJson,
  type DocumentManifest,
  type DocumentManifestEntry,
  type DocumentStore,
} from '@offscreen/documents';
import { passageContentSchema } from '@offscreen/contracts/stories';
import { campaignStartSchema } from '@offscreen/contracts/campaign';
import { StoryError } from './errors';
import { createHash } from 'node:crypto';
import { premiseContentSchema } from '@offscreen/storyteller/tasks';
import { storyItemsSchema } from '@offscreen/contracts/stories';
import { characterSchema } from '@offscreen/game/state';
import { worldTimeDefinitionSchema } from '@offscreen/game/calendar';
import { z } from 'zod';
import {
  proposedDocumentChangesSchema,
  type ProposedDocumentChange,
} from '@offscreen/storyteller/tasks';

const bootstrapCampaignSettingsSchema = campaignStartSchema
  .pick({ mechanics: true, locked: true, pace: true })
  .extend({ risk: z.literal('nonlethal') });

function stableBootstrapDocumentId(storyId: string, role: string) {
  const bytes = createHash('sha256')
    .update(`offscreen:bootstrap:${storyId}:${role}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type StagedStoryBootstrap = Readonly<{
  baseRootHash: string | null;
  baseRootRevision: number;
  rootHash: string;
  rootRevision: number;
  objectHash: string;
  documentId: string;
}>;

export type StagedStoryPublication = Readonly<{
  baseRootHash: string;
  baseRootRevision: number;
  rootHash: string;
  rootRevision: number;
  requestHash: string;
  passageObjectHash: string;
  passageId: string;
}>;

function stablePublicationDocumentId(operationId: string, index: number) {
  return stableBootstrapDocumentId(operationId, `document-change-${index}`);
}

export function publicationPassageId(operationId: string) {
  return stableBootstrapDocumentId(operationId, 'published-passage');
}

export async function stageStoryPublicationDocuments(args: {
  storage: DocumentStore;
  storyId: string;
  passageId: string;
  sequence: number;
  operationId: string;
  rootHash: string;
  rootRevision: number;
  content: unknown;
  changes: readonly ProposedDocumentChange[];
}) {
  const content = passageContentSchema.parse(args.content);
  const changes = proposedDocumentChangesSchema.parse(args.changes);
  const current = await args.storage.readManifest(args.rootHash);
  if (
    current.campaignId !== args.storyId ||
    current.revision !== args.rootRevision
  ) {
    throw new StoryError('conflict', 'document_root');
  }
  const passage = canonicalSourcePassageSchema.parse({
    format: 'offscreen.source-passage.v1',
    envelope: {
      documentId: args.passageId,
      kind: 'source-passage',
      schemaVersion: 1,
      revision: 1,
      authority: 'source',
      visibility: 'player-known',
      sources: [],
      coverage: { fromSequence: args.sequence, throughSequence: args.sequence },
    },
    content,
  });
  const passageObjectHash = await args.storage.putSourcePassage(passage);
  const entries = new Map(
    current.entries.map((entry) => [entry.documentId, entry]),
  );
  entries.set(args.passageId, {
    documentId: args.passageId,
    revision: 1,
    path: `sources/passages/passage-${String(args.sequence).padStart(8, '0')}-${args.passageId}.md`,
    objectHash: passageObjectHash,
    kind: 'source-passage',
    authority: 'source',
    visibility: 'player-known',
  });
  for (const [index, change] of changes.entries()) {
    const existing =
      change.operation === 'revise'
        ? entries.get(change.documentId)
        : undefined;
    if (
      change.operation === 'revise' &&
      (!existing || existing.revision !== change.expectedRevision)
    ) {
      throw new StoryError('conflict', 'document_revision');
    }
    const documentId =
      change.operation === 'revise'
        ? change.documentId
        : stablePublicationDocumentId(args.operationId, index);
    const pathOwner = [...entries.values()].find(
      (entry) => entry.path === change.path && entry.documentId !== documentId,
    );
    if (pathOwner) throw new StoryError('conflict', 'document_path');
    const revision = existing ? existing.revision + 1 : 1;
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        kind: change.kind,
        schemaVersion: 1,
        revision,
        authority: change.authority,
        visibility: change.visibility,
        sources: [{ documentId: args.passageId, revision: 1 }],
      },
      title: change.title,
      body: change.body,
    });
    entries.set(documentId, {
      documentId,
      revision,
      path: change.path,
      objectHash: await args.storage.putDocument(document),
      kind: change.kind,
      authority: change.authority,
      visibility: change.visibility,
    });
  }
  const nextEntries = [...entries.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  if (
    new Set(nextEntries.map((entry) => entry.path)).size !== nextEntries.length
  ) {
    throw new StoryError('conflict', 'document_path');
  }
  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: args.storyId,
    revision: current.revision + 1,
    previousRootHash: args.rootHash,
    authorOperationId: args.operationId,
    entries: nextEntries,
  });
  const rootHash = await args.storage.putManifest(manifest);
  return {
    baseRootHash: args.rootHash,
    baseRootRevision: args.rootRevision,
    rootHash,
    rootRevision: manifest.revision,
    requestHash: hashCanonicalJson({
      storyId: args.storyId,
      sequence: args.sequence,
      passageId: args.passageId,
      content,
      changes,
    }),
    passageObjectHash,
    passageId: args.passageId,
  } satisfies StagedStoryPublication;
}

export async function stageStoryBootstrapDocuments(args: {
  storage: DocumentStore;
  storyId: string;
  passageId: string;
  sequence: number;
  operationId: string;
  rootHash: string | null;
  rootRevision: number;
  content: unknown;
  premise?: unknown;
  items?: unknown;
  character?: unknown;
  worldReferences?: unknown;
  ruleReference?: unknown;
  campaignSettings?: unknown;
  timeDefinition?: unknown;
}) {
  const content = passageContentSchema.parse(args.content);
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
  if (
    current.campaignId !== args.storyId ||
    current.revision !== args.rootRevision
  ) {
    throw new StoryError('conflict', 'document_root');
  }
  const path = `sources/passages/passage-${String(args.sequence).padStart(8, '0')}-${args.passageId}.md`;
  if (
    current.entries.some(
      (entry) => entry.documentId === args.passageId || entry.path === path,
    )
  ) {
    throw new StoryError('conflict', 'passage_document_identity');
  }
  const passage = canonicalSourcePassageSchema.parse({
    format: 'offscreen.source-passage.v1',
    envelope: {
      documentId: args.passageId,
      kind: 'source-passage',
      schemaVersion: 1,
      revision: 1,
      authority: 'source',
      visibility: 'player-known',
      sources: [],
      coverage: {
        fromSequence: args.sequence,
        throughSequence: args.sequence,
      },
    },
    content,
  });
  const objectHash = await args.storage.putSourcePassage(passage);
  const entries: DocumentManifestEntry[] = [
    ...current.entries,
    {
      documentId: args.passageId,
      revision: 1,
      path,
      objectHash,
      kind: 'source-passage' as const,
      authority: 'source' as const,
      visibility: 'player-known' as const,
    },
  ];
  const sources = [{ documentId: args.passageId, revision: 1 }];
  if (args.premise != null) {
    const premise = premiseContentSchema.parse(args.premise);
    const documentId = stableBootstrapDocumentId(args.storyId, 'premise');
    const document = canonicalDocumentSchema.parse({
      format: 'offscreen.document.v1',
      envelope: {
        documentId,
        kind: 'premise',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'player-known',
        sources: [],
      },
      title: premise.title.trim() || 'Campaign premise',
      body: [premise.premise, premise.storytellingDirection]
        .filter((part) => part.trim())
        .join('\n\n## Storytelling direction\n\n'),
    });
    entries.push({
      documentId,
      revision: 1,
      path: 'premise.md',
      objectHash: await args.storage.putDocument(document),
      kind: 'premise',
      authority: 'canon',
      visibility: 'player-known',
    });
    sources.push({ documentId, revision: 1 });
  }
  const items = storyItemsSchema.parse(args.items ?? []);
  if (items.length) {
    const documentId = stableBootstrapDocumentId(args.storyId, 'story-items');
    const document = canonicalStructuredDocumentSchema.parse({
      format: 'offscreen.structured-document.v1',
      envelope: {
        documentId,
        kind: 'inventory',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'player-known',
        sources,
      },
      schemaId: 'story-items.v1',
      data: { version: 1, items },
    });
    entries.push({
      documentId,
      revision: 1,
      path: 'state/story-items.json',
      objectHash: await args.storage.putStructuredDocument(document),
      kind: 'inventory',
      authority: 'canon',
      visibility: 'player-known',
    });
  }
  if (args.character != null) {
    const character = characterSchema.parse(args.character);
    const documentId = stableBootstrapDocumentId(
      args.storyId,
      'player-character',
    );
    const document = canonicalStructuredDocumentSchema.parse({
      format: 'offscreen.structured-document.v1',
      envelope: {
        documentId,
        kind: 'character',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'player-known',
        sources,
      },
      schemaId: 'character.v1',
      data: { version: 1, role: 'player-character', character },
    });
    entries.push({
      documentId,
      revision: 1,
      path: 'identities/characters/player-character.json',
      objectHash: await args.storage.putStructuredDocument(document),
      kind: 'character',
      authority: 'canon',
      visibility: 'player-known',
    });
  }
  const worldReferences = z
    .array(worldPackageReferenceSchema)
    .max(8)
    .parse(args.worldReferences ?? []);
  if (
    new Set(worldReferences.map((reference) => reference.mount)).size !==
    worldReferences.length
  ) {
    throw new StoryError('invalid', 'duplicate_world_mount');
  }
  if (worldReferences.length) {
    const documentId = stableBootstrapDocumentId(
      args.storyId,
      'world-references',
    );
    const document = canonicalStructuredDocumentSchema.parse({
      format: 'offscreen.structured-document.v1',
      envelope: {
        documentId,
        kind: 'world-reference',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'storyteller-private',
        sources: [],
      },
      schemaId: 'world-references.v1',
      data: { version: 1, worlds: worldReferences },
    });
    entries.push({
      documentId,
      revision: 1,
      path: 'world/references.json',
      objectHash: await args.storage.putStructuredDocument(document),
      kind: 'world-reference',
      authority: 'canon',
      visibility: 'storyteller-private',
    });
  }
  if (args.ruleReference != null) {
    const ruleReference = rulePackageReferenceSchema.parse(args.ruleReference);
    const documentId = stableBootstrapDocumentId(
      args.storyId,
      'rule-reference',
    );
    const document = canonicalStructuredDocumentSchema.parse({
      format: 'offscreen.structured-document.v1',
      envelope: {
        documentId,
        kind: 'rule-reference',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'storyteller-private',
        sources: [],
      },
      schemaId: 'rule-reference.v1',
      data: { version: 1, rules: ruleReference },
    });
    entries.push({
      documentId,
      revision: 1,
      path: 'rules/reference.json',
      objectHash: await args.storage.putStructuredDocument(document),
      kind: 'rule-reference',
      authority: 'canon',
      visibility: 'storyteller-private',
    });
  }
  if (args.campaignSettings != null) {
    const documentId = stableBootstrapDocumentId(
      args.storyId,
      'campaign-settings',
    );
    const document = canonicalStructuredDocumentSchema.parse({
      format: 'offscreen.structured-document.v1',
      envelope: {
        documentId,
        kind: 'campaign-settings',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'storyteller-private',
        sources: [],
      },
      schemaId: 'campaign-settings.v1',
      data: {
        version: 1,
        settings: bootstrapCampaignSettingsSchema.parse(args.campaignSettings),
      },
    });
    entries.push({
      documentId,
      revision: 1,
      path: 'settings/campaign.json',
      objectHash: await args.storage.putStructuredDocument(document),
      kind: 'campaign-settings',
      authority: 'canon',
      visibility: 'storyteller-private',
    });
  }
  if (args.timeDefinition != null) {
    const documentId = stableBootstrapDocumentId(
      args.storyId,
      'time-definition',
    );
    const document = canonicalStructuredDocumentSchema.parse({
      format: 'offscreen.structured-document.v1',
      envelope: {
        documentId,
        kind: 'time-definition',
        schemaVersion: 1,
        revision: 1,
        authority: 'canon',
        visibility: 'storyteller-private',
        sources: [],
      },
      schemaId: 'time-definition.v1',
      data: {
        version: 1,
        definition: worldTimeDefinitionSchema.parse(args.timeDefinition),
      },
    });
    entries.push({
      documentId,
      revision: 1,
      path: 'time/definition.json',
      objectHash: await args.storage.putStructuredDocument(document),
      kind: 'time-definition',
      authority: 'canon',
      visibility: 'storyteller-private',
    });
  }
  const orientationId = stableBootstrapDocumentId(args.storyId, 'orientation');
  const orientation = canonicalDocumentSchema.parse({
    format: 'offscreen.document.v1',
    envelope: {
      documentId: orientationId,
      kind: 'orientation',
      schemaVersion: 1,
      revision: 1,
      authority: 'projection',
      visibility: 'storyteller-private',
      sources,
    },
    title: 'Campaign orientation',
    body: `Current entry point: ${content.title}\n\nConsult the linked premise when present and the exact opening source passage before continuing this campaign.`,
  });
  entries.push({
    documentId: orientationId,
    revision: 1,
    path: 'START.md',
    objectHash: await args.storage.putDocument(orientation),
    kind: 'orientation',
    authority: 'projection',
    visibility: 'storyteller-private',
  });
  const manifest = documentManifestSchema.parse({
    format: 'offscreen.manifest.v1',
    campaignId: args.storyId,
    revision: current.revision + 1,
    previousRootHash: args.rootHash,
    authorOperationId: args.operationId,
    entries: entries.sort((left, right) => left.path.localeCompare(right.path)),
  });
  const rootHash = await args.storage.putManifest(manifest);
  return {
    baseRootHash: args.rootHash,
    baseRootRevision: args.rootRevision,
    rootHash,
    rootRevision: manifest.revision,
    objectHash,
    documentId: args.passageId,
  } satisfies StagedStoryBootstrap;
}

export async function readPassageDocument(
  storage: DocumentStore,
  objectHash: string,
) {
  const passage = await storage.readSourcePassage(objectHash);
  return passageContentSchema.parse(passage.content);
}
