import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
  timestamp,
  unique,
  check,
  foreignKey,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { generation } from './generations';

export const story = pgTable(
  'story',
  {
    id: uuid('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    source: text('source').notNull(),
    premise: jsonb('premise').$type<unknown>(),
    storyteller: jsonb('storyteller').$type<unknown>(),
    execution: jsonb('execution').$type<unknown>(),
    usagePolicy: jsonb('usage_policy').$type<unknown>(),
    continuityNotes: jsonb('continuity_notes').$type<unknown>(),
    activeSceneScope: jsonb('active_scene_scope').$type<unknown>(),
    documentRootHash: text('document_root_hash'),
    documentRootRevision: integer('document_root_revision')
      .notNull()
      .default(0),
    forkedFromStoryId: uuid('forked_from_story_id'),
    forkedFromPassageId: uuid('forked_from_passage_id'),
    forkedFromSequence: integer('forked_from_sequence'),
    revision: integer('revision').notNull().default(1),
    viewVersion: integer('view_version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('story_revision_positive', sql`${t.revision} > 0`),
    check(
      'story_document_root_shape',
      sql`(${t.documentRootHash} IS NULL AND ${t.documentRootRevision} = 0) OR (${t.documentRootHash} ~ '^[0-9a-f]{64}$' AND ${t.documentRootRevision} > 0)`,
    ),
    check(
      'story_fork_lineage_complete',
      sql`(${t.forkedFromStoryId} IS NULL AND ${t.forkedFromPassageId} IS NULL AND ${t.forkedFromSequence} IS NULL) OR (${t.forkedFromStoryId} IS NOT NULL AND ${t.forkedFromPassageId} IS NOT NULL AND ${t.forkedFromSequence} > 0)`,
    ),
    foreignKey({
      columns: [t.forkedFromStoryId],
      foreignColumns: [t.id],
      name: 'story_fork_source_story_fk',
    }).onDelete('restrict'),
    index('story_fork_source').on(t.forkedFromStoryId, t.createdAt),
  ],
);

export const storyDocumentCommit = pgTable(
  'story_document_commit',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    operationId: uuid('operation_id').notNull(),
    requestHash: text('request_hash').notNull(),
    baseRootHash: text('base_root_hash'),
    rootHash: text('root_hash').notNull(),
    rootRevision: integer('root_revision').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('story_document_commit_identity').on(t.storyId, t.operationId),
    unique('story_document_commit_root').on(t.storyId, t.rootRevision),
    check(
      'story_document_commit_hashes',
      sql`${t.requestHash} ~ '^[0-9a-f]{64}$' AND ${t.rootHash} ~ '^[0-9a-f]{64}$' AND (${t.baseRootHash} IS NULL OR ${t.baseRootHash} ~ '^[0-9a-f]{64}$')`,
    ),
    check('story_document_commit_revision', sql`${t.rootRevision} > 0`),
  ],
);

// Revision selects the current committed passage. Control/timing state is not
// encoded in this narrative sequence and will have its own reviewed contract.
export const storyPassage = pgTable(
  'story_passage',
  {
    id: uuid('id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    sequence: integer('sequence').notNull(),
    transitionId: uuid('transition_id'),
    response: jsonb('response').$type<unknown>(),
    initialItems: jsonb('initial_items').$type<unknown>(),
    effects: jsonb('effects').$type<unknown>(),
    responseSource: text('response_source'),
    decisionPlan: jsonb('decision_plan').$type<unknown>(),
    responseDueAt: timestamp('response_due_at', {
      withTimezone: true,
      precision: 3,
    }),
    waitPlan: jsonb('wait_plan').$type<unknown>(),
    dueAt: timestamp('due_at', { withTimezone: true, precision: 3 }),
    controlRevision: integer('control_revision').notNull().default(0),
    remainingMs: integer('remaining_ms'),
    content: jsonb('content').$type<unknown>(),
    contentDocumentHash: text('content_document_hash'),
    interaction: jsonb('interaction').$type<unknown>(),
    /** Optional published presentation envelope; never game authority. */
    appearance: jsonb('appearance').$type<unknown>(),
    sourceGenerationId: uuid('source_generation_id').references(
      () => generation.id,
      { onDelete: 'restrict' },
    ),
    sourceGenerationPart: text('source_generation_part'),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('story_passage_sequence').on(t.storyId, t.sequence),
    unique('story_passage_transition').on(t.storyId, t.transitionId),
    check(
      'story_passage_decision_valid',
      sql`(${t.decisionPlan} IS NULL) = (${t.responseDueAt} IS NULL) AND (${t.decisionPlan} IS NULL OR (${t.interaction} IS NOT NULL AND ${t.waitPlan} IS NULL))`,
    ),
    check(
      'story_passage_response_source_valid',
      sql`${t.responseSource} IS NULL OR (${t.response} IS NOT NULL AND ${t.responseSource} IN ('player', 'default'))`,
    ),
    check('story_passage_sequence_positive', sql`${t.sequence} > 0`),
    check(
      'story_passage_content_owner',
      sql`(${t.content} IS NOT NULL AND ${t.contentDocumentHash} IS NULL) OR (${t.content} IS NULL AND ${t.contentDocumentHash} ~ '^[0-9a-f]{64}$')`,
    ),
    check(
      'story_passage_control_valid',
      sql`${t.controlRevision} >= 0 AND (${t.remainingMs} IS NULL OR (${t.remainingMs} >= 0 AND ${t.waitPlan} IS NOT NULL))`,
    ),
    check(
      'story_passage_wait_pair',
      sql`(${t.waitPlan} IS NULL) = (${t.dueAt} IS NULL)`,
    ),
    check(
      'story_passage_generation_part',
      sql`(${t.sourceGenerationId} IS NULL AND ${t.sourceGenerationPart} IS NULL) OR (${t.sourceGenerationId} IS NOT NULL AND ${t.sourceGenerationPart} IN ('current', 'arrival'))`,
    ),
  ],
);

/**
 * SQL selector for one immutable scene checkpoint. The payload lives in the
 * document store at checkpoint_hash. This row does not replace story or
 * story_item, and publication does not write it yet.
 */
export const storySceneCheckpoint = pgTable(
  'story_scene_checkpoint',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    sceneSequence: integer('scene_sequence').notNull(),
    passageId: uuid('passage_id')
      .notNull()
      .references(() => storyPassage.id, { onDelete: 'restrict' }),
    transitionId: uuid('transition_id'),
    operationId: uuid('operation_id').notNull(),
    checkpointHash: text('checkpoint_hash').notNull(),
    canonRootHash: text('canon_root_hash'),
    canonRootRevision: integer('canon_root_revision').notNull(),
    stateSchemaVersion: integer('state_schema_version').notNull(),
    pins: jsonb('pins').notNull().$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'story_scene_checkpoint_pkey',
      columns: [t.storyId, t.sceneSequence],
    }),
    unique('story_scene_checkpoint_passage').on(t.passageId),
    unique('story_scene_checkpoint_operation').on(t.storyId, t.operationId),
    unique('story_scene_checkpoint_transition').on(t.storyId, t.transitionId),
    check(
      'story_scene_checkpoint_sequence',
      sql`${t.sceneSequence} > 0`,
    ),
    check(
      'story_scene_checkpoint_hash',
      sql`${t.checkpointHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'story_scene_checkpoint_canon',
      sql`(${t.canonRootHash} IS NULL AND ${t.canonRootRevision} = 0) OR (${t.canonRootHash} ~ '^[0-9a-f]{64}$' AND ${t.canonRootRevision} > 0)`,
    ),
    check(
      'story_scene_checkpoint_schema',
      sql`${t.stateSchemaVersion} = 1`,
    ),
    check(
      'story_scene_checkpoint_opening',
      sql`(${t.sceneSequence} = 1 AND ${t.transitionId} IS NULL) OR (${t.sceneSequence} > 1 AND ${t.transitionId} IS NOT NULL)`,
    ),
  ],
);

export const storyControl = pgTable(
  'story_control',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    operationId: uuid('operation_id').notNull(),
    request: jsonb('request').notNull().$type<unknown>(),
  },
  (t) => [unique('story_control_identity').on(t.storyId, t.operationId)],
);

export const storyResolution = pgTable(
  'story_resolution',
  {
    generationId: uuid('generation_id')
      .primaryKey()
      .references(() => generation.id, { onDelete: 'restrict' }),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    basePassageId: uuid('base_passage_id')
      .notNull()
      .references(() => storyPassage.id, { onDelete: 'restrict' }),
    baseRevision: integer('base_revision').notNull(),
    operationId: uuid('operation_id').notNull(),
    submission: jsonb('submission').notNull().$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('story_resolution_operation').on(t.storyId, t.operationId),
    unique('story_resolution_base').on(
      t.storyId,
      t.basePassageId,
      t.baseRevision,
    ),
    check('story_resolution_revision_positive', sql`${t.baseRevision} > 0`),
  ],
);

export const storyItem = pgTable(
  'story_item',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'restrict' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    holderKey: text('holder_key').notNull(),
  },
  (t) => [unique('story_item_identity').on(t.storyId, t.key)],
);

/** GM06: shared per-viewer story opening checkpoint (not a read-comprehension claim). */
export const storyViewerVisit = pgTable(
  'story_viewer_visit',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    viewerId: text('viewer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    acknowledgedEventSequence: bigint('acknowledged_event_sequence', {
      mode: 'number',
    })
      .notNull()
      .default(0),
    acknowledgedAt: timestamp('acknowledged_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.storyId, t.viewerId] }),
    check(
      'story_viewer_visit_sequence',
      sql`${t.acknowledgedEventSequence} >= 0`,
    ),
  ],
);

export const storyViewerVisitOpen = pgTable(
  'story_viewer_visit_open',
  {
    visitToken: uuid('visit_token').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    viewerId: text('viewer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    previousSequence: bigint('previous_sequence', { mode: 'number' }),
    frontier: bigint('frontier', { mode: 'number' }).notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('story_viewer_visit_open_story_viewer').on(t.storyId, t.viewerId),
    check('story_viewer_visit_open_frontier', sql`${t.frontier} >= 0`),
    check(
      'story_viewer_visit_open_previous',
      sql`${t.previousSequence} IS NULL OR ${t.previousSequence} >= 0`,
    ),
  ],
);

export const storyViewerVisitAck = pgTable(
  'story_viewer_visit_ack',
  {
    ackId: uuid('ack_id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    viewerId: text('viewer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    visitToken: uuid('visit_token').notNull(),
    frontier: bigint('frontier', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('story_viewer_visit_ack_token').on(t.visitToken),
    check('story_viewer_visit_ack_frontier', sql`${t.frontier} >= 0`),
  ],
);

/** GM01: server-owned public inspect targets for template-first custom intent. */
export const storyPublicInspectTarget = pgTable(
  'story_public_inspect_target',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    handle: text('handle').notNull(),
    label: text('label').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.storyId, t.handle] }),
    check(
      'story_public_inspect_target_handle',
      sql`char_length(${t.handle}) BETWEEN 1 AND 80`,
    ),
    check(
      'story_public_inspect_target_label',
      sql`char_length(${t.label}) BETWEEN 1 AND 120`,
    ),
  ],
);

/** GM01: noncanonical custom-intent candidate; never mutates game state alone. */
export const customIntentCandidate = pgTable(
  'custom_intent_candidate',
  {
    candidateId: uuid('candidate_id').primaryKey(),
    interpretOperationId: uuid('interpret_operation_id').notNull(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => story.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    viewerId: text('viewer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requestDigest: text('request_digest').notNull(),
    status: text('status').notNull(),
    inputText: text('input_text').notNull(),
    response: jsonb('response').notNull().$type<unknown>(),
    passageId: uuid('passage_id').notNull(),
    narrativeRevision: integer('narrative_revision').notNull(),
    settingsRevision: integer('settings_revision').notNull(),
    clarificationUsed: boolean('clarification_used').notNull().default(false),
    acceptedOperationId: uuid('accepted_operation_id'),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('custom_intent_candidate_operation').on(
      t.storyId,
      t.interpretOperationId,
    ),
    unique('custom_intent_candidate_accepted_op').on(t.acceptedOperationId),
    index('custom_intent_candidate_rate').on(
      t.viewerId,
      t.storyId,
      t.createdAt,
    ),
    check(
      'custom_intent_candidate_status',
      sql`${t.status} in ('reviewable', 'clarify', 'rejected', 'unsupported', 'accepted')`,
    ),
    check('custom_intent_candidate_revision', sql`${t.narrativeRevision} > 0`),
    check('custom_intent_candidate_settings', sql`${t.settingsRevision} > 0`),
    check(
      'custom_intent_candidate_text',
      sql`char_length(${t.inputText}) BETWEEN 1 AND 240`,
    ),
  ],
);
