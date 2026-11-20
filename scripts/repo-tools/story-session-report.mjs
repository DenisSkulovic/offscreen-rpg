import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entry);
  } catch {
    return import.meta.url === pathToFileURL(entry).href;
  }
}

function textOrUnknown(value) {
  return typeof value === 'string' && value.length > 0 ? value : 'unknown';
}

/** Identities and counts only. Bodies, titles, and reasons stay out of this view. */
export function continuityProvenance(input) {
  const output = input?.output;
  const proposed =
    !output || typeof output !== 'object'
      ? 'unknown'
      : {
          documents: Array.isArray(output.documentChanges)
            ? output.documentChanges.map((change, index) => ({
                index,
                operation: textOrUnknown(change?.operation),
                kind: textOrUnknown(change?.kind),
                path: textOrUnknown(change?.path),
                documentId: textOrUnknown(change?.documentId),
                expectedRevision: Number.isInteger(change?.expectedRevision)
                  ? change.expectedRevision
                  : 'unknown',
              }))
            : 'unknown',
          noteCount: Array.isArray(output.currentNotes)
            ? output.currentNotes.length
            : 'unknown',
        };
  const published = textOrUnknown(input?.publicationState);
  const root = input?.retainedRoot;
  const rootRevision = Number.isInteger(root?.revision) ? root.revision : 'unknown';
  const rootHash = textOrUnknown(root?.hash);
  const retained =
    rootRevision === 'unknown' && rootHash === 'unknown'
      ? 'unknown'
      : {
          rootRevision,
          rootHash,
          documents: 'unknown',
        };
  const selection = input?.canonicalKnowledge?.documentSelection;
  const selected =
    !selection || !Array.isArray(selection.loadedHandles)
      ? 'unknown'
      : {
          handles: selection.loadedHandles.filter(
            (handle) => typeof handle === 'string',
          ),
          omitted: Array.isArray(selection.omitted)
            ? selection.omitted.map((item) => ({
                documentId: textOrUnknown(item?.documentId),
                reason: textOrUnknown(item?.reason),
              }))
            : [],
        };
  const packed = packRequestHandles(input?.request);
  return {
    proposed,
    published: published === 'unknown' ? 'unknown' : { state: published },
    retained,
    selected,
    packed,
  };
}

function packRequestHandles(request) {
  if (!request || typeof request !== 'object') return 'unknown';
  const handles = [];
  const seen = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (
      typeof value.handle === 'string' &&
      typeof value.body === 'string' &&
      !seen.has(value.handle)
    ) {
      seen.add(value.handle);
      handles.push({
        handle: value.handle,
        bytes: Buffer.byteLength(value.body, 'utf8'),
        sha256: createHash('sha256').update(value.body).digest('hex'),
      });
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(request);
  return { handles };
}

const STORY_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** @param {NodeJS.ProcessEnv} env */
export function storyDatabaseCommand(env) {
  const source = env ?? process.env;
  const databaseUrl = source['OFFSCREEN_STORY_DATABASE_URL'];
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    throw new Error(
      'OFFSCREEN_STORY_DATABASE_URL must be set to a postgres:// or postgresql:// connection URL',
    );
  }
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) {
    throw new Error(
      'OFFSCREEN_STORY_DATABASE_URL must be a postgres:// or postgresql:// connection URL',
    );
  }
  return {
    command: 'psql',
    args: [databaseUrl, '-At', '-v', 'ON_ERROR_STOP=1'],
    env: {
      ...source,
      PGOPTIONS: '-c default_transaction_read_only=on',
    },
  };
}

async function reportSession() {
const requested = process.argv.slice(2).find((value) => !value.startsWith('-'));
if (requested && !STORY_UUID.test(requested)) {
  throw new Error('Usage: pnpm --filter @offscreen/chamber story-inspect [story-uuid]');
}

const database = storyDatabaseCommand(process.env);
function sql(statement) {
  return execFileSync(database.command, [...database.args, '-c', statement], {
    encoding: 'utf8',
    env: database.env,
  }).trim();
}

const storyId =
  requested ?? sql('select id from story order by created_at desc limit 1');
if (!storyId || !STORY_UUID.test(storyId)) throw new Error('No local story found');

const journey = JSON.parse(
  sql(`
select jsonb_build_object(
  'story', jsonb_build_object(
    'id', s.id,
    'source', s.source,
    'revision', s.revision,
    'viewVersion', s.view_version,
    'rootRevision', s.document_root_revision,
    'rootHash', s.document_root_hash,
    'createdAt', s.created_at
  ),
  'passages', coalesce((
    select jsonb_agg(jsonb_build_object(
      'sequence', p.sequence,
      'id', p.id,
      'generationId', p.source_generation_id,
      'part', p.source_generation_part,
      'hasInteraction', p.interaction is not null,
      'createdAt', p.created_at
    ) order by p.sequence) from story_passage p where p.story_id=s.id
  ), '[]'::jsonb),
  'resolutions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'generationId', r.generation_id,
      'baseRevision', r.base_revision,
      'submissionKind', r.submission->>'kind',
      'generationState', g.state,
      'failureCode', g.failure_code,
      'publicationState', pub.state,
      'publicationFailure', pub.failure_code,
      'attemptState', a.state,
      'reconciliation', a.reconciliation,
      'httpStatus', a.http_status,
      'providerId', a.provider_id,
      'requestBytes', a.request_bytes,
      'tokens', a.total_tokens,
      'chargedMicrousd', a.charged_microusd,
      'reservedMicrousd', a.reserved_microusd,
      'durationMs', a.duration_ms,
      'createdAt', r.created_at
    ) order by r.created_at)
    from story_resolution r
    join generation g on g.id=r.generation_id
    left join storyteller_attempt a on a.generation_id=g.id
    left join storyteller_publication pub on pub.generation_id=g.id
    where r.story_id=s.id
  ), '[]'::jsonb),
  'generations', coalesce((
    select jsonb_agg(jsonb_build_object(
      'generationId', g.id,
      'purpose', a.purpose,
      'state', g.state,
      'failureCode', g.failure_code,
      'attemptState', a.state,
      'reconciliation', a.reconciliation,
      'httpStatus', a.http_status,
      'providerId', a.provider_id,
      'requestBytes', a.request_bytes,
      'promptTokens', a.prompt_tokens,
      'completionTokens', a.completion_tokens,
      'totalTokens', a.total_tokens,
      'chargedMicrousd', a.charged_microusd,
      'reservedMicrousd', a.reserved_microusd,
      'durationMs', a.duration_ms,
      'createdAt', g.created_at
    ) order by g.created_at)
    from generation g
    left join storyteller_attempt a on a.generation_id=g.id
    where g.id in (
      select p.source_generation_id from story_passage p
      where p.story_id=s.id and p.source_generation_id is not null
      union
      select r.generation_id from story_resolution r where r.story_id=s.id
    )
  ), '[]'::jsonb),
  'executions', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.operation_id,
      'actionKey', e.action_key,
      'state', e.state,
      'startGameSecond', e.start_game_second,
      'targetGameSecond', e.target_game_second,
      'generationId', e.preparation_generation_id,
      'receiptOutcome', rec.outcome,
      'hasRoll', rec.roll is not null,
      'effectCount', coalesce(jsonb_array_length(rec.effects), 0),
      'createdAt', e.created_at,
      'settledAt', e.settled_at
    ) order by e.created_at)
    from game_action_execution e
    left join game_action_receipt rec on rec.operation_id=e.operation_id
    where e.story_id=s.id
  ), '[]'::jsonb),
  'holds', coalesce((
    select c.holds from campaign c where c.story_id=s.id
  ), '[]'::jsonb),
  'game-second', (select c.game_second from campaign c where c.story_id=s.id),
  'pendingOutbox', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'topic', o.topic, 'operationId', o.operation_id,
      'availableAt', o.available_at
    ) order by o.available_at)
    from outbox o where o.delivered_at is null
  ), '[]'::jsonb)
) from story s where s.id='${storyId}';`),
);

function summarize(value) {
  const serialized = JSON.stringify(value);
  return {
    kind:
      value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
    items: Array.isArray(value)
      ? value.length
      : value && typeof value === 'object'
        ? Object.keys(value).length
        : null,
    characters: serialized.length,
    bytes: Buffer.byteLength(serialized, 'utf8'),
    sha256: createHash('sha256').update(serialized).digest('hex'),
  };
}

function summarizeRecord(value) {
  return Object.fromEntries(
    Object.entries(value ?? {})
      .map(([key, child]) => [key, summarize(child)])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function summarizeCanonicalKnowledge(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    rootRevision: value.rootRevision ?? null,
    catalogueCount: value.catalogue?.length ?? 0,
    catalogueOnly: (value.catalogue ?? [])
      .filter((entry) => !entry.loaded)
      .map((entry) => ({
        handle: entry.handle,
        kind: entry.kind,
        title: entry.title,
        path: entry.path,
        bytes: entry.bytes,
      })),
    loadedDocuments: (value.documents ?? []).map((entry) => ({
      handle: entry.handle,
      title: entry.title,
      bytes: Buffer.byteLength(entry.body ?? '', 'utf8'),
    })),
    documentSelection: value.documentSelection ?? null,
    libraries: (value.libraries ?? []).map((library) => ({
      handle: library.handle,
      kind: library.kind,
      title: library.title,
      orientation: library.orientation
        ? {
            handle: library.orientation.documentHandle,
            title: library.orientation.title,
            bytes: Buffer.byteLength(library.orientation.body ?? '', 'utf8'),
          }
        : null,
      catalogueOnly: (library.catalogue ?? [])
        .map((entry) => ({
          handle: entry.handle,
          kind: entry.kind,
          path: entry.path,
          loaded: entry.loaded,
          sectionHandles: (entry.sections ?? []).map(
            (section) => section.handle,
          ),
        }))
        .filter((entry) => !entry.loaded),
      catalogueCount: library.catalogue?.length ?? 0,
      selectedSections: (library.selectedSections ?? []).map((section) => ({
        handle: section.handle,
        title: section.title,
        heading: section.heading,
        bytes: section.bytes,
      })),
    })),
    librarySelection: value.librarySelection ?? null,
  };
}

function summarizeResult(value) {
  if (!value || typeof value !== 'object') return null;
  const next = value.scene?.next;
  const choices =
    next?.kind === 'choice'
      ? (next.options ?? [])
      : next?.kind === 'action-plans'
        ? (next.plans ?? [])
        : [];
  return {
    title: value.scene?.content?.title ?? null,
    paragraphCount: value.scene?.content?.paragraphs?.length ?? 0,
    nextKind: next?.kind ?? null,
    choiceCount: choices.length,
    contextDependencies: choices
      .map((choice) => ({
        key: choice.id ?? choice.key ?? null,
        worldSections: choice.worldSections ?? [],
        campaignDocuments: choice.campaignDocuments ?? [],
        createdDocuments: choice.createdDocuments ?? [],
      }))
      .filter(
        (choice) =>
          choice.worldSections.length ||
          choice.campaignDocuments.length ||
          choice.createdDocuments.length,
      ),
    documentChanges: (value.documentChanges ?? []).map((change, index) => ({
      index,
      operation: change.operation ?? null,
      kind: change.kind ?? null,
      path: change.path ?? null,
      title: change.title ?? null,
      recallAs: change.recallAs ?? null,
    })),
    activeScene: value.activeScene ?? null,
    currentNoteChanges: value.currentNotes?.length ?? 0,
    arrivalNoteChanges: value.arrivalNotes?.length ?? 0,
  };
}

const contextComposition = journey.generations.map(({ generationId }) => {
  const input = JSON.parse(
    sql(`select input::text from generation where id='${generationId}'`),
  );
  const request = input.request ?? {};
  const outputText = sql(
    `select coalesce(output::text, 'null') from generation where id='${generationId}'`,
  );
  const output = JSON.parse(outputText);
  return {
    generationId,
    taskInput: summarize(input),
    taskSections: summarizeRecord(input),
    contextSections: summarizeRecord(input.context),
    canonicalKnowledge: summarizeCanonicalKnowledge(
      input.context?.canonicalKnowledge,
    ),
    result: summarizeResult(output),
    continuity: continuityProvenance({
      output,
      publicationState:
        journey.resolutions
          .filter((resolution) => resolution.generationId === generationId)
          .at(-1)?.publicationState ?? null,
      retainedRoot: {
        revision: journey.story.rootRevision ?? null,
        hash: journey.story.rootHash ?? null,
      },
      canonicalKnowledge: input.context?.canonicalKnowledge ?? null,
      request: input.request ?? null,
    }),
    request: {
      complete: summarize(request),
      outputSchema: summarize(request.outputSchema ?? null),
      messages: Array.isArray(request.messages)
        ? request.messages.map((message, index) => ({
            index,
            role: message.role ?? null,
            content: summarize(message.content ?? null),
          }))
        : [],
    },
  };
});

const funding = JSON.parse(
  sql(`
select jsonb_build_object(
  'accounts', coalesce((select jsonb_agg(jsonb_build_object(
    'id', f.id, 'limitMicrousd', f.limit_microusd,
    'settledMicrousd', f.settled_microusd,
    'reservedMicrousd', f.reserved_microusd,
    'stopped', f.stopped, 'verifiedAt', f.verified_at
  )) from storyteller_funding f), '[]'::jsonb),
  'runs', coalesce((select jsonb_agg(jsonb_build_object(
    'id', r.id, 'enabled', r.enabled, 'maxAttempts', r.max_attempts,
    'admittedAttempts', r.admitted_attempts,
    'limitMicrousd', r.limit_microusd,
    'settledMicrousd', r.settled_microusd,
    'reservedMicrousd', r.reserved_microusd
  )) from storyteller_run r), '[]'::jsonb),
  'uncertainAttempts', coalesce((select jsonb_agg(jsonb_build_object(
    'id', a.id, 'generationId', a.generation_id, 'storyId', a.story_id
  )) from storyteller_attempt a where a.state='uncertain'), '[]'::jsonb)
)::text;`),
);

let snapshot = null;
try {
  const response = await fetch(
    `${process.env['OFFSCREEN_STORY_URL'] ?? 'http://127.0.0.1:3100'}/api/stories/${storyId}`,
  );
  if (response.ok) {
    const value = await response.json();
    snapshot = {
      revision: value.revision,
      viewVersion: value.viewVersion,
      canRespond: value.canRespond,
      currentTitle: value.current?.content?.title ?? null,
      choiceCount:
        value.current?.interaction?.specification?.options?.length ?? 0,
      resolution: value.resolution,
      gameSecond: value.campaign?.gameSecond ?? null,
      holds: value.campaign?.holds ?? [],
      receiptCount: value.campaign?.actionReceipts?.length ?? 0,
      usage: value.usage,
    };
  }
} catch {
  // The durable database report remains useful when the local web process is off.
}

const evidenceDirectory = join(process.cwd(), 'data', 'story-local-evidence');
let recentEvidence = [];
try {
  // Opening evidence necessarily predates story materialization. Keep a small
  // bounded lead-in rather than scanning or printing the full evidence store.
  const evidenceWindowStart = Date.parse(journey.story.createdAt) - 120_000;
  recentEvidence = readdirSync(evidenceDirectory)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const details = statSync(join(evidenceDirectory, name));
      return {
        name,
        bytes: details.size,
        modifiedAt: details.mtime.toISOString(),
      };
    })
    .filter((file) => Date.parse(file.modifiedAt) >= evidenceWindowStart)
    .sort((left, right) => left.modifiedAt.localeCompare(right.modifiedAt));
} catch {
  // Evidence capture may be disabled; report that as an empty list.
}

console.log(
  JSON.stringify(
    {
      format: 'offscreen.story-session-report.v1',
      journey,
      funding,
      contextComposition,
      snapshot,
      recentEvidence,
    },
    null,
    2,
  ),
);
}

if (invokedDirectly()) {
  await reportSession();
}
