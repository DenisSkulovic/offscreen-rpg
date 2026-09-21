import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requested = process.argv.slice(2).find((value) => !value.startsWith('-'));
if (requested && !uuid.test(requested)) {
  throw new Error('Usage: pnpm story:inspect [story-uuid]');
}

function docker(args) {
  return execFileSync('docker', args, { encoding: 'utf8' }).trim();
}

const container = docker(['compose', 'ps', '-q', 'postgres']);
if (!container) throw new Error('The local Postgres service is not running');
const database =
  process.env['OFFSCREEN_STORY_DATABASE'] ?? 'offscreen_story_local';
function sql(statement) {
  return docker([
    'exec',
    container,
    'psql',
    '-U',
    'offscreen',
    '-d',
    database,
    '-At',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    statement,
  ]);
}

const storyId =
  requested ?? sql('select id from story order by created_at desc limit 1');
if (!storyId || !uuid.test(storyId)) throw new Error('No local story found');

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
      'startTick', e.start_tick,
      'targetTick', e.target_tick,
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
  'tick', (select c.tick from campaign c where c.story_id=s.id),
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
      catalogueOnly: (library.catalogue ?? []).map((entry) => ({
        handle: entry.handle,
        kind: entry.kind,
        path: entry.path,
        loaded: entry.loaded,
        sectionHandles: (entry.sections ?? []).map((section) => section.handle),
      })).filter((entry) => !entry.loaded),
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
      ? next.options ?? []
      : next?.kind === 'action-plans'
        ? next.plans ?? []
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
      tick: value.campaign?.tick ?? null,
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
