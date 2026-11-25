import {
  ENROLLMENT_SCHEMA_VERSION,
  OPS_SCHEMA,
  SQL_READ_MARKER,
} from './schema.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ARTIFACT_SHA_PATTERN = /^[0-9a-f]{40}$/;

const EXECUTION_STATES = new Set(['running', 'paused', 'succeeded']);

const EXECUTION_EVENTS = new Set(['started', 'batch', 'paused', 'succeeded']);

const DECIMAL_NONNEGATIVE = /^\d+$/;

export const SQL_READ_EXECUTION_BY_KEY = `SELECT operation_key, artifact_sha, run_id::text AS run_id, actor, state, checkpoint::text AS checkpoint, processed::text AS processed FROM ${OPS_SCHEMA}.execution WHERE operation_key = $1`;

export const SQL_INSERT_EXECUTION = `INSERT INTO ${OPS_SCHEMA}.execution (operation_key, artifact_sha, run_id, actor, state, checkpoint, processed) VALUES ($1, $2, $3::uuid, $4, 'running', $5::bigint, $6::bigint)`;

export const SQL_INSERT_EXECUTION_EVENT = `INSERT INTO ${OPS_SCHEMA}.execution_event (run_id, event, checkpoint, processed) VALUES ($1::uuid, $2, $3::bigint, $4::bigint)`;

export const SQL_UPDATE_EXECUTION_CHECKPOINT = `UPDATE ${OPS_SCHEMA}.execution SET state = $7, checkpoint = $8::bigint, processed = $9::bigint, updated_at = now() WHERE operation_key = $1 AND run_id = $2::uuid AND artifact_sha = $3 AND state = $4 AND checkpoint = $5::bigint AND processed = $6::bigint`;

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export class LedgerOutcomeUnknownError extends LedgerError {
  constructor() {
    super(
      'ledger transaction commit outcome unknown; inspect execution state manually before retrying',
    );
    this.name = 'LedgerOutcomeUnknownError';
  }
}

export type OpsMarker = Readonly<{
  targetId: string;
  schemaVersion: typeof ENROLLMENT_SCHEMA_VERSION;
}>;

export type ExecutionState = 'running' | 'paused' | 'succeeded';

export type ExecutionEventKind = 'started' | 'batch' | 'paused' | 'succeeded';

export type ExecutionRecord = Readonly<{
  operationKey: string;
  artifactSha: string;
  runId: string;
  actor: string;
  state: ExecutionState;
  checkpoint: string;
  processed: string;
}>;

export interface LedgerQueryable {
  query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}

export function requireUuidSyntax(value: string, field: string): string {
  const trimmed = value.trim();
  if (!UUID_PATTERN.test(trimmed)) {
    throw new LedgerError(`invalid ${field} UUID syntax`);
  }
  return trimmed;
}

export function parseNonNegativeBigInt(value: unknown, field: string): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n) {
      throw new LedgerError(`${field} must be a nonnegative bigint`);
    }
    return value;
  }
  if (typeof value === 'string' && DECIMAL_NONNEGATIVE.test(value)) {
    return BigInt(value);
  }
  throw new LedgerError(`${field} must be a nonnegative decimal bigint string`);
}

export function formatNonNegativeBigInt(value: bigint): string {
  if (value < 0n) {
    throw new LedgerError('bigint must be nonnegative');
  }
  return value.toString();
}

function parseMarkerRow(row: Record<string, unknown>): OpsMarker {
  const targetId = row.target_id;
  const schemaVersion = row.schema_version;
  if (typeof targetId !== 'string' || targetId.length === 0) {
    throw new LedgerError('operational marker has invalid target_id');
  }
  requireUuidSyntax(targetId, 'marker target_id');
  if (schemaVersion !== ENROLLMENT_SCHEMA_VERSION) {
    throw new LedgerError('operational marker has unexpected schema_version');
  }
  return Object.freeze({
    targetId,
    schemaVersion: ENROLLMENT_SCHEMA_VERSION,
  });
}

function parseExecutionState(value: unknown): ExecutionState {
  if (typeof value !== 'string' || !EXECUTION_STATES.has(value)) {
    throw new LedgerError('execution row has invalid state');
  }
  return value as ExecutionState;
}

function parseExecutionRow(row: Record<string, unknown>): ExecutionRecord {
  const operationKey = row.operation_key;
  const artifactSha = row.artifact_sha;
  const runId = row.run_id;
  const actor = row.actor;
  const state = row.state;
  const checkpoint = row.checkpoint;
  const processed = row.processed;

  if (typeof operationKey !== 'string' || operationKey.length === 0) {
    throw new LedgerError('execution row has invalid operation_key');
  }
  if (
    typeof artifactSha !== 'string' ||
    !ARTIFACT_SHA_PATTERN.test(artifactSha)
  ) {
    throw new LedgerError('execution row has invalid artifact_sha');
  }
  if (typeof runId !== 'string') {
    throw new LedgerError('execution row has invalid run_id');
  }
  requireUuidSyntax(runId, 'run_id');
  if (typeof actor !== 'string' || actor.length === 0) {
    throw new LedgerError('execution row has invalid actor');
  }
  const parsedState = parseExecutionState(state);
  if (typeof checkpoint !== 'string' || !DECIMAL_NONNEGATIVE.test(checkpoint)) {
    throw new LedgerError('execution row has invalid checkpoint');
  }
  if (typeof processed !== 'string' || !DECIMAL_NONNEGATIVE.test(processed)) {
    throw new LedgerError('execution row has invalid processed');
  }

  return Object.freeze({
    operationKey,
    artifactSha,
    runId,
    actor,
    state: parsedState,
    checkpoint,
    processed,
  });
}

export function assertMarkerTargetId(
  marker: OpsMarker,
  expectedTargetId: string,
): void {
  const normalized = requireUuidSyntax(expectedTargetId, 'target_id');
  if (marker.targetId !== normalized) {
    throw new LedgerError('target_id does not match operational marker');
  }
}

export function redactLedgerError(error: unknown): string {
  if (error instanceof LedgerOutcomeUnknownError) {
    return 'ledger commit outcome unknown; inspect execution state manually';
  }
  if (error instanceof LedgerError) {
    if (error.message.includes('target_id')) {
      return 'target marker validation failed';
    }
    if (error.message.includes('advisory lock')) {
      return 'operation session advisory lock busy';
    }
    if (error.message.includes('claim already exists')) {
      return 'execution claim already exists';
    }
    if (error.message.includes('predicate mismatch')) {
      return 'execution checkpoint update refused';
    }
    if (error.message.includes('marker')) {
      return 'operational marker missing or invalid';
    }
    return 'database operation ledger refused';
  }
  return 'database operation ledger failed';
}

export async function readMarker(client: LedgerQueryable): Promise<OpsMarker> {
  const result = await client.query(SQL_READ_MARKER);
  if (!Array.isArray(result.rows) || result.rows.length !== 1) {
    throw new LedgerError('operational marker must return exactly one row');
  }
  const row = result.rows[0];
  if (row === undefined) {
    throw new LedgerError('operational marker missing');
  }
  return parseMarkerRow(row);
}

export async function readExecutionByKey(
  client: LedgerQueryable,
  operationKey: string,
): Promise<ExecutionRecord | undefined> {
  if (operationKey.length === 0) {
    throw new LedgerError('operation_key is required');
  }
  const result = await client.query(SQL_READ_EXECUTION_BY_KEY, [operationKey]);
  if (!Array.isArray(result.rows)) {
    throw new LedgerError('execution lookup returned invalid shape');
  }
  if (result.rows.length === 0) {
    return undefined;
  }
  if (result.rows.length !== 1) {
    throw new LedgerError('execution lookup must return at most one row');
  }
  const row = result.rows[0];
  if (row === undefined) {
    return undefined;
  }
  return parseExecutionRow(row);
}

export type InsertExecutionClaimInput = Readonly<{
  operationKey: string;
  artifactSha: string;
  runId: string;
  actor: string;
  checkpoint: bigint | string;
  processed: bigint | string;
}>;

export async function insertExecutionClaim(
  client: LedgerQueryable,
  input: InsertExecutionClaimInput,
): Promise<void> {
  if (!ARTIFACT_SHA_PATTERN.test(input.artifactSha)) {
    throw new LedgerError('artifact_sha must be 40 lowercase hex characters');
  }
  requireUuidSyntax(input.runId, 'run_id');
  const checkpoint = formatNonNegativeBigInt(
    parseNonNegativeBigInt(input.checkpoint, 'checkpoint'),
  );
  const processed = formatNonNegativeBigInt(
    parseNonNegativeBigInt(input.processed, 'processed'),
  );

  const existing = await readExecutionByKey(client, input.operationKey);
  if (existing !== undefined) {
    throw new LedgerError('execution claim already exists for operation_key');
  }

  await client.query(SQL_INSERT_EXECUTION, [
    input.operationKey,
    input.artifactSha,
    input.runId,
    input.actor,
    checkpoint,
    processed,
  ]);
  await client.query(SQL_INSERT_EXECUTION_EVENT, [
    input.runId,
    'started',
    checkpoint,
    processed,
  ]);
}

export type UpdateExecutionCheckpointInput = Readonly<{
  operationKey: string;
  runId: string;
  artifactSha: string;
  expectedState: ExecutionState;
  expectedCheckpoint: bigint | string;
  expectedProcessed: bigint | string;
  newState: ExecutionState;
  newCheckpoint: bigint | string;
  newProcessed: bigint | string;
  event: Exclude<ExecutionEventKind, 'started'>;
}>;

export async function updateExecutionCheckpoint(
  client: LedgerQueryable,
  input: UpdateExecutionCheckpointInput,
): Promise<void> {
  if (!ARTIFACT_SHA_PATTERN.test(input.artifactSha)) {
    throw new LedgerError('artifact_sha must be 40 lowercase hex characters');
  }
  requireUuidSyntax(input.runId, 'run_id');
  if (!EXECUTION_EVENTS.has(input.event)) {
    throw new LedgerError('invalid execution event kind');
  }

  const expectedCheckpoint = formatNonNegativeBigInt(
    parseNonNegativeBigInt(input.expectedCheckpoint, 'expectedCheckpoint'),
  );
  const expectedProcessed = formatNonNegativeBigInt(
    parseNonNegativeBigInt(input.expectedProcessed, 'expectedProcessed'),
  );
  const newCheckpoint = formatNonNegativeBigInt(
    parseNonNegativeBigInt(input.newCheckpoint, 'newCheckpoint'),
  );
  const newProcessed = formatNonNegativeBigInt(
    parseNonNegativeBigInt(input.newProcessed, 'newProcessed'),
  );

  const updateResult = await client.query(SQL_UPDATE_EXECUTION_CHECKPOINT, [
    input.operationKey,
    input.runId,
    input.artifactSha,
    input.expectedState,
    expectedCheckpoint,
    expectedProcessed,
    input.newState,
    newCheckpoint,
    newProcessed,
  ]);

  if (updateResult.rowCount !== 1) {
    throw new LedgerError(
      'execution checkpoint update predicate mismatch; refused',
    );
  }

  await client.query(SQL_INSERT_EXECUTION_EVENT, [
    input.runId,
    input.event,
    newCheckpoint,
    newProcessed,
  ]);
}
