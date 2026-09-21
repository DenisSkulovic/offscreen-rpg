import {
  campaign,
  campaignSettings,
  gameActivity,
} from '@offscreen/db/campaign-schema';
import { interactionSubmissionSchema } from '@offscreen/contracts/interactions';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { storyItem, storyPassage } from '@offscreen/db/story-schema';
import {
  canonicalKnowledgeSchema,
  contextInputSchema,
} from '@offscreen/storyteller/context';
import { continuityNotesSchema } from '@offscreen/storyteller/context';
import { campaignSettingsSchema } from '@offscreen/contracts/campaign';
import { projectWorldTime } from '@offscreen/game/calendar';
import { worldConditionsSchema } from '@offscreen/game/world-obligations';
import type { Transaction } from '../outbox/index';
import {
  activityProgressSchema,
  resolvedActivityPlanSchema,
} from '@offscreen/game/activities';
import { situationAuthorizationSchema } from '@offscreen/game/immediate-actions';
import { readAcceptedActivityPlan } from '../campaign/accepted-plans';
import { z } from 'zod';
import {
  rulePackageReferenceSchema,
  selectCompleteMarkdownSection,
  worldPackageReferenceSchema,
  type DocumentManifest,
  type DocumentStore,
  type RulePackageManifest,
  type WorldPackageManifest,
} from '@offscreen/documents';
import { readPassageDocument } from '../stories/passage-documents';
import {
  canonicalKnowledgeKinds,
  canonicalKnowledgePriority,
  resolveCanonicalRecallCues,
  type CanonicalRecallCue,
} from './canonical-search';
const maximumCanonicalCatalogueEntries = 64;
const maximumCanonicalDocuments = 8;
const maximumCanonicalDocumentBytes = 4 * 1024;
const maximumCanonicalContextBytes = 12 * 1024;
const maximumLibraryCatalogueEntries = 64;
const maximumLibraryOrientationBytes = 4 * 1024;
const maximumLibraryContextBytes = 8 * 1024;
const maximumLibrarySectionReads = 4;
const maximumLibrarySectionBytes = 4 * 1024;
const maximumSelectedLibrarySectionBytes = 8 * 1024;
const maximumSelectedCampaignDocuments = 4;

const librarySectionHandleSchema = z
  .string()
  .regex(/^k[1-9][0-9]*\.s[1-9][0-9]*$/);
const librarySectionSelectionSchema = z.strictObject({
  handles: z.array(librarySectionHandleSchema).max(8),
  ruleTopics: z
    .array(z.string().regex(/^[a-z][a-z0-9-]{0,79}$/))
    .max(8),
  maxReads: z.number().int().min(0).max(maximumLibrarySectionReads),
  maxBytes: z
    .number()
    .int()
    .min(0)
    .max(maximumSelectedLibrarySectionBytes),
});
export type CanonicalLibrarySectionSelection = z.infer<
  typeof librarySectionSelectionSchema
>;
const campaignDocumentSelectionSchema = z
  .array(z.uuid())
  .max(maximumSelectedCampaignDocuments)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Selected campaign document identities must be unique',
  });
export type CanonicalCampaignDocumentSelection = z.infer<
  typeof campaignDocumentSelectionSchema
>;

const activeSceneAnchorSchema = z.strictObject({
  version: z.literal('active-scene-anchor.v1'),
  fromSequence: z.number().int().positive(),
  requiredPassageIds: z.array(z.uuid()).max(40),
  recallCues: z
    .array(
      z.strictObject({
        documentId: z.uuid(),
        reason: z.enum(['identity', 'place', 'thread']),
      }),
    )
    .max(8)
    .default([]),
});

function projectActivityProgress(plan: unknown, progress: unknown) {
  const resolved = resolvedActivityPlanSchema.parse(plan);
  const stored = activityProgressSchema.parse(progress).process;
  if (resolved.action.process.kind === 'contribution.v1') {
    if (stored.kind !== 'contribution.v1') {
      throw new Error('Stored activity progress does not match its rule');
    }
    return {
      action: resolved.action,
      progress: {
        kind: 'contribution' as const,
        label: resolved.action.process.progressLabel,
        earned: stored.earned,
        required: resolved.action.process.requiredContribution,
      },
    };
  }
  if (stored.kind !== 'clock-wait.v1') {
    throw new Error('Stored activity progress does not match its rule');
  }
  return {
    action: resolved.action,
    progress: {
      kind: 'wait' as const,
      label: resolved.action.process.progressLabel,
      elapsedTicks: stored.elapsedTicks,
      requiredTicks: resolved.action.process.requiredTicks,
    },
  };
}

async function loadCanonicalLibraries(
  storage: DocumentStore,
  campaignManifest: DocumentManifest,
  selectionInput?: CanonicalLibrarySectionSelection,
) {
  const selection = librarySectionSelectionSchema.parse(
    selectionInput ?? {
      handles: [],
      ruleTopics: [],
      maxReads: 0,
      maxBytes: 0,
    },
  );
  if (new Set(selection.handles).size !== selection.handles.length) {
    throw new Error('Canonical library section handles must be unique');
  }
  const worldReferenceEntry = campaignManifest.entries.find(
    (entry) => entry.path === 'world/references.json',
  );
  const ruleReferenceEntry = campaignManifest.entries.find(
    (entry) => entry.path === 'rules/reference.json',
  );
  const worlds = worldReferenceEntry
    ? z
        .strictObject({
          version: z.literal(1),
          worlds: z.array(worldPackageReferenceSchema).max(8),
        })
        .parse(
          (
            await storage.readStructuredDocument(
              worldReferenceEntry.objectHash,
            )
          ).data,
        ).worlds
    : [];
  const rules = ruleReferenceEntry
    ? z
        .strictObject({
          version: z.literal(1),
          rules: rulePackageReferenceSchema,
        })
        .parse(
          (
            await storage.readStructuredDocument(ruleReferenceEntry.objectHash)
          ).data,
        ).rules
    : null;
  const sources = [
    ...worlds
      .sort((left, right) => left.mount.localeCompare(right.mount))
      .map((reference) => ({ kind: 'world' as const, reference })),
    ...(rules ? [{ kind: 'rules' as const, reference: rules }] : []),
  ];
  const libraries = [];
  let catalogueEntries = 0;
  let orientationBytes = 0;
  let documentHandle = 0;
  const sectionRecords = new Map<
    string,
    {
      handle: string;
      documentHandle: string;
      heading: string;
      line: number;
      entry: (WorldPackageManifest | RulePackageManifest)['entries'][number];
      title: string;
      body: string;
    }
  >();
  for (const [libraryIndex, source] of sources.entries()) {
    let manifest: WorldPackageManifest | RulePackageManifest;
    if (source.kind === 'world') {
      manifest = await storage.readWorldPackageManifest(
        source.reference.rootHash,
      );
      if (
        manifest.worldId !== source.reference.worldId ||
        manifest.revision !== source.reference.revision
      ) {
        throw new Error('Canonical world reference does not match its package');
      }
    } else {
      manifest = await storage.readRulePackageManifest(
        source.reference.rootHash,
      );
      if (
        manifest.ruleSetId !== source.reference.ruleSetId ||
        manifest.revision !== source.reference.revision
      ) {
        throw new Error('Canonical rule reference does not match its package');
      }
    }
    const remaining = maximumLibraryCatalogueEntries - catalogueEntries;
    const orderedEntries = [...manifest.entries].sort((left, right) => {
      if (left.documentId === manifest.orientationDocumentId) return -1;
      if (right.documentId === manifest.orientationDocumentId) return 1;
      return left.path.localeCompare(right.path);
    });
    const selectedEntries = orderedEntries.slice(0, Math.max(0, remaining));
    const catalogue = [];
    for (const entry of selectedEntries) {
      const handle = `k${++documentHandle}`;
      const document = await storage.readDocument(entry.objectHash);
      if (
        document.envelope.documentId !== entry.documentId ||
        document.envelope.revision !== entry.revision ||
        document.envelope.kind !== entry.kind ||
        document.envelope.authority !== entry.authority ||
        document.envelope.visibility !== entry.visibility
      ) {
        throw new Error('Canonical library document does not match manifest');
      }
      const sections = entry.sections.slice(0, 12).map((section, index) => {
        const sectionHandle = `${handle}.s${index + 1}`;
        sectionRecords.set(sectionHandle, {
          handle: sectionHandle,
          documentHandle: handle,
          heading: section.heading,
          line: section.line,
          entry,
          title: document.title,
          body: document.body,
        });
        return {
          handle: sectionHandle,
          heading: section.heading,
          level: section.level,
          line: section.line,
          topics:
            'topics' in section && Array.isArray(section.topics)
              ? section.topics.slice(0, 16)
              : [],
        };
      });
      catalogue.push({
        handle,
        path: entry.path,
        kind: entry.kind,
        sourceBytes: entry.sourceBytes,
        sections,
        topics: 'topics' in entry ? entry.topics.slice(0, 16) : [],
        loaded: false,
        documentId: entry.documentId,
        documentRevision: entry.revision,
        documentKind: entry.kind,
        documentAuthority: entry.authority,
        documentVisibility: entry.visibility,
        objectHash: entry.objectHash,
      });
    }
    catalogueEntries += catalogue.length;
    const orientationEntry = catalogue.find(
      (entry) => entry.documentId === manifest.orientationDocumentId,
    );
    let orientation:
      | { documentHandle: string; title: string; body: string }
      | undefined;
    if (orientationEntry) {
      const document = await storage.readDocument(orientationEntry.objectHash);
      const bytes = Buffer.byteLength(document.body, 'utf8');
      if (
        bytes <= maximumLibraryOrientationBytes &&
        orientationBytes + bytes <= maximumLibraryContextBytes
      ) {
        orientationBytes += bytes;
        orientationEntry.loaded = true;
        orientation = {
          documentHandle: orientationEntry.handle,
          title: document.title,
          body: document.body,
        };
      }
    }
    libraries.push({
      handle: `l${libraryIndex + 1}`,
      kind: source.kind,
      title: manifest.title,
      ...(source.kind === 'world'
        ? { mount: source.reference.mount }
        : {}),
      rootHash: source.reference.rootHash,
      revision: source.reference.revision,
      catalogue: catalogue.map(
        ({
          documentId: _documentId,
          documentRevision: _documentRevision,
          documentKind: _documentKind,
          documentAuthority: _documentAuthority,
          documentVisibility: _documentVisibility,
          objectHash: _objectHash,
          ...entry
        }) => entry,
      ),
      catalogueTruncated: selectedEntries.length < orderedEntries.length,
      ...(orientation ? { orientation } : {}),
      selectedSections: [] as Array<{
        handle: string;
        documentHandle: string;
        title: string;
        heading: string;
        body: string;
        bytes: number;
      }>,
    });
  }
  for (const handle of selection.handles) {
    if (!sectionRecords.has(handle)) {
      throw new Error(`Unknown canonical library section handle: ${handle}`);
    }
  }
  const matchedTopics = new Set<string>();
  const topicHandles = libraries
    .filter((library) => library.kind === 'rules')
    .flatMap((library) =>
      library.catalogue.flatMap((entry) => {
        const entryTopics = new Set([
          ...entry.topics,
          ...entry.sections.flatMap((section) => section.topics),
        ]);
        const matches = selection.ruleTopics.filter((topic) =>
          entryTopics.has(topic),
        );
        if (!matches.length || !entry.sections[0]) {
          return [];
        }
        for (const topic of matches) {
          matchedTopics.add(topic);
        }
        // The first heading is the page root in imported rule packages, so one
        // complete subtree supplies the document without overlapping subreads.
        return [entry.sections[0].handle];
      }),
    );
  const requestedHandles = [
    ...new Set([...selection.handles, ...topicHandles]),
  ].slice(0, 8);
  let usedReads = 0;
  let usedBytes = 0;
  const loadedHandles: string[] = [];
  const omitted: Array<{
    handle: string;
    reason:
      | 'read-limit'
      | 'byte-limit'
      | 'section-too-large'
      | 'request-limit';
    bytes: number;
  }> = [];
  for (const handle of requestedHandles) {
    const record = sectionRecords.get(handle)!;
    const content = selectCompleteMarkdownSection(
      record.body,
      record.entry.sections,
      record.line,
    );
    const bytes = Buffer.byteLength(content, 'utf8');
    let reason: (typeof omitted)[number]['reason'] | null = null;
    if (bytes > maximumLibrarySectionBytes) {
      reason = 'section-too-large';
    } else if (usedReads >= selection.maxReads) {
      reason = 'read-limit';
    } else if (usedBytes + bytes > selection.maxBytes) {
      reason = 'byte-limit';
    }
    if (reason) {
      omitted.push({ handle, reason, bytes });
      continue;
    }
    const library = libraries.find((candidate) =>
      candidate.catalogue.some((entry) => entry.handle === record.documentHandle),
    );
    if (!library) {
      throw new Error('Canonical library section lost its package');
    }
    library.selectedSections.push({
      handle,
      documentHandle: record.documentHandle,
      title: record.title,
      heading: record.heading,
      body: content,
      bytes,
    });
    const catalogueEntry = library.catalogue.find(
      (entry) => entry.handle === record.documentHandle,
    );
    if (catalogueEntry) {
      catalogueEntry.loaded = true;
    }
    usedReads += 1;
    usedBytes += bytes;
    loadedHandles.push(handle);
  }
  return {
    libraries,
    selection: {
      requestedTopics: selection.ruleTopics,
      unmatchedTopics: selection.ruleTopics.filter(
        (topic) => !matchedTopics.has(topic),
      ),
      requestedHandles,
      loadedHandles,
      omitted,
      maxReads: selection.maxReads,
      maxBytes: selection.maxBytes,
      usedReads,
      usedBytes,
    },
  };
}

/**
 * Captures current descriptive campaign knowledge for a one-shot task. Complete
 * bodies are optional; catalogue metadata is retained when a body exceeds the
 * recipe budget so omission cannot masquerade as absence.
 */
export async function loadCanonicalKnowledge(
  storage: DocumentStore,
  input: {
    storyId: string;
    rootHash: string;
    rootRevision: number;
    librarySectionSelection?: CanonicalLibrarySectionSelection;
    campaignDocumentIds?: CanonicalCampaignDocumentSelection;
    recallCues?: CanonicalRecallCue[];
  },
) {
  const manifest = await storage.readManifest(input.rootHash);
  if (
    manifest.campaignId !== input.storyId ||
    manifest.revision !== input.rootRevision
  ) {
    throw new Error('Canonical context root does not match its campaign');
  }
  const eligible = manifest.entries
    .filter(
      (entry) =>
        entry.path.endsWith('.md') &&
        entry.visibility !== 'developer-private' &&
        canonicalKnowledgeKinds.has(entry.kind),
    )
    .sort((left, right) => {
      const priority =
        (canonicalKnowledgePriority.get(left.kind) ?? 99) -
        (canonicalKnowledgePriority.get(right.kind) ?? 99);
      return priority || left.path.localeCompare(right.path);
    });
  const selectedEntries = eligible.slice(0, maximumCanonicalCatalogueEntries);
  const records = await Promise.all(
    selectedEntries.map(async (entry, index) => {
      const document = await storage.readDocument(entry.objectHash);
      if (
        document.envelope.documentId !== entry.documentId ||
        document.envelope.revision !== entry.revision ||
        document.envelope.kind !== entry.kind ||
        document.envelope.authority !== entry.authority ||
        document.envelope.visibility !== entry.visibility
      ) {
        throw new Error(`Canonical context document mismatch: ${entry.path}`);
      }
      return {
        entry,
        document,
        handle: `d${index + 1}`,
        bytes: Buffer.byteLength(document.body, 'utf8'),
      };
    }),
  );
  const ranked = [...records].sort((left, right) => {
    const priority =
      (canonicalKnowledgePriority.get(left.entry.kind) ?? 99) -
      (canonicalKnowledgePriority.get(right.entry.kind) ?? 99);
    return priority || left.entry.path.localeCompare(right.entry.path);
  });
  const selectedCampaignDocumentIds = campaignDocumentSelectionSchema.parse(
    input.campaignDocumentIds ?? [],
  );
  const cueResolution = await resolveCanonicalRecallCues(storage, {
    storyId: input.storyId,
    rootHash: input.rootHash,
    rootRevision: input.rootRevision,
    cues: input.recallCues ?? [],
    excludedDocumentIds: selectedCampaignDocumentIds,
    maxCandidates:
      maximumSelectedCampaignDocuments - selectedCampaignDocumentIds.length,
  });
  const requestedDocumentIds = campaignDocumentSelectionSchema.parse([
    ...new Set([
      ...selectedCampaignDocumentIds,
      ...cueResolution.candidates.map((candidate) => candidate.documentId),
    ]),
  ]);
  const byDocumentId = new Map(
    records.map((record) => [record.entry.documentId, record]),
  );
  const requestedRecords = requestedDocumentIds.map((documentId) => {
    const record = byDocumentId.get(documentId);
    if (!record) {
      throw new Error('Selected campaign document is unavailable');
    }
    return record;
  });
  const requestedSet = new Set(requestedDocumentIds);
  const loadingOrder = [
    ...requestedRecords,
    ...ranked.filter(
      (record) => !requestedSet.has(record.entry.documentId),
    ),
  ];
  const loaded = new Set<string>();
  const documents: Array<{ handle: string; title: string; body: string }> = [];
  const omittedDocuments: Array<{
    documentId: string;
    reason: 'document-too-large' | 'context-limit';
    bytes: number;
  }> = [];
  let loadedBytes = 0;
  for (const record of loadingOrder) {
    if (
      documents.length >= maximumCanonicalDocuments ||
      record.bytes > maximumCanonicalDocumentBytes ||
      loadedBytes + record.bytes > maximumCanonicalContextBytes
    ) {
      if (requestedSet.has(record.entry.documentId)) {
        omittedDocuments.push({
          documentId: record.entry.documentId,
          reason:
            record.bytes > maximumCanonicalDocumentBytes
              ? 'document-too-large'
              : 'context-limit',
          bytes: record.bytes,
        });
      }
      continue;
    }
    loaded.add(record.handle);
    loadedBytes += record.bytes;
    documents.push({
      handle: record.handle,
      title: record.document.title,
      body: record.document.body,
    });
  }
  const canonicalLibraries = await loadCanonicalLibraries(
    storage,
    manifest,
    input.librarySectionSelection,
  );
  return canonicalKnowledgeSchema.parse({
    rootHash: input.rootHash,
    rootRevision: input.rootRevision,
    catalogue: records.map((record) => ({
      handle: record.handle,
      documentId: record.entry.documentId,
      revision: record.entry.revision,
      path: record.entry.path,
      kind: record.entry.kind,
      authority: record.entry.authority,
      visibility: record.entry.visibility,
      title: record.document.title,
      bytes: record.bytes,
      loaded: loaded.has(record.handle),
    })),
    catalogueTruncated: eligible.length > selectedEntries.length,
    documents,
    documentSelection: {
      cueResolution: cueResolution.trace,
      requestedDocumentIds,
      loadedHandles: requestedRecords
        .filter((record) => loaded.has(record.handle))
        .map((record) => record.handle),
      omitted: omittedDocuments,
      maxReads: maximumSelectedCampaignDocuments,
      maxBytes: maximumCanonicalContextBytes,
      usedReads: requestedRecords.filter((record) => loaded.has(record.handle))
        .length,
      usedBytes: requestedRecords
        .filter((record) => loaded.has(record.handle))
        .reduce((total, record) => total + record.bytes, 0),
    },
    libraries: canonicalLibraries.libraries,
    librarySelection: canonicalLibraries.selection,
  });
}

export function canonicalContextDependencies(
  current: {
    documentRootHash: string | null;
    documentRootRevision: number;
  },
  documentStore?: DocumentStore,
  librarySectionSelection?: CanonicalLibrarySectionSelection,
  campaignDocumentIds?: CanonicalCampaignDocumentSelection,
  recallCues?: CanonicalRecallCue[],
) {
  if (!documentStore) {
    return {};
  }
  return {
    documentStore,
    ...(current.documentRootHash
      ? {
          canonical: {
            rootHash: current.documentRootHash,
            rootRevision: current.documentRootRevision,
            ...(librarySectionSelection
              ? { librarySectionSelection }
              : {}),
            ...(campaignDocumentIds ? { campaignDocumentIds } : {}),
            ...(recallCues?.length ? { recallCues } : {}),
          },
        }
      : {}),
  };
}

export function canonicalRuleEvidence(
  ruleTopics: CanonicalLibrarySectionSelection['ruleTopics'],
): CanonicalLibrarySectionSelection {
  return librarySectionSelectionSchema.parse({
    handles: [],
    ruleTopics,
    maxReads: maximumLibrarySectionReads,
    maxBytes: maximumSelectedLibrarySectionBytes,
  });
}

export function canonicalWorldEvidence(
  handles: CanonicalLibrarySectionSelection['handles'],
): CanonicalLibrarySectionSelection {
  return librarySectionSelectionSchema.parse({
    handles,
    ruleTopics: [],
    maxReads: maximumLibrarySectionReads,
    maxBytes: maximumSelectedLibrarySectionBytes,
  });
}

/** Called inside admission while holding the story lock. No uncommitted future is evidence. */
export async function loadStorytellerContext(
  tx: Transaction,
  input: {
    storyId: string;
    revision: number;
    premise: unknown;
    notes: unknown;
    activeSceneScope: unknown;
    selected: { id: string; label: string; intention: string };
    projectTick?: number;
    documentStore?: DocumentStore;
    canonical?: {
      rootHash: string;
      rootRevision: number;
      librarySectionSelection?: CanonicalLibrarySectionSelection;
      campaignDocumentIds?: CanonicalCampaignDocumentSelection;
      recallCues?: CanonicalRecallCue[];
    };
  },
) {
  const notes = continuityNotesSchema.parse(input.notes ?? []);
  const activeScene =
    input.activeSceneScope === null
      ? null
      : activeSceneAnchorSchema.parse(input.activeSceneScope);
  const recentQuery = tx
    .select()
    .from(storyPassage)
    .where(
      and(
        eq(storyPassage.storyId, input.storyId),
        lte(storyPassage.sequence, input.revision),
        ...(activeScene
          ? [gte(storyPassage.sequence, activeScene.fromSequence)]
          : []),
      ),
    )
    .orderBy(desc(storyPassage.sequence));
  const recent = activeScene ? await recentQuery : await recentQuery.limit(7);
  const evidenceIds = [
    ...new Set([
      ...notes.flatMap((note) => note.sources),
      ...(activeScene?.requiredPassageIds ?? []),
    ]),
  ];
  const older = evidenceIds.length
    ? await tx
        .select()
        .from(storyPassage)
        .where(
          and(
            eq(storyPassage.storyId, input.storyId),
            lte(storyPassage.sequence, input.revision),
            inArray(storyPassage.id, evidenceIds),
          ),
        )
    : [];
  const evidence = await Promise.all(
    [
      ...new Map(
      [...recent, ...older].map((passage) => [
        passage.id,
        passage,
      ]),
    ).values(),
    ].map(async (passage) => {
      if (passage.contentDocumentHash !== null && !input.documentStore) {
        throw new Error('Canonical passage context requires document storage');
      }
      return {
        id: passage.id,
        sequence: passage.sequence,
        content: passage.contentDocumentHash
          ? await readPassageDocument(
              input.documentStore!,
              passage.contentDocumentHash,
            )
          : passage.content,
        // The published passage already describes the consequence; retain the accepted response identity as evidence.
        response:
          passage.response === null
            ? null
            : interactionSubmissionSchema.parse(passage.response).answer
                .optionId,
      };
    }),
  );
  const current = evidence.find(
    (passage) => passage.sequence === input.revision,
  );
  if (!current) {
    throw new Error('Missing current story context');
  }
  const items = await tx
    .select({
      key: storyItem.key,
      label: storyItem.label,
      holderKey: storyItem.holderKey,
    })
    .from(storyItem)
    .where(eq(storyItem.storyId, input.storyId));
  const [settingsRow] = await tx
    .select()
    .from(campaign)
    .where(eq(campaign.storyId, input.storyId));
  const [captured] = settingsRow
    ? await tx
        .select({ settings: campaignSettings.settings })
        .from(campaignSettings)
        .where(
          and(
            eq(campaignSettings.storyId, input.storyId),
            eq(campaignSettings.revision, settingsRow.settingsRevision),
          ),
        )
    : [];
  if (settingsRow && !captured) {
    throw new Error('Missing captured campaign settings');
  }
  const acceptedSettings = captured
    ? campaignSettingsSchema.parse(captured.settings)
    : null;
  const compactSettings = acceptedSettings
    ? (({ time: _time, ...settings }) => settings)(acceptedSettings)
    : null;
  const commitments = settingsRow
    ? await tx
        .select()
        .from(gameActivity)
        .where(eq(gameActivity.storyId, input.storyId))
    : [];
  const acceptedPlan = settingsRow
    ? readAcceptedActivityPlan(settingsRow.acceptedActivityPlan)
    : null;
  const blockedEntry = acceptedPlan?.entries[acceptedPlan.cursor];
  const acceptedHandoff =
    acceptedPlan?.state === 'blocked' &&
    blockedEntry?.state === 'blocked' &&
    blockedEntry.activityId === null
      ? {
          id: acceptedPlan.id,
          revision: acceptedPlan.revision,
          horizonTick: acceptedPlan.horizonTick,
          nextEntry: { id: blockedEntry.id, plan: blockedEntry.plan },
        }
      : undefined;
  if (input.canonical && !input.documentStore) {
    throw new Error('Canonical knowledge requires document storage');
  }
  const canonicalKnowledge = input.canonical
    ? await loadCanonicalKnowledge(input.documentStore!, {
        storyId: input.storyId,
        rootHash: input.canonical.rootHash,
        rootRevision: input.canonical.rootRevision,
        ...(input.canonical.librarySectionSelection
          ? {
              librarySectionSelection:
                input.canonical.librarySectionSelection,
            }
          : {}),
        ...(input.canonical.campaignDocumentIds
          ? { campaignDocumentIds: input.canonical.campaignDocumentIds }
          : {}),
        recallCues: [
          ...(activeScene?.recallCues ?? []),
          ...(input.canonical.recallCues ?? []),
        ],
      })
    : undefined;
  const activitySituation = settingsRow
    ? {
        activityAccess: situationAuthorizationSchema.parse(
          settingsRow.situationAuthorization,
        ).activityAccess,
        activeActivityId: settingsRow.activeActivityId,
        ...(acceptedHandoff ? { acceptedPlan: acceptedHandoff } : {}),
        commitments: commitments.flatMap((record) => {
          if (
            ![
              'running',
              'paused',
              'suspended',
              'blocked',
              'encounter',
              'completion-pending',
            ].includes(record.state)
          ) {
            return [];
          }
          const projected = projectActivityProgress(
            record.plan,
            record.progress,
          );
          return [
            {
              activityId: record.id,
              actionId: projected.action.id,
              revision: record.revision,
              state: record.state,
              label: projected.action.label,
              progress: projected.progress,
            },
          ];
        }),
      }
    : undefined;
  return contextInputSchema.parse({
    ...(canonicalKnowledge ? { canonicalKnowledge } : {}),
    ...(activeScene
      ? {
          activeSceneScope: {
            version: 'active-scene.v1',
            fromSequence: activeScene.fromSequence,
            throughSequence: input.revision,
            requiredPassageIds: activeScene.requiredPassageIds,
          },
        }
      : {}),
    ...(activitySituation ? { activitySituation } : {}),
    ...(compactSettings ? { campaignSettings: compactSettings } : {}),
    ...(acceptedSettings && settingsRow
      ? {
          campaignTime: projectWorldTime(
            acceptedSettings.time,
            input.projectTick ?? settingsRow.tick,
          ),
        }
      : {}),
    ...(settingsRow
      ? {
          worldConditions: worldConditionsSchema.parse(
            settingsRow.worldConditions,
          ),
        }
      : {}),
    premise: input.premise,
    current,
    items,
    selected: input.selected,
    notes,
    evidence,
  });
}
