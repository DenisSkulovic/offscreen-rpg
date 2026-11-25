import { fileURLToPath } from 'node:url';

import { parseCliArguments } from './arguments.js';
import { operationKey, type OperationManifest } from './contract.js';
import {
  EnrollOutcomeUnknownError,
  executeEnroll,
  redactEnrollError,
} from './ledger/enroll.js';
import {
  executeAtomicPlan,
  executeAtomicRun,
  executeAtomicStatus,
  redactAtomicError,
  type GitProvenanceReader,
} from './execution/atomic.js';
import {
  executeBatchedPlan,
  executeBatchedRun,
  executeBatchedStatus,
  redactBatchedError,
} from './execution/batched.js';
import { BatchedOperationError } from './execution/operation.js';
import { LedgerOutcomeUnknownError } from './ledger/repository.js';
import {
  lookup,
  lookupBatchedOperation,
  lookupOperation,
  manifests,
} from './registry.js';
import {
  SessionOutcomeUnknownError,
  type SessionClient,
} from './execution/session.js';
import {
  TargetParseError,
  TargetSessionError,
  createOpsClient,
  parseTarget,
  targetLabel,
  toTargetDisplay,
  verifySession,
  type ParsedTarget,
} from './target.js';

export const CLI_HELP_TEXT = `offscreen database operations

Commands:
  help
  list [--json]
  inspect <id@version> [--json]
  target [--json]
  enroll --confirm-target <label> [--json]
  plan <id@version> --target-id <uuid> [--json]
  status <id@version> --target-id <uuid>
  run <id@version> --target-id <uuid> --confirm-target <label> --actor <token> [--batch-size <n>] [--max-batches <n>] [--json]
  resume <id@version> --target-id <uuid> --confirm-target <label> --actor <token> [--batch-size <n>] [--max-batches <n>] [--json]

Environment:
  DB_OPS_URL  loopback PostgreSQL URL (required for database commands)
`;

export interface CliWriter {
  write(chunk: string): void;
}

export interface ClientLike {
  connect(): Promise<void>;
  query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>> }>;
  end(): Promise<void>;
}

type RegistryLookup = Readonly<{
  lookupManifest: (key: string) => ReturnType<typeof lookup>;
  lookupAtomic: (key: string) => ReturnType<typeof lookupOperation>;
  lookupBatched: (key: string) => ReturnType<typeof lookupBatchedOperation>;
}>;

export interface RunCliDeps {
  stdout: CliWriter;
  stderr: CliWriter;
  createClient?: (target: ParsedTarget) => ClientLike;
  gitProvenance?: GitProvenanceReader;
  registry?: RegistryLookup;
}

function defaultRegistry(): RegistryLookup {
  return Object.freeze({
    lookupManifest: lookup,
    lookupAtomic: lookupOperation,
    lookupBatched: lookupBatchedOperation,
  });
}

const SESSION_CHECK_SQL =
  'SELECT current_database() AS database, current_user AS role, pg_is_in_recovery() AS recovery';

export function redactCliError(error: unknown): string {
  if (error instanceof TargetParseError) {
    return 'invalid database operations target';
  }
  if (error instanceof TargetSessionError) {
    return 'database session verification failed';
  }
  const batched = redactBatchedError(error);
  if (batched !== 'batched operation failed') {
    return batched;
  }
  const atomic = redactAtomicError(error);
  if (atomic !== 'atomic operation failed') {
    return atomic;
  }
  return 'database operations failed';
}

type ResolvedOperation =
  | Readonly<{
      manifest: OperationManifest;
      mode: 'atomic';
      atomic: NonNullable<ReturnType<typeof lookupOperation>>;
    }>
  | Readonly<{
      manifest: OperationManifest;
      mode: 'batched';
      batched: NonNullable<ReturnType<typeof lookupBatchedOperation>>;
    }>
  | Readonly<{
      manifest: OperationManifest;
      mode: 'atomic' | 'batched';
    }>;

function resolveRegistry(deps: RunCliDeps): RegistryLookup {
  return deps.registry ?? defaultRegistry();
}

function refuseOperationBeforeConnect(
  key: string,
  deps: RunCliDeps,
  requireHandlers: boolean,
): ResolvedOperation | null {
  const registry = resolveRegistry(deps);
  const manifest = registry.lookupManifest(key);
  if (manifest === undefined) {
    deps.stderr.write('unknown operation\n');
    return null;
  }
  if (manifest.risk === 'high') {
    deps.stderr.write('high-risk operation execution refused\n');
    return null;
  }
  if (!requireHandlers) {
    return Object.freeze({ manifest, mode: manifest.mode });
  }
  if (manifest.mode === 'atomic') {
    const operation = registry.lookupAtomic(key);
    if (operation === undefined) {
      deps.stderr.write('unregistered operation\n');
      return null;
    }
    return Object.freeze({ manifest, mode: 'atomic', atomic: operation });
  }
  if (manifest.mode === 'batched') {
    const operation = registry.lookupBatched(key);
    if (operation === undefined) {
      deps.stderr.write('unregistered operation\n');
      return null;
    }
    return Object.freeze({ manifest, mode: 'batched', batched: operation });
  }
  deps.stderr.write('unknown operation mode\n');
  return null;
}

function refuseBatchedOnlyDispatchFlags(
  manifest: OperationManifest,
  batchSize: number | undefined,
  maxBatches: number | undefined,
  deps: RunCliDeps,
): boolean {
  if (batchSize === undefined && maxBatches === undefined) {
    return false;
  }
  if (manifest.mode !== 'batched') {
    deps.stderr.write('dispatch bounds apply only to batched operations\n');
    return true;
  }
  return false;
}

function refuseBatchedOnlyCommand(
  manifest: OperationManifest,
  command: 'resume',
  deps: RunCliDeps,
): boolean {
  if (manifest.mode !== 'batched') {
    deps.stderr.write(`${command} applies only to batched operations\n`);
    return true;
  }
  return false;
}

function formatBatchedStatusHuman(
  key: string,
  receipt: Awaited<ReturnType<typeof executeBatchedStatus>>,
): string {
  const execution = receipt.execution;
  if (execution === null) {
    return `${key} execution=missing\n`;
  }
  return `${key} state=${execution.state} checkpoint=${execution.checkpoint} processed=${execution.processed}\n`;
}

type BatchedRunLikeCommand = Readonly<{
  key: string;
  targetId: string;
  confirmTarget: string;
  actor: string;
  json: boolean;
  batchSize?: number;
  maxBatches?: number;
}>;

function formatBatchedRunHuman(
  receipt: Awaited<ReturnType<typeof executeBatchedRun>>,
): string {
  if (receipt.outcome === 'noop') {
    return `${receipt.operationKey} noop artifact_sha=${receipt.artifactSha}\n`;
  }
  if (receipt.outcome === 'paused') {
    return `${receipt.operationKey} paused checkpoint=${receipt.checkpoint} processed=${receipt.processed} batches_applied=${String(receipt.batchesApplied)}\n`;
  }
  return `${receipt.operationKey} succeeded checkpoint=${receipt.checkpoint} processed=${receipt.processed}\n`;
}

function writeUsage(deps: RunCliDeps, message: string): void {
  deps.stderr.write(`${message}\n`);
}

function formatManifestHuman(manifest: OperationManifest): string {
  const lines = [
    `id: ${manifest.id}`,
    `version: ${String(manifest.version)}`,
    `title: ${manifest.title}`,
    `owner: ${manifest.owner}`,
    `kind: ${manifest.kind}`,
    `risk: ${manifest.risk}`,
    `mode: ${manifest.mode}`,
    `recovery: ${manifest.recovery}`,
    `recoveryNotes: ${manifest.recoveryNotes}`,
    `affectedTables: ${manifest.affectedTables.join(', ')}`,
  ];
  return `${lines.join('\n')}\n`;
}

function asSessionClient(
  client: ClientLike | ReturnType<typeof createOpsClient>,
): SessionClient {
  return client as unknown as SessionClient;
}

function formatListHuman(entries: readonly OperationManifest[]): string {
  if (entries.length === 0) {
    return '';
  }
  return `${entries.map((entry) => operationKey(entry)).join('\n')}\n`;
}

function manifestJsonLine(manifest: OperationManifest): string {
  return `${JSON.stringify(manifest)}\n`;
}

function listJsonLine(entries: readonly OperationManifest[]): string {
  return `${JSON.stringify(entries)}\n`;
}

async function runPlan(
  command: Readonly<{
    kind: 'plan';
    key: string;
    targetId: string;
    json: boolean;
  }>,
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  const resolved = refuseOperationBeforeConnect(command.key, deps, true);
  if (resolved === null) {
    return 1;
  }

  let target: ParsedTarget;
  try {
    target = parseTarget(env);
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }

  const createClient = deps.createClient ?? createOpsClient;
  const client = createClient(target);

  let receipt: Awaited<ReturnType<typeof executeAtomicPlan>>;
  try {
    if (resolved.mode === 'batched' && 'batched' in resolved) {
      receipt = await executeBatchedPlan(
        resolved.batched,
        command.targetId,
        asSessionClient(client),
        target,
      );
    } else if (resolved.mode === 'atomic' && 'atomic' in resolved) {
      receipt = await executeAtomicPlan(
        resolved.atomic,
        command.targetId,
        asSessionClient(client),
        target,
      );
    } else {
      deps.stderr.write('unregistered operation\n');
      return 1;
    }
    if (command.json) {
      deps.stdout.write(`${JSON.stringify(receipt)}\n`);
    } else {
      deps.stdout.write(
        `${receipt.operationKey} eligible_rows=${receipt.eligibleRows} (estimate only)\n`,
      );
    }
    return 0;
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }
}

async function runStatus(
  command: Readonly<{ kind: 'status'; key: string; targetId: string }>,
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  const resolved = refuseOperationBeforeConnect(command.key, deps, false);
  if (resolved === null) {
    return 1;
  }

  let target: ParsedTarget;
  try {
    target = parseTarget(env);
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }

  const createClient = deps.createClient ?? createOpsClient;
  const client = createClient(target);

  try {
    const receipt =
      resolved.manifest.mode === 'batched'
        ? await executeBatchedStatus(
            command.key,
            command.targetId,
            asSessionClient(client),
            target,
          )
        : await executeAtomicStatus(
            command.key,
            command.targetId,
            asSessionClient(client),
            target,
          );
    if (resolved.manifest.mode === 'batched') {
      deps.stdout.write(
        formatBatchedStatusHuman(
          command.key,
          receipt as Awaited<ReturnType<typeof executeBatchedStatus>>,
        ),
      );
    } else {
      deps.stdout.write(`${JSON.stringify(receipt)}\n`);
    }
    return 0;
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }
}

async function runBatchedDispatch(
  command: BatchedRunLikeCommand,
  resume: boolean,
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  const resolved = refuseOperationBeforeConnect(command.key, deps, true);
  if (
    resolved === null ||
    resolved.mode !== 'batched' ||
    !('batched' in resolved)
  ) {
    return 1;
  }
  if (
    refuseBatchedOnlyDispatchFlags(
      resolved.manifest,
      command.batchSize,
      command.maxBatches,
      deps,
    )
  ) {
    return 1;
  }

  let target: ParsedTarget;
  try {
    target = parseTarget(env);
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }

  const createClient = deps.createClient ?? createOpsClient;
  const client = createClient(target);

  try {
    const request = {
      targetId: command.targetId,
      confirmTarget: command.confirmTarget,
      actor: command.actor,
      resume,
      ...(command.batchSize === undefined
        ? {}
        : { batchSize: command.batchSize }),
      ...(command.maxBatches === undefined
        ? {}
        : { maxBatches: command.maxBatches }),
    };
    const receipt = await executeBatchedRun(
      resolved.batched,
      request,
      asSessionClient(client),
      target,
      deps.gitProvenance === undefined
        ? {}
        : { gitProvenance: deps.gitProvenance },
    );
    if (command.json) {
      deps.stdout.write(`${JSON.stringify(receipt)}\n`);
    } else {
      deps.stdout.write(formatBatchedRunHuman(receipt));
    }
    return 0;
  } catch (error) {
    if (
      error instanceof LedgerOutcomeUnknownError ||
      error instanceof SessionOutcomeUnknownError ||
      error instanceof BatchedOperationError
    ) {
      deps.stderr.write(`${redactCliError(error)}\n`);
      return 1;
    }
    deps.stderr.write(`${redactBatchedError(error)}\n`);
    return 1;
  }
}

async function runAtomic(
  command: Readonly<{
    key: string;
    targetId: string;
    confirmTarget: string;
    actor: string;
    json: boolean;
    batchSize?: number;
    maxBatches?: number;
  }>,
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  const resolved = refuseOperationBeforeConnect(command.key, deps, true);
  if (
    resolved === null ||
    resolved.mode !== 'atomic' ||
    !('atomic' in resolved)
  ) {
    return 1;
  }
  if (
    refuseBatchedOnlyDispatchFlags(
      resolved.manifest,
      command.batchSize,
      command.maxBatches,
      deps,
    )
  ) {
    return 1;
  }

  let target: ParsedTarget;
  try {
    target = parseTarget(env);
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }

  const createClient = deps.createClient ?? createOpsClient;
  const client = createClient(target);

  try {
    const receipt = await executeAtomicRun(
      resolved.atomic,
      {
        targetId: command.targetId,
        confirmTarget: command.confirmTarget,
        actor: command.actor,
      },
      asSessionClient(client),
      target,
      deps.gitProvenance === undefined
        ? {}
        : { gitProvenance: deps.gitProvenance },
    );
    if (command.json) {
      deps.stdout.write(`${JSON.stringify(receipt)}\n`);
    } else if (receipt.outcome === 'noop') {
      deps.stdout.write(
        `${receipt.operationKey} noop artifact_sha=${receipt.artifactSha}\n`,
      );
    } else {
      deps.stdout.write(
        `${receipt.operationKey} succeeded affected_rows=${receipt.affectedRows}\n`,
      );
    }
    return 0;
  } catch (error) {
    if (
      error instanceof LedgerOutcomeUnknownError ||
      error instanceof SessionOutcomeUnknownError
    ) {
      deps.stderr.write(`${redactCliError(error)}\n`);
      return 1;
    }
    deps.stderr.write(`${redactAtomicError(error)}\n`);
    return 1;
  }
}

async function runEnroll(
  command: Readonly<{ kind: 'enroll'; confirmTarget: string; json: boolean }>,
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  let target: ParsedTarget;
  try {
    target = parseTarget(env);
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }

  const createClient = deps.createClient ?? createOpsClient;
  const client = createClient(target);

  try {
    const result = await executeEnroll(target, command.confirmTarget, client);
    if (command.json) {
      deps.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      deps.stdout.write(
        `${result.label} enrolled target_id=${result.targetId}\n`,
      );
    }
    return 0;
  } catch (error) {
    if (error instanceof EnrollOutcomeUnknownError) {
      deps.stderr.write(`${redactEnrollError(error)}\n`);
      return 1;
    }
    deps.stderr.write(`${redactEnrollError(error)}\n`);
    return 1;
  }
}

async function runTarget(
  command: Readonly<{ kind: 'target'; json: boolean }>,
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  let target: ParsedTarget;
  try {
    target = parseTarget(env);
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }

  const createClient = deps.createClient ?? createOpsClient;
  const client = createClient(target);

  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    await verifySession(client, target, { requirePrimary: false });

    const display = toTargetDisplay(target);
    if (command.json) {
      deps.stdout.write(
        `${JSON.stringify({ ...display, label: targetLabel(display) })}\n`,
      );
    } else {
      deps.stdout.write(`${targetLabel(display)}\n`);
    }
    return 0;
  } catch (error) {
    deps.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  } finally {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Rollback failures are absorbed; connection teardown still runs.
    }
    try {
      await client.end();
    } catch {
      // Close failures are absorbed after redacted reporting above.
    }
  }
}

export async function runCli(
  argv: readonly string[],
  env: Record<string, string | undefined>,
  deps: RunCliDeps,
): Promise<number> {
  const parsed = parseCliArguments(argv);
  if (!parsed.ok) {
    writeUsage(deps, parsed.message);
    return parsed.exitCode;
  }

  const command = parsed.command;

  if (command.kind === 'help') {
    deps.stdout.write(CLI_HELP_TEXT);
    return 0;
  }

  if (command.kind === 'list') {
    if (command.json) {
      deps.stdout.write(listJsonLine(manifests));
    } else {
      const text = formatListHuman(manifests);
      if (text.length > 0) {
        deps.stdout.write(text);
      }
    }
    return 0;
  }

  if (command.kind === 'inspect') {
    const manifest = lookup(command.key);
    if (manifest === undefined) {
      deps.stderr.write('unknown operation\n');
      return 1;
    }
    if (command.json) {
      deps.stdout.write(manifestJsonLine(manifest));
    } else {
      deps.stdout.write(formatManifestHuman(manifest));
    }
    return 0;
  }

  if (command.kind === 'enroll') {
    return runEnroll(command, env, deps);
  }

  if (command.kind === 'plan') {
    return runPlan(command, env, deps);
  }

  if (command.kind === 'status') {
    return runStatus(command, env, deps);
  }

  if (command.kind === 'run') {
    const resolved = refuseOperationBeforeConnect(command.key, deps, false);
    if (resolved === null) {
      return 1;
    }
    if (resolved.manifest.mode === 'batched') {
      return runBatchedDispatch(command, false, env, deps);
    }
    return runAtomic(command, env, deps);
  }

  if (command.kind === 'resume') {
    const resolved = refuseOperationBeforeConnect(command.key, deps, false);
    if (resolved === null) {
      return 1;
    }
    if (refuseBatchedOnlyCommand(resolved.manifest, 'resume', deps)) {
      return 1;
    }
    return runBatchedDispatch(command, true, env, deps);
  }

  if (command.kind === 'target') {
    return runTarget(command, env, deps);
  }

  return 2;
}

export { SESSION_CHECK_SQL };

async function runExecutableMain(): Promise<number> {
  try {
    return await runCli(process.argv.slice(2), process.env, {
      stdout: process.stdout,
      stderr: process.stderr,
    });
  } catch (error) {
    process.stderr.write(`${redactCliError(error)}\n`);
    return 1;
  }
}

function isCliMain(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  return fileURLToPath(import.meta.url) === entry;
}

if (isCliMain()) {
  void runExecutableMain()
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      process.stderr.write('database operations failed\n');
      process.exitCode = 1;
    });
}
